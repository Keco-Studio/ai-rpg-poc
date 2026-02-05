# Data Model: AI Patch Engine v1

**Feature**: AI Patch Engine v1  
**Branch**: `002-ai-patch-engine`  
**Date**: 2026-02-05

## Overview

The patch engine data model defines the structure for representing, validating, and applying atomic project modifications. All entities are immutable value objects with explicit versioning and strict typing.

## Core Entities

### 1. PatchV1

A versioned document representing a collection of project modification operations.

**Fields**:
- `patchVersion: 1` - Patch format version (literal type for v1)
- `patchId: string` - Unique identifier for this patch (UUID recommended)
- `baseSchemaVersion: 1` - Target project schema version (must match `Project.version`)
- `meta?: PatchMetadata` - Optional metadata
- `ops: PatchOp[]` - Ordered sequence of operations (min: 0, no max limit)

**Invariants**:
- `patchVersion` must equal `1` for this implementation
- `baseSchemaVersion` must match target project's schema version
- `ops` array order matters; operations are applied sequentially
- `patchId` should be globally unique (not enforced, but recommended)

**Relationships**:
- Contains 0..N `PatchOp` operations
- Targets exactly one `Project` (via `baseSchemaVersion`)
- May reference multiple entities within the project (maps, layers, entities, etc.)

---

### 2. PatchMetadata

Optional contextual information about a patch.

**Fields**:
- `author?: string` - Creator of the patch (human name, AI model name, tool name)
- `createdAt?: string` - ISO 8601 timestamp (e.g., "2026-02-05T14:30:00Z")
- `note?: string` - Human-readable description or intent

**Invariants**:
- All fields are optional
- `createdAt` if provided must be valid ISO 8601 format
- `note` should be concise (recommended max 500 characters)

---

### 3. PatchOp (Discriminated Union)

A single atomic operation within a patch. Uses TypeScript discriminated union pattern with `op` field as discriminant.

**Operation Categories**:
1. **Map Operations**: `CreateMapOp`, `CreateLayerOp`
2. **Tile Operations**: `PaintRectOp`, `SetTilesOp`, `ClearTilesOp`
3. **Collision Operations**: `SetCollisionCellsOp`, `SetCollisionRectOp`
4. **Entity Operations**: `CreateEntityDefOp`, `PlaceEntityOp`, `MoveEntityOp`, `DeleteEntityOp`
5. **Trigger Operations**: `CreateTriggerOp`, `UpdateTriggerOp`
6. **Dialogue Operations**: `CreateDialogueOp`, `UpdateDialogueNodeOp`
7. **Quest Operations**: `CreateQuestOp`, `UpdateQuestOp`

**Common Properties**:
- All ops have `op: string` discriminant field
- All IDs referenced or created must be non-empty strings
- All coordinates and dimensions must be non-negative integers

---

### 4. PatchSummary

A human-readable report of changes made by applying a patch.

**Fields**:
- `created: ResourceSummary` - IDs of resources created
- `modified: ResourceSummary` - IDs of resources modified
- `deleted: ResourceSummary` - IDs of resources deleted
- `tileEdits?: TileEditSummary[]` - Tile changes per map/layer
- `collisionEdits?: CollisionEditSummary[]` - Collision changes per map

**ResourceSummary Structure**:
```typescript
{
  maps: string[];
  entities: string[];
  dialogues: string[];
  quests: string[];
  triggers: string[];
}
```

**TileEditSummary Structure**:
```typescript
{
  mapId: string;
  layerId: string;
  changedCells: number;  // Count of cells modified
}
```

**CollisionEditSummary Structure**:
```typescript
{
  mapId: string;
  changedCells: number;  // Count of collision cells modified
}
```

**Invariants**:
- All ID arrays are unique (no duplicates within a list)
- `changedCells` counts must be >= 0
- Summary is derived from before/after comparison, not from operation intent

---

### 5. PatchError

Structured error information for validation or application failures.

**Fields**:
- `code: PatchErrorCode` - Typed error code enum
- `message: string` - Human-readable error description
- `opIndex?: number` - Index of failing operation in `patch.ops` array
- `path?: string` - JSON path to problematic field (e.g., "ops[3].mapId")
- `detail?: any` - Additional context (e.g., available IDs, bounds info)

**PatchErrorCode Enum**:
- `UNKNOWN_OP` - Unrecognized operation type
- `MISSING_REF` - Referenced ID doesn't exist (entity, map, tileset, dialogue, quest)
- `DUPLICATE_ID` - Attempting to create resource with ID that already exists
- `OUT_OF_BOUNDS` - Coordinate or rect outside map boundaries
- `INVALID_TILE_ID` - Tile ID outside valid range (0..maxTileId)
- `INVALID_LAYER` - Layer doesn't exist or invalid layer reference
- `INVALID_MAP` - Map doesn't exist or invalid map reference
- `SCHEMA_MISMATCH` - Patch version or schema version incompatible

**Invariants**:
- `code` must be one of the defined enum values
- `message` must be non-empty
- `opIndex` if provided must be valid index into `patch.ops`

---

### 6. ValidationResult

The outcome of patch validation.

**Discriminated Union**:
```typescript
type ValidationResult =
  | { ok: true }
  | { ok: false; errors: PatchError[] }
```

**Invariants**:
- If `ok: false`, `errors` array must have at least one error
- If `ok: true`, no errors field present

---

### 7. ApplyResult

The outcome of successfully applying a patch.

**Fields**:
- `project: Project` - New project state after all ops applied
- `summary: PatchSummary` - Summary of changes made
- `inverse: PatchV1` - Patch that reverses all changes

**Invariants**:
- `project` is a new object (input project never mutated)
- `inverse` when applied to `project` produces a project deep-equal to the original input
- `summary` accurately reflects changes between input and output projects
- `inverse.patchId` is unique (not the same as original patch ID)
- `inverse.baseSchemaVersion` matches `project.version`

---

### 8. HistoryEntry

A single entry in the undo/redo history stack.

**Fields**:
- `patch: PatchV1` - The original patch that was applied
- `inverse: PatchV1` - The inverse patch for undo
- `summary: PatchSummary` - Summary of changes
- `timestamp?: number` - When patch was applied (milliseconds since epoch)

**Invariants**:
- `inverse` is valid and applicable to the project state after `patch`
- `patch` is valid and applicable to the project state after `inverse`

---

### 9. HistoryStack

Manages undo/redo history with two stacks.

**State**:
- `undoStack: HistoryEntry[]` - Stack of applied patches (newest at end)
- `redoStack: HistoryEntry[]` - Stack of undone patches (newest at end)
- `maxSize?: number` - Optional limit on history depth (default: unlimited)

**Methods**:
- `applyAndPush(project: Project, patch: PatchV1): ApplyResult` - Apply patch, push to undo stack, clear redo stack
- `undo(project: Project): ApplyResult | null` - Pop from undo stack, apply inverse, push to redo stack
- `redo(project: Project): ApplyResult | null` - Pop from redo stack, apply patch, push to undo stack
- `canUndo(): boolean` - Check if undo is available
- `canRedo(): boolean` - Check if redo is available
- `clear(): void` - Clear both stacks

**Invariants**:
- Applying a new patch clears the redo stack
- Undo/redo operations maintain stack consistency
- If `maxSize` is set, oldest entries are evicted when limit exceeded

---

## Operation Type Details

### Map Operations

#### CreateMapOp
```typescript
{
  op: "createMap";
  map: {
    id: string;           // Must be unique, non-empty
    name: string;         // Display name
    tilesetId: string;    // Must reference existing tileset
    width: number;        // Must be > 0
    height: number;       // Must be > 0
    layerIds?: string[];  // Optional; can be added later with CreateLayerOp
  };
}
```

**Validation Rules**:
- `map.id` must not exist in current project
- `map.tilesetId` must reference an existing tileset
- `map.width` and `map.height` must be > 0
- If `layerIds` provided, must be valid layer IDs (usually follow with CreateLayerOp)

**Inverse**: `DeleteMapOp` (not in v1; inverse stores full map for restore)

---

#### CreateLayerOp
```typescript
{
  op: "createLayer";
  mapId: string;       // Must reference existing map
  layer: {
    id: string;        // Must be unique within map, non-empty
    name: string;      // Display name
    z: number;         // Z-order (can be negative)
  };
  fillTileId?: number; // Optional: fill entire layer with this tile
}
```

**Validation Rules**:
- `mapId` must reference existing map (or created earlier in patch)
- `layer.id` must not already exist in the map's layers
- `fillTileId` if provided must be valid tile ID (0..maxTileId)

**Inverse**: Remove layer and restore previous layer data

---

### Tile Operations

#### PaintRectOp
```typescript
{
  op: "paintRect";
  mapId: string;
  layerId: string;
  x: number;          // Top-left x coordinate
  y: number;          // Top-left y coordinate
  w: number;          // Width in tiles (must be > 0)
  h: number;          // Height in tiles (must be > 0)
  tileId: number;     // Tile to paint (0 = clear)
}
```

**Validation Rules**:
- `mapId` and `layerId` must reference existing map and layer
- Rectangle `[x, y, x+w-1, y+h-1]` must be within map bounds `[0, 0, width-1, height-1]`
- `tileId` must be valid (0..maxTileId)

**Inverse**: `SetTilesOp` with all previous tile values in the rect

---

#### SetTilesOp
```typescript
{
  op: "setTiles";
  mapId: string;
  layerId: string;
  cells: Array<{ x: number; y: number; tileId: number }>;
}
```

**Validation Rules**:
- `mapId` and `layerId` must reference existing map and layer
- Each cell `{x, y}` must be within map bounds
- Each `tileId` must be valid (0..maxTileId)
- No duplicate `{x, y}` coordinates in `cells` array

**Inverse**: `SetTilesOp` with previous tile values for each cell

---

#### ClearTilesOp
```typescript
{
  op: "clearTiles";
  mapId: string;
  layerId: string;
  cells: Array<{ x: number; y: number }>;
}
```

**Validation Rules**:
- `mapId` and `layerId` must reference existing map and layer
- Each cell `{x, y}` must be within map bounds
- No duplicate `{x, y}` coordinates in `cells` array

**Inverse**: `SetTilesOp` with previous non-zero tile values

---

### Collision Operations

#### SetCollisionCellsOp
```typescript
{
  op: "setCollisionCells";
  mapId: string;
  cells: Array<{ x: number; y: number; solid: 0 | 1 }>;
}
```

**Validation Rules**:
- `mapId` must reference existing map
- Each cell `{x, y}` must be within map bounds
- `solid` must be exactly 0 or 1
- No duplicate `{x, y}` coordinates in `cells` array

**Inverse**: `SetCollisionCellsOp` with previous values

---

#### SetCollisionRectOp
```typescript
{
  op: "setCollisionRect";
  mapId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  solid: 0 | 1;
}
```

**Validation Rules**:
- `mapId` must reference existing map
- Rectangle must be within map bounds
- `solid` must be exactly 0 or 1

**Inverse**: `SetCollisionCellsOp` with all previous values in rect

---

### Entity Operations

#### CreateEntityDefOp
```typescript
{
  op: "createEntityDef";
  entity: {
    id: string;
    kind: "npc" | "door" | "chest";
    sprite: { tilesetId: string; tileId: number };
    collider?: { w: number; h: number };
    behavior?: { dialogueId?: string };
  };
}
```

**Validation Rules**:
- `entity.id` must be unique
- `sprite.tilesetId` must reference existing tileset
- `sprite.tileId` must be valid for that tileset
- `behavior.dialogueId` if provided must reference existing dialogue

**Inverse**: Delete entity def (check no instances exist first)

---

#### PlaceEntityOp
```typescript
{
  op: "placeEntity";
  mapId: string;
  instance: {
    id: string;
    entityId: string;
    x: number;
    y: number;
    props?: Record<string, any>;
  };
}
```

**Validation Rules**:
- `mapId` must reference existing map
- `instance.entityId` must reference existing entity definition
- `{x, y}` must be within map bounds
- `instance.id` must be unique across all instances on all maps

**Inverse**: `DeleteEntityOp`

---

#### MoveEntityOp
```typescript
{
  op: "moveEntity";
  mapId: string;
  instanceId: string;
  x: number;
  y: number;
}
```

**Validation Rules**:
- `mapId` must reference existing map
- `instanceId` must reference existing instance on that map
- `{x, y}` must be within map bounds

**Inverse**: `MoveEntityOp` with previous position

---

#### DeleteEntityOp
```typescript
{
  op: "deleteEntity";
  mapId: string;
  instanceId: string;
}
```

**Validation Rules**:
- `mapId` must reference existing map
- `instanceId` must reference existing instance on that map

**Inverse**: `PlaceEntityOp` with full previous instance data

---

### Trigger Operations

#### CreateTriggerOp
```typescript
{
  op: "createTrigger";
  mapId: string;
  trigger: {
    id: string;
    rect: { x: number; y: number; w: number; h: number };
    onEnter?: ScriptOp[];
    onInteract?: ScriptOp[];
  };
}
```

**Validation Rules**:
- `mapId` must reference existing map
- `trigger.id` must be unique on that map
- `rect` must be within map bounds
- `ScriptOp` arrays validated against allowed script operations (from Schema v1)

**Inverse**: Delete trigger with full restore data

---

#### UpdateTriggerOp
```typescript
{
  op: "updateTrigger";
  mapId: string;
  triggerId: string;
  patch: Partial<{
    rect: { x: number; y: number; w: number; h: number };
    onEnter: ScriptOp[];
    onInteract: ScriptOp[];
  }>;
}
```

**Validation Rules**:
- `mapId` and `triggerId` must reference existing trigger
- If `rect` provided, must be within map bounds
- If `onEnter` or `onInteract` provided, validate script operations

**Inverse**: `UpdateTriggerOp` with previous values for changed fields only

---

### Dialogue Operations

#### CreateDialogueOp
```typescript
{
  op: "createDialogue";
  dialogue: DialogueGraph;  // Full dialogue graph from Schema v1
}
```

**Validation Rules**:
- `dialogue.id` must be unique
- Dialogue graph structure validated against Schema v1

**Inverse**: Delete dialogue with full restore data

---

#### UpdateDialogueNodeOp
```typescript
{
  op: "updateDialogueNode";
  dialogueId: string;
  nodeId: string;
  patch: Partial<{
    text: string;
    speaker: string;
    choices: any[];
    effects: ScriptOp[];
  }>;
}
```

**Validation Rules**:
- `dialogueId` and `nodeId` must reference existing dialogue and node
- If `choices` or `effects` provided, validate structure

**Inverse**: `UpdateDialogueNodeOp` with previous values for changed fields

---

### Quest Operations

#### CreateQuestOp
```typescript
{
  op: "createQuest";
  quest: QuestDef;  // Full quest definition from Schema v1
}
```

**Validation Rules**:
- `quest.id` must be unique
- Quest structure validated against Schema v1

**Inverse**: Delete quest with full restore data

---

#### UpdateQuestOp
```typescript
{
  op: "updateQuest";
  questId: string;
  patch: Partial<QuestDef>;
}
```

**Validation Rules**:
- `questId` must reference existing quest
- Partial quest data validated against Schema v1

**Inverse**: `UpdateQuestOp` with previous values for changed fields

---

## State Transitions

### Patch Lifecycle
```
Created → Validated → Applied → [Recorded in History]
   ↓          ↓           ↓
Invalid   Rejected    Undoable
```

### History Stack State Machine
```
Initial: undoStack=[], redoStack=[]

Apply Patch:
  - Push to undoStack
  - Clear redoStack

Undo:
  - Pop from undoStack → apply inverse
  - Push to redoStack

Redo:
  - Pop from redoStack → apply original
  - Push to undoStack
```

---

## Indexing and Lookup Strategy

For efficient validation, build ID lookup maps:

```typescript
interface ValidationContext {
  // Existing resources in project
  tilesetIds: Set<string>;
  mapIds: Set<string>;
  entityIds: Set<string>;
  dialogueIds: Set<string>;
  questIds: Set<string>;
  
  // Per-map lookups
  mapLayers: Map<string, Set<string>>;      // mapId → layerIds
  mapInstances: Map<string, Set<string>>;   // mapId → instanceIds
  mapTriggers: Map<string, Set<string>>;    // mapId → triggerIds
  
  // Working state (updated during validation)
  createdInPatch: Set<string>;              // IDs created by prior ops in this patch
}
```

This allows O(1) lookups during validation instead of O(n) scans.

---

## Summary

The patch engine data model is centered on immutable, versioned operations with strict validation rules and automatic inverse generation. All entities are designed for correctness first, with performance optimizations (lookup maps, structural sharing) applied where necessary. The model supports the full lifecycle from patch creation through validation, application, and undo/redo.
