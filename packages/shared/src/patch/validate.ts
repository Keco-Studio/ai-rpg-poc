/**
 * Patch Engine v1 - Validation
 *
 * Two-phase validation strategy:
 * - Phase A (Structural): Validate patch shape, types, and primitive constraints
 * - Phase B (Semantic): Validate bounds, references, and invariants using a
 *   "working view" that accounts for prior ops in the patch
 *
 * All validation is pure (no side effects). If any op fails, the entire patch
 * is rejected with errors pointing to specific operation indices.
 */

import type { Project } from '../schema/types.js';
import type { PatchV1, PatchOp } from './types.js';
import type { PatchError, PatchValidationResult } from './errors.js';
import {
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

// ============================================================================
// Valid operation type names
// ============================================================================

const VALID_OP_TYPES = new Set([
  'createMap', 'createLayer',
  'paintRect', 'setTiles', 'clearTiles',
  'setCollisionCells', 'setCollisionRect',
  'createEntityDef', 'placeEntity', 'moveEntity', 'deleteEntity',
  'createTrigger', 'updateTrigger',
  'createDialogue', 'updateDialogueNode',
  'createQuest', 'updateQuest',
]);

// ============================================================================
// Validation Context
// ============================================================================

/**
 * Tracks project state during semantic validation.
 * Updated incrementally as operations are validated to support intra-patch references.
 */
export interface ValidationContext {
  // Existing + patch-created resource IDs
  tilesetIds: Set<string>;
  mapIds: Set<string>;
  entityDefIds: Set<string>;
  dialogueIds: Set<string>;
  questIds: Set<string>;
  instanceIds: Set<string>;

  // Per-map lookups
  mapLayers: Map<string, Set<string>>;
  mapInstances: Map<string, Set<string>>;
  mapTriggers: Map<string, Set<string>>;
  mapDimensions: Map<string, { width: number; height: number }>;
  mapTilesets: Map<string, string>;

  // Tileset info
  tilesetTileCount: Map<string, number>;

  // Dialogue node IDs for update validation
  dialogueNodes: Map<string, Set<string>>;

  // Track IDs created within this patch (for duplicate detection)
  createdInPatch: Set<string>;
}

/**
 * Builds a ValidationContext from the current project state.
 * This provides O(1) lookups during validation.
 */
export function buildValidationContext(project: Project): ValidationContext {
  const ctx: ValidationContext = {
    tilesetIds: new Set(Object.keys(project.tilesets)),
    mapIds: new Set(Object.keys(project.maps)),
    entityDefIds: new Set(Object.keys(project.entityDefs)),
    dialogueIds: new Set(Object.keys(project.dialogues)),
    questIds: new Set(Object.keys(project.quests ?? {})),
    instanceIds: new Set(),
    mapLayers: new Map(),
    mapInstances: new Map(),
    mapTriggers: new Map(),
    mapDimensions: new Map(),
    mapTilesets: new Map(),
    tilesetTileCount: new Map(),
    dialogueNodes: new Map(),
    createdInPatch: new Set(),
  };

  for (const [tilesetId, tileset] of Object.entries(project.tilesets)) {
    ctx.tilesetTileCount.set(tilesetId, tileset.tileCount);
  }

  for (const [mapId, map] of Object.entries(project.maps)) {
    ctx.mapDimensions.set(mapId, { width: map.width, height: map.height });
    ctx.mapTilesets.set(mapId, map.tilesetId);
    ctx.mapLayers.set(mapId, new Set(Object.keys(map.tileLayers)));

    const instances = new Set<string>();
    for (const entity of map.entities) {
      instances.add(entity.instanceId);
      ctx.instanceIds.add(entity.instanceId);
    }
    ctx.mapInstances.set(mapId, instances);

    const triggers = new Set<string>();
    for (const trigger of map.triggers) {
      triggers.add(trigger.id);
    }
    ctx.mapTriggers.set(mapId, triggers);
  }

  for (const [dialogueId, dialogue] of Object.entries(project.dialogues)) {
    ctx.dialogueNodes.set(dialogueId, new Set(Object.keys(dialogue.nodes)));
  }

  return ctx;
}

// ============================================================================
// Phase A: Structural Validation
// ============================================================================

/**
 * Validates the structural shape of a patch document.
 * Checks version fields, required properties, and operation type discriminants.
 */
export function validatePatchStructure(patch: unknown): PatchValidationResult {
  const errors: PatchError[] = [];

  if (typeof patch !== 'object' || patch === null) {
    errors.push(errSchemaMismatch('Patch must be a non-null object'));
    return { ok: false, errors };
  }

  const p = patch as Record<string, unknown>;

  if (p.patchVersion !== 1) {
    errors.push(errSchemaMismatch(
      `Expected patchVersion 1, got ${JSON.stringify(p.patchVersion)}`,
      { expected: 1, actual: p.patchVersion },
    ));
  }

  if (typeof p.patchId !== 'string' || p.patchId.length === 0) {
    errors.push(errSchemaMismatch('patchId must be a non-empty string'));
  }

  if (p.baseSchemaVersion !== 1) {
    errors.push(errSchemaMismatch(
      `Expected baseSchemaVersion 1, got ${JSON.stringify(p.baseSchemaVersion)}`,
      { expected: 1, actual: p.baseSchemaVersion },
    ));
  }

  if (!Array.isArray(p.ops)) {
    errors.push(errSchemaMismatch('ops must be an array'));
    return { ok: false, errors };
  }

  // Validate each op has a valid type discriminant
  for (let i = 0; i < (p.ops as unknown[]).length; i++) {
    const op = (p.ops as unknown[])[i];
    if (typeof op !== 'object' || op === null) {
      errors.push({
        code: PatchErrorCode.UNKNOWN_OP,
        message: `Operation at index ${i} must be a non-null object`,
        opIndex: i,
        path: `ops[${i}]`,
      });
      continue;
    }
    const opType = (op as Record<string, unknown>).op;
    if (typeof opType !== 'string' || !VALID_OP_TYPES.has(opType)) {
      errors.push(errUnknownOp(i, String(opType)));
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true };
}

// ============================================================================
// Phase B: Semantic Validation (per-operation)
// ============================================================================

function validateCreateMap(
  op: Extract<PatchOp, { op: 'createMap' }>,
  idx: number,
  ctx: ValidationContext,
  errors: PatchError[],
): void {
  const { map } = op;
  const prefix = `ops[${idx}]`;

  // Map ID must be unique
  if (ctx.mapIds.has(map.id)) {
    errors.push(errDuplicateId(idx, `${prefix}.map.id`,
      `Map ID '${map.id}' already exists`, { duplicateId: map.id }));
  }

  // Tileset must exist
  if (!ctx.tilesetIds.has(map.tilesetId)) {
    errors.push(errMissingRef(idx, `${prefix}.map.tilesetId`,
      `Tileset '${map.tilesetId}' not found`,
      { requestedId: map.tilesetId, availableIds: [...ctx.tilesetIds] }));
  }

  // Dimensions must be positive
  if (!Number.isInteger(map.width) || map.width <= 0) {
    errors.push(errOutOfBounds(idx, `${prefix}.map.width`,
      `Map width must be a positive integer, got ${map.width}`));
  }
  if (!Number.isInteger(map.height) || map.height <= 0) {
    errors.push(errOutOfBounds(idx, `${prefix}.map.height`,
      `Map height must be a positive integer, got ${map.height}`));
  }

  // Register map in context
  ctx.mapIds.add(map.id);
  ctx.createdInPatch.add(map.id);
  ctx.mapDimensions.set(map.id, { width: map.width, height: map.height });
  ctx.mapTilesets.set(map.id, map.tilesetId);
  ctx.mapLayers.set(map.id, new Set());
  ctx.mapInstances.set(map.id, new Set());
  ctx.mapTriggers.set(map.id, new Set());
}

function validateCreateLayer(
  op: Extract<PatchOp, { op: 'createLayer' }>,
  idx: number,
  ctx: ValidationContext,
  errors: PatchError[],
): void {
  const prefix = `ops[${idx}]`;

  // Map must exist
  if (!ctx.mapIds.has(op.mapId)) {
    errors.push(errInvalidMap(idx, `${prefix}.mapId`,
      `Map '${op.mapId}' not found`));
    return;
  }

  // Layer ID must be unique within map
  const layers = ctx.mapLayers.get(op.mapId)!;
  if (layers.has(op.layer.id)) {
    errors.push(errDuplicateId(idx, `${prefix}.layer.id`,
      `Layer '${op.layer.id}' already exists in map '${op.mapId}'`));
  }

  // fillTileId must be valid if provided
  if (op.fillTileId !== undefined) {
    const tilesetId = ctx.mapTilesets.get(op.mapId);
    if (tilesetId) {
      const maxTileId = (ctx.tilesetTileCount.get(tilesetId) ?? 0) - 1;
      if (op.fillTileId < 0 || op.fillTileId > maxTileId) {
        errors.push(errInvalidTileId(idx, `${prefix}.fillTileId`,
          `Tile ID ${op.fillTileId} out of range (0..${maxTileId})`,
          { tileId: op.fillTileId, maxTileId }));
      }
    }
  }

  // Register layer
  layers.add(op.layer.id);
}

function validateTileOp(
  op: Extract<PatchOp, { op: 'paintRect' | 'setTiles' | 'clearTiles' }>,
  idx: number,
  ctx: ValidationContext,
  errors: PatchError[],
): void {
  const prefix = `ops[${idx}]`;

  // Map must exist
  if (!ctx.mapIds.has(op.mapId)) {
    errors.push(errInvalidMap(idx, `${prefix}.mapId`,
      `Map '${op.mapId}' not found`));
    return;
  }

  // Layer must exist
  const layers = ctx.mapLayers.get(op.mapId);
  if (!layers || !layers.has(op.layerId)) {
    errors.push(errInvalidLayer(idx, `${prefix}.layerId`,
      `Layer '${op.layerId}' not found in map '${op.mapId}'`,
      { availableLayers: layers ? [...layers] : [] }));
    return;
  }

  const dims = ctx.mapDimensions.get(op.mapId)!;
  const tilesetId = ctx.mapTilesets.get(op.mapId);
  const maxTileId = tilesetId ? (ctx.tilesetTileCount.get(tilesetId) ?? 0) - 1 : 0;

  if (op.op === 'paintRect') {
    // Rect bounds check
    if (op.w <= 0 || op.h <= 0) {
      errors.push(errOutOfBounds(idx, `${prefix}`,
        `Paint rect dimensions must be positive (w=${op.w}, h=${op.h})`));
    }
    if (op.x < 0 || op.y < 0 || op.x + op.w > dims.width || op.y + op.h > dims.height) {
      errors.push(errOutOfBounds(idx, `${prefix}`,
        `Paint rect (${op.x},${op.y} ${op.w}x${op.h}) exceeds map bounds (${dims.width}x${dims.height})`,
        { rect: { x: op.x, y: op.y, w: op.w, h: op.h }, mapSize: dims }));
    }
    // Tile ID check
    if (op.tileId < 0 || op.tileId > maxTileId) {
      errors.push(errInvalidTileId(idx, `${prefix}.tileId`,
        `Tile ID ${op.tileId} out of range (0..${maxTileId})`,
        { tileId: op.tileId, maxTileId }));
    }
  } else if (op.op === 'setTiles') {
    const seen = new Set<string>();
    for (let c = 0; c < op.cells.length; c++) {
      const cell = op.cells[c];
      const key = `${cell.x},${cell.y}`;
      if (seen.has(key)) {
        errors.push(errOutOfBounds(idx, `${prefix}.cells[${c}]`,
          `Duplicate coordinate (${cell.x},${cell.y}) in cells array`));
      }
      seen.add(key);
      if (cell.x < 0 || cell.y < 0 || cell.x >= dims.width || cell.y >= dims.height) {
        errors.push(errOutOfBounds(idx, `${prefix}.cells[${c}]`,
          `Cell (${cell.x},${cell.y}) outside map bounds (${dims.width}x${dims.height})`,
          { cell: { x: cell.x, y: cell.y }, mapSize: dims }));
      }
      if (cell.tileId < 0 || cell.tileId > maxTileId) {
        errors.push(errInvalidTileId(idx, `${prefix}.cells[${c}].tileId`,
          `Tile ID ${cell.tileId} out of range (0..${maxTileId})`,
          { tileId: cell.tileId, maxTileId }));
      }
    }
  } else {
    // clearTiles
    const seen = new Set<string>();
    for (let c = 0; c < op.cells.length; c++) {
      const cell = op.cells[c];
      const key = `${cell.x},${cell.y}`;
      if (seen.has(key)) {
        errors.push(errOutOfBounds(idx, `${prefix}.cells[${c}]`,
          `Duplicate coordinate (${cell.x},${cell.y}) in cells array`));
      }
      seen.add(key);
      if (cell.x < 0 || cell.y < 0 || cell.x >= dims.width || cell.y >= dims.height) {
        errors.push(errOutOfBounds(idx, `${prefix}.cells[${c}]`,
          `Cell (${cell.x},${cell.y}) outside map bounds (${dims.width}x${dims.height})`,
          { cell: { x: cell.x, y: cell.y }, mapSize: dims }));
      }
    }
  }
}

function validateCollisionOp(
  op: Extract<PatchOp, { op: 'setCollisionCells' | 'setCollisionRect' }>,
  idx: number,
  ctx: ValidationContext,
  errors: PatchError[],
): void {
  const prefix = `ops[${idx}]`;

  if (!ctx.mapIds.has(op.mapId)) {
    errors.push(errInvalidMap(idx, `${prefix}.mapId`,
      `Map '${op.mapId}' not found`));
    return;
  }

  const dims = ctx.mapDimensions.get(op.mapId)!;

  if (op.op === 'setCollisionCells') {
    const seen = new Set<string>();
    for (let c = 0; c < op.cells.length; c++) {
      const cell = op.cells[c];
      const key = `${cell.x},${cell.y}`;
      if (seen.has(key)) {
        errors.push(errOutOfBounds(idx, `${prefix}.cells[${c}]`,
          `Duplicate coordinate (${cell.x},${cell.y}) in cells array`));
      }
      seen.add(key);
      if (cell.x < 0 || cell.y < 0 || cell.x >= dims.width || cell.y >= dims.height) {
        errors.push(errOutOfBounds(idx, `${prefix}.cells[${c}]`,
          `Cell (${cell.x},${cell.y}) outside map bounds (${dims.width}x${dims.height})`,
          { cell: { x: cell.x, y: cell.y }, mapSize: dims }));
      }
      if (cell.solid !== 0 && cell.solid !== 1) {
        errors.push(errOutOfBounds(idx, `${prefix}.cells[${c}].solid`,
          `Solid value must be 0 or 1, got ${cell.solid}`));
      }
    }
  } else {
    // setCollisionRect
    if (op.w <= 0 || op.h <= 0) {
      errors.push(errOutOfBounds(idx, `${prefix}`,
        `Collision rect dimensions must be positive (w=${op.w}, h=${op.h})`));
    }
    if (op.x < 0 || op.y < 0 || op.x + op.w > dims.width || op.y + op.h > dims.height) {
      errors.push(errOutOfBounds(idx, `${prefix}`,
        `Collision rect (${op.x},${op.y} ${op.w}x${op.h}) exceeds map bounds (${dims.width}x${dims.height})`,
        { rect: { x: op.x, y: op.y, w: op.w, h: op.h }, mapSize: dims }));
    }
    if (op.solid !== 0 && op.solid !== 1) {
      errors.push(errOutOfBounds(idx, `${prefix}.solid`,
        `Solid value must be 0 or 1, got ${op.solid}`));
    }
  }
}

function validateEntityOps(
  op: Extract<PatchOp, { op: 'createEntityDef' | 'placeEntity' | 'moveEntity' | 'deleteEntity' }>,
  idx: number,
  ctx: ValidationContext,
  errors: PatchError[],
): void {
  const prefix = `ops[${idx}]`;

  switch (op.op) {
    case 'createEntityDef': {
      const { entity } = op;
      // ID must be unique
      if (ctx.entityDefIds.has(entity.id)) {
        errors.push(errDuplicateId(idx, `${prefix}.entity.id`,
          `Entity definition ID '${entity.id}' already exists`,
          { duplicateId: entity.id }));
      }
      // Sprite tileset must exist
      if (!ctx.tilesetIds.has(entity.sprite.tilesetId)) {
        errors.push(errMissingRef(idx, `${prefix}.entity.sprite.tilesetId`,
          `Tileset '${entity.sprite.tilesetId}' not found`,
          { requestedId: entity.sprite.tilesetId, availableIds: [...ctx.tilesetIds] }));
      } else {
        // Tile ID must be valid for tileset
        const maxTileId = (ctx.tilesetTileCount.get(entity.sprite.tilesetId) ?? 0) - 1;
        if (entity.sprite.tileId < 0 || entity.sprite.tileId > maxTileId) {
          errors.push(errInvalidTileId(idx, `${prefix}.entity.sprite.tileId`,
            `Tile ID ${entity.sprite.tileId} out of range (0..${maxTileId})`,
            { tileId: entity.sprite.tileId, maxTileId, tilesetId: entity.sprite.tilesetId }));
        }
      }
      // Dialogue reference must exist if provided
      if (entity.behavior?.dialogueId && !ctx.dialogueIds.has(entity.behavior.dialogueId)) {
        errors.push(errMissingRef(idx, `${prefix}.entity.behavior.dialogueId`,
          `Dialogue '${entity.behavior.dialogueId}' not found`,
          { requestedId: entity.behavior.dialogueId, availableIds: [...ctx.dialogueIds] }));
      }
      // Register entity def
      ctx.entityDefIds.add(entity.id);
      ctx.createdInPatch.add(entity.id);
      break;
    }
    case 'placeEntity': {
      // Map must exist
      if (!ctx.mapIds.has(op.mapId)) {
        errors.push(errInvalidMap(idx, `${prefix}.mapId`,
          `Map '${op.mapId}' not found`));
        return;
      }
      // Entity def must exist
      if (!ctx.entityDefIds.has(op.instance.entityId)) {
        errors.push(errMissingRef(idx, `${prefix}.instance.entityId`,
          `Entity definition '${op.instance.entityId}' not found`,
          { requestedId: op.instance.entityId, availableIds: [...ctx.entityDefIds] }));
      }
      // Instance ID must be unique
      if (ctx.instanceIds.has(op.instance.id)) {
        errors.push(errDuplicateId(idx, `${prefix}.instance.id`,
          `Entity instance ID '${op.instance.id}' already exists`,
          { duplicateId: op.instance.id }));
      }
      // Position must be within map bounds
      const dims = ctx.mapDimensions.get(op.mapId)!;
      if (op.instance.x < 0 || op.instance.y < 0 ||
          op.instance.x >= dims.width || op.instance.y >= dims.height) {
        errors.push(errOutOfBounds(idx, `${prefix}.instance`,
          `Entity position (${op.instance.x},${op.instance.y}) outside map bounds (${dims.width}x${dims.height})`,
          { position: { x: op.instance.x, y: op.instance.y }, mapSize: dims }));
      }
      // Register instance
      ctx.instanceIds.add(op.instance.id);
      ctx.createdInPatch.add(op.instance.id);
      const mapInstances = ctx.mapInstances.get(op.mapId);
      if (mapInstances) mapInstances.add(op.instance.id);
      break;
    }
    case 'moveEntity': {
      // Map must exist
      if (!ctx.mapIds.has(op.mapId)) {
        errors.push(errInvalidMap(idx, `${prefix}.mapId`,
          `Map '${op.mapId}' not found`));
        return;
      }
      // Instance must exist on map
      const mapInst = ctx.mapInstances.get(op.mapId);
      if (!mapInst || !mapInst.has(op.instanceId)) {
        errors.push(errMissingRef(idx, `${prefix}.instanceId`,
          `Entity instance '${op.instanceId}' not found on map '${op.mapId}'`,
          { requestedId: op.instanceId, availableIds: mapInst ? [...mapInst] : [] }));
      }
      // Position must be within map bounds
      const dims = ctx.mapDimensions.get(op.mapId)!;
      if (op.x < 0 || op.y < 0 || op.x >= dims.width || op.y >= dims.height) {
        errors.push(errOutOfBounds(idx, `${prefix}`,
          `Move position (${op.x},${op.y}) outside map bounds (${dims.width}x${dims.height})`,
          { position: { x: op.x, y: op.y }, mapSize: dims }));
      }
      break;
    }
    case 'deleteEntity': {
      // Map must exist
      if (!ctx.mapIds.has(op.mapId)) {
        errors.push(errInvalidMap(idx, `${prefix}.mapId`,
          `Map '${op.mapId}' not found`));
        return;
      }
      // Instance must exist on map
      const mapDel = ctx.mapInstances.get(op.mapId);
      if (!mapDel || !mapDel.has(op.instanceId)) {
        errors.push(errMissingRef(idx, `${prefix}.instanceId`,
          `Entity instance '${op.instanceId}' not found on map '${op.mapId}'`,
          { requestedId: op.instanceId, availableIds: mapDel ? [...mapDel] : [] }));
      }
      // Remove from context
      if (mapDel) mapDel.delete(op.instanceId);
      ctx.instanceIds.delete(op.instanceId);
      break;
    }
  }
}

function validateTriggerOps(
  op: Extract<PatchOp, { op: 'createTrigger' | 'updateTrigger' }>,
  idx: number,
  ctx: ValidationContext,
  errors: PatchError[],
): void {
  const prefix = `ops[${idx}]`;

  if (!ctx.mapIds.has(op.mapId)) {
    errors.push(errInvalidMap(idx, `${prefix}.mapId`,
      `Map '${op.mapId}' not found`));
    return;
  }

  const dims = ctx.mapDimensions.get(op.mapId)!;

  if (op.op === 'createTrigger') {
    // Trigger ID must be unique on this map
    const triggers = ctx.mapTriggers.get(op.mapId)!;
    if (triggers.has(op.trigger.id)) {
      errors.push(errDuplicateId(idx, `${prefix}.trigger.id`,
        `Trigger '${op.trigger.id}' already exists on map '${op.mapId}'`));
    }
    // Rect must be within map bounds
    const r = op.trigger.rect;
    if (r.w <= 0 || r.h <= 0) {
      errors.push(errOutOfBounds(idx, `${prefix}.trigger.rect`,
        `Trigger rect dimensions must be positive (w=${r.w}, h=${r.h})`));
    }
    if (r.x < 0 || r.y < 0 || r.x + r.w > dims.width || r.y + r.h > dims.height) {
      errors.push(errOutOfBounds(idx, `${prefix}.trigger.rect`,
        `Trigger rect (${r.x},${r.y} ${r.w}x${r.h}) exceeds map bounds (${dims.width}x${dims.height})`,
        { rect: r, mapSize: dims }));
    }
    // Register trigger
    triggers.add(op.trigger.id);
    ctx.createdInPatch.add(op.trigger.id);
  } else {
    // updateTrigger
    const triggers = ctx.mapTriggers.get(op.mapId)!;
    if (!triggers.has(op.triggerId)) {
      errors.push(errMissingRef(idx, `${prefix}.triggerId`,
        `Trigger '${op.triggerId}' not found on map '${op.mapId}'`,
        { requestedId: op.triggerId, availableIds: [...triggers] }));
    }
    // If rect provided, check bounds
    if (op.patch.rect) {
      const r = op.patch.rect;
      if (r.w <= 0 || r.h <= 0) {
        errors.push(errOutOfBounds(idx, `${prefix}.patch.rect`,
          `Trigger rect dimensions must be positive (w=${r.w}, h=${r.h})`));
      }
      if (r.x < 0 || r.y < 0 || r.x + r.w > dims.width || r.y + r.h > dims.height) {
        errors.push(errOutOfBounds(idx, `${prefix}.patch.rect`,
          `Trigger rect (${r.x},${r.y} ${r.w}x${r.h}) exceeds map bounds (${dims.width}x${dims.height})`,
          { rect: r, mapSize: dims }));
      }
    }
  }
}

function validateDialogueOps(
  op: Extract<PatchOp, { op: 'createDialogue' | 'updateDialogueNode' }>,
  idx: number,
  ctx: ValidationContext,
  errors: PatchError[],
): void {
  const prefix = `ops[${idx}]`;

  if (op.op === 'createDialogue') {
    // ID must be unique
    if (ctx.dialogueIds.has(op.dialogue.id)) {
      errors.push(errDuplicateId(idx, `${prefix}.dialogue.id`,
        `Dialogue ID '${op.dialogue.id}' already exists`,
        { duplicateId: op.dialogue.id }));
    }
    // rootNodeId must exist in nodes
    if (!(op.dialogue.rootNodeId in op.dialogue.nodes)) {
      errors.push(errMissingRef(idx, `${prefix}.dialogue.rootNodeId`,
        `Root node '${op.dialogue.rootNodeId}' not found in dialogue nodes`,
        { requestedId: op.dialogue.rootNodeId, availableIds: Object.keys(op.dialogue.nodes) }));
    }
    // Register dialogue
    ctx.dialogueIds.add(op.dialogue.id);
    ctx.createdInPatch.add(op.dialogue.id);
    ctx.dialogueNodes.set(op.dialogue.id, new Set(Object.keys(op.dialogue.nodes)));
  } else {
    // updateDialogueNode
    if (!ctx.dialogueIds.has(op.dialogueId)) {
      errors.push(errMissingRef(idx, `${prefix}.dialogueId`,
        `Dialogue '${op.dialogueId}' not found`,
        { requestedId: op.dialogueId, availableIds: [...ctx.dialogueIds] }));
      return;
    }
    const nodes = ctx.dialogueNodes.get(op.dialogueId);
    if (nodes && !nodes.has(op.nodeId)) {
      errors.push(errMissingRef(idx, `${prefix}.nodeId`,
        `Node '${op.nodeId}' not found in dialogue '${op.dialogueId}'`,
        { requestedId: op.nodeId, availableIds: nodes ? [...nodes] : [] }));
    }
  }
}

function validateQuestOps(
  op: Extract<PatchOp, { op: 'createQuest' | 'updateQuest' }>,
  idx: number,
  ctx: ValidationContext,
  errors: PatchError[],
): void {
  const prefix = `ops[${idx}]`;

  if (op.op === 'createQuest') {
    // ID must be unique
    if (ctx.questIds.has(op.quest.id)) {
      errors.push(errDuplicateId(idx, `${prefix}.quest.id`,
        `Quest ID '${op.quest.id}' already exists`,
        { duplicateId: op.quest.id }));
    }
    // Register quest
    ctx.questIds.add(op.quest.id);
    ctx.createdInPatch.add(op.quest.id);
  } else {
    // updateQuest
    if (!ctx.questIds.has(op.questId)) {
      errors.push(errMissingRef(idx, `${prefix}.questId`,
        `Quest '${op.questId}' not found`,
        { requestedId: op.questId, availableIds: [...ctx.questIds] }));
    }
  }
}

// ============================================================================
// Main Validation Function
// ============================================================================

/**
 * Validates a patch against a project state.
 *
 * Two-phase validation:
 * 1. Structural: Checks patch shape, version fields, and op types
 * 2. Semantic: Checks bounds, references, duplicates with working state view
 *
 * Validates operations in order, allowing intra-patch references
 * (e.g., create entity then place it in same patch).
 *
 * @param project - Current project state to validate against
 * @param patch - Patch document to validate
 * @returns Validation result with ok flag and any errors
 */
export function validatePatch(project: Project, patch: PatchV1): PatchValidationResult {
  // Phase A: Structural validation
  const structural = validatePatchStructure(patch);
  if (!structural.ok) {
    return structural;
  }

  // Check schema version match
  if (patch.baseSchemaVersion !== project.version) {
    return {
      ok: false,
      errors: [errSchemaMismatch(
        `Patch targets schema version ${patch.baseSchemaVersion} but project has version ${project.version}`,
        { expected: project.version, actual: patch.baseSchemaVersion },
      )],
    };
  }

  // Empty patch is valid
  if (patch.ops.length === 0) {
    return { ok: true };
  }

  // Phase B: Semantic validation
  const ctx = buildValidationContext(project);
  const errors: PatchError[] = [];

  for (let i = 0; i < patch.ops.length; i++) {
    const op = patch.ops[i];
    switch (op.op) {
      case 'createMap':
        validateCreateMap(op, i, ctx, errors);
        break;
      case 'createLayer':
        validateCreateLayer(op, i, ctx, errors);
        break;
      case 'paintRect':
      case 'setTiles':
      case 'clearTiles':
        validateTileOp(op, i, ctx, errors);
        break;
      case 'setCollisionCells':
      case 'setCollisionRect':
        validateCollisionOp(op, i, ctx, errors);
        break;
      case 'createEntityDef':
      case 'placeEntity':
      case 'moveEntity':
      case 'deleteEntity':
        validateEntityOps(op, i, ctx, errors);
        break;
      case 'createTrigger':
      case 'updateTrigger':
        validateTriggerOps(op, i, ctx, errors);
        break;
      case 'createDialogue':
      case 'updateDialogueNode':
        validateDialogueOps(op, i, ctx, errors);
        break;
      case 'createQuest':
      case 'updateQuest':
        validateQuestOps(op, i, ctx, errors);
        break;
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true };
}
