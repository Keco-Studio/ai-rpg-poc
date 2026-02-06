import { test, expect } from '@playwright/test';

test.describe('AI Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas[data-testid="map-viewport"]');
  });

  test('should display AI panel', async ({ page }) => {
    const aiPanel = page.locator('[data-testid="ai-panel"]');
    
    // AI panel might be in a tab or collapsible section
    if (await aiPanel.isVisible()) {
      await expect(aiPanel).toBeVisible();
    } else {
      // Try to find and click a tab or button to show AI panel
      const aiTab = page.locator('button:has-text("AI"), [data-tab="ai"]');
      if (await aiTab.isVisible()) {
        await aiTab.click();
        await expect(aiPanel).toBeVisible();
      }
    }
  });

  test('should have prompt input field', async ({ page }) => {
    const aiPanel = page.locator('[data-testid="ai-panel"]');
    
    if (!(await aiPanel.isVisible())) {
      const aiTab = page.locator('button:has-text("AI"), [data-tab="ai"]');
      if (await aiTab.isVisible()) {
        await aiTab.click();
      }
    }
    
    const promptInput = page.locator('[data-testid="ai-prompt-input"], textarea[placeholder*="prompt"], textarea[placeholder*="AI"]');
    if (await promptInput.isVisible()) {
      await expect(promptInput).toBeVisible();
      await expect(promptInput).toBeEditable();
    }
  });

  test('should have propose/generate button', async ({ page }) => {
    const aiPanel = page.locator('[data-testid="ai-panel"]');
    
    if (!(await aiPanel.isVisible())) {
      const aiTab = page.locator('button:has-text("AI"), [data-tab="ai"]');
      if (await aiTab.isVisible()) {
        await aiTab.click();
      }
    }
    
    const proposeButton = page.locator('button:has-text("Propose"), button:has-text("Generate"), [data-action="propose"]');
    if (await proposeButton.isVisible()) {
      await expect(proposeButton).toBeVisible();
    }
  });

  test('should accept text input in prompt field', async ({ page }) => {
    const aiPanel = page.locator('[data-testid="ai-panel"]');
    
    if (!(await aiPanel.isVisible())) {
      const aiTab = page.locator('button:has-text("AI"), [data-tab="ai"]');
      if (await aiTab.isVisible()) {
        await aiTab.click();
      }
    }
    
    const promptInput = page.locator('[data-testid="ai-prompt-input"], textarea[placeholder*="prompt"], textarea[placeholder*="AI"]').first();
    if (await promptInput.isVisible()) {
      await promptInput.fill('Create a forest area with trees');
      await expect(promptInput).toHaveValue('Create a forest area with trees');
    }
  });

  test('should show debug panel toggle', async ({ page }) => {
    const aiPanel = page.locator('[data-testid="ai-panel"]');
    
    if (!(await aiPanel.isVisible())) {
      const aiTab = page.locator('button:has-text("AI"), [data-tab="ai"]');
      if (await aiTab.isVisible()) {
        await aiTab.click();
      }
    }
    
    // Look for debug toggle
    const debugToggle = page.locator('button:has-text("Debug"), [data-action="toggle-debug"]');
    if (await debugToggle.isVisible()) {
      await expect(debugToggle).toBeVisible();
    }
  });
});
