# Research: AI Patch Engine v1

**Feature**: AI Patch Engine v1 (Validated Project Mutations + Diff + Undo/Redo)  
**Branch**: `002-ai-patch-engine`  
**Date**: 2026-02-05

## Purpose

Document key technical decisions, design patterns, and implementation strategies for the patch engine that enables safe, validated, atomic project modifications with full undo/redo support.

## Key Architectural Decisions

### 1. Pure Functional Pipeline Architecture

**Decision**: Implement the patch engine as a pure functional pipeline with three stages: Parse → Validate → Apply.

**Rationale**:
- **Determinism**: Pure functions with no side effects guarantee the same input always produces the same output, critical for reliable undo/redo
- **Testability**: Pure functions are trivially testable without mocks or setup
- **Composability**: Each stage can be tested and reasoned about independently
- **Thread-safety**: No shared state means no concurrency issues (future-proofing)
- **Cacheable**: Results can be memoized or cached safely

**Alternatives Considered**:
- **Stateful mutation engine**: Rejected because it complicates undo/redo, introduces potential race conditions, and makes determinism harder to guarantee
- **Event sourcing with persistent store**: Overkill for v1; adds IO complexity; deferred to future if needed

**Implementation Notes**:
- No global state, no IO operations, no external dependencies (except schema validator)
- All functions return new objects; never mutate input `Project`
- Validation is a separate pure function that can be called without applying changes

---

### 2. Two-Phase Validation Strategy

**Decision**: Validation occurs in two phases:
- **Phase A (Structural)**: Validate operation shape, types, and primitive constraints (e.g., numbers are positive)
- **Phase B (Semantic)**: Validate bounds, references, and invariants using a "working view" that accounts for prior ops in the patch

**Rationale**:
- **Early failure**: Catch malformed ops immediately without expensive semantic checks
- **Intra-patch references**: Allows a patch to create an entity and then place it in the same patch by validating ops in sequence
- **Performance**: Structural validation is cheap (type checks); semantic validation only runs if structure passes
- **Clear error messages**: Separating phases allows specific error codes for "malformed op" vs "invalid reference"

**Alternatives Considered**:
- **Single-pass validation**: Rejected because it can't handle intra-patch references (creating then using an entity in same patch)
- **Deferred validation during apply**: Rejected because it violates atomicity (we'd need to roll back partially applied ops)

**Implementation Notes**:
- Phase A: JSON schema validation or TypeScript type guards per `PatchOp` discriminant
- Phase B: Build a "working state view" that incrementally tracks created IDs, modified maps, etc. as each op is validated
- If any op fails either phase, reject entire patch with error pointing to specific op index

---

### 3. Immutable Apply with Structural Sharing

**Decision**: `applyPatch` returns a new `Project` object without mutating the input, using structural sharing to minimize copying.

**Rationale**:
- **Undo/redo**: Immutability makes it trivial to keep before/after snapshots without deep cloning everything
- **Correctness**: No risk of partially applied state if validation fails after some ops are applied
- **Determinism**: Pure function guarantees same input → same output
- **Performance**: Structural sharing means only modified parts are copied (e.g., only the edited map/layer, not the entire project)

**Alternatives Considered**:
- **In-place mutation with manual snapshot**: Rejected because it's error-prone, requires explicit deep cloning, and complicates error recovery
- **Full deep clone per op**: Rejected because it's too slow for large projects

**Implementation Notes**:
- Use spread operators and object destructuring for shallow copies: `{ ...project, maps: { ...project.maps, [mapId]: updatedMap } }`
- For arrays (tile data, collision), use `.slice()` to copy only modified regions
- For very large tile/collision arrays, consider copy-on-write optimization (defer copying until first edit)

---

### 4. Inverse Patch Generation Strategy

**Decision**: Generate inverse patches during apply using operation-specific reversal logic:
- **Create ops** → Delete ops (storing full created object for restore)
- **Delete ops** → Create ops (storing full deleted object for restore)
- **Update ops** → Update ops with previous values
- **Tile/collision edits** → Restore ops with previous cell values

**Rationale**:
- **Completeness**: Capturing before-state during apply ensures we have all data needed for perfect undo
- **Determinism**: Inverse generated from actual applied changes, not from operation intent
- **Atomicity**: If apply succeeds, inverse is guaranteed to be valid and reversible

**Alternatives Considered**:
- **Compute inverse from patch definition alone**: Rejected because it requires re-reading project state, and can't handle conditional logic or side effects
- **Store full before/after snapshots**: Rejected because it's memory-intensive (though may be acceptable for small projects)

**Implementation Notes**:
- For each op during apply, collect "undo data" (previous values, deleted objects, etc.)
- After all ops apply successfully, construct inverse patch from collected undo data
- Validate inverse patch against post-apply project state to ensure it's valid (belt-and-suspenders)

---

### 5. Rectangular Edit Inversion Strategy

**Decision**: For `PaintRectOp` and `SetCollisionRectOp`, use a threshold-based strategy:
- **Small rects** (area ≤ 4096 cells): Store per-cell previous values as `SetTilesOp` / `SetCollisionCellsOp`
- **Large rects** (area > 4096 cells): Store per-cell previous values (warn in docs that large rects are memory-intensive; encourage splitting)

**Rationale**:
- **Simplicity for v1**: Avoid premature optimization with RLE or compression. Per-cell storage is straightforward and correct.
- **Performance**: 4096-cell threshold (64x64 rect) is a reasonable balance. Most AI-generated rects will be smaller (e.g., painting a room, not an entire map).
- **Correctness**: Storing exact per-cell values guarantees perfect undo, no approximation

**Alternatives Considered**:
- **Run-Length Encoding (RLE)**: Deferred to v2. Adds complexity, debugging difficulty, and marginal benefit for typical use cases.
- **Always use SetTilesOp for inverse regardless of size**: Accepted for v1. If memory becomes an issue in practice, revisit with profiling data.

**Implementation Notes**:
- During rect apply, iterate cells and capture `{ x, y, tileId }` before overwriting
- Return inverse as `SetTilesOp` with captured cells
- Document in `PATCH_FORMAT.md` that large rect edits may produce large inverse patches

---

### 6. Error Model Design

**Decision**: Use structured error objects with typed error codes:

```typescript
type PatchErrorCode =
  | "UNKNOWN_OP" | "MISSING_REF" | "DUPLICATE_ID" | "OUT_OF_BOUNDS"
  | "INVALID_TILE_ID" | "INVALID_LAYER" | "INVALID_MAP" | "SCHEMA_MISMATCH";

interface PatchError {
  code: PatchErrorCode;
  message: string;
  opIndex?: number;
  path?: string;       // e.g. "ops[3].mapId"
  detail?: any;
}
```

**Rationale**:
- **Actionable errors**: Error code + path tells AI or developer exactly what's wrong and where
- **Programmatic handling**: Clients can switch on error codes rather than parsing strings
- **Localization-ready**: Error codes can be mapped to user-friendly messages in different languages
- **Debugging**: `opIndex` and `path` pinpoint the problematic operation and field

**Alternatives Considered**:
- **String error messages only**: Rejected because they're hard to parse programmatically and don't support structured error recovery
- **Throwing exceptions**: Rejected because it complicates control flow; prefer returning `Result<T, E>` pattern

**Implementation Notes**:
- Validation returns `{ ok: false, errors: PatchError[] }` or `{ ok: true }`
- Helper functions for common errors: `errOutOfBounds(opIndex, x, y, mapWidth, mapHeight)`
- Include suggestions in `detail` field where possible (e.g., "Referenced entityId 'npc_5' not found. Available entities: npc_1, npc_2, npc_3")

---

### 7. Validation Performance Strategy

**Decision**: Use ID lookup maps/dictionaries during validation to avoid O(n²) scans.

**Rationale**:
- **Performance**: Looking up whether an entity/map/tileset exists should be O(1), not O(n)
- **Scalability**: Projects may have 100+ entities, 50+ dialogues, 20+ maps. Linear scans per op would be slow.

**Implementation Notes**:
- Build lookup maps once before validation: `{ entityIds: Set<string>, mapIds: Set<string>, ... }`
- For "working view" during Phase B, incrementally update lookup sets as ops are validated (e.g., add created entity IDs to the set)
- Reuse existing schema validator's ID extraction if available

---

### 8. Patch Format Versioning

**Decision**: Use explicit `patchVersion` field (currently `1`) and `baseSchemaVersion` field (currently `1`).

**Rationale**:
- **Forward compatibility**: If patch format changes, validator can handle multiple versions or reject unsupported versions
- **Schema alignment**: Ensures patch targets the correct project schema version (prevent applying v2 patches to v1 projects)
- **Clear errors**: Mismatch produces actionable error rather than silent corruption

**Implementation Notes**:
- Validate `patchVersion === 1` and `baseSchemaVersion === project.version` before processing ops
- If versions don't match, return `SCHEMA_MISMATCH` error with details
- Future: Support patch format migrations if patch v2 is needed

---

### 9. History Stack Design

**Decision**: Implement a simple `HistoryStack` class that stores `{ patch, inverse, summary }` entries with `undo()` / `redo()` methods.

**Rationale**:
- **Encapsulation**: History management logic is isolated from patch engine core
- **Convenience**: Provides simple API for editor to track history without reimplementing undo/redo
- **Extensibility**: Can add features like history branching, compaction, or persistence later

**Alternatives Considered**:
- **No history utility, leave it to consumers**: Rejected because every consumer would reimplement the same logic
- **Event sourcing store**: Overkill for v1; deferred to future if needed

**Implementation Notes**:
- Maintain two stacks: `undoStack: HistoryEntry[]` and `redoStack: HistoryEntry[]`
- `applyAndPush(project, patch)` applies patch, pushes `{ patch, inverse, summary }` to undo stack, clears redo stack
- `undo()` pops from undo stack, applies inverse patch, pushes to redo stack
- `redo()` pops from redo stack, applies original patch, pushes to undo stack
- **Max history size**: Consider configurable limit (e.g., 100 entries) to prevent unbounded memory growth

---

## Testing Strategy

### Unit Tests
- **Per-operation validation**: Test each `PatchOp` type with valid and invalid inputs
- **Per-operation application**: Test each `PatchOp` type applies correctly and generates correct inverse
- **Error cases**: Test all error codes are triggered by appropriate invalid inputs

### Integration Tests
- **Apply + Inverse = Identity**: Apply patch, apply inverse, assert deep equality with original project
- **Undo/Redo**: Apply patch, undo, assert original, redo, assert patched
- **Atomicity**: Patch with 5 valid ops + 1 invalid op → no changes applied
- **Intra-patch references**: Create entity then place it in same patch → succeeds

### Golden Fixtures
- Commit example patches under `packages/shared/tests/patch/fixtures/patches/`
- Include both valid and invalid patches for regression testing
- Document expected behavior in fixture filenames or accompanying README

### Performance Tests
- Benchmark large patches (1000 tile edits, 50,000 tile edits) to verify performance goals
- Use `console.time()` or profiling tools to measure validation/apply time

---

## Documentation Strategy

### PATCH_FORMAT.md
- Describe `PatchV1` structure in detail
- Document all `PatchOp` types with examples
- Explain validation rules and error codes
- Provide example JSON patches

### PATCHING_GUIDE.md
- How to construct patches programmatically
- How to validate and apply patches
- Best practices for AI patch generation (prefer rect ops, avoid huge cell lists, allocate unique IDs)
- Troubleshooting common validation errors

### API Documentation
- JSDoc comments on all public functions
- TypeScript types serve as living documentation

---

## Open Questions Resolved

### Q: How to handle partial entity updates (e.g., UpdateTriggerOp with only some fields)?
**A**: Use TypeScript's `Partial<>` for update op payloads. Apply only provided fields. Inverse stores only changed fields' previous values.

### Q: What if inverse patch itself fails validation?
**A**: This indicates a bug in inverse generation logic. Add integration test to catch this. If it happens at runtime, log error and disable undo for that operation (fail-safe).

### Q: How to handle deletion orphans (e.g., delete entity def that has instances on maps)?
**A**: Two options:
1. **Validation fails**: Reject delete if instances exist (user must delete instances first)
2. **Cascade delete**: Automatically delete all instances (risky, prefer explicit)

**Decision for v1**: Validation fails with clear error listing affected instances. User must explicitly delete instances first. This prevents accidental data loss.

### Q: Empty patches with zero operations?
**A**: Validation succeeds (no ops to validate), apply is a no-op returning same project and empty summary. Inverse is also an empty patch. This simplifies edge case handling.

---

## Technology Choices

### TypeScript Discriminated Unions
**Rationale**: Perfect fit for `PatchOp` union type. Exhaustiveness checking ensures all ops are handled. Type narrowing via `op: "createMap"` discriminant is safe and ergonomic.

### Vitest for Testing
**Rationale**: Already used in `packages/shared`. Fast, modern, great TypeScript support, snapshot testing for golden fixtures.

### No External Libraries
**Rationale**: Patch engine should have minimal dependencies. Use standard library for all logic. JSON schema validation can use a small library like `ajv` if needed, but prefer runtime type guards.

---

## Milestones

### M1: Patch Types + Error Model (2-3 days)
- Define all `PatchOp` interfaces
- Implement `PatchError` types and helper functions
- Create test fixtures (example projects and patches)

### M2: Validator Implementation (3-5 days)
- Implement Phase A (structural) validation
- Implement Phase B (semantic) validation with working state view
- Unit tests for all validation rules
- Integration tests for intra-patch references

### M3: Applier Implementation (5-7 days)
- Implement apply logic for all op types
- Implement inverse patch generation
- Unit tests for all op types
- Integration tests for apply + inverse = identity

### M4: History Manager (2-3 days)
- Implement `HistoryStack` class
- Tests for undo/redo with multiple patches
- Test edge cases (undo empty stack, redo after new patch)

### M5: Documentation + Polish (2-3 days)
- Write `PATCH_FORMAT.md` and `PATCHING_GUIDE.md`
- Add JSDoc comments to all public APIs
- Performance benchmarks and optimization if needed
- Final integration tests and golden fixtures

**Total Estimated Effort**: 14-21 days

---

## Summary

The patch engine is designed as a pure, deterministic pipeline with two-phase validation, immutable operations, and automatic inverse generation. This architecture ensures correctness, testability, and performance while aligning with all constitution principles. The implementation is straightforward with no exotic dependencies or algorithms, making it reviewable and maintainable.
