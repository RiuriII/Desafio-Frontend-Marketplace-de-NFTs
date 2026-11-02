import { expect, test, type Page } from '@playwright/test'

async function reset(page: Page) {
  await page.goto('/health')
  await expect(page.getByText('API REST: ok')).toBeVisible()
  await page.evaluate(async () => { const response = await fetch('/api/__mock/reset', { method: 'POST' }); if (!response.ok) throw new Error('Reset falhou') })
}
async function socketClients(page: Page) { return page.evaluate(async () => (await (await fetch('/api/__mock/socket/status')).json() as { connectedClients: number }).connectedClients) }

async function checkoutReady(page: Page) {
  await page.goto('/nfts/nft-001')
  await page.getByRole('button', { name: 'COMPRAR' }).click()
  await page.getByRole('link', { name: 'Continuar para pagamento' }).click()
  await page.getByLabel('E-mail').fill('collector@example.test')
  await page.getByLabel('Senha', { exact: true }).fill('Demo12345!')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/checkout/)
  await page.getByRole('button', { name: 'Conectar carteira', exact: true }).click()
  await expect(page.getByText('Conectada:', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Gerar cotação' }).click()
  await page.getByRole('checkbox', { name: 'Revisei os itens, a carteira e o total.' }).check()
}

test('evento privado cart.updated reconcilia o carrinho via REST', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Transporte privado validado no desktop')
  await reset(page)
  await checkoutReady(page)
  await page.goto('/cart')
  await expect(page.getByText('Emerald Ape #042')).toBeVisible()
  await page.evaluate(async () => {
    const token = localStorage.getItem('kurio:session-token:v1')
    const response = await fetch('/api/cart/items', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ nftId: 'nft-002', editionId: 'edition-10', quantity: 1 }) })
    if (!response.ok) throw new Error(`Falha no carrinho: ${response.status}`)
  })
  await expect(page.getByText('Sage Nomad #009')).toBeVisible({ timeout: 5_000 })
})

test('reconexão consulta REST após perder nft.updated', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Reconexão validada no desktop')
  await reset(page)
  await page.goto('/nfts/nft-001')
  await page.getByRole('button', { name: 'COMPRAR' }).click()
  await expect(page.getByText('1.19 ETH').first()).toBeVisible()
  await page.evaluate(async () => { await fetch('/api/__mock/socket/pause', { method: 'POST' }) })
  await expect.poll(() => socketClients(page)).toBe(0)
  await page.evaluate(async () => { await fetch('/api/__mock/nfts/nft-001', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ priceEth: '1.39' }) }) })
  await expect(page.getByText('Preço atualizado de 1.19 para 1.39 ETH.')).toHaveCount(0)
  await page.evaluate(async () => { await fetch('/api/__mock/socket/resume', { method: 'POST' }) })
  await expect.poll(() => socketClients(page), { timeout: 5_000 }).toBeGreaterThan(0)
  await expect(page.getByText('Preço atualizado de 1.19 para 1.39 ETH.')).toBeVisible({ timeout: 5_000 })
})

test('pedido pendente recupera confirmação após reconexão', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Reconexão de pedido validada no desktop')
  await reset(page)
  await checkoutReady(page)
  await page.evaluate(async () => { await fetch('/api/__mock/socket/pause', { method: 'POST' }) })
  await expect.poll(() => socketClients(page)).toBe(0)
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('heading', { name: 'Pedido em processamento' })).toBeVisible()
  await page.waitForTimeout(1_200)
  await expect(page.getByRole('heading', { name: 'Pedido em processamento' })).toBeVisible()
  await page.evaluate(async () => { await fetch('/api/__mock/socket/resume', { method: 'POST' }) })
  await expect.poll(() => socketClients(page), { timeout: 5_000 }).toBeGreaterThan(0)
  await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toBeVisible({ timeout: 5_000 })
  const available = await page.evaluate(async () => (await (await fetch('/api/nfts/nft-001')).json() as { available: number }).available)
  expect(available).toBe(9)
})

test('order.updated confirma pedido pelo socket antes do polling', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Evento privado validado no desktop')
  await reset(page)
  await checkoutReady(page)
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('heading', { name: 'Pedido confirmado' })).toBeVisible({ timeout: 3_000 })
})

test('sessão expirada no canal privado limpa a conta anterior', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Sessão privada validada no desktop')
  await reset(page)
  await checkoutReady(page)
  await page.goto('/cart')
  await expect(page.getByText('Emerald Ape #042')).toBeVisible()
  await page.evaluate(async () => {
    const token = localStorage.getItem('kurio:session-token:v1')
    const expired = await fetch('/api/__mock/expire-session', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    if (!expired.ok) throw new Error(`Expiração falhou: ${expired.status}`)
    const replay = await fetch('/api/__mock/socket/replay', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'cart', payload: { eventId: crypto.randomUUID(), resourceId: 'user-collector', userId: 'user-collector', version: 99 } }) })
    if (!replay.ok) throw new Error(`Evento falhou: ${replay.status}`)
  })
  await expect.poll(() => page.evaluate(() => localStorage.getItem('kurio:session-token:v1')), { timeout: 5_000 }).toBeNull()
  await expect(page.getByRole('link', { name: 'Entrar' }).first()).toBeVisible()
})

test('nft.updated antigo ou duplicado não reaplica consultas', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Duplicatas validadas no desktop')
  await reset(page)
  let detailReads = 0
  page.on('request', (request) => { if (request.method() === 'GET' && new URL(request.url()).pathname === '/api/nfts/nft-001') detailReads++ })
  await page.goto('/nfts/nft-001')
  await expect(page.locator('.detail-price')).toHaveText('1.19 ETH')
  await page.evaluate(async () => { await fetch('/api/__mock/nfts/nft-001', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ priceEth: '1.39' }) }) })
  await expect(page.locator('.detail-price')).toHaveText('1.39 ETH', { timeout: 5_000 })
  const nft = await page.evaluate(async () => await (await fetch('/api/nfts/nft-001')).json() as { id: string; priceEth: string; version: number })
  const before = detailReads
  expect(before).toBeGreaterThan(1)
  await page.evaluate(async (current) => {
    for (const version of [1, current.version]) {
      const response = await fetch('/api/__mock/socket/replay', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'nft', payload: { eventId: crypto.randomUUID(), resourceId: current.id, version, nft: { ...current, priceEth: '1.19', version } } }) })
      if (!response.ok) throw new Error(`Replay falhou: ${response.status}`)
    }
  }, nft)
  await page.waitForTimeout(500)
  expect(detailReads).toBe(before)
  await expect(page.locator('.detail-price')).toHaveText('1.39 ETH')
})
