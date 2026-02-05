# @ai-rpg-maker/shared

Shared schema types and validation library for the AI RPG Maker.

## Overview

This package provides:

- **Zod Schema Definitions** - Runtime-validated schema for RPG projects
- **TypeScript Types** - Automatically inferred from Zod schemas
- **Project Validator** - Comprehensive validation with actionable error messages

## Usage

```typescript
import { validateProject, type Project, type ValidationResult } from '@ai-rpg-maker/shared';

// Validate a project object
const result: ValidationResult = validateProject(projectData);

if (!result.valid) {
  result.errors.forEach(err => {
    console.error(`[${err.code}] ${err.message}`);
    console.error(`  Path: ${err.path}`);
    if (err.suggestion) {
      console.error(`  Fix: ${err.suggestion}`);
    }
  });
}
```

## Schema Structure

The Project Schema v1 defines:

| Entity | Description |
|--------|-------------|
| `Project` | Root container with version, metadata, config |
| `Tileset` | Sprite sheet definition (image path, tile dimensions) |
| `GameMap` | Map with tile layers, collision, entities, triggers |
| `TileLayer` | Single layer of tiles (flat array, `index = y * width + x`) |
| `EntityDef` | Reusable entity template (NPC, item, door, decoration) |
| `EntityInstance` | Specific placement of an entity on a map |
| `TriggerRegion` | Invisible area that fires events on enter/interact |
| `DialogueGraph` | Conversation tree with nodes and choices |
| `Quest` | Placeholder quest structure (v1) |

## Validation Rules

The validator checks:

1. **Structural validation** - All required fields present with correct types (via Zod)
2. **Referential integrity** - Tileset, entity, and dialogue ID references resolve
3. **Array lengths** - Tile layer and collision arrays match `width x height`
4. **Bounds checking** - Tile indices within tileset range, positions within map bounds
5. **Spawn validation** - Player spawn on starting map within bounds

## Building

```bash
npm run build    # Compile TypeScript to dist/
npm test         # Run validation unit tests
npm run test:watch  # Run tests in watch mode
```

## Error Codes

| Code | Description |
|------|-------------|
| `SCHEMA_VALIDATION_FAILED` | Zod parse error (type/format) |
| `TILE_INDEX_OUT_OF_BOUNDS` | Tile index exceeds tileset size |
| `INVALID_REFERENCE` | ID reference to non-existent entity |
| `ARRAY_LENGTH_MISMATCH` | Layer data size != width x height |
| `POSITION_OUT_OF_BOUNDS` | Position outside map dimensions |
| `DIALOGUE_ROOT_NOT_FOUND` | Dialogue rootNodeId missing |
