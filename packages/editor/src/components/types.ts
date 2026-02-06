/**
 * Component Prop Types — implements contracts from
 * specs/004-editor-ux/contracts/components.ts
 */

import type {
  Project,
  GameMap,
  PatchSummary,
  AIProvider,
  ProposedPatchResult,
  ConflictDetectionResult,
  ConflictResolution,
  EntityDef,
  Tileset,
  PatchOp,
} from '@ai-rpg-maker/shared';

import type { ToolType, EditorState, EditorAction } from '../state/types.js';

// ---------------------------------------------------------------------------
// EditorShell — Top-level layout
// ---------------------------------------------------------------------------

export interface EditorShellProps {
  /** Initial project to load */
  initialProject: Project;
  /** AI provider for the AI panel */
  aiProvider: AIProvider;
}

// ---------------------------------------------------------------------------
// ProjectBrowser — Sidebar for map/entity/tileset selection
// ---------------------------------------------------------------------------

export interface ProjectBrowserProps {
  project: Project;
  activeMapId: string | null;
  selectedEntityDefId: string | null;
  onSelectMap: (mapId: string) => void;
  onSelectEntityDef: (entityDefId: string) => void;
}

// ---------------------------------------------------------------------------
// MapViewport — Canvas-based map editor
// ---------------------------------------------------------------------------

export interface MapViewportProps {
  /** The map being edited */
  map: GameMap;
  /** The tileset for this map */
  tileset: Tileset;
  /** Currently selected tool */
  activeTool: ToolType;
  /** Currently selected tile ID */
  selectedTileId: number;
  /** Currently selected layer ID */
  activeLayerId: string | null;
  /** Currently selected entity def ID (for entity tool) */
  selectedEntityDefId: string | null;
  /** Entity definitions (for rendering entity instances) */
  entityDefs: Record<string, EntityDef>;
  /** Callback when a gesture produces a patch transaction */
  onTransactionCommit: (cells: Array<{ x: number; y: number; value: number }>) => void;
  /** Callback when entity/trigger ops are produced */
  onOpsCommit: (ops: PatchOp[]) => void;
}

// ---------------------------------------------------------------------------
// TilesetPalette — Tile selector
// ---------------------------------------------------------------------------

export interface TilesetPaletteProps {
  tileset: Tileset;
  selectedTileId: number;
  onSelectTile: (tileId: number) => void;
}

// ---------------------------------------------------------------------------
// ToolBar — Tool selector
// ---------------------------------------------------------------------------

export interface ToolBarProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDownloadProject: () => void;
  onLoadProject: (json: string) => void;
}

// ---------------------------------------------------------------------------
// HistoryPanel — History entry list + undo/redo controls
// ---------------------------------------------------------------------------

export interface HistoryPanelEntry {
  /** Human-readable summary */
  summary: string;
  /** When the patch was applied */
  timestamp: number;
  /** Origin of the edit */
  origin: 'manual' | 'ai';
  /** Whether this entry is currently undone */
  isUndone: boolean;
}

export interface HistoryPanelProps {
  entries: HistoryPanelEntry[];
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

// ---------------------------------------------------------------------------
// AiPanel — AI prompt + propose + preview + apply/reject
// ---------------------------------------------------------------------------

export interface AiPanelProps {
  project: Project;
  provider: AIProvider;
  onApply: (result: ProposedPatchResult) => void;
  onError?: (error: string) => void;
}

// ---------------------------------------------------------------------------
// PatchPreview — Detailed patch summary display
// ---------------------------------------------------------------------------

export interface PatchPreviewProps {
  result: ProposedPatchResult;
  onApply: () => void;
  onReject: () => void;
  onRegenerate: () => void;
}

// ---------------------------------------------------------------------------
// ConflictModal — Conflict resolution dialog
// ---------------------------------------------------------------------------

export interface ConflictModalProps {
  conflicts: ConflictDetectionResult;
  onResolve: (resolution: ConflictResolution) => void;
}

// ---------------------------------------------------------------------------
// RuntimePreview — Excalibur engine embed
// ---------------------------------------------------------------------------

export interface RuntimePreviewProps {
  project: Project;
  activeMapId: string | null;
  onError?: (error: string) => void;
}
