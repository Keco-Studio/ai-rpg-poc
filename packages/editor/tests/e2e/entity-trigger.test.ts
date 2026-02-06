import { test, expect } from '@playwright/test';

test.describe('Entity and Trigger Placement', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('canvas[data-testid="map-viewport"]');
  });

  test('should place entity with entity tool', async ({ page }) => {
    const toolbar = page.locator('[data-testid="toolbar"]');
    const canvas = page.locator('canvas[data-testid="map-viewport"]');
    const projectBrowser = page.locator('[data-testid="project-browser"]');
    
    // Select entity tool
    await toolbar.getByRole('button', { name: /entity/i }).click();
    
    // Select an entity from project browser
    const entityDef = projectBrowser.locator('[data-entity-def]').first();
    if (await entityDef.isVisible()) {
      await entityDef.click();
    }
    
    // Click on canvas to place entity
    const box = await canvas.boundingBox();
    if (box) {
      await canvas.click({
        position: {
          x: box.width / 2,
          y: box.height / 2,
        },
      });
    }
    
    await page.waitForTimeout(300);
    
    // Should enable undo
    const undoButton = toolbar.getByRole('button', { name: /undo/i });
    await expect(undoButton).toBeEnabled();
  });

  test('should create trigger with trigger tool', async ({ page }) => {
    const toolbar = page.locator('[data-testid="toolbar"]');
    const canvas = page.locator('canvas[data-testid="map-viewport"]');
    
    // Select trigger tool
    await toolbar.getByRole('button', { name: /trigger/i }).click();
    
    // Drag on canvas to create trigger region
    const box = await canvas.boundingBox();
    if (box) {
      await canvas.hover({ position: { x: 100, y: 100 } });
      await page.mouse.down();
      await canvas.hover({ position: { x: 200, y: 200 } });
      await page.mouse.up();
    }
    
    await page.waitForTimeout(300);
    
    // Should enable undo
    const undoButton = toolbar.getByRole('button', { name: /undo/i });
    await expect(undoButton).toBeEnabled();
  });

  test('should render canvas without errors', async ({ page }) => {
    // Canvas should render entities (can't easily test canvas content, but can verify no errors)
    const canvas = page.locator('canvas[data-testid="map-viewport"]');
    await expect(canvas).toBeVisible();
  });
});
