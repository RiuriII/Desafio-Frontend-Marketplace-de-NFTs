import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { env } from '@/lib/env'
import '@/styles/globals.css'

async function bootstrap() {
  if (env.mocksEnabled) {
    const { worker } = await import('@/mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass' })
  }
  // Socket.IO captures the WebSocket constructor when imported. Load it after MSW patches it.
  const { AppProviders } = await import('@/app/providers/app-providers')
  createRoot(document.getElementById('root')!).render(
    <StrictMode><AppProviders /></StrictMode>,
  )
}

void bootstrap().catch((error: unknown) => {
  console.error('Falha ao inicializar a aplicação', error)
  const root = document.getElementById('root')
  if (root) {
    root.setAttribute('role', 'alert')
    root.textContent = 'Não foi possível iniciar a aplicação. Recarregue a página para tentar novamente.'
  }
})
