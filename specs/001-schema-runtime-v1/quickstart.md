# Quickstart Guide: Project Schema v1 + Excalibur Runtime Compiler v1

**Feature**: 001-schema-runtime-v1  
**Date**: 2026-02-05  
**Audience**: Developers implementing or using the RPG Maker

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Running the Demo](#running-the-demo)
4. [Project Structure](#project-structure)
5. [Creating a Minimal Project](#creating-a-minimal-project)
6. [Validation](#validation)
7. [Development Workflow](#development-workflow)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js**: 20.0.0 or higher ([download](https://nodejs.org/))
- **npm**: 10.0.0 or higher (included with Node.js)
- **Git**: For cloning the repository
- **Modern browser**: Chrome, Firefox, Safari, or Edge (with ES6+ support)

Verify installations:

```bash
node --version   # Should show v20.x or higher
npm --version    # Should show v10.x or higher
```

---

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url> ai-rpg-maker
cd ai-rpg-maker
```

### 2. Install Dependencies

The project uses npm workspaces to manage the monorepo:

```bash
npm install
```

This will install dependencies for all packages (`shared`, `runtime`, `editor`).

### 3. Build Shared Package

The `runtime` package depends on `shared`, so build `shared` first:

```bash
npm run build --workspace=packages/shared
```

---

## Running the Demo

### Option 1: Development Server (Recommended)

Start the Vite dev server for hot reloading:

```bash
npm run dev --workspace=packages/runtime
```

Open your browser to `http://localhost:5173` (or the URL shown in the terminal).

### Option 2: Production Build

Build and preview the production bundle:

```bash
npm run build --workspace=packages/runtime
npm run preview --workspace=packages/runtime
```

Open the preview URL in your browser.

### What to Expect

When the demo loads successfully, you should see:

1. **Tilemap rendered**: A pixel-crisp tilemap (dungeon or example scene)
2. **Player character**: A sprite at the spawn position
3. **Keyboard controls**:
   - Arrow keys or WASD: Move player
   - Spacebar or E: Interact
4. **Collision**: Player cannot walk through blocked tiles
5. **Interaction**: Walking near an NPC or into a trigger region shows a message

---

## Project Structure

```
ai-rpg-maker/
├── packages/
│   ├── shared/              # Schema types + validation
│   │   ├── src/
│   │   │   ├── schema/
│   │   │   │   ├── types.ts       # Zod schemas + TS types
│   │   │   │   ├── validate.ts    # validateProject() function
│   │   │   │   └── errors.ts      # ValidationError types
│   │   │   └── utils/
│   │   ├── tests/
│   │   └── package.json
│   │
│   ├── runtime/             # Excalibur game runtime
│   │   ├── src/
│   │   │   ├── game/              # Engine setup
│   │   │   ├── loader/            # Asset loading
│   │   │   ├── compiler/          # Schema → Excalibur compiler
│   │   │   ├── ui/                # Debug overlay
│   │   │   └── index.ts           # Entry point
│   │   ├── public/
│   │   │   └── index.html
│   │   └── package.json
│   │
│   └── editor/              # Placeholder for future editor
│       └── README.md
│
└── examples/
    └── demo-project/
        ├── project.json           # Demo project data
        └── assets/
            └── tilesets/
                └── dungeon-tileset.png
```

---

## Creating a Minimal Project

### Step 1: Create Project JSON

Create a new `project.json` file with the following minimal structure:

```json
{
  "version": 1,
  "metadata": {
    "name": "My First RPG",
    "createdAt": "2026-02-05T00:00:00Z",
    "updatedAt": "2026-02-05T00:00:00Z"
  },
  "config": {
    "startingMap": "map:start",
    "playerSpawn": { "x": 5, "y": 5 },
    "tileSize": 16,
    "viewportSize": { "width": 20, "height": 15 }
  },
  "tilesets": {
    "tileset:basic": {
      "id": "tileset:basic",
      "name": "Basic Tileset",
      "imagePath": "assets/tilesets/basic.png",
      "tileWidth": 16,
      "tileHeight": 16,
      "tileCount": 16,
      "columns": 4
    }
  },
  "maps": {
    "map:start": {
      "id": "map:start",
      "name": "Starting Room",
      "width": 10,
      "height": 10,
      "tilesetId": "tileset:basic",
      "tileLayers": {
        "ground": {
          "name": "ground",
          "data": [
            1,1,1,1,1,1,1,1,1,1,
            1,2,2,2,2,2,2,2,2,1,
            1,2,2,2,2,2,2,2,2,1,
            1,2,2,2,2,2,2,2,2,1,
            1,2,2,2,2,2,2,2,2,1,
            1,2,2,2,2,2,2,2,2,1,
            1,2,2,2,2,2,2,2,2,1,
            1,2,2,2,2,2,2,2,2,1,
            1,2,2,2,2,2,2,2,2,1,
            1,1,1,1,1,1,1,1,1,1
          ],
          "zIndex": 0,
          "opacity": 1.0,
          "visible": true
        }
      },
      "collisionLayer": [
        1,1,1,1,1,1,1,1,1,1,
        1,0,0,0,0,0,0,0,0,1,
        1,0,0,0,0,0,0,0,0,1,
        1,0,0,0,0,0,0,0,0,1,
        1,0,0,0,0,0,0,0,0,1,
        1,0,0,0,0,0,0,0,0,1,
        1,0,0,0,0,0,0,0,0,1,
        1,0,0,0,0,0,0,0,0,1,
        1,0,0,0,0,0,0,0,0,1,
        1,1,1,1,1,1,1,1,1,1
      ],
      "entities": [
        {
          "instanceId": "instance:npc-test",
          "entityDefId": "npc:guard",
          "position": { "x": 3, "y": 3 }
        }
      ],
      "triggers": []
    }
  },
  "entityDefs": {
    "npc:guard": {
      "id": "npc:guard",
      "type": "npc",
      "name": "Guard",
      "sprite": {
        "tilesetId": "tileset:basic",
        "tileIndex": 8
      },
      "interaction": {
        "type": "dialogue",
        "data": {
          "dialogueId": "dialogue:greeting"
        }
      }
    }
  },
  "dialogues": {
    "dialogue:greeting": {
      "id": "dialogue:greeting",
      "name": "Guard Greeting",
      "rootNodeId": "node-1",
      "nodes": {
        "node-1": {
          "id": "node-1",
          "speaker": "Guard",
          "text": "Greetings, traveler!",
          "next": null
        }
      }
    }
  },
  "quests": {}
}
```

### Step 2: Create Tileset Image

Create a 16x16 pixel tileset PNG with at least 16 tiles (4 columns × 4 rows). Place it at:

```
assets/tilesets/basic.png
```

**Quick Placeholder**: Use any 64x64 pixel image with a 4×4 grid pattern for testing.

### Step 3: Load Project in Runtime

1. Place `project.json` in `examples/my-project/`
2. Update runtime to load your project instead of the demo:

Edit `packages/runtime/src/index.ts`:

```typescript
// Change from:
const projectData = await fetch('/examples/demo-project/project.json');

// To:
const projectData = await fetch('/examples/my-project/project.json');
```

3. Run dev server:

```bash
npm run dev --workspace=packages/runtime
```

---

## Validation

### Validate Project Before Loading

Use the shared validator to check your project JSON:

```typescript
import { validateProject } from '@ai-rpg-maker/shared';

const result = validateProject(projectData);

if (!result.valid) {
  console.error('Validation errors:');
  result.errors.forEach(err => {
    console.error(`[${err.code}] ${err.message}`);
    console.error(`  Path: ${err.path}`);
    if (err.suggestion) {
      console.error(`  Suggestion: ${err.suggestion}`);
    }
  });
}
```

### Common Validation Errors

| Error Code | Meaning | Fix |
|------------|---------|-----|
| `TILE_INDEX_OUT_OF_BOUNDS` | Tile index exceeds tileset size | Ensure tile indices are 0 to `tileCount - 1` |
| `INVALID_REFERENCE` | ID reference doesn't exist | Check that all entity/map/dialogue IDs are defined |
| `ARRAY_LENGTH_MISMATCH` | Tile layer wrong size | Ensure layer data length = `width × height` |
| `POSITION_OUT_OF_BOUNDS` | Entity or spawn outside map | Check that `x < width` and `y < height` |
| `SCHEMA_VERSION_MISMATCH` | Unsupported schema version | Use `version: 1` for this spec |

---

## Development Workflow

### 1. Edit Schema Types

When adding new fields to the schema:

1. Update Zod schemas in `packages/shared/src/schema/types.ts`
2. Rebuild shared package: `npm run build --workspace=packages/shared`
3. TypeScript types auto-update via `z.infer<>`

### 2. Add Validation Rules

Add new validators in `packages/shared/src/schema/validate.ts`:

```typescript
// Example: Validate spawn position is walkable
const spawnTile = map.collisionLayer[
  config.playerSpawn.y * map.width + config.playerSpawn.x
];

if (spawnTile === 1) {
  errors.push({
    code: 'SPAWN_ON_BLOCKED_TILE',
    message: 'Player spawn position is on a blocked tile',
    path: 'config.playerSpawn',
    suggestion: 'Move spawn to a walkable tile (collision value 0)'
  });
}
```

### 3. Test Validation

Add unit tests in `packages/shared/tests/schema/validate.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { validateProject } from '../src/schema/validate';

describe('validateProject', () => {
  it('should reject project with invalid tile index', () => {
    const invalidProject = { /* ... */ };
    const result = validateProject(invalidProject);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'TILE_INDEX_OUT_OF_BOUNDS'
      })
    );
  });
});
```

Run tests:

```bash
npm test --workspace=packages/shared
```

### 4. Update Runtime Compiler

When adding new schema features, update compiler modules:

- **Maps**: `packages/runtime/src/compiler/compileMapScene.ts`
- **Entities**: `packages/runtime/src/compiler/compileEntities.ts`
- **Triggers**: `packages/runtime/src/compiler/compileTriggers.ts`

---

## Troubleshooting

### Issue: "Cannot find module '@ai-rpg-maker/shared'"

**Cause**: Shared package not built or workspace links broken

**Fix**:
```bash
npm run build --workspace=packages/shared
npm install  # Re-link workspaces
```

### Issue: Tilemap not rendering / blank screen

**Causes**:
1. Tileset image failed to load
2. Tile indices out of bounds
3. Viewport configuration issue

**Debug Steps**:
1. Check browser console for errors
2. Verify tileset image path is correct
3. Run project through validator
4. Check that viewport size × tile size fits in window

### Issue: Player can walk through walls

**Causes**:
1. Collision layer incorrect (all zeros)
2. Collision not being checked before movement

**Debug Steps**:
1. Log collision layer data
2. Verify collision values (0 = walkable, 1 = blocked)
3. Check that collision compiler is running

### Issue: Interaction not working

**Causes**:
1. Entity out of interaction range
2. Interact key not bound
3. Dialogue ID reference invalid

**Debug Steps**:
1. Check entity position vs player position
2. Verify interact key binding (Spacebar/E)
3. Validate dialogue graph references
4. Check browser console for interaction logs

---

## Performance Tips

### Optimize Large Maps

- Keep demo maps under 100×100 tiles for v1
- Use multiple smaller maps instead of one huge map
- Limit visible entities (off-screen culling in runtime)

### Asset Loading

- Use PNG-8 (indexed color) for smaller tileset files
- Compress tileset images (lossless PNG optimization)
- Preload assets on splash screen (future)

### Validation Performance

- Validate once on project load, not per frame
- Cache validation results during development
- Use production build for final testing (dev mode has extra overhead)

---

## Next Steps

After completing this quickstart:

1. **Explore the demo project**: Study `examples/demo-project/project.json` for complete examples
2. **Read data-model.md**: Understand all available schema entities and properties
3. **Run validation tests**: See `packages/shared/tests/` for validation edge cases
4. **Experiment**: Modify demo project and observe runtime behavior

---

## Additional Resources

- **Specification**: [spec.md](./spec.md) - User stories and acceptance criteria
- **Data Model**: [data-model.md](./data-model.md) - Complete entity definitions
- **JSON Schema**: [contracts/schema-v1.json](./contracts/schema-v1.json) - Validation contract
- **Research**: [research.md](./research.md) - Technical decisions and rationale

---

## Getting Help

If you encounter issues not covered in this guide:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Review browser console for error messages
3. Validate project JSON using the shared validator
4. Consult the constitution for architectural principles

---

**Quickstart Status**: ✅ Complete  
**Estimated Setup Time**: 10-15 minutes  
**Estimated First Project**: 15-20 minutes  
**Next**: Run `/speckit.tasks` to generate implementation tasks
