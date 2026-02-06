/**
 * Trigger Renderer
 *
 * Draws each trigger region as a dashed-border rectangle with name label.
 */

import type { GameMap } from '@ai-rpg-maker/shared';

/**
 * Render trigger regions on the map.
 */
export function renderTriggers(
  ctx: CanvasRenderingContext2D,
  map: GameMap,
  tileSize: number,
): void {
  for (const trigger of map.triggers) {
    const px = trigger.bounds.x * tileSize;
    const py = trigger.bounds.y * tileSize;
    const pw = trigger.bounds.width * tileSize;
    const ph = trigger.bounds.height * tileSize;

    // Semi-transparent fill
    ctx.fillStyle = 'rgba(203, 166, 247, 0.15)';
    ctx.fillRect(px, py, pw, ph);

    // Dashed border
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = '#cba6f7';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
    ctx.setLineDash([]);

    // Label
    ctx.fillStyle = '#cba6f7';
    ctx.font = `${Math.max(8, tileSize / 3)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(trigger.name, px + 2, py + 2);
  }
}
