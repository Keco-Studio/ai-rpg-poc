# Feature Specification: Editor UX v1 (Patch-Native Editing + Diff Preview + History + Conflict-Aware Undo + AI Workflow)

**Feature Branch**: `004-editor-ux`
**Created**: 2026-02-06
**Status**: Draft
**Input**: User description: "Spec 004: Editor UX v1 — a patch-native editor with diff preview, history timeline, conflict-aware undo, and integrated AI workflow"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manual Tile and Collision Painting (Priority: P1)

A creator opens a map in the editor and uses brush/rectangle tools to paint tiles onto a layer. They also toggle collision cells on or off. Every stroke is recorded as a history entry. They press undo and the last stroke reverts cleanly. They press redo and it reapplies. The creator can paint confidently knowing every action is tracked and reversible.

**Why this priority**: This is the foundational editing interaction. Without patch-native manual edits flowing through the history pipeline, no other feature (AI integration, conflict detection, undo) can function correctly. This is the MVP that proves the editor architecture works.

**Independent Test**: Can be fully tested by opening a map, painting tiles with brush and rect tools, painting collision, then undoing/redoing each action. Delivers a usable tile editor with full undo support.

**Acceptance Scenarios**:

1. **Given** a map is open in the editor, **When** the creator paints tiles using the brush tool and releases the mouse, **Then** a single history entry is created containing all tiles from that stroke, and the painted tiles are visible on the map.
2. **Given** a map with painted tiles, **When** the creator presses undo, **Then** the last stroke is fully reverted and the history cursor moves back by one.
3. **Given** an undone stroke, **When** the creator presses redo, **Then** the stroke is reapplied and the history cursor moves forward.
4. **Given** a map is open, **When** the creator paints collision cells using the collision tool, **Then** a history entry is created and the collision overlay updates to reflect the change.
5. **Given** a map is open, **When** the creator uses the rectangle fill tool to paint a region, **Then** a single history entry is created using a rect operation for the entire region.
6. **Given** a map is open, **When** the creator uses the erase tool, **Then** tiles are cleared and a history entry records the erasure.

---

### User Story 2 - AI Patch Proposal and Preview (Priority: P1)

A creator types a natural language prompt (e.g., "Add a blacksmith NPC near the forge with a greeting dialogue") into the AI panel and clicks "Propose Changes." The AI generates a patch and the editor displays a summary preview showing what will be created, modified, or deleted — including counts for tile edits, new entities, and new dialogues. The creator reviews the preview and clicks "Apply" to commit or "Reject" to discard. On rejection, the project remains unchanged and the prompt is preserved for refinement.

**Why this priority**: AI-assisted editing is a core differentiator of this editor. The propose-preview-apply flow is essential for trust and usability. Tied at P1 with manual editing because the two must coexist from day one.

**Independent Test**: Can be tested by entering a prompt, receiving a patch proposal, reviewing the summary, and applying or rejecting it. Delivers the complete AI editing workflow.

**Acceptance Scenarios**:

1. **Given** a project is loaded, **When** the creator enters a prompt and clicks "Propose Changes," **Then** the AI panel shows a loading state, then displays a patch summary with created/modified/deleted resource counts.
2. **Given** a proposed patch is displayed, **When** the creator clicks "Apply," **Then** the patch is applied to the project, a history entry with "AI" origin is created, and the map viewport updates to reflect changes.
3. **Given** a proposed patch is displayed, **When** the creator clicks "Reject," **Then** the project remains unchanged, no history entry is created, and the prompt text is preserved in the input field.
4. **Given** a proposed patch with warnings (e.g., large tile edit count, destructive operations), **When** the preview is shown, **Then** the warnings are displayed prominently before the apply button.
5. **Given** a proposed patch is displayed, **When** the creator clicks "Regenerate," **Then** a new AI request is made with the same prompt and a fresh proposal replaces the previous one.

---

### User Story 3 - History Timeline Browsing (Priority: P2)

A creator has made several edits (both manual and AI-assisted). They open the history panel and see a chronological list of entries, each showing a summary, timestamp, and origin label (Manual or AI). They click undo/redo buttons to navigate the history. The map viewport updates to reflect the current history position.

**Why this priority**: History browsing provides transparency and confidence. Creators need to see what happened and navigate freely. It builds on P1 (which creates the history entries) and enables P2-level undo/redo workflows beyond simple linear undo.

**Independent Test**: Can be tested by performing a sequence of manual and AI edits, then verifying the history panel lists them with correct metadata, and that undo/redo navigation updates the viewport.

**Acceptance Scenarios**:

1. **Given** multiple edits have been made, **When** the creator opens the history panel, **Then** entries are listed in chronological order with summary text, timestamp, and origin (Manual/AI) for each.
2. **Given** the history panel is open, **When** the creator clicks the undo button, **Then** the most recent edit is reverted and the corresponding entry is visually marked as undone.
3. **Given** undone entries exist, **When** the creator clicks the redo button, **Then** the next undone entry is reapplied.
4. **Given** the history panel is open and entries are undone, **When** the creator makes a new edit, **Then** all undone entries after the current position are discarded (standard undo branch behavior).

---

### User Story 4 - Conflict-Aware Undo (Priority: P2)

A creator applies an AI patch that modifies tiles in a region. They then manually paint over some of those same tiles. When they attempt to undo the AI patch, the editor detects that manual changes overlap with the AI patch's affected area. A conflict resolution dialog appears with three choices: Cancel (keep everything as-is), Undo Safe Parts Only (revert non-conflicting parts of the AI patch), or Force Undo (revert the entire AI patch, overwriting manual changes). The creator picks one and the system behaves accordingly.

**Why this priority**: Conflict-aware undo is what makes the patch-native architecture truly useful. Without it, creators risk silently losing manual edits when undoing AI changes. This is the key UX differentiator, but requires P1 manual editing and AI apply to be working first.

**Independent Test**: Can be tested by applying an AI patch, making manual edits to overlapping content, then undoing the AI patch and verifying the conflict dialog appears with all three options working correctly.

**Acceptance Scenarios**:

1. **Given** an AI patch has been applied and the creator has manually edited content that overlaps with the AI patch, **When** the creator undoes the AI patch, **Then** a conflict resolution dialog appears listing the conflicting regions.
2. **Given** the conflict dialog is shown, **When** the creator selects "Cancel," **Then** the dialog closes, no undo occurs, and the project remains unchanged.
3. **Given** the conflict dialog is shown, **When** the creator selects "Undo Safe Parts Only," **Then** only the non-conflicting parts of the AI patch are undone, preserving all manual edits.
4. **Given** the conflict dialog is shown, **When** the creator selects "Force Undo," **Then** the entire AI patch is reverted including parts that conflict with manual edits (last-write-wins).
5. **Given** an AI patch has been applied and the creator has made manual edits to different, non-overlapping content, **When** the creator undoes the AI patch, **Then** no conflict dialog appears and the undo proceeds normally.

---

### User Story 5 - Entity and Trigger Editing (Priority: P2)

A creator places NPC entities on the map by selecting an entity definition and clicking on the map. They can drag entities to reposition them and delete them. They can also draw rectangular trigger regions and assign events to them. All of these actions produce history entries and are fully undoable.

**Why this priority**: Entities and triggers are essential map content beyond tiles. They complete the basic map editing toolkit. Ranked P2 because tile/collision editing (P1) is more fundamental, but these are needed for a useful editor.

**Independent Test**: Can be tested by placing, moving, and deleting entities, and by creating and editing trigger regions, then undoing/redoing each action.

**Acceptance Scenarios**:

1. **Given** a map is open and entity definitions exist, **When** the creator selects an entity definition and clicks on the map, **Then** an entity instance is placed at that position and a history entry is created.
2. **Given** an entity instance is on the map, **When** the creator drags it to a new position, **Then** the entity moves and a history entry records the position change.
3. **Given** an entity instance is on the map, **When** the creator deletes it, **Then** the entity is removed and a history entry is created (undoable).
4. **Given** a map is open, **When** the creator draws a rectangular trigger region, **Then** the region is created and a history entry records it.
5. **Given** a trigger region exists, **When** the creator edits its events or properties, **Then** the changes are applied and recorded in history.

---

### User Story 6 - Runtime Preview (Priority: P3)

A creator clicks "Play" in the runtime preview panel to see the current map running in the Excalibur engine. After making edits (manual or AI), they can reload the preview to see updated content. The preview reflects the current project state including recently applied patches.

**Why this priority**: Preview is important for creator confidence but not required for editing functionality. The editor is fully usable without it. Ranked P3 because it depends on having content to preview (P1/P2 stories).

**Independent Test**: Can be tested by loading a map with content, clicking Play, verifying the preview renders, then making edits and reloading to see them reflected.

**Acceptance Scenarios**:

1. **Given** a map with tiles and entities is loaded, **When** the creator clicks "Play," **Then** the runtime preview panel renders the map using the Excalibur engine.
2. **Given** the preview is running, **When** the creator applies a patch (manual or AI) and clicks reload, **Then** the preview updates to reflect the new project state.

---

### User Story 7 - Large Project AI Support (Priority: P3)

A creator working on a large project (many maps, entities, dialogues) uses the AI panel. The orchestrator uses a token-efficient project summary. If the AI needs more details about specific content, the orchestrator automatically fetches targeted context slices and continues. The creator sees the process complete without manual intervention. An optional debug view shows what context was requested.

**Why this priority**: This ensures the AI workflow scales beyond small demo projects. Ranked P3 because it's an optimization of the P1 AI workflow — the basic flow works first, then this handles edge cases.

**Independent Test**: Can be tested by creating or loading a project with enough content to exceed single-prompt context limits, then verifying the AI can still propose patches successfully.

**Acceptance Scenarios**:

1. **Given** a large project is loaded, **When** the creator submits an AI prompt, **Then** the orchestrator uses the index summary and fetches context slices as needed without creator intervention.
2. **Given** the AI requested additional context, **When** the process completes, **Then** the creator sees the patch proposal as normal, with no visible disruption.
3. **Given** the AI requested additional context, **When** the creator expands the optional debug view, **Then** they can see what context slices were requested and why.

---

### Edge Cases

- What happens when the creator undoes all history entries? The project returns to its initial state; the undo button is disabled.
- What happens when a brush stroke covers zero tiles (click without drag on same tile)? A single-tile edit is still recorded as a valid history entry.
- What happens when an AI proposal fails validation after maximum repair attempts? The AI panel shows an error with the validation details; no patch is applied and the prompt is preserved.
- What happens when the creator makes a new edit after undoing several entries? All undone (future) entries are discarded permanently (standard branch-on-edit behavior).
- What happens when a conflict-aware undo with "Undo Safe Parts Only" results in no safe parts? The dialog informs the creator that all parts conflict, effectively the same as cancel.
- What happens when the map has no tileset assigned? Tile painting tools are disabled with a message to assign a tileset first.
- What happens when the creator attempts to place an entity outside map bounds? The placement is rejected and no history entry is created.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST generate patch operations for all manual edit actions (tile paint, collision paint, entity placement/move/delete, trigger create/edit, erase) and apply them through the same validate/apply/history pipeline used for AI patches.
- **FR-002**: The system MUST group continuous brush strokes into a single transaction (patch) that commits when the user completes the gesture (e.g., mouse release), so that undo reverts the entire stroke as one action.
- **FR-003**: The system MUST prefer rectangle-based patch operations (`paintRect`, `setCollisionRect`) when the user's edit tool produces rectangular regions, to minimize patch size.
- **FR-004**: The system MUST display a patch summary preview for AI-proposed patches before application, showing counts of created, modified, and deleted resources, tile edit counts, and any warnings.
- **FR-005**: The system MUST require explicit user confirmation (Apply) before committing an AI-proposed patch. Rejection MUST leave the project state unchanged.
- **FR-006**: The system MUST maintain a history timeline where each entry records a summary, timestamp, and origin (Manual or AI).
- **FR-007**: The system MUST support linear undo and redo navigation through the history timeline, with standard branch-on-edit semantics (new edits after undo discard future entries).
- **FR-008**: The system MUST detect conflicts at hunk granularity when undoing a patch whose affected regions have been subsequently modified by other patches.
- **FR-009**: When conflicts are detected during undo, the system MUST present a conflict resolution dialog with three options: Cancel (default), Undo Non-Conflicting Parts Only, and Force Undo.
- **FR-010**: The "Undo Non-Conflicting Parts Only" option MUST apply the inverse patch while skipping hunks that conflict with subsequent manual edits.
- **FR-011**: The "Force Undo" option MUST fully revert the target patch regardless of conflicts (last-write-wins).
- **FR-012**: The system MUST provide a map viewport supporting tile painting (brush and rectangle fill), tile erasing, collision painting (solid/empty), entity placement, entity repositioning, entity deletion, and trigger region drawing and editing.
- **FR-013**: The system MUST provide a project browser allowing the creator to select which map to edit, view tileset information, and see a list of entity definitions.
- **FR-014**: The system MUST provide an AI panel with prompt input, propose, apply, reject, and regenerate controls, integrated with the existing AI orchestrator.
- **FR-015**: The system MUST provide a runtime preview panel that renders the current map using the Excalibur engine and supports reload after edits.
- **FR-016**: The system MUST support AI patch proposals on large projects by using the orchestrator's token-efficient project summary and context slice retrieval, without requiring manual creator intervention.
- **FR-017**: The system MUST remain responsive during common painting actions on maps up to 128×128 tiles.

### Key Entities

- **Transaction**: A group of patch operations produced by a single user gesture (e.g., one brush stroke), treated as an atomic unit for undo/redo purposes. Contains one or more PatchOps, a timestamp, and an origin label.
- **HistoryEntry**: A record in the history timeline representing one applied patch. Contains the patch itself, its inverse, a human-readable summary, a timestamp, and an origin (Manual or AI).
- **ConflictDetail**: A description of a detected conflict during undo, identifying the specific hunk reference, the expected value (at time of original patch), the current value, and a human-readable explanation.
- **ConflictResolution**: The user's chosen resolution strategy when conflicts are detected: cancel, partial (skip conflicting hunks), or force (last-write-wins).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Creators can paint tiles and collision on a 128×128 map with brush and rectangle tools and undo/redo each stroke without perceivable delay (under 100ms per operation from the creator's perspective).
- **SC-002**: AI propose → preview → apply workflow completes end-to-end: creators see a summary preview and can apply or reject, with rejection leaving the project unchanged 100% of the time.
- **SC-003**: Conflict resolution dialog appears correctly whenever a creator undoes a patch that conflicts with subsequent edits, and all three resolution options (Cancel, Partial Undo, Force Undo) behave as specified.
- **SC-004**: History panel accurately displays all editing actions with correct origin labels (Manual vs AI), and undo/redo navigation updates the project state and viewport consistently.
- **SC-005**: Runtime preview renders the current map state and reflects changes after reload within 2 seconds for maps up to 128×128 tiles.
- **SC-006**: Large projects (50+ maps, 200+ entities) can successfully complete the AI propose workflow using summary slicing without creator intervention or timeout.
- **SC-007**: All manual edit actions (tile paint, collision paint, entity place/move/delete, trigger create/edit) produce valid patch operations that pass the existing patch validation pipeline.

## Assumptions

- The existing PatchV1 operation set is sufficient to represent all manual editor actions without new operation types.
- The existing HistoryStack from the shared package provides the base undo/redo mechanism; the editor extends it with conflict detection and resolution UI.
- The existing AI orchestrator (`proposePatchWithRepair`) is the integration point for AI proposals; no changes to the orchestrator API are required.
- The Excalibur runtime compiler can render a map from the current project state for the preview panel.
- The editor targets modern desktop browsers (Chrome, Firefox, Edge — latest two versions). Mobile editing is not in scope.
- A single creator uses the editor at a time (no concurrent editing conflicts between users).
- Entity definitions already exist in the project when the creator wants to place instances. Creating new entity definitions is done via AI or is out of scope for v1.

## Scope Boundaries

**In scope:**
- Map viewport with tile, collision, entity, and trigger editing tools
- Project browser (map selection, tileset info, entity list)
- AI panel (propose, preview, apply, reject, regenerate)
- History panel (entry list, undo/redo, conflict resolution)
- Transaction management (batch ops per gesture)
- Conflict detection and resolution dialog
- Runtime preview (play and reload)
- Shared package additions for conflict detection helpers and partial-undo support

**Out of scope (v1):**
- Full RPG database UI (item, enemy, skill management screens)
- Multi-user collaboration or real-time sync
- Full dialogue graph visual editor (basic text editing only)
- Sophisticated visual diff (e.g., side-by-side map comparison) — summary + counts only
- Mobile or touch-optimized interface
- Creating new entity definitions through the editor UI (use AI or direct data editing)
- Tileset image upload or management
- Map creation or deletion through the editor (use AI or direct data editing)
