/**
 * Collision Overlay Renderer
 *
 * Draws semi-transparent red rectangles over collision=1 cells.
 */

import type { GameMap } from '@ai-rpg-maker/shared';

/**
 * Render the collision overlay on top of tile layers.
 *
 * @param ctx - Canvas 2D rendering context
 * @param map - The map containing the collision layer
 * @param tileSize - Size of each tile in pixels
 */
export function renderCollisionOverlay(
  ctx: CanvasRenderingContext2D,
  map: GameMap,
  tileSize: number,
): void {
  ctx.fillStyle = 'rgba(255, 50, 50, 0.35)';

  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const idx = y * map.width + x;
      if (map.collisionLayer[idx] === 1) {
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }
    }
  }

  // Draw X pattern on collision cells for clarity
  ctx.strokeStyle = 'rgba(255, 50, 50, 0.6)';
  ctx.lineWidth = 1;

  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const idx = y * map.width + x;
      if (map.collisionLayer[idx] === 1) {
        const px = x * tileSize;
        const py = y * tileSize;
        ctx.beginPath();
        ctx.moveTo(px + 2, py + 2);
        ctx.lineTo(px + tileSize - 2, py + tileSize - 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(px + tileSize - 2, py + 2);
        ctx.lineTo(px + 2, py + tileSize - 2);
        ctx.stroke();
      }
    }
  }
}
