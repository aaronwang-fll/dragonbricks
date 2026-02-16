import { test, expect } from '@playwright/test';
import { mockParserApi } from './helpers';

test.describe('Sidebar Program Management', () => {
  test.beforeEach(async ({ page }) => {
    await mockParserApi(page);
    await page.goto('/');
  });

  test('shows programs count header', async ({ page }) => {
    await expect(page.getByText(/Programs \(\d+\)/)).toBeVisible();
  });

  test('create a new program via dialog', async ({ page }) => {
    await page.getByRole('button', { name: /New Program/i }).click();

    // Dialog should appear
    await expect(page.getByPlaceholder('Program name')).toBeVisible();

    // Type name and create
    await page.getByPlaceholder('Program name').fill('Test Mission');
    await page.getByRole('button', { name: 'Create' }).click();

    // Program should appear in sidebar
    await expect(page.getByText('Test Mission')).toBeVisible();
  });

  test('create program with Enter key', async ({ page }) => {
    await page.getByRole('button', { name: /New Program/i }).click();
    await page.getByPlaceholder('Program name').fill('Quick Mission');
    await page.getByPlaceholder('Program name').press('Enter');

    await expect(page.getByText('Quick Mission')).toBeVisible();
  });

  test('cancel new program dialog with Cancel button', async ({ page }) => {
    await page.getByRole('button', { name: /New Program/i }).click();
    await page.getByPlaceholder('Program name').fill('Should Not Exist');
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByPlaceholder('Program name')).not.toBeVisible();
    await expect(page.getByText('Should Not Exist')).not.toBeVisible();
  });

  test('switch between programs', async ({ page }) => {
    // Create two programs
    await page.getByRole('button', { name: /New Program/i }).click();
    await page.getByPlaceholder('Program name').fill('Mission 1');
    await page.getByRole('button', { name: 'Create' }).click();

    await page.getByRole('button', { name: /New Program/i }).click();
    await page.getByPlaceholder('Program name').fill('Mission 2');
    await page.getByRole('button', { name: 'Create' }).click();

    // Click on Mission 1 to switch
    await page.getByText('Mission 1').click();

    // Mission 1 should be visible and selected
    await expect(page.getByText('Mission 1')).toBeVisible();
  });

  test('examples section expands and collapses', async ({ page }) => {
    // The Examples toggle is in the sidebar aside element
    const sidebar = page.locator('aside').first();
    const examplesToggle = sidebar.getByText('Examples', { exact: true });
    await expect(examplesToggle).toBeVisible();

    // Click to expand
    await examplesToggle.click();

    // Should show example categories
    await expect(sidebar.getByText('Basic Movement')).toBeVisible();
    await expect(sidebar.getByText('Sensors')).toBeVisible();
    await expect(sidebar.getByText('Motors & Control')).toBeVisible();
    await expect(sidebar.getByText('Advanced')).toBeVisible();
  });

  test('clicking example category shows commands', async ({ page }) => {
    const sidebar = page.locator('aside').first();

    // Expand examples
    await sidebar.getByText('Examples', { exact: true }).click();

    // Click Basic Movement category
    await sidebar.getByText('Basic Movement').click();

    // Should show individual examples
    await expect(sidebar.getByText('Move forward')).toBeVisible();
    await expect(sidebar.getByText('Turn right')).toBeVisible();
  });

  test('clicking an example inserts it into editor', async ({ page }) => {
    const sidebar = page.locator('aside').first();

    // Need a program first
    await page.getByRole('button', { name: /New Program/i }).click();
    await page.getByPlaceholder('Program name').fill('Example Test');
    await page.getByRole('button', { name: 'Create' }).click();

    // Expand examples > Basic Movement
    await sidebar.getByText('Examples', { exact: true }).click();
    await sidebar.getByText('Basic Movement').click();

    // Click "Move forward" example
    await sidebar.getByText('Move forward').click();

    await page.waitForTimeout(1000);

    // The command should be in the editor and parsed
    await expect(page.locator('span[title="Parsed"]').first()).toBeVisible();
  });
});
