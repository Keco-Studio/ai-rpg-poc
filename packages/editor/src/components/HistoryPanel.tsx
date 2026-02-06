/**
 * HistoryPanel — Chronological history of all edits
 *
 * Shows entries with origin badge, summary, timestamp.
 * Undone entries are visually dimmed.
 */

import React, { useRef, useEffect } from 'react';
import type { HistoryPanelProps } from './types.js';

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function HistoryPanel({
  entries,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: HistoryPanelProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [entries.length]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        borderBottom: '1px solid #313244',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 8px',
          borderBottom: '1px solid #313244',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: '#a6adc8', textTransform: 'uppercase' }}>
          History ({entries.length})
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            style={{
              fontSize: 10,
              padding: '2px 6px',
              background: '#313244',
              color: canUndo ? '#cdd6f4' : '#45475a',
              border: 'none',
              borderRadius: 3,
              cursor: canUndo ? 'pointer' : 'default',
            }}
          >
            Undo
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            style={{
              fontSize: 10,
              padding: '2px 6px',
              background: '#313244',
              color: canRedo ? '#cdd6f4' : '#45475a',
              border: 'none',
              borderRadius: 3,
              cursor: canRedo ? 'pointer' : 'default',
            }}
          >
            Redo
          </button>
        </div>
      </div>

      {/* Entry list */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 4,
        }}
      >
        {entries.length === 0 ? (
          <div style={{ color: '#6c7086', fontSize: 11, padding: 8, textAlign: 'center' }}>
            No history yet
          </div>
        ) : (
          entries.map((entry, i) => (
            <div
              key={i}
              style={{
                padding: '4px 6px',
                marginBottom: 2,
                borderRadius: 3,
                background: entry.isUndone ? 'transparent' : '#313244',
                opacity: entry.isUndone ? 0.4 : 1,
                fontSize: 11,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span
                  style={{
                    fontSize: 9,
                    padding: '1px 4px',
                    borderRadius: 2,
                    background: entry.origin === 'ai' ? '#cba6f7' : '#89b4fa',
                    color: '#1e1e2e',
                    fontWeight: 600,
                  }}
                >
                  {entry.origin === 'ai' ? 'AI' : 'Manual'}
                </span>
                <span style={{ color: '#6c7086', fontSize: 10 }}>
                  {formatTime(entry.timestamp)}
                </span>
              </div>
              <div style={{ color: '#cdd6f4', marginTop: 2 }}>
                {entry.summary}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
