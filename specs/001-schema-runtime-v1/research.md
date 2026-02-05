# Research: Project Schema v1 + Excalibur Runtime Compiler v1

**Feature**: 001-schema-runtime-v1  
**Date**: 2026-02-05  
**Status**: Complete

## Purpose

This document captures research findings and technical decisions for implementing the Project Schema v1 and Excalibur Runtime Compiler v1. All "NEEDS CLARIFICATION" items from the plan Technical Context have been resolved through research and documented below.

---

## Research Area 1: ExcaliburJS Pixel-Perfect Rendering

### Question
How to configure ExcaliburJS for crisp pixel art rendering without smoothing or antialiasing?

### Research Findings

ExcaliburJS provides several configuration options for pixel art games:

1. **Engine Options**:
   ```typescript
   const engine = new Engine({
     antialiasing: false,  // Disable antialiasing
     pixelRatio: 1,        // Force 1:1 pixel ratio (optional)
   });
   ```

2. **Sprite Options**:
   ```typescript
   const sprite = new Sprite({
     image: imageSource,
     filtering: ImageFiltering.Pixel  // Force nearest-neighbor filtering
   });
   ```

3. **Canvas Context Settings**:
   ExcaliburJS automatically sets `imageSmoothingEnabled = false` on the canvas context when `antialiasing: false` is set.

4. **CSS Considerations**:
   Ensure CSS doesn't introduce smoothing:
   ```css
   canvas {
     image-rendering: pixelated;
     image-rendering: crisp-edges;
   }
   ```

### Decision

**Chosen approach**: 
- Set `antialiasing: false` in Engine constructor
- Use `ImageFiltering.Pixel` for all sprite/image resources
- Add CSS `image-rendering: pixelated` to canvas element

**Rationale**: 
- This combination ensures pixel-crisp rendering at all stages (engine, sprite, browser)
- Aligns with Constitution Principle IV (Pixel Correctness)
- Matches FR-010 and SC-006 requirements

**Alternatives considered**:
- Manual canvas manipulation: More control but breaks Excalibur abstraction
- Post-processing shader: Overkill for simple pixel art; adds performance overhead

---

## Research Area 2: Tile Layer Storage Format

### Question
What data structure should represent tile layers in the schema? How to handle empty tiles?

### Research Findings

**Option A: Flat Array with Linear Indexing**
```typescript
tileLayers: {
  background: [0, 1, 2, 0, 5, 6, ...]  // length = width * height
}
// Index calculation: y * width + x
```
Pros: Compact, cache-friendly, matches Excalibur TileMap format
Cons: Less human-readable in raw JSON

**Option B: 2D Array**
```typescript
tileLayers: {
  background: [[0, 1, 2], [0, 5, 6], ...]  // array of rows
}
```
Pros: More intuitive for humans editing JSON
Cons: Extra array nesting, slower iteration, doesn't match Excalibur format

**Option C: Sparse Map (Object)**
```typescript
tileLayers: {
  background: { "0,0": 1, "0,1": 2, "1,0": 5 }  // only non-empty tiles
}
```
Pros: Minimal size for sparse maps
Cons: Slow lookups, complex indexing, doesn't match Excalibur

**Empty Tile Representation**:
- **0 as empty**: Standard convention (tile index 0 = no tile)
- **null/undefined**: Complicates flat array (requires sparse array handling)
- **-1 as empty**: Non-standard, confusing

### Decision

**Chosen approach**: Flat array with 0 as empty tile

**Rationale**:
- Matches Excalibur TileMap constructor expectations
- Compact and performant for iteration
- Standard game dev convention (tile 0 = empty/transparent)
- Easy validation: array length must equal width × height

**Alternatives considered**:
- 2D array: More readable but adds unnecessary complexity and conversion overhead
- Sparse map: Premature optimization; not needed for demo-scale maps (<100×100)

---

## Research Area 3: Collision Detection Approach

### Question
Should we use Excalibur's built-in collision groups or implement custom tile-based collision?

### Research Findings

**Option A: Excalibur Collision Groups**
- Use Excalibur's physics engine with CollisionGroups
- Mark each solid tile as a physics body with `type: CollisionType.Fixed`
- Player actor has `type: CollisionType.Active` and collides with Fixed bodies

Pros: Leverages Excalibur's physics, handles complex collision shapes
Cons: Overhead of 100+ physics bodies for a small map, overkill for grid-based movement

**Option B: Custom Tile-Based Collision**
- Store collision layer as flat array (0 = walkable, 1 = blocked)
- Before moving player, check collision array at target tile
- Prevent movement if target tile is blocked

Pros: Simple, performant, deterministic, matches grid-aligned gameplay
Cons: Requires custom collision logic, doesn't support sub-tile precision

**Option C: Hybrid Approach**
- Use collision array for tiles, Excalibur collision for entities/triggers
- Best of both worlds

Pros: Flexible for future entity-entity collision
Cons: More complex integration

### Decision

**Chosen approach**: Custom tile-based collision (Option B) for v1

**Rationale**:
- Grid-aligned RPG movement doesn't need sub-pixel physics
- Simpler to implement and debug
- Deterministic: same collision data always produces same results (Principle II)
- Avoids per-frame physics overhead (Principle V: Performance Guardrails)

**Future consideration**: If future specs add platforming or complex entity collision, revisit hybrid approach.

**Alternatives considered**:
- Excalibur physics: Over-engineered for grid-based tile collision in v1
- Hybrid: Deferred until entity-entity collision is needed (not in scope for v1)

---

## Research Area 4: Entity ID System

### Question
What ID format should be used for entities, maps, tilesets, etc.? UUID, incremental, or custom?

### Research Findings

**Option A: UUID v4**
```typescript
entityId: "550e8400-e29b-41d4-a716-446655440000"
```
Pros: Globally unique, collision-resistant
Cons: Not human-readable, verbose in JSON, no semantic meaning

**Option B: Incremental IDs**
```typescript
entityId: "1", "2", "3", ...
```
Pros: Simple, short
Cons: Fragile (renumbering breaks references), not collision-resistant in future multi-user editor

**Option C: Namespaced Strings**
```typescript
entityId: "npc:guard-01", "item:chest-treasureRoom", "map:dungeon-level1"
```
Pros: Human-readable, semantic, easy to debug, collision-resistant with good naming
Cons: Requires naming discipline, not guaranteed unique

### Decision

**Chosen approach**: Namespaced string IDs (Option C)

**Rationale**:
- Readability aids debugging and manual JSON editing in v1 (no editor yet)
- Semantic prefixes (e.g., `npc:`, `map:`, `tileset:`) improve clarity
- Future AI patch engine benefits from readable IDs (Principle VII preparation)
- Collision risk low with good naming conventions

**Naming convention**:
- Format: `<type>:<name>` where type = {map, tileset, npc, item, trigger, dialogue, quest}
- Name = kebab-case lowercase
- Examples: `tileset:dungeon-tiles`, `npc:merchant-bob`, `map:town-center`

**Alternatives considered**:
- UUID: Too verbose for v1 where manual editing is common
- Incremental: Too fragile; breaks under reordering or deletion

---

## Research Area 5: Validation Library Choice

### Question
Which validation library should be used for Project Schema v1: Zod, AJV, custom TypeScript?

### Research Findings

**Option A: Zod**
- TypeScript-first schema validation library
- Generates TypeScript types from schema definitions
- Runtime validation with detailed error messages
- Example:
  ```typescript
  const ProjectSchema = z.object({
    version: z.number().int().positive(),
    metadata: z.object({ name: z.string().min(1) }),
    tilesets: z.record(z.string(), TilesetSchema),
  });
  type Project = z.infer<typeof ProjectSchema>;
  ```

Pros: Type safety, excellent DX, composable schemas, clear errors
Cons: Adds runtime dependency (~12KB gzipped)

**Option B: AJV (Another JSON Validator)**
- JSON Schema standard validator
- Fast, widely used
- Generates JSON Schema files for documentation

Pros: Standard-compliant, very fast, language-agnostic schema
Cons: Separate type definitions, less idiomatic TypeScript

**Option C: Custom TypeScript Validation**
- Hand-written validation functions with type guards
- Example:
  ```typescript
  function isProject(obj: unknown): obj is Project {
    return typeof obj === 'object' && ...
  }
  ```

Pros: No dependencies, full control
Cons: Verbose, error-prone, no schema reuse

### Decision

**Chosen approach**: Zod (Option A)

**Rationale**:
- Single source of truth: Zod schema generates both runtime validator AND TypeScript types
- Excellent error messages align with FR-003 (clear, actionable errors)
- Composable schemas reduce duplication across Project, Map, Entity, etc.
- Strong TypeScript integration supports Principle VIII (Reviewability)

**Implementation**:
- Define schema in `packages/shared/src/schema/types.ts` using Zod
- Export both Zod schemas and inferred TypeScript types
- Validation function `validateProject()` returns structured errors

**Alternatives considered**:
- AJV: More verbose, requires maintaining separate TS types
- Custom: Too much boilerplate for complex nested schemas

---

## Research Area 6: Monorepo Tooling

### Question
What tooling should manage the monorepo: npm workspaces, pnpm, yarn workspaces, or turborepo?

### Research Findings

**Option A: npm Workspaces**
- Built into npm 7+
- Simple configuration in root `package.json`:
  ```json
  {
    "workspaces": ["packages/*", "examples/*"]
  }
  ```
- Hoists dependencies, links local packages

Pros: Zero extra tooling, standard npm
Cons: Slower than pnpm, no built-in task orchestration

**Option B: pnpm Workspaces**
- Fast package manager with workspaces support
- Efficient disk usage via content-addressable store

Pros: Faster installs, stricter dependency resolution
Cons: Requires installing pnpm, less familiar to some devs

**Option C: Turborepo**
- Monorepo task orchestrator built on top of npm/pnpm/yarn
- Intelligent caching and parallel task execution

Pros: Fast builds, great for large repos
Cons: Overkill for 3-package monorepo, adds complexity

### Decision

**Chosen approach**: npm Workspaces (Option A)

**Rationale**:
- Minimal overhead: no additional tools required
- Sufficient for 3-package monorepo (shared, runtime, editor placeholder)
- Standard npm is familiar to all Node.js developers (Principle VIII: Reviewability)
- Can migrate to pnpm or turborepo later if repo grows

**Configuration**:
```json
{
  "name": "ai-rpg-maker",
  "private": true,
  "workspaces": ["packages/*", "examples/*"]
}
```

**Alternatives considered**:
- pnpm: Better performance but requires extra tool installation
- turborepo: Premature optimization for 3-package repo

---

## Resolved Technical Context

All "NEEDS CLARIFICATION" items from plan.md Technical Context are now resolved:

| Item | Resolution |
|------|------------|
| Language/Version | TypeScript 5.3+, Node.js 20+ |
| Primary Dependencies | ExcaliburJS 0.29+, Zod 3.22+, Vite 5+ |
| Storage | File-based JSON + PNG assets |
| Testing | Vitest for unit tests |
| Target Platform | Modern browsers (Chrome, Firefox, Safari, Edge) |
| Performance Goals | 60 FPS, <3s load, <50ms input response |
| Constraints | Pixel-perfect, deterministic, client-only |
| Scale/Scope | Demo ~100×100 tiles, 10-20 entities |

---

## Open Questions / Future Research

*None remaining for v1. All decisions finalized.*

**Future specs may revisit**:
- Animation system (sprite sheets with frame data)
- Sound/music integration (Web Audio API)
- Advanced collision (sub-tile precision, entity-entity)
- Editor UI framework (React, Svelte, or vanilla)
- AI patch engine validation strategy

---

**Research Status**: ✅ Complete  
**All NEEDS CLARIFICATION items**: ✅ Resolved  
**Ready for**: Phase 1 Design (data-model.md, contracts/, quickstart.md)
