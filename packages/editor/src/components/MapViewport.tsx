/**
 * MapViewport — Canvas-based map renderer + interaction handlers
 *
 * Renders tile layers via tileRenderer, collision overlay via collisionRenderer.
 * Supports pan (middle-click drag) and zoom (scroll wheel).
 * Uses requestAnimationFrame with dirty flag for redraws.
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { MapViewportProps } from './types.js';
import { renderTileLayers, renderGrid } from '../renderers/tileRenderer.js';
import { renderCollisionOverlay } from '../renderers/collisionRenderer.js';
import { renderEntities } from '../renderers/entityRenderer.js';
import { renderTriggers } from '../renderers/triggerRenderer.js';
import { useMapInteraction } from '../hooks/useMapInteraction.js';
import type { CellChange } from '../state/types.js';
import type { PatchOp } from '@ai-rpg-maker/shared';

interface InternalMapViewportProps extends MapViewportProps {
  onBeginTransaction: () => void;
  onAddCells: (cells: CellChange[]) => void;
  onAddOps: (ops: PatchOp[]) => void;
  onCommitTransaction: () => void;
  onCancelTransaction: () => void;
}

export function MapViewport({
  map,
  tileset,
  activeTool,
  selectedTileId,
  activeLayerId,
  selectedEntityDefId,
  entityDefs,
  onBeginTransaction,
  onAddCells,
  onAddOps,
  onCommitTransaction,
  onCancelTransaction,
}: InternalMapViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dirtyRef = useRef(true);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [zoom, setZoom] = useState(2);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

  const tileSize = tileset.tileWidth;

  const interaction = useMapInteraction(
    {
      activeTool,
      selectedTileId,
      selectedEntityDefId,
      mapId: map.id,
      layerId: activeLayerId,
      mapWidth: map.width,
      mapHeight: map.height,
      tileSize,
      onBeginTransaction,
      onAddCells,
      onAddOps,
      onCommitTransaction,
      onCancelTransaction,
    },
    panX,
    panY,
    zoom,
  );

  // Mark dirty when map/tool state changes
  useEffect(() => {
    dirtyRef.current = true;
  }, [map, activeTool, activeLayerId, selectedTileId, panX, panY, zoom]);

  // Render loop
  useEffect(() => {
    let animId: number;

    const render = () => {
      if (dirtyRef.current && canvasRef.current) {
        dirtyRef.current = false;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size to fill container
        const parent = canvas.parentElement;
        if (parent) {
          canvas.width = parent.clientWidth;
          canvas.height = parent.clientHeight;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(panX, panY);
        ctx.scale(zoom, zoom);

        // Render tile layers
        renderTileLayers(ctx, map, tileset, null, activeLayerId);

        // Render grid
        renderGrid(ctx, map, tileSize);

        // Render collision overlay (when collision tool active or always as subtle overlay)
        if (activeTool === 'collision') {
          renderCollisionOverlay(ctx, map, tileSize);
        }

        // Render entities
        renderEntities(ctx, map, entityDefs, tileSize);

        // Render triggers
        renderTriggers(ctx, map, tileSize);

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [map, tileset, activeTool, activeLayerId, tileSize, panX, panY, zoom, entityDefs]);

  // Pan handling with middle mouse button
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button === 1) {
        // Middle mouse button for panning
        isPanning.current = true;
        panStart.current = { x: e.clientX - panX, y: e.clientY - panY };
        e.preventDefault();
      } else {
        interaction.onMouseDown(e);
      }
    },
    [interaction, panX, panY],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isPanning.current) {
        setPanX(e.clientX - panStart.current.x);
        setPanY(e.clientY - panStart.current.y);
      } else {
        interaction.onMouseMove(e);
      }
      dirtyRef.current = true;
    },
    [interaction],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isPanning.current) {
        isPanning.current = false;
      } else {
        interaction.onMouseUp(e);
      }
    },
    [interaction],
  );

  // Zoom with scroll wheel
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setZoom((prev) => {
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      return Math.max(0.25, Math.min(4, prev + delta));
    });
    dirtyRef.current = true;
  }, []);

  return (
    <div
      style={{
        flex: 1,
        overflow: 'hidden',
        background: '#181825',
        position: 'relative',
      }}
    >
      <canvas
        ref={canvasRef}
        data-testid="map-viewport"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: activeTool === 'entity' ? 'crosshair' : 'default',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onKeyDown={interaction.onKeyDown}
        tabIndex={0}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 4,
          right: 8,
          fontSize: 11,
          color: '#6c7086',
          pointerEvents: 'none',
        }}
      >
        {Math.round(zoom * 100)}% | {map.width}×{map.height}
      </div>
    </div>
  );
}
