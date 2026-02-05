/**
 * Project Schema v1 Validator
 *
 * Validates project JSON files against the schema with two layers:
 * 1. Structural validation via Zod (types, required fields, enums)
 * 2. Semantic validation (referential integrity, bounds checking, array lengths)
 *
 * All errors follow the ValidationError format with code, message, path, and suggestion.
 */

import { ZodError } from 'zod';
import { ProjectSchema, type Project } from './types.js';
import {
  type ValidationError,
  type ValidationResult,
  ValidationErrorCode,
} from './errors.js';

/**
 * Validates a project object against the Project Schema v1.
 *
 * Performs:
 * 1. Zod schema parsing (structural validation)
 * 2. Referential integrity checks (tilesetId, entityDefId, dialogueId references)
 * 3. Array length validation (tile layers, collision layer match map dimensions)
 * 4. Bounds checking (tile indices, entity positions, trigger regions, spawn point)
 *
 * @param data - Raw project data (typically parsed from JSON)
 * @returns ValidationResult with valid flag and array of errors
 */
export function validateProject(data: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  // ──────────────────────────────────────────────────────────────────────────
  // Step 1: Zod structural validation
  // ──────────────────────────────────────────────────────────────────────────
  let project: Project;
  try {
    project = ProjectSchema.parse(data);
  } catch (err) {
    if (err instanceof ZodError) {
      for (const issue of err.issues) {
        const path = issue.path.join('.');
        errors.push({
          code: ValidationErrorCode.SCHEMA_VALIDATION_FAILED,
          message: issue.message,
          path: path || '(root)',
          suggestion: `Check the field at '${path || '(root)'}' matches the expected type and format.`,
        });
      }
    } else {
      errors.push({
        code: ValidationErrorCode.SCHEMA_VALIDATION_FAILED,
        message: String(err),
        path: '(root)',
      });
    }
    return { valid: false, errors };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Step 2: Referential integrity checks
  // ──────────────────────────────────────────────────────────────────────────

  // T030: Validate tilesetId references in maps
  for (const [mapId, map] of Object.entries(project.maps)) {
    if (!(map.tilesetId in project.tilesets)) {
      errors.push({
        code: ValidationErrorCode.INVALID_REFERENCE,
        message: `Map '${mapId}' references tileset '${map.tilesetId}' which does not exist`,
        path: `maps.${mapId}.tilesetId`,
        suggestion: `Available tilesets: ${Object.keys(project.tilesets).join(', ') || '(none)'}`,
      });
    }

    // T031: Validate entityDefId references in entity instances
    for (let i = 0; i < map.entities.length; i++) {
      const entity = map.entities[i];
      if (!(entity.entityDefId in project.entityDefs)) {
        errors.push({
          code: ValidationErrorCode.INVALID_REFERENCE,
          message: `Entity instance '${entity.instanceId}' in map '${mapId}' references entityDef '${entity.entityDefId}' which does not exist`,
          path: `maps.${mapId}.entities[${i}].entityDefId`,
          suggestion: `Available entityDefs: ${Object.keys(project.entityDefs).join(', ') || '(none)'}`,
        });
      }
    }
  }

  // T032: Validate dialogueId references in entity interactions
  for (const [defId, entityDef] of Object.entries(project.entityDefs)) {
    if (
      entityDef.interaction?.type === 'dialogue' &&
      entityDef.interaction.data
    ) {
      const dialogueId = (
        entityDef.interaction.data as { dialogueId: string }
      ).dialogueId;
      if (!(dialogueId in project.dialogues)) {
        errors.push({
          code: ValidationErrorCode.INVALID_REFERENCE,
          message: `EntityDef '${defId}' references dialogue '${dialogueId}' which does not exist`,
          path: `entityDefs.${defId}.interaction.data.dialogueId`,
          suggestion: `Available dialogues: ${Object.keys(project.dialogues).join(', ') || '(none)'}`,
        });
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Step 3: Array length validation
  // ──────────────────────────────────────────────────────────────────────────

  for (const [mapId, map] of Object.entries(project.maps)) {
    const expectedLength = map.width * map.height;

    // T033: Tile layer data arrays matching map width x height
    for (const [layerName, layer] of Object.entries(map.tileLayers)) {
      if (layer.data.length !== expectedLength) {
        errors.push({
          code: ValidationErrorCode.ARRAY_LENGTH_MISMATCH,
          message: `Tile layer '${layerName}' in map '${mapId}' has ${layer.data.length} tiles but expected ${expectedLength} (${map.width} x ${map.height})`,
          path: `maps.${mapId}.tileLayers.${layerName}.data`,
          suggestion: `Tile layer data array must have exactly ${expectedLength} elements (width ${map.width} x height ${map.height})`,
        });
      }
    }

    // T034: Collision layer matching map width x height
    if (map.collisionLayer.length !== expectedLength) {
      errors.push({
        code: ValidationErrorCode.ARRAY_LENGTH_MISMATCH,
        message: `Collision layer in map '${mapId}' has ${map.collisionLayer.length} tiles but expected ${expectedLength} (${map.width} x ${map.height})`,
        path: `maps.${mapId}.collisionLayer`,
        suggestion: `Collision layer array must have exactly ${expectedLength} elements (width ${map.width} x height ${map.height})`,
      });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Step 4: Bounds validation
  // ──────────────────────────────────────────────────────────────────────────

  for (const [mapId, map] of Object.entries(project.maps)) {
    const tileset = project.tilesets[map.tilesetId];

    // T035: Tile indices not exceeding tileset tileCount
    if (tileset) {
      for (const [layerName, layer] of Object.entries(map.tileLayers)) {
        for (let i = 0; i < layer.data.length; i++) {
          const tileIndex = layer.data[i];
          if (tileIndex !== 0 && tileIndex >= tileset.tileCount) {
            errors.push({
              code: ValidationErrorCode.TILE_INDEX_OUT_OF_BOUNDS,
              message: `Tile index ${tileIndex} exceeds tileset bounds (max: ${tileset.tileCount - 1}) in layer '${layerName}' of map '${mapId}'`,
              path: `maps.${mapId}.tileLayers.${layerName}.data[${i}]`,
              suggestion: `Tile indices must be 0 (empty) or 1-${tileset.tileCount - 1} for tileset '${map.tilesetId}'`,
            });
          }
        }
      }
    }

    // T036: Entity spawn positions within map dimensions
    for (let i = 0; i < map.entities.length; i++) {
      const entity = map.entities[i];
      if (
        entity.position.x < 0 ||
        entity.position.x >= map.width ||
        entity.position.y < 0 ||
        entity.position.y >= map.height
      ) {
        errors.push({
          code: ValidationErrorCode.POSITION_OUT_OF_BOUNDS,
          message: `Entity '${entity.instanceId}' position (${entity.position.x}, ${entity.position.y}) is outside map '${mapId}' bounds (${map.width}x${map.height})`,
          path: `maps.${mapId}.entities[${i}].position`,
          suggestion: `Position must be within 0-${map.width - 1} (x) and 0-${map.height - 1} (y)`,
        });
      }
    }

    // T037: Trigger region boundaries within map dimensions
    for (let i = 0; i < map.triggers.length; i++) {
      const trigger = map.triggers[i];
      const { bounds } = trigger;
      if (
        bounds.x < 0 ||
        bounds.y < 0 ||
        bounds.x + bounds.width > map.width ||
        bounds.y + bounds.height > map.height
      ) {
        errors.push({
          code: ValidationErrorCode.POSITION_OUT_OF_BOUNDS,
          message: `Trigger '${trigger.id}' bounds exceed map '${mapId}' dimensions (${map.width}x${map.height})`,
          path: `maps.${mapId}.triggers[${i}].bounds`,
          suggestion: `Trigger bounds (${bounds.x},${bounds.y} ${bounds.width}x${bounds.height}) must fit within map (${map.width}x${map.height})`,
        });
      }
    }
  }

  // T038: PlayerSpawn position within starting map dimensions
  const startingMap = project.maps[project.config.startingMap];
  if (startingMap) {
    const spawn = project.config.playerSpawn;
    if (
      spawn.x < 0 ||
      spawn.x >= startingMap.width ||
      spawn.y < 0 ||
      spawn.y >= startingMap.height
    ) {
      errors.push({
        code: ValidationErrorCode.POSITION_OUT_OF_BOUNDS,
        message: `Player spawn position (${spawn.x}, ${spawn.y}) is outside starting map '${project.config.startingMap}' bounds (${startingMap.width}x${startingMap.height})`,
        path: 'config.playerSpawn',
        suggestion: `Spawn position must be within 0-${startingMap.width - 1} (x) and 0-${startingMap.height - 1} (y)`,
      });
    }
  }

  // T039: startingMap reference exists in maps collection
  if (!(project.config.startingMap in project.maps)) {
    errors.push({
      code: ValidationErrorCode.INVALID_REFERENCE,
      message: `Starting map '${project.config.startingMap}' does not exist in maps collection`,
      path: 'config.startingMap',
      suggestion: `Available maps: ${Object.keys(project.maps).join(', ') || '(none)'}`,
    });
  }

  // T040: Dialogue rootNodeId exists in nodes collection
  for (const [dialogueId, dialogue] of Object.entries(project.dialogues)) {
    if (!(dialogue.rootNodeId in dialogue.nodes)) {
      errors.push({
        code: ValidationErrorCode.DIALOGUE_ROOT_NOT_FOUND,
        message: `Dialogue '${dialogueId}' rootNodeId '${dialogue.rootNodeId}' does not exist in nodes`,
        path: `dialogues.${dialogueId}.rootNodeId`,
        suggestion: `Available nodes: ${Object.keys(dialogue.nodes).join(', ') || '(none)'}`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
