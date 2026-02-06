/**
 * AI Orchestration - Public API
 *
 * Provides AI-assisted game project editing through natural language.
 * All AI changes flow through the PatchV1 system (Spec 002) for
 * atomicity, validation, and undo/redo capabilities.
 */

// Types
export type {
  ProjectSummary,
  TilesetSummary,
  MapSummary,
  EntityDefSummary,
  TriggerSummary,
  GuardrailConfig,
  GuardrailResult,
  ThresholdExceeded,
  AIInput,
  AIRawResponse,
  RepairContext,
  AIPatchError,
  ProposalStatus,
  ProposedPatchResult,
  HunkType,
  ConflictHunk,
  ConflictDetectionResult,
  ConflictDetail,
  ConflictResolution,
  ProposeOptions,
  ApplyOptions,
  UndoOptions,
  ParseResult,
  SummaryOptions,
} from './types.js';

export {
  DEFAULT_GUARDRAILS,
  DEFAULT_PROPOSE_OPTIONS,
  DEFAULT_UNDO_OPTIONS,
} from './types.js';

// Provider
export type { AIProvider, ProviderConfig, ProviderFactory } from './provider.js';
export type { MockProviderConfig } from './provider.js';
export {
  MockProvider,
  ProviderErrorType,
  createProviderError,
} from './provider.js';

// ProjectSummary
export { buildProjectSummary } from './projectSummary.js';

// Prompt Templates
export { buildSystemPrompt, buildUserPrompt } from './promptTemplates.js';

// Parse
export { parseAIResponse } from './parse.js';

// Orchestrator
export {
  proposePatchWithRepair,
  proposePatchOnce,
} from './orchestrator.js';

// Guardrails
export { checkGuardrails } from './guardrails.js';

// Conflict Detection
export { detectConflicts } from './conflict.js';
