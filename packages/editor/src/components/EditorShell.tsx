/**
 * EditorShell — Top-level layout component
 *
 * Layout: ToolBar (top), ProjectBrowser (left sidebar), MapViewport (center),
 * TilesetPalette (bottom), panels for HistoryPanel and AiPanel (right).
 * Wraps children in EditorProvider context. Loads demo project on mount.
 */

import React, { useCallback, useMemo } from 'react';
import type { EditorShellProps } from './types.js';
import { EditorProvider, useEditorStore } from '../hooks/useEditorStore.js';
import { ToolBar } from './ToolBar.js';
import { TilesetPalette } from './TilesetPalette.js';
import { MapViewport } from './MapViewport.js';
import { ProjectBrowser } from './ProjectBrowser.js';
import { HistoryPanel } from './HistoryPanel.js';
import { AiPanel } from './ai/AiPanel.js';
import { ConflictModal } from './ConflictModal.js';
import { useTransaction } from '../hooks/useTransaction.js';
import type { ToolType, CellChange } from '../state/types.js';
import type {
  PatchOp,
  AIProvider,
  ProposedPatchResult,
  ConflictDetectionResult,
  ConflictResolution,
} from '@ai-rpg-maker/shared';
import { applyPatch, buildConflictHunks } from '@ai-rpg-maker/shared';
import type { HistoryPanelEntry } from './types.js';

function EditorShellInner({ aiProvider }: { aiProvider: AIProvider }) {
  const { state, dispatch } = useEditorStore();
  const {
    beginTransaction,
    addCells,
    addOps,
    commitTransaction,
    cancelTransaction,
    historyStack,
  } = useTransaction(state, dispatch);

  const [conflictData, setConflictData] = React.useState<ConflictDetectionResult | null>(null);

  // Current map and tileset
  const activeMap = state.activeMapId
    ? state.project.maps[state.activeMapId]
    : null;
  const activeTileset = activeMap
    ? state.project.tilesets[activeMap.tilesetId]
    : null;

  // Undo/redo
  const canUndo = historyStack.canUndo();
  const canRedo = historyStack.canRedo();

  const handleUndo = useCallback(() => {
    if (!historyStack.canUndo()) return;
    const result = historyStack.undo(state.project);
    if (result) {
      dispatch({ type: 'UNDO', result });
    }
  }, [historyStack, state.project, dispatch]);

  const handleRedo = useCallback(() => {
    if (!historyStack.canRedo()) return;
    const result = historyStack.redo(state.project);
    if (result) {
      dispatch({ type: 'REDO', result });
    }
  }, [historyStack, state.project, dispatch]);

  // Tool selection
  const handleSelectTool = useCallback(
    (tool: ToolType) => dispatch({ type: 'SET_TOOL', tool }),
    [dispatch],
  );

  // Tile selection
  const handleSelectTile = useCallback(
    (tileId: number) => dispatch({ type: 'SET_TILE', tileId }),
    [dispatch],
  );

  // Map selection
  const handleSelectMap = useCallback(
    (mapId: string) => dispatch({ type: 'SET_ACTIVE_MAP', mapId }),
    [dispatch],
  );

  // Entity def selection
  const handleSelectEntityDef = useCallback(
    (entityDefId: string) => dispatch({ type: 'SET_ENTITY_DEF', entityDefId }),
    [dispatch],
  );

  // Transaction callbacks for MapViewport
  const handleBeginTransaction = useCallback(() => {
    if (state.activeMapId) {
      beginTransaction(
        state.activeTool,
        state.activeMapId,
        state.activeLayerId,
      );
    }
  }, [beginTransaction, state.activeTool, state.activeMapId, state.activeLayerId]);

  const handleAddCells = useCallback(
    (cells: CellChange[]) => addCells(cells),
    [addCells],
  );

  const handleAddOps = useCallback(
    (ops: PatchOp[]) => addOps(ops),
    [addOps],
  );

  const handleCommitTransaction = useCallback(
    () => commitTransaction(),
    [commitTransaction],
  );

  const handleCancelTransaction = useCallback(
    () => cancelTransaction(),
    [cancelTransaction],
  );

  // AI Panel apply handler
  const handleAiApply = useCallback(
    (proposalResult: ProposedPatchResult) => {
      if (!proposalResult.patch) return;
      const result = applyPatch(state.project, proposalResult.patch);
      const conflictHunks = buildConflictHunks(result.project, proposalResult.patch);

      // Also push to history stack
      historyStack.applyAndPush(state.project, proposalResult.patch);

      dispatch({
        type: 'APPLY_PATCH',
        result,
        meta: {
          origin: 'ai',
          summary: `AI: ${proposalResult.message || 'Applied AI patch'}`,
          timestamp: Date.now(),
          conflictHunks,
        },
      });
    },
    [state.project, historyStack, dispatch],
  );

  // Conflict resolution handler
  const handleConflictResolve = useCallback(
    (resolution: ConflictResolution) => {
      setConflictData(null);
      if (resolution === 'cancel') return;
      if (resolution === 'force') {
        const result = historyStack.undo(state.project);
        if (result) dispatch({ type: 'FORCE_UNDO', result });
      }
      // partial undo is handled in Phase 6
    },
    [historyStack, state.project, dispatch],
  );

  // History panel entries
  const historyEntries: HistoryPanelEntry[] = useMemo(() => {
    return state.historyMeta.map((meta, i) => ({
      summary: meta.summary,
      timestamp: meta.timestamp,
      origin: meta.origin,
      isUndone: i >= state.historyMeta.length - state.undoneCount,
    }));
  }, [state.historyMeta, state.undoneCount]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      {/* Toolbar */}
      <ToolBar
        activeTool={state.activeTool}
        onSelectTool={handleSelectTool}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* Main content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left sidebar - Project Browser */}
        <ProjectBrowser
          project={state.project}
          activeMapId={state.activeMapId}
          onSelectMap={handleSelectMap}
          onSelectEntityDef={handleSelectEntityDef}
        />

        {/* Center - Map Viewport */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {activeMap && activeTileset ? (
            <MapViewport
              map={activeMap}
              tileset={activeTileset}
              activeTool={state.activeTool}
              selectedTileId={state.selectedTileId}
              activeLayerId={state.activeLayerId}
              selectedEntityDefId={state.selectedEntityDefId}
              entityDefs={state.project.entityDefs}
              onTransactionCommit={() => {}}
              onOpsCommit={() => {}}
              onBeginTransaction={handleBeginTransaction}
              onAddCells={handleAddCells}
              onAddOps={handleAddOps}
              onCommitTransaction={handleCommitTransaction}
              onCancelTransaction={handleCancelTransaction}
            />
          ) : (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6c7086',
              }}
            >
              No map selected
            </div>
          )}

          {/* Bottom - Tileset Palette */}
          {activeTileset && (
            <TilesetPalette
              tileset={activeTileset}
              selectedTileId={state.selectedTileId}
              onSelectTile={handleSelectTile}
            />
          )}
        </div>

        {/* Right sidebar - Panels */}
        <div
          style={{
            width: 280,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid #313244',
            background: '#1e1e2e',
            overflow: 'hidden',
          }}
        >
          <HistoryPanel
            entries={historyEntries}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />

          <AiPanel
            project={state.project}
            provider={aiProvider}
            onApply={handleAiApply}
          />
        </div>
      </div>

      {/* Conflict Modal */}
      {conflictData && (
        <ConflictModal
          conflicts={conflictData}
          onResolve={handleConflictResolve}
        />
      )}
    </div>
  );
}

/**
 * EditorShell — Top-level component with context provider
 */
export function EditorShell({ initialProject, aiProvider }: EditorShellProps) {
  return (
    <EditorProvider initialProject={initialProject}>
      <EditorShellInner aiProvider={aiProvider} />
    </EditorProvider>
  );
}
