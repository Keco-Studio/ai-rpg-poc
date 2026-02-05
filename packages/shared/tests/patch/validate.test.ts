/**
 * Validation Test Suite - User Story 4
 *
 * Tests all validation rules: bounds checking, reference validation,
 * duplicate ID detection, tile ID validation, schema mismatch, and
 * intra-patch reference support.
 */

import { describe, it, expect } from 'vitest';
import type { Project } from '../../src/schema/types.js';
import type { PatchV1 } from '../../src/patch/types.js';
import { validatePatch, validatePatchStructure } from '../../src/patch/validate.js';
import { PatchErrorCode } from '../../src/patch/errors.js';

import baseProjectJson from './fixtures/projects/base-project.json';
import validMinimal from './fixtures/patches/valid-minimal.json';
import validCreateMap from './fixtures/patches/valid-create-map.json';
import validPlaceEntities from './fixtures/patches/valid-place-entities.json';
import invalidOutOfBounds from './fixtures/patches/invalid-out-of-bounds.json';
import invalidMissingRef from './fixtures/patches/invalid-missing-ref.json';
import invalidDuplicateId from './fixtures/patches/invalid-duplicate-id.json';
import invalidTileIndex from './fixtures/patches/invalid-tile-index.json';

const baseProject = baseProjectJson as unknown as Project;

// ── Helper: create a minimal valid patch ─────────────────────────────
function makePatch(ops: PatchV1['ops'], overrides?: Partial<PatchV1>): PatchV1 {
  return {
    patchVersion: 1,
    patchId: 'test-' + Math.random().toString(36).slice(2),
    baseSchemaVersion: 1,
    ops,
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════════════════
// Structural Validation (Phase A)
// ════════════════════════════════════════════════════════════════════════

describe('validatePatchStructure', () => {
  it('accepts a valid patch structure', () => {
    const result = validatePatchStructure(validMinimal);
    expect(result.ok).toBe(true);
  });

  it('rejects non-object input', () => {
    const result = validatePatchStructure('not a patch');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe(PatchErrorCode.SCHEMA_MISMATCH);
    }
  });

  it('rejects wrong patchVersion', () => {
    const result = validatePatchStructure({
      patchVersion: 2,
      patchId: 'test',
      baseSchemaVersion: 1,
      ops: [],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects empty patchId', () => {
    const result = validatePatchStructure({
      patchVersion: 1,
      patchId: '',
      baseSchemaVersion: 1,
      ops: [],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects wrong baseSchemaVersion', () => {
    const result = validatePatchStructure({
      patchVersion: 1,
      patchId: 'test',
      baseSchemaVersion: 99,
      ops: [],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects unknown op types', () => {
    const result = validatePatchStructure({
      patchVersion: 1,
      patchId: 'test',
      baseSchemaVersion: 1,
      ops: [{ op: 'destroyEverything' }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe(PatchErrorCode.UNKNOWN_OP);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════
// Valid Patch Scenarios
// ════════════════════════════════════════════════════════════════════════

describe('validatePatch - valid patches', () => {
  it('accepts an empty patch', () => {
    const result = validatePatch(baseProject, makePatch([]));
    expect(result.ok).toBe(true);
  });

  it('accepts valid minimal patch (paintRect)', () => {
    const result = validatePatch(baseProject, validMinimal as unknown as PatchV1);
    expect(result.ok).toBe(true);
  });

  it('accepts valid create map patch', () => {
    const result = validatePatch(baseProject, validCreateMap as unknown as PatchV1);
    expect(result.ok).toBe(true);
  });

  it('accepts valid place entities patch (intra-patch references)', () => {
    const result = validatePatch(baseProject, validPlaceEntities as unknown as PatchV1);
    expect(result.ok).toBe(true);
  });

  it('accepts setTiles with valid coordinates', () => {
    const result = validatePatch(baseProject, makePatch([{
      op: 'setTiles',
      mapId: 'village_square',
      layerId: 'ground',
      cells: [
        { x: 1, y: 1, tileId: 5 },
        { x: 2, y: 2, tileId: 10 },
      ],
    }]));
    expect(result.ok).toBe(true);
  });

  it('accepts clearTiles with valid coordinates', () => {
    const result = validatePatch(baseProject, makePatch([{
      op: 'clearTiles',
      mapId: 'village_square',
      layerId: 'ground',
      cells: [{ x: 1, y: 1 }, { x: 2, y: 2 }],
    }]));
    expect(result.ok).toBe(true);
  });

  it('accepts setCollisionCells with valid coordinates', () => {
    const result = validatePatch(baseProject, makePatch([{
      op: 'setCollisionCells',
      mapId: 'village_square',
      cells: [{ x: 1, y: 1, solid: 1 }, { x: 2, y: 2, solid: 0 }],
    }]));
    expect(result.ok).toBe(true);
  });

  it('accepts moveEntity with valid position', () => {
    const result = validatePatch(baseProject, makePatch([{
      op: 'moveEntity',
      mapId: 'village_square',
      instanceId: 'guard_1',
      x: 3,
      y: 3,
    }]));
    expect(result.ok).toBe(true);
  });

  it('accepts deleteEntity with valid instance', () => {
    const result = validatePatch(baseProject, makePatch([{
      op: 'deleteEntity',
      mapId: 'village_square',
      instanceId: 'guard_1',
    }]));
    expect(result.ok).toBe(true);
  });

  it('accepts createTrigger with valid bounds', () => {
    const result = validatePatch(baseProject, makePatch([{
      op: 'createTrigger',
      mapId: 'village_square',
      trigger: {
        id: 'new_trigger',
        rect: { x: 1, y: 1, w: 3, h: 2 },
      },
    }]));
    expect(result.ok).toBe(true);
  });

  it('accepts updateTrigger with partial update', () => {
    const result = validatePatch(baseProject, makePatch([{
      op: 'updateTrigger',
      mapId: 'village_square',
      triggerId: 'entrance_trigger',
      patch: { rect: { x: 0, y: 8, w: 10, h: 2 } },
    }]));
    expect(result.ok).toBe(true);
  });

  it('accepts updateDialogueNode with partial update', () => {
    const result = validatePatch(baseProject, makePatch([{
      op: 'updateDialogueNode',
      dialogueId: 'guard_greeting',
      nodeId: 'start',
      patch: { text: 'New greeting text!' },
    }]));
    expect(result.ok).toBe(true);
  });

  it('accepts updateQuest with partial update', () => {
    const result = validatePatch(baseProject, makePatch([{
      op: 'updateQuest',
      questId: 'main_quest',
      patch: { status: 'active' },
    }]));
    expect(result.ok).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════
// OUT_OF_BOUNDS Validation
// ════════════════════════════════════════════════════════════════════════

describe('validatePatch - OUT_OF_BOUNDS', () => {
  it('rejects paintRect exceeding map bounds', () => {
    const result = validatePatch(baseProject, invalidOutOfBounds as unknown as PatchV1);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some(e => e.code === PatchErrorCode.OUT_OF_BOUNDS)).toBe(true);
    }
  });

  it('rejects setTiles with out-of-bounds coordinates', () => {
    const result = validatePatch(baseProject, makePatch([{
      op: 'setTiles',
      mapId: 'village_square',
      layerId: 'ground',
      cells: [{ x: 100, y: 100, tileId: 1 }],
    }]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe(PatchErrorCode.OUT_OF_BOUNDS);
    }
  });

  it('rejects entity placement outside map bounds', () => {
    const result = validatePatch(baseProject, makePatch([{
      op: 'placeEntity',
      mapId: 'village_square',
      instance: { id: 'oob_entity', entityId: 'npc_guard', x: 50, y: 50 },
    }]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some(e => e.code === PatchErrorCode.OUT_OF_BOUNDS)).toBe(true);
    }
  });

  it('rejects moveEntity outside map bounds', () => {
    const result = validatePatch(baseProject, makePatch([{
      op: 'moveEntity',
      mapId: 'village_square',
      instanceId: 'guard_1',
      x: -1,
      y: 5,
    }]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe(PatchErrorCode.OUT_OF_BOUNDS);
    }
  });

  it('rejects collision rect exceeding map bounds', () => {
    const result = validatePatch(baseProject, makePatch([{
      op: 'setCollisionRect',
      mapId: 'village_square',
      x: 0,
      y: 0,
      w: 20,
      h: 20,
      solid: 1,
    }]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some(e => e.code === PatchErrorCode.OUT_OF_BOUNDS)).toBe(true);
    }
  });

  it('rejects trigger rect exceeding map bounds', () => {
    const result = validatePatch(baseProject, makePatch([{
      op: 'createTrigger',
      mapId: 'village_square',
      trigger: { id: 'oob_trigger', rect: { x: 5, y: 5, w: 10, h: 10 } },
    }]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some(e => e.code === PatchErrorCode.OUT_OF_BOUNDS)).toBe(true);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════
// MISSING_REF Validation
// ════════════════════════════════════════════════════════════════════════

describe('validatePatch - MISSING_REF', () => {
  it('rejects placeEntity with non-existent entityId', () => {
    const result = validatePatch(baseProject, invalidMissingRef as unknown as PatchV1);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe(PatchErrorCode.MISSING_REF);
    }
  });

  it('rejects createMap with non-existent tilesetId', () => {
    const result = validatePatch(baseProject, makePatch([{
      op: 'createMap',
      map: { id: 'bad_map', name: 'Bad', tilesetId: 'nonexistent', width: 5, height: 5 },
    }]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some(e => e.code === PatchErrorCode.MISSING_REF)).toBe(true);
    }
  });

  it('rejects moveEntity with non-existent instanceId', () => {
    const result = validatePatch(baseProject, makePatch([{
      op: 'moveEntity',
      mapId: 'village_square',
      instanceId: 'nonexistent_entity',
      x: 1,
      y: 1,
    }]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe(PatchErrorCode.MISSING_REF);
    }
  });

  it('rejects deleteEntity with non-existent instanceId', () => {
    const result = validatePatch(baseProject, makePatch([{
      op: 'deleteEntity',
      mapId: 'village_square',
      instanceId: 'ghost_instance',
    }]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe(PatchErrorCode.MISSING_REF);
    }
  });

  it('rejects updateTrigger with non-existent triggerId', () => {
    const result = validatePatch(baseProject, makePatch([{
      op: 'updateTrigger',
      mapId: 'village_square',
      triggerId: 'nonexistent_trigger',
      patch: {},
    }]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe(PatchErrorCode.MISSING_REF);
    }
  });

  it('rejects updateDialogueNode with non-existent dialogueId', () => {
    const result = validatePatch(baseProject, makePatch([{
      op: 'updateDialogueNode',
      dialogueId: 'nonexistent_dialogue',
      nodeId: 'start',
      patch: {},
    }]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe(PatchErrorCode.MISSING_REF);
    }
  });

  it('rejects updateDialogueNode with non-existent nodeId', () => {
    const result = validatePatch(baseProject, makePatch([{
      op: 'updateDialogueNode',
      dialogueId: 'guard_greeting',
      nodeId: 'nonexistent_node',
      patch: {},
    }]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe(PatchErrorCode.MISSING_REF);
    }
  });

  it('rejects updateQuest with non-existent questId', () => {
    const result = validatePatch(baseProject, makePatch([{
      op: 'updateQuest',
      questId: 'nonexistent_quest',
      patch: {},
    }]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe(PatchErrorCode.MISSING_REF);
    }
  });

  it('rejects createEntityDef with non-existent dialogue ref', () => {
    const result = validatePatch(baseProject, makePatch([{
      op: 'createEntityDef',
      entity: {
        id: 'bad_npc',
        kind: 'npc',
        sprite: { tilesetId: 'characters', tileId: 0 },
        behavior: { dialogueId: 'nonexistent_dialogue' },
      },
    }]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some(e => e.code === PatchErrorCode.MISSING_REF)).toBe(true);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════
// DUPLICATE_ID Validation
// ════════════════════════════════════════════════════════════════════════

describe('validatePatch - DUPLICATE_ID', () => {
  it('rejects createEntityDef with existing entity ID', () => {
    const result = validatePatch(baseProject, invalidDuplicateId as unknown as PatchV1);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe(PatchErrorCode.DUPLICATE_ID);
    }
  });

  it('rejects createMap with existing map ID', () => {
    const result = validatePatch(baseProject, makePatch([{
      op: 'createMap',
      map: { id: 'village_square', name: 'Dupe', tilesetId: 'dungeon', width: 5, height: 5 },
    }]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe(PatchErrorCode.DUPLICATE_ID);
    }
  });

  it('rejects placeEntity with existing instance ID', () => {
    const result = validatePatch(baseProject, makePatch([{
      op: 'placeEntity',
      mapId: 'village_square',
      instance: { id: 'guard_1', entityId: 'npc_guard', x: 1, y: 1 },
    }]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe(PatchErrorCode.DUPLICATE_ID);
    }
  });

  it('rejects createTrigger with existing trigger ID on same map', () => {
    const result = validatePatch(baseProject, makePatch([{
      op: 'createTrigger',
      mapId: 'village_square',
      trigger: { id: 'entrance_trigger', rect: { x: 0, y: 0, w: 1, h: 1 } },
    }]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe(PatchErrorCode.DUPLICATE_ID);
    }
  });

  it('rejects duplicate IDs within same patch', () => {
    const result = validatePatch(baseProject, makePatch([
      { op: 'createEntityDef', entity: { id: 'new_npc', kind: 'npc' as const, sprite: { tilesetId: 'characters', tileId: 1 } } },
      { op: 'createEntityDef', entity: { id: 'new_npc', kind: 'door' as const, sprite: { tilesetId: 'characters', tileId: 2 } } },
    ]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some(e => e.code === PatchErrorCode.DUPLICATE_ID)).toBe(true);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════
// INVALID_TILE_ID Validation
// ════════════════════════════════════════════════════════════════════════

describe('validatePatch - INVALID_TILE_ID', () => {
  it('rejects tile ID exceeding tileset capacity', () => {
    const result = validatePatch(baseProject, invalidTileIndex as unknown as PatchV1);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe(PatchErrorCode.INVALID_TILE_ID);
    }
  });

  it('rejects entity sprite tileId exceeding tileset capacity', () => {
    const result = validatePatch(baseProject, makePatch([{
      op: 'createEntityDef',
      entity: { id: 'bad_sprite', kind: 'npc', sprite: { tilesetId: 'characters', tileId: 999 } },
    }]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some(e => e.code === PatchErrorCode.INVALID_TILE_ID)).toBe(true);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════
// INVALID_MAP / INVALID_LAYER Validation
// ════════════════════════════════════════════════════════════════════════

describe('validatePatch - INVALID_MAP / INVALID_LAYER', () => {
  it('rejects paintRect on non-existent map', () => {
    const result = validatePatch(baseProject, makePatch([{
      op: 'paintRect',
      mapId: 'nonexistent_map',
      layerId: 'ground',
      x: 0, y: 0, w: 1, h: 1, tileId: 1,
    }]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe(PatchErrorCode.INVALID_MAP);
    }
  });

  it('rejects paintRect on non-existent layer', () => {
    const result = validatePatch(baseProject, makePatch([{
      op: 'paintRect',
      mapId: 'village_square',
      layerId: 'nonexistent_layer',
      x: 0, y: 0, w: 1, h: 1, tileId: 1,
    }]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe(PatchErrorCode.INVALID_LAYER);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════
// SCHEMA_MISMATCH Validation
// ════════════════════════════════════════════════════════════════════════

describe('validatePatch - SCHEMA_MISMATCH', () => {
  it('rejects patch with mismatched baseSchemaVersion', () => {
    const patch = makePatch([]);
    (patch as unknown as Record<string, unknown>).baseSchemaVersion = 99;
    const result = validatePatch(baseProject, patch as unknown as PatchV1);
    expect(result.ok).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Intra-Patch Reference Validation
// ════════════════════════════════════════════════════════════════════════

describe('validatePatch - intra-patch references', () => {
  it('allows creating entity then placing it in same patch', () => {
    const result = validatePatch(baseProject, makePatch([
      {
        op: 'createEntityDef',
        entity: { id: 'new_npc', kind: 'npc', sprite: { tilesetId: 'characters', tileId: 1 } },
      },
      {
        op: 'placeEntity',
        mapId: 'village_square',
        instance: { id: 'new_npc_1', entityId: 'new_npc', x: 3, y: 3 },
      },
    ]));
    expect(result.ok).toBe(true);
  });

  it('allows creating map then creating layer on it in same patch', () => {
    const result = validatePatch(baseProject, makePatch([
      {
        op: 'createMap',
        map: { id: 'new_map', name: 'New Map', tilesetId: 'dungeon', width: 5, height: 5 },
      },
      {
        op: 'createLayer',
        mapId: 'new_map',
        layer: { id: 'floor', name: 'Floor', z: 0 },
      },
    ]));
    expect(result.ok).toBe(true);
  });

  it('allows creating dialogue then referencing in entity behavior', () => {
    const result = validatePatch(baseProject, makePatch([
      {
        op: 'createDialogue',
        dialogue: {
          id: 'new_dialogue',
          name: 'New Dialogue',
          rootNodeId: 'start',
          nodes: { start: { id: 'start', speaker: 'NPC', text: 'Hello!', next: null } },
        },
      },
      {
        op: 'createEntityDef',
        entity: {
          id: 'chatty_npc',
          kind: 'npc',
          sprite: { tilesetId: 'characters', tileId: 5 },
          behavior: { dialogueId: 'new_dialogue' },
        },
      },
    ]));
    expect(result.ok).toBe(true);
  });

  it('respects delete within patch (delete then reference fails)', () => {
    const result = validatePatch(baseProject, makePatch([
      { op: 'deleteEntity', mapId: 'village_square', instanceId: 'guard_1' },
      { op: 'moveEntity', mapId: 'village_square', instanceId: 'guard_1', x: 1, y: 1 },
    ]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].code).toBe(PatchErrorCode.MISSING_REF);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════
// Duplicate Coordinate Validation
// ════════════════════════════════════════════════════════════════════════

describe('validatePatch - duplicate coordinates', () => {
  it('rejects setTiles with duplicate coordinates', () => {
    const result = validatePatch(baseProject, makePatch([{
      op: 'setTiles',
      mapId: 'village_square',
      layerId: 'ground',
      cells: [
        { x: 1, y: 1, tileId: 5 },
        { x: 1, y: 1, tileId: 10 },
      ],
    }]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some(e => e.code === PatchErrorCode.OUT_OF_BOUNDS)).toBe(true);
    }
  });

  it('rejects clearTiles with duplicate coordinates', () => {
    const result = validatePatch(baseProject, makePatch([{
      op: 'clearTiles',
      mapId: 'village_square',
      layerId: 'ground',
      cells: [{ x: 3, y: 3 }, { x: 3, y: 3 }],
    }]));
    expect(result.ok).toBe(false);
  });

  it('rejects setCollisionCells with duplicate coordinates', () => {
    const result = validatePatch(baseProject, makePatch([{
      op: 'setCollisionCells',
      mapId: 'village_square',
      cells: [{ x: 1, y: 1, solid: 1 }, { x: 1, y: 1, solid: 0 }],
    }]));
    expect(result.ok).toBe(false);
  });
});
