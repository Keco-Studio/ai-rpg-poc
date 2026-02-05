/**
 * History Module - Undo/Redo Stack
 *
 * Manages a stack of applied patches with their inverses for complete
 * undo/redo functionality. Treats each patch as a single history entry.
 */

import type { Project } from '../schema/types.js';
import type { PatchV1, PatchSummary, ApplyResult } from '../patch/types.js';
import { validatePatch } from '../patch/validate.js';
import { applyPatch } from '../patch/apply.js';

/**
 * A single entry in the undo/redo history stack.
 */
export interface HistoryEntry {
  /** The original patch that was applied */
  patch: PatchV1;
  /** The inverse patch for undo */
  inverse: PatchV1;
  /** Summary of changes */
  summary: PatchSummary;
  /** When the patch was applied (ms since epoch) */
  timestamp?: number;
}

/**
 * Configuration options for HistoryStack.
 */
export interface HistoryStackOptions {
  /** Maximum number of history entries (default: unlimited) */
  maxSize?: number;
}

/**
 * Manages undo/redo history with two stacks.
 *
 * - `applyAndPush()` applies a patch, pushes to undo stack, clears redo stack
 * - `undo()` pops from undo stack, applies inverse, pushes to redo stack
 * - `redo()` pops from redo stack, applies original, pushes to undo stack
 *
 * @example
 * ```typescript
 * const history = new HistoryStack({ maxSize: 100 });
 * const result = history.applyAndPush(project, patch);
 * if (result) {
 *   currentProject = result.project;
 * }
 * ```
 */
export class HistoryStack {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private maxSize?: number;

  constructor(options?: HistoryStackOptions) {
    this.maxSize = options?.maxSize;
  }

  /**
   * Validates, applies a patch, and pushes it onto the undo stack.
   * Clears the redo stack (new action invalidates redo history).
   *
   * @param project - Current project state
   * @param patch - Patch to validate and apply
   * @returns ApplyResult if successful, null if validation fails
   */
  applyAndPush(project: Project, patch: PatchV1): ApplyResult | null {
    // Validate first
    const validation = validatePatch(project, patch);
    if (!validation.ok) {
      return null;
    }

    // Apply
    const result = applyPatch(project, patch);

    // Push to undo stack
    const entry: HistoryEntry = {
      patch,
      inverse: result.inverse,
      summary: result.summary,
      timestamp: Date.now(),
    };
    this.undoStack.push(entry);

    // Clear redo stack
    this.redoStack = [];

    // Enforce max size
    if (this.maxSize !== undefined && this.undoStack.length > this.maxSize) {
      this.undoStack.shift(); // Remove oldest entry
    }

    return result;
  }

  /**
   * Undoes the most recent action by applying its inverse patch.
   * Moves the entry from undo stack to redo stack.
   *
   * @param project - Current project state (should match post-apply state)
   * @returns ApplyResult if undo available, null if undo stack is empty
   */
  undo(project: Project): ApplyResult | null {
    if (this.undoStack.length === 0) return null;

    const entry = this.undoStack.pop()!;
    const result = applyPatch(project, entry.inverse);

    // Push to redo stack
    this.redoStack.push(entry);

    return result;
  }

  /**
   * Redoes the most recently undone action by reapplying the original patch.
   * Moves the entry from redo stack back to undo stack.
   *
   * @param project - Current project state (should match pre-apply state)
   * @returns ApplyResult if redo available, null if redo stack is empty
   */
  redo(project: Project): ApplyResult | null {
    if (this.redoStack.length === 0) return null;

    const entry = this.redoStack.pop()!;
    const result = applyPatch(project, entry.patch);

    // Push back to undo stack
    this.undoStack.push(entry);

    return result;
  }

  /** Check if undo is available. */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /** Check if redo is available. */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Clear both undo and redo stacks. */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /** Get the number of entries in the undo stack. */
  get undoSize(): number {
    return this.undoStack.length;
  }

  /** Get the number of entries in the redo stack. */
  get redoSize(): number {
    return this.redoStack.length;
  }
}
