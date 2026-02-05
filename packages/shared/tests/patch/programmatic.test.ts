/**
 * Programmatic API Test Suite - User Story 3
 *
 * Tests that the patch API works correctly for programmatic use:
 * - Constructing patches in code
 * - Sequential application with deterministic results
 * - Inverse chain restores original state
 */

import { describe, it, expect } from 'vitest';
import type { Project } from '../../src/schema/types.js';
import type { PatchV1 } from '../../src/patch/types.js';
import { validatePatch } from '../../src/patch/validate.js';
import { applyPatch } from '../../src/patch/apply.js';
import { summarizePatch } from '../../src/patch/summary.js';

import baseProjectJson from './fixtures/projects/base-project.json';

const baseProject = baseProjectJson as unknown as Project;

function makePatch(ops: PatchV1['ops'], id?: string): PatchV1 {
  return {
    patchVersion: 1,
    patchId: id ?? 'prog-' + Math.random().toString(36).slice(2),
    baseSchemaVersion: 1,
    ops,
  };
}

function projectEquals(a: Project, b: Project): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ════════════════════════════════════════════════════════════════════════
// Programmatic Patch Construction
// ════════════════════════════════════════════════════════════════════════

describe('programmatic patch construction', () => {
  it('constructs and applies a patch to create a full dungeon room', () => {
    const patch = makePatch([
      // Create new map
      {
        op: 'createMap',
        map: { id: 'dungeon_room', name: 'Dungeon Room', tilesetId: 'dungeon', width: 8, height: 8 },
      },
      // Add floor layer
      {
        op: 'createLayer',
        mapId: 'dungeon_room',
        layer: { id: 'floor', name: 'Floor', z: 0 },
        fillTileId: 2,
      },
      // Add walls around edges
      {
        op: 'createLayer',
        mapId: 'dungeon_room',
        layer: { id: 'walls', name: 'Walls', z: 1 },
      },
      // Set wall collision
      {
        op: 'setCollisionRect',
        mapId: 'dungeon_room',
        x: 0, y: 0, w: 8, h: 1,
        solid: 1,
      },
      {
        op: 'setCollisionRect',
        mapId: 'dungeon_room',
        x: 0, y: 7, w: 8, h: 1,
        solid: 1,
      },
      // Place a chest entity
      {
        op: 'createEntityDef',
        entity: {
          id: 'chest_gold',
          kind: 'chest',
          name: 'Gold Chest',
          sprite: { tilesetId: 'dungeon', tileId: 50 },
        },
      },
      {
        op: 'placeEntity',
        mapId: 'dungeon_room',
        instance: { id: 'chest_1', entityId: 'chest_gold', x: 4, y: 4 },
      },
      // Add door trigger
      {
        op: 'createTrigger',
        mapId: 'dungeon_room',
        trigger: {
          id: 'exit_door',
          rect: { x: 3, y: 7, w: 2, h: 1 },
          onEnter: [{ type: 'teleport', data: { targetMap: 'village_square', targetPosition: { x: 5, y: 5 } } }],
        },
      },
    ]);

    const validation = validatePatch(baseProject, patch);
    expect(validation.ok).toBe(true);

    const result = applyPatch(baseProject, patch);
    const map = result.project.maps['dungeon_room'];

    expect(map).toBeDefined();
    expect(map.width).toBe(8);
    expect(map.height).toBe(8);
    expect(Object.keys(map.tileLayers)).toEqual(['floor', 'walls']);
    expect(map.entities.length).toBe(1);
    expect(map.triggers.length).toBe(1);
    expect(result.project.entityDefs['chest_gold']).toBeDefined();
    expect(result.project.entityDefs['chest_gold'].type).toBe('item'); // chest → item mapping
  });

  it('programmatically builds entity with dialogue chain', () => {
    const patch = makePatch([
      {
        op: 'createDialogue',
        dialogue: {
          id: 'quest_giver_dlg',
          name: 'Quest Giver Dialogue',
          rootNodeId: 'intro',
          nodes: {
            intro: {
              id: 'intro',
              speaker: 'Elder',
              text: 'The village needs your help!',
              choices: [
                { text: 'What happened?', next: 'explain' },
                { text: 'Not interested.', next: null },
              ],
            },
            explain: {
              id: 'explain',
              speaker: 'Elder',
              text: 'Goblins have stolen our crops!',
              next: null,
            },
          },
        },
      },
      {
        op: 'createEntityDef',
        entity: {
          id: 'elder_npc',
          kind: 'npc',
          name: 'Village Elder',
          sprite: { tilesetId: 'characters', tileId: 12 },
          behavior: { dialogueId: 'quest_giver_dlg' },
        },
      },
      {
        op: 'placeEntity',
        mapId: 'village_square',
        instance: { id: 'elder_1', entityId: 'elder_npc', x: 4, y: 4 },
      },
      {
        op: 'createQuest',
        quest: {
          id: 'goblin_quest',
          name: 'Goblin Problem',
          description: 'Recover stolen crops from the goblins',
          status: 'inactive',
          stages: [
            { id: 'find', description: 'Find the goblin camp', objectives: ['Explore the forest'] },
            { id: 'recover', description: 'Recover the crops', objectives: ['Defeat goblins', 'Collect crops'] },
          ],
        },
      },
    ]);

    const validation = validatePatch(baseProject, patch);
    expect(validation.ok).toBe(true);

    const result = applyPatch(baseProject, patch);
    expect(result.project.dialogues['quest_giver_dlg']).toBeDefined();
    expect(result.project.entityDefs['elder_npc']).toBeDefined();
    expect(result.project.quests!['goblin_quest']).toBeDefined();
    expect(result.project.quests!['goblin_quest'].stages).toHaveLength(2);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Sequential Patch Application
// ════════════════════════════════════════════════════════════════════════

describe('sequential patch application', () => {
  it('applies patches sequentially with deterministic results', () => {
    const patch1 = makePatch([
      { op: 'createEntityDef', entity: { id: 'npc_a', kind: 'npc', sprite: { tilesetId: 'characters', tileId: 1 } } },
    ], 'seq-1');

    const patch2 = makePatch([
      { op: 'placeEntity', mapId: 'village_square', instance: { id: 'a_inst', entityId: 'npc_a', x: 2, y: 2 } },
    ], 'seq-2');

    const patch3 = makePatch([
      { op: 'moveEntity', mapId: 'village_square', instanceId: 'a_inst', x: 7, y: 7 },
    ], 'seq-3');

    // Apply sequentially
    const r1 = applyPatch(baseProject, patch1);
    const r2 = applyPatch(r1.project, patch2);
    const r3 = applyPatch(r2.project, patch3);

    // Verify final state
    const entity = r3.project.maps['village_square'].entities.find(e => e.instanceId === 'a_inst');
    expect(entity).toBeDefined();
    expect(entity!.position).toEqual({ x: 7, y: 7 });

    // Verify determinism (apply again)
    const r1b = applyPatch(baseProject, patch1);
    const r2b = applyPatch(r1b.project, patch2);
    const r3b = applyPatch(r2b.project, patch3);
    expect(projectEquals(r3.project, r3b.project)).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Inverse Chain Restores Original
// ════════════════════════════════════════════════════════════════════════

describe('inverse chain', () => {
  it('applying inverses in reverse order restores original state', () => {
    const patches = [
      makePatch([
        { op: 'paintRect', mapId: 'village_square', layerId: 'ground', x: 1, y: 1, w: 2, h: 2, tileId: 50 },
      ], 'chain-1'),
      makePatch([
        { op: 'placeEntity', mapId: 'village_square', instance: { id: 'temp_npc', entityId: 'npc_guard', x: 3, y: 3 } },
      ], 'chain-2'),
      makePatch([
        { op: 'updateQuest', questId: 'main_quest', patch: { status: 'active' } },
      ], 'chain-3'),
    ];

    // Apply all patches, collect inverses
    let current = baseProject;
    const inverses: PatchV1[] = [];

    for (const patch of patches) {
      const result = applyPatch(current, patch);
      inverses.push(result.inverse);
      current = result.project;
    }

    // Apply inverses in reverse order
    for (let i = inverses.length - 1; i >= 0; i--) {
      const result = applyPatch(current, inverses[i]);
      current = result.project;
    }

    expect(projectEquals(current, baseProject)).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Summary API Usage
// ════════════════════════════════════════════════════════════════════════

describe('summarizePatch API', () => {
  it('can be called independently to compare two project states', () => {
    const patch = makePatch([
      { op: 'createEntityDef', entity: { id: 'api_npc', kind: 'npc', sprite: { tilesetId: 'characters', tileId: 3 } } },
      { op: 'placeEntity', mapId: 'village_square', instance: { id: 'api_inst', entityId: 'api_npc', x: 2, y: 2 } },
    ]);

    const result = applyPatch(baseProject, patch);
    const summary = summarizePatch(baseProject, result.project);

    expect(summary.created.entities).toContain('api_npc');
    expect(summary.created.entities).toContain('api_inst');
    expect(summary.modified.maps).toContain('village_square');
  });
});
