/**
 * AI Orchestration - Test Fixtures
 *
 * Sample projects, valid patches, and test data for AI orchestration tests.
 * All fixtures use deterministic values (sorted IDs, fixed timestamps).
 */

import type { Project } from '../../src/schema/types.js';
import type { PatchV1 } from '../../src/patch/types.js';
import type { ProjectSummary, GuardrailConfig } from '../../src/ai/types.js';

// ============================================================================
// Base Test Project
// ============================================================================

/**
 * A minimal but complete project for testing.
 * Contains one tileset, one map with one layer, one entity, one dialogue, one quest.
 */
export function createTestProject(): Project {
  return {
    version: 1,
    metadata: {
      name: 'Test Project',
      author: 'Test Author',
      description: 'Test project for AI orchestration tests',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    config: {
      startingMap: 'town01',
      playerSpawn: { x: 5, y: 5 },
      tileSize: 16,
      viewportSize: { width: 10, height: 10 },
    },
    tilesets: {
      overworld: {
        id: 'overworld',
        name: 'Overworld Tileset',
        imagePath: 'assets/tilesets/overworld.png',
        tileWidth: 16,
        tileHeight: 16,
        tileCount: 256,
        columns: 16,
      },
      characters: {
        id: 'characters',
        name: 'Character Sprites',
        imagePath: 'assets/tilesets/characters.png',
        tileWidth: 16,
        tileHeight: 16,
        tileCount: 64,
        columns: 8,
      },
    },
    maps: {
      town01: {
        id: 'town01',
        name: 'Town Square',
        width: 10,
        height: 10,
        tilesetId: 'overworld',
        tileLayers: {
          ground: {
            name: 'Ground',
            data: new Array(100).fill(1),
            zIndex: 0,
            opacity: 1,
            visible: true,
          },
          decoration: {
            name: 'Decoration',
            data: new Array(100).fill(0),
            zIndex: 1,
            opacity: 1,
            visible: true,
          },
        },
        collisionLayer: new Array(100).fill(0),
        entities: [
          {
            instanceId: 'guard_1',
            entityDefId: 'npc_guard',
            position: { x: 5, y: 3 },
          },
          {
            instanceId: 'merchant_1',
            entityDefId: 'npc_merchant',
            position: { x: 2, y: 7 },
          },
        ],
        triggers: [
          {
            id: 'town_entrance',
            name: 'Town Entrance',
            bounds: { x: 0, y: 9, width: 10, height: 1 },
            events: {
              onEnter: [
                {
                  type: 'showMessage' as const,
                  data: { message: 'Welcome to town!' },
                },
              ],
            },
            activation: {},
          },
        ],
      },
    },
    entityDefs: {
      npc_guard: {
        id: 'npc_guard',
        type: 'npc',
        name: 'Town Guard',
        sprite: { tilesetId: 'characters', tileIndex: 0 },
        interaction: {
          type: 'dialogue',
          data: { dialogueId: 'guard_greeting' },
        },
      },
      npc_merchant: {
        id: 'npc_merchant',
        type: 'npc',
        name: 'Merchant',
        sprite: { tilesetId: 'characters', tileIndex: 4 },
        interaction: {
          type: 'dialogue',
          data: { dialogueId: 'merchant_greeting' },
        },
      },
    },
    dialogues: {
      guard_greeting: {
        id: 'guard_greeting',
        name: 'Guard Greeting',
        rootNodeId: 'start',
        nodes: {
          start: {
            id: 'start',
            speaker: 'Guard',
            text: 'Halt! Who goes there?',
            next: null,
          },
        },
      },
      merchant_greeting: {
        id: 'merchant_greeting',
        name: 'Merchant Greeting',
        rootNodeId: 'start',
        nodes: {
          start: {
            id: 'start',
            speaker: 'Merchant',
            text: 'Welcome to my shop!',
            next: null,
          },
        },
      },
    },
    quests: {
      main_quest: {
        id: 'main_quest',
        name: 'The Beginning',
        description: 'Start your adventure',
        status: 'inactive',
      },
    },
  };
}

// ============================================================================
// Valid Patches
// ============================================================================

/** A valid patch that creates a new map with a layer and entities. */
export function createValidPatch(): PatchV1 {
  return {
    patchVersion: 1,
    patchId: 'test-patch-001',
    baseSchemaVersion: 1,
    meta: {
      author: 'AI',
      createdAt: '2026-01-01T00:00:00Z',
      note: 'Create a forest map with NPCs',
    },
    ops: [
      {
        op: 'createMap',
        map: {
          id: 'forest01',
          name: 'Dark Forest',
          tilesetId: 'overworld',
          width: 8,
          height: 8,
        },
      },
      {
        op: 'createLayer',
        mapId: 'forest01',
        layer: { id: 'ground', name: 'Ground', z: 0 },
        fillTileId: 5,
      },
      {
        op: 'createEntityDef',
        entity: {
          id: 'npc_ranger',
          kind: 'npc',
          sprite: { tilesetId: 'characters', tileId: 8 },
          name: 'Forest Ranger',
        },
      },
      {
        op: 'placeEntity',
        mapId: 'forest01',
        instance: {
          id: 'ranger_1',
          entityId: 'npc_ranger',
          x: 4,
          y: 4,
        },
      },
    ],
  };
}

/** A valid patch as raw JSON text (what AI would return). */
export function createValidPatchJson(): string {
  return JSON.stringify(createValidPatch());
}

/** A patch with too many operations (exceeds guardrails). */
export function createOversizedPatch(): PatchV1 {
  const ops = [];
  for (let i = 0; i < 50; i++) {
    ops.push({
      op: 'paintRect' as const,
      mapId: 'town01',
      layerId: 'ground',
      x: 1,
      y: 1,
      w: 1,
      h: 1,
      tileId: 2,
    });
  }
  return {
    patchVersion: 1,
    patchId: 'test-oversized-001',
    baseSchemaVersion: 1,
    ops,
  };
}

/** A patch with destructive delete operations. */
export function createDestructivePatch(): PatchV1 {
  return {
    patchVersion: 1,
    patchId: 'test-destructive-001',
    baseSchemaVersion: 1,
    ops: [
      {
        op: 'deleteEntity',
        mapId: 'town01',
        instanceId: 'guard_1',
      },
      {
        op: 'deleteEntity',
        mapId: 'town01',
        instanceId: 'merchant_1',
      },
    ],
  };
}

// ============================================================================
// Invalid Patches / AI Responses
// ============================================================================

/** AI response with valid JSON but invalid PatchV1 structure. */
export const INVALID_PATCH_RESPONSE = JSON.stringify({
  invalid: 'not a patch',
  missing: 'required fields',
});

/** AI response with mixed content (JSON + commentary). */
export const MIXED_CONTENT_RESPONSE = `Here is the patch I generated:

\`\`\`json
${JSON.stringify(createValidPatch())}
\`\`\`

I hope this helps!`;

/** AI response with plain text (no JSON). */
export const PLAIN_TEXT_RESPONSE =
  'I would suggest creating a new map with some trees and a river.';

// ============================================================================
// Test Summary
// ============================================================================

/** A pre-built project summary for testing. */
export function createTestSummary(): ProjectSummary {
  return {
    schemaVersion: 1,
    constraints: createDefaultGuardrails(),
    tilesets: [
      {
        id: 'characters',
        tileCount: 64,
        imagePath: 'assets/tilesets/characters.png',
        tileWidth: 16,
        tileHeight: 16,
      },
      {
        id: 'overworld',
        tileCount: 256,
        imagePath: 'assets/tilesets/overworld.png',
        tileWidth: 16,
        tileHeight: 16,
      },
    ],
    maps: [
      {
        id: 'town01',
        width: 10,
        height: 10,
        tilesetId: 'overworld',
        layerIds: ['ground', 'decoration'],
        entityCount: 2,
        triggerCount: 1,
      },
    ],
    entityDefs: [
      {
        typeId: 'npc_guard',
        instanceCount: 1,
        hasDialogue: true,
        isInteractive: true,
        spriteRef: 'characters:0',
      },
      {
        typeId: 'npc_merchant',
        instanceCount: 1,
        hasDialogue: true,
        isInteractive: true,
        spriteRef: 'characters:4',
      },
    ],
    dialogueIds: ['guard_greeting', 'merchant_greeting'],
    questIds: ['main_quest'],
    triggers: [
      {
        id: 'town_entrance',
        mapId: 'town01',
        eventType: 'showMessage',
      },
    ],
    tokenEstimate: 450,
  };
}

// ============================================================================
// Guardrail Configs
// ============================================================================

/** Default guardrail configuration for tests. */
export function createDefaultGuardrails(): GuardrailConfig {
  return {
    maxOps: 40,
    maxTileEdits: 20000,
    maxCollisionEdits: 20000,
    allowDestructive: false,
    requireConfirmationThreshold: 20,
  };
}

/** Relaxed guardrail configuration for tests. */
export function createRelaxedGuardrails(): GuardrailConfig {
  return {
    maxOps: 100,
    maxTileEdits: 50000,
    maxCollisionEdits: 50000,
    allowDestructive: true,
    requireConfirmationThreshold: 50,
  };
}
