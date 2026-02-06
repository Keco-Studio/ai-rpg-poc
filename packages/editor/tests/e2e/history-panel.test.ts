import { test, expect } from '@playwright/test';

test.describe('History Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('canvas[data-testid="map-viewport"]');
  });

  test('should display history panel', async ({ page }) => {
    const historyPanel = page.locator('[data-testid="history-panel"]');
    await expect(historyPanel).toBeVisible();
  });

  test('should show new entry after manual edit', async ({ page }) => {
    const toolbar = page.locator('[data-testid="toolbar"]');
    const canvas = page.locator('canvas[data-testid="map-viewport"]');
    const palette = page.locator('[data-testid="tileset-palette"]');
    
    // Make a change
    await toolbar.getByRole('button', { name: /brush/i }).click();
    await palette.locator('[data-tile-id]').first().click();
    
    const box = await canvas.boundingBox();
    if (box) {
      await canvas.click({ position: { x: 150, y: 150 } });
    }
    
    await page.waitForTimeout(300);
    
    // Check if history panel shows the entry
    const historyPanel = page.locator('[data-testid="history-panel"]');
    const manualEntry = historyPanel.locator('[data-origin="manual"]').first();
    await expect(manualEntry).toBeVisible();
  });

  test('should mark undone entries as dimmed', async ({ page }) => {
    const toolbar = page.locator('[data-testid="toolbar"]');
    const canvas = page.locator('canvas[data-testid="map-viewport"]');
    const palette = page.locator('[data-testid="tileset-palette"]');
    
    // Make a change
    await toolbar.getByRole('button', { name: /brush/i }).click();
    await palette.locator('[data-tile-id]').first().click();
    
    const box = await canvas.boundingBox();
    if (box) {
      await canvas.click({ position: { x: 150, y: 150 } });
    }
    
    await page.waitForTimeout(300);
    
    // Undo
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(300);
    
    // Check if history entry is marked as undone
    const historyPanel = page.locator('[data-testid="history-panel"]');
    const firstEntry = historyPanel.locator('[data-history-entry]').first();
    await expect(firstEntry).toHaveClass(/undone/);
  });

  test('should display timestamps for entries', async ({ page }) => {
    const toolbar = page.locator('[data-testid="toolbar"]');
    const canvas = page.locator('canvas[data-testid="map-viewport"]');
    const palette = page.locator('[data-testid="tileset-palette"]');
    
    // Make a change
    await toolbar.getByRole('button', { name: /brush/i }).click();
    await palette.locator('[data-tile-id]').first().click();
    
    const box = await canvas.boundingBox();
    if (box) {
      await canvas.click({ position: { x: 150, y: 150 } });
    }
    
    await page.waitForTimeout(300);
    
    // Check for timestamp
    const historyPanel = page.locator('[data-testid="history-panel"]');
    const timestamp = historyPanel.locator('[data-timestamp]').first();
    const text = await timestamp.textContent();
    expect(text).toBeTruthy();
  });
});
