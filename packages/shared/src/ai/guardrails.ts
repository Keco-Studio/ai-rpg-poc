/**
 * AI Orchestration - Guardrails
 *
 * Pre-validation safety checks for proposed patches.
 * Prevents accidentally large or destructive changes.
 */

import type { PatchV1, PatchOp } from '../patch/types.js';
import type {
  GuardrailConfig,
  GuardrailResult,
  ThresholdExceeded,
} from './types.js';
import { DEFAULT_GUARDRAILS } from './types.js';

/**
 * Check a proposed patch against guardrail thresholds.
 *
 * Checks:
 * 1. Total operation count vs maxOps
 * 2. Tile edit count vs maxTileEdits
 * 3. Collision edit count vs maxCollisionEdits
 * 4. Destructive operations (delete ops) vs allowDestructive
 *
 * @param patch - Proposed patch to check
 * @param config - Guardrail thresholds
 * @param userPrompt - Original user goal (for intent detection)
 * @returns GuardrailResult with allowed/warnings/reason
 */
export function checkGuardrails(
  patch: PatchV1,
  config?: Partial<GuardrailConfig>,
  userPrompt?: string,
): GuardrailResult {
  const guardrails: GuardrailConfig = {
    ...DEFAULT_GUARDRAILS,
    ...config,
  };

  const warnings: string[] = [];
  const exceeded: ThresholdExceeded[] = [];
  let allowed = true;
  let reason: string | undefined;

  const ops = patch.ops;

  // 1. Check total operation count
  if (ops.length > guardrails.maxOps) {
    exceeded.push({
      threshold: 'maxOps',
      value: ops.length,
      limit: guardrails.maxOps,
    });
    allowed = false;
    reason = `Patch contains ${ops.length} operations, exceeding limit of ${guardrails.maxOps}`;
  }

  // 2. Count tile edits
  const tileEditCount = countTileEdits(ops);
  if (tileEditCount > guardrails.maxTileEdits) {
    exceeded.push({
      threshold: 'maxTileEdits',
      value: tileEditCount,
      limit: guardrails.maxTileEdits,
    });
    allowed = false;
    reason = reason
      ? `${reason}; tile edits (${tileEditCount}) exceed limit of ${guardrails.maxTileEdits}`
      : `Tile edits (${tileEditCount}) exceed limit of ${guardrails.maxTileEdits}`;
  }

  // 3. Count collision edits
  const collisionEditCount = countCollisionEdits(ops);
  if (collisionEditCount > guardrails.maxCollisionEdits) {
    exceeded.push({
      threshold: 'maxCollisionEdits',
      value: collisionEditCount,
      limit: guardrails.maxCollisionEdits,
    });
    allowed = false;
    reason = reason
      ? `${reason}; collision edits (${collisionEditCount}) exceed limit of ${guardrails.maxCollisionEdits}`
      : `Collision edits (${collisionEditCount}) exceed limit of ${guardrails.maxCollisionEdits}`;
  }

  // 4. Check for destructive operations
  const deleteOps = countDeleteOps(ops);
  if (deleteOps > 0 && !guardrails.allowDestructive) {
    // Check if user explicitly intended destruction
    const userIntendedDelete = userPrompt
      ? hasDestructiveIntent(userPrompt)
      : false;

    if (!userIntendedDelete) {
      exceeded.push({
        threshold: 'allowDestructive',
        value: deleteOps,
        limit: 0,
      });
      allowed = false;
      reason = reason
        ? `${reason}; contains ${deleteOps} destructive operation(s) but allowDestructive is false`
        : `Contains ${deleteOps} destructive operation(s) but allowDestructive is false`;
    } else {
      warnings.push(
        `Patch contains ${deleteOps} delete operation(s). User prompt suggests this is intentional.`,
      );
    }
  }

  // 5. Check if near confirmation threshold
  const requiresConfirmation =
    allowed && ops.length >= guardrails.requireConfirmationThreshold;
  if (requiresConfirmation) {
    warnings.push(
      `Patch contains ${ops.length} operations, which is above the confirmation threshold of ${guardrails.requireConfirmationThreshold}.`,
    );
  }

  return {
    allowed,
    warnings,
    requiresConfirmation,
    reason,
    exceeded,
  };
}

// ============================================================================
// Internal Helpers
// ============================================================================

/** Count total tile edits across all tile operations. */
function countTileEdits(ops: PatchOp[]): number {
  let count = 0;
  for (const op of ops) {
    switch (op.op) {
      case 'paintRect':
        count += op.w * op.h;
        break;
      case 'setTiles':
        count += op.cells.length;
        break;
      case 'clearTiles':
        count += op.cells.length;
        break;
    }
  }
  return count;
}

/** Count total collision edits across all collision operations. */
function countCollisionEdits(ops: PatchOp[]): number {
  let count = 0;
  for (const op of ops) {
    switch (op.op) {
      case 'setCollisionCells':
        count += op.cells.length;
        break;
      case 'setCollisionRect':
        count += op.w * op.h;
        break;
    }
  }
  return count;
}

/** Count delete operations in patch. */
function countDeleteOps(ops: PatchOp[]): number {
  let count = 0;
  for (const op of ops) {
    if (op.op === 'deleteEntity') {
      count++;
    }
  }
  return count;
}

/** Check if user prompt suggests destructive intent. */
function hasDestructiveIntent(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  const destructiveKeywords = [
    'delete',
    'remove',
    'clear',
    'wipe',
    'destroy',
    'erase',
    'get rid of',
  ];
  return destructiveKeywords.some((keyword) => lower.includes(keyword));
}
