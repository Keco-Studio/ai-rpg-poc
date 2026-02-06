/**
 * Editor Store — Central state management
 *
 * Implements editorReducer and initialEditorState.
 * All project mutations flow through the patch pipeline.
 */

import type { Project, ApplyResult } from '@ai-rpg-maker/shared';
import type {
  EditorState,
  EditorAction,
  HistoryEntryMeta,
  CellChange,
} from './types.js';

/**
 * Create the initial editor state from a project.
 */
export function initialEditorState(project: Project): EditorState {
  const mapIds = Object.keys(project.maps);
  const firstMapId = mapIds.length > 0 ? mapIds[0] : null;

  let firstLayerId: string | null = null;
  if (firstMapId) {
    const map = project.maps[firstMapId];
    const layerIds = Object.keys(map.tileLayers);
    firstLayerId = layerIds.length > 0 ? layerIds[0] : null;
  }

  return {
    project,
    activeMapId: firstMapId,
    activeLayerId: firstLayerId,
    activeTool: 'brush',
    selectedTileId: 1,
    selectedEntityDefId: null,
    transaction: null,
    historyMeta: [],
    undoneCount: 0,
  };
}

/**
 * Editor reducer — handles all state transitions.
 */
export function editorReducer(
  state: EditorState,
  action: EditorAction,
): EditorState {
  switch (action.type) {
    case 'SET_PROJECT':
      return { ...state, project: action.project };

    case 'SET_ACTIVE_MAP': {
      const newState: EditorState = { ...state, activeMapId: action.mapId };
      // Auto-select first layer of the new map
      if (action.mapId && state.project.maps[action.mapId]) {
        const map = state.project.maps[action.mapId];
        const layerIds = Object.keys(map.tileLayers);
        newState.activeLayerId = layerIds.length > 0 ? layerIds[0] : null;
      } else {
        newState.activeLayerId = null;
      }
      return newState;
    }

    case 'SET_ACTIVE_LAYER':
      return { ...state, activeLayerId: action.layerId };

    case 'SET_TOOL':
      return { ...state, activeTool: action.tool };

    case 'SET_TILE':
      return { ...state, selectedTileId: action.tileId };

    case 'SET_ENTITY_DEF':
      return { ...state, selectedEntityDefId: action.entityDefId };

    case 'BEGIN_TRANSACTION':
      return { ...state, transaction: action.transaction };

    case 'ADD_CELLS': {
      if (!state.transaction) return state;
      return {
        ...state,
        transaction: {
          ...state.transaction,
          cells: [...state.transaction.cells, ...action.cells],
        },
      };
    }

    case 'ADD_OPS': {
      if (!state.transaction) return state;
      return {
        ...state,
        transaction: {
          ...state.transaction,
          entityOps: [...state.transaction.entityOps, ...action.ops],
        },
      };
    }

    case 'COMMIT_TRANSACTION': {
      // Truncate redo entries from historyMeta
      const metaAfterTruncate = state.undoneCount > 0
        ? state.historyMeta.slice(0, state.historyMeta.length - state.undoneCount)
        : [...state.historyMeta];

      return {
        ...state,
        project: action.result.project,
        transaction: null,
        historyMeta: [...metaAfterTruncate, action.meta],
        undoneCount: 0,
      };
    }

    case 'CANCEL_TRANSACTION':
      return { ...state, transaction: null };

    case 'APPLY_PATCH': {
      // Truncate redo entries from historyMeta
      const metaAfterTruncate = state.undoneCount > 0
        ? state.historyMeta.slice(0, state.historyMeta.length - state.undoneCount)
        : [...state.historyMeta];

      return {
        ...state,
        project: action.result.project,
        historyMeta: [...metaAfterTruncate, action.meta],
        undoneCount: 0,
      };
    }

    case 'UNDO':
      return {
        ...state,
        project: action.result.project,
        undoneCount: state.undoneCount + 1,
      };

    case 'REDO':
      return {
        ...state,
        project: action.result.project,
        undoneCount: Math.max(0, state.undoneCount - 1),
      };

    case 'FORCE_UNDO':
      return {
        ...state,
        project: action.result.project,
        undoneCount: state.undoneCount + 1,
      };

    case 'PARTIAL_UNDO': {
      // Partial undo pushes a new entry (the partial inverse applied as a new patch)
      return {
        ...state,
        project: action.result.project,
        historyMeta: [...state.historyMeta, action.meta],
      };
    }

    default:
      return state;
  }
}
