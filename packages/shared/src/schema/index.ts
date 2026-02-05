/**
 * Public API for Project Schema v1
 *
 * Exports schema definitions, TypeScript types, validation functions, and error types.
 *
 * @example
 * ```typescript
 * import { validateProject, type Project, type ValidationResult } from '@ai-rpg-maker/shared';
 *
 * const result = validateProject(projectData);
 * if (!result.valid) {
 *   result.errors.forEach(err => console.error(`[${err.code}] ${err.message}`));
 * }
 * ```
 */

// Schema definitions (Zod schemas)
export {
  PositionSchema,
  RectangleSchema,
  ProjectMetadataSchema,
  GameConfigSchema,
  TilesetSchema,
  TileLayerSchema,
  EntityTypeSchema,
  EntityDefSchema,
  EntityInteractionSchema,
  EntityInstanceSchema,
  TriggerEventSchema,
  TriggerRegionSchema,
  DialogueChoiceSchema,
  DialogueNodeSchema,
  DialogueGraphSchema,
  QuestSchema,
  QuestStageSchema,
  GameMapSchema,
  ProjectSchema,
} from './types.js';

// TypeScript types (inferred from Zod)
export type {
  Position,
  Rectangle,
  ProjectMetadata,
  GameConfig,
  Tileset,
  TileLayer,
  EntityType,
  EntityDef,
  EntityInteraction,
  EntityInstance,
  TriggerEvent,
  TriggerRegion,
  DialogueChoice,
  DialogueNode,
  DialogueGraph,
  Quest,
  QuestStage,
  GameMap,
  Project,
} from './types.js';

// Validation
export { validateProject } from './validate.js';

// Error types
export type { ValidationError, ValidationResult } from './errors.js';
export { ValidationErrorCode } from './errors.js';
