<!--
==============================================================================
Sync Impact Report - Constitution Update
==============================================================================
Version change: [Initial] → 1.0.0
Type: MINOR (Initial ratification)

Added Principles:
  1. Model as Source of Truth
  2. Determinism over Magic
  3. Strict Validation
  4. Pixel Correctness
  5. Performance Guardrails
  6. Transactional Editing
  7. AI Changes via Patch Ops Only
  8. Reviewability
  9. Testing
  10. Security and Privacy

Added Sections:
  - Non-Goals for Early Versions
  - Definition of Done
  - Governance

Templates Status:
  ✅ plan-template.md: Reviewed - Constitution Check section aligns with validation and testing principles
  ✅ spec-template.md: Reviewed - User scenarios and requirements align with reviewability principle
  ✅ tasks-template.md: Reviewed - Task organization supports transactional editing and testing discipline

Follow-up TODOs: None
==============================================================================
-->

# RPG AI Maker (Web) – ExcaliburJS Target Constitution

## Purpose

Build a browser-based 2D pixel RPG maker with an ExcaliburJS runtime. The editor produces a deterministic project model. The runtime is a compiler target that loads and plays the model. AI assistance is implemented as safe, validated project patches.

## Core Principles

### I. Model as Source of Truth

The versioned project model (schema v1+) is the single source of truth. The runtime MUST NOT contain "hidden game logic" that isn't represented in the schema. If something affects gameplay, it MUST be expressible in the model.

**Rationale**: Ensures projects are portable, inspectable, and version-controllable. Prevents runtime drift where behavior can't be reproduced from the model alone.

### II. Determinism over Magic

Loading the same project model MUST produce the same runtime world every time. No hidden state, random initialization, or environment-dependent behavior unless explicitly tracked in the model.

**Rationale**: Enables reliable testing, debugging, and collaboration. Users must be able to reproduce any game state from the model.

### III. Strict Validation

All project files MUST be validated before running. Missing assets, invalid IDs, out-of-bounds coordinates, invalid tile indices, and schema version mismatches MUST produce actionable errors.

**Rationale**: Fail fast with clear error messages. Users should never encounter silent failures or runtime crashes from malformed data.

### IV. Pixel Correctness

Default rendering is pixel-crisp in ExcaliburJS. Do NOT introduce smoothing or antialiasing that breaks pixel art aesthetics.

**Rationale**: Pixel art games require precise rendering. Interpolation or blurring destroys the intended visual style and breaks user expectations.

### V. Performance Guardrails

Tilemaps can be large; avoid per-frame heavy operations. Avoid rebuilding collision meshes unnecessarily. Measure, document, and tune tilemap/collision settings when needed.

**Rationale**: Browser games must maintain smooth 60 FPS. Poor performance destroys player experience and limits project scale.

### VI. Transactional Editing

All editor operations are atomic and undoable. Batch operations (including AI-generated changes) MUST apply as a single transaction and MUST be fully undoable/redoable.

**Rationale**: Users must have confidence that any mistake can be undone. Complex operations should not leave the project in an inconsistent state if interrupted.

### VII. AI Changes via Patch Ops Only

The AI never edits raw files directly. It outputs structured patch operations against the schema. Patch ops MUST be validated (schema + bounds + referential integrity) before apply. On validation failure, nothing changes.

**Rationale**: AI-generated changes can introduce subtle errors. Validation ensures the AI cannot corrupt projects, and structured patches enable review, approval, and rollback.

### VIII. Reviewability

Each task MUST produce small, reviewable diffs. Prefer composable modules, typed APIs, and straightforward code over cleverness.

**Rationale**: Code quality depends on reviewability. Large, complex changes hide bugs and make maintenance difficult.

### IX. Testing

The shared schema validator and patch engine MUST have unit tests for common invalid states and edge cases. Runtime compilation should have basic integration tests or smoke tests where feasible.

**Rationale**: The core validation and patch systems are critical infrastructure. Regressions here affect all projects. Testing ensures reliability.

### X. Security and Privacy

Assume project content may be proprietary. Avoid sending raw project data to external services by default. If AI is enabled, keep the tool interface minimal and log what changed.

**Rationale**: Users must trust the tool with their creative work. Unexpected data transmission or opaque AI changes erode trust and may violate confidentiality requirements.

## Non-Goals for Early Versions

The following are explicitly OUT OF SCOPE for initial versions to maintain focus and ensure timely delivery:

- **Full RPG Maker feature parity**: We are not replicating every feature of commercial RPG Maker tools. Focus on core, well-validated features.
- **Real-time multiplayer**: Networking and synchronization are complex. Single-player experiences come first.
- **Full in-editor pixel art drawing suite**: Users can use external tools. We provide asset import, not Photoshop-level editing.
- **Full scripting language**: Early scripting is limited to a small set of event operations. Full Lua/JavaScript scripting is deferred.

**Rationale**: Scope discipline prevents feature creep. These items may be added in future versions after core functionality is proven and stable.

## Definition of Done

A feature is DONE when:

1. It matches the spec acceptance criteria
2. It passes all validation and tests
3. It is undoable (if editor-facing)
4. It has minimal documentation explaining usage and constraints

**Rationale**: Establishes clear completion criteria. Prevents "almost done" features from lingering and ensures quality bar is met.

## Governance

### Amendment Process

1. Proposed changes to this constitution MUST be documented with rationale
2. Version increments follow semantic versioning:
   - **MAJOR**: Backward-incompatible principle removals or redefinitions
   - **MINOR**: New principles or materially expanded guidance
   - **PATCH**: Clarifications, wording fixes, non-semantic refinements
3. All amendments MUST update the Last Amended date and Sync Impact Report

### Compliance

- All feature specifications MUST align with constitution principles
- All code reviews MUST verify compliance with principles
- Complexity that violates principles MUST be explicitly justified in documentation
- When principles conflict in a specific case, document the trade-off and resolution

### Review Cadence

- Constitution review triggered by:
  - New major feature categories (e.g., adding multiplayer)
  - Repeated principle violations indicating misalignment
  - Significant architectural shifts (e.g., changing from browser to desktop runtime)
  - At least annually to ensure principles remain relevant

**Version**: 1.0.0 | **Ratified**: 2026-02-05 | **Last Amended**: 2026-02-05
