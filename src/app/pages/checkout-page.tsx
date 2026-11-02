import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import Decimal from 'decimal.js'
import { MarketHeader } from '@/components/layout/market-header'
import { CartSummary } from '@/components/shared/cart-summary'
import { apiErrorSchema } from '@/contracts/auth'
import { collectorInputSchema, type CollectorInput, type Quote } from '@/contracts/commerce'
import { useSession } from '@/features/auth/queries'
import { readSessionToken } from '@/features/auth/session'
import { connectWallet, createQuote, disconnectWallet, getCart, getOrderByKey, getQuote, getWallets, submitOrder } from '@/features/commerce/api'
import { clearCheckoutAttempt, readCheckoutAttempt, saveCheckoutAttempt } from '@/features/commerce/attempt'

function errorText(error: unknown) { return isAxiosError(error) ? error.response?.data?.error?.message ?? 'Falha de conexão. Tente novamente.' : 'Não foi possível continuar.' }
function focusCollectorField(name: string) { window.requestAnimationFrame(() => document.getElementById(`checkout-${name}`)?.focus()) }

export function CheckoutPage({ userId }: { userId: string }) {
  const navigate = useNavigate()
  const client = useQueryClient()
  const token = readSessionToken()
  const session = useSession()
  const cart = useQuery({ queryKey: ['cart', token], queryFn: ({ signal }) => getCart(signal), refetchInterval: 10_000 })
  const wallets = useQuery({ queryKey: ['wallets', token], queryFn: ({ signal }) => getWallets(signal) })
  const [network, setNetwork] = useState<'Ethereum' | 'Polygon' | 'Solana'>('Ethereum')
  const networkInitialized = useRef(false)
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)
  const [collectorOverrides, setCollectorOverrides] = useState<Partial<CollectorInput>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [quote, setQuote] = useState<Quote | null>(null)
  const [reviewed, setReviewed] = useState(false)
  const [recovery, setRecovery] = useState<'checking' | 'ready' | 'unresolved'>('checking')
  const [now, setNow] = useState(0)
  useEffect(() => { const update = () => setNow(Date.now()); update(); const timer = window.setInterval(update, 1000); return () => window.clearInterval(timer) }, [])
  useEffect(() => { if (!networkInitialized.current && cart.data?.items[0]) { setNetwork(cart.data.items[0].nft.network); networkInitialized.current = true } }, [cart.data])
  const wallet = wallets.data?.items.find((item) => item.id === selectedWallet && item.network === network) ?? wallets.data?.items.find((item) => item.network === network)
  const user = session.data?.user
  const collector: CollectorInput = { displayName: wallet?.displayName ?? user?.name ?? '', username: user?.username ?? '', profileName: wallet?.profileName ?? user?.username ?? '', secondaryAddress: wallet?.secondaryAddress ?? '', referralCode: wallet?.referralCode ?? 'KURIO', email: wallet?.email ?? user?.email ?? '', ensName: wallet?.ensName ?? user?.ensName ?? '', note: '', ...collectorOverrides }
  const updateCollector = (name: keyof CollectorInput, value: string) => { setCollectorOverrides((current) => ({ ...current, [name]: value })); setFieldErrors((current) => ({ ...current, [name]: '' })); setQuote(null); setReviewed(false) }
  const connected = wallet?.id === wallets.data?.connectedId
  const quoteFresh = Boolean(quote && cart.data && Date.parse(quote.expiresAt) > now && quote.coupon === cart.data.coupon && quote.wallet.id === wallet?.id && JSON.stringify(quote.collector) === JSON.stringify(collector) && quote.items.length === cart.data.items.length && quote.items.every((item) => { const current = cart.data!.items.find((entry) => entry.nft.id === item.nft.id && entry.editionId === item.editionId); return current && current.quantity === item.quantity && current.nft.priceEth === item.nft.priceEth && current.nft.version === item.nft.version && current.nft.editions.find((edition) => edition.id === current.editionId)?.available === item.nft.editions.find((edition) => edition.id === item.editionId)?.available }))
  const connect = useMutation({ mutationFn: (id: string) => connectWallet(id), onSuccess: () => { void client.invalidateQueries({ queryKey: ['wallets', token] }); setQuote(null) } })
  const disconnect = useMutation({ mutationFn: disconnectWallet, onSuccess: () => { void client.invalidateQueries({ queryKey: ['wallets', token] }); setQuote(null) } })
  const quoteMutation = useMutation({ mutationFn: () => createQuote(wallet!.id, network, collector), onMutate: () => { setQuote(null); setReviewed(false) }, onSuccess: (result) => { saveCheckoutAttempt(userId, { quoteId: result.id, key: crypto.randomUUID() }); setQuote(result) }, onError: (error) => { const fields = isAxiosError(error) ? apiErrorSchema.safeParse(error.response?.data).data?.error.fieldErrors : undefined; if (fields) { setFieldErrors(fields); const first = Object.keys(fields)[0]; if (first) focusCollectorField(first) } } })
  const requestQuote = () => {
    const parsed = collectorInputSchema.safeParse(collector)
    if (!parsed.success) { setFieldErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]))); const first = parsed.error.issues[0]?.path[0]; if (first !== undefined) focusCollectorField(String(first)); return }
    setFieldErrors({})
    quoteMutation.mutate()
  }
  const orderMutation = useMutation({ mutationFn: async () => {
    if (!quote) throw new Error('Cotação ausente')
    const stored = readCheckoutAttempt(userId)
    const key = stored?.quoteId === quote.id ? stored.key : crypto.randomUUID()
    saveCheckoutAttempt(userId, { quoteId: quote.id, key })
    return submitOrder(quote.id, key)
  }, onSuccess: (order) => { void navigate({ to: '/orders/$orderId', params: { orderId: order.id } }) }, onError: () => { setRecovery('unresolved'); void cart.refetch() } })

  const recoverAttempt = useCallback(async () => {
    const stored = readCheckoutAttempt(userId)
    if (!stored) { setRecovery('ready'); return }
    setRecovery('checking')
    try {
      const order = await getOrderByKey(stored.key)
      void navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
      return
    } catch (error) {
      if (!isAxiosError(error) || error.response?.status !== 404) { setRecovery('unresolved'); return }
    }
    try {
      const restored = await getQuote(stored.quoteId)
      setQuote(restored)
      if (restored.collector) setCollectorOverrides(restored.collector)
      setNetwork(restored.wallet.network)
      setSelectedWallet(restored.wallet.id)
      setReviewed(false)
      networkInitialized.current = true
      setRecovery('ready')
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) { clearCheckoutAttempt(userId, stored.quoteId); setRecovery('ready') }
      else setRecovery('unresolved')
    }
  }, [navigate, userId])

  useEffect(() => {
    const timer = window.setTimeout(() => void recoverAttempt(), 0)
    return () => window.clearTimeout(timer)
  }, [recoverAttempt])

  return <><MarketHeader /><main className="market-container commerce-page checkout-page"><nav className="commerce-breadcrumb"><Link to="/" search={{ q: '', sort: 'recent', tab: 'all', page: 1 }}>Início</Link> / Mercado / Pagamento</nav><h1>Pagamento com carteira</h1>
    {cart.isPending || wallets.isPending || session.isPending ? <div className="commerce-layout"><Skeleton className="commerce-skeleton" /><Skeleton className="commerce-skeleton" /></div> : cart.isError || wallets.isError || session.isError ? <div className="commerce-message" role="alert">Não foi possível carregar o pagamento. <Button variant="plain" onClick={() => { void cart.refetch(); void wallets.refetch(); void session.refetch() }}>Tentar novamente</Button></div> : !cart.data.items.length ? <div className="commerce-message"><h2>Seu carrinho está vazio</h2><Link to="/cart">Voltar ao carrinho</Link></div> : <div className="commerce-layout"><section className="commerce-checkout">
      <h2>Perfil do colecionador</h2><p>Confira os dados que serão guardados no recibo simulado.</p>
      <div className="account-fields commerce-collector-fields">{([
        ['displayName', 'Nome de exibição *'], ['username', 'Nome de usuário *'],
        ['profileName', 'Nome do perfil *'], ['secondaryAddress', 'ENS ou carteira secundária (opcional)'],
        ['referralCode', 'Código de indicação *'], ['email', 'E-mail *'], ['ensName', 'Nome ENS *'],
      ] as const).map(([name, label]) => <div className="account-field" key={name}><label htmlFor={`checkout-${name}`}>{label}</label><Input id={`checkout-${name}`} type={name === 'email' ? 'email' : 'text'} value={collector[name]} onChange={(event) => updateCollector(name, event.target.value)} aria-invalid={Boolean(fieldErrors[name])} aria-describedby={fieldErrors[name] ? `checkout-${name}-error` : undefined} />{fieldErrors[name] && <p role="alert" id={`checkout-${name}-error`} className="commerce-error">{fieldErrors[name]}</p>}</div>)}
        <div className="account-field"><label htmlFor="checkout-address">Endereço da carteira *</label><output id="checkout-address" className="checkout-wallet-address">{wallet?.address ?? ''}</output></div>
        <div className="account-field"><label htmlFor="checkout-type">Tipo de carteira *</label><Input id="checkout-type" value={wallet?.walletType ?? 'Carteira de demonstração'} readOnly /></div>
      </div><div className="account-field commerce-note-field"><label htmlFor="checkout-note">Observação do colecionador (opcional)</label><Textarea id="checkout-note" value={collector.note} onChange={(event) => updateCollector('note', event.target.value)} maxLength={500} aria-invalid={Boolean(fieldErrors.note)} />{fieldErrors.note && <p role="alert" className="commerce-error">{fieldErrors.note}</p>}</div>
      <h2 className="commerce-wallet-heading">Carteira e rede</h2><p>Selecione uma carteira de demonstração e conecte para gerar a cotação.</p>
      <div className="commerce-fields"><label>Rede<NativeSelect value={network} onChange={(event) => { setNetwork(event.target.value as 'Ethereum' | 'Polygon' | 'Solana'); setSelectedWallet(null); setCollectorOverrides({}); setQuote(null) }}><option>Ethereum</option><option>Polygon</option><option>Solana</option></NativeSelect></label>
        <label>Carteira<NativeSelect value={wallet?.id ?? ''} onChange={(event) => { setSelectedWallet(event.target.value); setCollectorOverrides({}); setQuote(null) }}>{wallets.data.items.filter((item) => item.network === network).map((item) => <option key={item.id} value={item.id}>{item.label} · {item.address.slice(0, 8)}…</option>)}</NativeSelect></label></div>
      <p role="status" className="commerce-wallet-status">{connected ? `Conectada: ${wallet?.address}` : 'Carteira desconectada'}</p>
      {!wallet && <p role="alert" className="commerce-error">Nenhuma carteira nesta rede. <Link to="/account/wallets">Adicionar carteira</Link> para continuar.</p>}
      {connected ? <Button variant="marketOutline" className="commerce-secondary-button" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>Desconectar carteira</Button> : <Button variant="marketOutline" className="commerce-secondary-button" onClick={() => wallet && connect.mutate(wallet.id)} disabled={!wallet || connect.isPending}>Conectar carteira</Button>}
      {connect.isError && <p role="alert" className="commerce-error">{errorText(connect.error)}</p>}
      {recovery !== 'ready' && <div className="commerce-message" role="status"><p>{recovery === 'checking' ? 'Verificando a tentativa de compra anterior…' : 'Não foi possível verificar a tentativa anterior. Confirme seu estado antes de enviar outra compra.'}</p>{recovery === 'unresolved' && <Button variant="plain" onClick={() => void recoverAttempt()}>Verificar pedido novamente</Button>}</div>}
      <section className="commerce-review"><h2>Revisão do pedido</h2>
        {cart.data.items.some((item) => item.priceChanged || item.quantity > (item.nft.editions.find((edition) => edition.id === item.editionId)?.available ?? 0)) && <p className="commerce-change" role="alert">Um item mudou desde que foi adicionado. Confira os valores e a disponibilidade da edição.</p>}
        <Button variant="marketOutline" className="commerce-secondary-button" disabled={recovery !== 'ready' || !connected || quoteMutation.isPending || orderMutation.isPending || cart.data.items.some((item) => item.quantity > (item.nft.editions.find((edition) => edition.id === item.editionId)?.available ?? 0))} onClick={requestQuote}>{quote ? 'Atualizar cotação' : 'Gerar cotação'}</Button>
        {quoteMutation.isError && <p role="alert" className="commerce-error">{errorText(quoteMutation.error)}</p>}
      </section>
      {quote && <section className="commerce-review"><h2>Cotação da API</h2><p>Válida até {new Date(quote.expiresAt).toLocaleTimeString('pt-BR')}.</p>{!quoteFresh && <p role="alert" className="commerce-change">A cotação está desatualizada. Gere outra antes de confirmar.</p>}<label className="commerce-confirm"><Input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} disabled={!quoteFresh} /> Revisei os itens, a carteira e o total.</label></section>}
      {orderMutation.isError && <p role="alert" className="commerce-error">{errorText(orderMutation.error)} Sua tentativa foi preservada. Verifique o pedido antes de tentar novamente.</p>}
    </section><CartSummary title="Seus NFTs" value={quoteFresh && quote ? quote : cart.data} before={<div className="checkout-order-items"><div className="checkout-order-head"><span>NFTs</span><span>Subtotal</span></div>{cart.data.items.map((item) => <div className="commerce-review-item" key={`${item.nft.id}:${item.editionId}`}><img src={item.nft.image} alt={`Arte de ${item.nft.name}`} /><span>{item.nft.name} · {item.nft.editions.find((edition) => edition.id === item.editionId)?.label} × {item.quantity}</span><strong>{new Decimal(item.nft.priceEth).times(item.quantity).toString()} ETH</strong></div>)}</div>}>{quote && quoteFresh && <p className="commerce-quote-note">Total confirmado pela cotação da API.</p>}<Button variant="market" className="commerce-primary" disabled={recovery !== 'ready' || !quoteFresh || !reviewed || orderMutation.isPending} onClick={() => orderMutation.mutate()}>{orderMutation.isPending ? 'Enviando pedido…' : 'Confirmar compra'}</Button><Link className="commerce-secondary" to="/cart">Voltar ao carrinho</Link></CartSummary></div>}
  </main></>
}
