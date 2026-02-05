# Patching Guide

A practical guide to using the AI Patch Engine for project modifications.

## Quick Start

```typescript
import { validatePatch, applyPatch, HistoryStack, type PatchV1 } from '@ai-rpg-maker/shared';

// 1. Create a patch
const patch: PatchV1 = {
  patchVersion: 1,
  patchId: crypto.randomUUID(),
  baseSchemaVersion: 1,
  ops: [
    { op: 'paintRect', mapId: 'map1', layerId: 'ground', x: 0, y: 0, w: 5, h: 5, tileId: 1 }
  ]
};

// 2. Validate
const result = validatePatch(project, patch);
if (!result.ok) {
  console.error(result.errors);
  return;
}

// 3. Apply
const { project: newProject, summary, inverse } = applyPatch(project, patch);

// 4. Undo if needed
const { project: restored } = applyPatch(newProject, inverse);
```

## Best Practices

### Use Rectangular Operations for Large Areas

```typescript
// Good: 1 operation for 10,000 tiles
{ op: 'paintRect', mapId: 'm', layerId: 'ground', x: 0, y: 0, w: 100, h: 100, tileId: 5 }

// Bad: 10,000 individual operations
cells.map(c => ({ op: 'setTiles', mapId: 'm', layerId: 'ground', cells: [c] }))
```

### Batch Operations in a Single Patch

Combine related operations into one patch for atomic application and single-step undo:

```typescript
const patch: PatchV1 = {
  patchVersion: 1,
  patchId: crypto.randomUUID(),
  baseSchemaVersion: 1,
  ops: [
    { op: 'createDialogue', dialogue: { /* ... */ } },
    { op: 'createEntityDef', entity: { /* references dialogue above */ } },
    { op: 'placeEntity', mapId: 'map1', instance: { /* references entity above */ } },
  ]
};
```

### Always Validate Before Applying

The `applyPatch` function assumes the patch has been validated:

```typescript
const validation = validatePatch(project, patch);
if (validation.ok) {
  const result = applyPatch(project, patch);
}
```

### Use HistoryStack for Editor Integration

```typescript
const history = new HistoryStack({ maxSize: 100 });
let project = initialProject;

// Apply
const result = history.applyAndPush(project, patch);
if (result) project = result.project;

// Undo
if (history.canUndo()) {
  const undo = history.undo(project);
  if (undo) project = undo.project;
}

// Redo
if (history.canRedo()) {
  const redo = history.redo(project);
  if (redo) project = redo.project;
}
```

## Troubleshooting

### "MISSING_REF" for intra-patch references
Operations are validated in order. Create resources before referencing them:

```typescript
ops: [
  { op: 'createDialogue', dialogue: { id: 'dlg1', /* ... */ } },  // Create first
  { op: 'createEntityDef', entity: { /* ... */ behavior: { dialogueId: 'dlg1' } } },  // Then reference
]
```

### "OUT_OF_BOUNDS" errors
Ensure all coordinates are within `[0, width-1]` x `[0, height-1]` and all rectangles fit within map dimensions.

### "DUPLICATE_ID" errors
Use unique IDs for all created resources. Consider using UUID or namespace prefixes.

### Performance issues with large patches
- Use `paintRect` instead of individual `setTiles` for large areas
- Keep patches under 1000 operations
- For very large edits, split into multiple patches

## API Reference

- **`validatePatch(project, patch)`** - Returns `{ ok: true }` or `{ ok: false, errors: [...] }`
- **`applyPatch(project, patch)`** - Returns `{ project, summary, inverse }`
- **`summarizePatch(before, after)`** - Returns change summary
- **`HistoryStack`** - Manages undo/redo with `applyAndPush()`, `undo()`, `redo()`
