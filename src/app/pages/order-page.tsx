import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import { MailCheck, X } from 'lucide-react'
import { MarketHeader } from '@/components/layout/market-header'
import { CartSummary } from '@/components/shared/cart-summary'
import type { Order } from '@/contracts/commerce'
import { readSessionToken } from '@/features/auth/session'
import { getOrder } from '@/features/commerce/api'
import { clearCheckoutAttempt } from '@/features/commerce/attempt'

function ConfirmedReceipt({ order }: { order: Order }) {
  const [copied, setCopied] = useState(false)
  const reference = order.transactionRef ?? order.id
  return <main className="confirmation-page"><article className="confirmation-card">
    <Link className="confirmation-close" to="/" search={{ q: '', sort: 'recent', tab: 'all', page: 1 }} aria-label="Fechar confirmação"><X size={20} /></Link>
    <div className="confirmation-hero"><MailCheck size={68} strokeWidth={1.3} aria-hidden="true" /><h1>Pedido confirmado</h1><h2>Seus NFTs agora estão na sua carteira</h2></div>
    <div className="confirmation-meta"><div><span>ID da transação</span><strong>{reference}</strong></div><div><span>Data</span><strong>{new Date(order.createdAt).toLocaleDateString('pt-BR')}</strong></div><div><span>Total</span><strong>{order.quote.totalEth} ETH</strong></div><div><span>Carteira</span><strong>{order.quote.wallet.walletType ?? order.quote.wallet.label}</strong></div></div>
    <div className="confirmation-body"><h3>Detalhes da transação</h3><div className="confirmation-table-head"><span>NFTs</span><span>Edições</span><span>Subtotal</span></div>
      {order.quote.items.map(({ nft, editionId, quantity }) => <div className="confirmation-item" key={`${nft.id}:${editionId}`}><img src={nft.image} alt={`Arte de ${nft.name}`} /><div><strong>{nft.name}</strong><span>{nft.collection}</span></div><span>{nft.editions.find((edition) => edition.id === editionId)?.label} × {quantity}</span><strong>{nft.priceEth} ETH</strong></div>)}
      <dl className="confirmation-totals"><div><dt>Taxa de rede</dt><dd>{order.quote.networkFeeEth} ETH</dd></div><div><dt>Total</dt><dd>{order.quote.totalEth} ETH</dd></div></dl>
      <p role="status">Transação simulada {reference}. Os NFTs foram atribuídos à carteira selecionada nesta demonstração.</p>
      {order.quote.collector?.note && <p>Observação: {order.quote.collector.note}</p>}
      <Button variant="market" type="button" className="commerce-primary" onClick={() => { void navigator.clipboard.writeText(reference).then(() => setCopied(true)).catch(() => setCopied(false)) }}>{copied ? 'Referência copiada' : 'Copiar referência da transação'}</Button>
    </div>
  </article></main>
}

export function OrderPage({ orderId }: { orderId: string }) {
  const order = useQuery({ queryKey: ['order', readSessionToken(), orderId], queryFn: ({ signal }) => getOrder(orderId, signal), refetchInterval: (query) => query.state.data?.status === 'pending' ? 10_000 : false })
  useEffect(() => { if (order.data?.status && order.data.status !== 'pending') clearCheckoutAttempt(order.data.userId, order.data.quote.id) }, [order.data])
  if (order.data?.status === 'confirmed') return <ConfirmedReceipt order={order.data} />
  return <><MarketHeader /><main className="market-container commerce-page"><nav className="commerce-breadcrumb"><Link to="/" search={{ q: '', sort: 'recent', tab: 'all', page: 1 }}>Mercado</Link> / Pedido</nav>
    {order.isPending ? <Skeleton className="commerce-skeleton" /> : order.isError ? <div className="commerce-message" role="alert"><h1>{isAxiosError(order.error) && order.error.response?.status === 404 ? 'Pedido não encontrado' : 'Não foi possível carregar o pedido'}</h1><Button variant="plain" onClick={() => void order.refetch()}>Tentar novamente</Button></div> : <><h1>{order.data.status === 'pending' ? 'Pedido em processamento' : 'Pagamento recusado'}</h1><p role="status" className="commerce-order-status">{order.data.status === 'pending' ? 'Estamos aguardando a resposta da simulação. Esta página pode ser atualizada sem criar outro pedido.' : order.data.refusalReason}</p><div className="commerce-layout"><section className="commerce-receipt"><h2>Recibo do pedido</h2><p>Pedido {order.data.id}</p><p>Emitido em {new Date(order.data.createdAt).toLocaleString('pt-BR')}</p>{order.data.quote.items.map(({ nft, editionId, quantity }) => <article className="commerce-review-item" key={`${nft.id}:${editionId}`}><img src={nft.image} alt={`Arte de ${nft.name}`} /><div><strong>{nft.name}</strong><p>Edição {nft.editions.find((edition) => edition.id === editionId)?.label} · {quantity} × {nft.priceEth} ETH</p></div></article>)}<p>Carteira: {order.data.quote.wallet.address}</p><p>Rede: {order.data.quote.wallet.network}</p><p>Os valores deste recibo são o snapshot do pedido.</p></section><CartSummary value={order.data.quote}>{order.data.status === 'refused' && <Link className="commerce-primary" to="/cart">Revisar carrinho</Link>}</CartSummary></div></>}
  </main></>
}
