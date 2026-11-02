import { expect, test, type Locator, type Page } from '@playwright/test'

async function tabUntilFocused(page: Page, target: Locator, maxTabs = 16, direction: 'Tab' | 'Shift+Tab' = 'Tab') {
  for (let index = 0; index < maxTabs; index += 1) {
    await page.keyboard.press(direction)
    if (await target.evaluate((element) => element.matches(':focus'))) return
  }
  throw new Error(`O controle não recebeu foco após ${maxTabs} pressionamentos de Tab.`)
}

test('atalho de conteúdo e navegação até o carrinho funcionam pelo teclado', async ({ page }, testInfo) => {
  await page.goto('/')
  const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
  if (testInfo.project.name === 'chromium-mobile') await expect(page.getByRole('button', { name: 'Buscar' })).toBeVisible()
  else await expect(page.getByRole('link', { name: 'Kurio — início' })).toBeVisible()
  await expect(skip).toBeAttached()
  await page.keyboard.press('Tab')
  await expect(skip).toBeFocused()
  await expect(skip).toBeVisible()
  await expect(skip).toHaveCSS('outline-style', 'solid')

  await page.keyboard.press('Enter')
  await expect(page.locator('#main')).toBeFocused()

  const cart = testInfo.project.name === 'chromium-mobile' ? page.getByRole('navigation', { name: 'Navegação móvel' }).getByRole('link', { name: 'Carrinho' }) : page.getByRole('link', { name: 'Abrir carrinho' })
  await tabUntilFocused(page, cart, testInfo.project.name === 'chromium-mobile' ? 35 : 8)
  await expect(cart).toHaveCSS('outline-style', 'solid')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/cart$/)
  await expect(page.getByRole('heading', { name: testInfo.project.name === 'chromium-mobile' ? 'Carrinho de NFTs' : 'Seu carrinho' })).toBeVisible()
})

test('filtros mobile expandem com Space e mantêm a ordem de foco', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile', 'Painel expansível existe apenas no mobile')
  await page.goto('/')
  const toggle = page.getByRole('button', { name: 'Filtros', exact: true })
  const category = page.locator('#category')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(category).not.toBeVisible()
  await tabUntilFocused(page, toggle, 12)
  await page.keyboard.press('Space')
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(toggle).toBeFocused()
  await tabUntilFocused(page, category, 5)
  await tabUntilFocused(page, toggle, 5, 'Shift+Tab')
  await page.keyboard.press('Space')
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(category).not.toBeVisible()
})

test('cadastro vazio anuncia o erro e foca o primeiro campo inválido', async ({ page }) => {
  await page.goto('/register')
  const submit = page.getByRole('button', { name: /Criar (conta|perfil)/ })
  await tabUntilFocused(page, submit)
  await page.keyboard.press('Enter')
  const name = page.getByRole('textbox', { name: 'Nome de usuário' })
  await expect(name).toBeFocused()
  await expect(name).toHaveAttribute('aria-invalid', 'true')
  await expect(name).toHaveAttribute('aria-describedby', 'register-name-error')
  await expect(page.locator('#register-name-error')).toHaveAttribute('role', 'alert')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('textbox', { name: 'E-mail' })).toBeFocused()
})

test('checkout foca o campo inválido após gerar cotação pelo teclado', async ({ page }) => {
  await page.goto('/health')
  await expect(page.getByText('API REST: ok')).toBeVisible()
  await page.evaluate(async () => {
    const response = await fetch('/api/__mock/reset', { method: 'POST' })
    if (!response.ok) throw new Error('Reset do mock falhou')
  })
  await page.goto('/login')
  await page.getByLabel('E-mail').fill('collector@example.test')
  await page.getByLabel('Senha', { exact: true }).fill('Demo12345!')
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Nome de exibição *' })).toBeVisible()
  await page.goto('/nfts/nft-001')
  await page.getByRole('button', { name: 'COMPRAR' }).click()
  await page.getByRole('link', { name: 'Continuar para pagamento' }).click()
  await page.getByRole('button', { name: 'Conectar carteira', exact: true }).click()
  await expect(page.getByText('Conectada:', { exact: false })).toBeVisible()

  const name = page.getByRole('textbox', { name: 'Nome de exibição *' })
  await name.fill('x')
  await page.getByRole('button', { name: 'Gerar cotação' }).press('Enter')
  await expect(name).toBeFocused()
  await expect(name).toHaveAttribute('aria-invalid', 'true')
  await expect(name).toHaveAttribute('aria-describedby', 'checkout-displayName-error')
  await expect(page.locator('#checkout-displayName-error')).toHaveAttribute('role', 'alert')
  await expect(page.getByRole('heading', { name: 'Cotação da API' })).toHaveCount(0)
})
