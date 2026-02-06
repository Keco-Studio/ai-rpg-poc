/**
 * useMapInteraction — Mouse/keyboard handlers for map viewport
 *
 * Handles: mousedown/mousemove/mouseup for brush/erase/collision/rect/entity/trigger tools.
 */

import { useCallback, useRef } from 'react';
import type { ToolType, CellChange } from '../state/types.js';
import type { PatchOp } from '@ai-rpg-maker/shared';
import {
  buildPlaceEntityOp,
  buildMoveEntityOp,
  buildDeleteEntityOp,
  buildCreateTriggerOp,
} from '../adapters/patchBuilders.js';

export interface UseMapInteractionOptions {
  activeTool: ToolType;
  selectedTileId: number;
  selectedEntityDefId: string | null;
  mapId: string;
  layerId: string | null;
  mapWidth: number;
  mapHeight: number;
  tileSize: number;
  onBeginTransaction: () => void;
  onAddCells: (cells: CellChange[]) => void;
  onAddOps: (ops: PatchOp[]) => void;
  onCommitTransaction: (pendingCells?: CellChange[], pendingOps?: PatchOp[]) => void;
  onCancelTransaction: () => void;
}

export interface MapInteractionHandlers {
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

/**
 * Convert mouse position to tile coordinates.
 */
function mouseToTile(
  e: React.MouseEvent<HTMLCanvasElement>,
  tileSize: number,
  panX: number,
  panY: number,
  zoom: number,
): { x: number; y: number } {
  const rect = e.currentTarget.getBoundingClientRect();
  const canvasX = (e.clientX - rect.left - panX) / zoom;
  const canvasY = (e.clientY - rect.top - panY) / zoom;
  return {
    x: Math.floor(canvasX / tileSize),
    y: Math.floor(canvasY / tileSize),
  };
}

export function useMapInteraction(
  options: UseMapInteractionOptions,
  panX: number,
  panY: number,
  zoom: number,
): MapInteractionHandlers {
  const isDragging = useRef(false);
  const lastTile = useRef<{ x: number; y: number } | null>(null);
  const rectStart = useRef<{ x: number; y: number } | null>(null);
  const paintedTiles = useRef(new Set<string>());

  const clampTile = useCallback(
    (tx: number, ty: number) => ({
      x: Math.max(0, Math.min(options.mapWidth - 1, tx)),
      y: Math.max(0, Math.min(options.mapHeight - 1, ty)),
    }),
    [options.mapWidth, options.mapHeight],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button === 1) return; // Middle button for panning handled elsewhere

      const tile = mouseToTile(e, options.tileSize, panX, panY, zoom);
      const clamped = clampTile(tile.x, tile.y);

      console.log('[useMapInteraction] mouseDown:', {
        tool: options.activeTool,
        tile: clamped,
        selectedTileId: options.selectedTileId,
        mapId: options.mapId,
        layerId: options.layerId,
      });

      isDragging.current = true;
      lastTile.current = clamped;
      paintedTiles.current.clear();

      if (
        options.activeTool === 'brush' ||
        options.activeTool === 'erase' ||
        options.activeTool === 'collision'
      ) {
        console.log('[useMapInteraction] starting brush/erase/collision transaction');
        options.onBeginTransaction();
        const value =
          options.activeTool === 'erase'
            ? 0
            : options.activeTool === 'collision'
              ? 1
              : options.selectedTileId;
        const key = `${clamped.x},${clamped.y}`;
        paintedTiles.current.add(key);
        console.log('[useMapInteraction] adding cell:', { x: clamped.x, y: clamped.y, value });
        options.onAddCells([{ x: clamped.x, y: clamped.y, value }]);
      } else if (options.activeTool === 'rect') {
        rectStart.current = clamped;
        options.onBeginTransaction();
      } else if (options.activeTool === 'entity') {
        if (options.selectedEntityDefId) {
          options.onBeginTransaction();
          const op = buildPlaceEntityOp(
            options.mapId,
            options.selectedEntityDefId,
            clamped.x,
            clamped.y,
          );
          // Pass ops directly to commit to avoid React state batching issues.
          options.onCommitTransaction(undefined, [op]);
          isDragging.current = false;
        }
      } else if (options.activeTool === 'trigger') {
        rectStart.current = clamped;
        options.onBeginTransaction();
      }
    },
    [options, panX, panY, zoom, clampTile],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDragging.current) return;

      const tile = mouseToTile(e, options.tileSize, panX, panY, zoom);
      const clamped = clampTile(tile.x, tile.y);

      if (
        options.activeTool === 'brush' ||
        options.activeTool === 'erase' ||
        options.activeTool === 'collision'
      ) {
        const key = `${clamped.x},${clamped.y}`;
        if (!paintedTiles.current.has(key)) {
          paintedTiles.current.add(key);
          const value =
            options.activeTool === 'erase'
              ? 0
              : options.activeTool === 'collision'
                ? 1
                : options.selectedTileId;
          options.onAddCells([{ x: clamped.x, y: clamped.y, value }]);
        }
      }

      lastTile.current = clamped;
    },
    [options, panX, panY, zoom, clampTile],
  );

  const onMouseUp = useCallback(
    (_e: React.MouseEvent<HTMLCanvasElement>) => {
      console.log('[useMapInteraction] mouseUp, isDragging:', isDragging.current, 'tool:', options.activeTool);
      if (!isDragging.current) return;
      isDragging.current = false;

      if (options.activeTool === 'rect' && rectStart.current && lastTile.current) {
        // Build cells for the rectangle
        const startX = Math.min(rectStart.current.x, lastTile.current.x);
        const startY = Math.min(rectStart.current.y, lastTile.current.y);
        const endX = Math.max(rectStart.current.x, lastTile.current.x);
        const endY = Math.max(rectStart.current.y, lastTile.current.y);

        const cells: CellChange[] = [];
        for (let y = startY; y <= endY; y++) {
          for (let x = startX; x <= endX; x++) {
            cells.push({ x, y, value: options.selectedTileId });
          }
        }
        rectStart.current = null;
        // Pass cells directly to commit to avoid React state batching issues —
        // dispatching ADD_CELLS then immediately committing would read stale state.
        options.onCommitTransaction(cells);
      } else if (
        options.activeTool === 'trigger' &&
        rectStart.current &&
        lastTile.current
      ) {
        const startX = Math.min(rectStart.current.x, lastTile.current.x);
        const startY = Math.min(rectStart.current.y, lastTile.current.y);
        const endX = Math.max(rectStart.current.x, lastTile.current.x);
        const endY = Math.max(rectStart.current.y, lastTile.current.y);
        const w = endX - startX + 1;
        const h = endY - startY + 1;

        const triggerId = `trigger-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const op = buildCreateTriggerOp(options.mapId, triggerId, {
          x: startX,
          y: startY,
          width: w,
          height: h,
        });
        rectStart.current = null;
        // Pass ops directly to commit to avoid React state batching issues.
        options.onCommitTransaction(undefined, [op]);
      } else if (
        options.activeTool === 'brush' ||
        options.activeTool === 'erase' ||
        options.activeTool === 'collision'
      ) {
        console.log('[useMapInteraction] committing brush/erase/collision transaction');
        options.onCommitTransaction();
      }

      paintedTiles.current.clear();
    },
    [options],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        isDragging.current = false;
        rectStart.current = null;
        paintedTiles.current.clear();
        options.onCancelTransaction();
      }
    },
    [options],
  );

  return { onMouseDown, onMouseMove, onMouseUp, onKeyDown };
}
