# Tasks: AI Orchestration v1

**Input**: Design documents from `/specs/003-ai-orchestration/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Unit tests included as they are critical for the AI orchestration system (patch validation, repair loops, conflict detection)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This feature uses monorepo structure:
- **Shared logic**: `packages/shared/src/ai/`
- **Editor UI**: `packages/editor/src/ai/`
- **Tests**: `packages/shared/tests/ai/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create directory structure for AI orchestration in packages/shared/src/ai/
- [x] T002 Create directory structure for AI UI in packages/editor/src/ai/
- [x] T003 Create directory structure for AI tests in packages/shared/tests/ai/
- [x] T004 [P] Create types.ts with base type definitions in packages/shared/src/ai/types.ts
- [x] T005 [P] Create index.ts public API exports in packages/shared/src/ai/index.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Implement ProjectSummary type definitions in packages/shared/src/ai/types.ts
- [x] T007 Implement AIInput, AIRawResponse, ProposedPatchResult types in packages/shared/src/ai/types.ts
- [x] T008 Implement GuardrailConfig and GuardrailResult types in packages/shared/src/ai/types.ts
- [x] T009 [P] Define AIProvider interface in packages/shared/src/ai/provider.ts
- [x] T010 [P] Implement MockProvider for testing in packages/shared/src/ai/provider.ts
- [x] T011 Create test fixtures (sample projects, valid patches) in packages/shared/tests/ai/fixtures.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Natural Language to Applied Patch (Priority: P1) 🎯 MVP

**Goal**: Enable users to describe changes in natural language, receive a patch proposal, review summary, and apply it atomically

**Independent Test**: Enter prompt "Create a small town map with 5 villagers", receive patch proposal showing what will be created, click Apply, verify content appears in project

### Implementation for User Story 1

#### Step 1: ProjectSummary Generation

- [x] T012 [P] [US1] Implement buildProjectSummary() function in packages/shared/src/ai/projectSummary.ts
- [x] T013 [US1] Implement deterministic ID sorting in buildProjectSummary() for stable output
- [x] T014 [US1] Implement tile/collision array exclusion logic in buildProjectSummary()
- [x] T015 [US1] Implement token estimation in buildProjectSummary()
- [x] T016 [P] [US1] Unit test: ProjectSummary has stable ordering in packages/shared/tests/ai/projectSummary.test.ts
- [x] T017 [P] [US1] Unit test: ProjectSummary excludes large arrays in packages/shared/tests/ai/projectSummary.test.ts
- [x] T018 [P] [US1] Unit test: ProjectSummary includes correct constraints in packages/shared/tests/ai/projectSummary.test.ts

#### Step 2: Prompt Templates

- [x] T019 [P] [US1] Implement buildSystemPrompt() in packages/shared/src/ai/promptTemplates.ts
- [x] T020 [P] [US1] Implement buildUserPrompt() in packages/shared/src/ai/promptTemplates.ts
- [x] T021 [US1] Add "Return ONLY PatchV1 JSON" contract to system prompt
- [x] T022 [US1] Include constraints and PatchV1 format examples in system prompt
- [x] T023 [P] [US1] Unit test: System prompt includes format contract in packages/shared/tests/ai/promptTemplates.test.ts

#### Step 3: Strict Patch Parsing

- [x] T024 [P] [US1] Implement parseAIResponse() for strict JSON extraction in packages/shared/src/ai/parse.ts
- [x] T025 [US1] Implement validation that response starts with { and ends with }
- [x] T026 [US1] Implement PatchV1 structure validation (formatVersion, operations fields)
- [x] T027 [US1] Implement structured parse error generation for repair feedback
- [x] T028 [P] [US1] Unit test: Parse accepts valid PatchV1 JSON in packages/shared/tests/ai/parse.test.ts
- [x] T029 [P] [US1] Unit test: Parse rejects non-JSON content in packages/shared/tests/ai/parse.test.ts
- [x] T030 [P] [US1] Unit test: Parse rejects mixed content (JSON + commentary) in packages/shared/tests/ai/parse.test.ts

#### Step 4: Basic Orchestrator (No Repair)

- [x] T031 [US1] Implement proposePatchOnce() in packages/shared/src/ai/orchestrator.ts
- [x] T032 [US1] Integrate ProjectSummary generation in proposePatchOnce()
- [x] T033 [US1] Integrate prompt building in proposePatchOnce()
- [x] T034 [US1] Integrate AIProvider call in proposePatchOnce()
- [x] T035 [US1] Integrate parse and validatePatch (Spec 002) in proposePatchOnce()
- [x] T036 [US1] Implement ProposedPatchResult construction with status codes
- [x] T037 [P] [US1] Unit test: Orchestrator with MockProvider (valid patch) in packages/shared/tests/ai/orchestrator.test.ts
- [x] T038 [P] [US1] Unit test: Orchestrator handles parse errors in packages/shared/tests/ai/orchestrator.test.ts
- [x] T039 [P] [US1] Unit test: Orchestrator handles validation errors in packages/shared/tests/ai/orchestrator.test.ts

#### Step 5: Editor UI - Proposal Flow

- [x] T040 [US1] Create AiPanel component in packages/editor/src/ai/AiPanel.tsx
- [x] T041 [US1] Implement prompt input textarea in AiPanel
- [x] T042 [US1] Implement "Propose" button with loading state in AiPanel
- [x] T043 [US1] Implement proposePatchWithRepair integration (stub repair for now) in AiPanel
- [x] T044 [US1] Implement patch summary display using Spec 002 PatchSummary in AiPanel
- [x] T045 [US1] Implement error message display for failed proposals in AiPanel
- [x] T046 [US1] Implement warning display for non-blocking issues in AiPanel

#### Step 6: Editor UI - Apply Flow

- [x] T047 [US1] Implement "Apply" button in AiPanel
- [x] T048 [US1] Integrate with Spec 002 applyPatch in AiPanel apply handler
- [x] T049 [US1] Integrate with Spec 002 history push (addToHistory) after apply
- [x] T050 [US1] Update editor project state after successful apply
- [x] T051 [US1] Show success message after apply completes
- [x] T052 [US1] Clear proposal state after successful apply

#### Step 7: Editor UI - Rejection Flow

- [x] T053 [P] [US1] Implement "Reject" button in AiPanel
- [x] T054 [P] [US1] Clear proposal state on reject (no project changes)
- [x] T055 [P] [US1] Keep prompt text on reject (allow refinement)

**Checkpoint**: User Story 1 MVP complete - users can propose patches via natural language, review summary, and apply atomically

---

## Phase 4: User Story 2 - Automatic Patch Repair (Priority: P2)

**Goal**: Automatically detect and repair invalid patches by sending structured errors back to AI for correction

**Independent Test**: Configure MockProvider to return invalid patch (out-of-bounds coordinates), verify system requests correction, verify eventual success or clear failure message after max attempts

### Implementation for User Story 2

#### Step 1: Repair Context and Error Structures

- [x] T056 [P] [US2] Implement RepairContext type in packages/shared/src/ai/types.ts
- [x] T057 [P] [US2] Implement PatchError type with operation-level details in packages/shared/src/ai/types.ts
- [x] T058 [US2] Implement convertValidationErrorsToPatchErrors() utility in packages/shared/src/ai/orchestrator.ts

#### Step 2: Repair Loop Implementation

- [x] T059 [US2] Implement proposePatchWithRepair() wrapper in packages/shared/src/ai/orchestrator.ts
- [x] T060 [US2] Implement repair loop with maxAttempts configuration (default: 2)
- [x] T061 [US2] Implement repair prompt building with structured errors in promptTemplates.ts
- [x] T062 [US2] Implement attempt counter and early exit on success
- [x] T063 [US2] Implement final error collection when all attempts exhausted
- [x] T064 [US2] Update ProposedPatchResult to include repairAttempts count

#### Step 3: Repair Loop Tests

- [x] T065 [P] [US2] Unit test: Repair succeeds on first attempt in packages/shared/tests/ai/orchestrator.test.ts
- [x] T066 [P] [US2] Unit test: Repair succeeds on second attempt in packages/shared/tests/ai/orchestrator.test.ts
- [x] T067 [P] [US2] Unit test: Repair exhausts attempts and returns errors in packages/shared/tests/ai/orchestrator.test.ts
- [x] T068 [P] [US2] Unit test: Parse errors trigger format repair request in packages/shared/tests/ai/orchestrator.test.ts
- [x] T069 [P] [US2] Unit test: Validation errors trigger structured error feedback in packages/shared/tests/ai/orchestrator.test.ts

#### Step 4: UI Updates for Repair

- [x] T070 [US2] Update AiPanel to show repair status during proposal
- [x] T071 [US2] Display "Correcting patch (attempt N/M)" message during repair
- [x] T072 [US2] Hide repair details from user when successful (seamless experience)
- [x] T073 [US2] Show detailed validation errors when all repairs fail

**Checkpoint**: Automatic repair working - invalid patches are corrected transparently, or clear errors shown after exhaustion

---

## Phase 5: User Story 5 - Guardrails Prevent Destructive Changes (Priority: P2)

**Goal**: Protect users from accidentally large or destructive changes with safety thresholds and confirmations

**Independent Test**: Request "modify every tile in the game", verify system rejects with clear message. Request "delete all entities" with explicit intent, verify confirmation required.

**Note**: Implementing US5 before US3/US4 because guardrails are critical safety infrastructure

### Implementation for User Story 5

#### Step 1: Guardrail Implementation

- [x] T074 [P] [US5] Implement checkGuardrails() function in packages/shared/src/ai/guardrails.ts
- [x] T075 [US5] Implement operation count checking (maxOps threshold)
- [x] T076 [US5] Implement tile edit count checking (maxTileEdits threshold)
- [x] T077 [US5] Implement collision edit count checking (maxCollisionEdits threshold)
- [x] T078 [US5] Implement destructive operation detection (delete operations)
- [x] T079 [US5] Implement keyword heuristics for user intent (delete/remove vs add/create)
- [x] T080 [US5] Implement GuardrailResult construction with warnings and reasons

#### Step 2: Guardrail Integration

- [x] T081 [US5] Integrate checkGuardrails() into orchestrator before validation
- [x] T082 [US5] Return guardrail_blocked status when limits exceeded
- [x] T083 [US5] Include exceeded thresholds in result message
- [x] T084 [US5] Support allowDestructive flag override in options

#### Step 3: Guardrail Tests

- [x] T085 [P] [US5] Unit test: Guardrails allow valid patches in packages/shared/tests/ai/guardrails.test.ts
- [x] T086 [P] [US5] Unit test: Guardrails block oversized patches (ops) in packages/shared/tests/ai/guardrails.test.ts
- [x] T087 [P] [US5] Unit test: Guardrails block oversized patches (tile edits) in packages/shared/tests/ai/guardrails.test.ts
- [x] T088 [P] [US5] Unit test: Guardrails block destructive operations in packages/shared/tests/ai/guardrails.test.ts
- [x] T089 [P] [US5] Unit test: Guardrails respect allowDestructive flag in packages/shared/tests/ai/guardrails.test.ts
- [x] T090 [P] [US5] Unit test: Guardrails detect explicit delete intent from prompt in packages/shared/tests/ai/guardrails.test.ts

#### Step 4: Downsizing Repair (Optional Enhancement)

- [x] T091 [US5] Implement downsizing repair request when patch too large
- [x] T092 [US5] Add "reduce scope" instruction to repair prompt for oversized patches
- [x] T093 [US5] Dedicate one repair attempt to downsizing before failing
- [x] T094 [P] [US5] Unit test: Oversized patch triggers downsize request in packages/shared/tests/ai/guardrails.test.ts

#### Step 5: UI Updates for Guardrails

- [x] T095 [US5] Display guardrail warnings in AiPanel when patch blocked
- [x] T096 [US5] Show specific threshold exceeded (ops/tiles/collision) in warning
- [x] T097 [US5] Suggest reducing scope in error message
- [x] T098 [US5] Show confirmation dialog for destructive operations (if allowDestructive enabled)

**Checkpoint**: Safety guardrails active - users protected from accidental large-scale or destructive changes

---

## Phase 6: User Story 3 - Patch Preview and Rejection (Priority: P2)

**Goal**: Allow users to review proposed changes and reject proposals without any modifications

**Independent Test**: Receive patch proposal, review summary of changes (maps, entities, tiles), click Reject, verify no project changes occurred

**Note**: Most preview/rejection functionality already implemented in US1; this phase adds enhancements

### Implementation for User Story 3

#### Step 1: Enhanced Preview

- [x] T099 [P] [US3] Enhance patch summary display with operation categories in AiPanel
- [x] T100 [P] [US3] Show operation counts by type (maps created, entities added, tiles modified)
- [x] T101 [P] [US3] Display user's original prompt alongside preview for context
- [x] T102 [P] [US3] Add collapsible details for each operation type

#### Step 2: Regenerate Flow

- [x] T103 [US3] Implement "Regenerate" button in AiPanel
- [x] T104 [US3] Keep original prompt but request new patch from AI
- [x] T105 [US3] Clear previous proposal before regenerating
- [x] T106 [US3] Show regeneration count to user

#### Step 3: Rejection Verification

- [x] T107 [P] [US3] Add integration test: Reject proposal, verify project unchanged
- [x] T108 [P] [US3] Add integration test: Reject then refine prompt, verify new proposal
- [x] T109 [P] [US3] Add integration test: Reject oversized proposal, verify no partial changes

**Checkpoint**: Preview and rejection fully functional - users have complete control over applying changes

---

## Phase 7: User Story 4 - Undo/Redo AI Changes (Priority: P3)

**Goal**: Support full undo/redo of AI-applied patches with conflict detection for manual edits

**Independent Test**: Apply patch creating town map, click Undo to remove all changes, click Redo to restore, verify project state correct at each step

### Implementation for User Story 4

#### Step 1: Basic Undo/Redo Integration

- [x] T110 [US4] Verify Spec 002 history manager supports undo/redo (should already exist)
- [x] T111 [P] [US4] Implement "Undo" button in AiPanel (if not in editor already)
- [x] T112 [P] [US4] Implement "Redo" button in AiPanel (if not in editor already)
- [x] T113 [US4] Bind Undo button to history manager undo() call
- [x] T114 [US4] Bind Redo button to history manager redo() call
- [x] T115 [US4] Update UI state after undo/redo completes

#### Step 2: Conflict Hunk Storage

- [x] T116 [US4] Implement ConflictHunk type in packages/shared/src/ai/types.ts
- [x] T117 [US4] Implement hunk creation logic in packages/shared/src/ai/conflict.ts
- [x] T118 [US4] Extract modified hunks from applied patch operations
- [x] T119 [US4] Serialize hunk state as JSON snapshot (postPatchSnapshot)
- [x] T120 [US4] Store hunks alongside patch in history (extend Spec 002 history entry)

#### Step 3: Conflict Detection

- [x] T121 [US4] Implement detectConflicts() function in packages/shared/src/ai/conflict.ts
- [x] T122 [US4] Implement hunk comparison (current state vs postPatchSnapshot)
- [x] T123 [US4] Implement ConflictDetectionResult construction
- [x] T124 [US4] Separate safe hunks from conflicting hunks
- [x] T125 [US4] Generate human-readable conflict descriptions
- [x] T126 [P] [US4] Unit test: No conflicts detected when unchanged in packages/shared/tests/ai/conflict.test.ts
- [x] T127 [P] [US4] Unit test: Conflicts detected when manually edited in packages/shared/tests/ai/conflict.test.ts
- [x] T128 [P] [US4] Unit test: Partial conflicts (some hunks safe, some conflict) in packages/shared/tests/ai/conflict.test.ts

#### Step 4: Conflict Resolution UI

- [x] T129 [US4] Create ConflictDialog component in packages/editor/src/ai/ConflictDialog.tsx
- [x] T130 [US4] Implement Cancel button (safe default) in ConflictDialog
- [x] T131 [US4] Implement "Undo non-conflicting only" button in ConflictDialog
- [x] T132 [US4] Implement "Force undo" button with warning in ConflictDialog
- [x] T133 [US4] Display conflict details (hunks affected) in ConflictDialog
- [x] T134 [US4] Show data loss warning for force undo option

#### Step 5: Undo with Conflict Check

- [x] T135 [US4] Implement checkUndoConflicts() in orchestrator or conflict.ts
- [x] T136 [US4] Integrate conflict check before undo in AiPanel undo handler
- [x] T137 [US4] Show ConflictDialog when conflicts detected
- [x] T138 [US4] Execute undo based on user resolution choice
- [x] T139 [US4] Implement partial undo (skip conflicting hunks)
- [x] T140 [US4] Implement force undo (apply inverse patch regardless)

#### Step 6: Integration Tests

- [x] T141 [P] [US4] Integration test: Undo with no manual edits in packages/shared/tests/ai/integration.test.ts
- [x] T142 [P] [US4] Integration test: Undo with conflicts, cancel in packages/shared/tests/ai/integration.test.ts
- [x] T143 [P] [US4] Integration test: Undo with conflicts, partial undo in packages/shared/tests/ai/integration.test.ts
- [x] T144 [P] [US4] Integration test: Undo with conflicts, force undo in packages/shared/tests/ai/integration.test.ts
- [x] T145 [P] [US4] Integration test: Redo after undo restores state in packages/shared/tests/ai/integration.test.ts

**Checkpoint**: Undo/redo fully functional with conflict detection - users can safely experiment with AI changes

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories, documentation, and final validation

- [x] T146 [P] Create README.md in packages/shared/src/ai/ with architecture overview
- [x] T147 [P] Document how to implement custom AI provider in quickstart.md
- [x] T148 [P] Add JSDoc comments to all public API functions
- [x] T149 [P] Create demo scenario with expected results
- [x] T150 [P] Document ProjectSummary strategy and token management
- [x] T151 [P] Document guardrail configuration options
- [x] T152 [P] Document repair loop behavior and limits
- [x] T153 Code cleanup: Remove debug logging, polish error messages
- [x] T154 Code cleanup: Ensure consistent naming conventions
- [x] T155 Run all unit tests and verify >80% coverage
- [x] T156 Run integration tests end-to-end
- [x] T157 Performance test: ProjectSummary generation on large project (<500ms target)
- [x] T158 Performance test: Validation + guardrails on 40 op patch (<100ms target)
- [x] T159 Validate quickstart.md examples still work
- [x] T160 Create migration guide for adding new AI providers

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - **US1 (P1)**: Can start after Foundational - No dependencies on other stories
  - **US2 (P2)**: Depends on US1 (orchestrator core must exist)
  - **US5 (P2)**: Depends on US1 (orchestrator core must exist)
  - **US3 (P2)**: Depends on US1 (UI must exist for preview enhancements)
  - **US4 (P3)**: Depends on US1 (apply flow must exist for undo/redo)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Foundational (Phase 2) [BLOCKS ALL]
    ↓
US1: Natural Language to Applied Patch (P1) [MVP - INDEPENDENT]
    ↓
    ├─→ US2: Automatic Patch Repair (P2) [Depends on US1 orchestrator]
    ├─→ US5: Guardrails (P2) [Depends on US1 orchestrator]
    ├─→ US3: Preview/Rejection (P2) [Depends on US1 UI]
    └─→ US4: Undo/Redo (P3) [Depends on US1 apply]
```

### Within Each User Story

- Tests before implementation (write failing tests first)
- Types before implementation
- Core logic before UI
- Unit tests before integration tests
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**: All 5 tasks can run in parallel

**Phase 2 (Foundational)**: Tasks T006-T008 (types) can run in parallel, then T009-T011 can run in parallel

**User Story 1**: 
- Step 1: T012-T015 (summary implementation) then T016-T018 (tests) in parallel
- Step 2: T019-T020 in parallel, then T021-T023
- Step 3: T024-T027 (parse implementation) then T028-T030 (tests) in parallel
- Step 4: T031-T036 (orchestrator) then T037-T039 (tests) in parallel
- Step 5: All UI tasks (T040-T046) sequential (same component)
- Step 6: Apply flow tasks (T047-T052) sequential
- Step 7: T053-T055 in parallel (rejection is simple)

**User Story 2**:
- Step 1: T056-T057 in parallel (types)
- Step 2: T059-T064 sequential (repair loop logic)
- Step 3: T065-T069 in parallel (all tests)
- Step 4: T070-T073 sequential (UI updates)

**User Story 5**:
- Step 1: T074-T080 sequential (guardrail logic)
- Step 2: T081-T084 sequential (integration)
- Step 3: T085-T090 in parallel (all tests)
- Step 4: T091-T094 sequential (optional enhancement)
- Step 5: T095-T098 sequential (UI updates)

**User Story 3**:
- Step 1: T099-T102 in parallel (preview enhancements)
- Step 2: T103-T106 sequential (regenerate button)
- Step 3: T107-T109 in parallel (tests)

**User Story 4**:
- Step 1: T110-T115 sequential (basic integration)
- Step 2: T116-T120 sequential (hunk storage)
- Step 3: T121-T125 (conflict detection) then T126-T128 (tests) in parallel
- Step 4: T129-T134 sequential (dialog UI)
- Step 5: T135-T140 sequential (undo with conflicts)
- Step 6: T141-T145 in parallel (integration tests)

**Phase 8 (Polish)**: T146-T152 and T160 in parallel (documentation), T153-T154 sequential (cleanup), T155-T159 sequential (testing)

---

## Parallel Example: User Story 1, Step 1

```bash
# After T012-T015 complete, launch all tests together:
Task T016: "Unit test: ProjectSummary has stable ordering"
Task T017: "Unit test: ProjectSummary excludes large arrays"
Task T018: "Unit test: ProjectSummary includes correct constraints"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T011) - CRITICAL
3. Complete Phase 3: User Story 1 (T012-T055)
4. **STOP and VALIDATE**: Test US1 independently with demo prompt
5. Deploy/demo if ready

**Estimated MVP**: ~55 tasks to working natural language → patch → apply flow

### Incremental Delivery

1. **Foundation**: Setup + Foundational → Tests pass (T001-T011)
2. **MVP**: Add US1 → Natural language to applied patch works (T012-T055)
3. **Reliability**: Add US2 → Automatic repair increases success rate (T056-T073)
4. **Safety**: Add US5 → Guardrails prevent accidents (T074-T098)
5. **Control**: Add US3 → Enhanced preview and regeneration (T099-T109)
6. **Confidence**: Add US4 → Undo/redo with conflict detection (T110-T145)
7. **Polish**: Final documentation and performance validation (T146-T160)

Each increment adds value without breaking previous functionality.

### Parallel Team Strategy

With multiple developers after Foundational phase (T011):

- **Developer A**: US1 core logic (T012-T039) → ~2-3 days
- **Developer B**: US1 UI (T040-T055) starts after T039 → ~1-2 days
- **Developer C**: Starts US2 after T055 complete

Sequential with one developer: ~2-3 weeks for full feature

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [US#] label maps task to specific user story for traceability
- Each user story independently completable and testable
- Write tests before implementation (fail first, then implement)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Total: 160 tasks organized across 8 phases
- MVP scope: Phases 1-3 (55 tasks) delivers working AI orchestration
- Full feature: All phases (160 tasks) delivers production-ready system
