import { test, expect } from '@playwright/test';
import { mockParserApi } from './helpers';

test.describe('App Layout', () => {
  test.beforeEach(async ({ page }) => {
    await mockParserApi(page);
    await page.goto('/');
  });

  test('renders header with app title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'DragonBricks' })).toBeVisible();
  });

  test('renders sidebar with New Program button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /New Program/i })).toBeVisible();
  });

  test('renders main editor sections', async ({ page }) => {
    await expect(page.getByText('Setup')).toBeVisible();
    await expect(page.getByText('Main')).toBeVisible();
  });

  test('renders header control buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Run program' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Stop program' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Connect Hub' })).toBeVisible();
  });

  test('run and stop buttons are disabled when not connected', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Run program' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Stop program' })).toBeDisabled();
  });

  test('renders status bar with version', async ({ page }) => {
    await expect(page.getByText('v0.1 beta')).toBeVisible();
  });
});
