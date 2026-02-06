# Data Model: Editor UX v1

**Feature**: 004-editor-ux
**Date**: 2026-02-06

## Overview

The editor introduces new entities for managing editor state, tool interactions, and conflict-aware undo. These entities live in `packages/editor` and compose existing types from `@ai-rpg-maker/shared` (Project, PatchV1, HistoryStack, PatchSummary, ConflictHunk, ConflictDetectionResult, ConflictResolution).

## Entities

### 1. EditorState

The root state object for the entire editor. Managed by a React `useReducer`.

| Field | Type | Description |
|-------|------|-------------|
| project | `Project` | Current authoritative project state. All mutations go through patch pipeline. |
| history | `HistoryStack` | Undo/redo stack from shared package. |
| activeMapId | `string \| null` | ID of the currently selected map for editing. |
| activeLayerId | `string \| null` | ID of the currently selected tile layer within the active map. |
| activeTool | `ToolType` | Currently selected editing tool. |
| selectedTileId | `number` | Tile ID selected from the tileset palette (0 = empty). |
| selectedEntityDefId | `string \| null` | Entity definition ID selected for placement. |
| transaction | `Transaction \| null` | In-progress gesture transaction, or null when idle. |
| historyMeta | `HistoryEntryMeta[]` | Parallel array of metadata for history entries (origin, summary text, conflict hunks). Indexed to match HistoryStack's internal entries. |

**Validation rules**:
- `activeMapId` must reference a valid map in `project.maps` or be null.
- `activeLayerId` must reference a valid layer within the active map or be null.
- `selectedTileId` must be within the active map's tileset tile range (0 to tileCount).
- `selectedEntityDefId` must reference a valid entity definition in `project.entityDefs` or be null.

---

### 2. ToolType

Enumeration of available editing tools.

| Value | Description |
|-------|-------------|
| `brush` | Paint individual tiles by dragging |
| `rect` | Fill a rectangular region with a tile |
| `erase` | Clear tiles to 0 |
| `collision` | Toggle collision cells (solid/empty) |
| `entity` | Place, move, or delete entity instances |
| `trigger` | Draw and edit trigger regions |

---

### 3. Transaction

Represents an in-progress editing gesture. Created on mouse down, committed on mouse up.

| Field | Type | Description |
|-------|------|-------------|
| id | `string` | Unique transaction ID (UUID). |
| toolType | `ToolType` | The tool that started this transaction. |
| mapId | `string` | The map being edited. |
| layerId | `string \| null` | The layer being edited (for tile/erase tools). |
| cells | `Array<{ x: number; y: number; value: number }>` | Accumulated cell changes (for brush/erase/collision tools). |
| entityOps | `PatchOp[]` | Accumulated entity/trigger operations (for entity/trigger tools). |
| startedAt | `number` | Timestamp (ms since epoch) when the transaction began. |

**State transitions**:
- `idle` → `begin(toolType, mapId, layerId)` → Transaction created
- Transaction → `addCells(cells)` / `addOps(ops)` → cells/ops accumulated
- Transaction → `commit()` → PatchV1 built from accumulated ops, validated, applied, pushed to history
- Transaction → `cancel()` → Transaction discarded, no patch created

**Validation rules**:
- `mapId` must exist in the project.
- `layerId` (when present) must exist in the map.
- Cell coordinates must be within map bounds.
- On commit, the generated PatchV1 must pass `validatePatch`.

---

### 4. HistoryEntryMeta

Metadata stored alongside each HistoryStack entry. The editor maintains a parallel array since HistoryStack's `HistoryEntry` type is in the shared package and should not be modified.

| Field | Type | Description |
|-------|------|-------------|
| origin | `'manual' \| 'ai'` | Whether this entry was created by a manual edit or an AI proposal. |
| summary | `string` | Human-readable summary (e.g., "Painted 45 tiles on ground layer", "AI: Added blacksmith NPC"). |
| timestamp | `number` | When the patch was applied (ms since epoch). |
| conflictHunks | `ConflictHunk[]` | Hunks touched by this patch, for conflict detection on undo. Built via `buildConflictHunks` at apply time. |

---

### 5. ConflictAwareUndoRequest

Represents a pending undo request that requires conflict resolution.

| Field | Type | Description |
|-------|------|-------------|
| entryIndex | `number` | Index into the history stack of the entry being undone. |
| detectionResult | `ConflictDetectionResult` | Result from `detectConflicts`, containing `hasConflicts`, `conflicts[]`, and `safeHunks[]`. |
| pendingResolution | `ConflictResolution \| null` | The user's chosen resolution, or null while the dialog is open. |

**State transitions**:
- Undo requested → preflight check via `detectConflicts`
- No conflicts → proceed with standard `HistoryStack.undo()`
- Conflicts detected → `ConflictAwareUndoRequest` created → ConflictModal shown
- User selects resolution:
  - `cancel` → discard request, no state change
  - `force` → apply full inverse via `HistoryStack.undo()`
  - `partial` → build filtered inverse, apply as new patch, push as new history entry

---

### 6. ViewportState

Rendering state for the map viewport canvas. Not part of the persisted editor state — ephemeral UI state.

| Field | Type | Description |
|-------|------|-------------|
| panX | `number` | Horizontal pan offset in pixels. |
| panY | `number` | Vertical pan offset in pixels. |
| zoom | `number` | Zoom level (1.0 = 100%). Clamped to [0.25, 4.0]. |
| canvasWidth | `number` | Canvas element width in CSS pixels. |
| canvasHeight | `number` | Canvas element height in CSS pixels. |
| hoveredTile | `{ x: number; y: number } \| null` | Tile coordinate under the mouse cursor. |
| isDragging | `boolean` | Whether a paint/place gesture is in progress. |

---

### 7. PatchPreviewData

Derived data for displaying AI patch previews. Computed from `PatchSummary` and `PatchV1`.

| Field | Type | Description |
|-------|------|-------------|
| summary | `PatchSummary` | The patch summary from the AI proposal result. |
| warnings | `string[]` | Warning messages from the proposal result. |
| repairAttempts | `number` | Number of repair attempts that were needed. |
| operationCount | `number` | Total number of ops in the patch. |
| isDestructive | `boolean` | Whether the patch contains delete operations. |
| detailSections | `PreviewSection[]` | Grouped details for display (tile edits, entity changes, etc.). |

### PreviewSection

| Field | Type | Description |
|-------|------|-------------|
| title | `string` | Section heading (e.g., "Tile Edits", "New Entities"). |
| items | `string[]` | Human-readable line items. |
| truncated | `boolean` | Whether the list was truncated (more items exist than shown). |

---

## Relationship Diagram

```
EditorState
├── project: Project (from @ai-rpg-maker/shared)
├── history: HistoryStack (from @ai-rpg-maker/shared)
├── historyMeta: HistoryEntryMeta[]
│   └── conflictHunks: ConflictHunk[] (from @ai-rpg-maker/shared)
├── transaction: Transaction | null
│   └── cells / entityOps → compiled to PatchV1 on commit
├── activeTool: ToolType
└── selection state (mapId, layerId, tileId, entityDefId)

ConflictAwareUndoRequest
├── detectionResult: ConflictDetectionResult (from @ai-rpg-maker/shared)
│   ├── conflicts: ConflictDetail[]
│   └── safeHunks: string[]
└── resolution → triggers undo action

ViewportState (ephemeral, per MapViewport instance)

PatchPreviewData (derived from ProposedPatchResult)
```

## Reused Entities (from @ai-rpg-maker/shared)

These existing entities are used directly without modification:

| Entity | Package | Usage in Editor |
|--------|---------|----------------|
| `Project` | schema | Authoritative project state |
| `GameMap` | schema | Map being edited |
| `TileLayer` | schema | Layer being painted |
| `EntityDef` | schema | Entity definitions for placement palette |
| `EntityInstance` | schema | Entity instances on map |
| `TriggerRegion` | schema | Trigger regions on map |
| `PatchV1` | patch | All state mutations |
| `PatchOp` | patch | Individual operations within transactions |
| `PatchSummary` | patch | Diff preview display |
| `ApplyResult` | patch | Result of patch application |
| `HistoryStack` | history | Undo/redo mechanism |
| `HistoryEntry` | history | Patch + inverse + summary |
| `ConflictHunk` | ai | Hunk tracking for conflict detection |
| `ConflictDetectionResult` | ai | Conflict preflight result |
| `ConflictDetail` | ai | Individual conflict description |
| `ConflictResolution` | ai | Resolution choice type |
| `AIProvider` | ai | Provider interface for AI panel |
| `ProposedPatchResult` | ai | AI proposal result |
| `ProjectSummary` | ai | Token-efficient project context |
