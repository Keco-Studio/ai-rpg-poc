import { test, expect } from '@playwright/test';

test.describe('Undo/Redo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('canvas[data-testid="map-viewport"]');
  });

  test('undo button should be disabled initially', async ({ page }) => {
    const toolbar = page.locator('[data-testid="toolbar"]');
    const undoButton = toolbar.getByRole('button', { name: /undo/i });
    await expect(undoButton).toBeDisabled();
  });

  test('redo button should be disabled initially', async ({ page }) => {
    const toolbar = page.locator('[data-testid="toolbar"]');
    const redoButton = toolbar.getByRole('button', { name: /redo/i });
    await expect(redoButton).toBeDisabled();
  });

  test('should enable undo after making a change', async ({ page }) => {
    const toolbar = page.locator('[data-testid="toolbar"]');
    const canvas = page.locator('canvas[data-testid="map-viewport"]');
    const palette = page.locator('[data-testid="tileset-palette"]');
    
    // Select brush and tile
    await toolbar.getByRole('button', { name: /brush/i }).click();
    await palette.locator('[data-tile-id]').first().click();
    
    // Paint on canvas
    const box = await canvas.boundingBox();
    if (box) {
      await canvas.click({ position: { x: 150, y: 150 } });
    }
    
    await page.waitForTimeout(300);
    
    // Undo should be enabled
    const undoButton = toolbar.getByRole('button', { name: /undo/i });
    await expect(undoButton).toBeEnabled();
  });

  test('should undo action with Ctrl+Z', async ({ page }) => {
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
    
    // Press Ctrl+Z
    await page.keyboard.press('Control+z');
    
    await page.waitForTimeout(300);
    
    // Redo should now be enabled
    const redoButton = toolbar.getByRole('button', { name: /redo/i });
    await expect(redoButton).toBeEnabled();
  });

  test('should redo action with Ctrl+Shift+Z', async ({ page }) => {
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
    
    // Redo
    await page.keyboard.press('Control+Shift+Z');
    await page.waitForTimeout(300);
    
    // Undo should be enabled again, redo disabled
    const undoButton = toolbar.getByRole('button', { name: /undo/i });
    const redoButton = toolbar.getByRole('button', { name: /redo/i });
    await expect(undoButton).toBeEnabled();
    await expect(redoButton).toBeDisabled();
  });

  test('should undo with toolbar button', async ({ page }) => {
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
    
    // Click undo button
    await toolbar.getByRole('button', { name: /undo/i }).click();
    
    await page.waitForTimeout(300);
    
    // Redo should be enabled
    const redoButton = toolbar.getByRole('button', { name: /redo/i });
    await expect(redoButton).toBeEnabled();
  });

  test('should cancel action with Escape key', async ({ page }) => {
    const toolbar = page.locator('[data-testid="toolbar"]');
    const canvas = page.locator('canvas[data-testid="map-viewport"]');
    const palette = page.locator('[data-testid="tileset-palette"]');
    
    // Start painting
    await toolbar.getByRole('button', { name: /brush/i }).click();
    await palette.locator('[data-tile-id]').first().click();
    
    const box = await canvas.boundingBox();
    if (box) {
      // Start mouse down but don't release
      await canvas.hover({ position: { x: 150, y: 150 } });
      await page.mouse.down();
      
      // Press Escape to cancel
      await page.keyboard.press('Escape');
      
      await page.mouse.up();
    }
    
    await page.waitForTimeout(300);
    
    // Undo should remain disabled (transaction was cancelled)
    const undoButton = toolbar.getByRole('button', { name: /undo/i });
    await expect(undoButton).toBeDisabled();
  });
});
