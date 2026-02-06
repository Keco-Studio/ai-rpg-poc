# Quickstart: Editor UX v1

**Feature**: 004-editor-ux
**Date**: 2026-02-06

## Prerequisites

- Node.js 20+, npm 10+
- Repository cloned and dependencies installed (`npm install` at root)
- Packages built (`npm run build`)

## Running the Editor

```bash
# From repository root
npm run dev --workspace=packages/editor
```

Opens the editor at `http://localhost:5173` (Vite dev server).

## Architecture Overview

The editor follows a **patch-native** architecture: every state mutation (manual edits and AI proposals) flows through the same pipeline:

```
User Gesture → Transaction → PatchV1 → validatePatch → applyPatch → HistoryStack → Updated Project
```

This ensures all changes are validated, atomic, and undoable.

## Core Concepts

### 1. Editor State

The editor state is managed via `useReducer` in the `EditorShell` component:

```typescript
import { editorReducer, initialEditorState } from './state/editorStore';

const [state, dispatch] = useReducer(editorReducer, initialEditorState(project));
```

Key state fields:
- `project` — Current Project (source of truth)
- `activeMapId` / `activeLayerId` — What's being edited
- `activeTool` — brush, rect, erase, collision, entity, trigger
- `transaction` — In-progress gesture (null when idle)

### 2. Transaction Manager

Every editing gesture (brush stroke, entity placement, etc.) is wrapped in a transaction:

```typescript
import { TransactionManager } from './state/transaction';

const txManager = new TransactionManager();

// On mouse down
const tx = txManager.begin('brush', mapId, layerId);

// On mouse move (accumulate cells)
txManager.addCells(tx, [{ x: 5, y: 3, value: selectedTileId }]);

// On mouse up (commit → validate → apply → history)
const result = txManager.commit(tx, project, selectedTileId);
if (result) {
  dispatch({ type: 'COMMIT_TRANSACTION', result: result.result, meta: result.meta });
}
```

The transaction manager automatically optimizes:
- Brush strokes forming rectangles → single `paintRect` op
- Scattered cells → batched `setTiles` op

### 3. Patch Builders

Convert tool gestures to PatchOps:

```typescript
import { buildTileOps, buildRectFillOp, buildPlaceEntityOp } from './adapters/patchBuilders';

// Brush stroke cells → optimal PatchOps
const ops = buildTileOps(cells, mapId, layerId, tileId);

// Rectangle fill → single paintRect op
const op = buildRectFillOp(mapId, layerId, tileId, x, y, width, height);

// Entity placement → placeEntity op
const op = buildPlaceEntityOp(mapId, entityDefId, x, y);
```

### 4. Conflict-Aware Undo

When undoing a patch that may conflict with later edits:

```typescript
import { ConflictAwareHistory } from './state/conflictAwareHistory';

const history = new ConflictAwareHistory();

// Apply a patch (stores conflict hunks automatically)
const result = history.applyAndPush(project, patch, {
  origin: 'ai',
  summary: 'AI: Added blacksmith NPC',
  timestamp: Date.now(),
});

// Later, check for conflicts before undo
const preflight = history.preflightUndo(currentProject);

if (preflight && preflight.hasConflicts) {
  // Show ConflictModal — user chooses resolution
  // Based on user choice:

  // Option 1: Cancel — do nothing
  // Option 2: Force undo — revert everything
  history.undo(currentProject);
  // Option 3: Partial undo — skip conflicting hunks
  history.partialUndo(currentProject, preflight.detectionResult.safeHunks);
}
```

### 5. AI Panel Integration

The AI panel uses the existing orchestrator:

```typescript
import { proposePatchWithRepair } from '@ai-rpg-maker/shared';

// Propose a patch from natural language
const result = await proposePatchWithRepair(project, userPrompt, aiProvider);

if (result.status === 'success' && result.patch) {
  // Show PatchPreview component
  // On user clicking "Apply":
  const applyResult = applyPatch(project, result.patch);
  dispatch({
    type: 'APPLY_PATCH',
    result: applyResult,
    meta: { origin: 'ai', summary: `AI: ${userPrompt}`, timestamp: Date.now() },
  });
}
```

### 6. Runtime Preview

The runtime preview embeds Excalibur in an iframe:

```typescript
// RuntimePreview component sends project data via postMessage
previewIframeRef.current.contentWindow.postMessage(
  { type: 'loadProject', project, mapId: activeMapId },
  '*'
);

// Reload after edits
previewIframeRef.current.contentWindow.postMessage({ type: 'reload' }, '*');
```

## Component Hierarchy

```
EditorShell
├── ProjectBrowser (sidebar — map list, tileset info, entity defs)
├── ToolBar (top — tool selection, undo/redo buttons)
├── MapViewport (center — canvas rendering + interaction)
├── TilesetPalette (bottom/side — tile selection grid)
├── HistoryPanel (right panel — entry list, undo/redo)
├── AiPanel (right panel — prompt, preview, apply/reject)
│   └── PatchPreview (summary + details)
├── ConflictModal (overlay — conflict resolution dialog)
└── RuntimePreview (bottom panel — Excalibur iframe)
```

## Testing

```bash
# Run all editor tests
npm test --workspace=packages/editor

# Run specific test file
npx vitest run packages/editor/tests/unit/transaction.test.ts
```

### Key Test Scenarios

1. **Transaction grouping**: Brush stroke cells → single patch with optimal ops
2. **Conflict detection**: AI patch → manual edit → undo detects conflicts
3. **Partial undo**: Only non-conflicting hunks are reverted
4. **AI flow**: Propose → preview → apply creates history entry with AI origin
5. **Rect optimization**: Rectangular brush strokes produce `paintRect` instead of `setTiles`

## Common Patterns

### Adding a New Tool

1. Add value to `ToolType` in `state/editorStore.ts`
2. Add gesture handler in `hooks/useMapInteraction.ts`
3. Add patch builder function in `adapters/patchBuilders.ts`
4. Add toolbar button in `components/ToolBar.tsx`
5. Add renderer (if visual feedback needed) in `renderers/`

### Extending History Metadata

Add fields to `HistoryEntryMeta` in `state/editorStore.ts`. The metadata array is maintained in parallel with `HistoryStack`'s internal entries. When HistoryStack pushes/pops, the editor reducer updates `historyMeta` accordingly.
