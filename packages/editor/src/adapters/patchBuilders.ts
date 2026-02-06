/**
 * Patch Builders — Convert tool gestures to PatchOp arrays
 *
 * Implements the PatchBuilder interface from contracts.
 * Includes rectangle detection optimization:
 * - If cells form a filled rectangle → emit paintRect / setCollisionRect
 * - Otherwise → emit setTiles / setCollisionCells
 */

import type { PatchOp } from '@ai-rpg-maker/shared';
import type { CellChange } from '../state/types.js';

// ---------------------------------------------------------------------------
// Rectangle Detection
// ---------------------------------------------------------------------------

interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function computeBoundingBox(cells: CellChange[]): BoundingBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const cell of cells) {
    if (cell.x < minX) minX = cell.x;
    if (cell.y < minY) minY = cell.y;
    if (cell.x > maxX) maxX = cell.x;
    if (cell.y > maxY) maxY = cell.y;
  }

  return { minX, minY, maxX, maxY };
}

function isFilledRectangle(cells: CellChange[]): boolean {
  if (cells.length === 0) return false;

  const { minX, minY, maxX, maxY } = computeBoundingBox(cells);
  const expectedCount = (maxX - minX + 1) * (maxY - minY + 1);

  if (cells.length !== expectedCount) return false;

  // Check for unique coordinates
  const seen = new Set<string>();
  for (const cell of cells) {
    const key = `${cell.x},${cell.y}`;
    if (seen.has(key)) return false;
    seen.add(key);
  }

  return true;
}

function allSameValue(cells: CellChange[]): boolean {
  if (cells.length === 0) return true;
  const firstValue = cells[0].value;
  return cells.every((c) => c.value === firstValue);
}

// ---------------------------------------------------------------------------
// Tile Operations
// ---------------------------------------------------------------------------

/**
 * Build PatchOps from accumulated brush/erase cell changes.
 * Uses rectangle detection: if all cells form a filled rectangle
 * with the same tile value, emits a single paintRect op.
 */
export function buildTileOps(
  cells: CellChange[],
  mapId: string,
  layerId: string,
  tileId: number,
): PatchOp[] {
  if (cells.length === 0) return [];

  // For erase, all values should be 0; for brush, use tileId
  const isErase = cells.every((c) => c.value === 0);

  if (isErase) {
    // Emit clearTiles op
    return [
      {
        op: 'clearTiles',
        mapId,
        layerId,
        cells: cells.map((c) => ({ x: c.x, y: c.y })),
      },
    ];
  }

  // Check if cells form a filled rectangle with uniform value
  if (isFilledRectangle(cells) && allSameValue(cells)) {
    const { minX, minY, maxX, maxY } = computeBoundingBox(cells);
    return [
      {
        op: 'paintRect',
        mapId,
        layerId,
        x: minX,
        y: minY,
        w: maxX - minX + 1,
        h: maxY - minY + 1,
        tileId: cells[0].value,
      },
    ];
  }

  // Emit setTiles op with all cells
  return [
    {
      op: 'setTiles',
      mapId,
      layerId,
      cells: cells.map((c) => ({ x: c.x, y: c.y, tileId: c.value })),
    },
  ];
}

// ---------------------------------------------------------------------------
// Collision Operations
// ---------------------------------------------------------------------------

/**
 * Build PatchOps from accumulated collision cell changes.
 * Uses rectangle detection with setCollisionRect optimization.
 */
export function buildCollisionOps(
  cells: CellChange[],
  mapId: string,
): PatchOp[] {
  if (cells.length === 0) return [];

  // Check if cells form a filled rectangle with uniform value
  if (isFilledRectangle(cells) && allSameValue(cells)) {
    const { minX, minY, maxX, maxY } = computeBoundingBox(cells);
    const solidValue = cells[0].value as 0 | 1;
    return [
      {
        op: 'setCollisionRect',
        mapId,
        x: minX,
        y: minY,
        w: maxX - minX + 1,
        h: maxY - minY + 1,
        solid: solidValue,
      },
    ];
  }

  // Emit setCollisionCells
  return [
    {
      op: 'setCollisionCells',
      mapId,
      cells: cells.map((c) => ({
        x: c.x,
        y: c.y,
        solid: (c.value as 0 | 1),
      })),
    },
  ];
}

// ---------------------------------------------------------------------------
// Rectangle Fill
// ---------------------------------------------------------------------------

/**
 * Build a PatchOp for rectangle fill.
 */
export function buildRectFillOp(
  mapId: string,
  layerId: string,
  tileId: number,
  x: number,
  y: number,
  width: number,
  height: number,
): PatchOp {
  return {
    op: 'paintRect',
    mapId,
    layerId,
    x,
    y,
    w: width,
    h: height,
    tileId,
  };
}

// ---------------------------------------------------------------------------
// Entity Operations
// ---------------------------------------------------------------------------

/**
 * Build a PatchOp for placing an entity.
 */
export function buildPlaceEntityOp(
  mapId: string,
  entityDefId: string,
  x: number,
  y: number,
): PatchOp {
  const instanceId = `instance-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    op: 'placeEntity',
    mapId,
    instance: {
      id: instanceId,
      entityId: entityDefId,
      x,
      y,
    },
  };
}

/**
 * Build a PatchOp for moving an entity.
 */
export function buildMoveEntityOp(
  mapId: string,
  instanceId: string,
  x: number,
  y: number,
): PatchOp {
  return {
    op: 'moveEntity',
    mapId,
    instanceId,
    x,
    y,
  };
}

/**
 * Build a PatchOp for deleting an entity.
 */
export function buildDeleteEntityOp(
  mapId: string,
  instanceId: string,
): PatchOp {
  return {
    op: 'deleteEntity',
    mapId,
    instanceId,
  };
}

// ---------------------------------------------------------------------------
// Trigger Operations
// ---------------------------------------------------------------------------

/**
 * Build a PatchOp for creating a trigger region.
 */
export function buildCreateTriggerOp(
  mapId: string,
  triggerId: string,
  bounds: { x: number; y: number; width: number; height: number },
): PatchOp {
  return {
    op: 'createTrigger',
    mapId,
    trigger: {
      id: triggerId,
      rect: { x: bounds.x, y: bounds.y, w: bounds.width, h: bounds.height },
    },
  };
}
