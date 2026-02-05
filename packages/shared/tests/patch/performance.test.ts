/**
 * Performance Test Suite - Phase 7
 *
 * Validates performance targets:
 * - Validate <10ms for typical patches
 * - Apply <100ms for typical patches
 * - Large patches (50,000 tile edits) <500ms
 */

import { describe, it, expect } from 'vitest';
import type { Project } from '../../src/schema/types.js';
import type { PatchV1 } from '../../src/patch/types.js';
import { validatePatch } from '../../src/patch/validate.js';
import { applyPatch } from '../../src/patch/apply.js';

import baseProjectJson from './fixtures/projects/base-project.json';

const baseProject = baseProjectJson as unknown as Project;

function makePatch(ops: PatchV1['ops']): PatchV1 {
  return {
    patchVersion: 1,
    patchId: 'perf-' + Math.random().toString(36).slice(2),
    baseSchemaVersion: 1,
    ops,
  };
}

// Create a large map project for performance tests
function createLargeProject(): Project {
  const width = 100;
  const height = 100;
  const size = width * height;

  return {
    ...baseProject,
    maps: {
      ...baseProject.maps,
      large_map: {
        id: 'large_map',
        name: 'Large Map',
        width,
        height,
        tilesetId: 'dungeon',
        tileLayers: {
          ground: {
            name: 'Ground',
            data: new Array(size).fill(1),
            zIndex: 0,
            opacity: 1,
            visible: true,
          },
        },
        collisionLayer: new Array(size).fill(0),
        entities: [],
        triggers: [],
      },
    },
  };
}

// ════════════════════════════════════════════════════════════════════════
// Validation Performance
// ════════════════════════════════════════════════════════════════════════

describe('performance - validation', () => {
  it('validates typical patch (5-20 ops) in under 10ms', () => {
    const patch = makePatch([
      { op: 'paintRect', mapId: 'village_square', layerId: 'ground', x: 1, y: 1, w: 3, h: 3, tileId: 5 },
      { op: 'setTiles', mapId: 'village_square', layerId: 'ground', cells: [{ x: 5, y: 5, tileId: 10 }] },
      { op: 'setCollisionRect', mapId: 'village_square', x: 1, y: 1, w: 3, h: 3, solid: 1 },
      { op: 'placeEntity', mapId: 'village_square', instance: { id: 'perf_npc', entityId: 'npc_guard', x: 3, y: 3 } },
      { op: 'updateQuest', questId: 'main_quest', patch: { status: 'active' } },
    ]);

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      validatePatch(baseProject, patch);
    }
    const elapsed = performance.now() - start;
    const perCall = elapsed / 100;

    expect(perCall).toBeLessThan(10);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Apply Performance
// ════════════════════════════════════════════════════════════════════════

describe('performance - apply', () => {
  it('applies typical patch in under 100ms', () => {
    const patch = makePatch([
      { op: 'paintRect', mapId: 'village_square', layerId: 'ground', x: 1, y: 1, w: 5, h: 5, tileId: 42 },
      { op: 'setCollisionRect', mapId: 'village_square', x: 1, y: 1, w: 5, h: 5, solid: 1 },
      { op: 'placeEntity', mapId: 'village_square', instance: { id: 'perf_npc2', entityId: 'npc_guard', x: 3, y: 3 } },
    ]);

    const start = performance.now();
    applyPatch(baseProject, patch);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100);
  });

  it('handles 1000 individual tile edits', () => {
    const largeProject = createLargeProject();
    const cells = [];
    for (let i = 0; i < 1000; i++) {
      cells.push({ x: i % 100, y: Math.floor(i / 100), tileId: 5 });
    }

    const patch = makePatch([{
      op: 'setTiles',
      mapId: 'large_map',
      layerId: 'ground',
      cells,
    }]);

    const start = performance.now();
    const result = applyPatch(largeProject, patch);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100);
    expect(result.project.maps['large_map'].tileLayers['ground'].data[0]).toBe(5);
  });

  it('handles 50,000 tile edits via rect operations in under 500ms', () => {
    const width = 250;
    const height = 200;
    const size = width * height;

    const bigProject: Project = {
      ...baseProject,
      maps: {
        ...baseProject.maps,
        huge_map: {
          id: 'huge_map',
          name: 'Huge Map',
          width,
          height,
          tilesetId: 'dungeon',
          tileLayers: {
            ground: {
              name: 'Ground',
              data: new Array(size).fill(0),
              zIndex: 0,
              opacity: 1,
              visible: true,
            },
          },
          collisionLayer: new Array(size).fill(0),
          entities: [],
          triggers: [],
        },
      },
    };

    // 250x200 = 50,000 tile edits
    const patch = makePatch([{
      op: 'paintRect',
      mapId: 'huge_map',
      layerId: 'ground',
      x: 0, y: 0, w: 250, h: 200,
      tileId: 42,
    }]);

    const start = performance.now();
    const result = applyPatch(bigProject, patch);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(500);
    expect(result.project.maps['huge_map'].tileLayers['ground'].data[0]).toBe(42);
    expect(result.project.maps['huge_map'].tileLayers['ground'].data[size - 1]).toBe(42);
  });
});
