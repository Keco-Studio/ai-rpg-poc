import { test, expect } from '@playwright/test';

test.describe('Project Browser', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="project-browser"]');
  });

  test('should display project browser', async ({ page }) => {
    const projectBrowser = page.locator('[data-testid="project-browser"]');
    await expect(projectBrowser).toBeVisible();
  });

  test('should list maps', async ({ page }) => {
    const projectBrowser = page.locator('[data-testid="project-browser"]');
    const mapsList = projectBrowser.locator('[data-section="maps"]');
    await expect(mapsList).toBeVisible();
    
    // Should have at least one map
    const maps = mapsList.locator('[data-map-id]');
    await expect(maps).toHaveCount(1);
  });

  test('should list tilesets', async ({ page }) => {
    const projectBrowser = page.locator('[data-testid="project-browser"]');
    const tilesetSection = projectBrowser.locator('[data-section="tilesets"]');
    await expect(tilesetSection).toBeVisible();
  });

  test('should list entity definitions', async ({ page }) => {
    const projectBrowser = page.locator('[data-testid="project-browser"]');
    const entitiesSection = projectBrowser.locator('[data-section="entities"]');
    await expect(entitiesSection).toBeVisible();
    
    // Should have at least one entity def
    const entityDefs = entitiesSection.locator('[data-entity-def]');
    const count = await entityDefs.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should switch active map on click', async ({ page }) => {
    const projectBrowser = page.locator('[data-testid="project-browser"]');
    const mapsList = projectBrowser.locator('[data-section="maps"]');
    const firstMap = mapsList.locator('[data-map-id]').first();
    await firstMap.click();
    
    await page.waitForTimeout(200);
    
    // Map should be marked as active
    await expect(firstMap).toHaveClass(/active/);
  });

  test('should display map metadata', async ({ page }) => {
    const projectBrowser = page.locator('[data-testid="project-browser"]');
    
    // Should show map name
    await expect(projectBrowser.getByText('Demo Map')).toBeVisible();
  });
});
