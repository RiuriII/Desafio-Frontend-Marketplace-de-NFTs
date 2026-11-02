# Auditoria Lighthouse — 02/11/2026

O script `npm run audit:lighthouse` gerou três medições válidas por página e perfil, com build otimizado de demonstração, MSW ativo, Chromium headless e execução sequencial. `summary.json` registra versões das ferramentas, ambiente, condições, resultados individuais e medianas. Os arquivos HTML e JSON de cada execução estão nesta pasta.

| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início | Mobile | 98 | 100 | 100 | 92 | 2,09 s | 0,0004 | 101 ms |
| Início | Desktop | 98 | 100 | 100 | 92 | 2,15 s | 0,0004 | 113 ms |
| Detalhe | Mobile | 98 | 100 | 100 | 92 | 2,25 s | 0,0002 | 90 ms |
| Detalhe | Desktop | 98 | 100 | 100 | 92 | 2,27 s | 0,0002 | 90 ms |

Os valores são medianas das três execuções. Todas as categorias superaram as metas mínimas estabelecidas pelo desafio: Performance ≥ 90 (atingido 98), Acessibilidade ≥ 95 (atingido 100), Melhores Práticas ≥ 95 (atingido 100) e SEO ≥ 90 (atingido 92). O SEO em 92 reflete a limitação de metadados específicos por rota nesta SPA. A imagem principal PNG tem cerca de 1,9 MB e ainda é o principal custo de LCP; o documento a prioriza para carregar o frame completo. Fontes, imagens, MSW e Socket.IO permaneceram ativos durante as medições.

O script prepara o service worker via `/health` antes de cada execução e preserva o storage durante a navegação. Ele rejeita capturas do detalhe em que o NFT ainda não apareceu, para que o skeleton não seja medido como página pronta. A pausa após `load` é de 2,5 s; os tempos de LCP continuam sendo medidos desde a navegação inicial pelo Lighthouse.
