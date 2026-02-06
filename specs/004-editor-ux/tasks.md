# Tasks: Editor UX v1

**Input**: Design documents from `/specs/004-editor-ux/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Included — the spec explicitly requests unit tests for transaction grouping, conflict detection, and integration tests for the conflict undo flow (see spec Deliverables and acceptance criteria).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo package**: `packages/editor/src/`, `packages/editor/tests/`
- Shared package at `packages/shared/src/` (read-only — no changes planned)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the editor package with Vite dev server, React entry point, CSS Modules support, and type definitions from contracts.

- [X] T001 Add Vite 5 + `@vitejs/plugin-react` as devDependencies and create `packages/editor/vite.config.ts` with CSS Modules enabled and `imageSmoothingEnabled`-friendly canvas settings
- [X] T002 Create React entry point at `packages/editor/src/main.tsx` and `packages/editor/index.html` that renders an `<EditorShell>` placeholder into the DOM
- [X] T003 [P] Create editor state types at `packages/editor/src/state/types.ts` implementing `EditorState`, `EditorAction`, `ToolType`, `Transaction`, `CellChange`, `HistoryEntryMeta`, and `EditOrigin` per `specs/004-editor-ux/contracts/editor-state.ts`
- [X] T004 [P] Create conflict-aware history types at `packages/editor/src/state/conflictAwareHistoryTypes.ts` implementing `UndoPreflightResult`, `ConflictAwareHistory`, and `FilteredInverseBuilder` per `specs/004-editor-ux/contracts/conflict-aware-history.ts`
- [X] T005 [P] Create component prop types at `packages/editor/src/components/types.ts` implementing all component prop interfaces per `specs/004-editor-ux/contracts/components.ts`
- [X] T006 Create a hardcoded demo project factory at `packages/editor/src/demoProject.ts` that returns a `Project` with one tileset, one map (16×16), one tile layer, one entity def, and one entity instance — sufficient for testing all editor tools

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core state management and transaction infrastructure that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Implement `editorReducer` and `initialEditorState` in `packages/editor/src/state/editorStore.ts` — handle all `EditorAction` cases: `SET_PROJECT`, `SET_ACTIVE_MAP`, `SET_ACTIVE_LAYER`, `SET_TOOL`, `SET_TILE`, `SET_ENTITY_DEF`, `BEGIN_TRANSACTION`, `ADD_CELLS`, `ADD_OPS`, `COMMIT_TRANSACTION`, `CANCEL_TRANSACTION`, `APPLY_PATCH`, `UNDO`, `REDO`, `FORCE_UNDO`, `PARTIAL_UNDO`; wire `HistoryStack` from `@ai-rpg-maker/shared`; manage `historyMeta` parallel array
- [X] T008 Implement `useEditorStore` React hook in `packages/editor/src/hooks/useEditorStore.ts` — wraps `useReducer` + `React.createContext` to provide `EditorState` + `dispatch` to all children
- [X] T009 Implement `TransactionManager` in `packages/editor/src/state/transaction.ts` — `begin()`, `addCells()`, `addOps()`, `commit()` (builds PatchV1 from accumulated cells/ops, calls `validatePatch` then `applyPatch`, builds `HistoryEntryMeta` with `buildConflictHunks`), and `cancel()`
- [X] T010 [P] Implement patch builder functions in `packages/editor/src/adapters/patchBuilders.ts` — `buildTileOps` (with rect detection: compute bounding box, check if cells fill it, emit `paintRect` or `setTiles`), `buildCollisionOps` (same rect optimization with `setCollisionRect` or `setCollisionCells`), `buildRectFillOp`, `buildPlaceEntityOp`, `buildMoveEntityOp`, `buildDeleteEntityOp`, `buildCreateTriggerOp`
- [X] T011 [P] Write unit tests for patch builders in `packages/editor/tests/unit/patchBuilders.test.ts` — test: brush stroke scattered cells → `setTiles`; brush stroke forming rectangle → `paintRect`; collision cells → `setCollisionCells` or `setCollisionRect`; entity place/move/delete ops; rect fill op
- [X] T012 [P] Write unit tests for transaction manager in `packages/editor/tests/unit/transaction.test.ts` — test: begin creates Transaction with correct fields; addCells accumulates; commit builds valid PatchV1, calls applyPatch, returns ApplyResult+meta; commit with invalid cells returns null; cancel clears transaction

**Checkpoint**: Foundation ready — editor state, transaction manager, and patch builders are tested and working. User story implementation can now begin.

---

## Phase 3: User Story 1 — Manual Tile and Collision Painting (Priority: P1) MVP

**Goal**: Creator can paint tiles and collision in the map viewport; every stroke is an undoable history entry.

**Independent Test**: Open editor, select brush tool, paint tiles on map, undo → stroke reverts, redo → reapplies. Switch to collision tool, paint collision, undo/redo. Use rect tool, fill region, undo/redo. Use erase tool, clear tiles, undo/redo.

### Implementation for User Story 1

- [X] T013 [US1] Implement tile layer renderer in `packages/editor/src/renderers/tileRenderer.ts` — function `renderTileLayers(ctx, map, tileset, tilesetImage, activeLayerId)` that draws all layers bottom-up by zIndex on a Canvas 2D context with `imageSmoothingEnabled = false`; highlight active layer; dim inactive layers
- [X] T014 [P] [US1] Implement collision overlay renderer in `packages/editor/src/renderers/collisionRenderer.ts` — function `renderCollisionOverlay(ctx, map, tileSize)` that draws semi-transparent red rectangles over collision=1 cells
- [X] T015 [US1] Implement `MapViewport` component in `packages/editor/src/components/MapViewport.tsx` — Canvas element with pan (middle-click drag or scroll) and zoom (scroll wheel); transforms mouse coordinates to tile coordinates; renders tile layers via `tileRenderer`, collision overlay via `collisionRenderer`; uses `requestAnimationFrame` with dirty flag for redraws; accepts `MapViewportProps` from contracts
- [X] T016 [US1] Implement `useMapInteraction` hook in `packages/editor/src/hooks/useMapInteraction.ts` — handles mousedown/mousemove/mouseup on the canvas; on mousedown with brush/erase/collision tool: dispatches `BEGIN_TRANSACTION`; on mousemove: computes tile coordinate from mouse position, dispatches `ADD_CELLS` with `{x, y, value}` (value = selectedTileId for brush, 0 for erase, 1 for collision); on mouseup: calls `TransactionManager.commit()` and dispatches `COMMIT_TRANSACTION`; on Escape: dispatches `CANCEL_TRANSACTION`
- [X] T017 [US1] Implement `useTransaction` hook in `packages/editor/src/hooks/useTransaction.ts` — wraps TransactionManager lifecycle; provides `beginTransaction`, `addCells`, `addOps`, `commitTransaction`, `cancelTransaction` functions that dispatch to the editor reducer; handles rect tool mode (mousedown records start corner, mouseup records end corner, commit builds single `buildRectFillOp`)
- [X] T018 [P] [US1] Implement `TilesetPalette` component in `packages/editor/src/components/TilesetPalette.tsx` with `TilesetPalette.module.css` — renders tileset image as a grid of selectable tiles; highlights selected tile; calls `onSelectTile` on click; shows tile ID on hover
- [X] T019 [P] [US1] Implement `ToolBar` component in `packages/editor/src/components/ToolBar.tsx` with `ToolBar.module.css` — buttons for brush, rect, erase, collision, entity, trigger tools; highlights active tool; undo/redo buttons (disabled when `canUndo`/`canRedo` is false); keyboard shortcuts: Ctrl+Z = undo, Ctrl+Shift+Z = redo
- [X] T020 [US1] Implement `EditorShell` component in `packages/editor/src/components/EditorShell.tsx` with `EditorShell.module.css` — top-level layout: ToolBar (top), ProjectBrowser placeholder (left sidebar), MapViewport (center), TilesetPalette (bottom or right), panel slots for HistoryPanel and AiPanel (right); wraps children in `useEditorStore` Context provider; loads demo project on mount
- [X] T021 [US1] Wire undo/redo in `EditorShell`: on undo button click or Ctrl+Z, call `history.undo(project)` and dispatch `UNDO`; on redo, call `history.redo(project)` and dispatch `REDO`; update viewport after each

**Checkpoint**: User Story 1 complete — tile painting (brush, rect, erase) and collision painting work with full undo/redo through the patch pipeline. The editor is a usable tile editor.

---

## Phase 4: User Story 2 — AI Patch Proposal and Preview (Priority: P1)

**Goal**: Creator can enter a natural language prompt, receive an AI patch proposal with summary preview, and apply or reject it.

**Independent Test**: Enter a prompt in the AI panel, receive a proposal, review summary (created/modified/deleted counts), click Apply → history entry with AI origin created, viewport updates. Click Reject → project unchanged, prompt preserved. Click Regenerate → new proposal.

### Implementation for User Story 2

- [X] T022 [US2] Implement `PatchPreview` component in `packages/editor/src/components/ai/PatchPreview.tsx` with `PatchPreview.module.css` — displays `PatchSummary` (created/modified/deleted resource counts, tile edit counts, collision edit counts), warnings list, repair attempt count, destructive operation warnings; provides Apply, Reject, and Regenerate buttons
- [X] T023 [US2] Refactor existing `AiPanel` component at `packages/editor/src/ai/AiPanel.tsx` → move to `packages/editor/src/components/ai/AiPanel.tsx` — update to accept `AiPanelProps` from contracts (with `onApply` callback that receives `ProposedPatchResult`); integrate `PatchPreview` for proposal display; on Apply: call `onApply` which dispatches `APPLY_PATCH` in EditorShell with origin=`'ai'` and summary from prompt; on Reject: clear result, preserve prompt; on Regenerate: re-call `proposePatchWithRepair` with same prompt
- [X] T024 [US2] Wire AiPanel into EditorShell in `packages/editor/src/components/EditorShell.tsx` — add AiPanel to right panel area; implement `handleAiApply` callback that calls `applyPatch(project, result.patch)`, builds `HistoryEntryMeta` with `origin: 'ai'` and `buildConflictHunks`, dispatches `APPLY_PATCH`; verify viewport re-renders after apply
- [X] T025 [US2] Implement `buildEnhancedContext` in `packages/editor/src/adapters/contextProvider.ts` — extends `buildProjectSummary` output with tile data for the active map and full entity/trigger details for the active map; passed as additional context in the AI prompt

**Checkpoint**: User Story 2 complete — AI propose → preview → apply/reject works end-to-end. Both P1 stories are done; the editor supports manual and AI editing.

---

## Phase 5: User Story 3 — History Timeline Browsing (Priority: P2)

**Goal**: Creator can browse a chronological history of all edits with summary, timestamp, and origin (Manual/AI), and navigate via undo/redo.

**Independent Test**: Perform several manual edits and one AI apply, open history panel, verify entries show correct metadata, click undo/redo and verify viewport updates.

### Implementation for User Story 3

- [X] T026 [US3] Implement `HistoryPanel` component in `packages/editor/src/components/HistoryPanel.tsx` with `HistoryPanel.module.css` — renders `HistoryPanelEntry[]` as a scrollable list; each entry shows: origin badge (Manual/AI), summary text, formatted timestamp; entries after the current undo cursor are visually dimmed (marked as undone); undo/redo buttons at the top; auto-scrolls to current position
- [X] T027 [US3] Wire `HistoryPanel` into `EditorShell` — derive `HistoryPanelEntry[]` from `historyMeta` + `undoneCount`; pass `canUndo`/`canRedo` from `HistoryStack`; connect undo/redo buttons to existing undo/redo dispatch logic

**Checkpoint**: User Story 3 complete — history panel shows all edits with correct metadata; undo/redo navigates the timeline.

---

## Phase 6: User Story 4 — Conflict-Aware Undo (Priority: P2)

**Goal**: When undoing a patch that conflicts with subsequent manual edits, a conflict resolution dialog appears with Cancel, Undo Safe Parts Only, and Force Undo options.

**Independent Test**: Apply AI patch → manually paint over same tiles → undo AI patch → conflict dialog appears. Test all 3 options. Also test: undo with no conflicts proceeds normally.

### Implementation for User Story 4

- [X] T028 [US4] Implement `ConflictAwareHistory` class in `packages/editor/src/state/conflictAwareHistory.ts` — wraps `HistoryStack`; `applyAndPush` stores `ConflictHunk[]` via `buildConflictHunks` in the meta array; `preflightUndo` calls `detectConflicts(project, storedHunks)` and returns `UndoPreflightResult`; `undo` delegates to `HistoryStack.undo()`; `partialUndo` builds filtered inverse (using `FilteredInverseBuilder`), applies it via `applyPatch`, pushes as new history entry; `redo` delegates to `HistoryStack.redo()`
- [X] T029 [P] [US4] Implement `FilteredInverseBuilder` in `packages/editor/src/state/filteredInverse.ts` — `opToHunkRef(op)` maps each PatchOp to a hunk ref string (e.g., `paintRect` → `"map:{mapId}:layer:{layerId}:tiles"`); `buildFilteredInverse(inversePatch, safeHunks, originalPatch)` keeps only ops whose hunk ref is in `safeHunks`, returns new PatchV1
- [X] T030 [US4] Refactor existing `ConflictDialog` at `packages/editor/src/ai/ConflictDialog.tsx` → move to `packages/editor/src/components/ConflictModal.tsx` with `ConflictModal.module.css` — update to use `ConflictModalProps` from contracts; display conflict list with hunk refs and human-readable descriptions; three buttons: Cancel (default, focused), Undo Safe Parts Only, Force Undo
- [X] T031 [US4] Wire conflict-aware undo into `packages/editor/src/components/EditorShell.tsx` — replace direct `HistoryStack` usage with `ConflictAwareHistory`; on undo action: call `preflightUndo`; if `hasConflicts`: show `ConflictModal`; on resolution `cancel`: close dialog; on `force`: call `undo` and dispatch `FORCE_UNDO`; on `partial`: call `partialUndo` and dispatch `PARTIAL_UNDO`; if no conflicts: call `undo` and dispatch `UNDO` as before
- [X] T032 [P] [US4] Write unit tests for `ConflictAwareHistory` in `packages/editor/tests/unit/conflictAwareHistory.test.ts` — test: applyAndPush stores hunks; preflightUndo with no subsequent edits returns no conflicts; preflightUndo with overlapping manual edit returns conflicts; undo applies full inverse; partialUndo skips conflicting hunks; force undo ignores conflicts
- [X] T033 [P] [US4] Write integration test for conflict undo flow in `packages/editor/tests/integration/conflictUndoFlow.test.ts` — test full scenario: create project → apply AI patch (tiles in region) → apply manual patch (tiles in overlapping region) → undo AI patch → verify conflict detected → test each resolution option (cancel: no change; partial: only safe hunks undone; force: full revert)

**Checkpoint**: User Story 4 complete — conflict-aware undo works with all 3 resolution options tested.

---

## Phase 7: User Story 5 — Entity and Trigger Editing (Priority: P2)

**Goal**: Creator can place, move, and delete entities and draw trigger regions, all undoable through the patch pipeline.

**Independent Test**: Select entity tool, click to place entity on map, drag to move, delete key to remove. Select trigger tool, draw rectangle. Undo/redo each action.

### Implementation for User Story 5

- [X] T034 [P] [US5] Implement entity renderer in `packages/editor/src/renderers/entityRenderer.ts` — function `renderEntities(ctx, map, entityDefs, tileSize)` that draws each entity instance as a colored rectangle with entity type label (placeholder sprites; real sprites deferred); highlight selected entity
- [X] T035 [P] [US5] Implement trigger renderer in `packages/editor/src/renderers/triggerRenderer.ts` — function `renderTriggers(ctx, map, tileSize)` that draws each trigger region as a dashed-border rectangle with name label; highlight selected trigger
- [X] T036 [US5] Add entity tool interaction to `useMapInteraction` hook in `packages/editor/src/hooks/useMapInteraction.ts` — on click with entity tool: if clicking empty space, build `buildPlaceEntityOp` with `selectedEntityDefId` and dispatch as single-op transaction; if clicking existing entity, enter drag mode; on drag end, build `buildMoveEntityOp` and commit; on Delete key with entity selected, build `buildDeleteEntityOp` and commit
- [X] T037 [US5] Add trigger tool interaction in `packages/editor/src/hooks/useMapInteraction.ts` — on mousedown with trigger tool: record start corner; on mouseup: compute rectangle bounds, generate UUID for trigger ID, build `buildCreateTriggerOp` and commit as single-op transaction
- [X] T038 [US5] Add entity and trigger renderers to `packages/editor/src/components/MapViewport.tsx` — call `renderEntities` and `renderTriggers` after tile layers in the render loop; entity and trigger overlays render on top of tiles
- [X] T039 [US5] Implement `ProjectBrowser` component in `packages/editor/src/components/ProjectBrowser.tsx` with `ProjectBrowser.module.css` — sidebar showing: map list (clickable to switch active map), tileset info (name, tile count, dimensions), entity definition list (clickable to select for placement); accepts `ProjectBrowserProps` from contracts

**Checkpoint**: User Story 5 complete — entities and triggers can be placed, moved, deleted, and drawn, all through the patch pipeline with undo/redo.

---

## Phase 8: User Story 6 — Runtime Preview (Priority: P3)

**Goal**: Creator can play the current map in an embedded Excalibur preview and reload after edits.

**Independent Test**: Click Play in the preview panel, verify map renders with tiles and entities. Make an edit, click Reload, verify preview updates.

### Implementation for User Story 6

- [X] T040 [US6] Create runtime preview host page at `packages/editor/public/preview.html` — minimal HTML page that loads Excalibur, listens for `postMessage` events (`loadProject`, `reload`), calls `compileMapScene` from `@ai-rpg-maker/runtime`, and sends `ready`/`error` messages back to parent
- [X] T041 [US6] Implement `RuntimePreview` component in `packages/editor/src/components/RuntimePreview.tsx` with `RuntimePreview.module.css` — renders an `<iframe>` pointing to `preview.html`; provides Play and Reload buttons; on Play: sends `{ type: 'loadProject', project, mapId }` via `postMessage`; on Reload: sends `{ type: 'reload' }`; listens for `ready` and `error` messages; shows loading/error states
- [X] T042 [US6] Wire RuntimePreview into `packages/editor/src/components/EditorShell.tsx` — add to bottom panel area; pass current `project` and `activeMapId`; auto-send reload message after any `COMMIT_TRANSACTION`, `APPLY_PATCH`, `UNDO`, or `REDO` action

**Checkpoint**: User Story 6 complete — runtime preview plays the current map and reloads after edits.

---

## Phase 9: User Story 7 — Large Project AI Support (Priority: P3)

**Goal**: AI proposals work on large projects via enhanced context; optional debug view shows what context was requested.

**Independent Test**: Load a project with 50+ maps, submit an AI prompt, verify proposal completes. Expand debug view and verify context slice info is shown.

### Implementation for User Story 7

- [X] T043 [US7] Extend `buildEnhancedContext` in `packages/editor/src/adapters/contextProvider.ts` — add `getMapSlice(mapId, region?)`, `getEntityDef(id)`, `getTriggers(mapId)` helper functions; for large projects (>30 maps), include only active map tile data and summarize others; return enhanced context with `contextSlicesRequested` metadata for debug display
- [X] T044 [US7] Add optional AI debug panel toggle to `AiPanel` in `packages/editor/src/components/ai/AiPanel.tsx` — collapsible section at the bottom showing: context token estimate, which map slices were included, entity/trigger details fetched; only visible when expanded; does not affect normal propose flow

**Checkpoint**: User Story 7 complete — AI proposals work on large projects with enhanced context and debug visibility.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Integration tests, documentation, cleanup, and export updates

- [X] T045 [P] Write integration test for manual edit flow in `packages/editor/tests/integration/manualEditFlow.test.ts` — test: create project → paint tiles → undo → redo → paint collision → undo → verify project state at each step matches expected; test rect tool produces `paintRect` op; test erase produces `clearTiles` op
- [X] T046 [P] Write integration test for AI patch flow in `packages/editor/tests/integration/aiPatchFlow.test.ts` — test: create project → propose patch via MockProvider → verify preview shows correct summary → apply → verify project updated and history entry has AI origin → reject new proposal → verify project unchanged
- [X] T047 Update `packages/editor/src/index.ts` — export all public components (`EditorShell`), types (`EditorState`, `EditorAction`, `ToolType`, etc.), and hooks (`useEditorStore`)
- [X] T048 Update `packages/editor/package.json` — add `@ai-rpg-maker/runtime` as optional peerDependency (for runtime preview); add `vite` and `@vitejs/plugin-react` to devDependencies; add `"dev": "vite"` and `"build": "tsc && vite build"` scripts
- [X] T049 Run `npm test --workspace=packages/editor` and `npm run build --workspace=packages/editor` to verify all tests pass and the package builds cleanly

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — no other story dependencies
- **US2 (Phase 4)**: Depends on Phase 2 — can run in parallel with US1 but benefits from US1 viewport being available
- **US3 (Phase 5)**: Depends on Phase 2 — uses history entries created by US1/US2 but can be built independently
- **US4 (Phase 6)**: Depends on Phase 2 + US2 (needs AI patches in history to test conflict detection)
- **US5 (Phase 7)**: Depends on Phase 2 + US1 viewport — can run in parallel with US2/US3/US4
- **US6 (Phase 8)**: Depends on Phase 2 + US1 viewport — can run in parallel with other P2/P3 stories
- **US7 (Phase 9)**: Depends on US2 (AI panel must exist)
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundational (BLOCKS ALL)
    ↓
    ├── US1 (P1): Tile/Collision Painting ← MVP
    ├── US2 (P1): AI Proposal + Preview
    ├── US3 (P2): History Panel ← after US1 or US2 creates entries
    ├── US4 (P2): Conflict-Aware Undo ← after US2 (needs AI patches)
    ├── US5 (P2): Entity/Trigger Editing ← after US1 viewport
    ├── US6 (P3): Runtime Preview ← after US1 viewport
    └── US7 (P3): Large Project AI ← after US2
    ↓
Phase 10: Polish
```

### Within Each User Story

- State/logic before UI components
- Renderers before viewport integration
- Core implementation before wiring into EditorShell
- Tests alongside or after implementation

### Parallel Opportunities

- **Phase 1**: T003, T004, T005 can all run in parallel (separate type files)
- **Phase 2**: T010 (patch builders) and T011 (tests) and T012 (tests) can run in parallel
- **US1**: T013+T014 (renderers) can run in parallel; T018+T019 (palette+toolbar) can run in parallel
- **US4**: T029 (filtered inverse) and T032+T033 (tests) can run in parallel with T028
- **US5**: T034+T035 (renderers) can run in parallel
- **US1 + US5**: Can run in parallel after Phase 2 (different tool interactions, different renderers)
- **US2 + US3**: Can run in parallel after Phase 2 (AI panel vs history panel, no shared code)
- **Phase 10**: T045+T046 (integration tests) can run in parallel

---

## Parallel Example: After Phase 2

```bash
# Developer A: User Story 1 (tile painting)
Task: T013 — tile renderer
Task: T014 — collision renderer (parallel with T013)
Task: T015 — MapViewport
Task: T016 — useMapInteraction
...

# Developer B: User Story 2 (AI panel) — in parallel with Dev A
Task: T022 — PatchPreview component
Task: T023 — AiPanel refactor
Task: T024 — Wire into EditorShell
...

# Developer C: User Story 5 (entities) — in parallel with Dev A/B
Task: T034 — entity renderer
Task: T035 — trigger renderer (parallel with T034)
Task: T036 — entity interaction
...
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (Tile/Collision Painting)
4. **STOP and VALIDATE**: Paint tiles, undo/redo, verify patch pipeline works
5. This delivers a functional tile editor with full undo support

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Tile Painting) → **MVP!** Usable tile editor with undo
3. Add US2 (AI Panel) → AI-assisted editing with preview
4. Add US3 (History Panel) → Visual history browsing
5. Add US4 (Conflict Undo) → Safe undo when patches overlap
6. Add US5 (Entities/Triggers) → Complete map editing toolkit
7. Add US6 (Runtime Preview) → Play-test in editor
8. Add US7 (Large Project AI) → Scale to production projects
9. Each story adds value without breaking previous stories

### Parallel Team Strategy

With 3 developers after Phase 2:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (Tile Painting) → US3 (History Panel)
   - Developer B: US2 (AI Panel) → US4 (Conflict Undo) → US7 (Large Project AI)
   - Developer C: US5 (Entity/Trigger) → US6 (Runtime Preview)
3. All developers: Phase 10 (Polish + integration tests)

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- The spec requests tests (Deliverables section): unit tests for transaction grouping and conflict detection, integration tests for conflict undo flow
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Existing `AiPanel.tsx` and `ConflictDialog.tsx` are refactored in-place (moved, updated props) rather than deleted+recreated
