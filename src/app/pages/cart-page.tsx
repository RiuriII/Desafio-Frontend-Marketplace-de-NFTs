import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import Decimal from 'decimal.js'
import { ArrowLeft, Minus, Plus, Trash2 } from 'lucide-react'
import { MarketHeader } from '@/components/layout/market-header'
import { CartSummary } from '@/components/shared/cart-summary'
import { NftCard } from '@/components/shared/nft-card'
import { applyCoupon, getCart, removeCartItem, removeCoupon, updateCartItem } from '@/features/commerce/api'
import { getCatalog } from '@/features/catalog/api'
import { readSessionToken } from '@/features/auth/session'

function errorText(error: unknown) { return isAxiosError(error) ? error.response?.data?.error?.message ?? 'Falha de conexão. Tente novamente.' : 'Não foi possível atualizar o carrinho.' }
function itemTotal(price: string, quantity: number) { return new Decimal(price).times(quantity).toString() }

export function CartPage() {
  const client = useQueryClient()
  const [coupon, setCoupon] = useState('')
  const key = ['cart', readSessionToken() ?? 'guest']
  const cart = useQuery({ queryKey: key, queryFn: ({ signal }) => getCart(signal), refetchInterval: 10_000 })
  const related = useQuery({ queryKey: ['cart-related'], queryFn: ({ signal }) => getCatalog({ q: '', sort: 'popular', tab: 'all', page: 1 }, signal) })
  const quantity = useMutation({ mutationFn: ({ id, editionId, value }: { id: string; editionId: string; value: number }) => updateCartItem(id, editionId, value), onSuccess: (data) => client.setQueryData(key, data) })
  const remove = useMutation({ mutationFn: ({ id, editionId }: { id: string; editionId: string }) => removeCartItem(id, editionId), onSuccess: (data) => client.setQueryData(key, data) })
  const couponMutation = useMutation({ mutationFn: applyCoupon, onSuccess: (data) => { client.setQueryData(key, data); setCoupon('') } })
  const removeCouponMutation = useMutation({ mutationFn: removeCoupon, onSuccess: (data) => client.setQueryData(key, data) })
  const busy = quantity.isPending || remove.isPending || couponMutation.isPending || removeCouponMutation.isPending
  const failure = quantity.error ?? remove.error ?? couponMutation.error ?? removeCouponMutation.error
  const relatedItems = related.data?.items.filter((nft) => !cart.data?.items.some((item) => item.nft.id === nft.id)).slice(0, 5) ?? []
  return <div className="cart-screen"><MarketHeader /><main className="market-container commerce-page cart-page"><nav className="commerce-breadcrumb"><Link to="/" search={{ q: '', sort: 'recent', tab: 'all', page: 1 }}>Início</Link> / Mercado / Carrinho</nav><div className="cart-mobile-heading"><Link to="/" search={{ q: '', sort: 'recent', tab: 'all', page: 1 }} aria-label="Voltar ao mercado"><ArrowLeft size={18} /></Link><h1>Carrinho de NFTs</h1></div><h1 className="cart-desktop-title">Seu carrinho</h1>
    {cart.isPending ? <div className="commerce-layout"><Skeleton className="commerce-skeleton" /><Skeleton className="commerce-skeleton" /></div> : cart.isError ? <div className="commerce-message" role="alert">Não foi possível carregar o carrinho. <Button variant="plain" onClick={() => void cart.refetch()}>Tentar novamente</Button></div> : cart.data.items.length === 0 ? <div className="commerce-message"><h2>Seu carrinho está vazio</h2><p>Explore o mercado para encontrar seu próximo NFT.</p><Link to="/" search={{ q: '', sort: 'recent', tab: 'all', page: 1 }}>Explorar NFTs</Link></div> : <div className="commerce-layout cart-layout"><section className="commerce-items" aria-label="Itens do carrinho">
      <div className="cart-table-head"><span>NFTs</span><span>Preço</span><span>Edições</span><span>Total</span></div>
      {cart.data.items.map(({ nft, editionId, quantity: count, addedPriceEth, priceChanged }) => {
        const edition = nft.editions.find((item) => item.id === editionId)
        const available = edition?.available ?? 0
        const itemLabel = `${nft.name}, edição ${edition?.label ?? editionId}`
        return <article className="commerce-item cart-item" key={`${nft.id}:${editionId}`}><Link className="cart-item-art" to="/nfts/$nftId" params={{ nftId: nft.id }}><img src={nft.image} alt={`Arte de ${nft.name}`} /></Link><div className="cart-item-description"><h2>{nft.name}</h2><p>ID do token: {nft.tokenId}</p><p className="cart-mobile-edition cart-item-edition">Edição: {edition?.label ?? editionId}</p>{priceChanged && <p className="commerce-change" role="status">Preço atualizado de {addedPriceEth} para {nft.priceEth} ETH.</p>}{count > available && <p className="commerce-change" role="alert">Disponibilidade alterada nesta edição: apenas {available} restante(s).</p>}</div><strong className="cart-item-price">{nft.priceEth} ETH</strong><div className="cart-quantity"><Button variant="plain" type="button" aria-label={`Diminuir quantidade de ${itemLabel}`} disabled={busy || count <= 1} onClick={() => quantity.mutate({ id: nft.id, editionId, value: count - 1 })}><Minus size={13} /></Button><NativeSelect aria-label={`Quantidade de ${itemLabel}`} value={count} disabled={busy} onChange={(event) => quantity.mutate({ id: nft.id, editionId, value: Number(event.target.value) })}>{Array.from({ length: Math.max(count, Math.min(available, 10)) }, (_, index) => <option key={index} value={index + 1}>{index + 1}</option>)}</NativeSelect><Button variant="plain" type="button" aria-label={`Aumentar quantidade de ${itemLabel}`} disabled={busy || count >= available} onClick={() => quantity.mutate({ id: nft.id, editionId, value: count + 1 })}><Plus size={13} /></Button></div><strong className="cart-item-total">{itemTotal(nft.priceEth, count)} ETH</strong><Button variant="plain" className="cart-remove" type="button" aria-label={`Remover ${itemLabel}`} disabled={busy} onClick={() => remove.mutate({ id: nft.id, editionId })}><Trash2 size={19} /></Button></article>
      })}
      {failure && <p role="alert" className="commerce-error">{errorText(failure)}</p>}
    </section><CartSummary title="Resumo da carteira" value={cart.data} before={<form className="commerce-coupon" onSubmit={(event) => { event.preventDefault(); couponMutation.mutate(coupon) }}><label htmlFor="coupon">Código promocional</label><div><Input id="coupon" aria-label="Cupom de desconto" value={coupon} onChange={(event) => setCoupon(event.target.value)} placeholder="Digite o código promocional..." /><Button variant="plain" disabled={busy || !coupon.trim()}>Aplicar</Button></div>{cart.data.coupon && <p>Cupom {cart.data.coupon} aplicado. <Button variant="plain" type="button" onClick={() => removeCouponMutation.mutate()}>Remover cupom</Button></p>}</form>}><Button variant="market" asChild><Link className="commerce-primary" to="/checkout">Continuar para pagamento</Link></Button><Link className="commerce-secondary" to="/" search={{ q: '', sort: 'recent', tab: 'all', page: 1 }}>Continuar comprando</Link></CartSummary></div>}
    {relatedItems.length > 0 && <section className="cart-related" aria-labelledby="cart-related-title"><h2 id="cart-related-title">Colecionadores também viram</h2><div className="cart-related-grid">{relatedItems.map((nft) => <NftCard key={nft.id} nft={nft} />)}</div></section>}
  </main></div>
}
