/**
 * Conflict Dialog Component
 *
 * Displays undo conflicts and offers three resolution options:
 * 1. Cancel (safe default - no data loss)
 * 2. Undo non-conflicting only (partial undo)
 * 3. Force undo (may lose manual edits)
 */

import React from 'react';
import type {
  ConflictDetectionResult,
  ConflictDetail,
  ConflictResolution,
} from '@ai-rpg-maker/shared';

/**
 * Props for ConflictDialog component.
 */
export interface ConflictDialogProps {
  /** Conflict detection result */
  conflicts: ConflictDetectionResult;
  /** Callback when user selects a resolution */
  onResolve: (resolution: ConflictResolution) => void;
}

/**
 * Conflict Dialog - Resolution UI for undo conflicts.
 *
 * Shows details of conflicts and offers three options:
 * - Cancel: Safe default, no changes
 * - Partial: Undo only non-conflicting hunks
 * - Force: Undo everything, may lose manual edits (with warning)
 */
export function ConflictDialog({
  conflicts,
  onResolve,
}: ConflictDialogProps) {
  const conflictCount = conflicts.conflicts.length;
  const safeCount = conflicts.safeHunks.length;
  const totalCount = conflictCount + safeCount;

  return (
    <div className="conflict-dialog" role="dialog" aria-labelledby="conflict-dialog-title">
      <h3 id="conflict-dialog-title">Undo Conflicts Detected</h3>

      <p className="conflict-dialog__summary">
        {conflictCount} of {totalCount} change{totalCount !== 1 ? 's' : ''}{' '}
        conflict with manual edits made since the AI patch was applied.
      </p>

      {/* Conflict Details */}
      <div className="conflict-dialog__details">
        <h4>Conflicting Changes ({conflictCount})</h4>
        <ul>
          {conflicts.conflicts.map((conflict: ConflictDetail, i: number) => (
            <li key={i} className="conflict-dialog__conflict-item">
              <span className="conflict-dialog__conflict-ref">
                {conflict.hunkRef}
              </span>
              <p className="conflict-dialog__conflict-desc">
                {conflict.humanReadable}
              </p>
            </li>
          ))}
        </ul>

        {safeCount > 0 && (
          <>
            <h4>Safe to Undo ({safeCount})</h4>
            <ul>
              {conflicts.safeHunks.map((ref: string, i: number) => (
                <li key={i} className="conflict-dialog__safe-item">
                  {ref}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Resolution Buttons */}
      <div className="conflict-dialog__actions">
        {/* Cancel - Safe default */}
        <button
          onClick={() => onResolve('cancel')}
          className="conflict-dialog__cancel"
          autoFocus
        >
          Cancel Undo
        </button>

        {/* Partial undo - Only if there are safe hunks */}
        {safeCount > 0 && (
          <button
            onClick={() => onResolve('partial')}
            className="conflict-dialog__partial"
          >
            Undo Non-Conflicting Only ({safeCount} change{safeCount !== 1 ? 's' : ''})
          </button>
        )}

        {/* Force undo - With data loss warning */}
        <button
          onClick={() => onResolve('force')}
          className="conflict-dialog__force"
        >
          Force Undo (may lose edits)
        </button>
      </div>

      {/* Data loss warning */}
      <p className="conflict-dialog__warning">
        <strong>Warning:</strong> Force undo will revert all changes including
        any manual edits you made after the AI patch was applied. This cannot be
        undone.
      </p>
    </div>
  );
}
