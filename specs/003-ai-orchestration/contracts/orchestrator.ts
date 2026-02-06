/**
 * Orchestrator API Contract
 * 
 * Public API for AI patch proposal, validation, repair, and application.
 * Used by editor UI to integrate AI-assisted editing.
 */

import type { Project } from '@project/schema';
import type { PatchV1 } from '@project/patch';
import type { 
  AIProvider, 
  ProposedPatchResult, 
  ProposeOptions,
  ApplyOptions,
  UndoOptions,
  ConflictDetectionResult,
  ProjectSummary,
  SummaryOptions
} from './types';

// ============================================================================
// Core Orchestrator Functions
// ============================================================================

/**
 * Propose a patch based on natural language user goal
 * 
 * This is the main entry point for AI-assisted editing. Orchestrates:
 * 1. ProjectSummary generation
 * 2. Prompt template building
 * 3. AI provider invocation
 * 4. Response parsing
 * 5. Validation
 * 6. Repair loop (if needed)
 * 7. Guardrail checks
 * 
 * @param project - Current project state
 * @param userGoal - Natural language description of desired changes
 * @param provider - AI provider implementation
 * @param options - Optional configuration (guardrails, repair attempts, etc.)
 * @returns Promise resolving to proposal result (success or failure with details)
 * 
 * @example
 * ```typescript
 * const result = await proposePatchWithRepair(
 *   project,
 *   "Create a small town map with 5 villagers",
 *   openAIProvider,
 *   { maxRepairAttempts: 2 }
 * );
 * 
 * if (result.status === 'success') {
 *   console.log('Patch ready:', result.summary);
 *   // Show UI for user to review and apply
 * } else {
 *   console.error('Proposal failed:', result.message, result.errors);
 * }
 * ```
 */
export async function proposePatchWithRepair(
  project: Project,
  userGoal: string,
  provider: AIProvider,
  options?: ProposeOptions
): Promise<ProposedPatchResult>;

/**
 * Apply a proposed patch to the project
 * 
 * Integrates with Spec 002 patch history. Performs:
 * 1. Final validation (redundant check for safety)
 * 2. Conflict detection (if enabled)
 * 3. Atomic apply via applyPatch
 * 4. History push with metadata
 * 5. Conflict hunk storage
 * 
 * @param project - Current project state (mutated in-place)
 * @param patch - Validated patch to apply
 * @param options - Optional configuration (skip conflicts, override description)
 * @returns Promise resolving when apply complete
 * @throws Error if patch validation fails or apply fails
 * 
 * @example
 * ```typescript
 * if (result.status === 'success') {
 *   await applyProposedPatch(project, result.patch);
 *   console.log('Patch applied successfully');
 * }
 * ```
 */
export async function applyProposedPatch(
  project: Project,
  patch: PatchV1,
  options?: ApplyOptions
): Promise<void>;

/**
 * Check for conflicts before undoing an AI-applied patch
 * 
 * Compares current project state against stored conflict hunks
 * to detect manual edits since patch was applied.
 * 
 * @param project - Current project state
 * @param patchId - ID of patch to undo (from history)
 * @returns Conflict detection result with details
 * 
 * @example
 * ```typescript
 * const conflicts = await checkUndoConflicts(project, patchId);
 * 
 * if (conflicts.hasConflicts) {
 *   // Show dialog: Cancel / Partial / Force
 *   const resolution = await showConflictDialog(conflicts);
 *   await undoAIPatch(project, patchId, { autoResolve: resolution });
 * } else {
 *   // Safe to undo
 *   await undoAIPatch(project, patchId);
 * }
 * ```
 */
export async function checkUndoConflicts(
  project: Project,
  patchId: string
): Promise<ConflictDetectionResult>;

/**
 * Undo an AI-applied patch with optional conflict handling
 * 
 * Uses inverse patch from history (Spec 002). Handles conflicts
 * based on resolution strategy.
 * 
 * @param project - Current project state (mutated in-place)
 * @param patchId - ID of patch to undo (from history)
 * @param options - Optional configuration (conflict handling)
 * @returns Promise resolving when undo complete
 * @throws Error if patch not found or undo fails
 * 
 * @example
 * ```typescript
 * await undoAIPatch(project, patchId, {
 *   checkConflicts: true,
 *   autoResolve: 'cancel'  // Safe default
 * });
 * ```
 */
export async function undoAIPatch(
  project: Project,
  patchId: string,
  options?: UndoOptions
): Promise<void>;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Build project summary for AI context
 * 
 * Generates token-efficient representation of project state.
 * Includes goal-directed filtering if userPrompt provided.
 * 
 * @param project - Current project state
 * @param options - Optional configuration (detail level, filtering)
 * @returns ProjectSummary with deterministic ordering
 * 
 * @example
 * ```typescript
 * const summary = buildProjectSummary(project, {
 *   userPrompt: "edit town map",
 *   maxTokens: 4000
 * });
 * console.log('Estimated tokens:', summary.tokenEstimate);
 * ```
 */
export function buildProjectSummary(
  project: Project,
  options?: SummaryOptions
): ProjectSummary;

/**
 * Parse AI response to extract PatchV1 JSON
 * 
 * Strict parsing that rejects non-JSON or mixed content.
 * Returns structured error for repair loop feedback.
 * 
 * @param rawText - Raw AI response text
 * @returns Parse result with patch or error details
 * 
 * @internal Used by orchestrator, exposed for testing
 */
export function parseAIResponse(rawText: string): {
  success: boolean;
  patch?: PatchV1;
  error?: { type: string; message: string };
};

/**
 * Check proposed patch against guardrails
 * 
 * Pre-validation safety checks for size and destructive operations.
 * 
 * @param patch - Proposed patch to check
 * @param config - Guardrail thresholds
 * @param userPrompt - Original user goal (for intent detection)
 * @returns Guardrail result with allowed/warnings/reason
 * 
 * @internal Used by orchestrator, exposed for testing
 */
export function checkGuardrails(
  patch: PatchV1,
  config: GuardrailConfig,
  userPrompt: string
): GuardrailResult;

// ============================================================================
// Prompt Template Functions
// ============================================================================

/**
 * Build system prompt for AI provider
 * 
 * Includes format specification, constraints, and rules.
 * 
 * @param constraints - Guardrail config to embed in prompt
 * @returns System prompt string
 * 
 * @internal Used by orchestrator, exposed for customization
 */
export function buildSystemPrompt(constraints: GuardrailConfig): string;

/**
 * Build user prompt for AI provider
 * 
 * Combines user goal with project summary.
 * 
 * @param userGoal - Natural language description
 * @param summary - Project context
 * @param repairContext - Optional repair context for correction attempts
 * @returns User prompt string
 * 
 * @internal Used by orchestrator, exposed for customization
 */
export function buildUserPrompt(
  userGoal: string,
  summary: ProjectSummary,
  repairContext?: RepairContext
): string;

// ============================================================================
// Configuration Defaults
// ============================================================================

/**
 * Default guardrail configuration
 */
export const DEFAULT_GUARDRAILS: GuardrailConfig = {
  maxOps: 40,
  maxTileEdits: 20000,
  maxCollisionEdits: 20000,
  allowDestructive: false,
  requireConfirmationThreshold: 20
};

/**
 * Default propose options
 */
export const DEFAULT_PROPOSE_OPTIONS: Required<ProposeOptions> = {
  guardrails: DEFAULT_GUARDRAILS,
  maxRepairAttempts: 2,
  timeout: 30000,
  goalDirectedSummary: true
};

/**
 * Default undo options
 */
export const DEFAULT_UNDO_OPTIONS: Required<UndoOptions> = {
  checkConflicts: true,
  autoResolve: undefined  // Always show dialog if conflicts
};
