# Tasks: Project Schema v1 + Excalibur Runtime Compiler v1

**Input**: Design documents from `/specs/001-schema-runtime-v1/`  
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL for this feature. This task list includes validator unit tests per specification requirements (FR-015-019) but no integration tests. Runtime validation is manual per quickstart.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo structure**: `packages/shared/`, `packages/runtime/`, `packages/editor/`
- **Examples**: `examples/demo-project/`
- Root package.json for workspace management

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create root package.json with npm workspaces configuration pointing to packages/* and examples/*
- [X] T002 [P] Create packages/shared/package.json with TypeScript, Zod, and Vitest dependencies
- [X] T003 [P] Create packages/runtime/package.json with ExcaliburJS, Vite, and TypeScript dependencies
- [X] T004 [P] Create packages/editor/package.json as placeholder with README.md explaining future scope
- [X] T005 [P] Configure packages/shared/tsconfig.json with ES2022 target and strict mode enabled
- [X] T006 [P] Configure packages/runtime/tsconfig.json extending shared config and including DOM types
- [X] T007 [P] Configure packages/runtime/vite.config.ts for development server and production build
- [X] T008 Create examples/demo-project directory structure with assets/tilesets subdirectory
- [X] T009 Install all workspace dependencies with npm install at repository root

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T010 [P] Define Position interface in packages/shared/src/schema/types.ts
- [X] T011 [P] Define Rectangle interface in packages/shared/src/schema/types.ts
- [X] T012 [P] Define ProjectMetadata schema using Zod in packages/shared/src/schema/types.ts
- [X] T013 [P] Define GameConfig schema with startingMap, playerSpawn, tileSize, viewportSize using Zod in packages/shared/src/schema/types.ts
- [X] T014 [P] Define Tileset schema with id, name, imagePath, tile dimensions, tileCount, columns using Zod in packages/shared/src/schema/types.ts
- [X] T015 Define TileLayer schema with name, data array, zIndex, opacity, visible using Zod in packages/shared/src/schema/types.ts
- [X] T016 Define EntityDef schema with id, type enum, name, sprite, interaction using Zod in packages/shared/src/schema/types.ts
- [X] T017 Define EntityInstance schema with instanceId, entityDefId, position, overrides using Zod in packages/shared/src/schema/types.ts
- [X] T018 Define TriggerRegion schema with id, name, bounds, events, activation using Zod in packages/shared/src/schema/types.ts
- [X] T019 Define TriggerEvent union schema for showMessage, startDialogue, teleport, log using Zod in packages/shared/src/schema/types.ts
- [X] T020 Define DialogueNode and DialogueChoice schemas using Zod in packages/shared/src/schema/types.ts
- [X] T021 Define DialogueGraph schema with id, name, rootNodeId, nodes using Zod in packages/shared/src/schema/types.ts
- [X] T022 Define Quest and QuestStage schemas (placeholder) using Zod in packages/shared/src/schema/types.ts
- [X] T023 Define GameMap schema with id, name, dimensions, tilesetId, tileLayers, collisionLayer, entities, triggers using Zod in packages/shared/src/schema/types.ts
- [X] T024 Define root Project schema combining all sub-schemas with version, metadata, config, tilesets, maps, entityDefs, dialogues, quests using Zod in packages/shared/src/schema/types.ts
- [X] T025 Export TypeScript types inferred from Zod schemas using z.infer in packages/shared/src/schema/types.ts
- [X] T026 Define ValidationError and ValidationResult interfaces in packages/shared/src/schema/errors.ts
- [X] T027 Create public API exports in packages/shared/src/schema/index.ts for types, validation, and errors
- [X] T028 Implement validateProject function skeleton in packages/shared/src/schema/validate.ts that accepts Project and returns ValidationResult
- [X] T029 Add Zod parse error handling in validateProject that converts Zod errors to ValidationError format with code, message, path, suggestion in packages/shared/src/schema/validate.ts
- [X] T030 Add referential integrity validator for tilesetId references in maps in packages/shared/src/schema/validate.ts
- [X] T031 Add referential integrity validator for entityDefId references in entity instances in packages/shared/src/schema/validate.ts
- [X] T032 Add referential integrity validator for dialogueId references in entity interactions in packages/shared/src/schema/validate.ts
- [X] T033 Add array length validator for tile layer data arrays matching map width × height in packages/shared/src/schema/validate.ts
- [X] T034 Add array length validator for collision layer matching map width × height in packages/shared/src/schema/validate.ts
- [X] T035 Add bounds validator for tile indices not exceeding tileset tileCount in packages/shared/src/schema/validate.ts
- [X] T036 Add bounds validator for entity spawn positions within map dimensions in packages/shared/src/schema/validate.ts
- [X] T037 Add bounds validator for trigger region boundaries within map dimensions in packages/shared/src/schema/validate.ts
- [X] T038 Add bounds validator for playerSpawn position within starting map dimensions in packages/shared/src/schema/validate.ts
- [X] T039 Add validator for startingMap reference exists in maps collection in packages/shared/src/schema/validate.ts
- [X] T040 Add validator for dialogue rootNodeId exists in nodes collection in packages/shared/src/schema/validate.ts
- [X] T041 [P] Create test fixtures directory packages/shared/tests/schema/fixtures/
- [X] T042 [P] Create valid-minimal.json fixture with minimal valid project in packages/shared/tests/schema/fixtures/
- [X] T043 [P] Create invalid-missing-fields.json fixture in packages/shared/tests/schema/fixtures/
- [X] T044 [P] Create invalid-tile-index.json fixture with out-of-bounds tile index in packages/shared/tests/schema/fixtures/
- [X] T045 [P] Create invalid-reference.json fixture with non-existent entityDefId in packages/shared/tests/schema/fixtures/
- [X] T046 [P] Create invalid-array-length.json fixture with mismatched tile layer length in packages/shared/tests/schema/fixtures/
- [X] T047 Write unit test for valid project passes validation in packages/shared/tests/schema/validate.test.ts
- [X] T048 [P] Write unit test for missing required fields produces MISSING_FIELD error in packages/shared/tests/schema/validate.test.ts
- [X] T049 [P] Write unit test for out-of-bounds tile index produces TILE_INDEX_OUT_OF_BOUNDS error in packages/shared/tests/schema/validate.test.ts
- [X] T050 [P] Write unit test for invalid entityDefId reference produces INVALID_REFERENCE error in packages/shared/tests/schema/validate.test.ts
- [X] T051 [P] Write unit test for tile layer array length mismatch produces ARRAY_LENGTH_MISMATCH error in packages/shared/tests/schema/validate.test.ts
- [X] T052 [P] Write unit test for entity spawn position out of bounds produces POSITION_OUT_OF_BOUNDS error in packages/shared/tests/schema/validate.test.ts
- [X] T053 Run npm test in packages/shared to verify all validator tests pass
- [X] T054 Build packages/shared with npm run build to generate compiled output in dist/

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Load and Play Demo Project (Priority: P1) 🎯 MVP

**Goal**: Validate entire schema-to-runtime pipeline by loading demo project and rendering pixel-crisp tilemap

**Independent Test**: Load demo project JSON, click Play in browser, verify tilemap renders with crisp pixel graphics and no smoothing artifacts. Invalid projects display clear error messages and refuse to load.

### Implementation for User Story 1

- [X] T055 [P] [US1] Create 16x16 pixel tileset PNG with at least 16 tiles (4x4 grid) in examples/demo-project/assets/tilesets/dungeon-tileset.png
- [X] T056 [US1] Create demo project.json with version 1, metadata, config, one tileset definition, one 10x10 map with ground tile layer, collision layer, empty entities and triggers arrays in examples/demo-project/project.json
- [X] T057 [US1] Populate demo map tile layer with tile indices forming a simple room (walls at edges with tile index 1, floor in center with tile index 2) in examples/demo-project/project.json
- [X] T058 [US1] Populate demo map collision layer with 1s at edges (walls) and 0s in center (walkable floor) matching tile layout in examples/demo-project/project.json
- [X] T059 [US1] Set demo config.startingMap to map:start and config.playerSpawn to center of map at position 5,5 in examples/demo-project/project.json
- [X] T060 [US1] Validate demo project by running validateProject and confirm zero validation errors
- [X] T061 [P] [US1] Implement createEngine function with antialiasing false, pixelRatio 1 in packages/runtime/src/game/createEngine.ts
- [X] T062 [P] [US1] Export engine creation utilities from packages/runtime/src/game/index.ts
- [X] T063 [P] [US1] Create HTML entry point with canvas element and CSS image-rendering pixelated in packages/runtime/public/index.html
- [X] T064 [US1] Implement loadProject function that fetches project JSON from URL in packages/runtime/src/loader/loadAssets.ts
- [X] T065 [US1] Add validateProject call in loadProject and display error overlay on validation failure in packages/runtime/src/loader/loadAssets.ts
- [X] T066 [US1] Implement loadTilesetImage function that loads Image from imagePath and returns promise in packages/runtime/src/loader/loadAssets.ts
- [X] T067 [US1] Implement sliceTileset function that creates ImageSource array indexed by tileId from tileset image using tile dimensions and columns in packages/runtime/src/loader/loadAssets.ts
- [X] T068 [US1] Export loader functions from packages/runtime/src/loader/index.ts
- [X] T069 [US1] Implement compileTileMap function that creates Excalibur TileMap from TileLayer schema data in packages/runtime/src/compiler/compileTileMap.ts
- [X] T070 [US1] Add logic to compileTileMap to iterate tile layer data and assign sprite graphics to non-zero tile indices in packages/runtime/src/compiler/compileTileMap.ts
- [X] T071 [US1] Set TileMap renderFromTopOfGraphic to false for proper pixel alignment in packages/runtime/src/compiler/compileTileMap.ts
- [X] T072 [US1] Implement compileMapScene function that creates Excalibur Scene from GameMap schema in packages/runtime/src/compiler/compileMapScene.ts
- [X] T073 [US1] Add logic to compileMapScene to compile all tile layers sorted by zIndex and add to scene in packages/runtime/src/compiler/compileMapScene.ts
- [X] T074 [US1] Export compiler functions from packages/runtime/src/compiler/index.ts
- [X] T075 [US1] Implement main entry point in packages/runtime/src/index.ts that calls createEngine, loadProject, compileMapScene, and starts game
- [X] T076 [US1] Add error handling in main entry point to display user-friendly error messages on load failure in packages/runtime/src/index.ts
- [X] T077 [US1] Run npm run dev in packages/runtime and verify demo project loads and renders tilemap in browser at localhost
- [X] T078 [US1] Verify pixel-crisp rendering with no blur or smoothing artifacts by inspecting tilemap edges in browser DevTools
- [X] T079 [US1] Test invalid project loading by temporarily breaking demo project JSON and confirming clear error message displays

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Demo loads, renders, validates, and shows errors correctly.

---

## Phase 4: User Story 2 - Player Movement with Collision (Priority: P1)

**Goal**: Enable keyboard-controlled player movement with collision detection preventing movement through blocked tiles

**Independent Test**: Use arrow keys or WASD to move player. Attempt to walk into walls and verify player stops at collision boundaries. Confirm player moves freely in walkable areas.

### Implementation for User Story 2

- [X] T080 [US2] Update demo project.json to add player entity definition with type npc, sprite tile index 8, no interaction in examples/demo-project/project.json
- [X] T081 [US2] Add player entity instance to demo map with instanceId instance:player, position matching playerSpawn in examples/demo-project/project.json
- [X] T082 [US2] Implement compileCollision function that marks tiles as solid based on collision layer in packages/runtime/src/compiler/compileCollision.ts
- [X] T083 [US2] Add collision checking helper function that takes tile position and returns boolean from collision layer in packages/runtime/src/compiler/compileCollision.ts
- [X] T084 [US2] Export collision functions from packages/runtime/src/compiler/index.ts
- [X] T085 [US2] Implement compileEntities function that creates Excalibur Actor for each EntityInstance in packages/runtime/src/compiler/compileEntities.ts
- [X] T086 [US2] Add entity sprite loading logic that maps entityDef sprite.tileIndex to graphics in packages/runtime/src/compiler/compileEntities.ts
- [X] T087 [US2] Add player actor creation with keyboard input handlers for arrow keys and WASD in packages/runtime/src/compiler/compileEntities.ts
- [X] T088 [US2] Implement tile-based movement logic that calculates target position and checks collision before moving in packages/runtime/src/compiler/compileEntities.ts
- [X] T089 [US2] Add map boundary checking to prevent player from moving outside map dimensions in packages/runtime/src/compiler/compileEntities.ts
- [X] T090 [US2] Configure player actor with pos, graphics, and movement speed in packages/runtime/src/compiler/compileEntities.ts
- [X] T091 [US2] Export entity compilation functions from packages/runtime/src/compiler/index.ts
- [X] T092 [US2] Update compileMapScene to call compileCollision and compileEntities and add player to scene in packages/runtime/src/compiler/compileMapScene.ts
- [X] T093 [US2] Run npm run dev in packages/runtime and verify player spawns at correct position
- [X] T094 [US2] Test player movement with arrow keys in all four directions and confirm smooth movement
- [X] T095 [US2] Test player movement with WASD keys and confirm same behavior as arrow keys
- [X] T096 [US2] Test collision by attempting to move player into wall tiles and confirm movement is blocked
- [X] T097 [US2] Test map boundary collision by moving player to edges and confirm cannot move off map
- [X] T098 [US2] Test walkable tile movement by moving through center floor area and confirm no obstruction

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Player can move with collision working correctly.

---

## Phase 5: User Story 3 - Basic Interaction System (Priority: P2)

**Goal**: Implement interaction hook that triggers visible feedback when player interacts with NPC or enters trigger region

**Independent Test**: Walk player near NPC, press spacebar or E key, and verify dialogue box or debug overlay appears with message. Walk into trigger region and verify event fires with visible UI feedback.

### Implementation for User Story 3

- [X] T099 [US3] Update demo project.json to add greeting dialogue with one node and Guard NPC text in examples/demo-project/project.json
- [X] T100 [US3] Add NPC entity definition with type npc, sprite tile index 9, dialogue interaction referencing greeting dialogue in examples/demo-project/project.json
- [X] T101 [US3] Add NPC entity instance to demo map at position 3,3 with entityDefId npc:guard in examples/demo-project/project.json
- [X] T102 [US3] Add trigger region to demo map with id trigger:entrance, bounds covering tiles 7-8, 7-8, onEnter event showing message in examples/demo-project/project.json
- [X] T103 [P] [US3] Implement DebugOverlay class with show and hide methods in packages/runtime/src/ui/debugOverlay.ts
- [X] T104 [P] [US3] Add DebugOverlay render method that displays message text in overlay div positioned top-center in packages/runtime/src/ui/debugOverlay.ts
- [X] T105 [P] [US3] Add DebugOverlay styling for semi-transparent black background with white text and padding in packages/runtime/src/ui/debugOverlay.ts
- [X] T106 [P] [US3] Add auto-hide timer to DebugOverlay that clears message after 3 seconds in packages/runtime/src/ui/debugOverlay.ts
- [X] T107 [P] [US3] Export DebugOverlay from packages/runtime/src/ui/index.ts
- [X] T108 [US3] Implement compileTriggers function that creates trigger region handlers from TriggerRegion schema in packages/runtime/src/compiler/compileTriggers.ts
- [X] T109 [US3] Add trigger bounds checking logic that detects when player position overlaps trigger rectangle in packages/runtime/src/compiler/compileTriggers.ts
- [X] T110 [US3] Implement onEnter event handler that executes trigger events when player enters region in packages/runtime/src/compiler/compileTriggers.ts
- [X] T111 [US3] Implement TriggerEvent execution for showMessage type that calls DebugOverlay.show in packages/runtime/src/compiler/compileTriggers.ts
- [X] T112 [US3] Implement TriggerEvent execution for log type that calls console.log in packages/runtime/src/compiler/compileTriggers.ts
- [X] T113 [US3] Add trigger activation tracking to prevent firing same trigger multiple times if activation.once is true in packages/runtime/src/compiler/compileTriggers.ts
- [X] T114 [US3] Export trigger compilation functions from packages/runtime/src/compiler/index.ts
- [X] T115 [US3] Add interact key handler (spacebar and E key) to player actor in packages/runtime/src/compiler/compileEntities.ts
- [X] T116 [US3] Implement interaction range checking that finds entities within 1 tile of player position in packages/runtime/src/compiler/compileEntities.ts
- [X] T117 [US3] Add NPC interaction handler that loads dialogue when interact key pressed near NPC in packages/runtime/src/compiler/compileEntities.ts
- [X] T118 [US3] Implement dialogue display using DebugOverlay showing current node speaker and text in packages/runtime/src/compiler/compileEntities.ts
- [X] T119 [US3] Add dialogue progression that shows next node or ends dialogue when user presses key in packages/runtime/src/compiler/compileEntities.ts
- [X] T120 [US3] Update compileMapScene to call compileTriggers and register trigger update logic in scene.onPreUpdate in packages/runtime/src/compiler/compileMapScene.ts
- [X] T121 [US3] Run npm run dev in packages/runtime and verify NPC appears on map
- [X] T122 [US3] Test NPC interaction by walking adjacent to NPC and pressing spacebar and confirm dialogue appears
- [X] T123 [US3] Test NPC interaction by walking adjacent to NPC and pressing E key and confirm same dialogue appears
- [X] T124 [US3] Test trigger region by walking into trigger area and confirm message appears in overlay
- [X] T125 [US3] Test trigger activation.once by entering trigger multiple times and confirm only fires once if configured
- [X] T126 [US3] Test no interaction when player is not near any entity and presses interact key and confirm no error or UI change

**Checkpoint**: All user stories should now be independently functional. Player can load, move, and interact with NPCs and triggers.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final documentation

- [X] T127 [P] Create packages/shared/README.md documenting schema structure, validation usage, and type exports
- [X] T128 [P] Create packages/runtime/README.md with instructions to run dev server and build production bundle
- [X] T129 [P] Create examples/demo-project/README.md explaining demo project structure and how to modify it
- [X] T130 [P] Add inline code comments to packages/shared/src/schema/types.ts explaining each schema entity
- [X] T131 [P] Add inline code comments to packages/shared/src/schema/validate.ts explaining validation rules
- [X] T132 [P] Add JSDoc comments to public API functions in packages/shared/src/schema/index.ts
- [X] T133 [P] Add JSDoc comments to compiler functions in packages/runtime/src/compiler/index.ts
- [X] T134 Review quickstart.md and verify all steps match actual implementation
- [X] T135 Test production build with npm run build and npm run preview in packages/runtime
- [X] T136 Verify all acceptance criteria from spec.md are met by testing each scenario
- [X] T137 Run final validation on demo project and confirm zero errors
- [X] T138 Verify determinism by reloading demo project 10 times and confirming identical world state each time
- [X] T139 Performance check: Verify demo loads in under 3 seconds and maintains 60 FPS during gameplay
- [X] T140 Create root README.md with project overview, setup instructions, and links to packages

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on User Story 1 completion (needs rendering and demo project)
- **User Story 3 (Phase 5)**: Depends on User Story 2 completion (needs player movement)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies on other stories - can start after Foundational phase
- **User Story 2 (P1)**: Depends on User Story 1 (needs map rendering and player spawn)
- **User Story 3 (P2)**: Depends on User Story 2 (needs player actor and movement for interactions)

### Within Each User Story

- **User Story 1**: Demo project → validation → engine setup → asset loading → rendering (sequential)
- **User Story 2**: Player entity → collision system → movement handlers (sequential)
- **User Story 3**: Dialogue/trigger data → UI overlay → interaction handlers (sequential within each)

### Parallel Opportunities

- **Setup phase**: T002-T008 can all run in parallel (different package.json files)
- **Foundational phase**: T010-T014 (interface definitions) can run in parallel
- **User Story 1**: T061-T062 (engine) parallel with T055-T056 (demo assets)
- **User Story 3**: T103-T107 (UI overlay) parallel with T099-T102 (demo data updates)
- **Polish phase**: T127-T133 (documentation tasks) can all run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch in parallel (different files, no dependencies):
Task T055: Create tileset PNG asset
Task T061: Implement createEngine with pixel-crisp config
Task T063: Create HTML entry point

# Then sequentially:
Task T056-T060: Create and validate demo project JSON
Task T064-T068: Implement loader functions  
Task T069-T074: Implement compiler functions
Task T075-T079: Integrate and test
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T009)
2. Complete Phase 2: Foundational (T010-T054) - CRITICAL blocking phase
3. Complete Phase 3: User Story 1 (T055-T079)
4. **STOP and VALIDATE**: Test User Story 1 independently
   - Load demo project in browser
   - Verify tilemap renders with pixel-crisp graphics
   - Test invalid project displays clear error
5. Deploy/demo if ready - this is a functional MVP showing schema validation and rendering

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (T001-T054)
2. Add User Story 1 → Test independently → Deploy/Demo (MVP! T055-T079)
3. Add User Story 2 → Test independently → Deploy/Demo (T080-T098)
4. Add User Story 3 → Test independently → Deploy/Demo (T099-T126)
5. Polish → Final release (T127-T140)
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T054)
2. Once Foundational is done:
   - Developer A: User Story 1 (T055-T079)
   - Wait for US1 completion before starting US2/US3 due to dependencies
3. After User Story 1 complete:
   - Developer B: User Story 2 (T080-T098)
4. After User Story 2 complete:
   - Developer C: User Story 3 (T099-T126)
5. All developers: Polish tasks in parallel (T127-T140)

**Note**: Unlike typical specs, these user stories have sequential dependencies. Each story builds on the previous. Parallel work is possible within phases but not across user story phases.

---

## Notes

- [P] tasks = different files, no dependencies - can run in parallel
- [Story] label maps task to specific user story for traceability
- User Story 1 is the MVP - delivers core schema validation and rendering
- User Story 2 adds gameplay mechanics (movement/collision)
- User Story 3 adds interactivity (NPCs/triggers)
- Each user story should be independently testable per acceptance scenarios in spec.md
- Foundational phase (T010-T054) is critical - no user story work can begin until complete
- Validator unit tests (T047-T053) align with constitution principle IX (Testing)
- Stop at any checkpoint to validate story independently before proceeding
- Total estimated tasks: 140 (Setup: 9, Foundational: 45, US1: 25, US2: 19, US3: 28, Polish: 14)

---

## Task Summary

**Total Tasks**: 140

**Task Count by Phase**:
- Phase 1 (Setup): 9 tasks
- Phase 2 (Foundational): 45 tasks (includes schema definition, validation, and tests)
- Phase 3 (User Story 1 - P1): 25 tasks
- Phase 4 (User Story 2 - P1): 19 tasks
- Phase 5 (User Story 3 - P2): 28 tasks
- Phase 6 (Polish): 14 tasks

**Parallel Opportunities**: 52 tasks marked with [P] can run in parallel

**Independent Test Criteria**:
- **US1**: Load demo → verify tilemap renders pixel-crisp → test invalid project shows error
- **US2**: Move player with keyboard → verify collision blocks walls → verify free movement in walkable area
- **US3**: Interact with NPC → verify dialogue appears → enter trigger → verify message shows

**Suggested MVP Scope**: Phase 1 + Phase 2 + Phase 3 (User Story 1) = 79 tasks → Functional schema validation and rendering demo

**Format Validation**: ✅ All 140 tasks follow required checklist format with checkbox, task ID, optional [P] marker, [Story] label where required, and file paths in descriptions
