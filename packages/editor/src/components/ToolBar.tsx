/**
 * ToolBar — Tool selection + undo/redo buttons
 *
 * Supports keyboard shortcuts: Ctrl+Z = undo, Ctrl+Shift+Z = redo
 */

import React, { useEffect, useCallback } from 'react';
import type { ToolBarProps } from './types.js';
import type { ToolType } from '../state/types.js';

const TOOLS: Array<{ id: ToolType; label: string; shortcut: string }> = [
  { id: 'brush', label: 'Brush', shortcut: 'B' },
  { id: 'rect', label: 'Rect', shortcut: 'R' },
  { id: 'erase', label: 'Erase', shortcut: 'E' },
  { id: 'collision', label: 'Collision', shortcut: 'C' },
  { id: 'entity', label: 'Entity', shortcut: 'N' },
  { id: 'trigger', label: 'Trigger', shortcut: 'T' },
];

export function ToolBar({
  activeTool,
  onSelectTool,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: ToolBarProps) {
  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Undo: Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) onUndo();
        return;
      }
      // Redo: Ctrl+Shift+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        if (canRedo) onRedo();
        return;
      }
      // Redo: Ctrl+Y
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        if (canRedo) onRedo();
        return;
      }
      // Tool shortcuts (only when no modifier)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const tool = TOOLS.find(
          (t) => t.shortcut.toLowerCase() === e.key.toLowerCase(),
        );
        if (tool) {
          onSelectTool(tool.id);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [canUndo, canRedo, onUndo, onRedo, onSelectTool]);

  return (
    <div
      data-testid="toolbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 8px',
        background: '#1e1e2e',
        borderBottom: '1px solid #313244',
        flexShrink: 0,
      }}
    >
      {/* Tool buttons */}
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          data-tool={tool.id}
          className={activeTool === tool.id ? 'active' : ''}
          onClick={() => onSelectTool(tool.id)}
          title={`${tool.label} (${tool.shortcut})`}
          style={{
            padding: '4px 10px',
            fontSize: 12,
            background: activeTool === tool.id ? '#89b4fa' : '#313244',
            color: activeTool === tool.id ? '#1e1e2e' : '#cdd6f4',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontWeight: activeTool === tool.id ? 600 : 400,
          }}
        >
          {tool.label}
        </button>
      ))}

      <div style={{ flex: 1 }} />

      {/* Undo/Redo */}
      <button
        data-action="undo"
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        style={{
          padding: '4px 10px',
          fontSize: 12,
          background: '#313244',
          color: canUndo ? '#cdd6f4' : '#45475a',
          border: 'none',
          borderRadius: 4,
          cursor: canUndo ? 'pointer' : 'default',
        }}
      >
        Undo
      </button>
      <button
        data-action="redo"
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Shift+Z)"
        style={{
          padding: '4px 10px',
          fontSize: 12,
          background: '#313244',
          color: canRedo ? '#cdd6f4' : '#45475a',
          border: 'none',
          borderRadius: 4,
          cursor: canRedo ? 'pointer' : 'default',
        }}
      >
        Redo
      </button>
    </div>
  );
}
