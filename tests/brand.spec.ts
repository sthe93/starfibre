import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('premium brand experience', () => {
  test('home page matches the approved desktop visual baseline', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveScreenshot('home-desktop.png', { fullPage: true, animations: 'disabled' })
  })

  test('home page has no critical accessibility violations', async ({ page }) => {
    await page.goto('/')
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    expect(results.violations.filter((violation) => violation.impact === 'critical')).toEqual([])
  })
})
