# Implementation Plan: AI Orchestration v1

**Branch**: `003-ai-orchestration` | **Date**: 2026-02-05 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/003-ai-orchestration/spec.md`

## Summary

Build an AI orchestration layer that enables natural language patch proposals for game projects. The system summarizes project context, invokes AI providers through an abstraction interface, validates and repairs proposed PatchV1 operations, enforces safety guardrails, and provides UI integration for proposal review and application. All changes flow through the existing PatchV1 system (Spec 002) to maintain atomicity, validation, and undo/redo capabilities.

## Technical Context

**Language/Version**: TypeScript 5.x (matches existing packages/shared and packages/editor)  
**Primary Dependencies**: 
- Existing: PatchV1 validation/apply (Spec 002), Project schema (Spec 001)
- New: None (pure TypeScript, AI provider interface only)  
**Storage**: In-memory project state with patch history (existing system)  
**Testing**: Vitest (matches packages/shared test setup)  
**Target Platform**: Browser (editor integration)  
**Project Type**: Monorepo packages (shared/ai for logic, editor/ai for UI)  
**Performance Goals**: 
- ProjectSummary generation: <500ms for projects with 10 maps + 100 entities
- Validation + guardrail checks: <100ms
- Full propose cycle (excluding AI provider latency): <1s  
**Constraints**: 
- Zero dependencies beyond TypeScript and existing project code
- No DOM/browser APIs in shared/ai (pure logic)
- No Excalibur runtime dependencies in shared/ai
- Summary must fit within typical LLM context windows (4k-32k tokens)  
**Scale/Scope**: 
- Support projects up to 50 maps, 500 entities, 100 quests
- Patches up to 40 operations (default guardrail)
- Repair loop max 2 attempts (configurable)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ Principle I: Model as Source of Truth
**Status**: PASS  
**Verification**: AI orchestration operates purely on the existing Project schema. No new runtime state or hidden logic. All AI changes expressed as PatchV1 operations against the model.

### ✅ Principle II: Determinism over Magic
**Status**: PASS  
**Verification**: ProjectSummary generation is deterministic (sorted IDs, stable ordering). AI provider responses may vary, but validation ensures only valid patches apply, maintaining deterministic project state.

### ✅ Principle III: Strict Validation
**Status**: PASS  
**Verification**: All AI-proposed patches run through validatePatch from Spec 002. Repair loop sends structured errors back to AI. Invalid patches never reach apply stage.

### ✅ Principle IV: Pixel Correctness
**Status**: N/A  
**Verification**: This feature does not affect rendering. Patches may modify tile placements, but rendering follows existing runtime rules.

### ✅ Principle V: Performance Guardrails
**Status**: PASS  
**Verification**: Summary generation excludes full tile arrays and collision data. Guardrails prevent patches with excessive tile edits (>20k default). Performance goals defined in Technical Context.

### ✅ Principle VI: Transactional Editing
**Status**: PASS  
**Verification**: Patches apply atomically via existing applyPatch. AI-generated patches pushed to history as single entries. Full undo/redo support via inverse patches. Conflict detection for undo after manual edits (FR-027 to FR-029).

### ✅ Principle VII: AI Changes via Patch Ops Only
**Status**: PASS  
**Verification**: Core principle of this feature. AI outputs PatchV1 JSON only. Strict parsing enforces format. Non-JSON content triggers repair. All changes validated before apply.

### ✅ Principle VIII: Reviewability
**Status**: PASS  
**Verification**: Feature split into small modules (summary, parse, provider, orchestrator). Each has clear responsibility. Patch summary provides human-readable preview before apply.

### ✅ Principle IX: Testing
**Status**: PASS  
**Verification**: Unit tests planned for summary determinism, parse validation, repair loop logic, guardrail enforcement, and conflict detection. Mock provider enables deterministic testing.

### ✅ Principle X: Security and Privacy
**Status**: PASS  
**Verification**: ProjectSummary excludes full content (only IDs and metadata). Provider interface abstraction allows local/self-hosted models. No automatic external transmission. User initiates all AI requests.

**Overall Gate Status**: ✅ **PASS** - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/003-ai-orchestration/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── ai-provider.ts   # AIProvider interface contract
│   ├── orchestrator.ts  # Orchestrator API contract
│   └── types.ts         # Shared type definitions
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
packages/shared/src/ai/
├── projectSummary.ts    # buildProjectSummary(project, limits): ProjectSummary
├── promptTemplates.ts   # buildSystemPrompt(), buildUserPrompt()
├── provider.ts          # AIProvider interface, MockProvider
├── orchestrator.ts      # proposePatchWithRepair() main flow
├── parse.ts             # parseAIResponse() - strict JSON extraction
├── guardrails.ts        # checkGuardrails() - size/destructive checks
├── conflict.ts          # detectConflicts() - undo conflict detection
├── types.ts             # ProjectSummary, AIInput, ProposedPatchResult, etc.
└── index.ts             # Public API exports

packages/shared/tests/ai/
├── projectSummary.test.ts
├── parse.test.ts
├── orchestrator.test.ts
├── guardrails.test.ts
└── conflict.test.ts

packages/editor/src/ai/
├── AiPanel.tsx          # Main UI component
├── AiPanelState.ts      # React state management
├── ConflictDialog.tsx   # Undo conflict resolution UI
└── index.ts             # Public exports

packages/editor/src/state/
└── aiState.ts           # Editor-level AI state (if needed)
```

**Structure Decision**: Monorepo package structure with clean separation:
- `shared/ai/` contains all pure logic (no UI, no DOM, no Excalibur)
- `editor/ai/` contains UI components and editor integration
- Follows existing patterns from Spec 001 (schema) and Spec 002 (patch)

## Complexity Tracking

*No constitution violations requiring justification.*

---

## Phase 0: Research & Decisions

See [research.md](./research.md) for detailed research findings and technology decisions.

### Key Decisions

1. **AI Provider Abstraction Pattern**: Interface-based abstraction with async proposePatch method. Enables mock testing and future provider swapping without orchestrator changes.

2. **ProjectSummary Strategy**: Three-tier approach:
   - **Index Summary**: Always included (schema version, asset IDs, constraints)
   - **Goal-Directed Details**: Filtered based on user prompt (specific map/entity details)
   - **Retrieval Fallback**: On-demand context fetch for large projects (future enhancement)

3. **Repair Loop Strategy**: Structured error feedback with operation-level specificity. Max 2 repair attempts prevents infinite loops. Errors include context for AI correction.

4. **Guardrail Implementation**: Pre-validation checks before apply stage. Count-based thresholds (ops, tile edits) plus semantic checks (deletion detection via operation types).

5. **Conflict Detection**: Hunk-based tracking using JSON serialization of modified data. Compare post-patch snapshot vs current state on undo request. Three-option resolution UI.

---

## Phase 1: Design & Contracts

### Data Model

See [data-model.md](./data-model.md) for complete entity definitions and relationships.

**Core Entities** (15 total):
- `ProjectSummary` - Token-efficient project representation
- `AIInput` / `AIRawResponse` - Provider communication
- `ProposedPatchResult` - Orchestrator output
- `GuardrailConfig` / `GuardrailResult` - Safety checks
- `RepairContext` / `PatchError` - Repair loop
- `ConflictHunk` / `ConflictDetectionResult` - Undo conflicts
- Supporting: `TilesetSummary`, `MapSummary`, `EntityDefSummary`, etc.

### API Contracts

See [contracts/](./contracts/) directory for TypeScript interface definitions:

**contracts/types.ts** (6.5 KB):
- Complete type definitions for all entities
- Discriminated unions for result types
- Serializable types for storage/transmission

**contracts/ai-provider.ts** (5.2 KB):
- `AIProvider` interface specification
- `MockProvider` implementation for testing
- Provider error types and helpers
- Factory function patterns

**contracts/orchestrator.ts** (8.0 KB):
- Public API function signatures
- `proposePatchWithRepair()` - Main entry point
- `applyProposedPatch()` - Apply integration
- `checkUndoConflicts()` / `undoAIPatch()` - Undo flow
- Utility functions with JSDoc
- Configuration defaults

### Quick Start

See [quickstart.md](./quickstart.md) for integration guide and usage examples.

**Includes**:
- Basic usage examples (propose/apply/undo)
- Complete OpenAI provider implementation
- Complete Anthropic provider implementation
- MockProvider testing examples
- React UI integration example
- Configuration best practices
- Troubleshooting guide

---

## Constitution Re-Check (Post-Design)

### ✅ All Principles Maintained

**Phase 1 design artifacts reviewed**:
- Data model aligns with existing Project schema (Principle I)
- Contracts specify deterministic behavior (Principle II)
- Validation paths documented (Principle III)
- Module boundaries enforce reviewability (Principle VIII)
- Test strategy covers core paths (Principle IX)

**Overall Status**: ✅ **PASS** - Design complies with all constitution principles

---

## Milestones

### M1: ProjectSummary + Provider Interface + Parse
**Goal**: Foundation layer with deterministic summary generation and strict parsing  
**Deliverables**:
- `projectSummary.ts` with deterministic ordering
- `promptTemplates.ts` with PatchV1-only contract
- `provider.ts` interface + MockProvider
- `parse.ts` with JSON-only extraction
- Unit tests for summary stability and parse validation

### M2: Orchestrator Core Flow (No Repair)
**Goal**: Basic propose flow without repair loop  
**Deliverables**:
- `orchestrator.ts` with proposePatchWithRepair (repair loop stubbed)
- Integration with Spec 002 validatePatch
- Basic error handling and result types
- Unit tests with MockProvider

### M3: Guardrails + Repair Loop
**Goal**: Safety checks and intelligent error recovery  
**Deliverables**:
- `guardrails.ts` with size and destructive operation checks
- Repair loop implementation with structured error feedback
- Max attempts enforcement
- Unit tests for guardrail blocking and repair success/failure

### M4: Editor UI Integration
**Goal**: Complete user-facing experience  
**Deliverables**:
- `AiPanel.tsx` with prompt input and action buttons
- Patch summary preview display
- Apply/Reject/Regenerate actions
- Integration with Spec 002 history (applyAndPush, undo/redo)
- Loading states and error display

### M5: Conflict Detection + Advanced Features
**Goal**: Undo conflict handling and goal-directed summarization  
**Deliverables**:
- `conflict.ts` with hunk-based conflict detection
- `ConflictDialog.tsx` with three-option resolution UI
- Goal-directed summarization in ProjectSummary
- Token usage tracking (foundation for retrieval mode)
- Integration tests and documentation

---

## Next Steps

This plan is complete. Run `/speckit.tasks` to break down milestones into actionable implementation tasks.
