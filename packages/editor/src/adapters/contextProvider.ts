/**
 * Context Provider — Enhanced context for AI proposals
 *
 * Extends buildProjectSummary with tile data for the active map
 * and full entity/trigger details. For large projects (>30 maps),
 * includes only active map tile data and summarizes others.
 */

import type { Project, GameMap } from '@ai-rpg-maker/shared';
import { buildProjectSummary } from '@ai-rpg-maker/shared';
import type { ProjectSummary } from '@ai-rpg-maker/shared';

export interface EnhancedContext {
  /** Base project summary */
  summary: ProjectSummary;
  /** Active map tile data (if available) */
  activeMapTiles?: Record<string, number[]>;
  /** Active map entity details */
  activeMapEntities?: Array<{
    instanceId: string;
    entityDefId: string;
    x: number;
    y: number;
  }>;
  /** Active map trigger details */
  activeMapTriggers?: Array<{
    id: string;
    name: string;
    bounds: { x: number; y: number; width: number; height: number };
  }>;
  /** Context metadata for debug display */
  contextSlicesRequested: {
    mapSliceCount: number;
    entityDetailCount: number;
    triggerDetailCount: number;
    isLargeProject: boolean;
  };
}

/**
 * Build enhanced context for the AI panel.
 *
 * For the active map, includes full tile data and entity/trigger details.
 * For large projects (>30 maps), only includes the active map.
 */
export function buildEnhancedContext(
  project: Project,
  activeMapId: string | null,
): EnhancedContext {
  const summary = buildProjectSummary(project);
  const mapCount = Object.keys(project.maps).length;
  const isLargeProject = mapCount > 30;

  const result: EnhancedContext = {
    summary,
    contextSlicesRequested: {
      mapSliceCount: 0,
      entityDetailCount: 0,
      triggerDetailCount: 0,
      isLargeProject,
    },
  };

  if (activeMapId && project.maps[activeMapId]) {
    const map = project.maps[activeMapId];

    // Include tile data for the active map
    result.activeMapTiles = {};
    for (const [layerId, layer] of Object.entries(map.tileLayers)) {
      result.activeMapTiles[layerId] = layer.data;
    }
    result.contextSlicesRequested.mapSliceCount = Object.keys(map.tileLayers).length;

    // Include entity details
    result.activeMapEntities = map.entities.map((e) => ({
      instanceId: e.instanceId,
      entityDefId: e.entityDefId,
      x: e.position.x,
      y: e.position.y,
    }));
    result.contextSlicesRequested.entityDetailCount = map.entities.length;

    // Include trigger details
    result.activeMapTriggers = map.triggers.map((t) => ({
      id: t.id,
      name: t.name,
      bounds: t.bounds,
    }));
    result.contextSlicesRequested.triggerDetailCount = map.triggers.length;
  }

  return result;
}

/**
 * Helper: get a tile data slice for a specific map region.
 */
export function getMapSlice(
  map: GameMap,
  region?: { x: number; y: number; width: number; height: number },
): Record<string, number[]> {
  const result: Record<string, number[]> = {};

  for (const [layerId, layer] of Object.entries(map.tileLayers)) {
    if (region) {
      // Extract only the region
      const sliceData: number[] = [];
      for (let y = region.y; y < region.y + region.height && y < map.height; y++) {
        for (let x = region.x; x < region.x + region.width && x < map.width; x++) {
          sliceData.push(layer.data[y * map.width + x]);
        }
      }
      result[layerId] = sliceData;
    } else {
      result[layerId] = layer.data;
    }
  }

  return result;
}

/**
 * Helper: get entity definition details.
 */
export function getEntityDef(
  project: Project,
  id: string,
): { id: string; type: string; name: string } | null {
  const def = project.entityDefs[id];
  if (!def) return null;
  return { id: def.id, type: def.type, name: def.name };
}

/**
 * Helper: get all triggers for a map.
 */
export function getTriggers(
  project: Project,
  mapId: string,
): Array<{ id: string; name: string; bounds: { x: number; y: number; width: number; height: number } }> {
  const map = project.maps[mapId];
  if (!map) return [];
  return map.triggers.map((t) => ({
    id: t.id,
    name: t.name,
    bounds: t.bounds,
  }));
}
