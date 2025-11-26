import { test, expect } from './fixtures';

test.describe('Artefakt Extension', () => {
  test('popup opens and displays correctly', async ({ context, extensionId }) => {
    // Open the popup page directly
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

    // Verify the title is displayed
    await expect(popupPage.locator('h1')).toHaveText('Artefakt');

    // Verify the Save button exists
    await expect(popupPage.getByRole('button', { name: /save this page/i })).toBeVisible();

    // Verify recent sources section exists
    await expect(popupPage.getByText(/recent sources/i)).toBeVisible();
  });

  test('sidepanel opens and has tabs', async ({ context, extensionId }) => {
    // Open the sidepanel page directly
    const sidepanelPage = await context.newPage();
    await sidepanelPage.goto(`chrome-extension://${extensionId}/sidepanel.html`);

    // Verify the title
    await expect(sidepanelPage.locator('h1')).toHaveText('Artefakt');

    // Verify tabs exist
    await expect(sidepanelPage.getByRole('tab', { name: 'Sources' })).toBeVisible();
    await expect(sidepanelPage.getByRole('tab', { name: 'Origin Trail' })).toBeVisible();
    await expect(sidepanelPage.getByRole('tab', { name: 'Share' })).toBeVisible();
  });

  test('can capture a source from a webpage', async ({ context, extensionId }) => {
    // Navigate to a test page first
    const page = await context.newPage();
    await page.goto('https://example.com');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Get the popup page - open as a new page (simulates extension popup)
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    await popupPage.waitForLoadState('networkidle');

    // Wait for popup to fully render
    await popupPage.waitForSelector('button:has-text("Save This Page")');

    // Verify initial state - no sources yet
    await expect(popupPage.getByText(/recent sources \(0\)/i)).toBeVisible();

    // Click save button
    await popupPage.getByRole('button', { name: /save this page/i }).click();

    // Wait for capture to complete
    await popupPage.waitForTimeout(3000);

    // Verify no error occurred
    const hasError = await popupPage.locator('#capture-error').isVisible().catch(() => false);
    expect(hasError).toBe(false);

    // Verify source was captured
    await expect(popupPage.getByText(/recent sources \(1\)/i)).toBeVisible();

    // Verify the source list contains the captured page
    const sourceItem = popupPage.locator('ul[role="list"] li').first();
    await expect(sourceItem).toBeVisible();

    // Verify the title contains "Example Domain" (from example.com)
    await expect(sourceItem.locator('p').first()).toContainText('Example Domain');
  });
});
