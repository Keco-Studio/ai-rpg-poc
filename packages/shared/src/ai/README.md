# AI Orchestration Module

Provides AI-assisted game project editing through natural language. All AI changes flow through the PatchV1 system (Spec 002) for atomicity, validation, and undo/redo capabilities.

## Architecture

```
packages/shared/src/ai/
├── types.ts            # All type definitions and configuration defaults
├── provider.ts         # AIProvider interface + MockProvider for testing
├── projectSummary.ts   # Token-efficient project representation for AI context
├── promptTemplates.ts  # System/user prompt construction
├── parse.ts            # Strict JSON extraction from AI responses
├── orchestrator.ts     # Main propose-validate-repair flow
├── guardrails.ts       # Safety checks (size limits, destructive ops)
├── conflict.ts         # Undo conflict detection (hunk-based)
└── index.ts            # Public API exports
```

## Data Flow

```
User Prompt
    ↓
buildProjectSummary() → Token-efficient project context
    ↓
buildSystemPrompt() + buildUserPrompt() → AI provider input
    ↓
AIProvider.proposePatch() → Raw AI response
    ↓
parseAIResponse() → PatchV1 JSON extraction
    ↓
checkGuardrails() → Safety threshold checks
    ↓
validatePatch() → Semantic validation (Spec 002)
    ↓
ProposedPatchResult → UI for review
    ↓
applyPatch() → Atomic application (Spec 002)
```

## Key Concepts

### ProjectSummary
Token-efficient representation of project state. Excludes full tile/collision arrays. All IDs sorted for deterministic output. Includes constraints, tileset metadata, map dimensions, entity defs, and trigger summaries.

### Repair Loop
When AI returns invalid patches, the orchestrator sends structured error feedback and retries (default: 2 attempts). Parse errors get format repair requests. Validation errors include operation-level specifics.

### Guardrails
Pre-validation safety checks prevent accidentally large or destructive changes:
- **maxOps**: Maximum operations per patch (default: 40)
- **maxTileEdits**: Maximum tile modifications (default: 20,000)
- **maxCollisionEdits**: Maximum collision edits (default: 20,000)
- **allowDestructive**: Whether delete operations are allowed (default: false)
- Keyword heuristics detect explicit destructive intent from user prompts

### Conflict Detection
When undoing AI patches, the system checks if data regions were manually edited since the patch was applied. Uses hunk-based snapshot comparison. Three resolution options: Cancel (safe), Partial undo (skip conflicting), Force undo (may lose edits).

## Usage

```typescript
import { proposePatchWithRepair, MockProvider } from '@ai-rpg-maker/shared';

// With any AIProvider implementation
const result = await proposePatchWithRepair(
  project,
  'Create a small town with 3 NPCs',
  myProvider,
  { maxRepairAttempts: 2 }
);

if (result.status === 'success') {
  // Show result.summary to user, then apply
  const applied = applyPatch(project, result.patch);
}
```

## Testing

All modules have unit tests in `packages/shared/tests/ai/`. Use `MockProvider` for deterministic testing - configure response sequences to test success, failure, and repair scenarios.

```bash
npm test --workspace=packages/shared
```
