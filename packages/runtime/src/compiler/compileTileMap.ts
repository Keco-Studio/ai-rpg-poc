/**
 * Tile map compiler.
 *
 * Converts schema TileLayer data into Excalibur TileMap entities.
 * Each non-zero tile index gets assigned its corresponding sprite graphic.
 */

import { TileMap, type Sprite, type SpriteSheet } from 'excalibur';
import type { GameMap, TileLayer } from '@ai-rpg-maker/shared';
import { getTileSprite } from '../loader/loadAssets.js';

/**
 * Compiles a TileLayer from the schema into an Excalibur TileMap.
 *
 * - Creates a TileMap matching map dimensions
 * - Iterates tile data and assigns sprites to non-zero tiles
 * - Sets renderFromTopOfGraphic to false for proper pixel alignment
 *
 * @param map - The game map containing dimensions
 * @param layer - The tile layer to compile
 * @param spriteSheet - SpriteSheet from the tileset
 * @param tileSize - Tile size in pixels
 * @returns Configured Excalibur TileMap
 */
export function compileTileMap(
  map: GameMap,
  layer: TileLayer,
  spriteSheet: SpriteSheet,
  tileSize: number,
): TileMap {
  const tileMap = new TileMap({
    rows: map.height,
    columns: map.width,
    tileWidth: tileSize,
    tileHeight: tileSize,
  });

  // Set z-index from layer definition
  tileMap.z = layer.zIndex;

  // Note: TileMap opacity is handled per-tile if needed in future versions.
  // For v1, we rely on full opacity layers (opacity < 1 is a visual-only concern).

  // Iterate tile data and assign graphics to non-zero tiles
  for (let i = 0; i < layer.data.length; i++) {
    const tileIndex = layer.data[i];
    if (tileIndex === 0) continue; // Skip empty tiles

    const sprite = getTileSprite(spriteSheet, tileIndex);
    if (sprite) {
      const tile = tileMap.tiles[i];
      if (tile) {
        tile.addGraphic(sprite);
      }
    }
  }

  return tileMap;
}
