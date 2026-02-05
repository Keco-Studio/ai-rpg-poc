# Feature Specification: AI Patch Engine v1

**Feature Branch**: `002-ai-patch-engine`  
**Created**: 2026-02-05  
**Status**: Draft  
**Input**: User description: "Spec 002: AI Patch Engine v1 (Validated Project Mutations + Diff + Undo/Redo)"

## Overview

This feature enables structured, validated project modifications through a standardized patch format. Building on the Project Schema v1 foundation (Spec 001), this engine allows AI agents or any client to propose changes to a project in a safe, atomic format with full validation, preview capabilities, and undo/redo support.

The patch engine acts as a "safe mutation layer" between intelligent agents and the project data, similar to how platforms like Lovable enable AI-driven development while maintaining data integrity.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - AI-Assisted Content Creation with Preview (Priority: P1)

As a creator, I want to request content additions from an AI assistant (like "add 3 NPCs and a quest to the village") and see a summary of what will change before accepting, so I can ensure the AI understood my intent and maintain control over my project.

**Why this priority**: This is the core value proposition - enabling safe, AI-assisted content creation with human oversight. Without this, the patch engine has no practical use case for creators.

**Independent Test**: Can be fully tested by submitting a patch that creates entities and quests, verifying the diff summary shows accurate changes, and confirming the project is only modified after explicit acceptance.

**Acceptance Scenarios**:

1. **Given** an empty map, **When** a patch is submitted to create 3 NPC entities and place them at specific coordinates, **Then** the system returns a summary listing "Created: 3 entities" with their IDs and locations before applying any changes
2. **Given** a patch summary is displayed, **When** the creator accepts the changes, **Then** all operations are applied atomically and the project reflects all changes
3. **Given** a patch summary is displayed, **When** the creator rejects the changes, **Then** no modifications are made to the project
4. **Given** a patch contains an invalid operation (e.g., referencing a non-existent tileset), **When** validation runs, **Then** the entire patch is rejected with a clear error message identifying the problem

---

### User Story 2 - Single-Step Undo/Redo of Complex Changes (Priority: P2)

As a creator, I want to undo an entire AI-generated change as a single action (not step-by-step), so I can quickly revert complex modifications without manually undoing dozens of individual edits.

**Why this priority**: Essential for usability and creator confidence. Multi-step AI changes must be reversible as a unit, otherwise creators will fear experimenting with AI assistance.

**Independent Test**: Can be fully tested by applying a multi-operation patch, performing undo to verify complete reversion to original state (deep equality), then redo to restore the changes.

**Acceptance Scenarios**:

1. **Given** a project before applying a patch, **When** the patch creates a map with tiles, collision, and entities, **Then** an inverse patch is generated that can fully reverse all changes
2. **Given** a patch has been applied, **When** the creator triggers undo, **Then** the inverse patch is applied and the project state matches exactly the pre-patch state (deterministic reversal)
3. **Given** an undo has been performed, **When** the creator triggers redo, **Then** the original patch is reapplied and the project matches the post-patch state
4. **Given** multiple patches have been applied, **When** the creator performs multiple undos, **Then** each undo reverses one complete patch operation maintaining history integrity

---

### User Story 3 - Programmatic Project Mutations (Priority: P3)

As a developer building editor tools or automation scripts, I want to use the patch API programmatically (not just through AI) to make validated changes to projects, so I can build reliable tooling that respects the same validation rules.

**Why this priority**: Provides a stable foundation for future tooling and ensures the patch format isn't AI-specific but a general-purpose mutation API. Lower priority than creator-facing features.

**Independent Test**: Can be fully tested by writing a script that constructs patches programmatically, applies them via the API, and verifies deterministic results.

**Acceptance Scenarios**:

1. **Given** a developer has a project object and patch definition, **When** calling `applyPatch(project, patch)`, **Then** the function returns the new project, a summary, and an inverse patch
2. **Given** a programmatically constructed patch, **When** validation runs, **Then** the same validation rules apply as for AI-generated patches
3. **Given** multiple patches applied in sequence, **When** each returns an inverse patch, **Then** applying inverses in reverse order restores the original project state

---

### User Story 4 - Safe Bounds and Reference Validation (Priority: P1)

As a creator, I want the system to reject invalid changes (like placing tiles outside map boundaries or referencing non-existent entities) before they're applied, so my project data remains consistent and playable.

**Why this priority**: Critical for data integrity. Without validation, the project could become corrupted or unplayable, breaking trust in the AI-assisted workflow.

**Independent Test**: Can be fully tested by submitting patches with various validation violations and confirming each is rejected with actionable error messages without modifying the project.

**Acceptance Scenarios**:

1. **Given** a patch attempts to paint tiles outside the map boundaries, **When** validation runs, **Then** the patch is rejected with error code "OUT_OF_BOUNDS" and details specifying which operation and coordinates failed
2. **Given** a patch references an entity ID that doesn't exist, **When** validation runs, **Then** the patch is rejected with error code "MISSING_REF" and details identifying the missing reference
3. **Given** a patch creates two entities with the same ID, **When** validation runs, **Then** the patch is rejected with error code "DUPLICATE_ID"
4. **Given** a patch uses a tile ID exceeding the tileset capacity, **When** validation runs, **Then** the patch is rejected with error code "INVALID_TILE_ID"

---

### Edge Cases

- **Patch operation ordering**: When a patch creates an entity and then immediately places an instance of it, validation must consider operation order (entity exists by the time placement is validated)
- **Empty patches**: What happens when a patch contains zero operations?
- **Large-scale edits**: How does the system handle patches with tens of thousands of tile edits without performance degradation?
- **Concurrent patches**: What happens if two patches attempt to modify the same project data (e.g., same map tiles)? (Note: Multi-user collaboration is out of scope for v1, but single-user sequential patches must work)
- **Schema version mismatch**: How does validation handle a patch targeting a different schema version than the current project?
- **Inverse patch validation**: What if the generated inverse patch itself fails validation when applied?
- **Partial entity updates**: When updating a trigger's region, what happens if only width changes but x, y, and height are omitted?
- **Deletion orphans**: When deleting an entity definition, what happens to existing instances of that entity on maps?

## Requirements *(mandatory)*

### Functional Requirements

#### Patch Format & Structure

- **FR-001**: System MUST define a versioned patch format (PatchV1) that represents project modifications as a sequence of typed operations
- **FR-002**: Each patch MUST include metadata: patch version, patch ID, base schema version, and optional fields for author, creation timestamp, and notes
- **FR-003**: System MUST support operation types covering all essential content creation: maps, layers, tiles, collision, entities, triggers, dialogue, and quests
- **FR-004**: All operations MUST use caller-supplied IDs for created resources (maps, entities, instances, triggers, etc.)

#### Validation

- **FR-005**: System MUST validate patches before application and reject invalid patches without making any changes (atomic validation)
- **FR-006**: Validation MUST verify patch version is compatible with the system version
- **FR-007**: Validation MUST verify patch targets the same schema version as the current project
- **FR-008**: Validation MUST ensure all referenced IDs exist at the time of use, considering operation ordering within the patch
- **FR-009**: Validation MUST check numeric bounds: map dimensions > 0, coordinates within map bounds, rectangles within map boundaries
- **FR-010**: Validation MUST verify tile IDs are within valid range (0 for empty or valid tileset indices)
- **FR-011**: Validation MUST prevent duplicate ID creation within a single patch
- **FR-012**: Validation MUST verify tileset references exist for maps and entity sprites
- **FR-013**: Validation MUST verify entity template references exist before instance placement
- **FR-014**: Validation MUST verify dialogue graph references exist before use in entity behaviors or triggers
- **FR-015**: Validation MUST return structured errors with error codes, messages, operation indices, and affected data paths when validation fails

#### Application & Atomicity

- **FR-016**: System MUST apply all operations in a patch in sequence, or apply none if validation fails
- **FR-017**: System MUST generate a change summary showing created, modified, and deleted resources with IDs
- **FR-018**: System MUST generate an inverse patch that can reverse all changes made by the original patch
- **FR-019**: System MUST ensure inverse patches are themselves valid when applied to the post-patch project state
- **FR-020**: System MUST produce deterministic results: applying the same patch to the same project state always produces identical results

#### Undo/Redo

- **FR-021**: System MUST support undo by applying the inverse patch generated during original application
- **FR-022**: System MUST support redo by reapplying the original patch after undo
- **FR-023**: Undo MUST restore project state to exactly match pre-application state (complete restoration of all data)
- **FR-024**: System MUST treat all operations in a patch as a single history entry for undo/redo purposes

#### Change Summary

- **FR-025**: System MUST provide human-readable summaries derived from before/after comparison, not just operation lists
- **FR-026**: Summaries MUST include lists of created, modified, and deleted resource IDs by type (maps, entities, dialogues, quests, triggers)
- **FR-027**: Summaries MUST include counts of tile edits per map/layer and collision edits per map
- **FR-028**: Summaries MUST be generated after successful patch application

#### Error Handling

- **FR-029**: System MUST define structured error codes for all validation failure types: UNKNOWN_OP, MISSING_REF, DUPLICATE_ID, OUT_OF_BOUNDS, INVALID_TILE_ID, INVALID_LAYER, INVALID_MAP, SCHEMA_MISMATCH
- **FR-030**: Error messages MUST identify the specific operation index that failed
- **FR-031**: Error messages MUST include the data path to the problematic field showing which operation and property failed
- **FR-032**: Error messages MUST provide actionable details to help correct the issue

### Key Entities

- **Patch**: A versioned document containing metadata and a sequence of operations representing project modifications
- **PatchOperation**: A single atomic change operation (create map, paint tiles, place entity, etc.) with a specific type and parameters
- **PatchSummary**: A report of changes made by a patch, categorizing resources as created/modified/deleted with IDs and edit counts
- **InversePatch**: A patch that reverses the effects of another patch, enabling undo functionality
- **ValidationResult**: The outcome of patch validation, either success or structured error details
- **HistoryStack**: A collection that tracks applied patches and their reversal instructions for undo/redo functionality

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A valid patch creating a map, painting tiles, setting collision, and placing an NPC applies successfully in under 100ms for maps up to 100x100 tiles
- **SC-002**: Applying a patch and then its inverse produces a project that is completely identical to the original state (100% deterministic reversal with no data loss)
- **SC-003**: All documented validation rules correctly reject invalid patches with actionable error messages in 100% of test cases
- **SC-004**: Patch summaries accurately reflect all changes made, with zero discrepancies between summary counts and actual modifications
- **SC-005**: System handles patches with up to 50,000 tile edits using rectangular operations without exceeding 500ms processing time
- **SC-006**: Inverse patch generation succeeds for 100% of valid patches that apply successfully
- **SC-007**: Validation detects and rejects 100% of tested edge cases (out-of-bounds, missing references, duplicate IDs, invalid tile IDs)
- **SC-008**: Undo/redo operations complete in under 50ms for typical patches (creating 3-5 entities, 100-1000 tile edits)

## Scope & Boundaries

### In Scope

#### Patch Operations (v1)
- **Map/Layer Operations**: Create map, create layer, paint tile rectangles, set individual tiles, clear tiles
- **Collision Operations**: Set collision cells, set collision rectangles
- **Entity Operations**: Create entity template definitions, place entity instances, move instances, delete instances
- **Trigger Operations**: Create trigger regions with event handlers, update trigger properties
- **Dialogue Operations**: Create dialogue graphs, update dialogue node content and choices
- **Quest Operations**: Create quest definitions, update quest properties

#### Core Capabilities
- Patch format specification and TypeScript type definitions
- Comprehensive validation with structured error reporting
- Atomic patch application with rollback on validation failure
- Inverse patch generation for undo
- Change summary generation
- History stack utility for managing undo/redo
- JSON schema for strict patch parsing
- Test suite covering all operation types and validation rules

### Out of Scope (v1)

- Natural language processing or LLM orchestration (deferred to Spec 003)
- Real-time collaborative multi-user editing
- AI-generated binary assets (sprites, tilesets) - patches can only reference existing assets
- Complex scripting language - event operations limited to fixed ScriptOp types from schema v1
- Patch conflict resolution or merge strategies
- Patch compression or optimization algorithms
- Editor UI for patch preview and acceptance (deferred to Spec 004)
- Automatic ID allocation - caller must supply unique IDs (helper utilities may be provided)

### Future Considerations

- **Spec 003**: LLM integration, tool calling, prompt templates, and patch repair loop for handling rejected patches
- **Spec 004**: Editor UI integration with visual diff preview, accept/reject controls, and history timeline
- **Performance optimization**: Patch batching, incremental validation, or streaming application for very large patches
- **Conflict detection**: Identifying when sequential patches modify overlapping data

## Assumptions

- Projects conform to Schema v1 and have been validated before patches are applied
- Patch authors (AI or developers) are responsible for generating unique IDs; the system validates uniqueness but doesn't allocate IDs
- Tilesets referenced in patches already exist in the project's asset collection
- Large-scale tile edits (e.g., filling an entire map) will use rectangular operations rather than individual cell operations
- Patches are applied sequentially in a single-user context; concurrent patch application is not required
- The system can efficiently compare complete project states to verify undo correctness
- Memory is sufficient to hold before/after project states for generating accurate summaries and inverses

## Dependencies

- **Project Schema v1** (Spec 001): Patch operations must respect all schema constraints and validation rules
- **Excalibur Runtime** (Spec 001): Applied patches must produce projects that remain playable by the runtime
- **Structured data format**: Patches must be represented in a standardized, machine-readable format with strict validation
- **Test coverage**: Comprehensive automated testing is required to verify all validation rules and operation types

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Inverse patch generation fails for complex operations | High - breaks undo | Low | Comprehensive tests for all operation types; validation ensures inverses are valid |
| Performance degrades with large patches | Medium - poor UX | Medium | Encourage rectangular ops over cell lists; add performance tests with realistic data |
| ID collision when AI generates patches | Medium - data corruption | Medium | Strict validation rejects duplicates; provide ID allocation helpers in future |
| Schema version drift between patch and project | High - data corruption | Low | Version checks in validation; clear error messages for mismatches |

## Open Questions

None. The specification provides clear boundaries for v1 functionality, defers complex challenges (LLM integration, UI) to future specs, and includes detailed operation definitions and validation rules.
