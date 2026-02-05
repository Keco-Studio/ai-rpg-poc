/**
 * Patch Engine v1 - Public API
 *
 * Provides validated, atomic project modifications with undo support.
 *
 * @example
 * ```typescript
 * import { validatePatch, applyPatch, type PatchV1 } from '@ai-rpg-maker/shared';
 *
 * const result = validatePatch(project, patch);
 * if (result.ok) {
 *   const { project: newProject, summary, inverse } = applyPatch(project, patch);
 * }
 * ```
 */

// Types
export type {
  PatchV1,
  PatchMetadata,
  PatchOp,
  CreateMapOp,
  CreateLayerOp,
  PaintRectOp,
  SetTilesOp,
  ClearTilesOp,
  SetCollisionCellsOp,
  SetCollisionRectOp,
  CreateEntityDefOp,
  PlaceEntityOp,
  MoveEntityOp,
  DeleteEntityOp,
  CreateTriggerOp,
  UpdateTriggerOp,
  CreateDialogueOp,
  UpdateDialogueNodeOp,
  CreateQuestOp,
  UpdateQuestOp,
  EntityKind,
  PatchSummary,
  ResourceSummary,
  TileEditSummary,
  CollisionEditSummary,
  ApplyResult,
} from './types.js';

// Error types
export {
  PatchErrorCode,
  errOutOfBounds,
  errMissingRef,
  errDuplicateId,
  errInvalidTileId,
  errInvalidLayer,
  errInvalidMap,
  errSchemaMismatch,
  errUnknownOp,
} from './errors.js';

export type {
  PatchError,
  PatchValidationResult,
} from './errors.js';

// Validation
export {
  validatePatch,
  validatePatchStructure,
} from './validate.js';

// Application
export { applyPatch } from './apply.js';

// Summary
export { summarizePatch } from './summary.js';
