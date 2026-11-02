import type { Cart, Quote } from '@/contracts/commerce'

export function CartSummary({ value, before, children, title = 'Resumo do pedido' }: { value: Cart | Quote; before?: React.ReactNode; children?: React.ReactNode; title?: string }) {
  return <aside className="commerce-summary" aria-label="Resumo da compra"><h2>{title}</h2>{before}<dl>
    <div><dt>Subtotal</dt><dd>{value.subtotalEth} ETH</dd></div>
    <div><dt>Desconto{value.coupon ? ` (${value.coupon})` : ''}</dt><dd>− {value.discountEth} ETH</dd></div>
    <div><dt>Taxa de rede</dt><dd>{value.networkFeeEth} ETH</dd></div>
    <div className="commerce-total"><dt>Total</dt><dd>{value.totalEth} ETH</dd></div>
  </dl>{children}</aside>
}
