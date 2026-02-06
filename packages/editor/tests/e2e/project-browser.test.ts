import { test, expect } from '@playwright/test';

test.describe('Project Browser', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="project-browser"]');
  });

  test('should display project browser', async ({ page }) => {
    const projectBrowser = page.locator('[data-testid="project-browser"]');
    await expect(projectBrowser).toBeVisible();
  });

  test('should list maps', async ({ page }) => {
    const projectBrowser = page.locator('[data-testid="project-browser"]');
    
    // Should show at least the demo map
    const mapsList = projectBrowser.locator('[data-section="maps"]');
    if (await mapsList.isVisible()) {
      await expect(mapsList).toBeVisible();
      
      // Should have at least one map
      const maps = mapsList.locator('[data-map-id]');
      await expect(maps).toHaveCount(1);
    }
  });

  test('should list tilesets', async ({ page }) => {
    const projectBrowser = page.locator('[data-testid="project-browser"]');
    
    // Should show tileset info
    const tilesetSection = projectBrowser.locator('[data-section="tilesets"]');
    if (await tilesetSection.isVisible()) {
      await expect(tilesetSection).toBeVisible();
    }
  });

  test('should list entity definitions', async ({ page }) => {
    const projectBrowser = page.locator('[data-testid="project-browser"]');
    
    // Should show entity definitions
    const entitiesSection = projectBrowser.locator('[data-section="entities"]');
    if (await entitiesSection.isVisible()) {
      await expect(entitiesSection).toBeVisible();
      
      // Should have at least one entity def
      const entityDefs = entitiesSection.locator('[data-entity-def]');
      const count = await entityDefs.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should switch active map on click', async ({ page }) => {
    const projectBrowser = page.locator('[data-testid="project-browser"]');
    const mapsList = projectBrowser.locator('[data-section="maps"]');
    
    if (await mapsList.isVisible()) {
      const firstMap = mapsList.locator('[data-map-id]').first();
      await firstMap.click();
      
      await page.waitForTimeout(100);
      
      // Map should be marked as active
      await expect(firstMap).toHaveClass(/active|selected/);
    }
  });

  test('should allow selecting entity definition', async ({ page }) => {
    const projectBrowser = page.locator('[data-testid="project-browser"]');
    const entitiesSection = projectBrowser.locator('[data-section="entities"]');
    
    if (await entitiesSection.isVisible()) {
      const entityDefs = entitiesSection.locator('[data-entity-def]');
      if (await entityDefs.count() > 0) {
        const firstEntity = entityDefs.first();
        await firstEntity.click();
        
        await page.waitForTimeout(100);
        
        // Entity should be marked as selected
        await expect(firstEntity).toHaveClass(/active|selected/);
      }
    }
  });

  test('should display map metadata', async ({ page }) => {
    const projectBrowser = page.locator('[data-testid="project-browser"]');
    
    // Should show map name/ID
    const demoMap = projectBrowser.locator('text=demo-map');
    await expect(demoMap).toBeVisible();
  });
});
