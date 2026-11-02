import { expect, test } from '@playwright/test'

test('REST via MSW e evento via Socket.IO funcionam após acesso direto e refresh', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/health')
  await expect(page.getByRole('heading', { name: 'Diagnóstico da infraestrutura' })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'API REST: ok' })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Socket.IO: Evento recebido' })).toBeVisible()
  await page.getByRole('button', { name: 'Consultar novamente' }).click()
  await expect(page.getByRole('button')).toBeEnabled()
  await page.reload()
  await expect(page.getByText('API REST: ok', { exact: true })).toBeVisible()
  await expect(page.getByText('Socket.IO: Evento recebido', { exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('rota inexistente permite voltar ao início', async ({ page }) => {
  await page.goto('/rota-inexistente')
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  await page.getByRole('link', { name: 'Voltar ao início' }).click()
  await expect(page.getByRole('heading', { name: /SEJA DONO/ })).toBeVisible()
})
