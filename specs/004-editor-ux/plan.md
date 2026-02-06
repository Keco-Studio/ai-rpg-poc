# Implementation Plan: Editor UX v1

**Branch**: `004-editor-ux` | **Date**: 2026-02-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-editor-ux/spec.md`

## Summary

Build a patch-native map editor that treats the existing patch engine and history stack as the sole state mutation path. All manual editing actions (tile paint, collision paint, entity placement, trigger creation) produce PatchV1 operations and flow through the same validate → apply → history pipeline as AI-generated changes. The editor provides a diff preview for AI proposals, a browsable history timeline, and a conflict-aware undo system that detects when manual edits overlap with patches being undone and offers cancel/partial/force resolution options. A runtime preview panel embeds the Excalibur engine for play-testing.

## Technical Context

**Language/Version**: TypeScript 5.3+ (ES2022 target), Node.js 20+
**Primary Dependencies**: React 19, ExcaliburJS 0.29+, `@ai-rpg-maker/shared` (Zod 3.22+, patch engine, AI orchestrator)
**Storage**: In-memory Project state (no persistence layer in v1)
**Testing**: Vitest 3.0 (unit + integration)
**Target Platform**: Modern desktop browsers (Chrome, Firefox, Edge — latest 2 versions)
**Project Type**: Monorepo package (`packages/editor`)
**Performance Goals**: < 100ms per paint operation on 128×128 maps, < 2s preview reload
**Constraints**: Single-user, no persistence, no mobile
**Scale/Scope**: Medium maps (128×128), projects with 50+ maps for AI summary slicing

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| I | Model as Source of Truth | PASS | Editor state is derived from Project model; all mutations go through patch pipeline |
| II | Determinism over Magic | PASS | Same patch sequence applied to same base project produces same result; no hidden editor state affects project |
| III | Strict Validation | PASS | All manual edit patches validated via `validatePatch` before apply; invalid patches rejected |
| IV | Pixel Correctness | PASS | Map viewport renders tiles at integer positions with no smoothing; runtime preview uses existing pixel-correct renderer |
| V | Performance Guardrails | PASS | Transaction manager batches brush strokes; rect ops preferred over per-cell ops; target < 100ms per operation |
| VI | Transactional Editing | PASS | Core requirement — every gesture is an atomic, undoable transaction |
| VII | AI Changes via Patch Ops Only | PASS | AI panel uses `proposePatchWithRepair`; no raw project mutation |
| VIII | Reviewability | PASS | Diff preview for AI patches; small composable components; typed APIs throughout |
| IX | Testing | PASS | Unit tests for transaction grouping, conflict detection, filtered inverse; integration tests for full undo flow |
| X | Security and Privacy | PASS | AI panel uses existing orchestrator which sends only ProjectSummary (no raw tile data); editor is client-side only |

No violations. Gate passes.

## Project Structure

### Documentation (this feature)

```text
specs/004-editor-ux/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── editor-state.ts  # EditorStore, TransactionManager interfaces
│   ├── conflict-aware-history.ts  # Extended history with conflict detection
│   └── components.ts    # Component prop interfaces
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
packages/editor/src/
├── state/
│   ├── editorStore.ts          # Central state: project, selection, history, activeMap
│   ├── transaction.ts          # TransactionManager: begin/addOp/commit/cancel
│   └── conflictAwareHistory.ts # Extends HistoryStack with conflict preflight
├── components/
│   ├── EditorShell.tsx         # Top-level layout (sidebar + viewport + panels)
│   ├── ProjectBrowser.tsx      # Map list, tileset info, entity defs
│   ├── MapViewport.tsx         # Canvas-based map renderer + interaction handlers
│   ├── TilesetPalette.tsx      # Tile selection from current tileset
│   ├── ToolBar.tsx             # Tool selection (brush, rect, erase, collision, entity, trigger)
│   ├── HistoryPanel.tsx        # History entry list + undo/redo controls
│   ├── ConflictModal.tsx       # Conflict resolution dialog (existing, extended)
│   ├── ai/
│   │   ├── AiPanel.tsx         # AI prompt + propose + preview (existing, extended)
│   │   └── PatchPreview.tsx    # Detailed patch summary display
│   └── RuntimePreview.tsx      # Excalibur engine embed with play/reload
├── adapters/
│   ├── patchBuilders.ts        # Tool gesture → PatchOp[] conversion
│   └── contextProvider.ts      # ContextProvider for AI retrieval fallback
├── hooks/
│   ├── useEditorStore.ts       # React hook for editor state access
│   ├── useMapInteraction.ts    # Mouse/keyboard handlers for map viewport
│   └── useTransaction.ts       # Hook wrapping transaction lifecycle
├── renderers/
│   ├── tileRenderer.ts         # Canvas tile layer rendering
│   ├── collisionRenderer.ts    # Collision overlay rendering
│   ├── entityRenderer.ts       # Entity sprite/placeholder rendering
│   └── triggerRenderer.ts      # Trigger region outline rendering
└── index.ts                    # Public exports

packages/editor/tests/
├── unit/
│   ├── patchBuilders.test.ts
│   ├── transaction.test.ts
│   ├── conflictAwareHistory.test.ts
│   └── tileRenderer.test.ts
└── integration/
    ├── manualEditFlow.test.ts
    ├── aiPatchFlow.test.ts
    └── conflictUndoFlow.test.ts

packages/shared/src/
├── history/
│   └── history.ts              # Existing HistoryStack (no changes needed)
└── ai/
    └── conflict.ts             # Existing conflict detection (no changes needed)
```

**Structure Decision**: Extends the existing `packages/editor` package within the npm workspaces monorepo. No new packages created. The editor depends on `@ai-rpg-maker/shared` (patch engine, history, AI orchestrator) and `react`. The runtime preview embeds `@ai-rpg-maker/runtime` via an iframe or direct Excalibur engine instantiation.

## Milestones

| Milestone | Focus | Dependencies |
|-----------|-------|-------------|
| **M1** | Patch-native manual editing: tile + collision paint, transaction manager, canvas viewport, history panel with undo/redo | Shared package (patch engine, history) |
| **M2** | AI panel: integrate orchestrator, patch preview, apply/reject/regenerate flow | M1 + shared package (AI orchestrator) |
| **M3** | Conflict-aware undo: conflict detection preflight, resolution modal, partial inverse, force undo | M1, M2 |
| **M4** | Entity + trigger editing: placement, move, delete, trigger regions | M1 |
| **M5** | Runtime preview: Excalibur embed, play/reload, project browser polish | M1, M4 |

## Complexity Tracking

No constitution violations to justify. Architecture adds no new packages or abstraction layers beyond what is required by the spec.
