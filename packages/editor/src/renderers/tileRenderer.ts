/**
 * Tile Layer Renderer
 *
 * Draws all tile layers bottom-up by zIndex on a Canvas 2D context.
 * Uses imageSmoothingEnabled = false for pixel-crisp rendering.
 */

import type { GameMap, Tileset } from '@ai-rpg-maker/shared';

/**
 * Render all tile layers of a map.
 *
 * @param ctx - Canvas 2D rendering context
 * @param map - The map to render
 * @param tileset - The tileset used by this map
 * @param tilesetImage - Loaded tileset HTMLImageElement (null if not loaded)
 * @param activeLayerId - Currently active layer (rendered at full opacity; others dimmed)
 */
export function renderTileLayers(
  ctx: CanvasRenderingContext2D,
  map: GameMap,
  tileset: Tileset,
  tilesetImage: HTMLImageElement | null,
  activeLayerId: string | null,
): void {
  ctx.imageSmoothingEnabled = false;

  const tileW = tileset.tileWidth;
  const tileH = tileset.tileHeight;
  const cols = tileset.columns;

  // Sort layers by zIndex
  const layerEntries = Object.entries(map.tileLayers)
    .sort(([, a], [, b]) => a.zIndex - b.zIndex);

  for (const [layerId, layer] of layerEntries) {
    if (!layer.visible) continue;

    // Dim inactive layers when there's an active layer
    const isActive = layerId === activeLayerId;
    if (activeLayerId && !isActive) {
      ctx.globalAlpha = 0.4 * layer.opacity;
    } else {
      ctx.globalAlpha = layer.opacity;
    }

    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tileId = layer.data[y * map.width + x];
        if (tileId === 0) continue; // Skip empty tiles

        if (tilesetImage) {
          // Draw from tileset image
          const srcX = ((tileId - 1) % cols) * tileW;
          const srcY = Math.floor((tileId - 1) / cols) * tileH;
          ctx.drawImage(
            tilesetImage,
            srcX, srcY, tileW, tileH,
            x * tileW, y * tileH, tileW, tileH,
          );
        } else {
          // Fallback: colored rectangles
          const hue = (tileId * 37) % 360;
          ctx.fillStyle = `hsl(${hue}, 60%, 50%)`;
          ctx.fillRect(x * tileW, y * tileH, tileW, tileH);

          // Draw tile ID text
          ctx.fillStyle = '#fff';
          ctx.font = `${Math.max(8, tileW / 3)}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            String(tileId),
            x * tileW + tileW / 2,
            y * tileH + tileH / 2,
          );
        }
      }
    }
  }

  ctx.globalAlpha = 1;
}

/**
 * Render the grid overlay for tile boundaries.
 */
export function renderGrid(
  ctx: CanvasRenderingContext2D,
  map: GameMap,
  tileSize: number,
): void {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 0.5;

  for (let x = 0; x <= map.width; x++) {
    ctx.beginPath();
    ctx.moveTo(x * tileSize, 0);
    ctx.lineTo(x * tileSize, map.height * tileSize);
    ctx.stroke();
  }

  for (let y = 0; y <= map.height; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * tileSize);
    ctx.lineTo(map.width * tileSize, y * tileSize);
    ctx.stroke();
  }
}
