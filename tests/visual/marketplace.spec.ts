import { expect, test, type Page } from '@playwright/test'

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'chromium-tablet', 'Baselines exigidas para desktop e mobile')
  await page.goto('/health')
  await expect(page.getByText('API REST: ok')).toBeVisible()
  await page.evaluate(async () => { const response = await fetch('/api/__mock/reset', { method: 'POST' }); if (!response.ok) throw new Error('Reset falhou') })
})

async function ready(page: Page) {
  await page.evaluate("document.fonts.ready.then(() => Promise.all(Array.from(document.images).map((img) => img.complete ? undefined : new Promise((resolve) => { img.addEventListener('load', resolve, { once: true }); img.addEventListener('error', resolve, { once: true }) }))))")
}

test('início', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.nft-card').first()).toBeVisible()
  await ready(page)
  await expect(page).toHaveScreenshot('inicio.png', { fullPage: true, animations: 'disabled' })
})

test('detalhes do NFT', async ({ page }) => {
  await page.goto('/nfts/nft-001')
  await expect(page.getByRole('button', { name: 'COMPRAR' })).toBeVisible()
  await ready(page)
  await expect(page).toHaveScreenshot('detalhe.png', { fullPage: true, animations: 'disabled' })
})

test('carrinho', async ({ page }) => {
  await page.goto('/nfts/nft-001')
  await page.getByRole('button', { name: 'COMPRAR' }).click()
  await expect(page.locator('.cart-item')).toBeVisible()
  await ready(page)
  await expect(page).toHaveScreenshot('carrinho.png', { fullPage: true, animations: 'disabled' })
})

test('pagamento', async ({ page }) => {
  await page.goto('/nfts/nft-001')
  await page.getByRole('button', { name: 'COMPRAR' }).click()
  await page.getByRole('link', { name: 'Continuar para pagamento' }).click()
  await page.getByLabel('E-mail').fill('collector@example.test')
  await page.getByLabel('Senha', { exact: true }).fill('Demo12345!')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
  await ready(page)
  await expect(page).toHaveScreenshot('pagamento.png', { fullPage: true, animations: 'disabled' })
})
