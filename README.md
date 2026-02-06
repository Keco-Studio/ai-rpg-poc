# AI RPG Maker

A browser-based 2D pixel RPG maker with schema validation, AI-assisted editing, and an ExcaliburJS runtime.

## Overview

AI RPG Maker provides a deterministic, versioned schema for defining RPG projects, an atomic patch engine for safe modifications, an AI orchestration layer for natural language editing, and a runtime that compiles schema data into playable ExcaliburJS scenes. Projects are defined as JSON files with strict validation, and AI changes flow through the PatchV1 system for atomicity, validation, and full undo/redo support.

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

# Start the editor (includes embedded runtime preview)
npm run dev --workspace=packages/editor

# Or start the standalone runtime
npm run dev --workspace=packages/runtime
```

Open `http://localhost:5173` to launch the map editor or see the demo project running.

### Runtime Controls

| Key | Action |
|-----|--------|
| Arrow keys / WASD | Move player |
| Spacebar / E | Interact with NPC |

### Editor Controls

| Action | Method |
|--------|--------|
| Paint tiles | Left-click with brush tool |
| Rectangle fill | Drag with rect tool |
| Erase tiles | Left-click with erase tool |
| Paint collision | Left-click with collision tool |
| Place entity | Click with entity tool |
| Create trigger | Drag with trigger tool |
| Pan viewport | Middle-click drag or scroll |
| Zoom | Mouse wheel |
| Undo | Ctrl+Z |
| Redo | Ctrl+Shift+Z |
| Cancel action | Escape |

## Project Structure

```
ai-rpg-maker/
├── packages/
│   ├── shared/          # Schema, patch engine, AI orchestration
│   │   └── src/
│   │       ├── schema/  # Zod schema definitions + validation
│   │       ├── patch/   # PatchV1 engine (validate, apply, undo)
│   │       ├── history/ # Undo/redo stack management
│   │       └── ai/      # AI orchestration layer
│   ├── runtime/         # ExcaliburJS game runtime (Vite)
│   └── editor/          # React map editor (Vite + Canvas 2D)
│       └── src/
│           ├── components/ # EditorShell, MapViewport, panels
│           ├── state/      # EditorStore, transactions, history
│           ├── renderers/  # Canvas renderers (tiles, entities, etc.)
│           ├── hooks/      # React hooks for editor interactions
│           └── adapters/   # Patch builders, AI context
├── examples/
│   └── demo-project/    # Demo RPG project
└── specs/               # Feature specifications
```

## Packages

### @ai-rpg-maker/shared

Core library with schema validation, patch engine, and AI orchestration:

- **Schema v1** - Zod-based project schema with referential integrity checking, bounds validation, and actionable error messages
- **Patch Engine v1** - 17 atomic operation types (maps, tiles, collision, entities, triggers, dialogues, quests) with two-phase validation and inverse patch generation for undo
- **History** - Undo/redo stack with configurable depth
- **AI Orchestration** - Natural language to validated patch proposals with automatic repair loop, safety guardrails, and conflict detection

### @ai-rpg-maker/runtime

ExcaliburJS-based runtime that compiles schema data into playable scenes:

- Pixel-crisp tilemap rendering (no smoothing)
- Tile-based collision detection
- Keyboard-controlled player movement
- NPC interaction and trigger regions
- Debug overlay for interaction feedback

### @ai-rpg-maker/editor

React-based map editor with Canvas 2D rendering and AI integration:

- **Canvas Rendering** - Pixel-crisp tile layers, collision overlay, entity/trigger visualization with pan/zoom viewport
- **Patch-Native Editing** - All manual and AI edits flow through PatchV1 validation pipeline
- **Transaction System** - Batches brush strokes and gestures into atomic, undoable operations with rectangle detection optimization
- **Conflict-Aware History** - Detects conflicts between AI patches and manual edits, offers cancel/partial/force undo options
- **AI Panel** - Natural language prompts, detailed patch preview with resource counts and warnings, apply/reject/regenerate workflow
- **Runtime Preview** - Embedded iframe with live Excalibur preview and `postMessage` communication
- **Interactive Tools** - Brush, rect fill, erase, collision paint, entity placement, trigger creation
- **Project Browser** - Navigate maps, tilesets, and entity definitions
- **History Panel** - Chronological action log with origin tracking (Manual/AI) and undo cursor visualization

See [Editor README](packages/editor/README.md) for architecture and usage details.

## AI Orchestration

The AI orchestration layer enables natural language editing of game projects. Describe what you want to create or modify, and the system generates validated PatchV1 operations.

```typescript
import { proposePatchWithRepair, applyPatch } from '@ai-rpg-maker/shared';

const result = await proposePatchWithRepair(
  project,
  'Create a small town map with 5 villagers',
  aiProvider,
  { maxRepairAttempts: 2 }
);

if (result.status === 'success') {
  const { project: updated } = applyPatch(project, result.patch);
}
```

**Key features:**
- **Provider abstraction** - Plug in any AI backend (OpenAI, Anthropic, local models) via the `AIProvider` interface
- **Strict parsing** - Rejects non-JSON and mixed content responses
- **Automatic repair** - Sends structured validation errors back to AI for correction (configurable retry count)
- **Safety guardrails** - Operation count limits, tile edit limits, destructive operation detection with keyword intent analysis
- **Conflict detection** - Hunk-based snapshot comparison detects manual edits before undo, with three resolution options

See [AI Orchestration README](packages/shared/src/ai/README.md) for architecture details.

## Development

```bash
# Run all tests (269 tests across schema, patch, history, AI, and editor modules)
npm test

# Build all packages
npm run build

# Run editor dev server
npm run dev --workspace=packages/editor

# Run runtime dev server
npm run dev --workspace=packages/runtime
```

## Architecture

The project follows a deterministic pipeline:

```
User Prompt → AI Provider → PatchV1 JSON → Validate → Apply → Project State → Runtime
```

Key principles:
- **Schema as source of truth** - All game data defined in versioned JSON
- **Deterministic loading** - Same JSON always produces same game state
- **Strict validation** - Invalid data caught before rendering with clear errors
- **AI changes via patch ops only** - All AI modifications expressed as validated PatchV1 operations
- **Transactional editing** - Atomic apply with full undo/redo and conflict detection
- **Pixel correctness** - Crisp pixel art with no smoothing artifacts

## Specifications

| Spec | Feature | Status |
|------|---------|--------|
| [001](specs/001-schema-runtime-v1/spec.md) | Project Schema + Runtime | Complete |
| [002](specs/002-ai-patch-engine/spec.md) | AI Patch Engine | Complete |
| [003](specs/003-ai-orchestration/spec.md) | AI Orchestration | Complete |
| [004](specs/004-editor-ux/spec.md) | Editor UX v1 | Complete |
