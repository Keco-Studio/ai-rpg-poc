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
  commitTransaction: () => void;
  cancelTransaction: () => void;
  historyStack: HistoryStack;
}

export function useTransaction(
  state: EditorState,
  dispatch: Dispatch<EditorAction>,
): UseTransactionReturn {
  const txManagerRef = useRef(new TransactionManager());
  const historyStackRef = useRef(new HistoryStack());

  const beginTransaction = useCallback(
    (toolType: ToolType, mapId: string, layerId: string | null) => {
      const tx = txManagerRef.current.begin(toolType, mapId, layerId);
      dispatch({ type: 'BEGIN_TRANSACTION', transaction: tx });
    },
    [dispatch],
  );

  const addCells = useCallback(
    (cells: CellChange[]) => {
      if (state.transaction) {
        txManagerRef.current.addCells(state.transaction, cells);
        dispatch({ type: 'ADD_CELLS', cells });
      }
    },
    [state.transaction, dispatch],
  );

  const addOps = useCallback(
    (ops: PatchOp[]) => {
      if (state.transaction) {
        txManagerRef.current.addOps(state.transaction, ops);
        dispatch({ type: 'ADD_OPS', ops });
      }
    },
    [state.transaction, dispatch],
  );

  const commitTransaction = useCallback(() => {
    if (!state.transaction) return;

    const result = txManagerRef.current.commit(
      state.transaction,
      state.project,
      state.selectedTileId,
    );

    if (result) {
      // Also push to the HistoryStack for undo/redo support
      historyStackRef.current.applyAndPush(state.project, result.patch);
      dispatch({
        type: 'COMMIT_TRANSACTION',
        result: result.result,
        meta: result.meta,
      });
    } else {
      dispatch({ type: 'CANCEL_TRANSACTION' });
    }
  }, [state.transaction, state.project, state.selectedTileId, dispatch]);

  const cancelTransaction = useCallback(() => {
    txManagerRef.current.cancel();
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
