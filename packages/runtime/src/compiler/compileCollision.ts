/**
 * Collision layer compiler.
 *
 * Converts the schema collision layer array into a collision checking system.
 * Collision values: 0 = walkable, 1 = blocked.
 */

import type { GameMap } from '@ai-rpg-maker/shared';

/**
 * Collision checker that provides fast lookups for tile collision state.
 */
export interface CollisionChecker {
  /** Check if a tile position is blocked */
  isBlocked: (x: number, y: number) => boolean;
  /** Check if a tile position is within map bounds */
  isInBounds: (x: number, y: number) => boolean;
  /** Check if a tile position is walkable (in bounds and not blocked) */
  isWalkable: (x: number, y: number) => boolean;
  /** Map width in tiles */
  width: number;
  /** Map height in tiles */
  height: number;
}

/**
 * Creates a collision checker from a map's collision layer.
 *
 * @param map - Game map with collision layer data
 * @returns CollisionChecker with lookup methods
 */
export function compileCollision(map: GameMap): CollisionChecker {
  const { collisionLayer, width, height } = map;

  function isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < width && y >= 0 && y < height;
  }

  function isBlocked(x: number, y: number): boolean {
    if (!isInBounds(x, y)) return true;
    const index = y * width + x;
    return collisionLayer[index] === 1;
  }

  function isWalkable(x: number, y: number): boolean {
    return isInBounds(x, y) && !isBlocked(x, y);
  }

  return {
    isBlocked,
    isInBounds,
    isWalkable,
    width,
    height,
  };
}
