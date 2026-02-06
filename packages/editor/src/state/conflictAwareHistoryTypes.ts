/**
 * Conflict-Aware History Types — implements contracts from
 * specs/004-editor-ux/contracts/conflict-aware-history.ts
 */

import type {
  Project,
  PatchV1,
  ApplyResult,
  ConflictDetectionResult,
  ConflictResolution,
  ConflictHunk,
  PatchOp,
} from '@ai-rpg-maker/shared';

import type { HistoryEntryMeta } from './types.js';

// ---------------------------------------------------------------------------
// Conflict-Aware Undo
// ---------------------------------------------------------------------------

export interface UndoPreflightResult {
  /** Whether conflicts were detected */
  hasConflicts: boolean;
  /** Conflict details (empty if no conflicts) */
  detectionResult: ConflictDetectionResult;
  /** The history entry index being undone */
  entryIndex: number;
}

export interface ConflictAwareHistoryInterface {
  /**
   * Apply a patch and push to history, storing conflict hunks for future
   * undo conflict detection.
   */
  applyAndPush(
    project: Project,
    patch: PatchV1,
    meta: Omit<HistoryEntryMeta, 'conflictHunks'>,
  ): ApplyResult | null;

  /**
   * Check if undoing the most recent entry would cause conflicts
   * with the current project state.
   */
  preflightUndo(project: Project): UndoPreflightResult | null;

  /**
   * Perform a standard undo (no conflicts, or force resolution).
   */
  undo(project: Project): ApplyResult | null;

  /**
   * Perform a partial undo: apply inverse patch excluding conflicting hunks.
   * The partial undo is pushed as a new history entry (so it's itself undoable).
   */
  partialUndo(
    project: Project,
    safeHunks: string[],
  ): ApplyResult | null;

  /**
   * Perform a standard redo.
   */
  redo(project: Project): ApplyResult | null;

  /** Whether undo is available */
  canUndo(): boolean;

  /** Whether redo is available */
  canRedo(): boolean;

  /** Number of entries in the undo stack */
  undoSize(): number;

  /** Number of entries in the redo stack */
  redoSize(): number;

  /** Get metadata for all history entries (active + undone) */
  getAllMeta(): HistoryEntryMeta[];

  /** Clear all history */
  clear(): void;
}

// ---------------------------------------------------------------------------
// Filtered Inverse Patch Builder
// ---------------------------------------------------------------------------

export interface FilteredInverseBuilder {
  /**
   * Given an inverse patch and a list of safe (non-conflicting) hunk refs,
   * produce a new patch containing only ops that affect safe hunks.
   */
  buildFilteredInverse(
    inversePatch: PatchV1,
    safeHunks: string[],
    originalPatch: PatchV1,
  ): PatchV1;

  /**
   * Map a PatchOp to its hunk ref string.
   */
  opToHunkRef(op: PatchOp): string;
}
