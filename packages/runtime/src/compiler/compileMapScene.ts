/**
 * Map scene compiler.
 *
 * Creates an Excalibur Scene from a GameMap schema definition.
 * Compiles all tile layers (sorted by zIndex), collision, entities, and triggers.
 */

import { Scene, type Engine, type SpriteSheet } from 'excalibur';
import type { GameMap, Project } from '@ai-rpg-maker/shared';
import { compileTileMap } from './compileTileMap.js';
import { compileCollision } from './compileCollision.js';
import { compileEntities } from './compileEntities.js';
import { compileTriggers } from './compileTriggers.js';
import type { DebugOverlay } from '../ui/debugOverlay.js';

/**
 * Compiles a GameMap into an Excalibur Scene.
 *
 * - Compiles tile layers sorted by zIndex and adds to scene
 * - Compiles collision layer for movement checking
 * - Compiles entity instances into Actors
 * - Compiles trigger regions into event handlers
 * - Sets up per-frame trigger checking
 *
 * @param engine - Excalibur engine instance
 * @param map - GameMap schema to compile
 * @param project - Full project for cross-references
 * @param spriteSheet - SpriteSheet from tileset
 * @param tileSize - Tile size in pixels
 * @param debugOverlay - Debug overlay for UI feedback
 * @returns Configured Excalibur Scene
 */
export function compileMapScene(
  engine: Engine,
  map: GameMap,
  project: Project,
  spriteSheet: SpriteSheet,
  tileSize: number,
  debugOverlay: DebugOverlay,
): Scene {
  const scene = new Scene();

  // Compile and add tile layers sorted by zIndex
  const sortedLayers = Object.values(map.tileLayers)
    .filter((layer) => layer.visible)
    .sort((a, b) => a.zIndex - b.zIndex);

  for (const layer of sortedLayers) {
    const tileMap = compileTileMap(map, layer, spriteSheet, tileSize);
    scene.add(tileMap);
  }

  // Compile collision
  const collision = compileCollision(map);

  // Compile entities (player + NPCs)
  const { player, npcs } = compileEntities(
    map,
    project,
    spriteSheet,
    tileSize,
    collision,
    debugOverlay,
  );

  // Add NPCs to scene
  for (const npc of npcs) {
    scene.add(npc);
  }

  // Add player to scene
  if (player) {
    scene.add(player);

    // Camera follows player
    scene.camera.strategy.lockToActor(player);
  }

  // Compile triggers
  const triggerSystem = compileTriggers(map, project, debugOverlay);

  // Set up per-frame trigger checking
  scene.on('preupdate', () => {
    if (player) {
      const playerTileX = Math.floor(player.pos.x / tileSize);
      const playerTileY = Math.floor(player.pos.y / tileSize);
      triggerSystem.update(playerTileX, playerTileY);
    }
  });

  return scene;
}
