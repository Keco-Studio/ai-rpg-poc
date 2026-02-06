/**
 * Transaction Manager
 *
 * Manages the lifecycle of editing gestures:
 * begin → addCells/addOps → commit/cancel
 *
 * On commit, builds a PatchV1 from accumulated cells/ops,
 * validates via validatePatch, applies via applyPatch,
 * and builds HistoryEntryMeta with buildConflictHunks.
 */

import type {
  Project,
  PatchV1,
  PatchOp,
  ApplyResult,
} from '@ai-rpg-maker/shared';
import { validatePatch, applyPatch, buildConflictHunks } from '@ai-rpg-maker/shared';
import type {
  Transaction,
  CellChange,
  ToolType,
  HistoryEntryMeta,
} from './types.js';
import {
  buildTileOps,
  buildCollisionOps,
} from '../adapters/patchBuilders.js';

let txCounter = 0;

function generateTxId(): string {
  txCounter++;
  return `tx-${Date.now()}-${txCounter}`;
}

function generatePatchId(): string {
  return `patch-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export class TransactionManager {
  /**
   * Start a new transaction for a gesture.
   */
  begin(
    toolType: ToolType,
    mapId: string,
    layerId: string | null,
  ): Transaction {
    const tx: Transaction = {
      id: generateTxId(),
      toolType,
      mapId,
      layerId,
      cells: [],
      entityOps: [],
      startedAt: Date.now(),
    };

    return tx;
  }

  /**
   * Commit the transaction: build PatchV1, validate, apply, return result.
   * Returns null if validation fails or there are no ops.
   */
  commit(
    transaction: Transaction,
    project: Project,
    selectedTileId: number,
  ): { patch: PatchV1; result: ApplyResult; meta: HistoryEntryMeta } | null {
    // Build ops from accumulated data
    let ops: PatchOp[] = [];

    if (transaction.cells.length > 0) {
      if (transaction.toolType === 'collision') {
        ops = buildCollisionOps(transaction.cells, transaction.mapId);
      } else if (
        transaction.toolType === 'brush' ||
        transaction.toolType === 'erase' ||
        transaction.toolType === 'rect'
      ) {
        if (transaction.layerId) {
          ops = buildTileOps(
            transaction.cells,
            transaction.mapId,
            transaction.layerId,
            selectedTileId,
          );
        }
      }
    }

    if (transaction.entityOps.length > 0) {
      ops = [...ops, ...transaction.entityOps];
    }

    if (ops.length === 0) {
      return null;
    }

    // Build PatchV1
    const patch: PatchV1 = {
      patchVersion: 1,
      patchId: generatePatchId(),
      baseSchemaVersion: 1,
      meta: {
        author: 'editor',
        createdAt: new Date().toISOString(),
        note: `Manual edit: ${transaction.toolType}`,
      },
      ops,
    };

    // Validate
    const validation = validatePatch(project, patch);
    if (!validation.ok) {
      return null;
    }

    // Apply
    const result = applyPatch(project, patch);

    // Build conflict hunks for future undo conflict detection
    const conflictHunks = buildConflictHunks(result.project, patch);

    // Build summary text
    const cellCount = transaction.cells.length;
    const opCount = transaction.entityOps.length;
    let summary: string;
    switch (transaction.toolType) {
      case 'brush':
        summary = `Painted ${cellCount} tile${cellCount !== 1 ? 's' : ''}`;
        break;
      case 'rect':
        summary = `Filled rectangle with ${cellCount} tile${cellCount !== 1 ? 's' : ''}`;
        break;
      case 'erase':
        summary = `Erased ${cellCount} tile${cellCount !== 1 ? 's' : ''}`;
        break;
      case 'collision':
        summary = `Set ${cellCount} collision cell${cellCount !== 1 ? 's' : ''}`;
        break;
      case 'entity':
        summary = `Entity operation (${opCount} op${opCount !== 1 ? 's' : ''})`;
        break;
      case 'trigger':
        summary = `Trigger operation (${opCount} op${opCount !== 1 ? 's' : ''})`;
        break;
      default:
        summary = `Edit (${ops.length} op${ops.length !== 1 ? 's' : ''})`;
    }

    const meta: HistoryEntryMeta = {
      origin: 'manual',
      summary,
      timestamp: Date.now(),
      conflictHunks,
    };

    return { patch, result, meta };
  }

  /**
   * Cancel the transaction without applying.
   * (No-op since we don't track internal state anymore)
   */
  cancel(): void {
    // No-op - transaction state is managed by the reducer
  }
}
