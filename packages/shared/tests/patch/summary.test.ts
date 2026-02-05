/**
 * Summary Test Suite - User Story 1
 *
 * Tests that summarizePatch correctly identifies created, modified,
 * and deleted resources by comparing before/after project states.
 */

import { describe, it, expect } from 'vitest';
import type { Project } from '../../src/schema/types.js';
import type { PatchV1 } from '../../src/patch/types.js';
import { applyPatch } from '../../src/patch/apply.js';
import { summarizePatch } from '../../src/patch/summary.js';

import baseProjectJson from './fixtures/projects/base-project.json';

const baseProject = baseProjectJson as unknown as Project;

function makePatch(ops: PatchV1['ops']): PatchV1 {
  return {
    patchVersion: 1,
    patchId: 'test-summary-' + Math.random().toString(36).slice(2),
    baseSchemaVersion: 1,
    ops,
  };
}

describe('summarizePatch', () => {
  it('reports empty summary for identical projects', () => {
    const summary = summarizePatch(baseProject, baseProject);
    expect(summary.created.maps).toHaveLength(0);
    expect(summary.created.entities).toHaveLength(0);
    expect(summary.modified.maps).toHaveLength(0);
    expect(summary.deleted.maps).toHaveLength(0);
  });

  it('reports created map', () => {
    const result = applyPatch(baseProject, makePatch([
      { op: 'createMap', map: { id: 'new_map', name: 'New', tilesetId: 'dungeon', width: 5, height: 5 } },
    ]));
    expect(result.summary.created.maps).toContain('new_map');
  });

  it('reports created entity definition', () => {
    const result = applyPatch(baseProject, makePatch([
      { op: 'createEntityDef', entity: { id: 'new_npc', kind: 'npc', sprite: { tilesetId: 'characters', tileId: 1 } } },
    ]));
    expect(result.summary.created.entities).toContain('new_npc');
  });

  it('reports created entity instance', () => {
    const result = applyPatch(baseProject, makePatch([
      { op: 'placeEntity', mapId: 'village_square', instance: { id: 'new_inst', entityId: 'npc_guard', x: 3, y: 3 } },
    ]));
    expect(result.summary.created.entities).toContain('new_inst');
  });

  it('reports deleted entity instance', () => {
    const result = applyPatch(baseProject, makePatch([
      { op: 'deleteEntity', mapId: 'village_square', instanceId: 'guard_1' },
    ]));
    expect(result.summary.deleted.entities).toContain('guard_1');
  });

  it('reports modified map when tiles change', () => {
    const result = applyPatch(baseProject, makePatch([
      { op: 'paintRect', mapId: 'village_square', layerId: 'ground', x: 1, y: 1, w: 2, h: 2, tileId: 99 },
    ]));
    expect(result.summary.modified.maps).toContain('village_square');
  });

  it('counts tile edits per map/layer', () => {
    const result = applyPatch(baseProject, makePatch([
      { op: 'paintRect', mapId: 'village_square', layerId: 'ground', x: 1, y: 1, w: 3, h: 3, tileId: 50 },
    ]));
    const edit = result.summary.tileEdits?.find(
      e => e.mapId === 'village_square' && e.layerId === 'ground',
    );
    expect(edit).toBeDefined();
    expect(edit!.changedCells).toBe(9); // 3x3
  });

  it('counts collision edits per map', () => {
    const result = applyPatch(baseProject, makePatch([
      { op: 'setCollisionRect', mapId: 'village_square', x: 3, y: 3, w: 2, h: 2, solid: 1 },
    ]));
    const edit = result.summary.collisionEdits?.find(
      e => e.mapId === 'village_square',
    );
    expect(edit).toBeDefined();
    expect(edit!.changedCells).toBeGreaterThan(0);
  });

  it('reports created dialogue', () => {
    const result = applyPatch(baseProject, makePatch([
      {
        op: 'createDialogue',
        dialogue: {
          id: 'new_dlg',
          name: 'New',
          rootNodeId: 'n1',
          nodes: { n1: { id: 'n1', speaker: 'X', text: 'Hi', next: null } },
        },
      },
    ]));
    expect(result.summary.created.dialogues).toContain('new_dlg');
  });

  it('reports modified dialogue', () => {
    const result = applyPatch(baseProject, makePatch([
      { op: 'updateDialogueNode', dialogueId: 'guard_greeting', nodeId: 'start', patch: { text: 'Changed' } },
    ]));
    expect(result.summary.modified.dialogues).toContain('guard_greeting');
  });

  it('reports created quest', () => {
    const result = applyPatch(baseProject, makePatch([
      { op: 'createQuest', quest: { id: 'q1', name: 'Q', description: 'D', status: 'inactive' } },
    ]));
    expect(result.summary.created.quests).toContain('q1');
  });

  it('reports modified quest', () => {
    const result = applyPatch(baseProject, makePatch([
      { op: 'updateQuest', questId: 'main_quest', patch: { status: 'active' } },
    ]));
    expect(result.summary.modified.quests).toContain('main_quest');
  });

  it('reports created trigger', () => {
    const result = applyPatch(baseProject, makePatch([
      { op: 'createTrigger', mapId: 'village_square', trigger: { id: 'new_trig', rect: { x: 1, y: 1, w: 2, h: 2 } } },
    ]));
    expect(result.summary.created.triggers).toContain('new_trig');
  });

  it('reports modified trigger', () => {
    const result = applyPatch(baseProject, makePatch([
      { op: 'updateTrigger', mapId: 'village_square', triggerId: 'entrance_trigger', patch: { rect: { x: 0, y: 8, w: 10, h: 2 } } },
    ]));
    expect(result.summary.modified.triggers).toContain('entrance_trigger');
  });
});
