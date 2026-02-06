import { test, expect } from '@playwright/test';

test.describe('Undo/Redo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas[data-testid="map-viewport"]');
  });

  test('undo button should be disabled initially', async ({ page }) => {
    const undoButton = page.locator('[data-action="undo"]');
    await expect(undoButton).toBeDisabled();
  });

  test('redo button should be disabled initially', async ({ page }) => {
    const redoButton = page.locator('[data-action="redo"]');
    await expect(redoButton).toBeDisabled();
  });

  test('should enable undo after making a change', async ({ page }) => {
    // Select brush and tile
    await page.click('[data-tool="brush"]');
    await page.locator('[data-testid="tileset-palette"] [data-tile-id]').first().click();
    
    // Paint on canvas
    const canvas = page.locator('canvas[data-testid="map-viewport"]');
    const box = await canvas.boundingBox();
    if (box) {
      await canvas.click({ position: { x: 150, y: 150 } });
    }
    
    await page.waitForTimeout(100);
    
    // Undo should be enabled
    const undoButton = page.locator('[data-action="undo"]');
    await expect(undoButton).toBeEnabled();
  });

  test('should undo action with Ctrl+Z', async ({ page }) => {
    // Make a change
    await page.click('[data-tool="brush"]');
    await page.locator('[data-testid="tileset-palette"] [data-tile-id]').first().click();
    
    const canvas = page.locator('canvas[data-testid="map-viewport"]');
    const box = await canvas.boundingBox();
    if (box) {
      await canvas.click({ position: { x: 150, y: 150 } });
    }
    
    await page.waitForTimeout(100);
    
    // Press Ctrl+Z
    await page.keyboard.press('Control+z');
    
    await page.waitForTimeout(100);
    
    // Redo should now be enabled
    const redoButton = page.locator('[data-action="redo"]');
    await expect(redoButton).toBeEnabled();
  });

  test('should redo action with Ctrl+Shift+Z', async ({ page }) => {
    // Make a change
    await page.click('[data-tool="brush"]');
    await page.locator('[data-testid="tileset-palette"] [data-tile-id]').first().click();
    
    const canvas = page.locator('canvas[data-testid="map-viewport"]');
    const box = await canvas.boundingBox();
    if (box) {
      await canvas.click({ position: { x: 150, y: 150 } });
    }
    
    await page.waitForTimeout(100);
    
    // Undo
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(100);
    
    // Redo
    await page.keyboard.press('Control+Shift+Z');
    await page.waitForTimeout(100);
    
    // Undo should be enabled again, redo disabled
    const undoButton = page.locator('[data-action="undo"]');
    const redoButton = page.locator('[data-action="redo"]');
    await expect(undoButton).toBeEnabled();
    await expect(redoButton).toBeDisabled();
  });

  test('should undo with toolbar button', async ({ page }) => {
    // Make a change
    await page.click('[data-tool="brush"]');
    await page.locator('[data-testid="tileset-palette"] [data-tile-id]').first().click();
    
    const canvas = page.locator('canvas[data-testid="map-viewport"]');
    const box = await canvas.boundingBox();
    if (box) {
      await canvas.click({ position: { x: 150, y: 150 } });
    }
    
    await page.waitForTimeout(100);
    
    // Click undo button
    await page.click('[data-action="undo"]');
    
    await page.waitForTimeout(100);
    
    // Redo should be enabled
    const redoButton = page.locator('[data-action="redo"]');
    await expect(redoButton).toBeEnabled();
  });

  test('should cancel action with Escape key', async ({ page }) => {
    // Start painting
    await page.click('[data-tool="brush"]');
    await page.locator('[data-testid="tileset-palette"] [data-tile-id]').first().click();
    
    const canvas = page.locator('canvas[data-testid="map-viewport"]');
    const box = await canvas.boundingBox();
    if (box) {
      // Start mouse down but don't release
      await canvas.hover({ position: { x: 150, y: 150 } });
      await page.mouse.down();
      
      // Press Escape to cancel
      await page.keyboard.press('Escape');
      
      await page.mouse.up();
    }
    
    await page.waitForTimeout(100);
    
    // Undo should remain disabled (transaction was cancelled)
    const undoButton = page.locator('[data-action="undo"]');
    await expect(undoButton).toBeDisabled();
  });
});
