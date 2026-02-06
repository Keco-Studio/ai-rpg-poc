# Phase 0: Research & Technology Decisions

**Feature**: AI Orchestration v1  
**Date**: 2026-02-05  
**Purpose**: Resolve technical unknowns and document design decisions

---

## Research Questions

### Q1: How should the AI Provider abstraction be structured?

**Decision**: Async interface with single `proposePatch` method returning structured result

**Rationale**:
- Keeps orchestrator simple and testable
- Allows easy mocking for unit tests
- Supports future provider implementations (OpenAI, Anthropic, local models)
- Async by default handles network latency gracefully
- Result type encapsulates both success (PatchV1 JSON) and failure (parse/network errors)

**Interface Design**:
```typescript
interface AIProvider {
  proposePatch(input: AIInput): Promise<AIRawResponse>;
}

interface AIInput {
  systemPrompt: string;
  userPrompt: string;
  projectSummary: ProjectSummary;
  repairContext?: RepairContext; // For repair loop iterations
}

interface AIRawResponse {
  success: boolean;
  rawText?: string;          // Full AI response
  parsedPatch?: PatchV1;     // Extracted patch if parseable
  error?: string;            // Error if request failed
}
```

**Alternatives Considered**:
- **Stream-based interface**: Rejected - unnecessary complexity for v1; patch generation is atomic
- **Multi-method interface (propose, repair, explain)**: Rejected - increases coupling; repair is just another propose with different context
- **Callback-based**: Rejected - async/await is modern standard and easier to test

---

### Q2: How should ProjectSummary balance completeness vs token efficiency?

**Decision**: Three-tier summarization strategy

**Tier 1 - Index Summary (Always Included)**:
- Schema version
- Tileset catalog: `{ id, tileCount, imagePath }`
- Map catalog: `{ id, width, height, tilesetId, layerIds }`
- Entity definitions catalog: `{ typeId, count }`
- Dialogue IDs (list only)
- Quest IDs (list only)
- Constraints: `{ maxOps, maxTileEdits, maxCollisionEdits }`

**Tier 2 - Goal-Directed Details (Filtered by User Prompt)**:
- If prompt mentions specific map: include layer IDs, available tile ranges, nearby entity references
- If prompt mentions entities: include entity template structure, existing instance IDs
- If prompt mentions quests/dialogue: include relevant IDs and dependencies
- Token budget: ~500-1000 tokens for details

**Tier 3 - Retrieval Fallback (Future Enhancement)**:
- AI can request additional context via special operation
- Orchestrator responds with specific chunk (e.g., collision bounds for map X)
- Enables handling very large projects
- v1: Stub implementation that returns "not supported"

**Rationale**:
- Index summary ensures AI always has project structure (critical for valid patch generation)
- Goal-directed filtering reduces tokens for large projects while maintaining relevance
- Retrieval fallback provides growth path without redesign
- Deterministic ordering (sorted IDs) ensures stable token usage for same project

**Alternatives Considered**:
- **Fixed truncation at N tokens**: Rejected - may cut off critical context unpredictably
- **Full project dump**: Rejected - exceeds token limits for projects with >5 maps
- **User-controlled detail level**: Rejected - too complex for v1; auto-detection sufficient

---

### Q3: How should the repair loop provide feedback to the AI?

**Decision**: Structured error objects with operation-level specificity

**Error Format**:
```typescript
interface PatchError {
  operationIndex: number;
  operationType: string;      // e.g., "upsertMap", "upsertTiles"
  errorType: string;          // e.g., "OUT_OF_BOUNDS", "MISSING_REF"
  message: string;            // Human-readable description
  context: {                  // Operation-specific context
    [key: string]: any;       // e.g., { tileId: 999, maxTileId: 500 }
  };
}
```

**Repair Request Format**:
```typescript
interface RepairContext {
  attemptNumber: number;
  maxAttempts: number;
  previousPatch: PatchV1;
  errors: PatchError[];
  instruction: string;        // e.g., "The previous patch had validation errors. Please correct..."
}
```

**Rationale**:
- Operation-level errors enable surgical fixes (AI doesn't need to regenerate entire patch)
- Context fields provide specific values (out-of-bounds tileId, missing entity ref, etc.)
- Structured format is parseable by AI models trained on JSON
- Attempt tracking prevents infinite loops

**Alternatives Considered**:
- **Plain text error descriptions**: Rejected - harder for AI to parse and extract actionable data
- **Diff-based feedback**: Rejected - AI models work better with explicit error lists
- **Single retry without context**: Rejected - low success rate; AI repeats same mistakes

---

### Q4: How should guardrails detect destructive operations?

**Decision**: Operation type analysis + keyword heuristics

**Destructive Operation Detection**:
1. **Operation Type**: Check for `delete*` operations (e.g., `deleteMap`, `deleteEntity`)
2. **Large Scope**: Check for operations that affect >50% of existing items
3. **Keyword Heuristics** (in user prompt):
   - Destructive keywords: "delete", "remove", "clear", "wipe"
   - Safe keywords: "add", "create", "new", "update"
4. **Configuration Flag**: `allowDestructive` option (default: false)

**Guardrail Checks** (pre-validation):
```typescript
interface GuardrailResult {
  allowed: boolean;
  warnings: string[];
  requiresConfirmation: boolean;
  reason?: string;
}

function checkGuardrails(
  patch: PatchV1,
  config: GuardrailConfig,
  userPrompt: string
): GuardrailResult;
```

**Thresholds** (defaults):
- `maxOps`: 40 operations per patch
- `maxTileEdits`: 20,000 tile modifications
- `maxCollisionEdits`: 20,000 collision cell modifications
- `allowDestructive`: false (requires explicit user intent or confirmation)

**Rationale**:
- Prevents accidental large-scale destruction
- Keyword heuristics catch user intent ("delete X" is deliberate)
- Thresholds prevent token-bomb patches that overwhelm validation/apply
- Configuration allows power users to override safely

**Alternatives Considered**:
- **No guardrails, rely on user review**: Rejected - users may not notice large scope in summary
- **Always prompt for confirmation**: Rejected - friction for routine operations
- **ML-based intent classification**: Rejected - overkill for v1; keywords sufficient

---

### Q5: How should undo conflict detection work?

**Decision**: Hunk-based snapshot comparison with three-option resolution

**Conflict Detection Strategy**:
1. **On Apply**: Store base snapshots for each modified "hunk"
   - Hunk = minimal unit of change (tile cells, collision cells, entity instance, trigger)
   - Snapshot = JSON serialization of hunk after patch applied
2. **On Undo Request**: Compare current state vs stored snapshot for each hunk
   - Match → No conflict, undo proceeds
   - Mismatch → Conflict detected
3. **Conflict Resolution Options**:
   - **Cancel Undo** (default): Safe, no data loss
   - **Undo Non-Conflicting Only**: Partial undo, skip conflicting hunks
   - **Force Undo**: Last-write-wins, may lose manual edits

**Hunk Definition Examples**:
```typescript
interface Hunk {
  type: 'tiles' | 'collision' | 'entity' | 'trigger';
  ref: string;                // e.g., "map:town01:layer:ground"
  postPatchSnapshot: string;  // JSON serialization
}
```

**Rationale**:
- Hunk granularity prevents false positives (e.g., editing map A doesn't conflict with undo for map B)
- JSON comparison is simple and reliable
- Three-option UI gives users control and transparency
- Cancel default prevents accidental data loss

**Alternatives Considered**:
- **Block all undo if any manual edit**: Rejected - too restrictive; users lose flexibility
- **Always force undo**: Rejected - silent data loss violates constitution principle
- **Diff-based three-way merge**: Rejected - complex to implement correctly; overkill for v1

---

### Q6: How should prompt templates enforce PatchV1-only output?

**Decision**: Explicit system prompt with format specification and examples

**System Prompt Structure**:
```
You are a game project assistant that outputs ONLY valid PatchV1 JSON.

**Critical Rules**:
1. Return ONLY JSON - no explanations, no commentary, no markdown
2. Use PatchV1 format version 1.0.0
3. All operations must reference existing assets in the project summary
4. Do not invent new tilesets, entity types, or assets

**PatchV1 Format**:
{
  "formatVersion": "1.0.0",
  "timestamp": "<ISO-8601>",
  "description": "<what this patch does>",
  "operations": [
    { "type": "upsertMap", ... },
    { "type": "upsertTiles", ... }
  ]
}

**Example Operation Types**:
- upsertMap: Create or update map
- upsertTiles: Set tile IDs in layer
- upsertEntity: Create or update entity instance
- upsertQuest: Create or update quest
- upsertDialogue: Create or update dialogue

**Project Constraints**:
- Max operations: {maxOps}
- Max tile edits: {maxTileEdits}
- Avoid destructive operations (delete) unless explicitly requested
```

**User Prompt Structure**:
```
Project Summary:
{projectSummary JSON}

User Request: {userGoal}

Generate a PatchV1 JSON patch to fulfill this request.
```

**Repair Prompt Additions** (when errors occur):
```
Previous Attempt Failed:
Attempt: {attemptNumber}/{maxAttempts}
Errors:
{errors JSON}

Please correct the patch to address these specific errors.
Return ONLY the corrected PatchV1 JSON.
```

**Rationale**:
- Explicit "ONLY JSON" instruction reduces commentary
- Format specification with examples guides AI output
- Constraint reminders prevent oversized patches
- Repair context provides actionable feedback
- Structured format works well with modern LLMs (GPT-4, Claude, Gemini)

**Alternatives Considered**:
- **Few-shot examples in prompt**: Rejected - consumes too many tokens; system prompt sufficient
- **Separate repair prompt template**: Rejected - increases maintenance; conditional additions cleaner
- **Schema validation in prompt**: Rejected - LLMs don't reliably follow JSON schema; post-parse validation required

---

## Technology Stack Confirmation

### Language & Runtime
- **TypeScript 5.x**: Matches existing codebase, provides type safety for complex orchestration logic
- **Node/Browser compatible**: Pure TypeScript with no Node-specific APIs in shared/ai

### Testing
- **Vitest**: Matches existing test setup in packages/shared
- **Mock Provider Pattern**: Deterministic testing without real AI calls
- **Test Coverage Targets**: >80% for orchestrator, parse, guardrails; 100% for critical validation paths

### Dependencies
- **Zero new external dependencies**: Feature uses only TypeScript stdlib and existing project code
- **Internal dependencies**: 
  - `@project/schema` (Spec 001)
  - `@project/patch` (Spec 002)

### Performance Profiling
- **Summary generation**: Measure on 10/50/100 map projects, optimize if >500ms
- **Validation overhead**: Measure patch validation at 1/10/40 ops, ensure <100ms
- **Memory profiling**: Track snapshot storage size, ensure <10MB for typical usage

---

## Best Practices Applied

### Error Handling
- All async operations wrapped in try/catch
- Structured error types (ParseError, ValidationError, ProviderError)
- User-friendly error messages (avoid technical jargon)

### Testability
- Pure functions for summary, parse, guardrails
- Mock provider with configurable response sequences
- Deterministic test fixtures (sorted IDs, fixed timestamps)

### Type Safety
- Strict TypeScript mode enabled
- Discriminated unions for result types
- Zod or similar for runtime validation of AI responses (future enhancement)

### Documentation
- JSDoc comments for all public APIs
- README in packages/shared/src/ai with architecture overview
- Integration guide in quickstart.md

---

## Open Questions (For Future Versions)

1. **Token usage tracking**: Should we expose token counts to users? (Useful for cost estimation)
2. **Retrieval mode implementation**: Full design deferred to v2; v1 stubs the interface
3. **Multi-turn conversations**: How to support "modify the town to have 10 villagers instead"? (Requires conversation history)
4. **Custom AI prompt templates**: Should users be able to customize system prompts? (Power user feature, v2+)

---

## References

- [Spec 001: Project Schema v1](../../001-project-schema/spec.md)
- [Spec 002: PatchV1 Engine](../../002-ai-patch-engine/spec.md)
- [Constitution: AI Changes via Patch Ops Only](../../.specify/memory/constitution.md#vii-ai-changes-via-patch-ops-only)
