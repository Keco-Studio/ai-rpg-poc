# Patch Format v1

**Version**: 1  
**Schema**: [contracts/patch-v1.schema.json](contracts/patch-v1.schema.json)

## Overview

The PatchV1 format defines a versioned document structure for representing atomic project modifications. Each patch contains an ordered sequence of operations that are validated and applied as a single transaction.

## Patch Document Structure

```typescript
interface PatchV1 {
  patchVersion: 1;          // Format version (always 1)
  patchId: string;          // Unique ID (UUID recommended)
  baseSchemaVersion: 1;     // Target project schema version
  meta?: {                  // Optional metadata
    author?: string;        // Creator name
    createdAt?: string;     // ISO 8601 timestamp
    note?: string;          // Description (max 500 chars)
  };
  ops: PatchOp[];           // Ordered operations
}
```

## Operation Types (17 total)

### Map Operations

| Op | Description | Required Fields |
|----|-------------|----------------|
| `createMap` | Create a new game map | `map.id`, `map.name`, `map.tilesetId`, `map.width`, `map.height` |
| `createLayer` | Add a tile layer to a map | `mapId`, `layer.id`, `layer.name`, `layer.z` |

### Tile Operations

| Op | Description | Required Fields |
|----|-------------|----------------|
| `paintRect` | Fill rectangle with tile | `mapId`, `layerId`, `x`, `y`, `w`, `h`, `tileId` |
| `setTiles` | Set individual tiles | `mapId`, `layerId`, `cells[].{x,y,tileId}` |
| `clearTiles` | Clear tiles (set to 0) | `mapId`, `layerId`, `cells[].{x,y}` |

### Collision Operations

| Op | Description | Required Fields |
|----|-------------|----------------|
| `setCollisionCells` | Set individual collision values | `mapId`, `cells[].{x,y,solid}` |
| `setCollisionRect` | Fill collision rectangle | `mapId`, `x`, `y`, `w`, `h`, `solid` |

### Entity Operations

| Op | Description | Required Fields |
|----|-------------|----------------|
| `createEntityDef` | Create entity template | `entity.id`, `entity.kind`, `entity.sprite` |
| `placeEntity` | Place entity on map | `mapId`, `instance.id`, `instance.entityId`, `instance.x`, `instance.y` |
| `moveEntity` | Move entity instance | `mapId`, `instanceId`, `x`, `y` |
| `deleteEntity` | Remove entity instance | `mapId`, `instanceId` |

### Trigger Operations

| Op | Description | Required Fields |
|----|-------------|----------------|
| `createTrigger` | Create trigger region | `mapId`, `trigger.id`, `trigger.rect` |
| `updateTrigger` | Update trigger properties | `mapId`, `triggerId`, `patch` |

### Dialogue Operations

| Op | Description | Required Fields |
|----|-------------|----------------|
| `createDialogue` | Create dialogue graph | `dialogue` (full DialogueGraph) |
| `updateDialogueNode` | Update dialogue node | `dialogueId`, `nodeId`, `patch` |

### Quest Operations

| Op | Description | Required Fields |
|----|-------------|----------------|
| `createQuest` | Create quest definition | `quest` (full Quest) |
| `updateQuest` | Update quest properties | `questId`, `patch` |

## Error Codes

| Code | Description |
|------|-------------|
| `UNKNOWN_OP` | Unrecognized operation type |
| `MISSING_REF` | Referenced ID doesn't exist |
| `DUPLICATE_ID` | Creating resource with existing ID |
| `OUT_OF_BOUNDS` | Coordinates outside map boundaries |
| `INVALID_TILE_ID` | Tile ID outside valid range |
| `INVALID_LAYER` | Layer doesn't exist |
| `INVALID_MAP` | Map doesn't exist |
| `SCHEMA_MISMATCH` | Version incompatible |

## Validation Rules

1. **patchVersion** must equal 1
2. **baseSchemaVersion** must match project's `version` field
3. **Operations are validated sequentially** - intra-patch references are allowed (create then use in same patch)
4. **All referenced IDs must exist** at the time they're used (either in project or created by prior ops)
5. **All created IDs must be unique** (not in project or in prior ops)
6. **Coordinates must be within map bounds**
7. **Tile IDs must be within tileset capacity** (0 to tileCount-1)
8. **No duplicate coordinates** in cells arrays

## Example Patches

See `packages/shared/tests/patch/fixtures/patches/` for validated example patches.
