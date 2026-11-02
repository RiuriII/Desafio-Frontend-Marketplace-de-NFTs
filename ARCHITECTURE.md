# Arquitetura

## Visão geral

- React 19/Vite/TypeScript estrito, alias `@/`, Tailwind 4 e base shadcn/ui.
- Router por arquivos, code splitting, geração antes do typecheck/build e fallback de rota inexistente. Não editar `src/routeTree.gen.ts` manualmente.
- Query: staleTime 30 s, gcTime 5 min, refetch no foco/reconexão. Uma repetição para falhas Axios de rede/5xx; nenhuma para 4xx, cancelamento ou validação. Mutations sem retry.
- Axios centralizado, timeout 10 s, AbortSignal da query; Zod valida respostas/eventos técnicos.
- MSW ativado por configuração também no build demo, antes da renderização. Aplicação importada dinamicamente após worker.start: Socket.IO captura o construtor WebSocket ao ser importado.
- Socket.IO com WebSocket explícito, conexão manual, cleanup de listeners e conexão no unmount.
- Playwright em três larguras, E2E de teclado e foco, oito baselines visuais desktop/mobile e auditoria Lighthouse com três execuções por página/perfil.
- `GET /api/nfts` e `GET /api/nfts/:nftId` via Axios/MSW, com contratos Zod, 24 fixtures e valores ETH como strings. Cada NFT contém vistas navegáveis da própria imagem e edições com estoque individual. O carrinho usa NFT + edição como identidade e a cotação fixa essa escolha até o recibo. Busca, filtros, ordenação e página são estado da URL. O AbortSignal da Query cancela consultas antigas, e cada conjunto de parâmetros tem chave própria no cache. O mock oferece atrasos determinísticos variáveis e inversão controlada da ordem de duas buscas para verificar que a resposta antiga não substitui a busca atual. Home e detalhe utilizam a paleta, imagens e fonte locais derivados do Figma.
- Login, cadastro, logout e recuperação de sessão via Axios/MSW. `/account/profile` e `/account/wallets` verificam a sessão no `beforeLoad` e redirecionam para `/login` com o destino original. Perfil edita dados, avatar e senha; carteiras podem ser criadas, editadas, conectadas e removidas. Favoritos persistem por conta, com atualização otimista e rollback em falha.
- Store de auth em `localStorage` com dois usuários de demonstração, senhas com salt e hash PBKDF2, tokens aleatórios e vencimento de uma hora. Reset e expiração são endpoints exclusivos do mock. O token fica no cliente apenas para esta demonstração, sem pretensão de segurança de produção.
- O interceptor Axios envia o bearer token e limpa a sessão após 401 do token atual. Mudanças de sessão cancelam consultas, limpam o cache Query e invalidam as rotas para impedir dados privados de outra conta.
- Carrinho visitante e por usuário, cupom, três carteiras iniciais por usuário demo, carteiras cadastradas, favoritos, cotações de cinco minutos e pedidos ficam no store comercial do MSW. O login mescla quantidades do visitante com limite de disponibilidade. O reset recompõe auth e comércio.
- ETH trafega como string; `decimal.js` calcula subtotal, 10% de cupom, taxa e total com até 18 casas decimais. A UI apresenta a resposta da API. Checkout valida os campos do colecionador, exige conexão da carteira na mesma rede dos NFTs e revisão explícita da cotação. Alterações de preço, estoque, cupom, carteira ou campos de perfil no formulário invalidam a cotação. Dados do colecionador entram no snapshot do pedido.
- Pedido começa pendente e se torna confirmado ou recusado ao consultar a API após o instante de liquidação. Confirmado desconta apenas as quantidades compradas; recusado mantém o carrinho. O recibo usa o snapshot da cotação. `Idempotency-Key` persiste chave, conteúdo e pedido; timeout após criação é recuperado por chave sem repetir a compra. O cliente guarda uma tentativa por conta no `sessionStorage`. Ao voltar ao checkout, consulta a chave e, se ainda não existe pedido, restaura a cotação pela API. Uma falha de verificação bloqueia outro envio até nova consulta. Erros HTTP não são confundidos com timeout.
- `nft.updated`, `cart.updated` e `order.updated` passam pelo binding Socket.IO com identidade e versão. Os dois últimos exigem inscrição com token validado pelo mock e carregam `userId`. O cliente ignora duplicatas, versões antigas e eventos privados de outra sessão, então invalida as consultas afetadas para buscar REST. A liquidação agendada emite `order.updated`; o recibo chega sem depender do polling. Após reconexão, catálogo, carrinho, carteiras e pedidos ativos reconciliam com REST. Polling de dez segundos para pedidos pendentes serve como recuperação adicional.

## Transporte dos mocks

MSW 2.15 com `@mswjs/socket.io-binding` 0.2.0, API `toSocketIo`. O branch principal do binding pode documentar uma API diferente da versão publicada; conferir README/tipos do pacote ao atualizar.

MSW intercepta `/socket.io/` em ws/wss e normaliza esse caminho para `/` ao fazer matching; o handler usa a origem com `/`. WebSockets alheios ao Socket.IO seguem para o servidor (por exemplo, reconexão HMR do Vite). Não há servidor Socket.IO real nem fallback para polling HTTP. O binding trata handshake e serialização. O handler agenda heartbeat Engine.IO e remove o timer no fechamento, pois 0.2.0 anuncia intervalo mas não envia pings automaticamente.

O transporte usa namespace `/` e eventos de texto, sem rooms, acknowledgements ou anexos binários. O binding não oferece paridade completa com um servidor real. `system.ready` prova o transporte; `nft.updated` é público. A inscrição `session.subscribe` vincula token e conta à conexão, e cada evento privado revalida o token antes de enviar. Login, logout e expiração recriam o socket, liberando listeners da sessão anterior. O cliente mantém tentativas de reconexão com espera máxima de dois segundos; no build com mocks, o handshake expira em 1,5 segundo para recuperar rapidamente uma conexão rejeitada. O timer do pedido e a leitura REST garantem liquidação mesmo se o socket cair.

## Contratos da API

Os schemas Zod em `src/contracts/` são compartilhados por cliente e mocks. Preços e totais trafegam como strings decimais em ETH. Respostas de erro seguem `{ error: { code, message, fieldErrors? } }`; recursos privados exigem `Authorization: Bearer <token>`.

| Recurso | Rotas REST e dados principais |
| --- | --- |
| Catálogo | `GET /api/nfts` aceita busca, filtros, ordenação e página e retorna `{ items, total, page, pageSize }`; `GET /api/nfts/:nftId` retorna NFT com galeria e edições ou 404. |
| Autenticação | `POST /api/auth/register` e `/login` retornam `{ token, user, expiresAt }`; `GET /api/auth/session` recupera a sessão e `POST /api/auth/logout` revoga o token. |
| Perfil | `GET/PATCH /api/profile` lê e edita dados; `PUT /api/profile/password` exige a senha atual. |
| Carrinho | `GET /api/cart` retorna itens identificados por NFT + edição; `POST /api/cart/items` recebe `{ nftId, editionId, quantity }`; `PATCH/DELETE /api/cart/items/:nftId?editionId=...` ajusta ou remove uma edição. `PUT/DELETE /api/cart/coupon` altera o cupom. |
| Carteiras e favoritos | `GET/POST /api/wallets`, `PATCH/DELETE /api/wallets/:walletId`, `POST /api/wallets/:walletId/connect` e `/api/wallets/disconnect` gerenciam carteiras. `GET /api/favorites` e `PUT/DELETE /api/favorites/:nftId` gerenciam favoritos. |
| Cotação | `POST /api/quotes` recebe `{ walletId, network, collector }` e fixa itens, edições, carteira, cupom e totais por cinco minutos; `GET /api/quotes/:quoteId` recupera a cotação da conta. |
| Pedido | `POST /api/orders` recebe `{ quoteId }` e `Idempotency-Key`; `GET /api/orders/:orderId` consulta o pedido e `GET /api/orders/by-idempotency-key/:key` recupera uma tentativa sem resposta. Pedido e cotação de outra conta retornam 403. |

O Socket.IO usa path `/socket.io/` e namespace `/`. `system.ping` recebe `system.ready`; `session.subscribe` com token recebe `session.bound` ou `session.expired`. `nft.updated` traz `{ eventId, resourceId, version, nft }`; `cart.updated` traz `{ eventId, resourceId: userId, version, userId }`; `order.updated` acrescenta `status` e usa o ID do pedido como `resourceId`. Os eventos privados são enviados apenas à sessão vinculada. O cliente valida identidade e versão, ignora duplicatas e consulta REST para o estado definitivo.

Endpoints `POST /api/__mock/reset`, `/api/__mock/scenario`, `/api/__mock/payment-outcome`, `/api/__mock/nfts/:nftId` e `/api/__mock/favorites/fail-next` controlam o estado de teste. `POST /api/__mock/socket/pause` e `/resume` simulam desconexão; `GET /api/__mock/socket/status` e `POST /api/__mock/socket/replay` permitem inspecionar e reproduzir eventos. Esses endpoints não integram o contrato comercial da interface.

## Estado e decisões

| Estado | Responsável |
| --- | --- |
| Busca, filtros, ordenação e paginação | Search params validados pelo Router |
| Catálogo, perfil, favoritos e carteiras | API simulada + Query |
| Carrinho, cotações e pedidos | API simulada + Query |
| Sessão recuperável | API simulada + persistência controlada no store, implementada |
| Carrinho visitante | Persistência e merge no handler de login/cadastro |
| Diálogos e campos temporários | React/Formulários |
| Cotação e recibo | API; snapshot imutável no pedido |

`contracts/` compartilha schemas entre cliente/mocks; cada feature mantém seu transporte. Stores de auth e comércio servem os handlers REST; o store comercial também alimenta `nft.updated`. Os 24 NFTs cobrem filtros e paginação. O reset global restaura contas, sessões, carrinhos, cotações, pedidos, idempotência e alterações de NFT.

O estado comercial simulado usa a chave local `kurio:mock-commerce:v2`. Ela separa os itens por edição; dados de demonstração gravados pela versão anterior não são reutilizados.

A query de sessão e as queries de carrinho/carteira/pedido usam o token na chave, evitando colisão entre contas. Queries de catálogo incluem todos os parâmetros. Logout, login e expiração cancelam consultas, limpam o cache e reiniciam a inscrição privada do socket. A rota privada preserva o destino ao redirecionar para login. Senhas fictícias não são persistidas em claro.

Quantidades são inteiras e limitadas pela disponibilidade. `KURIO10` é válido e `EXPIRED` é vencido. O pedido só é enviado após cotação e revisão; cliques repetidos são bloqueados pela UI e pelo contrato de idempotência. Pedidos confirmados/recusados são terminais.

Os eventos têm identidade e versão crescente; o cliente ignora duplicatas/versões antigas e reconcilia via REST após reconexão. Eventos privados incluem `userId`, validação de sessão no mock e liberação no logout. Favoritos usam atualização otimista e repõem o estado anterior em 503.

## Limitações

Os snapshots do Playwright detectam regressões da implementação, sem medir equivalência pixel a pixel com o Figma. A confirmação mantém a composição em cartão do design, mas troca “Ver no Etherscan” por cópia da referência porque a transação é simulada. Perfil, carteiras e confirmação têm adaptação mobile própria, pois não há frames mobile dessas telas. O atalho de conteúdo foca o contêiner principal, e a validação do checkout move o foco ao primeiro campo inválido. O painel de filtros mobile é expansível e preserva a ordem de Tab. A autenticação e o comércio são simulados no navegador: cliente e MSW compartilham `localStorage`, sem segurança de servidor. O emissor do mock usa eventos do contexto da aba e não faz broadcast entre abas independentes. Não há integração com extensão de carteira ou blockchain real.

## Referências

- [TanStack Router/Vite](https://tanstack.com/router/latest/docs/installation/with-vite)
- [Binding Socket.IO](https://github.com/mswjs/socket.io-binding) — observar versão instalada
- [shadcn/ui](https://ui.shadcn.com/docs/installation/manual)
