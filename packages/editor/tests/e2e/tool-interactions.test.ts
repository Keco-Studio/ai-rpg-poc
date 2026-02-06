import { test, expect } from '@playwright/test';

test.describe('Tool Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('canvas[data-testid="map-viewport"]');
  });

  test('should switch between tools', async ({ page }) => {
    const toolbar = page.locator('[data-testid="toolbar"]');
    
    // Click rect tool
    await toolbar.getByRole('button', { name: /rect/i }).click();
    await expect(toolbar.locator('[data-tool="rect"]')).toHaveClass(/active/);
    
    // Click erase tool
    await toolbar.getByRole('button', { name: /erase/i }).click();
    await expect(toolbar.locator('[data-tool="erase"]')).toHaveClass(/active/);
    
    // Click collision tool
    await toolbar.getByRole('button', { name: /collision/i }).click();
    await expect(toolbar.locator('[data-tool="collision"]')).toHaveClass(/active/);
  });

  test('should select tile from palette', async ({ page }) => {
    const palette = page.locator('[data-testid="tileset-palette"]');
    await expect(palette).toBeVisible();
    
    // Click on a tile in the palette
    const firstTile = palette.locator('[data-tile-id]').first();
    await firstTile.click();
    
    // Tile should be selected (visual feedback)
    await expect(firstTile).toHaveClass(/selected/);
  });

  test('should paint tiles on canvas with brush tool', async ({ page }) => {
    const toolbar = page.locator('[data-testid="toolbar"]');
    
    // Select brush tool (should be selected by default)
    await toolbar.getByRole('button', { name: /brush/i }).click();
    
    // Select a tile from palette
    const palette = page.locator('[data-testid="tileset-palette"]');
    const firstTile = palette.locator('[data-tile-id]').first();
    await firstTile.click();
    
    // Click on canvas to paint
    const canvas = page.locator('canvas[data-testid="map-viewport"]');
    const box = await canvas.boundingBox();
    if (box) {
      await canvas.click({
        position: {
          x: box.width / 2,
          y: box.height / 2,
        },
      });
    }
    
    // Wait a bit for the transaction to complete
    await page.waitForTimeout(300);
  });

  test('should use rect fill tool', async ({ page }) => {
    const toolbar = page.locator('[data-testid="toolbar"]');
    const canvas = page.locator('canvas[data-testid="map-viewport"]');
    const palette = page.locator('[data-testid="tileset-palette"]');
    
    // Select rect tool
    await toolbar.getByRole('button', { name: /rect/i }).click();
    
    // Select a tile
    await palette.locator('[data-tile-id]').first().click();
    
    // Drag on canvas to create rectangle
    const box = await canvas.boundingBox();
    if (box) {
      await canvas.hover({ position: { x: 100, y: 100 } });
      await page.mouse.down();
      await canvas.hover({ position: { x: 200, y: 200 } });
      await page.mouse.up();
    }
    
    // Transaction should be committed
    await page.waitForTimeout(300);
  });

  test('should erase tiles with erase tool', async ({ page }) => {
    const toolbar = page.locator('[data-testid="toolbar"]');
    const canvas = page.locator('canvas[data-testid="map-viewport"]');
    const palette = page.locator('[data-testid="tileset-palette"]');
    
    // First paint something
    await toolbar.getByRole('button', { name: /brush/i }).click();
    await palette.locator('[data-tile-id]').first().click();
    
    const box = await canvas.boundingBox();
    if (box) {
      await canvas.click({ position: { x: 150, y: 150 } });
    }
    
    await page.waitForTimeout(300);
    
    // Switch to erase tool
    await toolbar.getByRole('button', { name: /erase/i }).click();
    
    // Click same position to erase
    if (box) {
      await canvas.click({ position: { x: 150, y: 150 } });
    }
    
    // Wait for transaction
    await page.waitForTimeout(300);
  });

  test('should paint collision with collision tool', async ({ page }) => {
    const toolbar = page.locator('[data-testid="toolbar"]');
    const canvas = page.locator('canvas[data-testid="map-viewport"]');
    
    // Select collision tool
    await toolbar.getByRole('button', { name: /collision/i }).click();
    
    // Click on canvas
    const box = await canvas.boundingBox();
    if (box) {
      await canvas.click({
        position: {
          x: box.width / 2,
          y: box.height / 2,
        },
      });
    }
    
    // Wait for transaction
    await page.waitForTimeout(300);
  });
});
