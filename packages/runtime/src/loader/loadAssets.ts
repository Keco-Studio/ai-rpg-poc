/**
 * Asset loading for the RPG runtime.
 *
 * Handles fetching project JSON, validating it, loading tileset images,
 * and slicing tilesets into individual tile sprites.
 */

import {
  validateProject,
  type Project,
  type Tileset,
  type ValidationError,
} from '@ai-rpg-maker/shared';
import { ImageSource, SpriteSheet, Sprite, ImageFiltering } from 'excalibur';

/**
 * Loads and validates a project from a JSON URL.
 *
 * @param url - URL to the project JSON file
 * @returns Validated Project object
 * @throws Error with validation details if project is invalid
 */
export async function loadProject(url: string): Promise<Project> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch project: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const result = validateProject(data);

  if (!result.valid) {
    showErrorOverlay(result.errors);
    throw new Error(
      `Project validation failed with ${result.errors.length} error(s):\n` +
        result.errors.map((e) => `  [${e.code}] ${e.message}`).join('\n'),
    );
  }

  return data as Project;
}

/**
 * Loads a tileset image from its imagePath.
 *
 * @param tileset - Tileset definition with imagePath
 * @param basePath - Base path to resolve relative image paths
 * @returns Loaded ImageSource
 */
export async function loadTilesetImage(
  tileset: Tileset,
  basePath: string,
): Promise<ImageSource> {
  const fullPath = `${basePath}/${tileset.imagePath}`;
  const imageSource = new ImageSource(fullPath, false, ImageFiltering.Pixel);
  await imageSource.load();
  return imageSource;
}

/**
 * Slices a tileset image into individual tile sprites.
 * Returns a SpriteSheet that can be used to get sprites by tile index.
 *
 * @param imageSource - Loaded tileset image
 * @param tileset - Tileset definition with dimensions
 * @returns SpriteSheet indexed by tile position
 */
export function sliceTileset(
  imageSource: ImageSource,
  tileset: Tileset,
): SpriteSheet {
  const rows = Math.ceil(tileset.tileCount / tileset.columns);

  return SpriteSheet.fromImageSource({
    image: imageSource,
    grid: {
      rows,
      columns: tileset.columns,
      spriteWidth: tileset.tileWidth,
      spriteHeight: tileset.tileHeight,
    },
  });
}

/**
 * Gets a specific sprite from a sprite sheet by tile index.
 *
 * @param spriteSheet - The sprite sheet to get the sprite from
 * @param tileIndex - The tile index (0-based)
 * @returns The sprite at the given tile index, or undefined if out of bounds
 */
export function getTileSprite(
  spriteSheet: SpriteSheet,
  tileIndex: number,
): Sprite | undefined {
  const col = tileIndex % spriteSheet.columns;
  const row = Math.floor(tileIndex / spriteSheet.columns);
  return spriteSheet.getSprite(col, row);
}

/**
 * Displays validation errors in the error overlay.
 */
function showErrorOverlay(errors: ValidationError[]): void {
  const overlay = document.getElementById('error-overlay');
  const errorList = document.getElementById('error-list');
  if (!overlay || !errorList) return;

  errorList.innerHTML = errors
    .map(
      (err) => `
    <div class="error-item">
      <div class="error-code">[${err.code}]</div>
      <div>${err.message}</div>
      <div class="error-path">Path: ${err.path}</div>
      ${err.suggestion ? `<div class="error-suggestion">Suggestion: ${err.suggestion}</div>` : ''}
    </div>
  `,
    )
    .join('');

  overlay.style.display = 'block';
}
