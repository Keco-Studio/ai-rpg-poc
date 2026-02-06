import { test, expect } from '@playwright/test';

test.describe('Editor Shell', () => {
  test('should load editor with all main components', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');
    
    // ToolBar should be visible
    await expect(page.locator('[data-testid="toolbar"]')).toBeVisible();
    
    // MapViewport canvas should be present
    const canvas = page.locator('canvas[data-testid="map-viewport"]');
    await expect(canvas).toBeVisible();
    
    // Project browser should be visible
    await expect(page.locator('[data-testid="project-browser"]')).toBeVisible();
    
    // Tileset palette should be visible
    await expect(page.locator('[data-testid="tileset-palette"]')).toBeVisible();
  });

  test('should display demo project data', async ({ page }) => {
    await page.goto('/');

    // Wait for project to load
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="project-browser"]');
    
    // Should show demo map in project browser
    const projectBrowser = page.locator('[data-testid="project-browser"]');
    await expect(projectBrowser.getByText('Demo Map')).toBeVisible();
    
    // Should show demo tileset (check in tileset palette area)
    const tilesetPalette = page.locator('[data-testid="tileset-palette"]');
    await expect(tilesetPalette).toBeVisible();
    await expect(tilesetPalette.getByText('Demo Tileset')).toBeVisible();
  });

  test('should have all tools in toolbar', async ({ page }) => {
    await page.goto('/');

    const toolbar = page.locator('[data-testid="toolbar"]');
    
    // Check for tool buttons
    await expect(toolbar.locator('[data-tool="brush"]')).toBeVisible();
    await expect(toolbar.locator('[data-tool="rect"]')).toBeVisible();
    await expect(toolbar.locator('[data-tool="erase"]')).toBeVisible();
    await expect(toolbar.locator('[data-tool="collision"]')).toBeVisible();
    await expect(toolbar.locator('[data-tool="entity"]')).toBeVisible();
    await expect(toolbar.locator('[data-tool="trigger"]')).toBeVisible();
    
    // Check for undo/redo buttons
    await expect(toolbar.locator('[data-action="undo"]')).toBeVisible();
    await expect(toolbar.locator('[data-action="redo"]')).toBeVisible();
  });

  test('should initialize with brush tool selected', async ({ page }) => {
    await page.goto('/');

    const brushTool = page.locator('[data-tool="brush"]');
    await expect(brushTool).toHaveClass(/active|selected/);
  });
});
