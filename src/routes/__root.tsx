import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: () => (
    <>
      <a className="sr-only focus:not-sr-only" href="#main">Pular para o conteúdo</a>
      <main id="main" tabIndex={-1}><Outlet /></main>
    </>
  ),
  notFoundComponent: () => (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold">Página não encontrada</h1>
      <Link to="/" search={{ q: "", sort: "recent", tab: "all", page: 1 }} className="underline">Voltar ao início</Link>
    </section>
  ),
  errorComponent: ({ reset }) => (
    <section role="alert" className="space-y-4">
      <h1 className="text-3xl font-semibold">Não foi possível abrir esta página</h1>
      <button type="button" onClick={reset} className="underline">Tentar novamente</button>
    </section>
  ),
})
