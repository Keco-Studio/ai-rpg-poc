/**
 * AI Orchestration - Main Orchestrator
 *
 * Coordinates the full propose-validate-repair flow:
 * 1. Build project summary
 * 2. Build prompts
 * 3. Call AI provider
 * 4. Parse response
 * 5. Validate patch
 * 6. Check guardrails
 * 7. Repair loop (if needed)
 */

import type { Project } from '../schema/types.js';
import type { PatchV1, PatchSummary } from '../patch/types.js';
import { validatePatch } from '../patch/validate.js';
import { applyPatch } from '../patch/apply.js';
import { summarizePatch } from '../patch/summary.js';
import type { PatchError as PatchValidationError } from '../patch/errors.js';
import type { AIProvider } from './provider.js';
import type {
  ProposedPatchResult,
  ProposeOptions,
  AIPatchError,
  GuardrailConfig,
  RepairContext,
} from './types.js';
import { DEFAULT_GUARDRAILS, DEFAULT_PROPOSE_OPTIONS } from './types.js';
import { buildProjectSummary } from './projectSummary.js';
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildRepairInstruction,
  buildDownsizeInstruction,
} from './promptTemplates.js';
import { parseAIResponse } from './parse.js';
import { checkGuardrails } from './guardrails.js';

/**
 * Propose a patch with automatic repair loop.
 *
 * Main entry point for AI-assisted editing.
 *
 * @param project - Current project state
 * @param userGoal - Natural language description of desired changes
 * @param provider - AI provider implementation
 * @param options - Optional configuration
 * @returns ProposedPatchResult with status and patch/errors
 */
export async function proposePatchWithRepair(
  project: Project,
  userGoal: string,
  provider: AIProvider,
  options?: ProposeOptions,
): Promise<ProposedPatchResult> {
  const opts = {
    ...DEFAULT_PROPOSE_OPTIONS,
    ...options,
    guardrails: {
      ...DEFAULT_GUARDRAILS,
      ...options?.guardrails,
    },
  };

  // Step 1: Build project summary
  const summary = buildProjectSummary(project, {
    userPrompt: opts.goalDirectedSummary ? userGoal : undefined,
  });

  // Step 2: Build prompts
  const systemPrompt = buildSystemPrompt(opts.guardrails);

  // Step 3: Initial attempt
  let result = await proposePatchOnce(
    project,
    userGoal,
    provider,
    systemPrompt,
    summary,
    opts.guardrails,
    undefined, // No repair context for first attempt
  );

  // If successful or provider error, return immediately
  if (
    result.status === 'success' ||
    result.status === 'provider_error'
  ) {
    return result;
  }

  // Step 4: Repair loop
  let repairAttempts = 0;
  let lastResult = result;

  while (repairAttempts < opts.maxRepairAttempts) {
    repairAttempts++;

    // Build repair context
    const repairContext = buildRepairContext(
      lastResult,
      repairAttempts,
      opts.maxRepairAttempts,
    );

    if (!repairContext) {
      // Can't build repair context (e.g., no errors to report)
      break;
    }

    // Retry with repair context
    result = await proposePatchOnce(
      project,
      userGoal,
      provider,
      systemPrompt,
      summary,
      opts.guardrails,
      repairContext,
    );

    result.repairAttempts = repairAttempts;

    if (result.status === 'success' || result.status === 'provider_error') {
      return result;
    }

    lastResult = result;
  }

  // All attempts exhausted
  lastResult.repairAttempts = repairAttempts;
  return lastResult;
}

/**
 * Single attempt to propose a patch (no repair loop).
 *
 * @internal Exposed for testing
 */
export async function proposePatchOnce(
  project: Project,
  userGoal: string,
  provider: AIProvider,
  systemPrompt: string,
  summary: ReturnType<typeof buildProjectSummary>,
  guardrails: GuardrailConfig,
  repairContext?: RepairContext,
): Promise<ProposedPatchResult> {
  // Build user prompt
  const userPrompt = buildUserPrompt(userGoal, summary, repairContext);

  // Call AI provider
  const aiResponse = await provider.proposePatch({
    systemPrompt,
    userPrompt,
    projectSummary: summary,
    repairContext,
  });

  // Handle provider error
  if (!aiResponse.success) {
    return {
      status: 'provider_error',
      warnings: [],
      repairAttempts: 0,
      message: aiResponse.error ?? 'AI provider returned an error',
    };
  }

  // Parse AI response
  if (!aiResponse.rawText) {
    return {
      status: 'parse_failed',
      warnings: [],
      repairAttempts: 0,
      message: 'AI provider returned empty response',
    };
  }

  const parseResult = parseAIResponse(aiResponse.rawText);

  if (!parseResult.success || !parseResult.patch) {
    return {
      status: 'parse_failed',
      warnings: [],
      repairAttempts: 0,
      message: parseResult.error?.message ?? 'Failed to parse AI response',
    };
  }

  const patch = parseResult.patch;

  // Check guardrails
  const guardrailResult = checkGuardrails(patch, guardrails, userGoal);

  if (!guardrailResult.allowed) {
    return {
      status: 'guardrail_blocked',
      patch,
      warnings: guardrailResult.warnings,
      repairAttempts: 0,
      message: guardrailResult.reason ?? 'Patch blocked by guardrails',
      errors: guardrailResult.exceeded.map((e) => ({
        operationIndex: -1,
        operationType: 'guardrail',
        errorType: e.threshold,
        message: `${e.threshold}: ${e.value} exceeds limit of ${e.limit}`,
        context: { threshold: e.threshold, value: e.value, limit: e.limit },
      })),
    };
  }

  // Validate patch against project
  const validation = validatePatch(project, patch);

  if (!validation.ok) {
    const aiErrors = convertValidationErrors(
      validation.errors,
      patch,
    );
    return {
      status: 'validation_failed',
      patch,
      errors: aiErrors,
      warnings: guardrailResult.warnings,
      repairAttempts: 0,
      message: `Patch has ${aiErrors.length} validation error(s)`,
    };
  }

  // Generate summary by doing a dry-run apply
  let patchSummary: PatchSummary;
  try {
    const applyResult = applyPatch(project, patch);
    patchSummary = summarizePatch(project, applyResult.project);
  } catch {
    // Fallback: use empty summary if apply fails for some reason
    patchSummary = {
      created: { maps: [], entities: [], dialogues: [], quests: [], triggers: [] },
      modified: { maps: [], entities: [], dialogues: [], quests: [], triggers: [] },
      deleted: { maps: [], entities: [], dialogues: [], quests: [], triggers: [] },
    };
  }

  return {
    status: 'success',
    patch,
    summary: patchSummary,
    warnings: guardrailResult.warnings,
    repairAttempts: 0,
    message: 'Patch proposal ready for review',
  };
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Convert patch validation errors to AI-friendly error format.
 */
export function convertValidationErrors(
  errors: PatchValidationError[],
  patch: PatchV1,
): AIPatchError[] {
  return errors.map((err) => {
    const opIndex = err.opIndex ?? -1;
    const op = opIndex >= 0 && opIndex < patch.ops.length
      ? patch.ops[opIndex]
      : undefined;

    return {
      operationIndex: opIndex,
      operationType: op ? op.op : 'unknown',
      errorType: err.code,
      message: err.message,
      context: err.detail
        ? (typeof err.detail === 'object' ? err.detail as Record<string, unknown> : { value: err.detail })
        : {},
    };
  });
}

/**
 * Build repair context from a failed result.
 */
function buildRepairContext(
  result: ProposedPatchResult,
  attemptNumber: number,
  maxAttempts: number,
): RepairContext | undefined {
  if (result.status === 'parse_failed') {
    // For parse failures, create a minimal repair context
    return {
      attemptNumber,
      maxAttempts,
      previousPatch: {
        patchVersion: 1,
        patchId: 'repair-placeholder',
        baseSchemaVersion: 1,
        ops: [],
      },
      errors: [
        {
          operationIndex: -1,
          operationType: 'format',
          errorType: 'PARSE_ERROR',
          message: result.message,
          context: {},
        },
      ],
      instruction: `The previous response was not valid PatchV1 JSON. ${result.message}. Return ONLY a valid PatchV1 JSON object.`,
    };
  }

  if (result.status === 'validation_failed' && result.errors && result.patch) {
    return {
      attemptNumber,
      maxAttempts,
      previousPatch: result.patch,
      errors: result.errors,
      instruction: buildRepairInstruction(result.errors.length),
    };
  }

  if (result.status === 'guardrail_blocked' && result.errors && result.patch) {
    const exceededThresholds = result.errors
      .map((e) => e.errorType)
      .join(', ');
    return {
      attemptNumber,
      maxAttempts,
      previousPatch: result.patch,
      errors: result.errors,
      instruction: buildDownsizeInstruction(exceededThresholds),
    };
  }

  return undefined;
}
