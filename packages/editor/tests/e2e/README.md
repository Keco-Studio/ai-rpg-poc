# Editor E2E Tests

End-to-end tests for the AI RPG Maker editor using Playwright.

## Running Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run with browser visible
npm run test:e2e:headed

# Run with Playwright UI
npm run test:e2e:ui

# Debug mode (step through tests)
npm run test:e2e:debug
```

## Test Structure

### `editor-load.test.ts`
- Verify editor shell loads correctly
- Check all main components are present
- Validate demo project data displays
- Ensure all tools are visible in toolbar

### `tool-interactions.test.ts`
- Tool switching (brush, rect, erase, collision, entity, trigger)
- Tile palette selection
- Brush tool painting on canvas
- Rectangle fill tool
- Erase tool functionality
- Collision overlay painting

### `undo-redo.test.ts`
- Undo/redo button states
- Keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z)
- Transaction cancellation with Escape key
- History state management

### `entity-trigger.test.ts`
- Entity placement with entity tool
- Trigger region creation with trigger tool
- Canvas rendering verification

### `history-panel.test.ts`
- History panel visibility
- Entry display after manual edits
- Undone entry styling
- Timestamp display

### `ai-panel.test.ts`
- AI panel visibility and access
- Prompt input field
- Propose/generate button
- Text input acceptance
- Debug panel toggle

### `project-browser.test.ts`
- Project browser display
- Maps list
- Tilesets list
- Entity definitions list
- Active map selection
- Entity definition selection

## Data Test IDs

Components expose `data-testid` attributes for reliable test selectors:

- `editor-shell` - Main editor container
- `toolbar` - Tool selection bar
- `map-viewport` - Canvas element
- `project-browser` - Left sidebar
- `tileset-palette` - Tile selection palette
- `history-panel` - History log panel
- `ai-panel` - AI assistant panel
- `ai-prompt-input` - AI prompt textarea

Additional data attributes:
- `data-tool="brush|rect|erase|..."` - Tool buttons
- `data-action="undo|redo|propose"` - Action buttons
- `data-tile-id="N"` - Individual tiles
- `data-map-id="..."` - Map list items
- `data-entity-def="..."` - Entity definition items
- `data-history-entry="N"` - History entries
- `data-origin="manual|ai"` - History entry origin
- `data-section="maps|tilesets|entities"` - Browser sections

## Configuration

See `playwright.config.ts` for configuration details:

- **Dev server**: Automatically starts Vite dev server on port 5173
- **Browsers**: Tests run on Chromium, Firefox, and WebKit
- **Retries**: 2 retries on CI, 0 locally
- **Trace**: Captured on first retry
- **Screenshots**: Only on failure

## Writing New Tests

1. Import test utilities:
   ```typescript
   import { test, expect } from '@playwright/test';
   ```

2. Use `data-testid` selectors:
   ```typescript
   await page.locator('[data-testid="toolbar"]').click();
   ```

3. Wait for navigation/loading:
   ```typescript
   await page.waitForSelector('[data-testid="map-viewport"]');
   ```

4. Use descriptive test names:
   ```typescript
   test('should paint tiles with brush tool', async ({ page }) => {
     // ...
   });
   ```

## Tips

- Always wait for selectors to be visible before interacting
- Use `data-testid` over CSS selectors for stability
- Add `await page.waitForTimeout(100)` after actions that trigger async state updates
- Check for both enabled and disabled button states
- Test keyboard shortcuts alongside UI interactions

## CI Integration

Tests run automatically on CI with:
- Headless mode
- 2 retries for flaky tests
- Single worker (no parallelization)
- HTML report generation
