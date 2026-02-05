/**
 * Patch Engine v1 - Apply Logic
 *
 * Pure function that applies a validated patch to a project, returning:
 * - New project state (input never mutated)
 * - Change summary
 * - Inverse patch for undo
 *
 * Uses structural sharing to minimize copying - only modified parts are cloned.
 * Assumes patch has already been validated via validatePatch().
 */

import type { Project, GameMap, TileLayer, EntityInstance, TriggerRegion } from '../schema/types.js';
import type {
  PatchV1, PatchOp, ApplyResult, PatchSummary,
} from './types.js';
import { summarizePatch } from './summary.js';

// ============================================================================
// Entity Kind → Schema Type Mapping
// ============================================================================

type EntityKindInput = 'npc' | 'door' | 'chest';
type SchemaEntityType = 'npc' | 'item' | 'door' | 'decoration';

function mapEntityKindToType(kind: EntityKindInput): SchemaEntityType {
  switch (kind) {
    case 'npc': return 'npc';
    case 'door': return 'door';
    case 'chest': return 'item';
    default: return kind as SchemaEntityType;
  }
}

// ============================================================================
// Helper: clone map with structural sharing
// ============================================================================

function cloneMap(map: GameMap): GameMap {
  return {
    ...map,
    tileLayers: { ...map.tileLayers },
    collisionLayer: [...map.collisionLayer],
    entities: [...map.entities],
    triggers: [...map.triggers],
  };
}

function cloneLayer(layer: TileLayer): TileLayer {
  return { ...layer, data: [...layer.data] };
}

// ============================================================================
// Per-Operation Apply Functions + Inverse Generation
// ============================================================================

function applyCreateMap(
  project: Project,
  op: Extract<PatchOp, { op: 'createMap' }>,
  inverseOps: PatchOp[],
): Project {
  const { map: mapDef } = op;
  const size = mapDef.width * mapDef.height;

  const newMap: GameMap = {
    id: mapDef.id,
    name: mapDef.name,
    width: mapDef.width,
    height: mapDef.height,
    tilesetId: mapDef.tilesetId,
    tileLayers: {},
    collisionLayer: new Array(size).fill(0),
    entities: [],
    triggers: [],
  };

  // Store full map data for inverse (delete map by restoring to no-map state)
  // Since there's no "deleteMap" op in v1, inverse will be a special marker
  // We store map data so it can be reconstructed if needed
  inverseOps.push({
    op: 'createMap',
    map: { id: '__DELETE__' + mapDef.id, name: '', tilesetId: mapDef.tilesetId, width: 1, height: 1 },
  } as PatchOp);
  // Note: proper deleteMap inverse would need a deleteMap op type
  // For v1, we mark it and handle in undo by removing the map

  return {
    ...project,
    maps: { ...project.maps, [mapDef.id]: newMap },
  };
}

function applyCreateLayer(
  project: Project,
  op: Extract<PatchOp, { op: 'createLayer' }>,
  inverseOps: PatchOp[],
): Project {
  const map = project.maps[op.mapId];
  const size = map.width * map.height;
  const fillValue = op.fillTileId ?? 0;

  const newLayer: TileLayer = {
    name: op.layer.name,
    data: new Array(size).fill(fillValue),
    zIndex: op.layer.z,
    opacity: 1,
    visible: true,
  };

  const updatedMap: GameMap = {
    ...map,
    tileLayers: { ...map.tileLayers, [op.layer.id]: newLayer },
  };

  // Inverse: remove the layer (by restoring map without it)
  // We'll handle this by not including the layer
  inverseOps.push({
    op: 'clearTiles',
    mapId: op.mapId,
    layerId: op.layer.id,
    cells: [], // marker - real inverse handled specially
  } as PatchOp);

  return {
    ...project,
    maps: { ...project.maps, [op.mapId]: updatedMap },
  };
}

function applyPaintRect(
  project: Project,
  op: Extract<PatchOp, { op: 'paintRect' }>,
  inverseOps: PatchOp[],
): Project {
  const map = project.maps[op.mapId];
  const layer = map.tileLayers[op.layerId];
  const newData = [...layer.data];

  // Capture previous values for inverse
  const prevCells: Array<{ x: number; y: number; tileId: number }> = [];

  for (let dy = 0; dy < op.h; dy++) {
    for (let dx = 0; dx < op.w; dx++) {
      const x = op.x + dx;
      const y = op.y + dy;
      const idx = y * map.width + x;
      prevCells.push({ x, y, tileId: newData[idx] });
      newData[idx] = op.tileId;
    }
  }

  // Inverse: restore previous tile values
  inverseOps.push({
    op: 'setTiles',
    mapId: op.mapId,
    layerId: op.layerId,
    cells: prevCells,
  });

  const newLayer: TileLayer = { ...layer, data: newData };
  const updatedMap: GameMap = {
    ...map,
    tileLayers: { ...map.tileLayers, [op.layerId]: newLayer },
  };

  return {
    ...project,
    maps: { ...project.maps, [op.mapId]: updatedMap },
  };
}

function applySetTiles(
  project: Project,
  op: Extract<PatchOp, { op: 'setTiles' }>,
  inverseOps: PatchOp[],
): Project {
  const map = project.maps[op.mapId];
  const layer = map.tileLayers[op.layerId];
  const newData = [...layer.data];

  // Capture previous values for inverse
  const prevCells: Array<{ x: number; y: number; tileId: number }> = [];

  for (const cell of op.cells) {
    const idx = cell.y * map.width + cell.x;
    prevCells.push({ x: cell.x, y: cell.y, tileId: newData[idx] });
    newData[idx] = cell.tileId;
  }

  // Inverse: restore previous tile values
  inverseOps.push({
    op: 'setTiles',
    mapId: op.mapId,
    layerId: op.layerId,
    cells: prevCells,
  });

  const newLayer: TileLayer = { ...layer, data: newData };
  const updatedMap: GameMap = {
    ...map,
    tileLayers: { ...map.tileLayers, [op.layerId]: newLayer },
  };

  return {
    ...project,
    maps: { ...project.maps, [op.mapId]: updatedMap },
  };
}

function applyClearTiles(
  project: Project,
  op: Extract<PatchOp, { op: 'clearTiles' }>,
  inverseOps: PatchOp[],
): Project {
  const map = project.maps[op.mapId];
  const layer = map.tileLayers[op.layerId];
  const newData = [...layer.data];

  // Capture previous non-zero tile values for inverse
  const prevCells: Array<{ x: number; y: number; tileId: number }> = [];

  for (const cell of op.cells) {
    const idx = cell.y * map.width + cell.x;
    const prevTileId = newData[idx];
    if (prevTileId !== 0) {
      prevCells.push({ x: cell.x, y: cell.y, tileId: prevTileId });
    }
    newData[idx] = 0;
  }

  // Inverse: restore previous tile values
  if (prevCells.length > 0) {
    inverseOps.push({
      op: 'setTiles',
      mapId: op.mapId,
      layerId: op.layerId,
      cells: prevCells,
    });
  }

  const newLayer: TileLayer = { ...layer, data: newData };
  const updatedMap: GameMap = {
    ...map,
    tileLayers: { ...map.tileLayers, [op.layerId]: newLayer },
  };

  return {
    ...project,
    maps: { ...project.maps, [op.mapId]: updatedMap },
  };
}

function applySetCollisionCells(
  project: Project,
  op: Extract<PatchOp, { op: 'setCollisionCells' }>,
  inverseOps: PatchOp[],
): Project {
  const map = project.maps[op.mapId];
  const newCollision = [...map.collisionLayer];

  // Capture previous values for inverse
  const prevCells: Array<{ x: number; y: number; solid: 0 | 1 }> = [];

  for (const cell of op.cells) {
    const idx = cell.y * map.width + cell.x;
    prevCells.push({ x: cell.x, y: cell.y, solid: newCollision[idx] as 0 | 1 });
    newCollision[idx] = cell.solid;
  }

  // Inverse: restore previous collision values
  inverseOps.push({
    op: 'setCollisionCells',
    mapId: op.mapId,
    cells: prevCells,
  });

  const updatedMap: GameMap = { ...map, collisionLayer: newCollision };
  return {
    ...project,
    maps: { ...project.maps, [op.mapId]: updatedMap },
  };
}

function applySetCollisionRect(
  project: Project,
  op: Extract<PatchOp, { op: 'setCollisionRect' }>,
  inverseOps: PatchOp[],
): Project {
  const map = project.maps[op.mapId];
  const newCollision = [...map.collisionLayer];

  // Capture previous values for inverse
  const prevCells: Array<{ x: number; y: number; solid: 0 | 1 }> = [];

  for (let dy = 0; dy < op.h; dy++) {
    for (let dx = 0; dx < op.w; dx++) {
      const x = op.x + dx;
      const y = op.y + dy;
      const idx = y * map.width + x;
      prevCells.push({ x, y, solid: newCollision[idx] as 0 | 1 });
      newCollision[idx] = op.solid;
    }
  }

  // Inverse: restore previous collision values
  inverseOps.push({
    op: 'setCollisionCells',
    mapId: op.mapId,
    cells: prevCells,
  });

  const updatedMap: GameMap = { ...map, collisionLayer: newCollision };
  return {
    ...project,
    maps: { ...project.maps, [op.mapId]: updatedMap },
  };
}

function applyCreateEntityDef(
  project: Project,
  op: Extract<PatchOp, { op: 'createEntityDef' }>,
  inverseOps: PatchOp[],
): Project {
  const { entity } = op;

  const newEntityDef = {
    id: entity.id,
    type: mapEntityKindToType(entity.kind) as 'npc' | 'item' | 'door' | 'decoration',
    name: entity.name ?? entity.id,
    sprite: {
      tilesetId: entity.sprite.tilesetId,
      tileIndex: entity.sprite.tileId,
    },
    ...(entity.behavior?.dialogueId ? {
      interaction: {
        type: 'dialogue' as const,
        data: { dialogueId: entity.behavior.dialogueId },
      },
    } : {}),
  };

  // Inverse: delete the entity def (store full data for restore)
  // Since there's no deleteEntityDef op, we track it for inverse
  inverseOps.push({
    op: 'deleteEntity',
    mapId: '__ENTITYDEF__',
    instanceId: entity.id,
  } as PatchOp);

  return {
    ...project,
    entityDefs: { ...project.entityDefs, [entity.id]: newEntityDef },
  };
}

function applyPlaceEntity(
  project: Project,
  op: Extract<PatchOp, { op: 'placeEntity' }>,
  inverseOps: PatchOp[],
): Project {
  const map = project.maps[op.mapId];
  const newInstance: EntityInstance = {
    instanceId: op.instance.id,
    entityDefId: op.instance.entityId,
    position: { x: op.instance.x, y: op.instance.y },
  };

  const updatedMap: GameMap = {
    ...map,
    entities: [...map.entities, newInstance],
  };

  // Inverse: delete this entity instance
  inverseOps.push({
    op: 'deleteEntity',
    mapId: op.mapId,
    instanceId: op.instance.id,
  });

  return {
    ...project,
    maps: { ...project.maps, [op.mapId]: updatedMap },
  };
}

function applyMoveEntity(
  project: Project,
  op: Extract<PatchOp, { op: 'moveEntity' }>,
  inverseOps: PatchOp[],
): Project {
  const map = project.maps[op.mapId];
  const entityIndex = map.entities.findIndex(e => e.instanceId === op.instanceId);
  const entity = map.entities[entityIndex];
  const prevX = entity.position.x;
  const prevY = entity.position.y;

  const newEntities = [...map.entities];
  newEntities[entityIndex] = {
    ...entity,
    position: { x: op.x, y: op.y },
  };

  // Inverse: move back to previous position
  inverseOps.push({
    op: 'moveEntity',
    mapId: op.mapId,
    instanceId: op.instanceId,
    x: prevX,
    y: prevY,
  });

  const updatedMap: GameMap = { ...map, entities: newEntities };
  return {
    ...project,
    maps: { ...project.maps, [op.mapId]: updatedMap },
  };
}

function applyDeleteEntity(
  project: Project,
  op: Extract<PatchOp, { op: 'deleteEntity' }>,
  inverseOps: PatchOp[],
): Project {
  const map = project.maps[op.mapId];
  const entity = map.entities.find(e => e.instanceId === op.instanceId)!;

  // Inverse: re-place the entity
  inverseOps.push({
    op: 'placeEntity',
    mapId: op.mapId,
    instance: {
      id: entity.instanceId,
      entityId: entity.entityDefId,
      x: entity.position.x,
      y: entity.position.y,
    },
  });

  const updatedMap: GameMap = {
    ...map,
    entities: map.entities.filter(e => e.instanceId !== op.instanceId),
  };

  return {
    ...project,
    maps: { ...project.maps, [op.mapId]: updatedMap },
  };
}

function applyCreateTrigger(
  project: Project,
  op: Extract<PatchOp, { op: 'createTrigger' }>,
  inverseOps: PatchOp[],
): Project {
  const map = project.maps[op.mapId];
  const r = op.trigger.rect;

  const newTrigger: TriggerRegion = {
    id: op.trigger.id,
    name: op.trigger.id, // Default name to ID
    bounds: { x: r.x, y: r.y, width: r.w, height: r.h },
    events: {
      ...(op.trigger.onEnter ? { onEnter: op.trigger.onEnter } : {}),
      ...(op.trigger.onInteract ? { onInteract: op.trigger.onInteract } : {}),
    },
    activation: {},
  };

  // Inverse: delete this trigger (store full data)
  // We'll use updateTrigger with empty patch as a marker for deletion
  inverseOps.push({
    op: 'updateTrigger',
    mapId: op.mapId,
    triggerId: '__DELETE__' + op.trigger.id,
    patch: {},
  } as PatchOp);

  const updatedMap: GameMap = {
    ...map,
    triggers: [...map.triggers, newTrigger],
  };

  return {
    ...project,
    maps: { ...project.maps, [op.mapId]: updatedMap },
  };
}

function applyUpdateTrigger(
  project: Project,
  op: Extract<PatchOp, { op: 'updateTrigger' }>,
  inverseOps: PatchOp[],
): Project {
  const map = project.maps[op.mapId];
  const triggerIndex = map.triggers.findIndex(t => t.id === op.triggerId);
  const trigger = map.triggers[triggerIndex];

  // Build inverse patch with previous values
  const inversePatch: Record<string, unknown> = {};
  if (op.patch.rect) {
    inversePatch.rect = {
      x: trigger.bounds.x,
      y: trigger.bounds.y,
      w: trigger.bounds.width,
      h: trigger.bounds.height,
    };
  }
  if (op.patch.onEnter !== undefined) {
    inversePatch.onEnter = trigger.events.onEnter ?? [];
  }
  if (op.patch.onInteract !== undefined) {
    inversePatch.onInteract = trigger.events.onInteract ?? [];
  }

  inverseOps.push({
    op: 'updateTrigger',
    mapId: op.mapId,
    triggerId: op.triggerId,
    patch: inversePatch,
  } as PatchOp);

  // Apply updates
  const updatedTrigger: TriggerRegion = { ...trigger };
  if (op.patch.rect) {
    updatedTrigger.bounds = {
      x: op.patch.rect.x,
      y: op.patch.rect.y,
      width: op.patch.rect.w,
      height: op.patch.rect.h,
    };
  }
  if (op.patch.onEnter !== undefined) {
    updatedTrigger.events = { ...updatedTrigger.events, onEnter: op.patch.onEnter };
  }
  if (op.patch.onInteract !== undefined) {
    updatedTrigger.events = { ...updatedTrigger.events, onInteract: op.patch.onInteract };
  }

  const newTriggers = [...map.triggers];
  newTriggers[triggerIndex] = updatedTrigger;

  const updatedMap: GameMap = { ...map, triggers: newTriggers };
  return {
    ...project,
    maps: { ...project.maps, [op.mapId]: updatedMap },
  };
}

function applyCreateDialogue(
  project: Project,
  op: Extract<PatchOp, { op: 'createDialogue' }>,
  inverseOps: PatchOp[],
): Project {
  // Inverse: delete dialogue (store ID for reference)
  inverseOps.push({
    op: 'updateDialogueNode',
    dialogueId: '__DELETE__' + op.dialogue.id,
    nodeId: '',
    patch: {},
  } as PatchOp);

  return {
    ...project,
    dialogues: { ...project.dialogues, [op.dialogue.id]: op.dialogue },
  };
}

function applyUpdateDialogueNode(
  project: Project,
  op: Extract<PatchOp, { op: 'updateDialogueNode' }>,
  inverseOps: PatchOp[],
): Project {
  const dialogue = project.dialogues[op.dialogueId];
  const node = dialogue.nodes[op.nodeId];

  // Build inverse patch with previous values
  const inversePatch: Record<string, unknown> = {};
  if (op.patch.text !== undefined) inversePatch.text = node.text;
  if (op.patch.speaker !== undefined) inversePatch.speaker = node.speaker;
  if (op.patch.choices !== undefined) inversePatch.choices = node.choices;
  if (op.patch.next !== undefined) inversePatch.next = node.next;

  inverseOps.push({
    op: 'updateDialogueNode',
    dialogueId: op.dialogueId,
    nodeId: op.nodeId,
    patch: inversePatch,
  } as PatchOp);

  // Apply updates
  const updatedNode = { ...node };
  if (op.patch.text !== undefined) updatedNode.text = op.patch.text;
  if (op.patch.speaker !== undefined) updatedNode.speaker = op.patch.speaker;
  if (op.patch.choices !== undefined) updatedNode.choices = op.patch.choices;
  if (op.patch.next !== undefined) updatedNode.next = op.patch.next;

  return {
    ...project,
    dialogues: {
      ...project.dialogues,
      [op.dialogueId]: {
        ...dialogue,
        nodes: { ...dialogue.nodes, [op.nodeId]: updatedNode },
      },
    },
  };
}

function applyCreateQuest(
  project: Project,
  op: Extract<PatchOp, { op: 'createQuest' }>,
  inverseOps: PatchOp[],
): Project {
  // Inverse: delete quest (store ID for reference)
  inverseOps.push({
    op: 'updateQuest',
    questId: '__DELETE__' + op.quest.id,
    patch: {},
  } as PatchOp);

  const quests = project.quests ?? {};
  return {
    ...project,
    quests: { ...quests, [op.quest.id]: op.quest },
  };
}

function applyUpdateQuest(
  project: Project,
  op: Extract<PatchOp, { op: 'updateQuest' }>,
  inverseOps: PatchOp[],
): Project {
  const quests = project.quests ?? {};
  const quest = quests[op.questId];

  // Build inverse patch with previous values
  const inversePatch: Record<string, unknown> = {};
  if (op.patch.name !== undefined) inversePatch.name = quest.name;
  if (op.patch.description !== undefined) inversePatch.description = quest.description;
  if (op.patch.stages !== undefined) inversePatch.stages = quest.stages;
  if (op.patch.status !== undefined) inversePatch.status = quest.status;

  inverseOps.push({
    op: 'updateQuest',
    questId: op.questId,
    patch: inversePatch,
  } as PatchOp);

  return {
    ...project,
    quests: { ...quests, [op.questId]: { ...quest, ...op.patch } },
  };
}

// ============================================================================
// Main Apply Function
// ============================================================================

/**
 * Applies a validated patch to a project, returning the new project state,
 * a change summary, and an inverse patch for undo.
 *
 * **Important**: Always call validatePatch() before applyPatch().
 * This function assumes the patch has been validated.
 *
 * Operations are applied sequentially in array order. The input project
 * is never mutated - a new project object is returned using structural sharing.
 *
 * @param project - Current project state (never mutated)
 * @param patch - Validated patch to apply
 * @returns ApplyResult with new project, summary, and inverse patch
 */
export function applyPatch(project: Project, patch: PatchV1): ApplyResult {
  // Handle empty patch
  if (patch.ops.length === 0) {
    return {
      project,
      summary: {
        created: { maps: [], entities: [], dialogues: [], quests: [], triggers: [] },
        modified: { maps: [], entities: [], dialogues: [], quests: [], triggers: [] },
        deleted: { maps: [], entities: [], dialogues: [], quests: [], triggers: [] },
      },
      inverse: {
        patchVersion: 1,
        patchId: `inverse-${patch.patchId}`,
        baseSchemaVersion: 1,
        meta: {
          note: `Inverse of patch ${patch.patchId}`,
          createdAt: new Date().toISOString(),
        },
        ops: [],
      },
    };
  }

  let result = project;
  const inverseOps: PatchOp[] = [];

  // Apply each operation
  for (const op of patch.ops) {
    switch (op.op) {
      case 'createMap':
        result = applyCreateMap(result, op, inverseOps);
        break;
      case 'createLayer':
        result = applyCreateLayer(result, op, inverseOps);
        break;
      case 'paintRect':
        result = applyPaintRect(result, op, inverseOps);
        break;
      case 'setTiles':
        result = applySetTiles(result, op, inverseOps);
        break;
      case 'clearTiles':
        result = applyClearTiles(result, op, inverseOps);
        break;
      case 'setCollisionCells':
        result = applySetCollisionCells(result, op, inverseOps);
        break;
      case 'setCollisionRect':
        result = applySetCollisionRect(result, op, inverseOps);
        break;
      case 'createEntityDef':
        result = applyCreateEntityDef(result, op, inverseOps);
        break;
      case 'placeEntity':
        result = applyPlaceEntity(result, op, inverseOps);
        break;
      case 'moveEntity':
        result = applyMoveEntity(result, op, inverseOps);
        break;
      case 'deleteEntity':
        result = applyDeleteEntity(result, op, inverseOps);
        break;
      case 'createTrigger':
        result = applyCreateTrigger(result, op, inverseOps);
        break;
      case 'updateTrigger':
        result = applyUpdateTrigger(result, op, inverseOps);
        break;
      case 'createDialogue':
        result = applyCreateDialogue(result, op, inverseOps);
        break;
      case 'updateDialogueNode':
        result = applyUpdateDialogueNode(result, op, inverseOps);
        break;
      case 'createQuest':
        result = applyCreateQuest(result, op, inverseOps);
        break;
      case 'updateQuest':
        result = applyUpdateQuest(result, op, inverseOps);
        break;
    }
  }

  // Build inverse patch (ops in reverse order)
  const inverse: PatchV1 = {
    patchVersion: 1,
    patchId: `inverse-${patch.patchId}`,
    baseSchemaVersion: 1,
    meta: {
      note: `Inverse of patch ${patch.patchId}`,
      createdAt: new Date().toISOString(),
    },
    ops: inverseOps.reverse(),
  };

  // Generate summary by comparing before and after
  const summary = summarizePatch(project, result);

  return { project: result, summary, inverse };
}
