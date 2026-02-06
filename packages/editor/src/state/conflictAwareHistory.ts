/**
 * ConflictAwareHistory — Wraps HistoryStack with conflict detection preflight
 *
 * On applyAndPush: stores ConflictHunk[] via buildConflictHunks in meta array.
 * On undo request: calls detectConflicts to check for divergence.
 * Supports standard undo, partial undo (filtered inverse), and force undo.
 */

import type {
  Project,
  PatchV1,
  ApplyResult,
  ConflictDetectionResult,
} from '@ai-rpg-maker/shared';
import {
  HistoryStack,
  detectConflicts,
  buildConflictHunks,
  applyPatch,
  validatePatch,
} from '@ai-rpg-maker/shared';
import type { HistoryEntryMeta } from './types.js';
import type {
  ConflictAwareHistoryInterface,
  UndoPreflightResult,
} from './conflictAwareHistoryTypes.js';
import { buildFilteredInverse } from './filteredInverse.js';

export class ConflictAwareHistory implements ConflictAwareHistoryInterface {
  private historyStack: HistoryStack;
  private metaEntries: HistoryEntryMeta[] = [];
  /** Tracks redo meta entries separately */
  private redoMeta: HistoryEntryMeta[] = [];

  constructor(maxSize?: number) {
    this.historyStack = new HistoryStack(maxSize ? { maxSize } : undefined);
  }

  /**
   * Apply a patch and push to history.
   * Stores conflict hunks from buildConflictHunks.
   */
  applyAndPush(
    project: Project,
    patch: PatchV1,
    meta: Omit<HistoryEntryMeta, 'conflictHunks'>,
  ): ApplyResult | null {
    const result = this.historyStack.applyAndPush(project, patch);
    if (!result) return null;

    const conflictHunks = buildConflictHunks(result.project, patch);
    const fullMeta: HistoryEntryMeta = {
      ...meta,
      conflictHunks,
    };

    this.metaEntries.push(fullMeta);
    this.redoMeta = []; // Clear redo on new push

    return result;
  }

  /**
   * Preflight check: detect conflicts before undo.
   */
  preflightUndo(project: Project): UndoPreflightResult | null {
    if (!this.historyStack.canUndo()) return null;

    const entryIndex = this.metaEntries.length - 1;
    const meta = this.metaEntries[entryIndex];
    if (!meta) return null;

    const detectionResult = detectConflicts(project, meta.conflictHunks);

    return {
      hasConflicts: detectionResult.hasConflicts,
      detectionResult,
      entryIndex,
    };
  }

  /**
   * Standard undo (no conflicts or force).
   */
  undo(project: Project): ApplyResult | null {
    if (!this.historyStack.canUndo()) return null;

    const meta = this.metaEntries.pop();
    if (meta) this.redoMeta.push(meta);

    return this.historyStack.undo(project);
  }

  /**
   * Partial undo: apply inverse patch for safe hunks only.
   * Creates a new history entry for the partial undo (so it's undoable).
   */
  partialUndo(
    project: Project,
    safeHunks: string[],
  ): ApplyResult | null {
    if (!this.historyStack.canUndo()) return null;

    const entryIndex = this.metaEntries.length - 1;
    const _meta = this.metaEntries[entryIndex];

    // Get the inverse patch from the undo stack
    // We need to peek at the top entry - undo then re-push approach
    const undoResult = this.historyStack.undo(project);
    if (!undoResult) return null;

    // Now redo to restore the state and get access to the original patch
    const redoResult = this.historyStack.redo(undoResult.project);
    if (!redoResult) return undoResult; // Shouldn't happen

    // Build a filtered inverse that only includes safe hunks
    // We get the inverse from the undo result
    const filteredPatch = buildFilteredInverse(
      undoResult.inverse,
      safeHunks,
      redoResult.inverse, // The original patch's inverse
    );

    // Validate and apply the filtered patch
    const validation = validatePatch(project, filteredPatch);
    if (!validation.ok) return null;

    const applyResult = applyPatch(project, filteredPatch);

    // Push the partial undo as a new history entry
    this.historyStack.applyAndPush(project, filteredPatch);

    const partialMeta: HistoryEntryMeta = {
      origin: 'manual',
      summary: `Partial undo (${safeHunks.length} safe hunks)`,
      timestamp: Date.now(),
      conflictHunks: buildConflictHunks(applyResult.project, filteredPatch),
    };
    this.metaEntries.push(partialMeta);

    return applyResult;
  }

  /**
   * Standard redo.
   */
  redo(project: Project): ApplyResult | null {
    if (!this.historyStack.canRedo()) return null;

    const meta = this.redoMeta.pop();
    if (meta) this.metaEntries.push(meta);

    return this.historyStack.redo(project);
  }

  canUndo(): boolean {
    return this.historyStack.canUndo();
  }

  canRedo(): boolean {
    return this.historyStack.canRedo();
  }

  undoSize(): number {
    return this.historyStack.undoSize;
  }

  redoSize(): number {
    return this.historyStack.redoSize;
  }

  getAllMeta(): HistoryEntryMeta[] {
    return [...this.metaEntries, ...this.redoMeta.slice().reverse()];
  }

  clear(): void {
    this.historyStack.clear();
    this.metaEntries = [];
    this.redoMeta = [];
  }
}
