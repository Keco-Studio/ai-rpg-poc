# Phase 1: Data Model

**Feature**: AI Orchestration v1  
**Date**: 2026-02-05  
**Purpose**: Define core entities, their relationships, and validation rules

---

## Entity Definitions

### ProjectSummary

**Purpose**: Token-efficient representation of project state for AI context

**Fields**:
- `schemaVersion`: string - Project schema version (e.g., "1.0.0")
- `constraints`: GuardrailConfig - Safety thresholds and limits
- `tilesets`: TilesetSummary[] - Available tilesets with tile counts
- `maps`: MapSummary[] - Map metadata without full tile data
- `entityDefs`: EntityDefSummary[] - Entity type definitions and counts
- `dialogueIds`: string[] - Available dialogue IDs (sorted)
- `questIds`: string[] - Available quest IDs (sorted)
- `triggers`: TriggerSummary[] - Trigger definitions
- `tokenEstimate`: number - Estimated token count of this summary

**Validation Rules**:
- All ID arrays MUST be sorted alphabetically (deterministic ordering)
- `tokenEstimate` MUST be recalculated on generation
- Arrays MUST NOT contain duplicates
- References between entities (map → tileset) MUST be valid

**Relationships**:
- Maps reference Tilesets (via tilesetId)
- Maps contain Layers (referenced by layerIds)
- Entity instances reference EntityDefs (via typeId)

**State Transitions**: Immutable - regenerated for each AI request

---

### TilesetSummary

**Purpose**: Describe available tileset for AI to reference in patches

**Fields**:
- `id`: string - Unique tileset identifier
- `tileCount`: number - Total tiles available (for bounds checking)
- `imagePath`: string - Path to tileset image (informational)
- `tileWidth`: number - Individual tile width in pixels
- `tileHeight`: number - Individual tile height in pixels

**Validation Rules**:
- `tileCount` MUST be > 0
- `tileWidth` and `tileHeight` MUST be > 0

---

### MapSummary

**Purpose**: Map metadata without full tile arrays (token efficiency)

**Fields**:
- `id`: string - Unique map identifier
- `width`: number - Map width in tiles
- `height`: number - Map height in tiles
- `tilesetId`: string - Reference to tileset
- `layerIds`: string[] - Ordered list of layer IDs (sorted by z-index)
- `entityCount`: number - Number of entities placed on this map
- `triggerCount`: number - Number of triggers on this map

**Validation Rules**:
- `width` and `height` MUST be > 0
- `tilesetId` MUST reference existing tileset
- `layerIds` MUST be non-empty

---

### EntityDefSummary

**Purpose**: Entity type template information for AI reference

**Fields**:
- `typeId`: string - Unique entity type identifier
- `instanceCount`: number - Number of instances of this type in project
- `hasDialogue`: boolean - Whether this entity type has dialogue
- `isInteractive`: boolean - Whether this entity can be interacted with
- `spriteRef`: string - Reference to sprite asset

**Validation Rules**:
- `instanceCount` MUST be >= 0

---

### AIInput

**Purpose**: Complete input for AI provider request

**Fields**:
- `systemPrompt`: string - System-level instructions (format, constraints)
- `userPrompt`: string - User's natural language goal
- `projectSummary`: ProjectSummary - Current project context
- `repairContext`: RepairContext | undefined - Optional repair loop context

**Validation Rules**:
- `systemPrompt` and `userPrompt` MUST be non-empty
- If `repairContext` present, `attemptNumber` MUST be > 0

---

### AIRawResponse

**Purpose**: Raw response from AI provider before processing

**Fields**:
- `success`: boolean - Whether provider call succeeded
- `rawText`: string | undefined - Full text response from AI
- `parsedPatch`: PatchV1 | undefined - Extracted patch if parseable
- `error`: string | undefined - Error message if failed

**Validation Rules**:
- If `success` is true, `rawText` MUST be present
- If `success` is false, `error` MUST be present
- `parsedPatch` MAY be present if parsing succeeded

**State Transitions**:
- Created by AIProvider
- Consumed by parse module
- Transformed into ProposedPatchResult by orchestrator

---

### ProposedPatchResult

**Purpose**: Final result of patch proposal flow (success or failure)

**Fields**:
- `status`: 'success' | 'validation_failed' | 'parse_failed' | 'provider_error' | 'guardrail_blocked'
- `patch`: PatchV1 | undefined - Valid patch if status is 'success'
- `summary`: PatchSummary | undefined - Human-readable summary if patch valid
- `errors`: PatchError[] - Validation errors if status is 'validation_failed'
- `warnings`: string[] - Non-blocking warnings (e.g., large scope)
- `repairAttempts`: number - Number of repair attempts made
- `message`: string - User-friendly status message

**Validation Rules**:
- If `status` is 'success', `patch` and `summary` MUST be present
- If `status` is 'validation_failed', `errors` MUST be non-empty
- `repairAttempts` MUST be >= 0

**State Transitions**:
- Created by orchestrator
- Consumed by editor UI
- Patch (if present) can be applied via Spec 002 applyPatch

---

### GuardrailConfig

**Purpose**: Safety thresholds and destructive operation settings

**Fields**:
- `maxOps`: number - Maximum operations per patch (default: 40)
- `maxTileEdits`: number - Maximum tile modifications (default: 20,000)
- `maxCollisionEdits`: number - Maximum collision cell modifications (default: 20,000)
- `allowDestructive`: boolean - Whether to allow delete operations (default: false)
- `requireConfirmationThreshold`: number - Operation count requiring confirmation (default: 20)

**Validation Rules**:
- All numeric thresholds MUST be > 0
- Defaults applied if not specified

---

### GuardrailResult

**Purpose**: Result of guardrail checks on a proposed patch

**Fields**:
- `allowed`: boolean - Whether patch passes guardrails
- `warnings`: string[] - Non-blocking warnings
- `requiresConfirmation`: boolean - Whether user confirmation needed
- `reason`: string | undefined - Explanation if not allowed
- `exceeded`: { threshold: string, value: number, limit: number }[] - Details of exceeded limits

**Validation Rules**:
- If `allowed` is false, `reason` MUST be present
- `exceeded` array MUST match failed threshold checks

---

### RepairContext

**Purpose**: Context for repair loop iteration

**Fields**:
- `attemptNumber`: number - Current attempt (1-based)
- `maxAttempts`: number - Maximum allowed attempts
- `previousPatch`: PatchV1 - The patch that failed validation
- `errors`: PatchError[] - Structured validation errors
- `instruction`: string - Instruction for AI to correct patch

**Validation Rules**:
- `attemptNumber` MUST be > 0 and <= `maxAttempts`
- `errors` MUST be non-empty
- `previousPatch` MUST be valid PatchV1 structure (even if semantically invalid)

---

### PatchError

**Purpose**: Structured validation error for repair feedback

**Fields**:
- `operationIndex`: number - Index in operations array (0-based)
- `operationType`: string - Type of operation that failed (e.g., "upsertTiles")
- `errorType`: string - Error category (e.g., "OUT_OF_BOUNDS", "MISSING_REF")
- `message`: string - Human-readable error description
- `context`: Record<string, any> - Operation-specific error details

**Validation Rules**:
- `operationIndex` MUST be >= 0
- `message` MUST be non-empty
- `context` SHOULD include relevant values (e.g., offending tileId, expected range)

**Examples**:
```json
{
  "operationIndex": 3,
  "operationType": "upsertTiles",
  "errorType": "OUT_OF_BOUNDS",
  "message": "Tile ID 999 exceeds tileset maximum of 500",
  "context": {
    "tileId": 999,
    "maxTileId": 500,
    "tilesetId": "dungeon_tiles"
  }
}
```

---

### ConflictHunk

**Purpose**: Track modified regions for undo conflict detection

**Fields**:
- `type`: 'tiles' | 'collision' | 'entity' | 'trigger' | 'dialogue' | 'quest'
- `ref`: string - Unique reference (e.g., "map:town01:layer:ground:x0-10:y0-10")
- `postPatchSnapshot`: string - JSON serialization of state after patch applied

**Validation Rules**:
- `ref` MUST uniquely identify the modified region
- `postPatchSnapshot` MUST be valid JSON string

**Relationships**:
- Multiple hunks created for each applied AI patch
- Stored alongside patch in history (Spec 002 extension)
- Compared against current state on undo request

---

### ConflictDetectionResult

**Purpose**: Result of undo conflict detection

**Fields**:
- `hasConflicts`: boolean - Whether any conflicts detected
- `conflicts`: ConflictDetail[] - Details of each conflict
- `safeHunks`: string[] - Hunks that can be safely undone

**Validation Rules**:
- If `hasConflicts` is true, `conflicts` MUST be non-empty
- Total of `conflicts` + `safeHunks` MUST equal total hunks checked

---

### ConflictDetail

**Purpose**: Details of a specific undo conflict

**Fields**:
- `hunkRef`: string - Reference to conflicting hunk
- `expectedValue`: string - Post-patch snapshot (expected)
- `currentValue`: string - Current state (modified)
- `humanReadable`: string - User-friendly description of conflict

**Example**:
```json
{
  "hunkRef": "map:town01:layer:ground:x5-10:y5-10",
  "expectedValue": "[1,1,1,2,2,2...]",
  "currentValue": "[1,1,3,3,2,2...]",
  "humanReadable": "Tiles in town01 ground layer (5,5) to (10,10) were manually changed"
}
```

---

## Entity Relationships Diagram

```
ProjectSummary
├── constraints: GuardrailConfig
├── tilesets: TilesetSummary[]
├── maps: MapSummary[]
│   └── references → TilesetSummary (via tilesetId)
├── entityDefs: EntityDefSummary[]
├── dialogueIds: string[]
├── questIds: string[]
└── triggers: TriggerSummary[]

AIInput
├── systemPrompt: string
├── userPrompt: string
├── projectSummary: ProjectSummary
└── repairContext?: RepairContext
    ├── previousPatch: PatchV1
    └── errors: PatchError[]

AIRawResponse → (parsed) → ProposedPatchResult
                            ├── patch?: PatchV1
                            ├── summary?: PatchSummary (from Spec 002)
                            └── errors?: PatchError[]

ConflictHunk[] → (on undo) → ConflictDetectionResult
                              ├── conflicts: ConflictDetail[]
                              └── safeHunks: string[]
```

---

## Validation Summary

### Cross-Entity Validation

1. **ProjectSummary → MapSummary → TilesetSummary**:
   - All `tilesetId` references MUST exist in `tilesets` array
   
2. **ProposedPatchResult Consistency**:
   - `status='success'` requires `patch` and `summary`
   - `status='validation_failed'` requires `errors`
   
3. **RepairContext Consistency**:
   - `attemptNumber <= maxAttempts`
   - `errors` MUST reference valid operation indices from `previousPatch`

### Determinism Requirements

1. **ProjectSummary Generation**:
   - All ID arrays sorted alphabetically
   - Map layers sorted by z-index
   - Entity defs sorted by typeId
   
2. **ConflictHunk References**:
   - Deterministic ref format (sorted coordinates)
   - Stable JSON serialization (sorted keys)

---

## State Lifecycle

### Propose Flow
```
Project → ProjectSummary → AIInput → AIProvider → AIRawResponse 
  → parse → ProposedPatchResult → (if success) → applyPatch → History
```

### Repair Loop
```
AIRawResponse (invalid) → validate → PatchError[] 
  → RepairContext → AIProvider → AIRawResponse (attempt 2)
  → validate → (success or max attempts)
```

### Undo Flow
```
History (get patch + hunks) → current state → compare 
  → ConflictDetectionResult → (if conflicts) → ConflictDialog
  → (user choice) → execute undo (full/partial/none)
```

---

## Future Extensions

### Token Budgeting (v2)
- Add `TokenBudget` entity with per-section limits
- Track actual token usage vs estimates
- Auto-adjust detail levels based on budget

### Retrieval Mode (v2)
- Add `ContextFetchRequest` and `ContextFetchResponse` entities
- AI can request specific chunks (e.g., "fetch map town01 collision")
- Orchestrator fulfills requests and re-invokes provider

### Multi-Turn Conversations (v3)
- Add `ConversationHistory` entity with message array
- Track previous patch + user feedback
- Enable refinement ("make town bigger" after initial creation)
