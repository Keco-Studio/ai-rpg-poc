# Implementation Plan: Project Schema v1 + Excalibur Runtime Compiler v1

**Branch**: `001-schema-runtime-v1` | **Date**: 2026-02-05 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/001-schema-runtime-v1/spec.md`

## Summary

Build the foundational schema and runtime for a browser-based 2D pixel RPG maker. The Project Schema v1 defines a deterministic, versioned model for RPG projects including tilesets, maps, entities, triggers, and dialogue. The Excalibur Runtime Compiler v1 loads and validates schema JSON, compiles it into ExcaliburJS scenes, and runs a minimal playable experience with tilemap rendering, collision detection, player movement, and basic interaction hooks.

**Technical Approach**: Monorepo with three packages - `shared/` (schema types + validation), `runtime/` (Excalibur compiler + game engine), and `editor/` (placeholder for future). Schema uses TypeScript interfaces with strong typing, JSON validation, and detailed error messages. Runtime compiles schema maps into Excalibur TileMaps and Actors with pixel-crisp rendering. Demo project demonstrates loading, rendering, collision, movement, and interaction.

## Technical Context

**Language/Version**: TypeScript 5.3+ (ES2022 target), Node.js 20+ for build tools  
**Primary Dependencies**: ExcaliburJS 0.29+, Zod 3.22+ (schema validation), Vite 5+ (build/dev server)  
**Storage**: File-based (JSON project files, PNG tileset images); no database required  
**Testing**: Vitest for unit tests (shared package validation), manual/smoke tests for runtime  
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge) with ES6+ and Canvas2D support  
**Project Type**: Web application (monorepo with shared library + runtime client)  
**Performance Goals**: 60 FPS gameplay, <3s project load time, <50ms input response  
**Constraints**: Pixel-perfect rendering (no smoothing), deterministic loading, client-side only (no server)  
**Scale/Scope**: Demo project ~100x100 tile map, 10-20 entities, 1-5 dialogue nodes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle Compliance Review

| Principle | Status | Compliance Notes |
|-----------|--------|------------------|
| **I. Model as Source of Truth** | ✅ PASS | Schema v1 is versioned and defines all gameplay data. Runtime has no hidden logic - everything expressible in schema. |
| **II. Determinism over Magic** | ✅ PASS | Schema → runtime compilation is deterministic. Same JSON always produces same world state. No random init or env-dependent behavior. |
| **III. Strict Validation** | ✅ PASS | Zod validator catches missing fields, invalid tile indices, bad references, out-of-bounds coords. Actionable error messages required (FR-003). |
| **IV. Pixel Correctness** | ✅ PASS | Excalibur engine configured with antialiasing: false, pixel-perfect rendering. FR-010 and SC-006 enforce crisp rendering. |
| **V. Performance Guardrails** | ✅ PASS | 60 FPS target, <3s load. Demo scoped to 100x100 tiles. TileMap rendering optimized via Excalibur. Collision pre-computed, not per-frame. |
| **VI. Transactional Editing** | ⏸️ DEFERRED | Editor not in scope for v1. Schema designed for atomic patches (future AI engine). |
| **VII. AI Changes via Patch Ops** | ⏸️ DEFERRED | Validation infrastructure exists. AI patch engine deferred to future spec. |
| **VIII. Reviewability** | ✅ PASS | Monorepo with clean package boundaries. TypeScript types, no `any` shortcuts (FR-type-safety). Small focused modules. |
| **IX. Testing** | ✅ PASS | Shared validator has unit tests for invalid states (FR-015-019). Runtime has smoke tests. Acceptance scenarios defined. |
| **X. Security and Privacy** | ✅ PASS | Local-only project loading. No external API calls. No telemetry. Demo assets included in repo. |

**Overall**: ✅ PASSED - All applicable principles satisfied. Deferred principles (VI, VII) explicitly out of scope and acknowledged.

## Project Structure

### Documentation (this feature)

```text
specs/001-schema-runtime-v1/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── schema-v1.json   # JSON Schema definition for Project Schema v1
└── spec.md              # Feature specification (input)
```

### Source Code (repository root)

```text
packages/
├── shared/
│   ├── src/
│   │   ├── schema/
│   │   │   ├── types.ts              # Project Schema v1 TypeScript interfaces
│   │   │   ├── validate.ts           # validateProject() with Zod
│   │   │   ├── errors.ts             # ValidationError types
│   │   │   └── index.ts              # Public API exports
│   │   └── utils/
│   │       └── index.ts              # Shared utilities
│   ├── tests/
│   │   └── schema/
│   │       ├── validate.test.ts      # Validation unit tests
│   │       └── fixtures/             # Test project JSONs (valid/invalid)
│   ├── package.json
│   └── tsconfig.json
│
├── runtime/
│   ├── src/
│   │   ├── game/
│   │   │   ├── createEngine.ts       # Excalibur engine setup (pixel-crisp config)
│   │   │   └── index.ts
│   │   ├── loader/
│   │   │   ├── loadAssets.ts         # Tileset image loading + sprite generation
│   │   │   └── index.ts
│   │   ├── compiler/
│   │   │   ├── compileMapScene.ts    # Schema map → Excalibur Scene
│   │   │   ├── compileTileMap.ts     # Tile layers → TileMap
│   │   │   ├── compileCollision.ts   # Collision layer → solid tiles
│   │   │   ├── compileEntities.ts    # Entity instances → Actors
│   │   │   ├── compileTriggers.ts    # Trigger regions → event handlers
│   │   │   └── index.ts
│   │   ├── ui/
│   │   │   ├── debugOverlay.ts       # Minimal interaction feedback UI
│   │   │   └── index.ts
│   │   ├── index.ts                  # Main entry point
│   │   └── types.ts                  # Runtime-specific types
│   ├── tests/
│   │   └── smoke.test.ts             # Basic runtime smoke tests
│   ├── public/
│   │   └── index.html                # HTML entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── editor/
│   ├── README.md                     # Placeholder: "Editor UI coming in future spec"
│   └── package.json
│
└── examples/
    └── demo-project/
        ├── project.json              # Valid Project Schema v1 demo
        ├── assets/
        │   └── tilesets/
        │       └── dungeon-tileset.png  # 16x16 pixel tileset (or download link)
        └── README.md                 # How to load demo in runtime
```

**Structure Decision**: Monorepo with packages managed via npm workspaces (or pnpm/yarn). `shared/` is a pure library package with no runtime dependencies. `runtime/` depends on `shared/` and ExcaliburJS. `editor/` is a placeholder package for future specs. `examples/` contains demo content outside packages for easy testing.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*No violations requiring justification. All principles pass or are explicitly deferred per constitution guidance.*

## Milestones

### M1: Schema Types + Validator + Demo Project Passes Validation
- **Goal**: Define Project Schema v1, implement Zod validator, create demo project JSON
- **Deliverables**: `packages/shared/src/schema/*`, `examples/demo-project/project.json`
- **Validation**: Demo project validates without errors; invalid test projects produce actionable errors
- **Duration**: Foundation phase

### M2: Runtime Renders Demo Tilemap
- **Goal**: Excalibur engine loads demo project and renders at least one tile layer
- **Deliverables**: `packages/runtime/src/game/createEngine.ts`, `src/loader/loadAssets.ts`, `src/compiler/compileTileMap.ts`
- **Validation**: Opening runtime in browser displays tilemap with pixel-crisp rendering
- **Duration**: Core rendering phase

### M3: Collision Working
- **Goal**: Player actor spawns and respects collision boundaries from collision layer
- **Deliverables**: `packages/runtime/src/compiler/compileCollision.ts`, player movement logic
- **Validation**: Player cannot walk through blocked tiles; walkable tiles allow movement
- **Duration**: Physics integration phase

### M4: Interaction Feedback Working
- **Goal**: At least one NPC or trigger region fires event and displays visible feedback
- **Deliverables**: `packages/runtime/src/compiler/compileTriggers.ts`, `src/ui/debugOverlay.ts`
- **Validation**: Pressing interact key near NPC or entering trigger shows UI message
- **Duration**: Interaction system phase

### M5: Documentation
- **Goal**: Docs explain how to run demo and describe schema structure
- **Deliverables**: `examples/demo-project/README.md`, `packages/shared/README.md`, `quickstart.md`
- **Validation**: Developer can follow quickstart and create minimal valid project in <20 min
- **Duration**: Polish phase

## Phase 0: Research & Decisions

*See [research.md](./research.md) for detailed findings.*

### Key Research Areas

1. **Excalibur pixel-perfect rendering**: How to configure ExcaliburJS for crisp pixel art (antialiasing, image smoothing settings)
2. **Tile layer storage format**: Flat array indexing vs 2D array; empty tile representation (0 vs null)
3. **Collision detection approach**: Excalibur built-in collision groups vs custom tile-based collision
4. **Entity ID system**: UUID vs incremental IDs vs namespaced strings
5. **Validation library choice**: Zod vs AJV vs custom TypeScript validation
6. **Monorepo tooling**: npm workspaces vs pnpm vs turborepo

### Research Outcomes

- **Pixel rendering**: Use `antialiasing: false` in Excalibur engine options + `pixelArt: true` on sprites
- **Tile layers**: Flat array `[tileId, tileId, ...]` indexed by `y * width + x`; tile index 0 = empty
- **Collision**: Custom tile-based collision using collision layer array (0 = walkable, 1 = blocked)
- **Entity IDs**: String-based namespaced IDs like `"npc:guard-01"` for readability and future AI patching
- **Validation**: Zod for runtime validation + TypeScript type generation
- **Monorepo**: npm workspaces (minimal overhead, built into npm 7+)

## Phase 1: Design & Contracts

*See [data-model.md](./data-model.md) for complete entity definitions.*  
*See [contracts/schema-v1.json](./contracts/schema-v1.json) for JSON Schema.*  
*See [quickstart.md](./quickstart.md) for setup and usage guide.*

### Core Data Model Summary

**Project Schema v1** root structure:

```typescript
interface Project {
  version: number;                    // Schema version (starts at 1)
  metadata: ProjectMetadata;          // Name, author, description
  tilesets: Record<string, Tileset>;  // ID → Tileset definition
  maps: Record<string, GameMap>;      // ID → Map definition
  entityDefs: Record<string, EntityDef>;  // ID → Entity template
  dialogues: Record<string, DialogueGraph>;  // ID → Dialogue tree
  quests?: Record<string, Quest>;     // ID → Quest (placeholder for v1)
}
```

**Tileset**: Image reference + tile dimensions + metadata  
**GameMap**: Width/height + tile layers + collision layer + entity instances + triggers  
**EntityDef**: Type + sprite + interaction behavior  
**DialogueGraph**: Nodes with text + choices  
**TriggerRegion**: Rectangle + event ops (onEnter/onInteract)

### API Contracts

No REST/GraphQL APIs in this spec (runtime is client-only). Contract is the **Project Schema v1 JSON format**.

**Contract file**: `contracts/schema-v1.json` - JSON Schema defining validation rules for project files.

### Validation Rules

- All ID references must exist in their respective collections
- Tile indices must be within tileset bounds (0 to tileCount)
- Map tile layers must have length = mapWidth × mapHeight
- Entity spawn coordinates must be within map bounds
- Collision layer must match map dimensions
- Dialogue node references must exist in same dialogue graph

## Next Steps

1. **Phase 2 - Task Breakdown**: Run `/speckit.tasks` to generate detailed implementation tasks from this plan
2. **Implementation**: Execute tasks in milestone order (M1 → M2 → M3 → M4 → M5)
3. **Validation**: Test against acceptance criteria in spec.md after each milestone

---

**Plan Status**: ✅ Complete - Ready for task breakdown  
**Constitution Compliance**: ✅ All applicable principles satisfied  
**Blockers**: None - All research decisions resolved
