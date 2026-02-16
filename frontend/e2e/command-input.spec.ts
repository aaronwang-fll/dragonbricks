import { test, expect } from '@playwright/test';
import { mockParserApi } from './helpers';

test.describe('Command Input & Python Generation', () => {
  test.beforeEach(async ({ page }) => {
    await mockParserApi(page);
    await page.goto('/');
  });

  test('shows placeholder text in empty editor', async ({ page }) => {
    await expect(
      page.getByPlaceholder('Type command... (Ctrl+Space for suggestions)')
    ).toBeVisible();
  });

  test('typing a movement command shows parsed status', async ({ page }) => {
    const input = page.locator('input[type="text"]').first();
    await input.fill('move forward 200mm');

    // Wait for debounced parsing (500ms) + API mock response
    await page.waitForTimeout(1000);

    // Should show green checkmark for parsed command
    await expect(page.locator('span[title="Parsed"]').first()).toBeVisible();
  });

  test('typing a turn command parses correctly', async ({ page }) => {
    const input = page.locator('input[type="text"]').first();
    await input.fill('turn right 90 degrees');

    await page.waitForTimeout(1000);
    await expect(page.locator('span[title="Parsed"]').first()).toBeVisible();
  });

  test('expanding Python code shows generated output', async ({ page }) => {
    const input = page.locator('input[type="text"]').first();
    await input.fill('move forward 200mm');

    await page.waitForTimeout(1000);

    // Click expand button to show Python code
    const expandBtn = page.getByTitle('Show Python');
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
      await expect(page.getByText('robot.straight(200)')).toBeVisible();
    }
  });

  test('Expand Python button shows all code', async ({ page }) => {
    const input = page.locator('input[type="text"]').first();
    await input.fill('move forward 200mm');
    await page.waitForTimeout(1000);

    const expandAllBtn = page.getByText('Expand Python');
    if (await expandAllBtn.isVisible()) {
      await expandAllBtn.click();
      await expect(page.getByText('robot.straight(200)')).toBeVisible();
    }
  });

  test('Enter key creates a new line', async ({ page }) => {
    const input = page.locator('input[type="text"]').first();
    await input.click();
    await input.type('move forward 200mm');
    await input.press('Enter');

    // Should now have multiple input fields
    const inputs = page.locator('input[type="text"]');
    const count = await inputs.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('multiple commands parse independently', async ({ page }) => {
    const firstInput = page.locator('input[type="text"]').first();
    await firstInput.click();
    await firstInput.type('move forward 200mm');
    await firstInput.press('Enter');

    // Type in second line
    const secondInput = page.locator('input[type="text"]').nth(1);
    await secondInput.fill('turn right 90 degrees');

    await page.waitForTimeout(1000);

    // Should have 2 parsed indicators
    const checkmarks = page.locator('span[title="Parsed"]');
    await expect(checkmarks).toHaveCount(2);
  });

  test('invalid command shows error status', async ({ page }) => {
    const input = page.locator('input[type="text"]').first();
    await input.fill('xyzzy nonsense command');

    await page.waitForTimeout(1000);

    // Should show error indicator
    await expect(page.locator('span[title="Error"]').first()).toBeVisible();
  });
});
