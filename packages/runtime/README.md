# @ai-rpg-maker/runtime

ExcaliburJS-based runtime for loading and playing AI RPG Maker projects.

## Overview

The runtime loads a validated Project Schema v1 JSON file, compiles it into ExcaliburJS scenes, and runs a playable game with:

- Pixel-crisp tilemap rendering (no smoothing/antialiasing)
- Keyboard-controlled player movement (Arrow keys + WASD)
- Tile-based collision detection
- NPC interaction (Spacebar/E key)
- Trigger region events (onEnter)
- Debug overlay for interaction feedback

## Running the Dev Server

```bash
# From the repository root
npm run dev --workspace=packages/runtime

# Or from this directory
npm run dev
```

Opens at `http://localhost:5173` with hot reloading.

## Production Build

```bash
npm run build    # Compile TypeScript + bundle with Vite
npm run preview  # Preview production build
```

## Architecture

```
src/
├── game/
│   └── createEngine.ts     # Excalibur engine with pixel-crisp config
├── loader/
│   └── loadAssets.ts        # Project JSON + tileset image loading
├── compiler/
│   ├── compileMapScene.ts   # Schema → Excalibur Scene
│   ├── compileTileMap.ts    # TileLayer → TileMap
│   ├── compileCollision.ts  # Collision layer → checker
│   ├── compileEntities.ts   # EntityInstance → Actor (+ player)
│   └── compileTriggers.ts   # TriggerRegion → event handlers
├── ui/
│   └── debugOverlay.ts      # Interaction message display
└── index.ts                 # Entry point
```

## Controls

| Key | Action |
|-----|--------|
| Arrow keys / WASD | Move player |
| Spacebar / E | Interact with nearby NPC |

## Configuration

The runtime loads from these paths (configurable in `src/index.ts`):

- **Project JSON**: `/examples/demo-project/project.json`
- **Assets base**: `/examples/demo-project`
