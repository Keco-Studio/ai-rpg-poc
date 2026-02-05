# Quickstart: AI Patch Engine v1

**Feature**: AI Patch Engine v1  
**Branch**: `002-ai-patch-engine`  
**Date**: 2026-02-05

## Overview

This guide shows how to use the patch engine to make validated, atomic project modifications with full undo/redo support.

## Installation

The patch engine is part of the `@ai-rpg/shared` package:

```typescript
import {
  validatePatch,
  applyPatch,
  HistoryStack,
  type PatchV1,
  type Project,
} from '@ai-rpg/shared';
```

## Basic Usage

### 1. Creating a Patch

Patches are plain JavaScript objects conforming to the `PatchV1` format:

```typescript
import { v4 as uuid } from 'uuid';

const patch: PatchV1 = {
  patchVersion: 1,
  patchId: uuid(),
  baseSchemaVersion: 1,
  meta: {
    author: 'AI Assistant',
    createdAt: new Date().toISOString(),
    note: 'Add village NPCs and starting quest',
  },
  ops: [
    // Create an NPC entity definition
    {
      op: 'createEntityDef',
      entity: {
        id: 'npc_elder',
        kind: 'npc',
        sprite: { tilesetId: 'characters', tileId: 12 },
        collider: { w: 16, h: 16 },
        behavior: { dialogueId: 'elder_intro' },
      },
    },
    // Place the NPC on the map
    {
      op: 'placeEntity',
      mapId: 'village_square',
      instance: {
        id: 'elder_instance_1',
        entityId: 'npc_elder',
        x: 10,
        y: 8,
      },
    },
    // Paint some tiles to create a path
    {
      op: 'paintRect',
      mapId: 'village_square',
      layerId: 'ground',
      x: 8,
      y: 8,
      w: 5,
      h: 2,
      tileId: 42, // Stone path tile
    },
  ],
};
```

### 2. Validating a Patch

Before applying, validate the patch against the current project:

```typescript
import { validatePatch } from '@ai-rpg/shared';

const result = validatePatch(project, patch);

if (!result.ok) {
  console.error('Patch validation failed:');
  result.errors.forEach((err) => {
    console.error(`  [${err.code}] ${err.message}`);
    if (err.opIndex !== undefined) {
      console.error(`    Operation ${err.opIndex}: ${err.path}`);
    }
    if (err.detail) {
      console.error(`    Detail:`, err.detail);
    }
  });
  return;
}

console.log('✅ Patch validation passed');
```

### 3. Applying a Patch

If validation succeeds, apply the patch atomically:

```typescript
import { applyPatch } from '@ai-rpg/shared';

// Validate first
const validation = validatePatch(project, patch);
if (!validation.ok) {
  throw new Error('Cannot apply invalid patch');
}

// Apply
const { project: newProject, summary, inverse } = applyPatch(project, patch);

console.log('Patch applied successfully!');
console.log('Summary:', summary);
// Summary: {
//   created: { entities: ['npc_elder', 'elder_instance_1'], ... },
//   modified: { maps: ['village_square'], layers: ['ground'], ... },
//   tileEdits: [{ mapId: 'village_square', layerId: 'ground', changedCells: 10 }],
//   ...
// }

// Use newProject for subsequent operations
// Original project is unchanged
```

**Important**: Always validate before applying. `applyPatch` assumes validation has passed.

### 4. Undo/Redo with History Stack

For editor integration, use the `HistoryStack` utility:

```typescript
import { HistoryStack } from '@ai-rpg/shared';

let currentProject: Project = initialProject;
const history = new HistoryStack({ maxSize: 100 });

// Apply a patch
const result = history.applyAndPush(currentProject, patch);
if (result.ok) {
  currentProject = result.project;
  console.log('Applied:', result.summary);
} else {
  console.error('Failed:', result.errors);
}

// Undo
if (history.canUndo()) {
  const undoResult = history.undo(currentProject);
  if (undoResult) {
    currentProject = undoResult.project;
    console.log('Undid:', undoResult.summary);
  }
}

// Redo
if (history.canRedo()) {
  const redoResult = history.redo(currentProject);
  if (redoResult) {
    currentProject = redoResult.project;
    console.log('Redid:', redoResult.summary);
  }
}
```

## Common Patterns

### Pattern 1: Batch Tile Edits

For efficiency, use `PaintRectOp` for large areas:

```typescript
const patch: PatchV1 = {
  patchVersion: 1,
  patchId: uuid(),
  baseSchemaVersion: 1,
  ops: [
    // Fill a room floor with grass
    {
      op: 'paintRect',
      mapId: 'dungeon_1',
      layerId: 'ground',
      x: 5,
      y: 5,
      w: 10,
      h: 8,
      tileId: 3, // Grass tile
    },
    // Add walls around the room
    {
      op: 'setCollisionRect',
      mapId: 'dungeon_1',
      x: 4,
      y: 4,
      w: 12,
      h: 10,
      solid: 1,
    },
  ],
};
```

### Pattern 2: Intra-Patch References

Create an entity and use it immediately in the same patch:

```typescript
const patch: PatchV1 = {
  patchVersion: 1,
  patchId: uuid(),
  baseSchemaVersion: 1,
  ops: [
    // First, create the dialogue
    {
      op: 'createDialogue',
      dialogue: {
        id: 'shopkeeper_greet',
        startNode: 'greet',
        nodes: [
          {
            id: 'greet',
            text: 'Welcome to my shop!',
            speaker: 'Shopkeeper',
            choices: [],
          },
        ],
      },
    },
    // Then create entity that references the dialogue
    {
      op: 'createEntityDef',
      entity: {
        id: 'npc_shopkeeper',
        kind: 'npc',
        sprite: { tilesetId: 'characters', tileId: 8 },
        behavior: { dialogueId: 'shopkeeper_greet' }, // References dialogue created above
      },
    },
    // Finally place the entity
    {
      op: 'placeEntity',
      mapId: 'village_shop',
      instance: {
        id: 'shopkeeper_1',
        entityId: 'npc_shopkeeper', // References entity created above
        x: 5,
        y: 3,
      },
    },
  ],
};
```

**Validation order matters**: Operations are validated sequentially, so the dialogue and entity must be created before they're referenced.

### Pattern 3: Update Operations

Modify existing resources with partial updates:

```typescript
const patch: PatchV1 = {
  patchVersion: 1,
  patchId: uuid(),
  baseSchemaVersion: 1,
  ops: [
    // Move trigger region
    {
      op: 'updateTrigger',
      mapId: 'dungeon_entrance',
      triggerId: 'door_trigger_1',
      patch: {
        rect: { x: 12, y: 8, w: 2, h: 1 }, // Only update position
        // onEnter/onInteract unchanged
      },
    },
    // Update dialogue text
    {
      op: 'updateDialogueNode',
      dialogueId: 'quest_main',
      nodeId: 'intro',
      patch: {
        text: 'Updated quest introduction text',
        // speaker, choices, effects unchanged
      },
    },
  ],
};
```

### Pattern 4: Safe Deletion

When deleting entities, check for instances first:

```typescript
// WRONG - will fail if instances exist
const badPatch: PatchV1 = {
  ops: [
    {
      op: 'deleteEntityDef', // Not implemented in v1
      entityId: 'npc_guard',
    },
  ],
};

// RIGHT - delete instances first
const goodPatch: PatchV1 = {
  ops: [
    // Delete all instances
    {
      op: 'deleteEntity',
      mapId: 'castle_entrance',
      instanceId: 'guard_1',
    },
    {
      op: 'deleteEntity',
      mapId: 'castle_entrance',
      instanceId: 'guard_2',
    },
    // Then delete the definition
    // Note: Entity definition deletion not in v1 scope
    // In practice, definition can remain unused
  ],
};
```

## Error Handling

### Common Validation Errors

#### OUT_OF_BOUNDS
```typescript
// Error: Painting outside map bounds
{
  code: 'OUT_OF_BOUNDS',
  message: 'Paint rect exceeds map bounds',
  opIndex: 2,
  path: 'ops[2].x',
  detail: {
    rect: { x: 95, y: 10, w: 10, h: 5 },
    mapSize: { width: 100, height: 100 },
  }
}
```

**Fix**: Adjust coordinates to fit within map bounds (0 to width-1, 0 to height-1).

#### MISSING_REF
```typescript
// Error: Referencing non-existent entity
{
  code: 'MISSING_REF',
  message: 'Entity ID not found',
  opIndex: 5,
  path: 'ops[5].instance.entityId',
  detail: {
    requestedId: 'npc_merchant',
    availableIds: ['npc_guard', 'npc_elder', 'npc_child'],
  }
}
```

**Fix**: Use an existing entity ID or create the entity earlier in the patch ops.

#### DUPLICATE_ID
```typescript
// Error: Creating entity with duplicate ID
{
  code: 'DUPLICATE_ID',
  message: 'Entity ID already exists',
  opIndex: 3,
  path: 'ops[3].entity.id',
  detail: {
    duplicateId: 'npc_guard',
    existingSince: 'project' | 'ops[1]',
  }
}
```

**Fix**: Use a unique ID. Consider adding UUID or timestamp suffix.

#### INVALID_TILE_ID
```typescript
// Error: Tile ID out of range
{
  code: 'INVALID_TILE_ID',
  message: 'Tile ID exceeds tileset capacity',
  opIndex: 1,
  path: 'ops[1].tileId',
  detail: {
    tileId: 256,
    maxTileId: 255,
    tilesetId: 'dungeon_tiles',
  }
}
```

**Fix**: Use a tile ID within the tileset's capacity (usually 0 to numTiles-1).

## Performance Considerations

### Prefer Rectangular Operations

```typescript
// ❌ SLOW - 10,000 individual ops
{
  ops: Array.from({ length: 10000 }, (_, i) => ({
    op: 'setTiles',
    mapId: 'large_map',
    layerId: 'ground',
    cells: [{ x: i % 100, y: Math.floor(i / 100), tileId: 5 }],
  }))
}

// ✅ FAST - 1 rect op
{
  ops: [
    {
      op: 'paintRect',
      mapId: 'large_map',
      layerId: 'ground',
      x: 0,
      y: 0,
      w: 100,
      h: 100,
      tileId: 5,
    },
  ]
}
```

### Batch Operations in Single Patch

```typescript
// ❌ SLOW - 3 separate patches
await applyPatch(project1, { ops: [createEntity] });
await applyPatch(project2, { ops: [placeEntity] });
await applyPatch(project3, { ops: [paintTiles] });

// ✅ FAST - 1 combined patch
await applyPatch(project, {
  ops: [createEntity, placeEntity, paintTiles],
});
```

### Memory Management for Large Patches

For patches with >50k tile edits, monitor memory:

```typescript
// If memory is constrained, split into multiple patches
const largePatch = {
  ops: Array.from({ length: 100000 }, () => ({
    /* tile ops */
  })),
};

// Split into chunks
const chunkSize = 10000;
for (let i = 0; i < largePatch.ops.length; i += chunkSize) {
  const chunk = {
    ...largePatch,
    ops: largePatch.ops.slice(i, i + chunkSize),
  };
  project = applyPatch(project, chunk).project;
}
```

## Testing Your Patches

### Unit Test Template

```typescript
import { describe, it, expect } from 'vitest';
import { validatePatch, applyPatch } from '@ai-rpg/shared';
import { baseProject } from './fixtures/projects';

describe('Custom patch validation', () => {
  it('should create and place custom entity', () => {
    const patch: PatchV1 = {
      /* your patch */
    };

    const validation = validatePatch(baseProject, patch);
    expect(validation.ok).toBe(true);

    const { project, summary } = applyPatch(baseProject, patch);
    expect(summary.created.entities).toContain('my_entity');
  });

  it('should reject invalid coordinates', () => {
    const invalidPatch: PatchV1 = {
      /* patch with out-of-bounds coords */
    };

    const validation = validatePatch(baseProject, invalidPatch);
    expect(validation.ok).toBe(false);
    expect(validation.errors[0].code).toBe('OUT_OF_BOUNDS');
  });
});
```

### Integration Test: Undo Correctness

```typescript
it('should restore exact state after undo', () => {
  const before = JSON.stringify(project);

  const { project: after, inverse } = applyPatch(project, patch);
  expect(after).not.toEqual(project);

  const { project: restored } = applyPatch(after, inverse);
  expect(JSON.stringify(restored)).toBe(before);
});
```

## AI Integration Example

For AI-assisted editing, provide a tool interface:

```typescript
interface PatchGeneratorTool {
  name: 'generate_patch';
  description: 'Create a validated patch for project modifications';
  parameters: {
    type: 'object';
    properties: {
      operations: {
        type: 'array';
        items: {
          /* PatchOp schema */
        };
      };
    };
  };
}

// AI calls tool with operations
const aiResponse = await ai.call({
  tool: 'generate_patch',
  parameters: {
    operations: [
      /* AI-generated ops */
    ],
  },
});

// Validate and apply
const patch = {
  patchVersion: 1,
  patchId: uuid(),
  baseSchemaVersion: 1,
  meta: { author: 'AI', createdAt: new Date().toISOString() },
  ops: aiResponse.parameters.operations,
};

const validation = validatePatch(project, patch);
if (validation.ok) {
  const result = applyPatch(project, patch);
  console.log('AI patch applied:', result.summary);
} else {
  console.error('AI generated invalid patch:', validation.errors);
  // Optionally retry with error feedback
}
```

## Next Steps

- **Spec 003**: LLM orchestration and patch repair loop
- **Spec 004**: Editor UI with visual diff preview

## API Reference

See full API documentation:
- [data-model.md](./data-model.md) - Complete entity definitions
- [contracts/patch-v1.schema.json](./contracts/patch-v1.schema.json) - JSON schema
- [research.md](./research.md) - Architecture decisions and rationale

## Troubleshooting

### Q: My patch validation succeeds but application fails
**A**: This is a bug. Validation should catch all errors. Please file an issue with the patch JSON.

### Q: Inverse patch fails to apply
**A**: This is a critical bug in inverse generation. Please file an issue immediately with reproduction steps.

### Q: Performance is slow for large patches
**A**: Ensure you're using rect operations instead of per-cell operations. Profile with `console.time()` to identify bottlenecks.

### Q: How do I handle schema version upgrades?
**A**: For v1, patches must target schema v1. Future versions may support migration. For now, reject patches with mismatched `baseSchemaVersion`.
