# Implementation Plan: AI Patch Engine v1

**Branch**: `002-ai-patch-engine` | **Date**: 2026-02-05 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-ai-patch-engine/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a deterministic patch pipeline in `packages/shared` that enables validated, atomic project modifications with full undo/redo support. The patch engine provides a safe mutation layer between AI agents (or any client) and project data, ensuring all changes are validated against schema constraints, referential integrity, and bounds before application. All operations in a patch apply atomically or not at all, with automatic inverse patch generation for complete undo capabilities.

## Technical Context

**Language/Version**: TypeScript (ES2020+), Node 18+  
**Primary Dependencies**: Existing `packages/shared/src/schema` validator (Spec 001)  
**Storage**: N/A (pure in-memory operations, no IO)  
**Testing**: Vitest (existing test framework in shared package)  
**Target Platform**: Browser + Node.js (dual target for editor and tooling)  
**Project Type**: Shared library package (monorepo workspace package)  
**Performance Goals**: 
  - Patch validation: <10ms for typical patches (5-20 operations)
  - Patch application: <100ms for 100x100 tile maps with 5 entities
  - Large patches: <500ms for 50,000 tile edits via rect operations
**Constraints**: 
  - Pure functions only (no side effects, no global state, no IO)
  - Immutable operations (return new objects, never mutate input project)
  - Deterministic (same input always produces same output)
  - Memory-bounded (must not require full project duplication per operation)
**Scale/Scope**: 
  - Support patches with 1-1000 operations
  - Maps up to 1000x1000 tiles
  - Projects with 100+ entities, 50+ dialogues, 20+ quests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ I. Model as Source of Truth
**Status**: PASS  
**Rationale**: Patch engine enforces schema v1 invariants and ensures all changes are expressible in the model. No hidden logic.

### ✅ II. Determinism over Magic
**Status**: PASS  
**Rationale**: Pure functions with no global state. Same patch + same project = same result every time. Explicitly tested.

### ✅ III. Strict Validation
**Status**: PASS  
**Rationale**: Core requirement. Two-phase validation (structural + semantic) catches all constraint violations before any mutation. Structured error codes with actionable messages.

### ✅ IV. Pixel Correctness
**Status**: N/A  
**Rationale**: Patch engine doesn't render; it manipulates data. Runtime (Spec 001) handles rendering.

### ✅ V. Performance Guardrails
**Status**: PASS  
**Rationale**: Explicit performance targets in Success Criteria. Encourages rect ops over huge cell lists. Validation/apply are linear in op count + edited cell count.

### ✅ VI. Transactional Editing
**Status**: PASS  
**Rationale**: Core requirement. All ops in a patch apply atomically or not at all. Automatic inverse patch generation enables full undo.

### ✅ VII. AI Changes via Patch Ops Only
**Status**: PASS  
**Rationale**: This IS the patch engine. Defines the structured operation format for AI changes with validation before apply.

### ✅ VIII. Reviewability
**Status**: PASS  
**Rationale**: Small composable modules (types, validate, apply, summary, history). Typed APIs. PatchSummary provides human-readable change reports.

### ✅ IX. Testing
**Status**: PASS  
**Rationale**: Comprehensive test plan: unit tests per op type, integration tests for undo/redo, golden fixtures for patch examples.

### ✅ X. Security and Privacy
**Status**: PASS  
**Rationale**: Pure library with no IO. Doesn't send data anywhere. AI integration happens in Spec 003 with explicit logging.

**Overall Gate Status**: ✅ PASS - No violations. All principles align with feature design.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
packages/shared/
├── src/
│   ├── schema/                    # Existing (Spec 001)
│   │   ├── types.ts
│   │   ├── validate.ts
│   │   └── index.ts
│   ├── patch/                     # NEW - Core patch engine
│   │   ├── types.ts              # PatchV1, PatchOp unions, PatchSummary
│   │   ├── errors.ts             # PatchError, error code enums, helpers
│   │   ├── validate.ts           # validatePatch(project, patch)
│   │   ├── apply.ts              # applyPatch(project, patch)
│   │   ├── summary.ts            # summarizePatch(before, after, deltas?)
│   │   ├── id.ts                 # Optional ID utilities
│   │   └── index.ts              # Public API exports
│   ├── history/                   # NEW - Undo/redo management
│   │   ├── history.ts            # HistoryStack class
│   │   └── index.ts
│   └── index.ts                   # Re-export all public APIs
├── tests/
│   ├── schema/                    # Existing
│   ├── patch/                     # NEW - Patch engine tests
│   │   ├── fixtures/
│   │   │   ├── patches/
│   │   │   │   ├── valid-create-map.json
│   │   │   │   ├── valid-paint-tiles.json
│   │   │   │   ├── valid-place-entities.json
│   │   │   │   ├── invalid-out-of-bounds.json
│   │   │   │   ├── invalid-missing-ref.json
│   │   │   │   └── invalid-duplicate-id.json
│   │   │   └── projects/
│   │   │       └── base-project.json
│   │   ├── validate.test.ts      # Per-op validation tests
│   │   ├── apply.test.ts         # Per-op application tests
│   │   ├── integration.test.ts   # Undo/redo, atomicity tests
│   │   └── summary.test.ts       # Summary generation tests
│   └── history/                   # NEW - History stack tests
│       └── history.test.ts
└── package.json
```

**Structure Decision**: Monorepo workspace package structure. This feature extends `packages/shared` with two new modules: `patch/` (core engine) and `history/` (undo/redo utility). The patch engine depends on existing `schema/` validator from Spec 001. Pure library with no UI or runtime dependencies.

## Complexity Tracking

No violations recorded. All constitution principles align with feature design.

---

## Phase 0: Research ✅

**Status**: Complete  
**Output**: [research.md](research.md)

### Key Decisions Made

1. **Pure Functional Pipeline**: Parse → Validate → Apply architecture with no side effects
2. **Two-Phase Validation**: Structural validation followed by semantic validation with working state view
3. **Immutable Operations**: Structural sharing for performance, never mutate input project
4. **Inverse Patch Generation**: Capture before-state during apply for perfect undo
5. **Rectangular Edit Strategy**: Threshold-based approach (4096 cells) for rect inversions
6. **Structured Error Model**: Typed error codes with operation index and path details
7. **TypeScript Discriminated Unions**: Perfect fit for `PatchOp` union type
8. **History Stack**: Simple undo/redo utility with configurable max size

All technical unknowns from Technical Context have been resolved. See [research.md](research.md) for detailed rationale and alternatives considered.

---

## Phase 1: Design & Contracts ✅

**Status**: Complete  
**Outputs**: 
- [data-model.md](data-model.md) - Complete entity definitions and relationships
- [contracts/patch-v1.schema.json](contracts/patch-v1.schema.json) - JSON schema for patch format
- [quickstart.md](quickstart.md) - Developer guide with examples and patterns

### Data Model Entities

- **PatchV1**: Versioned patch document with metadata and ordered operations
- **PatchOp**: 17 operation types covering maps, tiles, collision, entities, triggers, dialogue, quests
- **PatchSummary**: Human-readable change report with created/modified/deleted resources
- **PatchError**: Structured validation errors with codes, paths, and details
- **ValidationResult**: Success/failure discriminated union
- **ApplyResult**: New project + summary + inverse patch
- **HistoryStack**: Undo/redo management with max size limits

### API Surface

```typescript
// Core functions
validatePatch(project: Project, patch: PatchV1): ValidationResult
applyPatch(project: Project, patch: PatchV1): ApplyResult

// Utilities
summarizePatch(before: Project, after: Project): PatchSummary

// History management
class HistoryStack {
  applyAndPush(project: Project, patch: PatchV1): ApplyResult
  undo(project: Project): ApplyResult | null
  redo(project: Project): ApplyResult | null
  canUndo(): boolean
  canRedo(): boolean
  clear(): void
}
```

### Agent Context Updated ✅

- Language: TypeScript (ES2020+), Node 18+
- Dependencies: Existing `packages/shared/src/schema` validator (Spec 001)
- Project type: Shared library package (monorepo workspace package)

---

## Post-Phase 1 Constitution Re-Check ✅

**Re-evaluation Date**: 2026-02-05

All constitution principles remain aligned after detailed design:

### ✅ I. Model as Source of Truth
**Status**: PASS  
**Confirmation**: Patch engine enforces all schema v1 constraints. Validation rules documented in data model ensure model remains source of truth.

### ✅ II. Determinism over Magic
**Status**: PASS  
**Confirmation**: Pure functions with explicit inputs/outputs. Research documents determinism as core design principle. Integration tests verify idempotency.

### ✅ III. Strict Validation
**Status**: PASS  
**Confirmation**: Two-phase validation with 8 error codes covering all failure modes. Data model specifies all invariants and validation rules per operation type.

### ✅ IV. Pixel Correctness
**Status**: N/A  
**Confirmation**: No rendering logic in patch engine.

### ✅ V. Performance Guardrails
**Status**: PASS  
**Confirmation**: Performance targets specified in Technical Context. Research documents optimization strategies (rect ops, lookup maps). Quickstart warns against anti-patterns.

### ✅ VI. Transactional Editing
**Status**: PASS  
**Confirmation**: Atomic apply confirmed in data model. All ops succeed or all fail. HistoryStack treats patches as single transactions.

### ✅ VII. AI Changes via Patch Ops Only
**Status**: PASS  
**Confirmation**: This IS the patch ops system. JSON schema contract enables strict AI tool calling. Quickstart includes AI integration example.

### ✅ VIII. Reviewability
**Status**: PASS  
**Confirmation**: Modular structure (types, errors, validate, apply, summary, history). Comprehensive documentation (research, data model, quickstart, contracts). Small focused modules.

### ✅ IX. Testing
**Status**: PASS  
**Confirmation**: Test structure defined in project layout. Research documents testing strategy (unit, integration, golden fixtures, performance benchmarks).

### ✅ X. Security and Privacy
**Status**: PASS  
**Confirmation**: Pure library, no IO, no external services. All operations are local transformations.

**Overall Status**: ✅ ALL GATES PASS - Ready for implementation (/speckit.tasks)

---

## Next Steps

### Phase 2: Implementation Planning

Run `/speckit.tasks` to break down the design into implementation tasks. This will:
- Create work breakdown by milestone (M1-M5 from research.md)
- Define task dependencies and ordering
- Generate issue tracking artifacts

### Milestones Overview

1. **M1**: Patch Types + Error Model (2-3 days)
2. **M2**: Validator Implementation (3-5 days)
3. **M3**: Applier Implementation (5-7 days)
4. **M4**: History Manager (2-3 days)
5. **M5**: Documentation + Polish (2-3 days)

**Total Estimated Effort**: 14-21 days

---

## References

- **Feature Spec**: [spec.md](spec.md)
- **Research**: [research.md](research.md)
- **Data Model**: [data-model.md](data-model.md)
- **API Contract**: [contracts/patch-v1.schema.json](contracts/patch-v1.schema.json)
- **Quick Start**: [quickstart.md](quickstart.md)
- **Constitution**: [/.specify/memory/constitution.md](../../.specify/memory/constitution.md)
