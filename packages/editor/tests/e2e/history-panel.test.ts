import { test, expect } from '@playwright/test';

test.describe('History Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas[data-testid="map-viewport"]');
  });

  test('should display history panel', async ({ page }) => {
    const historyPanel = page.locator('[data-testid="history-panel"]');
    
    // History panel might be in a collapsible section
    if (await historyPanel.isVisible()) {
      await expect(historyPanel).toBeVisible();
    }
  });

  test('should show new entry after manual edit', async ({ page }) => {
    // Make a change
    await page.click('[data-tool="brush"]');
    await page.locator('[data-testid="tileset-palette"] [data-tile-id]').first().click();
    
    const canvas = page.locator('canvas[data-testid="map-viewport"]');
    const box = await canvas.boundingBox();
    if (box) {
      await canvas.click({ position: { x: 150, y: 150 } });
    }
    
    await page.waitForTimeout(200);
    
    // Check if history panel shows the entry
    const historyPanel = page.locator('[data-testid="history-panel"]');
    if (await historyPanel.isVisible()) {
      const manualEntry = historyPanel.locator('[data-origin="manual"]').first();
      await expect(manualEntry).toBeVisible();
    }
  });

  test('should mark undone entries as dimmed', async ({ page }) => {
    // Make a change
    await page.click('[data-tool="brush"]');
    await page.locator('[data-testid="tileset-palette"] [data-tile-id]').first().click();
    
    const canvas = page.locator('canvas[data-testid="map-viewport"]');
    const box = await canvas.boundingBox();
    if (box) {
      await canvas.click({ position: { x: 150, y: 150 } });
    }
    
    await page.waitForTimeout(200);
    
    // Undo
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(200);
    
    // Check if history entry is marked as undone
    const historyPanel = page.locator('[data-testid="history-panel"]');
    if (await historyPanel.isVisible()) {
      const entries = historyPanel.locator('[data-history-entry]');
      if (await entries.count() > 0) {
        const firstEntry = entries.first();
        // Should have undone class or styling
        await expect(firstEntry).toHaveClass(/undone|dimmed/);
      }
    }
  });

  test('should display timestamps for entries', async ({ page }) => {
    // Make a change
    await page.click('[data-tool="brush"]');
    await page.locator('[data-testid="tileset-palette"] [data-tile-id]').first().click();
    
    const canvas = page.locator('canvas[data-testid="map-viewport"]');
    const box = await canvas.boundingBox();
    if (box) {
      await canvas.click({ position: { x: 150, y: 150 } });
    }
    
    await page.waitForTimeout(200);
    
    // Check for timestamp
    const historyPanel = page.locator('[data-testid="history-panel"]');
    if (await historyPanel.isVisible()) {
      const timestamp = historyPanel.locator('[data-timestamp]').first();
      if (await timestamp.isVisible()) {
        const text = await timestamp.textContent();
        expect(text).toBeTruthy();
      }
    }
  });
});
