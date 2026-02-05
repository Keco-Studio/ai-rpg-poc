---
description: "Implementation tasks for AI Patch Engine v1"
---

# Tasks: AI Patch Engine v1

**Input**: Design documents from `/specs/002-ai-patch-engine/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/patch-v1.schema.json, research.md, quickstart.md

**Tests**: Tests are included as this is a critical data integrity feature requiring comprehensive validation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo package**: `packages/shared/` (shared library package)
- **Source**: `packages/shared/src/patch/`, `packages/shared/src/history/`
- **Tests**: `packages/shared/tests/patch/`, `packages/shared/tests/history/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Verify monorepo setup and shared package structure in packages/shared/
- [X] T002 Create packages/shared/src/patch/ directory for core patch engine
- [X] T003 Create packages/shared/src/history/ directory for undo/redo utilities
- [X] T004 Create packages/shared/tests/patch/ directory with fixtures/ subdirectory
- [X] T005 Create packages/shared/tests/history/ directory for history tests

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types and error model that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 [P] Define PatchV1 interface in packages/shared/src/patch/types.ts
- [X] T007 [P] Define PatchMetadata interface in packages/shared/src/patch/types.ts
- [X] T008 Define PatchOp discriminated union with all 17 operation types in packages/shared/src/patch/types.ts
- [X] T009 Define map operations (CreateMapOp, CreateLayerOp) in packages/shared/src/patch/types.ts
- [X] T010 [P] Define tile operations (PaintRectOp, SetTilesOp, ClearTilesOp) in packages/shared/src/patch/types.ts
- [X] T011 [P] Define collision operations (SetCollisionCellsOp, SetCollisionRectOp) in packages/shared/src/patch/types.ts
- [X] T012 [P] Define entity operations (CreateEntityDefOp, PlaceEntityOp, MoveEntityOp, DeleteEntityOp) in packages/shared/src/patch/types.ts
- [X] T013 [P] Define trigger operations (CreateTriggerOp, UpdateTriggerOp) in packages/shared/src/patch/types.ts
- [X] T014 [P] Define dialogue operations (CreateDialogueOp, UpdateDialogueNodeOp) in packages/shared/src/patch/types.ts
- [X] T015 [P] Define quest operations (CreateQuestOp, UpdateQuestOp) in packages/shared/src/patch/types.ts
- [X] T016 [P] Define PatchSummary, ResourceSummary, TileEditSummary, CollisionEditSummary interfaces in packages/shared/src/patch/types.ts
- [X] T017 Define PatchErrorCode enum with all 8 error codes in packages/shared/src/patch/errors.ts
- [X] T018 Define PatchError interface with code, message, opIndex, path, detail in packages/shared/src/patch/errors.ts
- [X] T019 Define ValidationResult discriminated union in packages/shared/src/patch/errors.ts
- [X] T020 Define ApplyResult interface in packages/shared/src/patch/types.ts
- [X] T021 [P] Implement error helper functions (errOutOfBounds, errMissingRef, errDuplicateId, etc.) in packages/shared/src/patch/errors.ts
- [X] T022 Export patch types from packages/shared/src/patch/index.ts
- [X] T023 Export error types from packages/shared/src/patch/index.ts
- [X] T024 Export patch module from packages/shared/src/index.ts public API

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 4 - Safe Bounds and Reference Validation (Priority: P1) 🎯

**Goal**: Reject invalid changes (out-of-bounds, missing refs, duplicate IDs, invalid tiles) before they're applied

**Independent Test**: Submit patches with various validation violations and confirm each is rejected with actionable error messages without modifying the project

### Tests for User Story 4

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T025 [P] [US4] Create base project fixture in packages/shared/tests/patch/fixtures/projects/base-project.json
- [X] T026 [P] [US4] Create valid-minimal.json patch fixture in packages/shared/tests/patch/fixtures/patches/
- [X] T027 [P] [US4] Create invalid-out-of-bounds.json patch fixture in packages/shared/tests/patch/fixtures/patches/
- [X] T028 [P] [US4] Create invalid-missing-ref.json patch fixture in packages/shared/tests/patch/fixtures/patches/
- [X] T029 [P] [US4] Create invalid-duplicate-id.json patch fixture in packages/shared/tests/patch/fixtures/patches/
- [X] T030 [P] [US4] Create invalid-tile-index.json patch fixture in packages/shared/tests/patch/fixtures/patches/
- [X] T031 [US4] Create validation test suite in packages/shared/tests/patch/validate.test.ts with tests for all error codes

### Implementation for User Story 4

- [X] T032 [US4] Implement validatePatchStructure(patch) for shape checks in packages/shared/src/patch/validate.ts
- [X] T033 [US4] Validate patchVersion and baseSchemaVersion match expectations in packages/shared/src/patch/validate.ts
- [X] T034 [US4] Implement ValidationContext interface with ID lookup maps in packages/shared/src/patch/validate.ts
- [X] T035 [US4] Implement buildValidationContext(project) to create ID sets and maps in packages/shared/src/patch/validate.ts
- [X] T036 [US4] Implement validateMapOps (createMap, createLayer) in packages/shared/src/patch/validate.ts
- [X] T037 [US4] Implement validateTileOps (paintRect, setTiles, clearTiles) with bounds checking in packages/shared/src/patch/validate.ts
- [X] T038 [US4] Implement validateCollisionOps (setCollisionCells, setCollisionRect) in packages/shared/src/patch/validate.ts
- [X] T039 [US4] Implement validateEntityOps (createEntityDef, placeEntity, moveEntity, deleteEntity) in packages/shared/src/patch/validate.ts
- [X] T040 [US4] Implement validateTriggerOps (createTrigger, updateTrigger) in packages/shared/src/patch/validate.ts
- [X] T041 [US4] Implement validateDialogueOps (createDialogue, updateDialogueNode) in packages/shared/src/patch/validate.ts
- [X] T042 [US4] Implement validateQuestOps (createQuest, updateQuest) in packages/shared/src/patch/validate.ts
- [X] T043 [US4] Implement validatePatch(project, patch) main function with two-phase validation in packages/shared/src/patch/validate.ts
- [X] T044 [US4] Ensure validation considers operation order (allow "create then reference" within same patch) in packages/shared/src/patch/validate.ts
- [X] T045 [US4] Validate unique IDs within patch and against existing project IDs in packages/shared/src/patch/validate.ts
- [X] T046 [US4] Export validatePatch and validatePatchStructure from packages/shared/src/patch/index.ts
- [X] T047 [US4] Run validation test suite and verify all validation rules work correctly

**Checkpoint**: At this point, User Story 4 should be fully functional - all validation rules tested and working

---

## Phase 4: User Story 1 - AI-Assisted Content Creation with Preview (Priority: P1) 🎯 MVP

**Goal**: Request content additions from AI, see summary of changes before accepting, ensure project only modified after explicit acceptance

**Independent Test**: Submit patch that creates entities and quests, verify diff summary shows accurate changes, confirm project only modified after acceptance

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T048 [P] [US1] Create valid-create-map.json patch fixture in packages/shared/tests/patch/fixtures/patches/
- [X] T049 [P] [US1] Create valid-paint-tiles.json patch fixture in packages/shared/tests/patch/fixtures/patches/
- [X] T050 [P] [US1] Create valid-place-entities.json patch fixture in packages/shared/tests/patch/fixtures/patches/
- [X] T051 [US1] Create apply test suite in packages/shared/tests/patch/apply.test.ts
- [X] T052 [US1] Create summary test suite in packages/shared/tests/patch/summary.test.ts

### Implementation for User Story 1

- [X] T053 [P] [US1] Implement applyMapOps (createMap, createLayer) in packages/shared/src/patch/apply.ts
- [X] T054 [P] [US1] Implement applyTileOps (paintRect, setTiles, clearTiles) with structural sharing in packages/shared/src/patch/apply.ts
- [X] T055 [P] [US1] Implement applyCollisionOps (setCollisionCells, setCollisionRect) in packages/shared/src/patch/apply.ts
- [X] T056 [P] [US1] Implement applyEntityOps (createEntityDef, placeEntity, moveEntity, deleteEntity) in packages/shared/src/patch/apply.ts
- [X] T057 [P] [US1] Implement applyTriggerOps (createTrigger, updateTrigger) in packages/shared/src/patch/apply.ts
- [X] T058 [P] [US1] Implement applyDialogueOps (createDialogue, updateDialogueNode) in packages/shared/src/patch/apply.ts
- [X] T059 [P] [US1] Implement applyQuestOps (createQuest, updateQuest) in packages/shared/src/patch/apply.ts
- [X] T060 [US1] Implement applyPatch(project, patch) as pure function returning new Project in packages/shared/src/patch/apply.ts
- [X] T061 [US1] Ensure applyPatch applies ops in order with internal working project copy in packages/shared/src/patch/apply.ts
- [X] T062 [US1] Implement atomic rollback on any failure in packages/shared/src/patch/apply.ts
- [X] T063 [US1] Implement summarizePatch(before, after) in packages/shared/src/patch/summary.ts
- [X] T064 [US1] Calculate created/modified/deleted IDs per resource type in packages/shared/src/patch/summary.ts
- [X] T065 [US1] Calculate tile edits count per (mapId, layerId) in packages/shared/src/patch/summary.ts
- [X] T066 [US1] Calculate collision edits count per mapId in packages/shared/src/patch/summary.ts
- [X] T067 [US1] Export applyPatch and summarizePatch from packages/shared/src/patch/index.ts
- [X] T068 [US1] Run apply and summary test suites and verify correctness

**Checkpoint**: At this point, User Story 1 should be fully functional - patches can be validated, applied, and summarized

---

## Phase 5: User Story 2 - Single-Step Undo/Redo of Complex Changes (Priority: P2)

**Goal**: Undo entire AI-generated change as single action, quickly revert complex modifications without step-by-step undo

**Independent Test**: Apply multi-operation patch, perform undo to verify complete reversion (deep equality), then redo to restore changes

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T069 [P] [US2] Create integration test for apply + inverse = identity in packages/shared/tests/patch/integration.test.ts
- [X] T070 [P] [US2] Create history stack test suite in packages/shared/tests/history/history.test.ts
- [X] T071 [US2] Add test cases for undo/redo with multiple patches in packages/shared/tests/history/history.test.ts
- [X] T072 [US2] Add test cases for undo on empty stack and redo after new patch in packages/shared/tests/history/history.test.ts

### Implementation for User Story 2

- [X] T073 [P] [US2] Implement inverse generation for map ops (createMap → deleteMap with restore data) in packages/shared/src/patch/apply.ts
- [X] T074 [P] [US2] Implement inverse generation for tile ops (paintRect → setTiles with previous values) in packages/shared/src/patch/apply.ts
- [X] T075 [P] [US2] Implement inverse generation for collision ops (restore prior collision values) in packages/shared/src/patch/apply.ts
- [X] T076 [P] [US2] Implement inverse generation for entity ops (create ↔ delete, move → move back) in packages/shared/src/patch/apply.ts
- [X] T077 [P] [US2] Implement inverse generation for trigger ops (create → delete, update → restore) in packages/shared/src/patch/apply.ts
- [X] T078 [P] [US2] Implement inverse generation for dialogue ops (restore previous node/graph) in packages/shared/src/patch/apply.ts
- [X] T079 [P] [US2] Implement inverse generation for quest ops (restore previous quest data) in packages/shared/src/patch/apply.ts
- [X] T080 [US2] Update applyPatch to return ApplyResult with inverse patch in packages/shared/src/patch/apply.ts
- [X] T081 [US2] Validate that generated inverse patches are valid when applied in packages/shared/src/patch/apply.ts
- [X] T082 [US2] Define HistoryEntry interface in packages/shared/src/history/history.ts
- [X] T083 [US2] Define HistoryStack class with undoStack and redoStack in packages/shared/src/history/history.ts
- [X] T084 [US2] Implement applyAndPush(project, patch) method in packages/shared/src/history/history.ts
- [X] T085 [US2] Implement undo(project) method with inverse patch application in packages/shared/src/history/history.ts
- [X] T086 [US2] Implement redo(project) method with original patch reapplication in packages/shared/src/history/history.ts
- [X] T087 [US2] Implement canUndo() and canRedo() helper methods in packages/shared/src/history/history.ts
- [X] T088 [US2] Implement clear() method and maxSize support in packages/shared/src/history/history.ts
- [X] T089 [US2] Export HistoryStack and HistoryEntry from packages/shared/src/history/index.ts
- [X] T090 [US2] Export history module from packages/shared/src/index.ts public API
- [X] T091 [US2] Run integration and history test suites and verify undo/redo correctness

**Checkpoint**: At this point, User Stories 1, 2, and 4 should all work - complete patch lifecycle with undo/redo

---

## Phase 6: User Story 3 - Programmatic Project Mutations (Priority: P3)

**Goal**: Use patch API programmatically to make validated changes, build reliable tooling that respects validation rules

**Independent Test**: Write script that constructs patches programmatically, applies via API, and verifies deterministic results

### Tests for User Story 3

- [X] T092 [P] [US3] Create programmatic patch construction examples in packages/shared/tests/patch/programmatic.test.ts
- [X] T093 [P] [US3] Test sequential patch application with deterministic results in packages/shared/tests/patch/programmatic.test.ts
- [X] T094 [US3] Test that applying inverses in reverse order restores original state in packages/shared/tests/patch/programmatic.test.ts

### Implementation for User Story 3

- [X] T095 [US3] Review and polish public API exports in packages/shared/src/index.ts
- [X] T096 [US3] Add JSDoc comments to validatePatch function in packages/shared/src/patch/validate.ts
- [X] T097 [US3] Add JSDoc comments to applyPatch function in packages/shared/src/patch/apply.ts
- [X] T098 [US3] Add JSDoc comments to summarizePatch function in packages/shared/src/patch/summary.ts
- [X] T099 [US3] Add JSDoc comments to HistoryStack class in packages/shared/src/history/history.ts
- [X] T100 [US3] Add JSDoc comments to all PatchOp type definitions in packages/shared/src/patch/types.ts
- [X] T101 [US3] Create example script showing programmatic patch construction in packages/shared/tests/patch/examples/
- [X] T102 [US3] Run programmatic test suite and verify API usability

**Checkpoint**: All user stories should now be independently functional with polished API

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, performance validation, and final quality improvements

### Golden Fixtures & Performance Tests

- [X] T103 [P] Create comprehensive valid patch fixture with all operation types in packages/shared/tests/patch/fixtures/patches/valid-comprehensive.json
- [X] T104 [P] Add performance benchmark for 1000 tile edits in packages/shared/tests/patch/performance.test.ts
- [X] T105 [P] Add performance benchmark for 50,000 tile edits via rect ops in packages/shared/tests/patch/performance.test.ts
- [X] T106 Add performance target validation (validate <10ms, apply <100ms) in packages/shared/tests/patch/performance.test.ts

### Documentation

- [X] T107 [P] Create PATCH_FORMAT.md documenting PatchV1 schema, ops, examples in specs/002-ai-patch-engine/
- [X] T108 [P] Create PATCHING_GUIDE.md with usage guide, best practices, troubleshooting in specs/002-ai-patch-engine/
- [X] T109 Update quickstart.md with any missing examples based on implementation in specs/002-ai-patch-engine/quickstart.md
- [X] T110 Add README.md in packages/shared/src/patch/ explaining module structure

### Code Quality

- [X] T111 Run linter on all patch engine source files and fix issues
- [X] T112 Run type checker and ensure no TypeScript errors
- [X] T113 Review error messages for clarity and actionability
- [X] T114 Verify all validation rules produce correct error codes
- [X] T115 Run full test suite and ensure 100% pass rate

### Integration Validation

- [X] T116 Validate that patch engine works with existing schema validator from Spec 001
- [X] T117 Test patch application on example project from examples/demo-project/
- [X] T118 Verify inverse patch generation succeeds for all valid test patches
- [X] T119 Confirm deterministic behavior (same input → same output) across all tests

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US4 (Validation) can proceed independently after Foundational
  - US1 (Apply + Summary) depends on US4 completion
  - US2 (Inverse + History) depends on US1 completion
  - US3 (Programmatic API) depends on US1, US2, US4 completion (polish)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 4 (P1) - Validation**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 1 (P1) - Apply & Summary**: Depends on US4 (validation must work before apply)
- **User Story 2 (P2) - Undo/Redo**: Depends on US1 (apply must work before inverse generation)
- **User Story 3 (P3) - Programmatic API**: Depends on US1, US2, US4 (all core features must work)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Types before validation logic
- Validation before application
- Application before inverse generation
- Inverse generation before history stack
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1 (Setup)**: All directory creation tasks (T002-T005) can run in parallel
- **Phase 2 (Foundational)**: 
  - Operation type definitions (T009-T015) can run in parallel after T008
  - Summary type definitions (T016) parallel with operations
  - Error helpers (T021) parallel with type exports
- **Phase 3 (US4 - Validation)**:
  - All fixture creation (T025-T030) can run in parallel
  - Validation implementation for different op categories (T036-T042) can run in parallel after context setup (T034-T035)
- **Phase 4 (US1 - Apply)**:
  - All fixture creation (T048-T050) can run in parallel
  - Apply implementations for different op categories (T053-T059) can run in parallel
  - Summary calculations (T064-T066) can run in parallel
- **Phase 5 (US2 - Inverse)**:
  - Test creation (T069-T072) can run in parallel
  - Inverse generation for different op categories (T073-T079) can run in parallel
- **Phase 6 (US3 - Programmatic)**:
  - Test creation (T092-T094) can run in parallel
  - JSDoc additions (T096-T100) can run in parallel
- **Phase 7 (Polish)**:
  - Fixture/test creation (T103-T105) can run in parallel
  - Documentation files (T107-T110) can run in parallel

---

## Parallel Example: User Story 4 (Validation)

```bash
# After foundational types complete, launch validation implementation in parallel:
Task: "Implement validateTileOps with bounds checking" (T037)
Task: "Implement validateCollisionOps" (T038)
Task: "Implement validateEntityOps" (T039)
Task: "Implement validateTriggerOps" (T040)
Task: "Implement validateDialogueOps" (T041)
Task: "Implement validateQuestOps" (T042)
```

---

## Parallel Example: User Story 1 (Apply)

```bash
# After validation complete, launch apply implementations in parallel:
Task: "Implement applyTileOps with structural sharing" (T054)
Task: "Implement applyCollisionOps" (T055)
Task: "Implement applyEntityOps" (T056)
Task: "Implement applyTriggerOps" (T057)
Task: "Implement applyDialogueOps" (T058)
Task: "Implement applyQuestOps" (T059)
```

---

## Implementation Strategy

### MVP First (User Stories 4 + 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 4 (Validation)
4. Complete Phase 4: User Story 1 (Apply + Summary)
5. **STOP and VALIDATE**: Test validation + apply + summary independently
6. Deploy/demo if ready - this provides core AI-assisted content creation with preview

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 4 → Test validation independently
3. Add User Story 1 → Test apply + summary → Deploy/Demo (MVP!)
4. Add User Story 2 → Test undo/redo independently → Deploy/Demo
5. Add User Story 3 → Polish API → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 4 (Validation)
   - Developer B: Prepare US1 tests and fixtures (T048-T052)
3. After US4 complete:
   - Developer A: User Story 1 apply logic (T053-T062)
   - Developer B: User Story 1 summary logic (T063-T066)
4. After US1 complete:
   - Developer A: User Story 2 inverse generation (T073-T081)
   - Developer B: User Story 2 history stack (T082-T090)
5. After US2 complete:
   - Developer A: User Story 3 (T092-T102)
   - Developer B: Polish and documentation (T103-T119)

---

## Notes

- [P] tasks = different files or independent work, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD approach)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- US4 + US1 form the MVP (validation + apply + summary)
- US2 adds undo/redo capabilities
- US3 polishes the programmatic API surface

---

## Summary

**Total Tasks**: 119
**Parallelizable Tasks**: 42 tasks marked [P]
**User Story Breakdown**:
- Setup: 5 tasks
- Foundational: 19 tasks (blocks all stories)
- US4 (Validation): 23 tasks
- US1 (Apply + Summary): 21 tasks
- US2 (Inverse + History): 23 tasks
- US3 (Programmatic API): 11 tasks
- Polish: 17 tasks

**MVP Scope**: Foundational + US4 + US1 = 48 tasks (40% of total)
**Performance Targets**: Validate <10ms, Apply <100ms for typical patches
**Test Coverage**: Comprehensive unit, integration, golden fixtures, performance benchmarks
