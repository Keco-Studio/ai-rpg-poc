/**
 * useTransaction — Hook wrapping TransactionManager lifecycle
 *
 * Provides beginTransaction, addCells, addOps, commitTransaction, cancelTransaction
 * functions that dispatch to the editor reducer.
 */

import { useCallback, useRef } from 'react';
import type { Dispatch } from 'react';
import { TransactionManager } from '../state/transaction.js';
import type { EditorAction, EditorState, CellChange, ToolType } from '../state/types.js';
import type { PatchOp } from '@ai-rpg-maker/shared';
import { HistoryStack } from '@ai-rpg-maker/shared';

export interface UseTransactionReturn {
  beginTransaction: (toolType: ToolType, mapId: string, layerId: string | null) => void;
  addCells: (cells: CellChange[]) => void;
  addOps: (ops: PatchOp[]) => void;
  commitTransaction: (pendingCells?: CellChange[], pendingOps?: PatchOp[]) => void;
  cancelTransaction: () => void;
  historyStack: HistoryStack;
}

export function useTransaction(
  state: EditorState,
  dispatch: Dispatch<EditorAction>,
): UseTransactionReturn {
  const txManagerRef = useRef(new TransactionManager());
  const historyStackRef = useRef(new HistoryStack());
  // Ref to hold the most recently begun transaction, used as a fallback when
  // commitTransaction is called in the same event handler as beginTransaction
  // (before React has processed the BEGIN_TRANSACTION dispatch).
  const pendingTxRef = useRef<ReturnType<TransactionManager['begin']> | null>(null);

  const beginTransaction = useCallback(
    (toolType: ToolType, mapId: string, layerId: string | null) => {
      const tx = txManagerRef.current.begin(toolType, mapId, layerId);
      pendingTxRef.current = tx;
      dispatch({ type: 'BEGIN_TRANSACTION', transaction: tx });
    },
    [dispatch],
  );

  const addCells = useCallback(
    (cells: CellChange[]) => {
      // Always dispatch - the reducer will check if there's a transaction
      // Don't check state.transaction here due to React state batching/closure issues
      dispatch({ type: 'ADD_CELLS', cells });
    },
    [dispatch],
  );

  const addOps = useCallback(
    (ops: PatchOp[]) => {
      // Always dispatch - the reducer will check if there's a transaction
      // Don't check state.transaction here due to React state batching/closure issues
      dispatch({ type: 'ADD_OPS', ops });
    },
    [dispatch],
  );

  const commitTransaction = useCallback((pendingCells?: CellChange[], pendingOps?: PatchOp[]) => {
    // Use state.transaction if available, otherwise fall back to the ref
    // (handles same-event begin+commit where React hasn't re-rendered yet).
    const baseTx = state.transaction ?? pendingTxRef.current;
    console.log('[useTransaction] commitTransaction called, has transaction:', !!baseTx);
    if (!baseTx) return;

    // Merge any pending cells/ops that may not have been processed by the
    // reducer yet (e.g. rect tool adds cells and commits in the same event).
    const mergedTransaction: typeof baseTx = (pendingCells || pendingOps)
      ? {
          ...baseTx,
          cells: pendingCells
            ? [...baseTx.cells, ...pendingCells]
            : baseTx.cells,
          entityOps: pendingOps
            ? [...baseTx.entityOps, ...pendingOps]
            : baseTx.entityOps,
        }
      : baseTx;

    console.log('[useTransaction] transaction cells:', mergedTransaction.cells.length, 'ops:', mergedTransaction.entityOps.length);

    const result = txManagerRef.current.commit(
      mergedTransaction,
      state.project,
      state.selectedTileId,
    );

    console.log('[useTransaction] commit result:', !!result);

    if (result) {
      // Also push to the HistoryStack for undo/redo support
      historyStackRef.current.applyAndPush(state.project, result.patch);
      dispatch({
        type: 'COMMIT_TRANSACTION',
        result: result.result,
        meta: result.meta,
      });
      console.log('[useTransaction] transaction committed successfully');
    } else {
      console.log('[useTransaction] transaction commit failed, cancelling');
      dispatch({ type: 'CANCEL_TRANSACTION' });
    }
    pendingTxRef.current = null;
  }, [state.transaction, state.project, state.selectedTileId, dispatch]);

  const cancelTransaction = useCallback(() => {
    txManagerRef.current.cancel();
    pendingTxRef.current = null;
    dispatch({ type: 'CANCEL_TRANSACTION' });
  }, [dispatch]);

  return {
    beginTransaction,
    addCells,
    addOps,
    commitTransaction,
    cancelTransaction,
    historyStack: historyStackRef.current,
  };
}
