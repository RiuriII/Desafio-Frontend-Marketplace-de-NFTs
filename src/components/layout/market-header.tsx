import { Link, useRouterState } from '@tanstack/react-router'
import { Search, ShoppingBag, UserRound } from 'lucide-react'
import { useSession } from '@/features/auth/queries'

export function MarketHeader() {
  const location = useRouterState({ select: (state) => state.location })
  const pathname = location.pathname
  const isMarket = pathname.startsWith('/nfts/') || (pathname === '/' && location.hash.replace(/^#/, '') === 'catalogo')
  const isHome = pathname === '/' && !isMarket
  const session = useSession()
  return <header className="market-header">
    <div className="market-header-inner">
      <Link to="/" search={{ q: "", sort: "recent", tab: "all", page: 1 }} className="brand" aria-label="Kurio — início">KURIO<span className="brand-mark">◆</span></Link>
      <nav className="main-nav" aria-label="Navegação principal">
        <Link to="/" search={{ q: "", sort: "recent", tab: "all", page: 1 }} activeOptions={{ exact: true, includeHash: true, includeSearch: false }} activeProps={{}} className={isHome ? 'active' : ''} aria-current={isHome ? 'page' : undefined}>Início</Link>
        <Link to="/" search={{ q: "", sort: "recent", tab: "all", page: 1 }} hash="catalogo" activeOptions={{ exact: true, includeHash: true, includeSearch: false }} activeProps={{}} className={isMarket ? 'active' : ''} aria-current={isMarket ? 'page' : undefined}>Mercado</Link>
        <span aria-disabled="true" title="Em breve">Criadores</span>
        <span aria-disabled="true" title="Fora do escopo">Aprenda</span>
      </nav>
      <div className="header-actions">
        <Link to="/" search={{ q: "", sort: "recent", tab: "all", page: 1 }} hash="catalogo" aria-label="Buscar NFTs"><Search size={19} /></Link>
        <Link to="/cart" aria-label="Abrir carrinho"><ShoppingBag size={20} /></Link>
        <Link to={session.data?.user ? '/account/profile' : '/login'} className="desktop-signin">{session.data?.user ? 'Meu perfil' : 'Entrar'}</Link>
        <Link to={session.data?.user ? '/account/profile' : '/login'} className="mobile-account" aria-label={session.data?.user ? 'Meu perfil' : 'Entrar'}><UserRound size={20} /></Link>
      </div>
    </div>
  </header>
}
