/**
 * Project Schema v1 - Zod schema definitions and TypeScript types
 *
 * This file defines the complete data model for RPG Maker projects.
 * All schemas use Zod for runtime validation and TypeScript type generation.
 *
 * Tile indexing: Flat array indexed by `y * width + x`
 * Tile index 0 = empty/transparent tile
 * Entity IDs: Namespaced strings (e.g., "npc:guard", "map:dungeon-level1")
 */

import { z } from 'zod';

// ============================================================================
// Primitive Types
// ============================================================================

/**
 * 2D coordinate used for tile positions, spawn points, and pixel coordinates.
 * For tile coordinates: both x and y must be non-negative integers.
 */
export const PositionSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0),
});

/**
 * Axis-aligned bounding box in tile coordinates.
 * Used for trigger regions and other rectangular areas.
 */
export const RectangleSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().positive(),
  height: z.number().positive(),
});

// ============================================================================
// Project Metadata & Config
// ============================================================================

/**
 * Basic project information displayed in editor/runtime.
 */
export const ProjectMetadataSchema = z.object({
  /** Project name (displayed in editor/runtime) */
  name: z.string().min(1).max(100),
  /** Optional author name */
  author: z.string().optional(),
  /** Optional project description */
  description: z.string().optional(),
  /** Creation date (ISO 8601 string) */
  createdAt: z.string(),
  /** Last modified date (ISO 8601 string) */
  updatedAt: z.string(),
});

/**
 * Global game configuration settings.
 * Controls starting map, player spawn, tile size, and viewport.
 */
export const GameConfigSchema = z.object({
  /** ID of the starting map */
  startingMap: z.string().min(1),
  /** Player spawn position on starting map (tile coordinates) */
  playerSpawn: PositionSchema,
  /** Tile size in pixels (must match tileset tile dimensions) */
  tileSize: z.number().int().positive(),
  /** Viewport size in tiles */
  viewportSize: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
});

// ============================================================================
// Tileset
// ============================================================================

/**
 * Definition of a sprite sheet used for tile graphics.
 * Contains image reference and tile dimension metadata.
 */
export const TilesetSchema = z.object({
  /** Unique tileset ID (e.g., "tileset:dungeon-tiles") */
  id: z.string().min(1),
  /** Display name */
  name: z.string().min(1),
  /** Path to tileset image (relative to project root or absolute URL) */
  imagePath: z.string().min(1),
  /** Width of each tile in pixels */
  tileWidth: z.number().int().positive(),
  /** Height of each tile in pixels */
  tileHeight: z.number().int().positive(),
  /** Total number of tiles in the tileset */
  tileCount: z.number().int().positive(),
  /** Number of tiles per row in the image */
  columns: z.number().int().positive(),
  /** Optional metadata */
  metadata: z
    .object({
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
});

// ============================================================================
// Tile Layer
// ============================================================================

/**
 * A single layer of tiles (e.g., ground, walls, decoration).
 * Data is a flat array where index = y * mapWidth + x.
 * Tile index 0 = empty/transparent.
 */
export const TileLayerSchema = z.object({
  /** Layer name (e.g., "ground", "walls", "decoration") */
  name: z.string().min(1),
  /** Tile data as flat array (length = map.width * map.height) */
  data: z.array(z.number().int().min(0)),
  /** Z-index for rendering order (lower = behind, higher = in front) */
  zIndex: z.number().int(),
  /** Layer opacity (0.0 to 1.0) */
  opacity: z.number().min(0).max(1),
  /** Whether layer is visible */
  visible: z.boolean(),
});

// ============================================================================
// Entity Definitions
// ============================================================================

/** Entity type enum */
export const EntityTypeSchema = z.enum(['npc', 'item', 'door', 'decoration']);

/** Dialogue interaction data */
export const DialogueInteractionSchema = z.object({
  dialogueId: z.string().min(1),
});

/** Item interaction data */
export const ItemInteractionSchema = z.object({
  itemId: z.string().min(1),
  action: z.enum(['give', 'take']),
});

/** Door interaction data */
export const DoorInteractionSchema = z.object({
  targetMap: z.string().min(1),
  targetPosition: PositionSchema,
});

/** Custom interaction data */
export const CustomInteractionSchema = z.object({
  operation: z.enum(['showMessage', 'log']),
  message: z.string().min(1),
});

/**
 * Entity interaction behavior definition.
 * Determines how an entity responds to player interaction.
 */
export const EntityInteractionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('dialogue'), data: DialogueInteractionSchema }),
  z.object({ type: z.literal('item'), data: ItemInteractionSchema }),
  z.object({ type: z.literal('door'), data: DoorInteractionSchema }),
  z.object({ type: z.literal('custom'), data: CustomInteractionSchema }),
]);

/**
 * Reusable template for game entities (NPCs, chests, doors, etc.).
 * Each EntityDef defines appearance and behavior for a class of entities.
 */
export const EntityDefSchema = z.object({
  /** Unique entity definition ID (e.g., "npc:guard", "item:chest") */
  id: z.string().min(1),
  /** Entity type (affects behavior) */
  type: EntityTypeSchema,
  /** Display name */
  name: z.string().min(1),
  /** Sprite information */
  sprite: z.object({
    tilesetId: z.string().min(1),
    tileIndex: z.number().int().min(0),
  }),
  /** Interaction behavior (optional for decoration type) */
  interaction: EntityInteractionSchema.optional(),
  /** Optional metadata */
  metadata: z
    .object({
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
});

/**
 * A specific placement of an EntityDef on a map.
 * Each instance can optionally override properties from its template.
 */
export const EntityInstanceSchema = z.object({
  /** Unique instance ID (e.g., "instance:guard-entrance") */
  instanceId: z.string().min(1),
  /** Reference to entity definition */
  entityDefId: z.string().min(1),
  /** Position on map (in tile coordinates) */
  position: PositionSchema,
  /** Optional instance-specific overrides */
  overrides: z
    .object({
      name: z.string().optional(),
      interaction: EntityInteractionSchema.optional(),
    })
    .optional(),
});

// ============================================================================
// Trigger System
// ============================================================================

/** Show message trigger event */
export const ShowMessageEventSchema = z.object({
  type: z.literal('showMessage'),
  data: z.object({ message: z.string().min(1) }),
});

/** Start dialogue trigger event */
export const StartDialogueEventSchema = z.object({
  type: z.literal('startDialogue'),
  data: z.object({ dialogueId: z.string().min(1) }),
});

/** Teleport trigger event */
export const TeleportEventSchema = z.object({
  type: z.literal('teleport'),
  data: z.object({
    targetMap: z.string().min(1),
    targetPosition: PositionSchema,
  }),
});

/** Log trigger event */
export const LogEventSchema = z.object({
  type: z.literal('log'),
  data: z.object({ message: z.string().min(1) }),
});

/**
 * Union of all trigger event types.
 * Events execute when a trigger region is activated.
 */
export const TriggerEventSchema = z.discriminatedUnion('type', [
  ShowMessageEventSchema,
  StartDialogueEventSchema,
  TeleportEventSchema,
  LogEventSchema,
]);

/**
 * An invisible area that fires events when player enters or interacts.
 * Trigger regions define rectangular zones with event handlers.
 */
export const TriggerRegionSchema = z.object({
  /** Unique trigger ID (e.g., "trigger:entrance-cutscene") */
  id: z.string().min(1),
  /** Trigger name for debugging */
  name: z.string().min(1),
  /** Rectangular bounds (in tile coordinates) */
  bounds: RectangleSchema,
  /** Event operations to execute */
  events: z.object({
    onEnter: z.array(TriggerEventSchema).optional(),
    onInteract: z.array(TriggerEventSchema).optional(),
  }),
  /** Trigger activation settings */
  activation: z.object({
    once: z.boolean().optional(),
    requiresKey: z.string().optional(),
  }),
});

// ============================================================================
// Dialogue System
// ============================================================================

/**
 * A player response option in dialogue.
 */
export const DialogueChoiceSchema = z.object({
  /** Choice text shown to player */
  text: z.string().min(1),
  /** Next node ID after this choice (null = end dialogue) */
  next: z.string().nullable(),
  /** Optional conditions for choice visibility (future) */
  conditions: z
    .object({
      requiresFlag: z.string().optional(),
      requiresItem: z.string().optional(),
    })
    .optional(),
});

/**
 * A single node in a dialogue graph.
 * Contains speaker text and either choices or a direct next pointer.
 */
export const DialogueNodeSchema = z.object({
  /** Unique node ID within dialogue */
  id: z.string().min(1),
  /** Speaker name (e.g., "Guard", "Merchant") */
  speaker: z.string().min(1),
  /** Dialogue text */
  text: z.string().min(1),
  /** Player response choices (if any) */
  choices: z.array(DialogueChoiceSchema).min(1).optional(),
  /** Next node ID (if no choices; null = end dialogue) */
  next: z.string().nullable().optional(),
});

/**
 * A tree/graph structure for NPC conversations.
 * Contains nodes with text, choices, and navigation pointers.
 */
export const DialogueGraphSchema = z.object({
  /** Unique dialogue ID (e.g., "dialogue:guard-greeting") */
  id: z.string().min(1),
  /** Dialogue name for debugging */
  name: z.string().min(1),
  /** Root node ID (starting point) */
  rootNodeId: z.string().min(1),
  /** All dialogue nodes indexed by ID */
  nodes: z.record(z.string(), DialogueNodeSchema),
});

// ============================================================================
// Quest System (Placeholder)
// ============================================================================

/**
 * Quest stage with objectives.
 */
export const QuestStageSchema = z.object({
  /** Stage ID */
  id: z.string().min(1),
  /** Stage description */
  description: z.string().min(1),
  /** Objectives */
  objectives: z.array(z.string()),
});

/**
 * Minimal quest structure for future expansion.
 * Can be empty {} in demo project.
 */
export const QuestSchema = z.object({
  /** Unique quest ID (e.g., "quest:main-01") */
  id: z.string().min(1),
  /** Quest name */
  name: z.string().min(1),
  /** Quest description */
  description: z.string().min(1),
  /** Quest stages (future) */
  stages: z.array(QuestStageSchema).optional(),
  /** Quest status */
  status: z.enum(['inactive', 'active', 'completed', 'failed']),
});

// ============================================================================
// Game Map
// ============================================================================

/**
 * Represents a game level or area.
 * Contains tile layers, collision data, entity placements, and trigger regions.
 */
export const GameMapSchema = z.object({
  /** Unique map ID (e.g., "map:dungeon-level1") */
  id: z.string().min(1),
  /** Display name */
  name: z.string().min(1),
  /** Map width in tiles */
  width: z.number().int().positive(),
  /** Map height in tiles */
  height: z.number().int().positive(),
  /** ID of tileset used by this map */
  tilesetId: z.string().min(1),
  /** Tile layers (background, middleground, foreground, etc.) */
  tileLayers: z.record(z.string(), TileLayerSchema),
  /** Collision layer (0 = walkable, 1 = blocked) */
  collisionLayer: z.array(z.number().int().min(0).max(1)),
  /** Entity instances placed on this map */
  entities: z.array(EntityInstanceSchema),
  /** Trigger regions on this map */
  triggers: z.array(TriggerRegionSchema),
  /** Optional map metadata */
  metadata: z
    .object({
      backgroundColor: z.string().optional(),
      music: z.string().optional(),
    })
    .optional(),
});

// ============================================================================
// Root Project Schema
// ============================================================================

/**
 * Root Project schema - the top-level container for an entire RPG project.
 * Combines all sub-schemas with version, metadata, config, and data collections.
 */
export const ProjectSchema = z.object({
  /** Schema version number (starts at 1) */
  version: z.number().int().positive(),
  /** Project metadata */
  metadata: ProjectMetadataSchema,
  /** Game configuration */
  config: GameConfigSchema,
  /** Tilesets indexed by ID */
  tilesets: z.record(z.string(), TilesetSchema),
  /** Maps indexed by ID */
  maps: z.record(z.string(), GameMapSchema),
  /** Entity templates indexed by ID */
  entityDefs: z.record(z.string(), EntityDefSchema),
  /** Dialogue graphs indexed by ID */
  dialogues: z.record(z.string(), DialogueGraphSchema),
  /** Quests indexed by ID (optional for v1, can be empty) */
  quests: z.record(z.string(), QuestSchema).optional(),
});

// ============================================================================
// TypeScript Types (inferred from Zod schemas)
// ============================================================================

export type Position = z.infer<typeof PositionSchema>;
export type Rectangle = z.infer<typeof RectangleSchema>;
export type ProjectMetadata = z.infer<typeof ProjectMetadataSchema>;
export type GameConfig = z.infer<typeof GameConfigSchema>;
export type Tileset = z.infer<typeof TilesetSchema>;
export type TileLayer = z.infer<typeof TileLayerSchema>;
export type EntityType = z.infer<typeof EntityTypeSchema>;
export type EntityDef = z.infer<typeof EntityDefSchema>;
export type EntityInteraction = z.infer<typeof EntityInteractionSchema>;
export type EntityInstance = z.infer<typeof EntityInstanceSchema>;
export type TriggerEvent = z.infer<typeof TriggerEventSchema>;
export type TriggerRegion = z.infer<typeof TriggerRegionSchema>;
export type DialogueChoice = z.infer<typeof DialogueChoiceSchema>;
export type DialogueNode = z.infer<typeof DialogueNodeSchema>;
export type DialogueGraph = z.infer<typeof DialogueGraphSchema>;
export type Quest = z.infer<typeof QuestSchema>;
export type QuestStage = z.infer<typeof QuestStageSchema>;
export type GameMap = z.infer<typeof GameMapSchema>;
export type Project = z.infer<typeof ProjectSchema>;
