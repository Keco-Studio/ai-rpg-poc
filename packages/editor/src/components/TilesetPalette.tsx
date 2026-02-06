/**
 * TilesetPalette — Renders tileset as a grid of selectable tiles
 */

import React, { useCallback } from 'react';
import type { TilesetPaletteProps } from './types.js';

export function TilesetPalette({
  tileset,
  selectedTileId,
  onSelectTile,
}: TilesetPaletteProps) {
  const cols = tileset.columns;
  const rows = Math.ceil(tileset.tileCount / cols);

  const handleClick = useCallback(
    (tileId: number) => {
      onSelectTile(tileId);
    },
    [onSelectTile],
  );

  return (
    <div
      style={{
        background: '#1e1e2e',
        borderTop: '1px solid #313244',
        padding: 8,
        overflowY: 'auto',
        maxHeight: 200,
      }}
    >
      <div style={{ fontSize: 11, color: '#6c7086', marginBottom: 4 }}>
        Tileset: {tileset.name}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${tileset.tileWidth + 2}px)`,
          gap: 1,
        }}
      >
        {Array.from({ length: tileset.tileCount }, (_, i) => {
          const tileId = i + 1;
          const isSelected = tileId === selectedTileId;
          const col = i % cols;
          const row = Math.floor(i / cols);
          const hue = (tileId * 37) % 360;

          return (
            <div
              key={tileId}
              onClick={() => handleClick(tileId)}
              title={`Tile ${tileId}`}
              style={{
                width: tileset.tileWidth,
                height: tileset.tileHeight,
                background: `hsl(${hue}, 60%, 50%)`,
                border: isSelected ? '2px solid #89b4fa' : '1px solid #45475a',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 8,
                color: '#fff',
                boxSizing: 'border-box',
              }}
            >
              {tileId}
            </div>
          );
        })}
      </div>
    </div>
  );
}
