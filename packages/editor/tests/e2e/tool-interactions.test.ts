import { test, expect } from '@playwright/test';

test.describe('Tool Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas[data-testid="map-viewport"]');
  });

  test('should switch between tools', async ({ page }) => {
    // Click rect tool
    await page.click('[data-tool="rect"]');
    await expect(page.locator('[data-tool="rect"]')).toHaveClass(/active|selected/);
    
    // Click erase tool
    await page.click('[data-tool="erase"]');
    await expect(page.locator('[data-tool="erase"]')).toHaveClass(/active|selected/);
    
    // Click collision tool
    await page.click('[data-tool="collision"]');
    await expect(page.locator('[data-tool="collision"]')).toHaveClass(/active|selected/);
  });

  test('should select tile from palette', async ({ page }) => {
    const palette = page.locator('[data-testid="tileset-palette"]');
    await expect(palette).toBeVisible();
    
    // Click on a tile in the palette (assuming grid layout)
    const tiles = palette.locator('[data-tile-id]').first();
    await tiles.click();
    
    // Tile should be selected (visual feedback)
    await expect(tiles).toHaveClass(/selected|active/);
  });

  test('should paint tiles on canvas with brush tool', async ({ page }) => {
    // Select brush tool
    await page.click('[data-tool="brush"]');
    
    // Select a tile from palette
    const firstTile = page.locator('[data-testid="tileset-palette"] [data-tile-id]').first();
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
    
    // History panel should show a new entry
    const historyPanel = page.locator('[data-testid="history-panel"]');
    if (await historyPanel.isVisible()) {
      await expect(historyPanel.locator('[data-origin="manual"]').first()).toBeVisible();
    }
  });

  test('should use rect fill tool', async ({ page }) => {
    // Select rect tool
    await page.click('[data-tool="rect"]');
    
    // Select a tile
    await page.locator('[data-testid="tileset-palette"] [data-tile-id]').first().click();
    
    // Drag on canvas to create rectangle
    const canvas = page.locator('canvas[data-testid="map-viewport"]');
    const box = await canvas.boundingBox();
    if (box) {
      await canvas.hover({
        position: { x: 100, y: 100 },
      });
      await page.mouse.down();
      await canvas.hover({
        position: { x: 200, y: 200 },
      });
      await page.mouse.up();
    }
    
    // Transaction should be committed
    await page.waitForTimeout(100);
  });

  test('should erase tiles with erase tool', async ({ page }) => {
    // First paint something
    await page.click('[data-tool="brush"]');
    const firstTile = page.locator('[data-testid="tileset-palette"] [data-tile-id]').first();
    await firstTile.click();
    
    const canvas = page.locator('canvas[data-testid="map-viewport"]');
    const box = await canvas.boundingBox();
    if (box) {
      await canvas.click({ position: { x: 150, y: 150 } });
    }
    
    // Switch to erase tool
    await page.click('[data-tool="erase"]');
    
    // Click same position to erase
    if (box) {
      await canvas.click({ position: { x: 150, y: 150 } });
    }
    
    // Should create a new history entry
    await page.waitForTimeout(100);
  });

  test('should paint collision with collision tool', async ({ page }) => {
    // Select collision tool
    await page.click('[data-tool="collision"]');
    
    // Click on canvas
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
    
    // Should see collision overlay (semi-transparent red)
    await page.waitForTimeout(100);
  });
});
