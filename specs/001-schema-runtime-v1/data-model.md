# Data Model: Project Schema v1

**Feature**: 001-schema-runtime-v1  
**Date**: 2026-02-05  
**Schema Version**: 1

## Overview

This document defines the complete data model for Project Schema v1. All TypeScript interfaces shown here will be implemented in `packages/shared/src/schema/types.ts` using Zod for runtime validation and type generation.

---

## Core Principles

1. **Versioned Schema**: `Project.version` enables future migrations
2. **ID-Based References**: All cross-references use string IDs (namespaced format: `type:name`)
3. **Deterministic Structure**: No optional randomness; same JSON → same runtime state
4. **Validation-Ready**: All fields have clear types and constraints for Zod validation

---

## Entity Definitions

### 1. Project (Root Entity)

The top-level container for an entire RPG project.

```typescript
interface Project {
  /** Schema version number (starts at 1) */
  version: number;

  /** Project metadata */
  metadata: ProjectMetadata;

  /** Tilesets indexed by ID */
  tilesets: Record<string, Tileset>;

  /** Maps indexed by ID */
  maps: Record<string, GameMap>;

  /** Entity templates indexed by ID */
  entityDefs: Record<string, EntityDef>;

  /** Dialogue graphs indexed by ID */
  dialogues: Record<string, DialogueGraph>;

  /** Quests indexed by ID (optional for v1, can be empty) */
  quests?: Record<string, Quest>;

  /** Game configuration */
  config: GameConfig;
}
```

**Validation Rules**:
- `version` must be >= 1
- `metadata.name` must be non-empty string
- All ID collections must have unique keys within their namespace
- At least one tileset, one map, and one entityDef required for valid project

---

### 2. ProjectMetadata

Basic information about the project.

```typescript
interface ProjectMetadata {
  /** Project name (displayed in editor/runtime) */
  name: string;

  /** Optional author name */
  author?: string;

  /** Optional project description */
  description?: string;

  /** Creation date (ISO 8601 string) */
  createdAt: string;

  /** Last modified date (ISO 8601 string) */
  updatedAt: string;
}
```

**Validation Rules**:
- `name` min length: 1, max length: 100
- `createdAt` and `updatedAt` must be valid ISO 8601 date strings

---

### 3. GameConfig

Global game configuration settings.

```typescript
interface GameConfig {
  /** ID of the starting map */
  startingMap: string;

  /** Player spawn position on starting map */
  playerSpawn: Position;

  /** Tile size in pixels (must match tileset tile dimensions) */
  tileSize: number;

  /** Viewport size in tiles */
  viewportSize: {
    width: number;
    height: number;
  };
}
```

**Validation Rules**:
- `startingMap` must reference a valid map ID
- `playerSpawn` coordinates must be within starting map bounds
- `tileSize` must be > 0 (typically 16, 32, or 64)
- `viewportSize` dimensions must be > 0

---

### 4. Tileset

Definition of a sprite sheet used for tile graphics.

```typescript
interface Tileset {
  /** Unique tileset ID (e.g., "tileset:dungeon-tiles") */
  id: string;

  /** Display name */
  name: string;

  /** Path to tileset image (relative to project root or absolute URL) */
  imagePath: string;

  /** Width of each tile in pixels */
  tileWidth: number;

  /** Height of each tile in pixels */
  tileHeight: number;

  /** Total number of tiles in the tileset */
  tileCount: number;

  /** Number of tiles per row in the image */
  columns: number;

  /** Optional metadata */
  metadata?: {
    description?: string;
    tags?: string[];
  };
}
```

**Validation Rules**:
- `tileWidth` and `tileHeight` must be > 0
- `tileCount` must be > 0
- `columns` must be > 0
- Tileset image dimensions should satisfy: `tileCount <= columns * rows` where `rows = ceil(tileCount / columns)`

**Example**:
```json
{
  "id": "tileset:dungeon",
  "name": "Dungeon Tileset",
  "imagePath": "assets/tilesets/dungeon.png",
  "tileWidth": 16,
  "tileHeight": 16,
  "tileCount": 40,
  "columns": 8
}
```

---

### 5. GameMap

Represents a game level or area.

```typescript
interface GameMap {
  /** Unique map ID (e.g., "map:dungeon-level1") */
  id: string;

  /** Display name */
  name: string;

  /** Map width in tiles */
  width: number;

  /** Map height in tiles */
  height: number;

  /** ID of tileset used by this map */
  tilesetId: string;

  /** Tile layers (background, middleground, foreground, etc.) */
  tileLayers: Record<string, TileLayer>;

  /** Collision layer (0 = walkable, 1 = blocked) */
  collisionLayer: number[];

  /** Entity instances placed on this map */
  entities: EntityInstance[];

  /** Trigger regions on this map */
  triggers: TriggerRegion[];

  /** Optional map metadata */
  metadata?: {
    backgroundColor?: string;  // CSS color or hex
    music?: string;            // ID of background music (future)
  };
}
```

**Validation Rules**:
- `width` and `height` must be > 0
- `tilesetId` must reference a valid tileset
- Each `TileLayer.data` length must equal `width * height`
- `collisionLayer` length must equal `width * height`
- All entity `position` coordinates must be within map bounds
- All trigger `bounds` must be within map bounds

---

### 6. TileLayer

A single layer of tiles (e.g., ground, walls, decoration).

```typescript
interface TileLayer {
  /** Layer name (e.g., "ground", "walls", "decoration") */
  name: string;

  /** Tile data as flat array (length = map.width * map.height) */
  data: number[];

  /** Z-index for rendering order (lower = behind, higher = in front) */
  zIndex: number;

  /** Layer opacity (0.0 to 1.0) */
  opacity: number;

  /** Whether layer is visible */
  visible: boolean;
}
```

**Validation Rules**:
- `data` length must equal `map.width * map.height`
- Tile indices in `data` must be in range `[0, tileset.tileCount)` (0 = empty)
- `zIndex` can be any integer (negative values render behind, positive in front)
- `opacity` must be between 0.0 and 1.0
- `visible` is boolean

**Tile Indexing**:
Flat array indexed by: `index = y * width + x`

---

### 7. EntityDef (Entity Template)

Reusable template for game entities (NPCs, chests, doors, etc.).

```typescript
interface EntityDef {
  /** Unique entity definition ID (e.g., "npc:guard", "item:chest") */
  id: string;

  /** Entity type (affects behavior) */
  type: 'npc' | 'item' | 'door' | 'decoration';

  /** Display name */
  name: string;

  /** Sprite information */
  sprite: {
    tilesetId: string;  // Tileset containing sprite
    tileIndex: number;  // Tile index for sprite graphic
  };

  /** Interaction behavior (optional for decoration type) */
  interaction?: EntityInteraction;

  /** Optional metadata */
  metadata?: {
    description?: string;
    tags?: string[];
  };
}
```

**Validation Rules**:
- `type` must be one of: 'npc', 'item', 'door', 'decoration'
- `sprite.tilesetId` must reference a valid tileset
- `sprite.tileIndex` must be within tileset bounds
- `interaction` required for 'npc', 'item', 'door' types; optional for 'decoration'

---

### 8. EntityInteraction

Defines how an entity responds to player interaction.

```typescript
interface EntityInteraction {
  /** Interaction type */
  type: 'dialogue' | 'item' | 'door' | 'custom';

  /** Data specific to interaction type */
  data: DialogueInteraction | ItemInteraction | DoorInteraction | CustomInteraction;
}

interface DialogueInteraction {
  /** ID of dialogue graph to trigger */
  dialogueId: string;
}

interface ItemInteraction {
  /** ID of item to give/take */
  itemId: string;
  /** Action: "give" or "take" */
  action: 'give' | 'take';
}

interface DoorInteraction {
  /** ID of target map */
  targetMap: string;
  /** Spawn position on target map */
  targetPosition: Position;
}

interface CustomInteraction {
  /** Custom event operation (v1: simple message) */
  operation: 'showMessage' | 'log';
  /** Message text or log content */
  message: string;
}
```

**Validation Rules**:
- `dialogueId` must reference a valid dialogue
- `itemId` must reference a valid item entity (future)
- `targetMap` must reference a valid map
- `targetPosition` must be within target map bounds
- `message` must be non-empty string

---

### 9. EntityInstance

A specific placement of an EntityDef on a map.

```typescript
interface EntityInstance {
  /** Unique instance ID (e.g., "instance:guard-entrance") */
  instanceId: string;

  /** Reference to entity definition */
  entityDefId: string;

  /** Position on map (in tile coordinates) */
  position: Position;

  /** Optional instance-specific overrides */
  overrides?: {
    name?: string;           // Override display name
    interaction?: EntityInteraction;  // Override interaction
  };
}
```

**Validation Rules**:
- `instanceId` must be unique within the map
- `entityDefId` must reference a valid EntityDef
- `position` must be within map bounds

---

### 10. Position

2D coordinate (tile-based or pixel-based depending on context).

```typescript
interface Position {
  x: number;
  y: number;
}
```

**Validation Rules**:
- For tile coordinates: both `x` and `y` must be non-negative integers
- For pixel coordinates: both `x` and `y` must be non-negative numbers

---

### 11. TriggerRegion

An invisible area that fires events when player enters or interacts.

```typescript
interface TriggerRegion {
  /** Unique trigger ID (e.g., "trigger:entrance-cutscene") */
  id: string;

  /** Trigger name for debugging */
  name: string;

  /** Rectangular bounds (in tile coordinates) */
  bounds: Rectangle;

  /** Event operations to execute */
  events: {
    onEnter?: TriggerEvent[];   // When player enters region
    onInteract?: TriggerEvent[];  // When player presses interact key in region
  };

  /** Trigger activation settings */
  activation: {
    once?: boolean;       // Fire only once, then disable
    requiresKey?: string; // Optional key/flag required to activate (future)
  };
}
```

**Validation Rules**:
- `bounds` must be within map boundaries
- At least one of `onEnter` or `onInteract` must be defined
- `events` arrays must not be empty if defined

---

### 12. Rectangle

Axis-aligned bounding box.

```typescript
interface Rectangle {
  x: number;      // Top-left corner X (tile coordinate)
  y: number;      // Top-left corner Y (tile coordinate)
  width: number;  // Width in tiles
  height: number; // Height in tiles
}
```

**Validation Rules**:
- All values must be non-negative
- `width` and `height` must be > 0

---

### 13. TriggerEvent

A simple event operation (v1 limited set).

```typescript
interface TriggerEvent {
  /** Event operation type */
  type: 'showMessage' | 'startDialogue' | 'teleport' | 'log';

  /** Event-specific data */
  data: ShowMessageEvent | StartDialogueEvent | TeleportEvent | LogEvent;
}

interface ShowMessageEvent {
  message: string;
}

interface StartDialogueEvent {
  dialogueId: string;
}

interface TeleportEvent {
  targetMap: string;
  targetPosition: Position;
}

interface LogEvent {
  message: string;
}
```

**Validation Rules**:
- `dialogueId` must reference a valid dialogue
- `targetMap` must reference a valid map
- `targetPosition` must be within target map bounds
- `message` must be non-empty string

---

### 14. DialogueGraph

A tree/graph structure for NPC conversations.

```typescript
interface DialogueGraph {
  /** Unique dialogue ID (e.g., "dialogue:guard-greeting") */
  id: string;

  /** Dialogue name for debugging */
  name: string;

  /** Root node ID (starting point) */
  rootNodeId: string;

  /** All dialogue nodes indexed by ID */
  nodes: Record<string, DialogueNode>;
}
```

**Validation Rules**:
- `rootNodeId` must reference a valid node in `nodes`
- All node `next` references must point to valid nodes or be null (end)
- No circular references without player choices (prevents infinite loops)

---

### 15. DialogueNode

A single node in a dialogue graph.

```typescript
interface DialogueNode {
  /** Unique node ID within dialogue */
  id: string;

  /** Speaker name (e.g., "Guard", "Merchant") */
  speaker: string;

  /** Dialogue text */
  text: string;

  /** Player response choices (if any) */
  choices?: DialogueChoice[];

  /** Next node ID (if no choices; null = end dialogue) */
  next?: string | null;
}
```

**Validation Rules**:
- If `choices` defined, must have at least 1 choice
- If `choices` defined, `next` should be undefined (choices determine flow)
- If `choices` undefined, `next` determines flow (can be null for end)
- `text` must be non-empty string

---

### 16. DialogueChoice

A player response option in dialogue.

```typescript
interface DialogueChoice {
  /** Choice text shown to player */
  text: string;

  /** Next node ID after this choice (null = end dialogue) */
  next: string | null;

  /** Optional conditions for choice visibility (future) */
  conditions?: {
    requiresFlag?: string;
    requiresItem?: string;
  };
}
```

**Validation Rules**:
- `text` must be non-empty string
- `next` must reference a valid node or be null

---

### 17. Quest (Placeholder for v1)

Minimal quest structure for future expansion.

```typescript
interface Quest {
  /** Unique quest ID (e.g., "quest:main-01") */
  id: string;

  /** Quest name */
  name: string;

  /** Quest description */
  description: string;

  /** Quest stages (future) */
  stages?: QuestStage[];

  /** Quest status */
  status: 'inactive' | 'active' | 'completed' | 'failed';
}

interface QuestStage {
  /** Stage ID */
  id: string;

  /** Stage description */
  description: string;

  /** Objectives (future: track completion) */
  objectives: string[];
}
```

**Note**: Quest system is a placeholder for v1. Can be empty `{}` in demo project.

---

## Validation Error Types

All validation errors follow this structure for clear, actionable error messages.

```typescript
interface ValidationError {
  /** Error code for programmatic handling */
  code: string;

  /** Human-readable error message */
  message: string;

  /** JSON path to problematic field (e.g., "maps.dungeon.tileLayers.ground.data") */
  path: string;

  /** Suggested fix (if applicable) */
  suggestion?: string;
}

interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;

  /** Array of errors (empty if valid) */
  errors: ValidationError[];
}
```

**Example Error**:
```json
{
  "code": "TILE_INDEX_OUT_OF_BOUNDS",
  "message": "Tile index 45 exceeds tileset bounds (max: 39)",
  "path": "maps.dungeon.tileLayers.ground.data[156]",
  "suggestion": "Tile indices must be 0 (empty) or 1-39 for tileset 'dungeon'"
}
```

---

## Validation Rules Summary

| Rule Category | Validation Checks |
|---------------|-------------------|
| **Schema Version** | `version >= 1` |
| **ID References** | All ID references exist in their collections |
| **Tile Indices** | `0 <= tileIndex < tileset.tileCount` |
| **Array Lengths** | Tile layers and collision layer match `width * height` |
| **Map Bounds** | Entity positions and trigger bounds within map dimensions |
| **Required Fields** | Non-empty strings, positive numbers where specified |
| **Type Constraints** | Enums match allowed values (e.g., entity type) |

---

## Example: Minimal Valid Project

See `examples/demo-project/project.json` for complete example. Minimal structure:

```json
{
  "version": 1,
  "metadata": {
    "name": "Demo RPG",
    "createdAt": "2026-02-05T00:00:00Z",
    "updatedAt": "2026-02-05T00:00:00Z"
  },
  "config": {
    "startingMap": "map:start",
    "playerSpawn": { "x": 5, "y": 5 },
    "tileSize": 16,
    "viewportSize": { "width": 20, "height": 15 }
  },
  "tilesets": {
    "tileset:dungeon": { /* tileset definition */ }
  },
  "maps": {
    "map:start": { /* map definition */ }
  },
  "entityDefs": {
    "npc:guard": { /* entity definition */ }
  },
  "dialogues": {
    "dialogue:greeting": { /* dialogue definition */ }
  },
  "quests": {}
}
```

---

**Data Model Status**: ✅ Complete  
**Next Step**: Implement in `packages/shared/src/schema/types.ts` using Zod  
**Contract**: See `contracts/schema-v1.json` for JSON Schema representation
