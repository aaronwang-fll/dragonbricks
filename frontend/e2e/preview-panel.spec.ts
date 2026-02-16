import { test, expect } from '@playwright/test';
import { mockParserApi } from './helpers';

test.describe('Preview Panel', () => {
  test.beforeEach(async ({ page }) => {
    await mockParserApi(page);
    await page.goto('/');
  });

  test('preview panel shows expand arrow when closed', async ({ page }) => {
    // Preview starts closed. The collapsed state shows a thin button with ◀
    // It's in the main area to the right of the editor
    const arrowBtn = page.locator('button:has-text("◀")').first();
    await expect(arrowBtn).toBeVisible();
  });

  test('clicking expand arrow reveals canvas and preview controls', async ({ page }) => {
    // Click the ◀ button to open preview
    await page.locator('button:has-text("◀")').first().click();

    // Canvas should now be visible
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Preview header should appear
    await expect(page.getByText('Preview', { exact: true })).toBeVisible();
  });
});
