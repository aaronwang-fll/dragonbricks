import { test, expect } from '@playwright/test';
import { mockParserApi } from './helpers';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await mockParserApi(page);
    await page.goto('/');
  });

  test('navigate to settings and back', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();

    // Should show settings page
    await expect(page.getByText('Appearance')).toBeVisible();
    await expect(page.getByText('Robot Configuration')).toBeVisible();
    await expect(page.getByText('Movement Defaults')).toBeVisible();

    // Close settings
    await page.getByRole('button', { name: 'Close settings' }).click();

    // Should be back on main page
    await expect(page.getByRole('heading', { name: 'DragonBricks' })).toBeVisible();
    await expect(page.getByText('Main')).toBeVisible();
  });

  test('theme toggle buttons exist', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();

    await expect(page.getByRole('button', { name: 'Light' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dark' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'System' })).toBeVisible();
  });

  test('switch to light theme', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Light' }).click();

    // Light button should be highlighted
    const lightBtn = page.getByRole('button', { name: 'Light' });
    await expect(lightBtn).toHaveClass(/bg-blue-500/);

    // HTML should not have dark class
    const html = page.locator('html');
    await expect(html).not.toHaveClass(/dark/);
  });

  test('switch to dark theme', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Dark' }).click();

    const darkBtn = page.getByRole('button', { name: 'Dark' });
    await expect(darkBtn).toHaveClass(/bg-blue-500/);

    // HTML should have dark class
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);
  });

  test('robot configuration shows port selectors', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();

    await expect(page.getByText('Drive Motors')).toBeVisible();
    await expect(page.getByText('Left Motor')).toBeVisible();
    await expect(page.getByText('Right Motor')).toBeVisible();
    await expect(page.getByText('Attachment Motors')).toBeVisible();
    await expect(page.getByText('Color', { exact: true })).toBeVisible();
    await expect(page.getByText('Ultrasonic', { exact: true })).toBeVisible();
    await expect(page.getByText('Force', { exact: true })).toBeVisible();
  });

  test('movement defaults show numeric inputs', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click();

    await expect(page.getByText('Default Speed')).toBeVisible();
    await expect(page.getByText('Default Turn Rate')).toBeVisible();
    await expect(page.getByText('Wheel Diameter')).toBeVisible();
    await expect(page.getByText('Axle Track')).toBeVisible();
  });

  test('theme persists after navigating away and back', async ({ page }) => {
    // Switch to light mode
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Light' }).click();
    await page.getByRole('button', { name: 'Close settings' }).click();

    // Should still be light mode on main page
    const html = page.locator('html');
    await expect(html).not.toHaveClass(/dark/);

    // Go back to settings - should still be light
    await page.getByRole('button', { name: 'Settings' }).click();
    const lightBtn = page.getByRole('button', { name: 'Light' });
    await expect(lightBtn).toHaveClass(/bg-blue-500/);
  });
});
