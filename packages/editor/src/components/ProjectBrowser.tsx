/**
 * ProjectBrowser — Sidebar showing maps, tilesets, entity defs
 */

import React from 'react';
import type { ProjectBrowserProps } from './types.js';

export function ProjectBrowser({
  project,
  activeMapId,
  onSelectMap,
  onSelectEntityDef,
}: ProjectBrowserProps) {
  const maps = Object.values(project.maps);
  const entityDefs = Object.values(project.entityDefs);
  const tilesets = Object.values(project.tilesets);

  return (
    <div
      style={{
        width: 200,
        flexShrink: 0,
        background: '#1e1e2e',
        borderRight: '1px solid #313244',
        overflowY: 'auto',
        padding: 8,
        fontSize: 12,
      }}
    >
      {/* Maps */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: '#6c7086', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', fontSize: 10 }}>
          Maps ({maps.length})
        </div>
        {maps.map((map) => (
          <div
            key={map.id}
            onClick={() => onSelectMap(map.id)}
            style={{
              padding: '3px 6px',
              borderRadius: 3,
              cursor: 'pointer',
              background: map.id === activeMapId ? '#313244' : 'transparent',
              color: map.id === activeMapId ? '#89b4fa' : '#cdd6f4',
              marginBottom: 1,
            }}
          >
            {map.name}
            <span style={{ color: '#6c7086', marginLeft: 4, fontSize: 10 }}>
              {map.width}x{map.height}
            </span>
          </div>
        ))}
      </div>

      {/* Tilesets */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: '#6c7086', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', fontSize: 10 }}>
          Tilesets ({tilesets.length})
        </div>
        {tilesets.map((ts) => (
          <div key={ts.id} style={{ padding: '3px 6px', color: '#a6adc8' }}>
            {ts.name}
            <span style={{ color: '#6c7086', marginLeft: 4, fontSize: 10 }}>
              {ts.tileCount} tiles
            </span>
          </div>
        ))}
      </div>

      {/* Entity Definitions */}
      <div>
        <div style={{ color: '#6c7086', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', fontSize: 10 }}>
          Entities ({entityDefs.length})
        </div>
        {entityDefs.map((def) => (
          <div
            key={def.id}
            onClick={() => onSelectEntityDef(def.id)}
            style={{
              padding: '3px 6px',
              borderRadius: 3,
              cursor: 'pointer',
              color: '#cdd6f4',
              marginBottom: 1,
            }}
          >
            {def.name}
            <span style={{ color: '#6c7086', marginLeft: 4, fontSize: 10 }}>
              {def.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
