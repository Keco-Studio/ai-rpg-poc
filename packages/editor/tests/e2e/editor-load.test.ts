import { test, expect } from '@playwright/test';

test.describe('Editor Shell', () => {
  test('should load editor with all main components', async ({ page }) => {
    await page.goto('/');

    // Check for main layout sections
    await expect(page.locator('text=AI RPG Maker')).toBeVisible();
    
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
    await page.waitForSelector('[data-testid="project-browser"]');
    
    // Should show demo map in project browser
    await expect(page.locator('text=demo-map')).toBeVisible();
    
    // Should show demo tileset
    await expect(page.locator('text=demo-tileset')).toBeVisible();
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
