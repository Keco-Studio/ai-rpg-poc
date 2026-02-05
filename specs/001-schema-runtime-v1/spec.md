# Feature Specification: Project Schema v1 + Excalibur Runtime Compiler v1

**Feature Branch**: `001-schema-runtime-v1`  
**Created**: 2026-02-05  
**Status**: Draft  
**Input**: User description: "Spec 001: Project Schema v1 + Excalibur Runtime Compiler v1"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Load and Play Demo Project (Priority: P1)

As a creator, I can open a demo project file, press Play, and see a pixel tilemap rendered with proper collision detection in the browser.

**Why this priority**: This is the foundational capability - without the ability to load and render a project, no other features matter. Validates the entire schema-to-runtime pipeline.

**Independent Test**: Load the demo project JSON, click Play, and verify that a tilemap appears on screen with crisp pixel rendering. No editor required - just runtime and project file.

**Acceptance Scenarios**:

1. **Given** a valid demo project JSON file with tileset and map data, **When** the runtime loads the project, **Then** the map renders on screen with pixel-crisp graphics and no smoothing artifacts
2. **Given** a valid project with collision layer data, **When** the map is rendered, **Then** collision boundaries are established (verified by player movement constraints in next story)
3. **Given** an invalid project JSON (missing required fields, invalid tile indices, or schema version mismatch), **When** the runtime attempts to load it, **Then** the runtime displays a clear, actionable error message and refuses to load

---

### User Story 2 - Player Movement with Collision (Priority: P1)

As a creator, I can control a player character with keyboard input and observe collision physics working correctly (player cannot walk through blocked tiles).

**Why this priority**: Demonstrates that the runtime not only renders static content but also handles dynamic gameplay mechanics. Essential for validating the collision layer schema and runtime collision detection.

**Independent Test**: After loading the demo project, use arrow keys or WASD to move the player. Attempt to walk into blocked tiles and verify the player is stopped by collision boundaries.

**Acceptance Scenarios**:

1. **Given** the demo project is loaded with a player spawn point, **When** keyboard input is provided (arrow keys or WASD), **Then** the player character moves in the corresponding direction
2. **Given** the player is moving toward a blocked tile (marked in collision layer), **When** the player attempts to enter that tile, **Then** movement is prevented and the player remains at the collision boundary
3. **Given** the player is moving toward a walkable tile, **When** the player enters that tile, **Then** movement proceeds normally without obstruction

---

### User Story 3 - Basic Interaction System (Priority: P2)

As a creator, I can interact with an NPC or trigger region and see a visible response (debug message, dialogue box, or console log).

**Why this priority**: Establishes the event/interaction system that will be expanded in future features. Validates that entity instances and trigger regions are properly loaded and can execute basic event operations.

**Independent Test**: Walk the player near an NPC entity or into a trigger region, press the interact key, and verify that a visible UI element (basic dialogue box or debug overlay) appears with a message.

**Acceptance Scenarios**:

1. **Given** an NPC entity is placed on the map, **When** the player is adjacent to the NPC and presses the interact key, **Then** a dialogue box or debug panel appears displaying a test message
2. **Given** a trigger region is defined on the map, **When** the player enters the trigger region, **Then** an event is fired and a visible action occurs (console log message and/or basic UI feedback)
3. **Given** the player is not near any interactive entity or trigger, **When** the interact key is pressed, **Then** no interaction occurs (no error, just no response)

---

### Edge Cases

- **Loading edge cases**:
  - What happens when the project JSON references a tileset image that doesn't exist or fails to load?
  - How does the system handle a project with zero maps or zero entities?
  - What happens when tile indices in the map exceed the tileset dimensions?
  
- **Collision edge cases**:
  - What happens when the player spawn point is on a blocked tile?
  - How does collision work at map boundaries (player should not walk off the edge)?
  
- **Interaction edge cases**:
  - What happens when two trigger regions overlap?
  - How does the system handle an NPC with no dialogue data defined?
  
- **Determinism edge cases**:
  - Does reloading the same project always place entities in the same positions?
  - Are entity IDs and references resolved consistently across reloads?

## Requirements *(mandatory)*

### Functional Requirements

#### Schema Requirements

- **FR-001**: System MUST define a Project Schema v1 with strong typing that includes project metadata, schema version, tilesets, maps, entity templates, entity instances, trigger regions, and minimal dialogue/quest structures
- **FR-002**: System MUST validate all project JSON files against the schema before loading
- **FR-003**: System MUST produce clear, actionable error messages when validation fails (e.g., "Tile index 45 out of bounds for tileset 'dungeon' with 40 tiles")
- **FR-004**: Schema MUST prevent invalid references (e.g., entity instance referencing non-existent template ID)
- **FR-005**: Schema MUST support schema versioning to enable future migrations

#### Runtime Requirements

- **FR-006**: Runtime MUST load a valid Project Schema v1 JSON file and initialize an Excalibur scene
- **FR-007**: Runtime MUST load tileset images and build tile graphics for rendering
- **FR-008**: Runtime MUST render at least one tile layer (multiple layers preferred if trivial to support)
- **FR-009**: Runtime MUST apply collision detection based on a collision layer defined in the map schema
- **FR-010**: Runtime MUST render pixel art with crisp, pixel-perfect rendering (no smoothing or antialiasing by default)
- **FR-011**: Runtime MUST spawn a player actor at the defined spawn point and enable keyboard-based movement
- **FR-012**: Runtime MUST detect player interaction input (interact key) and trigger appropriate events for nearby entities or trigger regions
- **FR-013**: Runtime MUST support basic event operations for interactions (minimum: display message or log to console)
- **FR-014**: Runtime MUST be deterministic - loading the same project multiple times produces the same initial world state

#### Validation Requirements

- **FR-015**: Validator MUST check for missing required schema fields
- **FR-016**: Validator MUST check for out-of-bounds tile indices
- **FR-017**: Validator MUST check for invalid entity ID references
- **FR-018**: Validator MUST check for coordinate values outside map boundaries
- **FR-019**: Validator MUST check for schema version compatibility

#### Demo Requirements

- **FR-020**: System MUST include a demo project JSON with valid schema data (metadata, at least one tileset, at least one map with tile and collision layers, at least one player spawn, at least one NPC or trigger region)
- **FR-021**: Demo MUST include or reference a minimal tileset image (placeholder or actual pixel art)
- **FR-022**: Demo MUST load successfully and demonstrate all three user stories

#### Documentation Requirements

- **FR-023**: Documentation MUST explain how to run the demo
- **FR-024**: Documentation MUST explain the Project Schema v1 structure and required fields
- **FR-025**: Documentation MUST include instructions for creating a minimal valid project

### Key Entities *(include if feature involves data)*

- **Project**: Root container for entire RPG project; includes metadata (name, version, author), schema version, references to tilesets, maps, entity templates, and game configuration
- **Tileset**: Definition of a spritesheet image reference, tile dimensions (width/height in pixels), tile count, and optional metadata (name, description)
- **Map**: Represents a game level/area; includes dimensions (width/height in tiles), multiple tile layers (background, foreground, etc.), collision layer (bitmask or tile indices marking blocked tiles), entity instances placed on this map, and trigger regions
- **Entity Template**: Reusable blueprint for game entities (NPC, door, chest); includes type identifier, visual sprite/tile reference, interaction behavior definition, and optional properties (dialogue ID, item contents, etc.)
- **Entity Instance**: Specific placement of an entity template on a map; includes template ID reference, position (x, y coordinates in tiles or pixels), unique instance ID, and optional instance-specific overrides
- **Trigger Region**: Invisible area on map that fires events when player enters; includes boundary definition (rectangle or tilemap region), event operations to execute on trigger, and optional conditions for activation
- **Dialogue Graph**: Tree/graph structure for NPC conversations; includes dialogue nodes with text, choice branches, and next node references (minimal implementation for this spec)
- **Quest Structure**: Placeholder structure for future quest system; includes quest ID, name, and status tracking (can be stubbed for v1 with TODO markers)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A creator can load the demo project and see a rendered tilemap on screen in under 3 seconds from clicking Play
- **SC-002**: The runtime rejects 100% of invalid project files (missing fields, invalid references, out-of-bounds indices) with actionable error messages before attempting to render
- **SC-003**: The player character responds to keyboard input within 50ms and respects collision boundaries in 100% of tested cases
- **SC-004**: At least one interaction (NPC or trigger region) produces a visible result (UI element or console output) that the creator can observe
- **SC-005**: Loading the same demo project 10 consecutive times produces identical initial world state every time (player spawn position, entity positions, map layout)
- **SC-006**: Pixel art renders with crisp edges - no blur or smoothing artifacts visible when inspecting tilemap graphics
- **SC-007**: A developer can understand the Project Schema v1 structure and create a minimal valid project by following the documentation in under 20 minutes

## Assumptions

1. **Asset hosting**: Demo tileset images are assumed to be hosted in a known relative path (e.g., `assets/tilesets/`) or embedded as base64/data URIs for initial testing
2. **Browser target**: Runtime targets modern browsers with ES6+ support (Chrome, Firefox, Safari, Edge) - no IE11 compatibility required
3. **Input method**: Keyboard input is sufficient for this spec; gamepad/touch input deferred to future versions
4. **Interaction range**: Player interaction with NPCs uses simple distance check (e.g., adjacent tile) rather than complex collision-based targeting
5. **Dialogue system**: Basic message display is sufficient for v1; full branching dialogue, voice acting, and portraits deferred
6. **Performance baseline**: Demo project is small-scale (single map under 100x100 tiles) to validate core functionality before optimizing for large-scale performance
7. **Error handling**: Runtime errors are displayed in browser console and/or a simple overlay; full error recovery and retry mechanisms deferred
8. **Save/load**: This spec focuses on loading projects from JSON; saving edited projects and runtime save states deferred to editor spec

## Out of Scope (Explicit)

- **Full editor UI**: No visual editing tools in this spec; creator manually edits JSON
- **AI patch engine**: Validation exists but AI-driven project modification deferred
- **Animation system**: Static sprites only; animated tiles and entity animations deferred
- **Combat system**: No health, damage, or battle mechanics
- **Inventory UI**: No item collection or inventory management
- **Sound/music**: Audio system deferred to future spec
- **Scripting language**: Event operations limited to predefined types; full Lua/JS scripting deferred
- **Multiplayer**: Single-player only
- **Mobile optimization**: Desktop browser focus; responsive design and touch controls deferred
