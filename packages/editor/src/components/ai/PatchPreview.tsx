/**
 * PatchPreview — Detailed patch summary display
 *
 * Displays PatchSummary (created/modified/deleted counts),
 * warnings, repair attempts, destructive operation warnings.
 * Apply, Reject, Regenerate buttons.
 */

import React from 'react';
import type { PatchPreviewProps } from '../types.js';
import type { PatchSummary, TileEditSummary, CollisionEditSummary } from '@ai-rpg-maker/shared';

function countResources(summary: PatchSummary['created' | 'modified' | 'deleted']): number {
  return (
    summary.maps.length +
    summary.entities.length +
    summary.dialogues.length +
    summary.quests.length +
    summary.triggers.length
  );
}

export function PatchPreview({
  result,
  onApply,
  onReject,
  onRegenerate,
}: PatchPreviewProps) {
  const summary = result.summary;
  const opCount = result.patch?.ops.length ?? 0;
  const hasDestructive = summary
    ? countResources(summary.deleted) > 0
    : false;

  return (
    <div style={{ fontSize: 12 }}>
      <div style={{ fontWeight: 600, color: '#a6e3a1', marginBottom: 6 }}>
        Proposed Changes
      </div>

      {summary && (
        <div style={{ marginBottom: 8 }}>
          {/* Resource counts */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
            {countResources(summary.created) > 0 && (
              <span style={{ color: '#a6e3a1' }}>
                +{countResources(summary.created)} created
              </span>
            )}
            {countResources(summary.modified) > 0 && (
              <span style={{ color: '#89b4fa' }}>
                ~{countResources(summary.modified)} modified
              </span>
            )}
            {countResources(summary.deleted) > 0 && (
              <span style={{ color: '#f38ba8' }}>
                -{countResources(summary.deleted)} deleted
              </span>
            )}
          </div>

          {/* Tile edits */}
          {summary.tileEdits && summary.tileEdits.length > 0 && (
            <div style={{ color: '#a6adc8', fontSize: 11 }}>
              Tile edits: {summary.tileEdits.reduce((s: number, e: TileEditSummary) => s + e.changedCells, 0)} cells
            </div>
          )}

          {/* Collision edits */}
          {summary.collisionEdits && summary.collisionEdits.length > 0 && (
            <div style={{ color: '#a6adc8', fontSize: 11 }}>
              Collision edits: {summary.collisionEdits.reduce((s: number, e: CollisionEditSummary) => s + e.changedCells, 0)} cells
            </div>
          )}

          <div style={{ color: '#6c7086', fontSize: 11, marginTop: 2 }}>
            {opCount} operation{opCount !== 1 ? 's' : ''}
            {result.repairAttempts > 0 && ` (${result.repairAttempts} repair attempt${result.repairAttempts !== 1 ? 's' : ''})`}
          </div>
        </div>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          {result.warnings.map((w, i) => (
            <div key={i} style={{ color: '#f9e2af', fontSize: 11, marginBottom: 2 }}>
              {w}
            </div>
          ))}
        </div>
      )}

      {/* Destructive warning */}
      {hasDestructive && (
        <div style={{ color: '#f38ba8', fontSize: 11, marginBottom: 8, fontWeight: 600 }}>
          This patch contains destructive operations (deletions).
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          onClick={onApply}
          style={{
            padding: '5px 12px',
            background: '#a6e3a1',
            color: '#1e1e2e',
            border: 'none',
            borderRadius: 3,
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          Apply
        </button>
        <button
          onClick={onReject}
          style={{
            padding: '5px 12px',
            background: '#313244',
            color: '#cdd6f4',
            border: 'none',
            borderRadius: 3,
            cursor: 'pointer',
            fontSize: 11,
          }}
        >
          Reject
        </button>
        <button
          onClick={onRegenerate}
          style={{
            padding: '5px 12px',
            background: '#313244',
            color: '#cdd6f4',
            border: 'none',
            borderRadius: 3,
            cursor: 'pointer',
            fontSize: 11,
          }}
        >
          Regenerate
        </button>
      </div>
    </div>
  );
}
