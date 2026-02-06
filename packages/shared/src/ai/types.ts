/**
 * AI Orchestration - Type Definitions
 *
 * Shared types for the AI orchestration layer.
 * All types are serializable for storage and transmission.
 *
 * Note: The existing PatchError in patch/errors.ts is a separate type
 * used for patch validation. AIPatchError here is for AI repair feedback.
 */

import type { PatchV1, PatchSummary } from '../patch/types.js';

// ============================================================================
// ProjectSummary - Token-efficient project representation for AI
// ============================================================================

/** Token-efficient representation of project state for AI context. */
export interface ProjectSummary {
  schemaVersion: number;
  constraints: GuardrailConfig;
  tilesets: TilesetSummary[];
  maps: MapSummary[];
  entityDefs: EntityDefSummary[];
  dialogueIds: string[]; // Sorted
  questIds: string[]; // Sorted
  triggers: TriggerSummary[];
  tokenEstimate: number; // Estimated tokens for this summary
}

/** Tileset metadata for AI reference. */
export interface TilesetSummary {
  id: string;
  tileCount: number;
  imagePath: string;
  tileWidth: number;
  tileHeight: number;
}

/** Map metadata without full tile arrays (token efficiency). */
export interface MapSummary {
  id: string;
  width: number;
  height: number;
  tilesetId: string;
  layerIds: string[]; // Sorted by z-index
  entityCount: number;
  triggerCount: number;
}

/** Entity type template information for AI reference. */
export interface EntityDefSummary {
  typeId: string;
  instanceCount: number;
  hasDialogue: boolean;
  isInteractive: boolean;
  spriteRef: string;
}

/** Trigger metadata for AI reference. */
export interface TriggerSummary {
  id: string;
  mapId: string;
  eventType: string;
}

// ============================================================================
// Guardrails - Safety configuration and results
// ============================================================================

/** Safety thresholds and destructive operation settings. */
export interface GuardrailConfig {
  maxOps: number; // Default: 40
  maxTileEdits: number; // Default: 20,000
  maxCollisionEdits: number; // Default: 20,000
  allowDestructive: boolean; // Default: false
  requireConfirmationThreshold: number; // Default: 20
}

/** Result of guardrail checks on a proposed patch. */
export interface GuardrailResult {
  allowed: boolean;
  warnings: string[];
  requiresConfirmation: boolean;
  reason?: string;
  exceeded: ThresholdExceeded[];
}

/** Details of an exceeded guardrail threshold. */
export interface ThresholdExceeded {
  threshold: string; // e.g., "maxOps"
  value: number;
  limit: number;
}

// ============================================================================
// AI Provider - Input/output for AI service
// ============================================================================

/** Complete input for AI provider request. */
export interface AIInput {
  systemPrompt: string;
  userPrompt: string;
  projectSummary: ProjectSummary;
  repairContext?: RepairContext;
}

/** Raw response from AI provider before processing. */
export interface AIRawResponse {
  success: boolean;
  rawText?: string;
  parsedPatch?: PatchV1;
  error?: string;
}

// ============================================================================
// Repair Loop - Error feedback and correction
// ============================================================================

/** Context for repair loop iteration. */
export interface RepairContext {
  attemptNumber: number; // 1-based
  maxAttempts: number;
  previousPatch: PatchV1;
  errors: AIPatchError[];
  instruction: string;
}

/**
 * Structured validation error for AI repair feedback.
 *
 * Named AIPatchError to avoid collision with PatchError from patch/errors.ts.
 */
export interface AIPatchError {
  operationIndex: number;
  operationType: string; // e.g., "upsertTiles"
  errorType: string; // e.g., "OUT_OF_BOUNDS", "MISSING_REF"
  message: string;
  context: Record<string, unknown>;
}

// ============================================================================
// Orchestrator Result - Final proposal outcome
// ============================================================================

/** Possible statuses of a patch proposal. */
export type ProposalStatus =
  | 'success'
  | 'validation_failed'
  | 'parse_failed'
  | 'provider_error'
  | 'guardrail_blocked';

/** Final result of patch proposal flow (success or failure). */
export interface ProposedPatchResult {
  status: ProposalStatus;
  patch?: PatchV1;
  summary?: PatchSummary;
  errors?: AIPatchError[];
  warnings: string[];
  repairAttempts: number;
  message: string;
}

// ============================================================================
// Conflict Detection - Undo conflict handling
// ============================================================================

/** Types of data hunks for conflict tracking. */
export type HunkType =
  | 'tiles'
  | 'collision'
  | 'entity'
  | 'trigger'
  | 'dialogue'
  | 'quest';

/** Track modified regions for undo conflict detection. */
export interface ConflictHunk {
  type: HunkType;
  ref: string; // e.g., "map:town01:layer:ground:x0-10:y0-10"
  postPatchSnapshot: string; // JSON serialization
}

/** Result of undo conflict detection. */
export interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflicts: ConflictDetail[];
  safeHunks: string[];
}

/** Details of a specific undo conflict. */
export interface ConflictDetail {
  hunkRef: string;
  expectedValue: string;
  currentValue: string;
  humanReadable: string;
}

/** Resolution strategy for undo conflicts. */
export type ConflictResolution = 'cancel' | 'partial' | 'force';

// ============================================================================
// Options - Configuration for orchestrator operations
// ============================================================================

/** Options for proposePatchWithRepair(). */
export interface ProposeOptions {
  guardrails?: Partial<GuardrailConfig>;
  maxRepairAttempts?: number; // Default: 2
  timeout?: number; // Provider timeout in ms, default: 30000
  goalDirectedSummary?: boolean; // Enable filtering, default: true
}

/** Options for applyProposedPatch(). */
export interface ApplyOptions {
  skipConflictCheck?: boolean; // Default: false
  description?: string; // Override patch description
}

/** Options for undoAIPatch(). */
export interface UndoOptions {
  checkConflicts?: boolean; // Default: true
  autoResolve?: ConflictResolution; // If set, skip dialog
}

// ============================================================================
// Parse Result - JSON extraction outcome
// ============================================================================

/** Result of AI response parsing. */
export interface ParseResult {
  success: boolean;
  patch?: PatchV1;
  error?: {
    type: 'no_json' | 'invalid_json' | 'invalid_patch' | 'mixed_content';
    message: string;
    rawText: string;
  };
}

// ============================================================================
// Summary Options - ProjectSummary generation configuration
// ============================================================================

/** Options for buildProjectSummary(). */
export interface SummaryOptions {
  includeFullDetails?: boolean; // Default: false (goal-directed only)
  userPrompt?: string; // For goal-directed filtering
  maxTokens?: number; // Token budget, default: 4000
  sortIds?: boolean; // Default: true (deterministic)
}

// ============================================================================
// Configuration Defaults
// ============================================================================

/** Default guardrail configuration. */
export const DEFAULT_GUARDRAILS: GuardrailConfig = {
  maxOps: 40,
  maxTileEdits: 20000,
  maxCollisionEdits: 20000,
  allowDestructive: false,
  requireConfirmationThreshold: 20,
};

/** Default propose options. */
export const DEFAULT_PROPOSE_OPTIONS: Required<ProposeOptions> = {
  guardrails: DEFAULT_GUARDRAILS,
  maxRepairAttempts: 2,
  timeout: 30000,
  goalDirectedSummary: true,
};

/** Default undo options. */
export const DEFAULT_UNDO_OPTIONS: Required<UndoOptions> = {
  checkConflicts: true,
  autoResolve: undefined as unknown as ConflictResolution,
};
