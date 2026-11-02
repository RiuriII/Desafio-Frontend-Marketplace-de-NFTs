import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { ChevronLeft, ChevronRight, Heart, Home, ScanLine, Search, ShoppingCart, SlidersHorizontal, UserRound } from 'lucide-react'
import { Route } from '@/routes/index'
import { getCatalog } from '@/features/catalog/api'
import { MarketHeader } from '@/components/layout/market-header'
import { NftCard } from '@/components/shared/nft-card'
import { categorySchema, networkSchema, type CatalogSearch } from '@/contracts/nft'

const categoryLabels: Record<string, string> = {
  'arte-digital': 'Arte digital', fotografia: 'Fotografia', musica: 'Música', 'arte-3d': 'Arte 3D',
  colecionaveis: 'Colecionáveis', generativa: 'Generativa', jogos: 'Jogos',
}

export function HomePage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/' })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const query = useQuery({
    queryKey: ['nfts', search],
    queryFn: ({ signal }) => getCatalog(search, signal),
  })
  const update = (changes: Partial<CatalogSearch>) => void navigate({ search: (previous) => ({ ...previous, ...changes, page: changes.page ?? 1 }), hash: 'catalogo', hashScrollIntoView: false, resetScroll: false })
  const searchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    update({ q: String(form.get('q') ?? '').trim() })
  }
  const priceSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const min = String(form.get('min') ?? '')
    const max = String(form.get('max') ?? '')
    update({ minPrice: min ? Number(min) : undefined, maxPrice: max ? Number(max) : undefined })
  }
  const pages = query.data ? Math.max(1, Math.ceil(query.data.total / query.data.pageSize)) : 1

  return <div className="home-screen">
    <MarketHeader />
    <div className="market-container home-page">
      <div className="mobile-market-top"><form className="mobile-market-search" role="search" onSubmit={searchSubmit}><Button variant="plain" type="submit" aria-label="Buscar"><Search size={20} aria-hidden="true" /></Button><Input name="q" aria-label="Buscar NFTs" defaultValue={search.q} placeholder="Explorar coleções" /></form><Button variant="plain" className="mobile-top-filter" type="button" aria-label="Filtros" aria-expanded={filtersOpen} aria-controls="catalog-filters" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={22} /></Button></div>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">Bem-vindo à Kurio</p>
          <h1 id="hero-title"><span className="desktop-hero-title">SEJA DONO DO FUTURO<br />DA ARTE DIGITAL</span><span className="mobile-hero-title">SEJA DONO DA<br />CULTURA DIGITAL</span></h1>
          <p>Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara e apoie artistas.</p>
          <a href="#catalogo" className="primary-action">EXPLORAR</a>
        </div>
        <img className="hero-art" src="/images/8f387.png" alt="Arte digital em destaque da coleção Kurio" width="450" height="450" fetchPriority="high" />
        <img className="hero-art-secondary" src="/images/9add2.png" alt="" width="90" height="90" />
        <span className="hero-dots" aria-hidden="true">● ● ●</span>
      </section>

      <section id="catalogo" className="catalog" aria-labelledby="catalog-title">
        <h2 id="catalog-title" className="sr-only">Mercado de NFTs</h2>
        <aside id="catalog-filters" className={`filters ${filtersOpen ? 'is-open' : ''}`} aria-label="Filtros do catálogo">
          <h2>Filtros</h2>
          <label htmlFor="category">Coleções</label>
          <NativeSelect id="category" value={search.category ?? ''} onChange={(event) => update({ category: categorySchema.safeParse(event.target.value).data })}>
            <option value="">Todas as coleções</option>{categorySchema.options.map((value) => <option key={value} value={value}>{categoryLabels[value]}</option>)}
          </NativeSelect>
          <form key={`${search.minPrice}-${search.maxPrice}`} onSubmit={priceSubmit} className="price-form">
            <fieldset><legend>Faixa de preço</legend><div className="price-inputs"><label>De <Input name="min" type="number" min="0" step="0.01" defaultValue={search.minPrice ?? ''} placeholder="0,02" /></label><label>Até <Input name="max" type="number" min="0" step="0.01" defaultValue={search.maxPrice ?? ''} placeholder="12,30" /></label></div><Button variant="market" type="submit" className="small-action">Aplicar</Button></fieldset>
          </form>
          <label htmlFor="network">Rede</label>
          <NativeSelect id="network" value={search.network ?? ''} onChange={(event) => update({ network: networkSchema.safeParse(event.target.value).data })}>
            <option value="">Todas as redes</option>{networkSchema.options.map((value) => <option key={value} value={value}>{value}</option>)}
          </NativeSelect>
          <label className="mobile-filter-sort">Ordenar por<NativeSelect aria-label="Ordenar por no mobile" value={search.sort} onChange={(event) => update({ sort: event.target.value as CatalogSearch['sort'] })}><option value="recent">Listados recentemente</option><option value="price-asc">Menor preço</option><option value="price-desc">Maior preço</option><option value="popular">Mais populares</option></NativeSelect></label>
          <Button variant="plain" type="button" className="clear-filters" onClick={() => void navigate({ search: { q: '', sort: 'recent', tab: 'all', page: 1 }, hash: 'catalogo', hashScrollIntoView: false, resetScroll: false })}>Limpar filtros</Button>
        </aside>
        <div className="catalog-main">
          <div className="catalog-toolbar">
            <div className="catalog-tabs"><Button variant="plain" type="button" className={search.tab === 'all' ? 'selected' : ''} onClick={() => update({ tab: 'all' })}>Todos os NFTs</Button><Button variant="plain" type="button" className={search.tab === 'new' ? 'selected' : ''} onClick={() => update({ tab: 'new' })}>Novos lançamentos</Button><Button variant="plain" type="button" className={search.tab === 'trending' ? 'selected' : ''} onClick={() => update({ tab: 'trending' })}>Em alta</Button></div>
            <label>Ordenar por: <NativeSelect aria-label="Ordenar por" value={search.sort} onChange={(event) => update({ sort: event.target.value as CatalogSearch['sort'] })}><option value="recent">Listados recentemente</option><option value="price-asc">Menor preço</option><option value="price-desc">Maior preço</option><option value="popular">Mais populares</option></NativeSelect></label>
          </div>
          <form key={search.q} className="catalog-search" role="search" onSubmit={searchSubmit}><label htmlFor="catalog-q">Buscar NFTs</label><div><Input id="catalog-q" name="q" defaultValue={search.q} placeholder="Buscar NFTs, criadores ou coleções" /><Button variant="plain" type="submit">Buscar</Button></div></form>
          {query.isFetching && !query.isPending && <p role="status" className="updating">Atualizando resultados…</p>}
          {query.isPending ? <div className="nft-grid" aria-label="Carregando NFTs">{Array.from({ length: 9 }, (_, index) => <div key={index} className="card-skeleton" aria-hidden="true" />)}</div> : query.isError ? <div className="catalog-message" role="alert"><p>Não foi possível carregar os NFTs.</p><Button variant="plain" onClick={() => void query.refetch()}>Tentar novamente</Button></div> : query.data.items.length === 0 ? <div className="catalog-message"><p>Nenhum NFT encontrado para esses filtros.</p><Button variant="plain" onClick={() => void navigate({ search: { q: '', sort: 'recent', tab: 'all', page: 1 }, hash: 'catalogo', hashScrollIntoView: false, resetScroll: false })}>Limpar filtros</Button></div> : <div className="nft-grid">{query.data.items.map((nft) => <NftCard key={nft.id} nft={nft} />)}</div>}
          {!query.isPending && !query.isError && <nav className="pagination" aria-label="Paginação"><Button variant="plain" type="button" aria-label="Página anterior" disabled={search.page <= 1} onClick={() => update({ page: search.page - 1 })}><ChevronLeft size={18} /></Button>{Array.from({ length: pages }, (_, index) => <Button variant="plain" type="button" key={index} aria-current={search.page === index + 1 ? 'page' : undefined} onClick={() => update({ page: index + 1 })}>{index + 1}</Button>)}<Button variant="plain" type="button" aria-label="Próxima página" disabled={search.page >= pages} onClick={() => update({ page: search.page + 1 })}><ChevronRight size={18} /></Button></nav>}
        </div>
      </section>
      <section className="promo-row" aria-label="Coleções em destaque"><div><img src="/images/8f387.png" alt="Arte da coleção Genesis Drops" /><div><h2>Lançamentos gênesis de edição limitada</h2><p>Colecione edições escassas diretamente dos criadores.</p><a href="#catalogo">Explorar →</a></div></div><div><img src="/images/b7cfc.png" alt="Arte da coleção Curated Art" /><div><h2>Arte digital selecionada e muito mais</h2><p>Explore novos artistas e coleções verificadas.</p><a href="#catalogo">Explorar →</a></div></div></section>
      <footer className="market-footer"><Link to="/" search={{ q: "", sort: "recent", tab: "all", page: 1 }} className="brand">KURIO◆</Link><p>Feito para colecionadores, criadores e cultura digital.</p></footer>
    </div>
    <nav className="mobile-bottom-nav" aria-label="Navegação móvel"><Link to="/" search={{ q: '', sort: 'recent', tab: 'all', page: 1 }} aria-label="Início" aria-current="page"><Home size={21} fill="currentColor" /></Link><Link to="/account/profile" hash="favorites" aria-label="Lista de interesse"><Heart size={23} fill="currentColor" /></Link><span className="mobile-scan-mark" aria-hidden="true"><ScanLine size={26} /></span><Link to="/cart" aria-label="Carrinho"><ShoppingCart size={23} fill="currentColor" /></Link><Link to="/account/profile" aria-label="Perfil"><UserRound size={22} fill="currentColor" /></Link></nav>
  </div>
}
