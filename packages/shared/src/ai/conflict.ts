/**
 * AI Orchestration - Conflict Detection
 *
 * Detects conflicts when undoing AI-applied patches.
 * Compares stored post-patch snapshots against current project state
 * to find manual edits that would be lost during undo.
 */

import type { Project } from '../schema/types.js';
import type { PatchV1 } from '../patch/types.js';
import type {
  ConflictHunk,
  ConflictDetectionResult,
  ConflictDetail,
  HunkType,
} from './types.js';

/**
 * Detect conflicts between stored hunks and current project state.
 *
 * Compares postPatchSnapshot of each hunk against the current value
 * of that data region. If they differ, a manual edit occurred and
 * undoing would lose that edit.
 *
 * @param project - Current project state
 * @param hunks - Stored conflict hunks from when patch was applied
 * @returns ConflictDetectionResult with conflict details
 */
export function detectConflicts(
  project: Project,
  hunks: ConflictHunk[],
): ConflictDetectionResult {
  const conflicts: ConflictDetail[] = [];
  const safeHunks: string[] = [];

  for (const hunk of hunks) {
    const currentValue = getCurrentValue(project, hunk);

    if (currentValue === hunk.postPatchSnapshot) {
      safeHunks.push(hunk.ref);
    } else {
      conflicts.push({
        hunkRef: hunk.ref,
        expectedValue: hunk.postPatchSnapshot,
        currentValue: currentValue ?? '(not found)',
        humanReadable: buildConflictDescription(hunk, currentValue),
      });
    }
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
    safeHunks,
  };
}

/**
 * Build conflict hunks from a patch that was applied.
 *
 * Creates snapshots of all data regions modified by the patch,
 * capturing the state AFTER patch application.
 *
 * @param afterProject - Project state after patch was applied
 * @param patch - The patch that was applied
 * @returns Array of ConflictHunks for storage
 */
export function buildConflictHunks(
  afterProject: Project,
  patch: PatchV1,
): ConflictHunk[] {
  const hunks: ConflictHunk[] = [];
  const seen = new Set<string>();

  for (const op of patch.ops) {
    const opHunks = buildHunksForOp(afterProject, op);
    for (const hunk of opHunks) {
      if (!seen.has(hunk.ref)) {
        seen.add(hunk.ref);
        hunks.push(hunk);
      }
    }
  }

  return hunks;
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Get the current value of a data region from the project.
 */
function getCurrentValue(
  project: Project,
  hunk: ConflictHunk,
): string | undefined {
  try {
    const parsed = parseHunkRef(hunk.ref);
    if (!parsed) return undefined;

    switch (hunk.type) {
      case 'entity': {
        const map = project.maps[parsed.mapId!];
        if (!map) return undefined;
        const entity = map.entities.find(
          (e) => e.instanceId === parsed.entityId,
        );
        return entity ? JSON.stringify(entity) : undefined;
      }
      case 'tiles': {
        const map = project.maps[parsed.mapId!];
        if (!map) return undefined;
        const layer = map.tileLayers[parsed.layerId!];
        if (!layer) return undefined;
        return JSON.stringify(layer.data);
      }
      case 'collision': {
        const map = project.maps[parsed.mapId!];
        if (!map) return undefined;
        return JSON.stringify(map.collisionLayer);
      }
      case 'trigger': {
        const map = project.maps[parsed.mapId!];
        if (!map) return undefined;
        const trigger = map.triggers.find((t) => t.id === parsed.triggerId);
        return trigger ? JSON.stringify(trigger) : undefined;
      }
      case 'dialogue': {
        const dialogue = project.dialogues[parsed.dialogueId!];
        return dialogue ? JSON.stringify(dialogue) : undefined;
      }
      case 'quest': {
        const quest = project.quests?.[parsed.questId!];
        return quest ? JSON.stringify(quest) : undefined;
      }
      default:
        return undefined;
    }
  } catch {
    return undefined;
  }
}

interface ParsedHunkRef {
  mapId?: string;
  layerId?: string;
  entityId?: string;
  triggerId?: string;
  dialogueId?: string;
  questId?: string;
}

/**
 * Parse a hunk ref string into its components.
 * Format: "type:id" or "map:mapId:layer:layerId" etc.
 */
function parseHunkRef(ref: string): ParsedHunkRef | undefined {
  const parts = ref.split(':');
  if (parts.length < 2) return undefined;

  const result: ParsedHunkRef = {};

  for (let i = 0; i < parts.length - 1; i += 2) {
    const key = parts[i];
    const value = parts[i + 1];
    switch (key) {
      case 'map':
        result.mapId = value;
        break;
      case 'layer':
        result.layerId = value;
        break;
      case 'entity':
        result.entityId = value;
        break;
      case 'trigger':
        result.triggerId = value;
        break;
      case 'dialogue':
        result.dialogueId = value;
        break;
      case 'quest':
        result.questId = value;
        break;
    }
  }

  return result;
}

/**
 * Build a human-readable conflict description.
 */
function buildConflictDescription(
  hunk: ConflictHunk,
  _currentValue: string | undefined,
): string {
  const parsed = parseHunkRef(hunk.ref);
  if (!parsed) return `Data at ${hunk.ref} was manually changed`;

  switch (hunk.type) {
    case 'entity':
      return `Entity '${parsed.entityId}' on map '${parsed.mapId}' was manually changed`;
    case 'tiles':
      return `Tiles in map '${parsed.mapId}' layer '${parsed.layerId}' were manually changed`;
    case 'collision':
      return `Collision in map '${parsed.mapId}' was manually changed`;
    case 'trigger':
      return `Trigger '${parsed.triggerId}' on map '${parsed.mapId}' was manually changed`;
    case 'dialogue':
      return `Dialogue '${parsed.dialogueId}' was manually changed`;
    case 'quest':
      return `Quest '${parsed.questId}' was manually changed`;
    default:
      return `Data at ${hunk.ref} was manually changed`;
  }
}

/**
 * Build hunks for a single operation based on the post-apply project.
 */
function buildHunksForOp(
  project: Project,
  op: PatchV1['ops'][number],
): ConflictHunk[] {
  const hunks: ConflictHunk[] = [];

  switch (op.op) {
    case 'createMap':
    case 'createLayer':
    case 'paintRect':
    case 'setTiles':
    case 'clearTiles': {
      const mapId =
        op.op === 'createMap' ? op.map.id : op.mapId;
      const map = project.maps[mapId];
      if (!map) break;

      if (op.op === 'createMap') {
        // Track all layers of the new map
        for (const layerId of Object.keys(map.tileLayers)) {
          hunks.push({
            type: 'tiles' as HunkType,
            ref: `map:${mapId}:layer:${layerId}`,
            postPatchSnapshot: JSON.stringify(map.tileLayers[layerId].data),
          });
        }
      } else {
        const layerId =
          op.op === 'createLayer' ? op.layer.id : op.layerId;
        const layer = map.tileLayers[layerId];
        if (layer) {
          hunks.push({
            type: 'tiles' as HunkType,
            ref: `map:${mapId}:layer:${layerId}`,
            postPatchSnapshot: JSON.stringify(layer.data),
          });
        }
      }
      break;
    }

    case 'setCollisionCells':
    case 'setCollisionRect': {
      const map = project.maps[op.mapId];
      if (map) {
        hunks.push({
          type: 'collision' as HunkType,
          ref: `map:${op.mapId}:collision`,
          postPatchSnapshot: JSON.stringify(map.collisionLayer),
        });
      }
      break;
    }

    case 'placeEntity':
    case 'moveEntity':
    case 'deleteEntity': {
      const mapId = op.mapId;
      const instanceId =
        op.op === 'placeEntity' ? op.instance.id : op.instanceId;
      const map = project.maps[mapId];
      if (map) {
        const entity = map.entities.find((e) => e.instanceId === instanceId);
        hunks.push({
          type: 'entity' as HunkType,
          ref: `map:${mapId}:entity:${instanceId}`,
          postPatchSnapshot: entity ? JSON.stringify(entity) : 'null',
        });
      }
      break;
    }

    case 'createEntityDef': {
      // Entity defs don't have conflict hunks (they're templates, not instances)
      break;
    }

    case 'createTrigger':
    case 'updateTrigger': {
      const mapId = op.mapId;
      const triggerId =
        op.op === 'createTrigger' ? op.trigger.id : op.triggerId;
      const map = project.maps[mapId];
      if (map) {
        const trigger = map.triggers.find((t) => t.id === triggerId);
        if (trigger) {
          hunks.push({
            type: 'trigger' as HunkType,
            ref: `map:${mapId}:trigger:${triggerId}`,
            postPatchSnapshot: JSON.stringify(trigger),
          });
        }
      }
      break;
    }

    case 'createDialogue':
    case 'updateDialogueNode': {
      const dialogueId =
        op.op === 'createDialogue' ? op.dialogue.id : op.dialogueId;
      const dialogue = project.dialogues[dialogueId];
      if (dialogue) {
        hunks.push({
          type: 'dialogue' as HunkType,
          ref: `dialogue:${dialogueId}`,
          postPatchSnapshot: JSON.stringify(dialogue),
        });
      }
      break;
    }

    case 'createQuest':
    case 'updateQuest': {
      const questId = op.op === 'createQuest' ? op.quest.id : op.questId;
      const quest = project.quests?.[questId];
      if (quest) {
        hunks.push({
          type: 'quest' as HunkType,
          ref: `quest:${questId}`,
          postPatchSnapshot: JSON.stringify(quest),
        });
      }
      break;
    }
  }

  return hunks;
}
