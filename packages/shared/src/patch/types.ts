/**
 * Patch Engine v1 - Type Definitions
 *
 * Defines the complete type system for the patch engine:
 * - PatchV1 document format
 * - 17 operation types (discriminated union on `op` field)
 * - Summary types for change reporting
 * - Result types for apply outcomes
 *
 * All types align with the patch-v1.schema.json contract.
 */

import type { DialogueGraph, DialogueChoice, TriggerEvent, Project } from '../schema/types.js';

// ============================================================================
// Patch Document
// ============================================================================

/** Optional metadata about a patch. */
export interface PatchMetadata {
  /** Creator of the patch (human name, AI model name, tool name) */
  author?: string;
  /** ISO 8601 timestamp */
  createdAt?: string;
  /** Human-readable description or intent (max 500 chars recommended) */
  note?: string;
}

/**
 * A versioned patch document representing a collection of project modification operations.
 * Operations are applied sequentially in array order.
 */
export interface PatchV1 {
  /** Patch format version (must be 1 for this implementation) */
  patchVersion: 1;
  /** Unique identifier for this patch (UUID recommended) */
  patchId: string;
  /** Target project schema version (must match Project.version) */
  baseSchemaVersion: 1;
  /** Optional patch metadata */
  meta?: PatchMetadata;
  /** Ordered sequence of operations to apply */
  ops: PatchOp[];
}

// ============================================================================
// Map Operations
// ============================================================================

/** Creates a new game map with the specified dimensions and tileset. */
export interface CreateMapOp {
  op: 'createMap';
  map: {
    /** Unique map ID (must not already exist) */
    id: string;
    /** Display name for the map */
    name: string;
    /** Tileset ID to use (must reference existing tileset) */
    tilesetId: string;
    /** Map width in tiles (must be > 0) */
    width: number;
    /** Map height in tiles (must be > 0) */
    height: number;
    /** Optional layer IDs (layers created separately via CreateLayerOp) */
    layerIds?: string[];
  };
}

/** Creates a new tile layer on an existing map. */
export interface CreateLayerOp {
  op: 'createLayer';
  /** Target map ID (must exist or be created earlier in patch) */
  mapId: string;
  layer: {
    /** Unique layer ID within the map */
    id: string;
    /** Display name for the layer */
    name: string;
    /** Z-order for rendering (can be negative) */
    z: number;
  };
  /** Optional: fill entire layer with this tile ID (0 = empty) */
  fillTileId?: number;
}

// ============================================================================
// Tile Operations
// ============================================================================

/** Paints a rectangular region with a single tile ID. */
export interface PaintRectOp {
  op: 'paintRect';
  /** Target map ID */
  mapId: string;
  /** Target layer ID */
  layerId: string;
  /** Top-left x coordinate */
  x: number;
  /** Top-left y coordinate */
  y: number;
  /** Width in tiles (must be > 0) */
  w: number;
  /** Height in tiles (must be > 0) */
  h: number;
  /** Tile ID to paint (0 = clear) */
  tileId: number;
}

/** Sets individual tile values at specific coordinates. */
export interface SetTilesOp {
  op: 'setTiles';
  /** Target map ID */
  mapId: string;
  /** Target layer ID */
  layerId: string;
  /** Array of cell coordinates and tile IDs */
  cells: Array<{ x: number; y: number; tileId: number }>;
}

/** Clears tiles (sets to 0) at specific coordinates. */
export interface ClearTilesOp {
  op: 'clearTiles';
  /** Target map ID */
  mapId: string;
  /** Target layer ID */
  layerId: string;
  /** Array of cell coordinates to clear */
  cells: Array<{ x: number; y: number }>;
}

// ============================================================================
// Collision Operations
// ============================================================================

/** Sets individual collision cell values. */
export interface SetCollisionCellsOp {
  op: 'setCollisionCells';
  /** Target map ID */
  mapId: string;
  /** Array of cells with solid values (0 = walkable, 1 = blocked) */
  cells: Array<{ x: number; y: number; solid: 0 | 1 }>;
}

/** Sets collision for a rectangular region. */
export interface SetCollisionRectOp {
  op: 'setCollisionRect';
  /** Target map ID */
  mapId: string;
  /** Top-left x coordinate */
  x: number;
  /** Top-left y coordinate */
  y: number;
  /** Width in tiles (must be > 0) */
  w: number;
  /** Height in tiles (must be > 0) */
  h: number;
  /** Collision value (0 = walkable, 1 = blocked) */
  solid: 0 | 1;
}

// ============================================================================
// Entity Operations
// ============================================================================

/** Entity kind for patch operations (maps to project schema EntityType). */
export type EntityKind = 'npc' | 'door' | 'chest';

/** Creates a new entity definition (template). */
export interface CreateEntityDefOp {
  op: 'createEntityDef';
  entity: {
    /** Unique entity definition ID */
    id: string;
    /** Entity kind */
    kind: EntityKind;
    /** Sprite reference */
    sprite: { tilesetId: string; tileId: number };
    /** Optional collider dimensions */
    collider?: { w: number; h: number };
    /** Optional behavior configuration */
    behavior?: { dialogueId?: string };
    /** Optional display name (defaults to id if not provided) */
    name?: string;
  };
}

/** Places an entity instance on a map. */
export interface PlaceEntityOp {
  op: 'placeEntity';
  /** Target map ID */
  mapId: string;
  instance: {
    /** Unique instance ID (must be unique across all maps) */
    id: string;
    /** Reference to entity definition ID */
    entityId: string;
    /** X position on map (tile coordinates) */
    x: number;
    /** Y position on map (tile coordinates) */
    y: number;
    /** Optional instance properties */
    props?: Record<string, unknown>;
  };
}

/** Moves an entity instance to a new position. */
export interface MoveEntityOp {
  op: 'moveEntity';
  /** Target map ID */
  mapId: string;
  /** Instance ID to move */
  instanceId: string;
  /** New x position */
  x: number;
  /** New y position */
  y: number;
}

/** Deletes an entity instance from a map. */
export interface DeleteEntityOp {
  op: 'deleteEntity';
  /** Target map ID */
  mapId: string;
  /** Instance ID to delete */
  instanceId: string;
}

// ============================================================================
// Trigger Operations
// ============================================================================

/** Creates a new trigger region on a map. */
export interface CreateTriggerOp {
  op: 'createTrigger';
  /** Target map ID */
  mapId: string;
  trigger: {
    /** Unique trigger ID within the map */
    id: string;
    /** Trigger bounding rectangle */
    rect: { x: number; y: number; w: number; h: number };
    /** Events to fire when player enters the region */
    onEnter?: TriggerEvent[];
    /** Events to fire when player interacts in the region */
    onInteract?: TriggerEvent[];
  };
}

/** Updates properties of an existing trigger. */
export interface UpdateTriggerOp {
  op: 'updateTrigger';
  /** Target map ID */
  mapId: string;
  /** Trigger ID to update */
  triggerId: string;
  /** Partial update (only provided fields are changed) */
  patch: Partial<{
    rect: { x: number; y: number; w: number; h: number };
    onEnter: TriggerEvent[];
    onInteract: TriggerEvent[];
  }>;
}

// ============================================================================
// Dialogue Operations
// ============================================================================

/** Creates a new dialogue graph. */
export interface CreateDialogueOp {
  op: 'createDialogue';
  /** Full dialogue graph (must conform to Schema v1 DialogueGraph) */
  dialogue: DialogueGraph;
}

/** Updates a single node within a dialogue graph. */
export interface UpdateDialogueNodeOp {
  op: 'updateDialogueNode';
  /** Target dialogue ID */
  dialogueId: string;
  /** Target node ID within the dialogue */
  nodeId: string;
  /** Partial node update (only provided fields are changed) */
  patch: Partial<{
    text: string;
    speaker: string;
    choices: DialogueChoice[];
    next: string | null;
  }>;
}

// ============================================================================
// Quest Operations
// ============================================================================

/** Creates a new quest definition. */
export interface CreateQuestOp {
  op: 'createQuest';
  /** Full quest definition (must conform to Schema v1 Quest) */
  quest: {
    id: string;
    name: string;
    description: string;
    stages?: Array<{ id: string; description: string; objectives: string[] }>;
    status: 'inactive' | 'active' | 'completed' | 'failed';
  };
}

/** Updates properties of an existing quest. */
export interface UpdateQuestOp {
  op: 'updateQuest';
  /** Quest ID to update */
  questId: string;
  /** Partial quest update (only provided fields are changed) */
  patch: Partial<{
    name: string;
    description: string;
    stages: Array<{ id: string; description: string; objectives: string[] }>;
    status: 'inactive' | 'active' | 'completed' | 'failed';
  }>;
}

// ============================================================================
// PatchOp Discriminated Union
// ============================================================================

/**
 * A single atomic operation within a patch.
 * Uses TypeScript discriminated union pattern with `op` field as discriminant.
 * 17 operation types covering maps, tiles, collision, entities, triggers, dialogue, quests.
 */
export type PatchOp =
  // Map operations
  | CreateMapOp
  | CreateLayerOp
  // Tile operations
  | PaintRectOp
  | SetTilesOp
  | ClearTilesOp
  // Collision operations
  | SetCollisionCellsOp
  | SetCollisionRectOp
  // Entity operations
  | CreateEntityDefOp
  | PlaceEntityOp
  | MoveEntityOp
  | DeleteEntityOp
  // Trigger operations
  | CreateTriggerOp
  | UpdateTriggerOp
  // Dialogue operations
  | CreateDialogueOp
  | UpdateDialogueNodeOp
  // Quest operations
  | CreateQuestOp
  | UpdateQuestOp;

// ============================================================================
// Summary Types
// ============================================================================

/** Resource IDs grouped by type. */
export interface ResourceSummary {
  maps: string[];
  entities: string[];
  dialogues: string[];
  quests: string[];
  triggers: string[];
}

/** Summary of tile edits for a specific map and layer. */
export interface TileEditSummary {
  mapId: string;
  layerId: string;
  changedCells: number;
}

/** Summary of collision edits for a specific map. */
export interface CollisionEditSummary {
  mapId: string;
  changedCells: number;
}

/**
 * A human-readable report of changes made by applying a patch.
 * Derived from before/after project comparison, not from operation intent.
 */
export interface PatchSummary {
  /** IDs of resources created */
  created: ResourceSummary;
  /** IDs of resources modified */
  modified: ResourceSummary;
  /** IDs of resources deleted */
  deleted: ResourceSummary;
  /** Tile changes per map/layer */
  tileEdits?: TileEditSummary[];
  /** Collision changes per map */
  collisionEdits?: CollisionEditSummary[];
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * The outcome of successfully applying a patch.
 * Contains the new project state, a change summary, and an inverse patch for undo.
 */
export interface ApplyResult {
  /** New project state (input project is never mutated) */
  project: Project;
  /** Summary of changes made */
  summary: PatchSummary;
  /** Patch that reverses all changes (for undo) */
  inverse: PatchV1;
}
