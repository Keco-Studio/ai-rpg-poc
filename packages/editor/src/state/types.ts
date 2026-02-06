/**
 * Editor State Types — implements contracts from specs/004-editor-ux/contracts/editor-state.ts
 */

import type {
  Project,
  PatchV1,
  PatchOp,
  PatchSummary,
  ApplyResult,
  ConflictHunk,
} from '@ai-rpg-maker/shared';

// ---------------------------------------------------------------------------
// Tool Types
// ---------------------------------------------------------------------------

export type ToolType =
  | 'brush'
  | 'rect'
  | 'erase'
  | 'collision'
  | 'entity'
  | 'trigger';

// ---------------------------------------------------------------------------
// Transaction
// ---------------------------------------------------------------------------

export interface CellChange {
  x: number;
  y: number;
  value: number;
}

export interface Transaction {
  /** Unique transaction ID */
  id: string;
  /** The tool that started this transaction */
  toolType: ToolType;
  /** The map being edited */
  mapId: string;
  /** The layer being edited (for tile/erase tools) */
  layerId: string | null;
  /** Accumulated cell changes (for brush/erase/collision tools) */
  cells: CellChange[];
  /** Accumulated entity/trigger operations (for entity/trigger tools) */
  entityOps: PatchOp[];
  /** When the transaction began (ms since epoch) */
  startedAt: number;
}

// ---------------------------------------------------------------------------
// History Metadata
// ---------------------------------------------------------------------------

export type EditOrigin = 'manual' | 'ai';

export interface HistoryEntryMeta {
  /** Whether this entry was created by a manual edit or an AI proposal */
  origin: EditOrigin;
  /** Human-readable summary */
  summary: string;
  /** When the patch was applied (ms since epoch) */
  timestamp: number;
  /** Hunks touched by this patch, for conflict detection on undo */
  conflictHunks: ConflictHunk[];
}

// ---------------------------------------------------------------------------
// Editor State
// ---------------------------------------------------------------------------

export interface EditorState {
  /** Current authoritative project state */
  project: Project;
  /** Currently selected map for editing */
  activeMapId: string | null;
  /** Currently selected tile layer within the active map */
  activeLayerId: string | null;
  /** Currently selected editing tool */
  activeTool: ToolType;
  /** Tile ID selected from the tileset palette (0 = empty) */
  selectedTileId: number;
  /** Entity definition ID selected for placement */
  selectedEntityDefId: string | null;
  /** In-progress gesture transaction, or null when idle */
  transaction: Transaction | null;
  /** Metadata for history entries (parallel to HistoryStack internals) */
  historyMeta: HistoryEntryMeta[];
  /** Number of entries that have been undone (for redo tracking) */
  undoneCount: number;
}

// ---------------------------------------------------------------------------
// Editor Actions (Reducer)
// ---------------------------------------------------------------------------

export type EditorAction =
  | { type: 'SET_PROJECT'; project: Project }
  | { type: 'SET_ACTIVE_MAP'; mapId: string | null }
  | { type: 'SET_ACTIVE_LAYER'; layerId: string | null }
  | { type: 'SET_TOOL'; tool: ToolType }
  | { type: 'SET_TILE'; tileId: number }
  | { type: 'SET_ENTITY_DEF'; entityDefId: string | null }
  | { type: 'BEGIN_TRANSACTION'; transaction: Transaction }
  | { type: 'ADD_CELLS'; cells: CellChange[] }
  | { type: 'ADD_OPS'; ops: PatchOp[] }
  | {
      type: 'COMMIT_TRANSACTION';
      result: ApplyResult;
      meta: HistoryEntryMeta;
    }
  | { type: 'CANCEL_TRANSACTION' }
  | {
      type: 'APPLY_PATCH';
      result: ApplyResult;
      meta: HistoryEntryMeta;
    }
  | { type: 'UNDO'; result: ApplyResult }
  | { type: 'REDO'; result: ApplyResult }
  | { type: 'FORCE_UNDO'; result: ApplyResult }
  | {
      type: 'PARTIAL_UNDO';
      result: ApplyResult;
      meta: HistoryEntryMeta;
    };
