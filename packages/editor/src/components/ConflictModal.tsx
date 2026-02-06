/**
 * ConflictModal — Conflict resolution dialog
 *
 * Displays conflict list with hunk refs and human-readable descriptions.
 * Three buttons: Cancel (default, focused), Undo Safe Parts Only, Force Undo.
 */

import React from 'react';
import type { ConflictModalProps } from './types.js';

export function ConflictModal({ conflicts, onResolve }: ConflictModalProps) {
  const conflictCount = conflicts.conflicts.length;
  const safeCount = conflicts.safeHunks.length;
  const totalCount = conflictCount + safeCount;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        role="dialog"
        aria-labelledby="conflict-modal-title"
        style={{
          background: '#1e1e2e',
          border: '1px solid #313244',
          borderRadius: 8,
          padding: 20,
          maxWidth: 500,
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
      >
        <h3 id="conflict-modal-title" style={{ margin: '0 0 12px', color: '#f38ba8', fontSize: 16 }}>
          Undo Conflicts Detected
        </h3>

        <p style={{ color: '#a6adc8', fontSize: 13, marginBottom: 12 }}>
          {conflictCount} of {totalCount} change{totalCount !== 1 ? 's' : ''}{' '}
          conflict with manual edits made since this patch was applied.
        </p>

        {/* Conflict details */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#f38ba8', marginBottom: 4 }}>
            Conflicting ({conflictCount})
          </div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#cdd6f4' }}>
            {conflicts.conflicts.map((c, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                <code style={{ color: '#f9e2af', fontSize: 11 }}>{c.hunkRef}</code>
                <div style={{ color: '#a6adc8', fontSize: 11 }}>{c.humanReadable}</div>
              </li>
            ))}
          </ul>
        </div>

        {safeCount > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#a6e3a1', marginBottom: 4 }}>
              Safe to Undo ({safeCount})
            </div>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#a6adc8' }}>
              {conflicts.safeHunks.map((ref, i) => (
                <li key={i}>{ref}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button
            onClick={() => onResolve('cancel')}
            autoFocus
            style={{
              flex: 1,
              padding: '8px 12px',
              background: '#313244',
              color: '#cdd6f4',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Cancel
          </button>
          {safeCount > 0 && (
            <button
              onClick={() => onResolve('partial')}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: '#a6e3a1',
                color: '#1e1e2e',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Undo Safe Only
            </button>
          )}
          <button
            onClick={() => onResolve('force')}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: '#f38ba8',
              color: '#1e1e2e',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Force Undo
          </button>
        </div>

        <p style={{ color: '#f38ba8', fontSize: 11, marginTop: 8 }}>
          Warning: Force undo will revert all changes including manual edits made after this patch.
        </p>
      </div>
    </div>
  );
}
