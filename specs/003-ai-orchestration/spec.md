# Feature Specification: AI Orchestration v1

**Feature Branch**: `003-ai-orchestration`  
**Created**: 2026-02-05  
**Status**: Draft  
**Input**: User description: "AI Orchestration v1 (Natural Language → Patch Proposal → Validate/Repair → Apply)"

## Context

This specification builds upon:
- **Spec 001**: Project Schema v1 + ExcaliburJS runtime foundation
- **Spec 002**: PatchV1 mutation layer with validate/apply/inverse/history

Spec 003 adds the AI experience layer, enabling users to describe their intent in natural language and receive validated, repairable patch proposals that can be applied atomically to the project.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Natural Language to Applied Patch (Priority: P1)

As a creator, I describe what I want in plain English, review a proposed change summary, and apply it with one click, creating a complete feature addition to my game.

**Why this priority**: This is the core value proposition - enabling non-technical users to modify their game through natural language. Without this, the entire AI orchestration system provides no value.

**Independent Test**: Can be fully tested by entering a prompt like "Create a small town map with 5 villagers", receiving a patch proposal, and clicking Apply. Delivers immediate value by allowing users to create game content through conversation.

**Acceptance Scenarios**:

1. **Given** an empty project with default tilesets, **When** I type "Create a small town map with 5 villagers and a quest to bring 3 herbs", **Then** I receive a patch proposal showing what will be created (map, entities, quest, dialogue)
2. **Given** a patch proposal is displayed, **When** I click "Apply", **Then** the patch is applied atomically and the new content appears in my project
3. **Given** a patch has been applied, **When** I open the map editor, **Then** I see the newly created town map with correct dimensions and tileset
4. **Given** a patch has been applied, **When** I inspect entities, **Then** I see 5 villager entities with appropriate properties
5. **Given** an applied patch, **When** I review the quest system, **Then** I see a quest to collect 3 herbs with proper structure

---

### User Story 2 - Automatic Patch Repair (Priority: P2)

As a creator, when the AI generates an invalid patch, the system automatically detects the errors and requests a corrected version without requiring me to understand the technical details.

**Why this priority**: Ensures reliability and user trust. Without automatic repair, users would frequently encounter cryptic errors and lose confidence in the AI system. This is critical for production use but not required for initial proof-of-concept.

**Independent Test**: Can be fully tested by mocking an AI provider that returns an invalid patch (e.g., out-of-bounds coordinates), then verifying the system automatically requests corrections and eventually succeeds or clearly reports failure after max attempts.

**Acceptance Scenarios**:

1. **Given** the AI returns a patch with out-of-bounds tile coordinates, **When** validation runs, **Then** the system sends structured error feedback to the AI and requests a corrected patch
2. **Given** the AI returns a patch referencing a non-existent entity type, **When** validation runs, **Then** the system provides specific error details and requests corrections
3. **Given** a repair attempt succeeds on the second try, **When** the corrected patch is validated, **Then** the user sees the corrected proposal without knowing repair occurred
4. **Given** repair attempts fail after maximum retries (default: 2), **When** all attempts are exhausted, **Then** the user sees a clear error message with validation details and the option to rephrase their request

---

### User Story 3 - Patch Preview and Rejection (Priority: P2)

As a creator, I can review what changes will be made before applying them, and reject proposals that don't match my intent without any modifications to my project.

**Why this priority**: User control and transparency are essential for trust. Users must be able to see what will happen and opt out. However, basic apply functionality (P1) must exist first before preview/rejection adds value.

**Independent Test**: Can be fully tested by receiving a patch proposal, reviewing the summary of changes (new maps, entities, modifications), and clicking "Reject" to verify no changes were made to the project state.

**Acceptance Scenarios**:

1. **Given** a patch proposal is generated, **When** I view the summary, **Then** I see a human-readable list of changes (maps created, entities added, tiles modified, quests added)
2. **Given** the summary shows unexpected changes, **When** I click "Reject", **Then** no modifications are made to my project
3. **Given** I rejected a patch, **When** I enter a refined prompt, **Then** I receive a new proposal without any trace of the rejected changes
4. **Given** a patch proposal exceeds safety thresholds, **When** I view the summary, **Then** I see a warning about the large scope with options to proceed or cancel

---

### User Story 4 - Undo/Redo AI Changes (Priority: P3)

As a creator, after applying an AI-generated patch, I can undo it completely if it doesn't work out, or redo it if I change my mind, maintaining full version control over AI-assisted modifications.

**Why this priority**: Important for user confidence and experimentation, but requires P1 (apply) to exist first. Users can work without undo in early testing, making this an enhancement rather than a requirement.

**Independent Test**: Can be fully tested by applying a patch (creating content), clicking "Undo" to remove all changes, then clicking "Redo" to restore them, verifying the project state matches at each step.

**Acceptance Scenarios**:

1. **Given** I applied a patch that created a town map, **When** I click "Undo", **Then** the town map and all related entities are removed and the project returns to its previous state
2. **Given** I undid a patch, **When** I click "Redo", **Then** the town map and entities are restored exactly as they were after the initial apply
3. **Given** multiple patches have been applied, **When** I undo, **Then** only the most recent patch is undone
4. **Given** an AI-applied patch in history, **When** I review the patch history, **Then** I see the AI-generated changes as a single atomic entry with timestamp and description

---

### User Story 5 - Guardrails Prevent Destructive Changes (Priority: P2)

As a creator, the system protects me from accidentally requesting changes that are too large or destructive, requiring explicit confirmation before proceeding with potentially risky operations.

**Why this priority**: Safety and data protection are critical for user trust. While not needed for initial proof-of-concept (can test with simple patches), it's required before users work with real projects. Positioned after core flow (P1) but before convenience features (P3).

**Independent Test**: Can be fully tested by requesting a change that exceeds thresholds (e.g., "modify every tile in the game") and verifying the system rejects it with a clear message about scope, or requests confirmation for destructive operations like "delete all entities".

**Acceptance Scenarios**:

1. **Given** I request a change that would modify more than the tile edit threshold (default: 20,000 tiles), **When** the patch is evaluated, **Then** I see a warning that the scope is too large with suggestions to narrow the request
2. **Given** I request "delete the main map", **When** the proposal is generated, **Then** I see a confirmation dialog warning about destructive operations before the patch is shown
3. **Given** a patch exceeds the maximum operations threshold (default: 40 ops), **When** validation runs, **Then** the patch is rejected and I receive guidance on reducing scope
4. **Given** I explicitly request "delete all villagers", **When** the patch is proposed, **Then** I see a clear confirmation noting this is destructive and requires acknowledgment

---

### Edge Cases

- **What happens when the AI returns non-JSON commentary mixed with patch data?**  
  The orchestrator must detect this as invalid output and send a repair request explicitly stating "Return only PatchV1 JSON with no additional commentary."

- **What happens when the user's prompt is ambiguous (e.g., "make it better")?**  
  The system attempts to generate a patch based on reasonable interpretation. If the AI cannot infer intent, it should return a patch with minimal changes or request clarification through the patch description field.

- **What happens when max repair attempts are exhausted?**  
  The user sees the validation errors from the final attempt with a clear message that the AI could not generate a valid patch, and options to rephrase the request or report the issue.

- **What happens when a patch would exceed available space (e.g., requesting 1000 entities in a small map)?**  
  Validation should catch this as an out-of-bounds or capacity error and trigger repair with specific constraints.

- **What happens when the user applies a patch and then manually edits the same content before undoing?**  
  The system uses conflict detection with user choice. When applying an AI patch, the system stores a base snapshot reference for every touched "hunk" (tile cells, collision cells, entity instance fields, trigger fields). On undo, a preflight check compares current values vs post-patch values for each hunk. If no conflicts exist (unchanged since AI patch), undo proceeds normally. If conflicts are detected (user manually changed something the AI patch touched), a warning appears with three options: Cancel undo (safe default), Undo non-conflicting parts only (skip conflicting hunks), or Force undo (last-write-wins; manual edits may be lost). This avoids silent data loss while preserving flexibility for power users.

- **What happens when network/AI provider is unavailable?**  
  The system should show a clear error message indicating the AI service is unavailable and prompt the user to try again later. No patch history entry is created.

- **What happens when the project summary is too large for the AI provider's context window?**  
  The system uses automatic truncation with goal-directed summarization and retrieval fallback. First, an essential "index summary" is always sent (schema version, tilesets, map list with sizes, entity/quest/dialogue IDs, constraints). Then a goal-directed "details slice" includes only parts relevant to the user request (e.g., if they say "edit town map", include just that map's layer IDs, available tile ranges, nearby NPCs/triggers; not every map). If still too large, the system switches to retrieval mode: the AI receives the index plus a small slice and must request additional details via a constrained "context fetch" step (e.g., "need map town01 collision bounds" → orchestrator supplies that chunk). This keeps UX smooth for large projects and avoids hard failures from context limits.

## Requirements *(mandatory)*

### Functional Requirements

#### ProjectSummary Generation

- **FR-001**: System MUST generate a deterministic ProjectSummary that includes schema version, tileset metadata (IDs and tile counts), map metadata (IDs, dimensions, layer IDs), entity definitions (types and counts), dialogue IDs, quest IDs, and configured constraints (maxOps, maxTileEdits, maxCollisionEdits)

- **FR-002**: System MUST exclude raw tile arrays, collision arrays, and full text content from the ProjectSummary unless explicitly required by the prompt to prevent token bloat

- **FR-003**: ProjectSummary generation MUST be deterministic (same project state produces identical summary) to enable testing and debugging

- **FR-004**: ProjectSummary MUST include available asset references (existing tilesets, sprite sheets, entity templates) that the AI can reference in patches

#### AI Provider Abstraction

- **FR-005**: System MUST use a provider interface abstraction that accepts ProjectSummary and user prompt, and returns either a PatchV1 JSON object or a structured error indicating parsing/format failure

- **FR-006**: System MUST NOT hard-code vendor-specific API calls; all AI interactions must go through the provider interface to enable testing with mock providers and future provider switching

- **FR-007**: Provider interface MUST support configuration for model selection, temperature, token limits, and other provider-specific parameters without changing orchestrator code

#### Patch-Only Output Enforcement

- **FR-008**: System MUST parse AI responses strictly as PatchV1 JSON format (as defined in Spec 002)

- **FR-009**: System MUST treat any non-JSON content or mixed commentary as invalid output and trigger a repair request with the instruction "Return only PatchV1 JSON with no additional commentary"

- **FR-010**: System MUST validate that the AI response contains all required PatchV1 fields (formatVersion, timestamp, operations) before proceeding to validation

#### Validation and Repair Loop

- **FR-011**: System MUST validate all proposed patches using the `validatePatch` function from Spec 002

- **FR-012**: System MUST send structured validation errors back to the AI provider when validation fails, including operation index, error type, and specific details (e.g., "Operation 3: tileId 999 out of bounds for tileset with 500 tiles")

- **FR-013**: System MUST limit repair attempts to a configurable maximum (default: 2 attempts) to prevent infinite loops

- **FR-014**: System MUST surface validation errors to the user if all repair attempts fail, with clear messaging that no changes were applied

- **FR-015**: System MUST track repair attempt count and include it in the final result for debugging and telemetry

#### Guardrails and Quotas

- **FR-016**: System MUST enforce configurable thresholds with defaults: maxOps=40, maxTileEdits=20000, maxCollisionEdits=20000

- **FR-017**: System MUST reject patches that exceed thresholds and instruct the AI to propose a smaller patch or request user to narrow scope

- **FR-018**: System MUST detect potentially destructive operations (map deletion, entity deletion, quest removal) and require explicit user confirmation before generating or applying such patches

- **FR-019**: System MUST count operations and edits during validation and enforce limits before apply stage

#### Preview and Explainability

- **FR-020**: System MUST generate a human-readable PatchSummary (using Spec 002 summary functionality) showing what will be created, modified, or deleted

- **FR-021**: System MUST display validation errors in user-friendly language (e.g., "3 tiles reference invalid tileset" instead of raw error codes)

- **FR-022**: System MUST show the user's original prompt alongside the patch summary for context

#### Apply Pipeline

- **FR-023**: System MUST apply patches atomically using `applyPatch` from Spec 002, ensuring all operations succeed or none do

- **FR-024**: System MUST add applied patches to the patch history as a single entry with metadata (timestamp, user prompt, AI model used)

- **FR-025**: System MUST support undo/redo for AI-applied patches using the inverse patch mechanism from Spec 002

- **FR-026**: System MUST preserve the user's original prompt in the patch history entry for future reference

- **FR-027**: System MUST store base snapshot references for every "hunk" (tile cells, collision cells, entity fields, trigger fields) modified by an AI patch to enable conflict detection on undo

- **FR-028**: System MUST perform preflight conflict detection before undo by comparing current values against post-patch values for each modified hunk

- **FR-029**: System MUST present users with conflict resolution options when manual edits are detected during undo: Cancel (default), Undo non-conflicting parts only, or Force undo with data loss warning

#### ProjectSummary Size Management

- **FR-030**: System MUST always include an essential "index summary" (schema version, tilesets, map list with sizes, entity/quest/dialogue IDs, constraints) regardless of project size

- **FR-031**: System MUST perform goal-directed summarization by including only details relevant to the user's prompt (e.g., specific map details when user mentions that map)

- **FR-032**: System MUST support retrieval mode where the AI can request additional context chunks via constrained "context fetch" operations when initial summary is insufficient

- **FR-033**: System MUST track token usage for summaries and automatically switch to retrieval mode when approaching provider context limits

#### User Interface Integration

- **FR-034**: Editor UI MUST provide an AI panel with a text input field for natural language prompts

- **FR-035**: Editor UI MUST provide "Propose" and "Apply" buttons that are enabled/disabled based on current state (e.g., Apply only enabled when valid patch is available)

- **FR-036**: Editor UI MUST display patch summary, validation errors, and repair status during the proposal process

- **FR-037**: Editor UI MUST provide "Reject", "Regenerate", "Undo", and "Redo" actions with clear visual states

- **FR-038**: Editor UI MUST show loading/progress indicators during AI request and validation phases

- **FR-039**: Editor UI MUST display conflict resolution dialog with three clear options when undo detects manual edits, with "Cancel" as the safe default

### Key Entities

- **ProjectSummary**: A token-efficient representation of the current project state including schema version, asset catalogs (tilesets, sprites), map metadata (not full data), entity definitions, dialogue/quest IDs, and system constraints. Used as context for AI patch generation.

- **AIProvider**: An abstract interface representing an AI service that accepts ProjectSummary and user prompt, returning either a PatchV1 JSON object or a structured error. Implementations may use different vendors (OpenAI, Anthropic, local models) without changing orchestrator logic.

- **OrchestratorResult**: The outcome of a patch proposal request including success/failure status, the proposed PatchV1 (if successful), validation errors (if any), repair attempt count, and user-friendly summary. Used to communicate results to the UI layer.

- **GuardrailConfig**: Configuration object specifying safety thresholds including maximum operations per patch, maximum tile edits, maximum collision edits, and flags for enabling destructive operation confirmations. Determines when patches are rejected as too large or risky.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can submit a natural language prompt and receive a valid patch proposal within 30 seconds for projects with up to 10 maps and 100 entities

- **SC-002**: System successfully repairs common validation errors (out-of-bounds references, missing entity types, duplicate IDs) on first repair attempt in 80% of cases where the initial patch is invalid

- **SC-003**: Users can complete the full cycle (prompt → review → apply) in under 60 seconds for simple requests (single map creation or entity addition)

- **SC-004**: Zero unintended data loss occurs - rejected patches cause no changes, and applied patches can be fully undone

- **SC-005**: System prevents oversize patches in 100% of cases where operations exceed configured thresholds (no patches bypass guardrails)

- **SC-006**: Users understand what changes will be made before applying - user testing shows 90% of users correctly identify what a patch will do from the summary

- **SC-007**: System handles AI provider errors gracefully - network failures or invalid responses result in clear error messages in 100% of cases, never in application crashes or corrupted state

## Assumptions

- Users have a working internet connection for AI provider access (v1 does not support offline operation)
- The AI provider returns responses within 30 seconds (configurable timeout)
- Projects remain under 50MB total size for reasonable summary generation performance
- Users understand basic game concepts (maps, entities, quests) to write effective prompts
- The AI provider supports JSON output formatting (most modern LLMs do)
- Tileset and sprite assets exist in the project before AI generates references to them (v1 does not generate new assets)
- Users are working on local projects (no network persistence or multi-user collaboration in v1)

## Out of Scope (v1)

- **Autonomous apply**: System will NOT automatically apply patches without explicit user confirmation in v1
- **Asset generation**: System will NOT generate new tilesets, sprites, or audio assets; only references to existing project assets
- **Multi-agent planning**: System will NOT support multi-step planning or conversation threads; each prompt is single-turn with repair loop only
- **Network persistence**: System will NOT sync patches or history to cloud storage in v1; all state is local
- **Collaborative editing**: System will NOT support multiple users proposing patches simultaneously in v1
- **Prompt history/templates**: System will NOT save or suggest prompt templates based on user history in v1
- **Advanced preview**: System will NOT render visual map previews or entity placement diagrams in v1; text summary only
