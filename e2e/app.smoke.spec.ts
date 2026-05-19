import { test, expect } from '@playwright/test'

test.describe('Luna smoke', () => {
  test('carrega a aplicação', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#root')).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('data-luna-theme', /.+/)
  })

  test('persiste tema no localStorage', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('luna-theme-id', 'luna-solar')
    })
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute(
      'data-luna-theme',
      'luna-solar',
    )
    const canvas = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--color-canvas')
        .trim(),
    )
    expect(canvas.toLowerCase()).toBe('#faf6ef')
  })

  test('persiste layout de painel', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem(
        'luna-panel-ide-explorer',
        JSON.stringify({ ratio: 0.25, px: 200 }),
      )
    })
    await page.reload()
    const stored = await page.evaluate(() =>
      localStorage.getItem('luna-panel-ide-explorer'),
    )
    expect(stored).toContain('ratio')
  })
})
