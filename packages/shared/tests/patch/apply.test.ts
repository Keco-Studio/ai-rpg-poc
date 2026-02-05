/**
 * Apply Test Suite - User Story 1
 *
 * Tests patch application for all operation types, ensuring correct
 * project mutation, structural sharing, and inverse generation.
 */

import { describe, it, expect } from 'vitest';
import type { Project } from '../../src/schema/types.js';
import type { PatchV1 } from '../../src/patch/types.js';
import { applyPatch } from '../../src/patch/apply.js';

import baseProjectJson from './fixtures/projects/base-project.json';
import validCreateMap from './fixtures/patches/valid-create-map.json';
import validPaintTiles from './fixtures/patches/valid-paint-tiles.json';
import validPlaceEntities from './fixtures/patches/valid-place-entities.json';

const baseProject = baseProjectJson as unknown as Project;

function makePatch(ops: PatchV1['ops']): PatchV1 {
  return {
    patchVersion: 1,
    patchId: 'test-apply-' + Math.random().toString(36).slice(2),
    baseSchemaVersion: 1,
    ops,
  };
}

// ════════════════════════════════════════════════════════════════════════
// Empty Patch
// ════════════════════════════════════════════════════════════════════════

describe('applyPatch - empty patch', () => {
  it('returns same project for empty patch', () => {
    const result = applyPatch(baseProject, makePatch([]));
    expect(result.project).toBe(baseProject); // Reference equality
    expect(result.summary.created.maps).toHaveLength(0);
    expect(result.inverse.ops).toHaveLength(0);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Map Operations
// ════════════════════════════════════════════════════════════════════════

describe('applyPatch - map operations', () => {
  it('creates a new map', () => {
    const result = applyPatch(baseProject, validCreateMap as unknown as PatchV1);
    expect(result.project.maps['dungeon_1']).toBeDefined();
    expect(result.project.maps['dungeon_1'].width).toBe(15);
    expect(result.project.maps['dungeon_1'].height).toBe(15);
    expect(result.project.maps['dungeon_1'].tilesetId).toBe('dungeon');
    expect(result.summary.created.maps).toContain('dungeon_1');
  });

  it('creates a layer on the new map', () => {
    const result = applyPatch(baseProject, validCreateMap as unknown as PatchV1);
    const map = result.project.maps['dungeon_1'];
    expect(map.tileLayers['ground']).toBeDefined();
    expect(map.tileLayers['ground'].data).toHaveLength(15 * 15);
    expect(map.tileLayers['ground'].data[0]).toBe(1); // fillTileId = 1
    expect(map.tileLayers['ground'].zIndex).toBe(0);
  });

  it('does not mutate the original project', () => {
    const before = JSON.stringify(baseProject);
    applyPatch(baseProject, validCreateMap as unknown as PatchV1);
    expect(JSON.stringify(baseProject)).toBe(before);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Tile Operations
// ════════════════════════════════════════════════════════════════════════

describe('applyPatch - tile operations', () => {
  it('paints a rect of tiles', () => {
    const result = applyPatch(baseProject, makePatch([{
      op: 'paintRect',
      mapId: 'village_square',
      layerId: 'ground',
      x: 2, y: 2, w: 3, h: 3,
      tileId: 42,
    }]));
    const data = result.project.maps['village_square'].tileLayers['ground'].data;
    // Check center of rect
    expect(data[2 * 10 + 2]).toBe(42); // (2,2)
    expect(data[3 * 10 + 3]).toBe(42); // (3,3)
    expect(data[4 * 10 + 4]).toBe(42); // (4,4)
    // Check outside rect is unchanged
    expect(data[0]).toBe(1); // (0,0) unchanged
  });

  it('sets individual tiles', () => {
    const result = applyPatch(baseProject, makePatch([{
      op: 'setTiles',
      mapId: 'village_square',
      layerId: 'ground',
      cells: [
        { x: 5, y: 5, tileId: 99 },
        { x: 6, y: 5, tileId: 100 },
      ],
    }]));
    const data = result.project.maps['village_square'].tileLayers['ground'].data;
    expect(data[5 * 10 + 5]).toBe(99);
    expect(data[5 * 10 + 6]).toBe(100);
  });

  it('clears tiles (sets to 0)', () => {
    const result = applyPatch(baseProject, makePatch([{
      op: 'clearTiles',
      mapId: 'village_square',
      layerId: 'ground',
      cells: [{ x: 5, y: 5 }, { x: 6, y: 5 }],
    }]));
    const data = result.project.maps['village_square'].tileLayers['ground'].data;
    expect(data[5 * 10 + 5]).toBe(0);
    expect(data[5 * 10 + 6]).toBe(0);
  });

  it('reports tile edits in summary', () => {
    const result = applyPatch(baseProject, validPaintTiles as unknown as PatchV1);
    expect(result.summary.tileEdits).toBeDefined();
    expect(result.summary.tileEdits!.length).toBeGreaterThan(0);
    const groundEdit = result.summary.tileEdits!.find(
      e => e.mapId === 'village_square' && e.layerId === 'ground',
    );
    expect(groundEdit).toBeDefined();
    expect(groundEdit!.changedCells).toBeGreaterThan(0);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Collision Operations
// ════════════════════════════════════════════════════════════════════════

describe('applyPatch - collision operations', () => {
  it('sets collision cells', () => {
    const result = applyPatch(baseProject, makePatch([{
      op: 'setCollisionCells',
      mapId: 'village_square',
      cells: [
        { x: 5, y: 5, solid: 1 },
        { x: 6, y: 5, solid: 1 },
      ],
    }]));
    const coll = result.project.maps['village_square'].collisionLayer;
    expect(coll[5 * 10 + 5]).toBe(1);
    expect(coll[5 * 10 + 6]).toBe(1);
  });

  it('sets collision rect', () => {
    const result = applyPatch(baseProject, makePatch([{
      op: 'setCollisionRect',
      mapId: 'village_square',
      x: 3, y: 3, w: 4, h: 4,
      solid: 1,
    }]));
    const coll = result.project.maps['village_square'].collisionLayer;
    // Check inside rect
    expect(coll[3 * 10 + 3]).toBe(1);
    expect(coll[6 * 10 + 6]).toBe(1);
  });

  it('reports collision edits in summary', () => {
    const result = applyPatch(baseProject, makePatch([{
      op: 'setCollisionRect',
      mapId: 'village_square',
      x: 3, y: 3, w: 2, h: 2,
      solid: 1,
    }]));
    expect(result.summary.collisionEdits).toBeDefined();
    expect(result.summary.collisionEdits!.length).toBeGreaterThan(0);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Entity Operations
// ════════════════════════════════════════════════════════════════════════

describe('applyPatch - entity operations', () => {
  it('creates an entity definition', () => {
    const result = applyPatch(baseProject, makePatch([{
      op: 'createEntityDef',
      entity: {
        id: 'npc_merchant',
        kind: 'npc',
        name: 'Merchant',
        sprite: { tilesetId: 'characters', tileId: 8 },
      },
    }]));
    expect(result.project.entityDefs['npc_merchant']).toBeDefined();
    expect(result.project.entityDefs['npc_merchant'].name).toBe('Merchant');
    expect(result.project.entityDefs['npc_merchant'].type).toBe('npc');
    expect(result.summary.created.entities).toContain('npc_merchant');
  });

  it('maps chest kind to item type', () => {
    const result = applyPatch(baseProject, makePatch([{
      op: 'createEntityDef',
      entity: {
        id: 'chest_1',
        kind: 'chest',
        sprite: { tilesetId: 'characters', tileId: 10 },
      },
    }]));
    expect(result.project.entityDefs['chest_1'].type).toBe('item');
  });

  it('places an entity instance', () => {
    const result = applyPatch(baseProject, makePatch([{
      op: 'placeEntity',
      mapId: 'village_square',
      instance: { id: 'guard_2', entityId: 'npc_guard', x: 3, y: 3 },
    }]));
    const entities = result.project.maps['village_square'].entities;
    expect(entities.length).toBe(2); // Original guard_1 + new guard_2
    const placed = entities.find(e => e.instanceId === 'guard_2');
    expect(placed).toBeDefined();
    expect(placed!.position).toEqual({ x: 3, y: 3 });
  });

  it('moves an entity instance', () => {
    const result = applyPatch(baseProject, makePatch([{
      op: 'moveEntity',
      mapId: 'village_square',
      instanceId: 'guard_1',
      x: 7,
      y: 7,
    }]));
    const guard = result.project.maps['village_square'].entities.find(
      e => e.instanceId === 'guard_1',
    );
    expect(guard!.position).toEqual({ x: 7, y: 7 });
  });

  it('deletes an entity instance', () => {
    const result = applyPatch(baseProject, makePatch([{
      op: 'deleteEntity',
      mapId: 'village_square',
      instanceId: 'guard_1',
    }]));
    const entities = result.project.maps['village_square'].entities;
    expect(entities.length).toBe(0);
    expect(result.summary.deleted.entities).toContain('guard_1');
  });

  it('creates entity with dialogue behavior', () => {
    const result = applyPatch(baseProject, makePatch([{
      op: 'createEntityDef',
      entity: {
        id: 'chatty_npc',
        kind: 'npc',
        sprite: { tilesetId: 'characters', tileId: 5 },
        behavior: { dialogueId: 'guard_greeting' },
      },
    }]));
    const entityDef = result.project.entityDefs['chatty_npc'];
    expect(entityDef.interaction?.type).toBe('dialogue');
  });
});

// ════════════════════════════════════════════════════════════════════════
// Trigger Operations
// ════════════════════════════════════════════════════════════════════════

describe('applyPatch - trigger operations', () => {
  it('creates a trigger', () => {
    const result = applyPatch(baseProject, makePatch([{
      op: 'createTrigger',
      mapId: 'village_square',
      trigger: {
        id: 'trap_1',
        rect: { x: 3, y: 3, w: 2, h: 2 },
        onEnter: [{ type: 'showMessage', data: { message: 'A trap!' } }],
      },
    }]));
    const triggers = result.project.maps['village_square'].triggers;
    expect(triggers.length).toBe(2); // Original + new
    const trap = triggers.find(t => t.id === 'trap_1');
    expect(trap).toBeDefined();
    expect(trap!.bounds).toEqual({ x: 3, y: 3, width: 2, height: 2 });
    expect(result.summary.created.triggers).toContain('trap_1');
  });

  it('updates a trigger', () => {
    const result = applyPatch(baseProject, makePatch([{
      op: 'updateTrigger',
      mapId: 'village_square',
      triggerId: 'entrance_trigger',
      patch: { rect: { x: 0, y: 8, w: 10, h: 2 } },
    }]));
    const trigger = result.project.maps['village_square'].triggers.find(
      t => t.id === 'entrance_trigger',
    );
    expect(trigger!.bounds).toEqual({ x: 0, y: 8, width: 10, height: 2 });
  });
});

// ════════════════════════════════════════════════════════════════════════
// Dialogue Operations
// ════════════════════════════════════════════════════════════════════════

describe('applyPatch - dialogue operations', () => {
  it('creates a dialogue', () => {
    const result = applyPatch(baseProject, makePatch([{
      op: 'createDialogue',
      dialogue: {
        id: 'new_dialogue',
        name: 'New Dialogue',
        rootNodeId: 'start',
        nodes: {
          start: { id: 'start', speaker: 'NPC', text: 'Hello!', next: null },
        },
      },
    }]));
    expect(result.project.dialogues['new_dialogue']).toBeDefined();
    expect(result.summary.created.dialogues).toContain('new_dialogue');
  });

  it('updates a dialogue node', () => {
    const result = applyPatch(baseProject, makePatch([{
      op: 'updateDialogueNode',
      dialogueId: 'guard_greeting',
      nodeId: 'start',
      patch: { text: 'Welcome, traveler!', speaker: 'Friendly Guard' },
    }]));
    const node = result.project.dialogues['guard_greeting'].nodes['start'];
    expect(node.text).toBe('Welcome, traveler!');
    expect(node.speaker).toBe('Friendly Guard');
    expect(result.summary.modified.dialogues).toContain('guard_greeting');
  });
});

// ════════════════════════════════════════════════════════════════════════
// Quest Operations
// ════════════════════════════════════════════════════════════════════════

describe('applyPatch - quest operations', () => {
  it('creates a quest', () => {
    const result = applyPatch(baseProject, makePatch([{
      op: 'createQuest',
      quest: {
        id: 'side_quest_1',
        name: 'Side Quest',
        description: 'Help the farmer',
        status: 'inactive',
      },
    }]));
    expect(result.project.quests!['side_quest_1']).toBeDefined();
    expect(result.summary.created.quests).toContain('side_quest_1');
  });

  it('updates a quest', () => {
    const result = applyPatch(baseProject, makePatch([{
      op: 'updateQuest',
      questId: 'main_quest',
      patch: { status: 'active', description: 'Updated description' },
    }]));
    const quest = result.project.quests!['main_quest'];
    expect(quest.status).toBe('active');
    expect(quest.description).toBe('Updated description');
    expect(result.summary.modified.quests).toContain('main_quest');
  });
});

// ════════════════════════════════════════════════════════════════════════
// Complex Multi-Op Patch
// ════════════════════════════════════════════════════════════════════════

describe('applyPatch - complex scenarios', () => {
  it('applies multiple operations from fixture', () => {
    const result = applyPatch(baseProject, validPlaceEntities as unknown as PatchV1);
    // Should have created: dialogue, entity def, entity instance, quest
    expect(result.project.dialogues['merchant_intro']).toBeDefined();
    expect(result.project.entityDefs['npc_merchant']).toBeDefined();
    expect(result.project.maps['village_square'].entities.length).toBe(2);
    expect(result.project.quests!['fetch_quest']).toBeDefined();
  });

  it('generates an inverse patch', () => {
    const result = applyPatch(baseProject, validPlaceEntities as unknown as PatchV1);
    expect(result.inverse).toBeDefined();
    expect(result.inverse.patchVersion).toBe(1);
    expect(result.inverse.ops.length).toBeGreaterThan(0);
  });
});
