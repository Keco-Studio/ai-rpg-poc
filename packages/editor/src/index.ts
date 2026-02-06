/**
 * @ai-rpg-maker/editor
 *
 * Editor UI components for the AI RPG Maker.
 * Patch-native map editor with AI integration.
 */

// Components
export { EditorShell } from './components/EditorShell.js';
export { MapViewport } from './components/MapViewport.js';
export { ToolBar } from './components/ToolBar.js';
export { TilesetPalette } from './components/TilesetPalette.js';
export { ProjectBrowser } from './components/ProjectBrowser.js';
export { HistoryPanel } from './components/HistoryPanel.js';
export { ConflictModal } from './components/ConflictModal.js';
export { RuntimePreview } from './components/RuntimePreview.js';
export { AiPanel } from './components/ai/AiPanel.js';
export { PatchPreview } from './components/ai/PatchPreview.js';

// State
export { editorReducer, initialEditorState } from './state/editorStore.js';
export { TransactionManager } from './state/transaction.js';
export { ConflictAwareHistory } from './state/conflictAwareHistory.js';

// Types
export type {
  EditorState,
  EditorAction,
  ToolType,
  Transaction,
  CellChange,
  HistoryEntryMeta,
  EditOrigin,
} from './state/types.js';

export type {
  UndoPreflightResult,
  ConflictAwareHistoryInterface,
  FilteredInverseBuilder,
} from './state/conflictAwareHistoryTypes.js';

export type {
  EditorShellProps,
  ProjectBrowserProps,
  MapViewportProps,
  TilesetPaletteProps,
  ToolBarProps,
  HistoryPanelProps,
  HistoryPanelEntry,
  AiPanelProps,
  PatchPreviewProps,
  ConflictModalProps,
  RuntimePreviewProps,
} from './components/types.js';

// Hooks
export { EditorProvider, useEditorStore } from './hooks/useEditorStore.js';
export { useTransaction } from './hooks/useTransaction.js';

// Adapters
export {
  buildTileOps,
  buildCollisionOps,
  buildRectFillOp,
  buildPlaceEntityOp,
  buildMoveEntityOp,
  buildDeleteEntityOp,
  buildCreateTriggerOp,
} from './adapters/patchBuilders.js';

export { buildEnhancedContext } from './adapters/contextProvider.js';

// Demo
export { createDemoProject } from './demoProject.js';
