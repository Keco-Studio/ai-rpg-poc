/**
 * Shared Type Definitions for AI Orchestration
 * 
 * These types define the contracts between AI orchestration components.
 * All types are designed to be serializable for storage and transmission.
 */

import type { PatchV1, PatchSummary } from '@project/patch'; // From Spec 002
import type { Project } from '@project/schema'; // From Spec 001

// ============================================================================
// ProjectSummary - Token-efficient project representation for AI
// ============================================================================

export interface ProjectSummary {
  schemaVersion: string;
  constraints: GuardrailConfig;
  tilesets: TilesetSummary[];
  maps: MapSummary[];
  entityDefs: EntityDefSummary[];
  dialogueIds: string[];  // Sorted
  questIds: string[];     // Sorted
  triggers: TriggerSummary[];
  tokenEstimate: number;  // Estimated tokens for this summary
}

export interface TilesetSummary {
  id: string;
  tileCount: number;
  imagePath: string;
  tileWidth: number;
  tileHeight: number;
}

export interface MapSummary {
  id: string;
  width: number;
  height: number;
  tilesetId: string;
  layerIds: string[];  // Sorted by z-index
  entityCount: number;
  triggerCount: number;
}

export interface EntityDefSummary {
  typeId: string;
  instanceCount: number;
  hasDialogue: boolean;
  isInteractive: boolean;
  spriteRef: string;
}

export interface TriggerSummary {
  id: string;
  mapId: string;
  eventType: string;
}

// ============================================================================
// Guardrails - Safety configuration and results
// ============================================================================

export interface GuardrailConfig {
  maxOps: number;                    // Default: 40
  maxTileEdits: number;              // Default: 20,000
  maxCollisionEdits: number;         // Default: 20,000
  allowDestructive: boolean;         // Default: false
  requireConfirmationThreshold: number;  // Default: 20
}

export interface GuardrailResult {
  allowed: boolean;
  warnings: string[];
  requiresConfirmation: boolean;
  reason?: string;
  exceeded: ThresholdExceeded[];
}

export interface ThresholdExceeded {
  threshold: string;  // e.g., "maxOps"
  value: number;
  limit: number;
}

// ============================================================================
// AI Provider - Input/output for AI service
// ============================================================================

export interface AIInput {
  systemPrompt: string;
  userPrompt: string;
  projectSummary: ProjectSummary;
  repairContext?: RepairContext;
}

export interface AIRawResponse {
  success: boolean;
  rawText?: string;
  parsedPatch?: PatchV1;
  error?: string;
}

// ============================================================================
// Repair Loop - Error feedback and correction
// ============================================================================

export interface RepairContext {
  attemptNumber: number;      // 1-based
  maxAttempts: number;
  previousPatch: PatchV1;
  errors: PatchError[];
  instruction: string;
}

export interface PatchError {
  operationIndex: number;
  operationType: string;      // e.g., "upsertTiles"
  errorType: string;          // e.g., "OUT_OF_BOUNDS", "MISSING_REF"
  message: string;
  context: Record<string, any>;
}

// ============================================================================
// Orchestrator Result - Final proposal outcome
// ============================================================================

export type ProposalStatus = 
  | 'success' 
  | 'validation_failed' 
  | 'parse_failed' 
  | 'provider_error' 
  | 'guardrail_blocked';

export interface ProposedPatchResult {
  status: ProposalStatus;
  patch?: PatchV1;
  summary?: PatchSummary;
  errors?: PatchError[];
  warnings: string[];
  repairAttempts: number;
  message: string;
}

// ============================================================================
// Conflict Detection - Undo conflict handling
// ============================================================================

export type HunkType = 
  | 'tiles' 
  | 'collision' 
  | 'entity' 
  | 'trigger' 
  | 'dialogue' 
  | 'quest';

export interface ConflictHunk {
  type: HunkType;
  ref: string;                    // e.g., "map:town01:layer:ground:x0-10:y0-10"
  postPatchSnapshot: string;      // JSON serialization
}

export interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflicts: ConflictDetail[];
  safeHunks: string[];
}

export interface ConflictDetail {
  hunkRef: string;
  expectedValue: string;
  currentValue: string;
  humanReadable: string;
}

export type ConflictResolution = 'cancel' | 'partial' | 'force';

// ============================================================================
// Options - Configuration for orchestrator operations
// ============================================================================

export interface ProposeOptions {
  guardrails?: Partial<GuardrailConfig>;
  maxRepairAttempts?: number;      // Default: 2
  timeout?: number;                // Provider timeout in ms, default: 30000
  goalDirectedSummary?: boolean;   // Enable filtering, default: true
}

export interface ApplyOptions {
  skipConflictCheck?: boolean;     // Default: false
  description?: string;            // Override patch description
}

export interface UndoOptions {
  checkConflicts?: boolean;        // Default: true
  autoResolve?: ConflictResolution; // If set, skip dialog
}

// ============================================================================
// Parse Result - JSON extraction outcome
// ============================================================================

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

export interface SummaryOptions {
  includeFullDetails?: boolean;     // Default: false (goal-directed only)
  userPrompt?: string;              // For goal-directed filtering
  maxTokens?: number;               // Token budget, default: 4000
  sortIds?: boolean;                // Default: true (deterministic)
}
