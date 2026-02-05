/**
 * Patch Engine v1 - Summary Generation
 *
 * Generates human-readable PatchSummary by comparing before and after project states.
 * Summary is derived from actual changes, not from operation intent.
 */

import type { Project } from '../schema/types.js';
import type { PatchSummary, ResourceSummary, TileEditSummary, CollisionEditSummary } from './types.js';

/**
 * Creates an empty ResourceSummary with no resources listed.
 */
function emptyResourceSummary(): ResourceSummary {
  return { maps: [], entities: [], dialogues: [], quests: [], triggers: [] };
}

/**
 * Generates a comprehensive summary of changes between two project states.
 *
 * Compares before and after states to determine:
 * - Created resources (new IDs)
 * - Modified resources (changed data)
 * - Deleted resources (removed IDs)
 * - Tile edit counts per map/layer
 * - Collision edit counts per map
 *
 * @param before - Project state before patch application
 * @param after - Project state after patch application
 * @returns PatchSummary with complete change report
 */
export function summarizePatch(before: Project, after: Project): PatchSummary {
  const created = emptyResourceSummary();
  const modified = emptyResourceSummary();
  const deleted = emptyResourceSummary();
  const tileEdits: TileEditSummary[] = [];
  const collisionEdits: CollisionEditSummary[] = [];

  // ─── Maps ──────────────────────────────────────────────────────────
  const beforeMapIds = new Set(Object.keys(before.maps));
  const afterMapIds = new Set(Object.keys(after.maps));

  for (const mapId of afterMapIds) {
    if (!beforeMapIds.has(mapId)) {
      created.maps.push(mapId);
    }
  }
  for (const mapId of beforeMapIds) {
    if (!afterMapIds.has(mapId)) {
      deleted.maps.push(mapId);
    }
  }

  // Check for modified maps (tiles, collision, entities, triggers)
  for (const mapId of afterMapIds) {
    if (!beforeMapIds.has(mapId)) continue; // Already counted as created

    const bMap = before.maps[mapId];
    const aMap = after.maps[mapId];
    let mapModified = false;

    // Compare tile layers
    const bLayerIds = new Set(Object.keys(bMap.tileLayers));
    const aLayerIds = new Set(Object.keys(aMap.tileLayers));

    for (const layerId of aLayerIds) {
      if (!bLayerIds.has(layerId)) {
        // New layer
        const layerData = aMap.tileLayers[layerId].data;
        const nonEmpty = layerData.filter(t => t !== 0).length;
        if (nonEmpty > 0 || layerData.length > 0) {
          tileEdits.push({ mapId, layerId, changedCells: layerData.length });
        }
        mapModified = true;
        continue;
      }

      // Compare existing layer data
      const bData = bMap.tileLayers[layerId].data;
      const aData = aMap.tileLayers[layerId].data;
      let changedCells = 0;
      const len = Math.max(bData.length, aData.length);
      for (let i = 0; i < len; i++) {
        if ((bData[i] ?? 0) !== (aData[i] ?? 0)) {
          changedCells++;
        }
      }
      if (changedCells > 0) {
        tileEdits.push({ mapId, layerId, changedCells });
        mapModified = true;
      }
    }

    // Compare collision layers
    let collisionChanged = 0;
    const bColl = bMap.collisionLayer;
    const aColl = aMap.collisionLayer;
    const collLen = Math.max(bColl.length, aColl.length);
    for (let i = 0; i < collLen; i++) {
      if ((bColl[i] ?? 0) !== (aColl[i] ?? 0)) {
        collisionChanged++;
      }
    }
    if (collisionChanged > 0) {
      collisionEdits.push({ mapId, changedCells: collisionChanged });
      mapModified = true;
    }

    // Compare entities
    if (bMap.entities.length !== aMap.entities.length ||
        JSON.stringify(bMap.entities) !== JSON.stringify(aMap.entities)) {
      mapModified = true;
    }

    // Compare triggers
    if (bMap.triggers.length !== aMap.triggers.length ||
        JSON.stringify(bMap.triggers) !== JSON.stringify(aMap.triggers)) {
      mapModified = true;
    }

    if (mapModified) {
      modified.maps.push(mapId);
    }
  }

  // ─── Entity Definitions ────────────────────────────────────────────
  const beforeEntityIds = new Set(Object.keys(before.entityDefs));
  const afterEntityIds = new Set(Object.keys(after.entityDefs));

  for (const id of afterEntityIds) {
    if (!beforeEntityIds.has(id)) {
      created.entities.push(id);
    } else if (JSON.stringify(before.entityDefs[id]) !== JSON.stringify(after.entityDefs[id])) {
      modified.entities.push(id);
    }
  }
  for (const id of beforeEntityIds) {
    if (!afterEntityIds.has(id)) {
      deleted.entities.push(id);
    }
  }

  // Also track entity instances created/deleted across maps
  for (const mapId of afterMapIds) {
    const aMap = after.maps[mapId];
    const bMap = beforeMapIds.has(mapId) ? before.maps[mapId] : undefined;
    const bInstanceIds = new Set(bMap?.entities.map(e => e.instanceId) ?? []);

    for (const entity of aMap.entities) {
      if (!bInstanceIds.has(entity.instanceId)) {
        if (!created.entities.includes(entity.instanceId)) {
          created.entities.push(entity.instanceId);
        }
      }
    }
  }
  for (const mapId of beforeMapIds) {
    const bMap = before.maps[mapId];
    const aMap = afterMapIds.has(mapId) ? after.maps[mapId] : undefined;
    const aInstanceIds = new Set(aMap?.entities.map(e => e.instanceId) ?? []);

    for (const entity of bMap.entities) {
      if (!aInstanceIds.has(entity.instanceId)) {
        if (!deleted.entities.includes(entity.instanceId)) {
          deleted.entities.push(entity.instanceId);
        }
      }
    }
  }

  // ─── Dialogues ─────────────────────────────────────────────────────
  const beforeDialogueIds = new Set(Object.keys(before.dialogues));
  const afterDialogueIds = new Set(Object.keys(after.dialogues));

  for (const id of afterDialogueIds) {
    if (!beforeDialogueIds.has(id)) {
      created.dialogues.push(id);
    } else if (JSON.stringify(before.dialogues[id]) !== JSON.stringify(after.dialogues[id])) {
      modified.dialogues.push(id);
    }
  }
  for (const id of beforeDialogueIds) {
    if (!afterDialogueIds.has(id)) {
      deleted.dialogues.push(id);
    }
  }

  // ─── Quests ────────────────────────────────────────────────────────
  const beforeQuests = before.quests ?? {};
  const afterQuests = after.quests ?? {};
  const beforeQuestIds = new Set(Object.keys(beforeQuests));
  const afterQuestIds = new Set(Object.keys(afterQuests));

  for (const id of afterQuestIds) {
    if (!beforeQuestIds.has(id)) {
      created.quests.push(id);
    } else if (JSON.stringify(beforeQuests[id]) !== JSON.stringify(afterQuests[id])) {
      modified.quests.push(id);
    }
  }
  for (const id of beforeQuestIds) {
    if (!afterQuestIds.has(id)) {
      deleted.quests.push(id);
    }
  }

  // ─── Triggers ──────────────────────────────────────────────────────
  for (const mapId of afterMapIds) {
    const aMap = after.maps[mapId];
    const bMap = beforeMapIds.has(mapId) ? before.maps[mapId] : undefined;
    const bTriggerIds = new Set(bMap?.triggers.map(t => t.id) ?? []);

    for (const trigger of aMap.triggers) {
      if (!bTriggerIds.has(trigger.id)) {
        created.triggers.push(trigger.id);
      }
    }
  }
  for (const mapId of beforeMapIds) {
    const bMap = before.maps[mapId];
    const aMap = afterMapIds.has(mapId) ? after.maps[mapId] : undefined;
    const aTriggerIds = new Set(aMap?.triggers.map(t => t.id) ?? []);

    for (const trigger of bMap.triggers) {
      if (!aTriggerIds.has(trigger.id)) {
        deleted.triggers.push(trigger.id);
      } else {
        // Check if trigger was modified
        const aTrigger = aMap!.triggers.find(t => t.id === trigger.id);
        if (aTrigger && JSON.stringify(trigger) !== JSON.stringify(aTrigger)) {
          if (!modified.triggers.includes(trigger.id)) {
            modified.triggers.push(trigger.id);
          }
        }
      }
    }
  }

  return {
    created,
    modified,
    deleted,
    ...(tileEdits.length > 0 ? { tileEdits } : {}),
    ...(collisionEdits.length > 0 ? { collisionEdits } : {}),
  };
}
