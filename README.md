# NFT Marketplace

Marketplace em React e TypeScript. As nove telas desktop do desafio estão implementadas, com versões responsivas para os seis frames mobile. Catálogo, favoritos, perfil, carteiras, carrinho, checkout e pedidos usam uma API simulada.

## Referências

- [Repositório do desafio](https://github.com/junglegaming/frontend-challenge)
- [Layout no Figma](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1)
- [Arquitetura e contratos REST/Socket.IO](ARCHITECTURE.md)

## API simulada

O desafio exige MSW para simular API, autenticação, carteiras e compras. A interface usa Axios, TanStack Query e Socket.IO; handlers e stores do MSW mantêm o estado da demonstração no navegador. Não há backend, transação blockchain ou pagamento real. O build demo também inclui os mocks.

## Instalação

Requer Node 24.13+ da linha 24 (ver `.nvmrc`) e npm 11.

```sh
npm ci
npm run dev
```

Abra o endereço exibido pelo Vite. `npm run dev` usa o modo demo com MSW; nenhuma variável local é necessária. A home fica em `/`, um NFT em `/nfts/nft-001` e o diagnóstico de REST/Socket.IO em `/health`. Checkout, pedidos, perfil e carteiras exigem login.

Somente `.env.example` é versionado. Para personalizar o ambiente, copie-o para `.env.local` e reinicie o Vite:

| Variável | Padrão | Uso |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `true` no modo demo | Ativa MSW antes da interface |
| `VITE_API_BASE_URL` | `/api` | Base REST |
| `VITE_SOCKET_URL` | Origem da página | URL do socket, normalmente omitida |
| `VITE_MOCK_SCENARIO` | `default` | Cenário inicial do catálogo |

Variáveis `VITE_*` são públicas e não devem conter segredos.

## Contas e compra

| E-mail | Senha |
| --- | --- |
| `collector@example.test` | `Demo12345!` |
| `artist@example.test` | `Demo12345!` |

Também é possível criar uma conta no cadastro. Para restaurar contas, NFTs, carrinho, carteiras e pedidos, execute no console da aplicação:

```js
await fetch('/api/__mock/reset', { method: 'POST' })
```

Abra um NFT, navegue pela galeria, escolha edição e quantidade e clique em **COMPRAR**. O carrinho de visitante é mesclado à conta após login. No checkout, confira os dados do colecionador, conecte a carteira Ethereum, gere a cotação, marque a revisão e confirme a compra. Se necessário, cadastre uma carteira em **Meu perfil → Carteiras**. O recibo mantém a edição, a quantidade e o valor confirmados pela API. O cupom `KURIO10` concede 10%; `EXPIRED` simula cupom vencido.

## Cenários de falha

Selecione um cenário do catálogo em `.env.local` ou durante a sessão:

```js
await fetch('/api/__mock/scenario', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ scenario: 'out-of-order' }),
})
```

Valores: `default`, `slow`, `variable-latency`, `out-of-order`, `http-error` e `network-error`. Para verificar respostas fora de ordem, selecione `out-of-order`, busque **Emerald** e logo depois **Sage**; o resultado final deve ser Sage.

Para a próxima tentativa de compra, envie `outcome` como `refused`, `timeout-after-create`, `slow-response-after-create` ou `wallet-refused`:

```js
await fetch('/api/__mock/payment-outcome', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ outcome: 'timeout-after-create' }),
})
```

Use um comando por cenário. `confirmed` restaura o resultado padrão, e o reset acima restaura todo o estado. Após um timeout, o checkout recupera o pedido pela chave de idempotência. Em `slow-response-after-create`, atualize a página logo após confirmar para testar a retomada. Para invalidar uma cotação aberta, altere um NFT com `POST /api/__mock/nfts/:nftId`. Para testar perda de eventos, execute `POST /api/__mock/socket/pause`, altere um NFT ou confirme um pedido e execute `POST /api/__mock/socket/resume`. Os [contratos da API](ARCHITECTURE.md#contratos-da-api) registram payloads e eventos.

## Verificação e entrega

Antes dos testes, execute `npx playwright install chromium`.

| Comando | Verificação |
| --- | --- |
| `npm run check` | Tipos e lint |
| `npm run build:demo` | Build otimizado com mocks |
| `npm run test:e2e` | Jornadas funcionais em desktop, tablet e mobile |
| `npm run test:e2e:preview` | Jornadas no build otimizado |
| `npm run test:visual` | Capturas de início, detalhe, carrinho e pagamento em desktop/mobile |
| `npm run audit:lighthouse` | Três medições por página e perfil |

As baselines visuais estão em `tests/visual/marketplace.spec.ts-snapshots/`. O [relatório HTML do Playwright](reports/playwright/index.html) e os [relatórios Lighthouse](reports/lighthouse/README.md) acompanham a entrega. A configuração de `vercel.json` executa `build:demo`, publica `dist` e encaminha rotas da SPA para `index.html`; depois do deploy, confira acesso direto e refresh de uma rota interna.
