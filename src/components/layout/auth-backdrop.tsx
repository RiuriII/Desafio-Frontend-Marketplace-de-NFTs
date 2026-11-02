import { MarketHeader } from '@/components/layout/market-header'

const cards = [
  { image: '/images/b7cfc.png', name: 'Emerald Ape #042', price: '1.19 ETH' },
  { image: '/images/9add2.png', name: 'Sage Nomad #009', price: '1.69 ETH' },
  { image: '/images/8f387.png', name: 'Neon Vessel #552', price: '1.99 ETH' },
  { image: '/images/83794.png', name: 'Cosmic Bloom #118', price: '1.29 ETH' },
]

export function AuthBackdrop() {
  return <div className="auth-desktop-scene" aria-hidden="true" inert>
    <MarketHeader />
    <div className="auth-scene-content">
      <div className="auth-scene-hero"><div><p>Bem-vindo à Kurio</p><h2>SEJA DONO DO FUTURO<br />DA ARTE DIGITAL</h2><p>Descubra NFTs selecionados de criadores de arte digital verificada.</p><span>EXPLORAR</span></div><img src="/images/8f387.png" alt="" /></div>
      <div className="auth-scene-market"><aside><h3>Coleções</h3><p>Arte digital</p><p>Fotografia</p><p>Música</p><p>Arte 3D</p><p>Colecionáveis</p><h3>Faixa de preço</h3><p>Preço: 0,02 – 12,30 ETH</p><h3>Rede</h3><p>Ethereum</p><p>Polygon</p><p>Solana</p></aside><div><div className="auth-scene-toolbar">Todos os NFTs · Novos lançamentos · Em alta <span>Ordenar por: Listados recentemente</span></div><div className="auth-scene-grid">{[...cards, ...cards, ...cards].map((card, index) => <div className="auth-scene-card" key={index}><img src={card.image} alt="" /><p>{card.name}<br /><strong>{card.price}</strong></p></div>)}</div></div></div>
    </div>
  </div>
}
