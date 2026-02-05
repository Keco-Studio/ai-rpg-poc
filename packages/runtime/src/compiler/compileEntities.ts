/**
 * Entity compiler.
 *
 * Converts schema EntityInstance definitions into Excalibur Actors.
 * Handles player creation with keyboard input, NPC rendering, and interaction.
 */

import { Actor, type Engine, Keys, type SpriteSheet, Vector } from 'excalibur';
import type { GameMap, EntityInstance, Project } from '@ai-rpg-maker/shared';
import { getTileSprite } from '../loader/loadAssets.js';
import type { CollisionChecker } from './compileCollision.js';
import type { DebugOverlay } from '../ui/debugOverlay.js';

/** Movement speed in pixels per second */
const MOVE_SPEED = 160;
/** Tile movement duration in ms */
const TILE_MOVE_DURATION = 100;

export interface CompiledEntities {
  /** The player actor (if player entity exists) */
  player: Actor | null;
  /** All NPC/entity actors */
  npcs: Actor[];
}

/**
 * Compiles entity instances into Excalibur Actors.
 *
 * @param map - The game map containing entity instances
 * @param project - Full project for entity def lookups
 * @param spriteSheet - SpriteSheet for sprites
 * @param tileSize - Tile size in pixels
 * @param collision - Collision checker for movement
 * @param debugOverlay - Debug overlay for interaction feedback
 * @returns Compiled player and NPC actors
 */
export function compileEntities(
  map: GameMap,
  project: Project,
  spriteSheet: SpriteSheet,
  tileSize: number,
  collision: CollisionChecker,
  debugOverlay: DebugOverlay,
): CompiledEntities {
  const npcs: Actor[] = [];

  // Compile NPC/entity actors
  for (const entityInstance of map.entities) {
    const entityDef = project.entityDefs[entityInstance.entityDefId];
    if (!entityDef) continue;

    const actor = new Actor({
      pos: new Vector(
        entityInstance.position.x * tileSize + tileSize / 2,
        entityInstance.position.y * tileSize + tileSize / 2,
      ),
      width: tileSize,
      height: tileSize,
    });

    const sprite = getTileSprite(spriteSheet, entityDef.sprite.tileIndex);
    if (sprite) {
      actor.graphics.use(sprite);
    }

    // Store entity data for interaction
    (actor as unknown as Record<string, unknown>)['entityInstance'] = entityInstance;
    (actor as unknown as Record<string, unknown>)['entityDef'] = entityDef;

    npcs.push(actor);
  }

  // Create player actor
  const playerSpawn = project.config.playerSpawn;
  const playerDef = Object.values(project.entityDefs).find(
    (def) => def.sprite.tileIndex === 8, // Player tile index
  );

  const player = new Actor({
    pos: new Vector(
      playerSpawn.x * tileSize + tileSize / 2,
      playerSpawn.y * tileSize + tileSize / 2,
    ),
    width: tileSize,
    height: tileSize,
  });

  // Set player sprite (tile index 8)
  const playerSprite = getTileSprite(spriteSheet, 8);
  if (playerSprite) {
    player.graphics.use(playerSprite);
  }

  // Player tile position tracking
  let playerTileX = playerSpawn.x;
  let playerTileY = playerSpawn.y;
  let isMoving = false;

  /**
   * Attempts to move player by one tile in the given direction.
   */
  function tryMove(dx: number, dy: number): void {
    if (isMoving) return;

    const targetX = playerTileX + dx;
    const targetY = playerTileY + dy;

    if (!collision.isWalkable(targetX, targetY)) return;

    isMoving = true;
    playerTileX = targetX;
    playerTileY = targetY;

    const targetPos = new Vector(
      targetX * tileSize + tileSize / 2,
      targetY * tileSize + tileSize / 2,
    );

    player.actions.moveTo(targetPos, MOVE_SPEED).callMethod(() => {
      isMoving = false;
    });
  }

  /**
   * Finds NPCs within interaction range (1 tile) of player.
   */
  function findNearbyNPC(): Actor | null {
    for (const npc of npcs) {
      const npcData = (npc as unknown as Record<string, unknown>)['entityInstance'] as EntityInstance;
      if (!npcData) continue;

      const distX = Math.abs(npcData.position.x - playerTileX);
      const distY = Math.abs(npcData.position.y - playerTileY);

      if (distX + distY <= 1) {
        return npc;
      }
    }
    return null;
  }

  /**
   * Handles NPC interaction - shows dialogue or custom message.
   */
  function handleInteraction(): void {
    const npc = findNearbyNPC();
    if (!npc) return;

    const entityDef = (npc as unknown as Record<string, unknown>)['entityDef'] as Record<string, unknown>;
    const interaction = entityDef['interaction'] as Record<string, unknown> | undefined;
    if (!interaction) return;

    if (interaction['type'] === 'dialogue') {
      const data = interaction['data'] as Record<string, string>;
      const dialogueId = data['dialogueId'];
      const dialogue = project.dialogues[dialogueId];
      if (dialogue) {
        const rootNode = dialogue.nodes[dialogue.rootNodeId];
        if (rootNode) {
          debugOverlay.show(`${rootNode.speaker}: ${rootNode.text}`);
        }
      }
    } else if (interaction['type'] === 'custom') {
      const data = interaction['data'] as Record<string, string>;
      debugOverlay.show(data['message']);
    }
  }

  // Set up keyboard input handlers
  player.on('preupdate', (evt) => {
    const engine = evt.engine;

    // Movement: Arrow keys and WASD
    if (engine.input.keyboard.isHeld(Keys.ArrowUp) || engine.input.keyboard.isHeld(Keys.W)) {
      tryMove(0, -1);
    } else if (engine.input.keyboard.isHeld(Keys.ArrowDown) || engine.input.keyboard.isHeld(Keys.S)) {
      tryMove(0, 1);
    } else if (engine.input.keyboard.isHeld(Keys.ArrowLeft) || engine.input.keyboard.isHeld(Keys.A)) {
      tryMove(-1, 0);
    } else if (engine.input.keyboard.isHeld(Keys.ArrowRight) || engine.input.keyboard.isHeld(Keys.D)) {
      tryMove(1, 0);
    }

    // Interaction: Spacebar and E key
    if (
      engine.input.keyboard.wasPressed(Keys.Space) ||
      engine.input.keyboard.wasPressed(Keys.E)
    ) {
      handleInteraction();
    }
  });

  // Set player z-index above tile layers
  player.z = 100;

  return {
    player,
    npcs,
  };
}
