import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('demo journeys', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('gateflag:persona', 'sam-none');
      localStorage.setItem('gateflag:app', 'storefront');
    });
    await page.goto('/');
    await expect(page.getByRole('combobox', { name: 'Persona switcher' })).toHaveValue(
      'sam-none',
    );
  });

  test('Sam sees PRODUCT_RECOMMENDATIONS locked; Alex releases it', async ({ page }) => {
    await expect(
      page.getByRole('article', { name: 'PRODUCT_RECOMMENDATIONS locked' }),
    ).toBeVisible();

    await page.getByRole('combobox', { name: 'Persona switcher' }).selectOption('alex-admin');
    await expect(page.getByRole('button', { name: 'Admin' })).toBeVisible();
    await page.getByRole('button', { name: 'Admin' }).click();
    await expect(page.getByRole('heading', { name: 'Gateflag admin' })).toBeVisible();

    const productRow = page.getByRole('listitem').filter({
      hasText: 'PRODUCT_RECOMMENDATIONS',
    });
    await productRow.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('button', { name: 'RELEASED' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByRole('button', { name: 'Close' }).click();

    await page.getByRole('combobox', { name: 'Persona switcher' }).selectOption('sam-none');
    await expect(
      page.getByRole('article', { name: 'PRODUCT_RECOMMENDATIONS locked' }),
    ).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Product recommendations' })).toBeVisible();
  });

  test('demo has no serious axe violations', async ({ page }) => {
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    );
    expect(serious).toEqual([]);
  });
});
