/**
 * AI Orchestration - Prompt Templates
 *
 * Builds system and user prompts for AI provider communication.
 * System prompt enforces PatchV1-only output format.
 * User prompt combines project context with user goal.
 */

import type {
  GuardrailConfig,
  ProjectSummary,
  RepairContext,
} from './types.js';
import { DEFAULT_GUARDRAILS } from './types.js';

/**
 * Build the system prompt for AI provider.
 *
 * Includes format specification, constraints, and rules.
 * Enforces PatchV1-only JSON output.
 *
 * @param constraints - Guardrail config to embed in prompt
 * @returns System prompt string
 */
export function buildSystemPrompt(constraints?: GuardrailConfig): string {
  const config = constraints ?? DEFAULT_GUARDRAILS;

  return `You are a game project assistant that outputs ONLY valid PatchV1 JSON.

**Critical Rules**:
1. Return ONLY JSON - no explanations, no commentary, no markdown code fences
2. Your entire response must be a single JSON object
3. Use PatchV1 format with patchVersion: 1
4. All operations must reference existing assets in the project summary
5. Do not invent new tilesets or assets not in the project

**PatchV1 Format**:
{
  "patchVersion": 1,
  "patchId": "<unique-id>",
  "baseSchemaVersion": 1,
  "meta": {
    "author": "AI",
    "createdAt": "<ISO-8601>",
    "note": "<what this patch does>"
  },
  "ops": [
    { "op": "<operation-type>", ... }
  ]
}

**Available Operation Types**:
- createMap: Create a new map { op: "createMap", map: { id, name, tilesetId, width, height } }
- createLayer: Add layer to map { op: "createLayer", mapId, layer: { id, name, z }, fillTileId? }
- paintRect: Paint tile rectangle { op: "paintRect", mapId, layerId, x, y, w, h, tileId }
- setTiles: Set individual tiles { op: "setTiles", mapId, layerId, cells: [{ x, y, tileId }] }
- clearTiles: Clear tiles { op: "clearTiles", mapId, layerId, cells: [{ x, y }] }
- setCollisionCells: Set collision { op: "setCollisionCells", mapId, cells: [{ x, y, solid: 0|1 }] }
- setCollisionRect: Set collision rect { op: "setCollisionRect", mapId, x, y, w, h, solid: 0|1 }
- createEntityDef: Create entity template { op: "createEntityDef", entity: { id, kind: "npc"|"door"|"chest", sprite: { tilesetId, tileId }, name? } }
- placeEntity: Place entity on map { op: "placeEntity", mapId, instance: { id, entityId, x, y } }
- moveEntity: Move entity { op: "moveEntity", mapId, instanceId, x, y }
- deleteEntity: Remove entity { op: "deleteEntity", mapId, instanceId }
- createTrigger: Add trigger { op: "createTrigger", mapId, trigger: { id, rect: { x, y, w, h }, onEnter?, onInteract? } }
- updateTrigger: Modify trigger { op: "updateTrigger", mapId, triggerId, patch: { ... } }
- createDialogue: Create dialogue { op: "createDialogue", dialogue: { id, name, rootNodeId, nodes: { ... } } }
- updateDialogueNode: Modify dialogue node { op: "updateDialogueNode", dialogueId, nodeId, patch: { ... } }
- createQuest: Create quest { op: "createQuest", quest: { id, name, description, status } }
- updateQuest: Modify quest { op: "updateQuest", questId, patch: { ... } }

**Project Constraints**:
- Maximum operations per patch: ${config.maxOps}
- Maximum tile edits: ${config.maxTileEdits}
- Maximum collision edits: ${config.maxCollisionEdits}
- Avoid destructive operations (delete) unless explicitly requested
- All coordinates must be within map bounds
- All tile IDs must be within tileset range (0 to tileCount-1)
- All entity/map/dialogue references must exist or be created earlier in the same patch`;
}

/**
 * Build the user prompt for AI provider.
 *
 * Combines user goal with project summary and optional repair context.
 *
 * @param userGoal - Natural language description of desired changes
 * @param summary - Project context
 * @param repairContext - Optional repair context for correction attempts
 * @returns User prompt string
 */
export function buildUserPrompt(
  userGoal: string,
  summary: ProjectSummary,
  repairContext?: RepairContext,
): string {
  let prompt = `Project Summary:\n${JSON.stringify(summary, null, 2)}\n\n`;
  prompt += `User Request: ${userGoal}\n\n`;

  if (repairContext) {
    prompt += `Previous Attempt Failed (Attempt ${repairContext.attemptNumber}/${repairContext.maxAttempts}):\n`;
    prompt += `Errors:\n${JSON.stringify(repairContext.errors, null, 2)}\n\n`;
    prompt += `${repairContext.instruction}\n`;
    prompt += `\nReturn ONLY the corrected PatchV1 JSON.`;
  } else {
    prompt += 'Generate a PatchV1 JSON patch to fulfill this request.';
  }

  return prompt;
}

/**
 * Build a repair instruction message for structured error feedback.
 *
 * @param errorCount - Number of errors found
 * @returns Instruction string for repair context
 */
export function buildRepairInstruction(errorCount: number): string {
  return `The previous patch had ${errorCount} validation error${errorCount !== 1 ? 's' : ''}. Please correct the patch to address these specific errors. Ensure all references exist, coordinates are within bounds, and IDs are unique.`;
}

/**
 * Build a downsizing instruction for oversized patches.
 *
 * @param exceeded - What threshold was exceeded
 * @returns Instruction string for downsizing
 */
export function buildDownsizeInstruction(exceeded: string): string {
  return `The previous patch was too large and exceeded the ${exceeded} limit. Please generate a smaller patch that achieves the core of the user's request while staying within limits. Prioritize the most important changes and omit optional details.`;
}
