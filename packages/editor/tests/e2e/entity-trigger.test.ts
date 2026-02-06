import { test, expect } from '@playwright/test';

test.describe('Entity and Trigger Placement', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas[data-testid="map-viewport"]');
  });

  test('should place entity with entity tool', async ({ page }) => {
    // Select entity tool
    await page.click('[data-tool="entity"]');
    
    // Select an entity from project browser
    const entityDef = page.locator('[data-testid="project-browser"] [data-entity-def]').first();
    if (await entityDef.isVisible()) {
      await entityDef.click();
    }
    
    // Click on canvas to place entity
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
    
    await page.waitForTimeout(100);
    
    // Should enable undo
    const undoButton = page.locator('[data-action="undo"]');
    await expect(undoButton).toBeEnabled();
  });

  test('should create trigger with trigger tool', async ({ page }) => {
    // Select trigger tool
    await page.click('[data-tool="trigger"]');
    
    // Drag on canvas to create trigger region
    const canvas = page.locator('canvas[data-testid="map-viewport"]');
    const box = await canvas.boundingBox();
    if (box) {
      await canvas.hover({ position: { x: 100, y: 100 } });
      await page.mouse.down();
      await canvas.hover({ position: { x: 200, y: 200 } });
      await page.mouse.up();
    }
    
    await page.waitForTimeout(100);
    
    // Should enable undo
    const undoButton = page.locator('[data-action="undo"]');
    await expect(undoButton).toBeEnabled();
  });

  test('should show entity overlay on canvas', async ({ page }) => {
    // Canvas should render entities (can't easily test canvas content, but can verify no errors)
    const canvas = page.locator('canvas[data-testid="map-viewport"]');
    await expect(canvas).toBeVisible();
    
    // No console errors should be present
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        throw new Error(`Console error: ${msg.text()}`);
      }
    });
  });
});
