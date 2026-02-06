/**
 * Demo Project Factory
 *
 * Creates a hardcoded demo project with one tileset, one map (16×16),
 * one tile layer, one entity def, and one entity instance.
 * Sufficient for testing all editor tools.
 *
 * Note: IDs use hyphens instead of colons to avoid conflict with
 * the hunk ref format used by conflict detection (which uses colons
 * as delimiters).
 */

import type { Project } from '@ai-rpg-maker/shared';

export function createDemoProject(): Project {
  const mapWidth = 16;
  const mapHeight = 16;
  const tileCount = mapWidth * mapHeight;

  // Create a simple grass floor pattern (tile ID 1 everywhere)
  const groundData = new Array(tileCount).fill(1);

  // Create empty collision layer
  const collisionLayer = new Array(tileCount).fill(0);

  return {
    version: 1,
    metadata: {
      name: 'Demo Project',
      author: 'AI RPG Maker',
      description: 'A demo project for editor testing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    config: {
      startingMap: 'demo-map',
      playerSpawn: { x: 8, y: 8 },
      tileSize: 16,
      viewportSize: { width: 16, height: 12 },
    },
    tilesets: {
      'demo-tileset': {
        id: 'demo-tileset',
        name: 'Demo Tileset',
        imagePath: 'assets/demo-tileset.png',
        tileWidth: 16,
        tileHeight: 16,
        tileCount: 64,
        columns: 8,
      },
    },
    maps: {
      'demo-map': {
        id: 'demo-map',
        name: 'Demo Map',
        width: mapWidth,
        height: mapHeight,
        tilesetId: 'demo-tileset',
        tileLayers: {
          ground: {
            name: 'Ground',
            data: groundData,
            zIndex: 0,
            opacity: 1,
            visible: true,
          },
        },
        collisionLayer,
        entities: [
          {
            instanceId: 'guard-1',
            entityDefId: 'guard-entity',
            position: { x: 5, y: 5 },
          },
        ],
        triggers: [
          {
            id: 'entrance-trigger',
            name: 'Entrance Trigger',
            bounds: { x: 0, y: 7, width: 1, height: 2 },
            events: {
              onEnter: [
                {
                  type: 'showMessage',
                  data: { message: 'Welcome to the demo!' },
                },
              ],
            },
            activation: {},
          },
        ],
      },
    },
    entityDefs: {
      'guard-entity': {
        id: 'guard-entity',
        type: 'npc',
        name: 'Guard',
        sprite: {
          tilesetId: 'demo-tileset',
          tileIndex: 32,
        },
        interaction: {
          type: 'dialogue',
          data: { dialogueId: 'guard-greeting' },
        },
      },
    },
    dialogues: {
      'guard-greeting': {
        id: 'guard-greeting',
        name: 'Guard Greeting',
        rootNodeId: 'start',
        nodes: {
          start: {
            id: 'start',
            speaker: 'Guard',
            text: 'Halt! Who goes there?',
            choices: [
              { text: 'A friend.', next: 'friend' },
              { text: 'None of your business.', next: null },
            ],
          },
          friend: {
            id: 'friend',
            speaker: 'Guard',
            text: 'Very well. You may pass.',
            next: null,
          },
        },
      },
    },
    quests: {},
  };
}
