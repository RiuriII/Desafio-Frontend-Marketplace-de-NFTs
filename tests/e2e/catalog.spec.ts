import { expect, test, type Page } from '@playwright/test'

async function scenario(page: Page, name: 'default' | 'slow' | 'variable-latency' | 'out-of-order' | 'http-error' | 'network-error') {
  await page.evaluate(async (value) => {
    const response = await fetch('/api/__mock/scenario', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scenario: value }) })
    if (!response.ok) throw new Error('Falha ao configurar cenário')
  }, name)
}

test('navbar destaca somente Início ou Mercado conforme a seção', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'chromium-mobile', 'Navbar desktop não aparece no mobile')
  await page.goto('/')
  await expect(page.getByRole('link', { name: /Emerald Ape #042/ })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Navegação principal' })
  const home = nav.getByRole('link', { name: 'Início' })
  const market = nav.getByRole('link', { name: 'Mercado' })
  await expect(home).toHaveClass('active')
  await expect(market).not.toHaveClass(/active/)
  await market.click()
  await expect(page).toHaveURL(/#catalogo$/)
  await expect(market).toHaveClass('active')
  await expect(home).not.toHaveClass(/active/)
  await home.click()
  await expect(home).toHaveClass('active')
  await expect(market).not.toHaveClass(/active/)
})

test('filtro de preço atualiza só o catálogo e preserva a rolagem', async ({ page }, testInfo) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: /Emerald Ape #042/ })).toBeVisible()
  await page.locator('#catalogo').scrollIntoViewIfNeeded()
  if (testInfo.project.name === 'chromium-mobile') await page.getByRole('button', { name: 'Filtros', exact: true }).click()
  await page.locator('input[name="min"]').fill('1.5')
  const apply = page.getByRole('button', { name: 'Aplicar' })
  await apply.scrollIntoViewIfNeeded()
  const before = await page.evaluate('window.scrollY') as number
  await apply.click()
  await expect(page).toHaveURL(/minPrice=1.5/)
  await expect(page.locator('.nft-card').first()).toBeVisible()
  await expect.poll(async () => page.evaluate('window.scrollY') as Promise<number>).toBeGreaterThan(before - 60)
  await expect.poll(async () => page.evaluate('window.scrollY') as Promise<number>).toBeLessThan(before + 60)
  await expect(page.getByRole('link', { name: /Sage Nomad #009/ })).toBeVisible()
})

test('latência variável e respostas fora de ordem não substituem a busca atual', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: /Emerald Ape #042/ })).toBeVisible()

  await scenario(page, 'variable-latency')
  const delays = await page.evaluate(async () => {
    const responses = await Promise.all([
      fetch('/api/nfts?q=Emerald'),
      fetch('/api/nfts?q=Sage'),
    ])
    return responses.map((response) => Number(response.headers.get('X-Mock-Delay-Ms')))
  })
  expect(delays[0]).toBeGreaterThanOrEqual(120)
  expect(delays[0]).toBeLessThanOrEqual(840)
  expect(delays[1]).toBeGreaterThanOrEqual(120)
  expect(delays[1]).toBeLessThanOrEqual(840)
  expect(delays[0]).not.toBe(delays[1])

  await scenario(page, 'out-of-order')
  const arrivals = await page.evaluate(async () => {
    const completed: string[] = []
    const slow = fetch('/api/nfts?q=Emerald').then(() => { completed.push('Emerald') })
    await new Promise((resolve) => setTimeout(resolve, 30))
    const fast = fetch('/api/nfts?q=Sage').then(() => { completed.push('Sage') })
    await Promise.all([slow, fast])
    return completed
  })
  expect(arrivals).toEqual(['Sage', 'Emerald'])

  const emeraldRequest = page.waitForRequest((request) => request.url().includes('/api/nfts?') && request.url().includes('q=Emerald'))
  await page.getByRole('textbox', { name: 'Buscar NFTs' }).fill('Emerald')
  await page.getByRole('button', { name: 'Buscar' }).click()
  await emeraldRequest
  await page.getByRole('textbox', { name: 'Buscar NFTs' }).fill('Sage')
  await page.getByRole('button', { name: 'Buscar' }).click()
  await expect(page).toHaveURL(/q=Sage/)
  await expect(page.getByRole('link', { name: /Sage Nomad #009/ })).toBeVisible()
  await expect(page.locator('.nft-card')).toHaveCount(1)
  await page.waitForTimeout(1_700)
  await expect(page.getByRole('link', { name: /Sage Nomad #009/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Emerald Ape #042/ })).toHaveCount(0)
  await expect(page).toHaveURL(/q=Sage/)
})

test('busca, filtros, ordenação, paginação e histórico usam a API simulada', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: /Emerald Ape #042/ })).toBeVisible()
  await page.getByRole('button', { name: 'Novos lançamentos' }).click()
  await expect(page.locator('.nft-card')).toHaveCount(4)
  await page.getByRole('button', { name: 'Todos os NFTs' }).click()
  await page.getByRole('textbox', { name: 'Buscar NFTs' }).fill('Emerald')
  await page.getByRole('button', { name: 'Buscar' }).click()
  await expect(page).toHaveURL(/q=Emerald/)
  await expect(page.locator('.nft-card')).toHaveCount(1)
  await page.getByRole('textbox', { name: 'Buscar NFTs' }).fill('')
  await page.getByRole('button', { name: 'Buscar' }).click()
  if (await page.getByRole('button', { name: 'Filtros' }).isVisible()) await page.getByRole('button', { name: 'Filtros' }).click()
  await page.locator('#category').selectOption('arte-digital')
  await page.locator('#network').selectOption('Ethereum')
  await expect(page).toHaveURL(/category=arte-digital/)
  await expect(page).toHaveURL(/network=Ethereum/)
  await expect(page.locator('.nft-card')).toHaveCount(2)
  await page.getByRole('button', { name: 'Limpar filtros' }).click()
  await page.getByRole('button', { name: '2', exact: true }).click()
  await expect(page).toHaveURL(/page=2/)
  const mobileSort = page.getByLabel('Ordenar por no mobile')
  await (await mobileSort.isVisible() ? mobileSort : page.getByLabel('Ordenar por', { exact: true })).selectOption('price-desc')
  await expect(page).toHaveURL(/sort=price-desc/)
  await expect(page).not.toHaveURL(/page=2/)
  await page.goBack()
  await expect(page).toHaveURL(/page=2/)
})

test('detalhe abre diretamente e NFT inexistente tem saída', async ({ page }) => {
  await page.goto('/nfts/nft-001')
  await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
  await page.goto('/nfts/desconhecido')
  await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
  await page.getByRole('link', { name: 'Voltar ao mercado' }).click()
  await expect(page.getByRole('heading', { name: /SEJA DONO/ })).toBeVisible()
})

test('skeleton lento, erro HTTP e falha de rede permitem recuperação', async ({ page }) => {
  test.setTimeout(45_000)
  await page.goto('/health')
  await expect(page.getByText('API REST: ok')).toBeVisible()
  await page.evaluate(async () => { const response = await fetch('/api/__mock/reset', { method: 'POST' }); if (!response.ok) throw new Error('Reset falhou') })
  await scenario(page, 'slow')
  await page.goto('/nfts/nft-001')
  await expect(page.locator('.detail-skeleton').first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
  await scenario(page, 'http-error')
  await page.goto('/nfts/nft-002')
  await expect(page.getByRole('heading', { name: 'Não foi possível carregar este NFT' })).toBeVisible()
  await scenario(page, 'default')
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('heading', { name: 'Sage Nomad #009' })).toBeVisible()
  await scenario(page, 'network-error')
  await page.goto('/nfts/nft-003')
  await expect(page.getByRole('heading', { name: 'Não foi possível carregar este NFT' })).toBeVisible()
  await scenario(page, 'default')
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('heading', { name: 'Neon Vessel #552' })).toBeVisible()
})
