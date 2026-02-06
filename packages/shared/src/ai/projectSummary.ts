/**
 * AI Orchestration - Project Summary Generation
 *
 * Builds a token-efficient representation of project state for AI context.
 * All IDs are sorted for deterministic output.
 * Full tile/collision arrays are excluded to reduce token count.
 */

import type { Project } from '../schema/types.js';
import type {
  ProjectSummary,
  TilesetSummary,
  MapSummary,
  EntityDefSummary,
  TriggerSummary,
  SummaryOptions,
} from './types.js';
import { DEFAULT_GUARDRAILS } from './types.js';

/**
 * Build a token-efficient project summary for AI context.
 *
 * @param project - Current project state
 * @param options - Optional configuration (detail level, filtering)
 * @returns ProjectSummary with deterministic ordering
 */
export function buildProjectSummary(
  project: Project,
  options?: SummaryOptions,
): ProjectSummary {
  const sortIds = options?.sortIds !== false; // Default: true

  // Build tileset summaries (sorted by ID)
  const tilesets = buildTilesetSummaries(project, sortIds);

  // Build map summaries (sorted by ID)
  const maps = buildMapSummaries(project, sortIds);

  // Build entity def summaries (sorted by typeId)
  const entityDefs = buildEntityDefSummaries(project, sortIds);

  // Build sorted dialogue IDs
  const dialogueIds = Object.keys(project.dialogues);
  if (sortIds) dialogueIds.sort();

  // Build sorted quest IDs
  const questIds = Object.keys(project.quests ?? {});
  if (sortIds) questIds.sort();

  // Build trigger summaries
  const triggers = buildTriggerSummaries(project, sortIds);

  const summary: ProjectSummary = {
    schemaVersion: project.version,
    constraints: { ...DEFAULT_GUARDRAILS },
    tilesets,
    maps,
    entityDefs,
    dialogueIds,
    questIds,
    triggers,
    tokenEstimate: 0, // Will be calculated below
  };

  summary.tokenEstimate = estimateTokens(summary);

  return summary;
}

// ============================================================================
// Internal Helpers
// ============================================================================

function buildTilesetSummaries(
  project: Project,
  sortIds: boolean,
): TilesetSummary[] {
  const entries = Object.values(project.tilesets).map(
    (ts): TilesetSummary => ({
      id: ts.id,
      tileCount: ts.tileCount,
      imagePath: ts.imagePath,
      tileWidth: ts.tileWidth,
      tileHeight: ts.tileHeight,
    }),
  );

  if (sortIds) {
    entries.sort((a, b) => a.id.localeCompare(b.id));
  }

  return entries;
}

function buildMapSummaries(
  project: Project,
  sortIds: boolean,
): MapSummary[] {
  const entries = Object.values(project.maps).map((map): MapSummary => {
    // Sort layer IDs by z-index
    const layerEntries = Object.entries(map.tileLayers);
    layerEntries.sort((a, b) => a[1].zIndex - b[1].zIndex);
    const layerIds = layerEntries.map(([id]) => id);

    return {
      id: map.id,
      width: map.width,
      height: map.height,
      tilesetId: map.tilesetId,
      layerIds,
      entityCount: map.entities.length,
      triggerCount: map.triggers.length,
    };
  });

  if (sortIds) {
    entries.sort((a, b) => a.id.localeCompare(b.id));
  }

  return entries;
}

function buildEntityDefSummaries(
  project: Project,
  sortIds: boolean,
): EntityDefSummary[] {
  // Count instances per entity def across all maps
  const instanceCounts = new Map<string, number>();
  for (const map of Object.values(project.maps)) {
    for (const entity of map.entities) {
      const count = instanceCounts.get(entity.entityDefId) ?? 0;
      instanceCounts.set(entity.entityDefId, count + 1);
    }
  }

  const entries = Object.values(project.entityDefs).map(
    (def): EntityDefSummary => ({
      typeId: def.id,
      instanceCount: instanceCounts.get(def.id) ?? 0,
      hasDialogue:
        def.interaction?.type === 'dialogue' ||
        false,
      isInteractive: def.interaction !== undefined,
      spriteRef: `${def.sprite.tilesetId}:${def.sprite.tileIndex}`,
    }),
  );

  if (sortIds) {
    entries.sort((a, b) => a.typeId.localeCompare(b.typeId));
  }

  return entries;
}

function buildTriggerSummaries(
  project: Project,
  sortIds: boolean,
): TriggerSummary[] {
  const triggers: TriggerSummary[] = [];

  for (const map of Object.values(project.maps)) {
    for (const trigger of map.triggers) {
      // Determine the primary event type
      const events = trigger.events;
      let eventType = 'unknown';
      if (events.onEnter && events.onEnter.length > 0) {
        eventType = events.onEnter[0].type;
      } else if (events.onInteract && events.onInteract.length > 0) {
        eventType = events.onInteract[0].type;
      }

      triggers.push({
        id: trigger.id,
        mapId: map.id,
        eventType,
      });
    }
  }

  if (sortIds) {
    triggers.sort((a, b) => a.id.localeCompare(b.id));
  }

  return triggers;
}

/**
 * Estimate token count for the summary.
 * Uses a rough heuristic: ~4 characters per token for JSON content.
 */
export function estimateTokens(summary: ProjectSummary): number {
  const json = JSON.stringify(summary);
  return Math.ceil(json.length / 4);
}
