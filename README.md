# AI RPG Maker

A browser-based 2D pixel RPG maker with schema validation and ExcaliburJS runtime.

## Overview

AI RPG Maker provides a deterministic, versioned schema for defining RPG projects and a runtime that compiles schema data into playable ExcaliburJS scenes. Projects are defined as JSON files with strict validation, enabling future AI-driven editing workflows.

## Quick Start

### Prerequisites

- Node.js 20+ and npm 10+
- Modern browser (Chrome, Firefox, Safari, Edge)

### Setup

```bash
# Install all workspace dependencies
npm install

# Build the shared schema library
npm run build --workspace=packages/shared

# Start the development server
npm run dev --workspace=packages/runtime
```

Open `http://localhost:5173` to see the demo project running.

### Controls

| Key | Action |
|-----|--------|
| Arrow keys / WASD | Move player |
| Spacebar / E | Interact with NPC |

## Project Structure

```
ai-rpg-maker/
├── packages/
│   ├── shared/          # Schema types + validation (Zod)
│   ├── runtime/         # ExcaliburJS game runtime (Vite)
│   └── editor/          # Future editor UI (placeholder)
├── examples/
│   └── demo-project/    # Demo RPG project
└── specs/               # Feature specifications
```

## Packages

### @ai-rpg-maker/shared

Schema definitions using Zod with comprehensive validation:

- Project Schema v1 with versioned, typed data model
- Referential integrity checking (tileset, entity, dialogue references)
- Bounds validation (tile indices, positions, array lengths)
- Actionable error messages with suggested fixes

### @ai-rpg-maker/runtime

ExcaliburJS-based runtime that compiles schema data into playable scenes:

- Pixel-crisp tilemap rendering (no smoothing)
- Tile-based collision detection
- Keyboard-controlled player movement
- NPC interaction and trigger regions
- Debug overlay for interaction feedback

### @ai-rpg-maker/editor (Future)

Visual editor for creating and modifying RPG projects.

## Development

```bash
# Run all tests
npm test

# Build all packages
npm run build

# Run runtime dev server
npm run dev
```

## Architecture

The project follows a deterministic pipeline:

```
Project JSON → Validate (Zod) → Compile → ExcaliburJS Scene → Play
```

Key principles:
- **Schema as source of truth** - All game data defined in versioned JSON
- **Deterministic loading** - Same JSON always produces same game state
- **Strict validation** - Invalid data caught before rendering with clear errors
- **Pixel correctness** - Crisp pixel art with no smoothing artifacts

## Links

- [Specification](specs/001-schema-runtime-v1/spec.md)
- [Data Model](specs/001-schema-runtime-v1/data-model.md)
- [Quickstart Guide](specs/001-schema-runtime-v1/quickstart.md)
- [Implementation Plan](specs/001-schema-runtime-v1/plan.md)
