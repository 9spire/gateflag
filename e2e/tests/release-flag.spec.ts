import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function viewAsGroup(page: Page, groupKey: string) {
  await page.getByRole('button', { name: /^View as / }).click();
  await page.getByRole('combobox', { name: 'Search groups' }).fill(groupKey);
  await page.keyboard.press('Enter');
}

async function viewAsMember(page: Page, groupKey: string, memberName: string) {
  await page.getByRole('button', { name: new RegExp(`^${groupKey}\\b`) }).click();
  await page
    .getByRole('list', { name: `${groupKey} members` })
    .getByRole('button', { name: new RegExp(`^${memberName}\\b`) })
    .click();
}

test.describe('demo journeys', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('gateflag:persona', 'sam-none');
      localStorage.setItem('gateflag:app', 'storefront');
    });
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'View as everyone' })).toBeVisible();
  });

  test('Sam sees PRODUCT_RECOMMENDATIONS locked; Alex releases it', async ({ page }) => {
    await expect(
      page.getByRole('article', { name: 'PRODUCT_RECOMMENDATIONS locked' }),
    ).toBeVisible();

    await viewAsMember(page, 'admins', 'Alex');
    await page.getByRole('button', { name: 'Admin', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Gateflag admin' })).toBeVisible();

    const productRow = page.getByRole('listitem').filter({
      hasText: 'PRODUCT_RECOMMENDATIONS',
    });
    await productRow.getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('button', { name: 'RELEASED' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await page.getByRole('button', { name: 'Close' }).click();

    await viewAsGroup(page, 'everyone');
    await expect(page.getByRole('article', { name: 'PRODUCT_RECOMMENDATIONS locked' })).toHaveCount(
      0,
    );
    await expect(page.getByRole('heading', { name: 'Product recommendations' })).toBeVisible();
  });

  test('switching group in the rail changes the preview', async ({ page }) => {
    await page.getByRole('button', { name: /^beta-testers/ }).click();
    await expect(page.getByRole('button', { name: 'View as beta-testers' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'beta-testers members' })).toBeVisible();
    await expect(page.getByRole('article', { name: 'NEW_CHECKOUT_FLOW locked' })).toHaveCount(0);
  });

  test('demo has no serious axe violations', async ({ page }) => {
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    );
    expect(serious).toEqual([]);
  });
});
