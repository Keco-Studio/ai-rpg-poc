/**
 * FilteredInverseBuilder — Build filtered inverse patches for partial undo
 *
 * Maps PatchOps to hunk refs and filters inverse patches to only
 * include ops that affect safe (non-conflicting) hunks.
 */

import type { PatchV1, PatchOp } from '@ai-rpg-maker/shared';

/**
 * Map a PatchOp to its hunk ref string.
 * The hunk ref identifies the data region affected by the op.
 */
export function opToHunkRef(op: PatchOp): string {
  switch (op.op) {
    case 'createMap':
      return `map:${op.map.id}`;
    case 'createLayer':
      return `map:${op.mapId}:layer:${op.layer.id}`;
    case 'paintRect':
      return `map:${op.mapId}:layer:${op.layerId}`;
    case 'setTiles':
      return `map:${op.mapId}:layer:${op.layerId}`;
    case 'clearTiles':
      return `map:${op.mapId}:layer:${op.layerId}`;
    case 'setCollisionCells':
      return `map:${op.mapId}:collision`;
    case 'setCollisionRect':
      return `map:${op.mapId}:collision`;
    case 'createEntityDef':
      return `entityDef:${op.entity.id}`;
    case 'placeEntity':
      return `map:${op.mapId}:entity:${op.instance.id}`;
    case 'moveEntity':
      return `map:${op.mapId}:entity:${op.instanceId}`;
    case 'deleteEntity':
      return `map:${op.mapId}:entity:${op.instanceId}`;
    case 'createTrigger':
      return `map:${op.mapId}:trigger:${op.trigger.id}`;
    case 'updateTrigger':
      return `map:${op.mapId}:trigger:${op.triggerId}`;
    case 'createDialogue':
      return `dialogue:${op.dialogue.id}`;
    case 'updateDialogueNode':
      return `dialogue:${op.dialogueId}`;
    case 'createQuest':
      return `quest:${op.quest.id}`;
    case 'updateQuest':
      return `quest:${op.questId}`;
    default:
      return 'unknown';
  }
}

/**
 * Build a filtered inverse patch containing only ops that affect safe hunks.
 *
 * @param inversePatch - The full inverse patch
 * @param safeHunks - List of safe hunk ref strings
 * @param originalPatch - The original forward patch (for reference)
 * @returns New PatchV1 with only safe ops
 */
export function buildFilteredInverse(
  inversePatch: PatchV1,
  safeHunks: string[],
  _originalPatch: PatchV1,
): PatchV1 {
  const safeSet = new Set(safeHunks);

  const filteredOps = inversePatch.ops.filter((op) => {
    const ref = opToHunkRef(op);
    // Check if any safe hunk matches (prefix match for nested refs)
    return safeSet.has(ref) || [...safeSet].some((safe) => ref.startsWith(safe));
  });

  return {
    patchVersion: 1,
    patchId: `filtered-${inversePatch.patchId}`,
    baseSchemaVersion: 1,
    meta: {
      note: `Filtered inverse (${filteredOps.length} of ${inversePatch.ops.length} ops)`,
      createdAt: new Date().toISOString(),
    },
    ops: filteredOps,
  };
}
