/**
 * Integration Test Suite - User Story 2
 *
 * Tests the complete patch lifecycle:
 * - Apply + inverse = identity (undo correctness)
 * - Multi-patch sequential application
 * - Atomicity guarantees
 */

import { describe, it, expect } from 'vitest';
import type { Project } from '../../src/schema/types.js';
import type { PatchV1 } from '../../src/patch/types.js';
import { validatePatch } from '../../src/patch/validate.js';
import { applyPatch } from '../../src/patch/apply.js';

import baseProjectJson from './fixtures/projects/base-project.json';

const baseProject = baseProjectJson as unknown as Project;

function makePatch(ops: PatchV1['ops']): PatchV1 {
  return {
    patchVersion: 1,
    patchId: 'test-integration-' + Math.random().toString(36).slice(2),
    baseSchemaVersion: 1,
    ops,
  };
}

/**
 * Deep comparison that ignores inverse metadata (timestamps, etc.)
 * by comparing project data only.
 */
function projectEquals(a: Project, b: Project): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ════════════════════════════════════════════════════════════════════════
// Apply + Inverse = Identity
// ════════════════════════════════════════════════════════════════════════

describe('apply + inverse = identity', () => {
  it('paint rect: apply then undo restores original', () => {
    const patch = makePatch([{
      op: 'paintRect',
      mapId: 'village_square',
      layerId: 'ground',
      x: 2, y: 2, w: 3, h: 3,
      tileId: 42,
    }]);

    const { project: after, inverse } = applyPatch(baseProject, patch);
    expect(projectEquals(after, baseProject)).toBe(false);

    const { project: restored } = applyPatch(after, inverse);
    expect(projectEquals(restored, baseProject)).toBe(true);
  });

  it('setTiles: apply then undo restores original', () => {
    const patch = makePatch([{
      op: 'setTiles',
      mapId: 'village_square',
      layerId: 'ground',
      cells: [
        { x: 5, y: 5, tileId: 99 },
        { x: 6, y: 5, tileId: 100 },
      ],
    }]);

    const { project: after, inverse } = applyPatch(baseProject, patch);
    const { project: restored } = applyPatch(after, inverse);
    expect(projectEquals(restored, baseProject)).toBe(true);
  });

  it('clearTiles: apply then undo restores original', () => {
    const patch = makePatch([{
      op: 'clearTiles',
      mapId: 'village_square',
      layerId: 'ground',
      cells: [{ x: 3, y: 3 }, { x: 4, y: 4 }],
    }]);

    const { project: after, inverse } = applyPatch(baseProject, patch);
    const { project: restored } = applyPatch(after, inverse);
    expect(projectEquals(restored, baseProject)).toBe(true);
  });

  it('setCollisionCells: apply then undo restores original', () => {
    const patch = makePatch([{
      op: 'setCollisionCells',
      mapId: 'village_square',
      cells: [
        { x: 5, y: 5, solid: 1 },
        { x: 6, y: 5, solid: 0 },
      ],
    }]);

    const { project: after, inverse } = applyPatch(baseProject, patch);
    const { project: restored } = applyPatch(after, inverse);
    expect(projectEquals(restored, baseProject)).toBe(true);
  });

  it('setCollisionRect: apply then undo restores original', () => {
    const patch = makePatch([{
      op: 'setCollisionRect',
      mapId: 'village_square',
      x: 3, y: 3, w: 2, h: 2,
      solid: 1,
    }]);

    const { project: after, inverse } = applyPatch(baseProject, patch);
    const { project: restored } = applyPatch(after, inverse);
    expect(projectEquals(restored, baseProject)).toBe(true);
  });

  it('placeEntity + deleteEntity: inverse restores original', () => {
    const patch = makePatch([{
      op: 'placeEntity',
      mapId: 'village_square',
      instance: { id: 'temp_npc', entityId: 'npc_guard', x: 3, y: 3 },
    }]);

    const { project: after, inverse } = applyPatch(baseProject, patch);
    const { project: restored } = applyPatch(after, inverse);
    expect(projectEquals(restored, baseProject)).toBe(true);
  });

  it('moveEntity: inverse restores original position', () => {
    const patch = makePatch([{
      op: 'moveEntity',
      mapId: 'village_square',
      instanceId: 'guard_1',
      x: 8, y: 8,
    }]);

    const { project: after, inverse } = applyPatch(baseProject, patch);
    const { project: restored } = applyPatch(after, inverse);
    expect(projectEquals(restored, baseProject)).toBe(true);
  });

  it('deleteEntity: inverse restores deleted entity', () => {
    const patch = makePatch([{
      op: 'deleteEntity',
      mapId: 'village_square',
      instanceId: 'guard_1',
    }]);

    const { project: after, inverse } = applyPatch(baseProject, patch);
    expect(after.maps['village_square'].entities.length).toBe(0);

    const { project: restored } = applyPatch(after, inverse);
    expect(restored.maps['village_square'].entities.length).toBe(1);
    expect(restored.maps['village_square'].entities[0].instanceId).toBe('guard_1');
  });

  it('updateTrigger: inverse restores original trigger', () => {
    const patch = makePatch([{
      op: 'updateTrigger',
      mapId: 'village_square',
      triggerId: 'entrance_trigger',
      patch: { rect: { x: 0, y: 8, w: 10, h: 2 } },
    }]);

    const { project: after, inverse } = applyPatch(baseProject, patch);
    const { project: restored } = applyPatch(after, inverse);
    expect(projectEquals(restored, baseProject)).toBe(true);
  });

  it('updateDialogueNode: inverse restores original text', () => {
    const patch = makePatch([{
      op: 'updateDialogueNode',
      dialogueId: 'guard_greeting',
      nodeId: 'start',
      patch: { text: 'Modified text' },
    }]);

    const { project: after, inverse } = applyPatch(baseProject, patch);
    const { project: restored } = applyPatch(after, inverse);
    expect(projectEquals(restored, baseProject)).toBe(true);
  });

  it('updateQuest: inverse restores original quest', () => {
    const patch = makePatch([{
      op: 'updateQuest',
      questId: 'main_quest',
      patch: { status: 'active', description: 'Changed' },
    }]);

    const { project: after, inverse } = applyPatch(baseProject, patch);
    const { project: restored } = applyPatch(after, inverse);
    expect(projectEquals(restored, baseProject)).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Multi-Operation Inverse
// ════════════════════════════════════════════════════════════════════════

describe('multi-operation inverse', () => {
  it('complex multi-op patch: apply + inverse = identity', () => {
    const patch = makePatch([
      { op: 'paintRect', mapId: 'village_square', layerId: 'ground', x: 1, y: 1, w: 2, h: 2, tileId: 50 },
      { op: 'setCollisionRect', mapId: 'village_square', x: 1, y: 1, w: 2, h: 2, solid: 1 },
      { op: 'moveEntity', mapId: 'village_square', instanceId: 'guard_1', x: 8, y: 8 },
      { op: 'updateDialogueNode', dialogueId: 'guard_greeting', nodeId: 'start', patch: { text: 'New text' } },
      { op: 'updateQuest', questId: 'main_quest', patch: { status: 'active' } },
    ]);

    const { project: after, inverse } = applyPatch(baseProject, patch);
    expect(projectEquals(after, baseProject)).toBe(false);

    const { project: restored } = applyPatch(after, inverse);
    expect(projectEquals(restored, baseProject)).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Determinism
// ════════════════════════════════════════════════════════════════════════

describe('determinism', () => {
  it('same patch applied twice produces identical results', () => {
    const patch = makePatch([
      { op: 'paintRect', mapId: 'village_square', layerId: 'ground', x: 1, y: 1, w: 3, h: 3, tileId: 42 },
      { op: 'placeEntity', mapId: 'village_square', instance: { id: 'npc_x', entityId: 'npc_guard', x: 3, y: 3 } },
    ]);

    const result1 = applyPatch(baseProject, patch);
    const result2 = applyPatch(baseProject, patch);

    expect(projectEquals(result1.project, result2.project)).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Validation + Apply Pipeline
// ════════════════════════════════════════════════════════════════════════

describe('validate + apply pipeline', () => {
  it('valid patch passes validation and applies correctly', () => {
    const patch = makePatch([
      { op: 'paintRect', mapId: 'village_square', layerId: 'ground', x: 1, y: 1, w: 2, h: 2, tileId: 5 },
    ]);

    const validation = validatePatch(baseProject, patch);
    expect(validation.ok).toBe(true);

    const result = applyPatch(baseProject, patch);
    expect(result.project.maps['village_square'].tileLayers['ground'].data[1 * 10 + 1]).toBe(5);
  });
});
