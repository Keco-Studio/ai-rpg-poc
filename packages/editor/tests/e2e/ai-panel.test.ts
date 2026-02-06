import { test, expect } from '@playwright/test';

test.describe('AI Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('canvas[data-testid="map-viewport"]');
  });

  test('should display AI panel', async ({ page }) => {
    const aiPanel = page.locator('[data-testid="ai-panel"]');
    await expect(aiPanel).toBeVisible();
  });

  test('should have prompt input field', async ({ page }) => {
    const aiPanel = page.locator('[data-testid="ai-panel"]');
    const promptInput = aiPanel.locator('[data-testid="ai-prompt-input"]');
    await expect(promptInput).toBeVisible();
    await expect(promptInput).toBeEditable();
  });

  test('should have propose button', async ({ page }) => {
    const aiPanel = page.locator('[data-testid="ai-panel"]');
    const proposeButton = aiPanel.getByRole('button', { name: /propose/i });
    await expect(proposeButton).toBeVisible();
  });

  test('should accept text input in prompt field', async ({ page }) => {
    const aiPanel = page.locator('[data-testid="ai-panel"]');
    const promptInput = aiPanel.locator('[data-testid="ai-prompt-input"]');
    await promptInput.fill('Create a forest area with trees');
    await expect(promptInput).toHaveValue('Create a forest area with trees');
  });
});
