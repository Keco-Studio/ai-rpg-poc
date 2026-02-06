# Research: Editor UX v1

**Feature**: 004-editor-ux
**Date**: 2026-02-06
**Status**: Complete

## R1: Map Viewport Rendering Strategy

**Decision**: Use HTML Canvas 2D API for the map viewport, rendered within a React component.

**Rationale**: The editor needs a performant, pixel-precise tile rendering surface. Canvas 2D provides direct pixel control, integer-coordinate rendering (no subpixel antialiasing), and efficient batch drawing via `drawImage` with source rectangles from tileset sprite sheets. React manages the component lifecycle; Canvas handles the actual rendering.

**Alternatives considered**:
- **DOM/CSS Grid**: Too many DOM nodes for 128×128 maps (16,384+ elements). Impractical for performance.
- **WebGL**: Overkill for a 2D tile editor. Adds complexity without proportional benefit. The runtime already uses Excalibur (which uses WebGL), so the editor canvas doesn't need to duplicate that.
- **SVG**: Poor performance at tile-grid scale. No pixel-snap control.
- **Excalibur in editor viewport**: Would couple the editor to the game engine. The editor needs custom interaction (selection, hover, overlays) that doesn't map to game engine patterns. Use Excalibur only for the preview panel.

**Key implementation notes**:
- Use `imageSmoothingEnabled = false` on the canvas context for pixel-crisp rendering (Constitution IV).
- Render layers bottom-up by zIndex. Render collision overlay and trigger outlines on top.
- Use `requestAnimationFrame` for smooth redraws only when state changes (dirty flag pattern).
- Viewport supports pan and zoom via translate/scale on the canvas context. All mouse coordinates must be transformed back to tile coordinates.

---

## R2: Editor State Management

**Decision**: Use React `useReducer` + Context for editor state. No external state management library.

**Rationale**: The editor state is a single object tree (project + selection + history + transaction). React's built-in `useReducer` provides predictable state transitions, and Context makes it accessible to all components without prop drilling. The state shape is simple enough that Redux, Zustand, or MobX would add unnecessary dependencies. The existing codebase uses no state management library.

**Alternatives considered**:
- **Zustand**: Lightweight and a good fit, but adds a dependency for a state shape that `useReducer` handles well. Could be upgraded to later if needed.
- **Redux**: Too heavy for a single-package editor. Boilerplate overhead not justified.
- **useState per component**: Would require prop drilling for shared state (project, history, selection). Not scalable.
- **Jotai/Recoil**: Atom-based patterns don't map well to the "single project state mutated via patches" model.

**State shape**:
```
EditorState {
  project: Project           // Current authoritative state
  history: HistoryStack      // Undo/redo stack
  activeMapId: string | null // Currently selected map
  activeLayerId: string | null
  activeTool: ToolType       // brush | rect | erase | collision | entity | trigger
  selectedTileId: number     // From tileset palette
  selectedEntityDefId: string | null
  transaction: Transaction | null  // In-progress gesture
}
```

**Reducer actions**: `APPLY_PATCH`, `UNDO`, `REDO`, `SET_ACTIVE_MAP`, `SET_TOOL`, `SET_TILE`, `BEGIN_TRANSACTION`, `ADD_OPS`, `COMMIT_TRANSACTION`, `CANCEL_TRANSACTION`, `SET_PROJECT` (for AI apply).

---

## R3: Transaction Manager — Brush Stroke Batching

**Decision**: Accumulate `setTiles` ops during drag, then optimize to `paintRect` on commit when the touched region forms a rectangle.

**Rationale**: A brush stroke paints one tile per mouse-move event. Storing each as a separate `setTiles` op would create enormous patches for long strokes. Instead, the transaction manager accumulates cell coordinates during the gesture. On commit (mouse up), it determines the optimal representation:
- If all touched cells form a filled rectangle → emit a single `paintRect` op
- Otherwise → emit a single `setTiles` op with all coordinates batched

This satisfies FR-002 (group into single transaction) and FR-003 (prefer rect ops).

**Alternatives considered**:
- **Emit ops on every mouse move and merge later**: More complex, requires patch merging logic. The "accumulate then emit" approach is simpler.
- **Always use `setTiles`**: Works but produces larger patches than necessary. Rect ops are more efficient for validation and apply.
- **Run-length encoding**: Over-engineered for v1. Rect detection covers the main optimization case.

**Rectangle detection algorithm**:
Given a set of `{x, y}` coordinates:
1. Compute bounding box (minX, minY, maxX, maxY)
2. Count cells: `(maxX - minX + 1) * (maxY - minY + 1)`
3. If count equals the number of unique coordinates → it's a filled rectangle → use `paintRect`
4. Otherwise → use `setTiles`

This is O(n) and trivially correct.

---

## R4: Conflict-Aware Undo Architecture

**Decision**: Build a `ConflictAwareHistory` wrapper around `HistoryStack` that performs conflict preflight checks before undo using the existing `detectConflicts` and `buildConflictHunks` functions from `@ai-rpg-maker/shared`.

**Rationale**: The existing `HistoryStack` provides basic undo/redo with inverse patches. The existing `detectConflicts` function in `packages/shared/src/ai/conflict.ts` already implements hunk-based conflict detection. The existing `ConflictHunk`, `ConflictDetectionResult`, and `ConflictResolution` types in `packages/shared/src/ai/types.ts` already define the data model. The editor wraps these together:

1. On `applyAndPush`, also store `ConflictHunk[]` (built via `buildConflictHunks`) in the history entry metadata.
2. On undo request, call `detectConflicts(currentProject, storedHunks)` to check for divergence.
3. If conflicts detected → show ConflictModal → wait for resolution.
4. Based on resolution:
   - `cancel` → no-op
   - `force` → apply full inverse patch via `HistoryStack.undo()`
   - `partial` → generate filtered inverse patch (exclude conflicting hunks), apply directly

**Alternatives considered**:
- **Modify HistoryStack directly**: Violates separation of concerns. HistoryStack is in the shared package and used by other consumers. Editor-specific conflict UX should not leak into shared.
- **Store full project snapshots per entry**: Memory-intensive. For 128×128 maps, each snapshot could be large. Hunk-based snapshots store only the touched regions.
- **Diff-based detection (compare full project states)**: Expensive for large projects. Hunk-based approach is targeted and efficient.

**Filtered inverse patch for partial undo**:
1. Take the original inverse patch
2. For each op in the inverse patch, check if its target hunk is in the `safeHunks` list from `ConflictDetectionResult`
3. Keep only ops whose hunks are safe
4. Apply the filtered patch (bypassing HistoryStack — this is a manual resolution, not a standard undo)
5. Push the partial undo as a new history entry (so it's itself undoable)

---

## R5: Runtime Preview Embedding

**Decision**: Embed the Excalibur runtime in an `<iframe>` within the editor, communicating via `postMessage`.

**Rationale**: The runtime package (`@ai-rpg-maker/runtime`) uses Excalibur which takes over a canvas and runs a game loop. Embedding it directly in the editor's React component tree would create conflicts (Excalibur's engine loop vs. React's render cycle, canvas ownership, input event capture). An iframe provides clean isolation:
- The runtime runs in its own document context
- No event capture conflicts
- Preview reload = iframe reload (simple, reliable)
- The editor passes serialized project data via `postMessage`

**Alternatives considered**:
- **Direct Excalibur engine in a React component**: Workable but fragile. Engine lifecycle management (start/stop/restart) conflicts with React's component lifecycle. Input events (keyboard, mouse) would need careful routing to avoid the engine capturing editor inputs.
- **New browser tab/window**: Functional but poor UX. The creator loses the side-by-side view.
- **Web Worker + OffscreenCanvas**: Excalibur doesn't support OffscreenCanvas. Not viable.

**Communication protocol**:
- Editor → iframe: `{ type: 'loadProject', project: Project, mapId: string }`
- Editor → iframe: `{ type: 'reload' }`
- iframe → Editor: `{ type: 'ready' }` (after engine initialization)
- iframe → Editor: `{ type: 'error', message: string }` (on compilation failure)

---

## R6: AI Retrieval Fallback — Context Provider

**Decision**: Implement a `ContextProvider` in the editor that the orchestrator can call to request additional project details (map slices, entity definitions, trigger details) when the ProjectSummary is insufficient.

**Rationale**: The existing orchestrator uses `buildProjectSummary` which excludes raw tile arrays and dialogue text for token efficiency. For large projects, the AI may need more detail about specific maps or entities. The orchestrator already supports this pattern conceptually (the spec mentions "context slices"), but the current `proposePatchWithRepair` function doesn't have a callback interface for retrieval. In v1, we implement this as a simple pre-fetch: the editor builds an enhanced summary for the active map (including tile data for the visible region) and passes it as part of the prompt context. True multi-round retrieval is deferred to a future spec.

**Alternatives considered**:
- **Full retrieval callback loop**: The orchestrator would pause, request specific data, and resume. This requires changes to the `proposePatchWithRepair` API and provider interface. Out of scope for v1 — the current API is synchronous (single prompt → single response).
- **Always send full project data**: Defeats the purpose of token-efficient summaries. Would fail for large projects.
- **Send nothing extra**: The current ProjectSummary already works for most cases. The enhanced active-map context is a simple improvement that covers the common case.

**Implementation**:
- `buildEnhancedContext(project, activeMapId)`: Extends ProjectSummary with tile data for the active map's visible region and full entity/trigger details for that map.
- Pass as additional context in the user prompt (not changing the orchestrator API).

---

## R7: CSS Approach

**Decision**: Use CSS Modules (`.module.css`) for component styling. No CSS framework.

**Rationale**: The existing editor package has no CSS framework. CSS Modules provide scoped class names without adding dependencies. The editor UI is primarily a tooling interface (panels, buttons, overlays) rather than a content-heavy app, so a design system or utility framework is unnecessary. Plain CSS keeps the dependency count at zero and aligns with the project's minimalist approach.

**Alternatives considered**:
- **Tailwind CSS**: Adds build-time dependency and configuration. Overkill for a developer tool.
- **styled-components / Emotion**: Adds runtime CSS-in-JS overhead. Not needed.
- **Plain CSS with BEM naming**: Works but class name collisions are possible across components. CSS Modules solve this.
- **No styling (inline only)**: Harder to maintain for complex layouts.

---

## R8: Testing Strategy for Editor Logic

**Decision**: Test editor logic (patch builders, transaction manager, conflict-aware history) as pure functions with Vitest. UI components are tested via integration tests that exercise the state flow.

**Rationale**: The core editor logic is separable from React components. Patch builders take tool state and return PatchOp arrays — pure functions. TransactionManager is a state machine. ConflictAwareHistory wraps HistoryStack with preflight checks. All of these can be unit-tested without rendering React components or mocking a canvas.

UI integration tests use Vitest + React Testing Library (if needed) to verify that component interactions dispatch correct reducer actions. Canvas rendering correctness is verified manually or via snapshot tests of rendered pixel data (deferred to later if needed).

**Test priorities**:
1. **patchBuilders**: brush stroke → ops, rect fill → ops, collision paint → ops, entity place → ops
2. **transaction**: begin/addOps/commit lifecycle, cancel clears, commit validates
3. **conflictAwareHistory**: no-conflict undo proceeds, conflict detected correctly, partial undo filters correctly, force undo applies full inverse
4. **integration**: full flow from mouse events → transaction → patch → history → undo → conflict dialog
