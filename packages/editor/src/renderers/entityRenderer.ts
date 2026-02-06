/**
 * Entity Renderer
 *
 * Draws each entity instance as a colored rectangle with entity type label.
 * Placeholder sprites; real sprites deferred.
 */

import type { GameMap, EntityDef } from '@ai-rpg-maker/shared';

/**
 * Render entity instances on the map.
 */
export function renderEntities(
  ctx: CanvasRenderingContext2D,
  map: GameMap,
  entityDefs: Record<string, EntityDef>,
  tileSize: number,
): void {
  for (const entity of map.entities) {
    const def = entityDefs[entity.entityDefId];
    const px = entity.position.x * tileSize;
    const py = entity.position.y * tileSize;

    // Draw colored rectangle
    ctx.fillStyle = def ? getEntityColor(def.type) : '#a6e3a1';
    ctx.globalAlpha = 0.8;
    ctx.fillRect(px + 1, py + 1, tileSize - 2, tileSize - 2);

    // Draw border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 1, py + 1, tileSize - 2, tileSize - 2);

    // Draw label
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#1e1e2e';
    ctx.font = `bold ${Math.max(7, tileSize / 3)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = def ? def.name.charAt(0).toUpperCase() : '?';
    ctx.fillText(label, px + tileSize / 2, py + tileSize / 2);
  }

  ctx.globalAlpha = 1;
}

function getEntityColor(type: string): string {
  switch (type) {
    case 'npc': return '#89b4fa';
    case 'door': return '#fab387';
    case 'item': return '#f9e2af';
    case 'decoration': return '#a6e3a1';
    default: return '#cba6f7';
  }
}
