/**
 * History Stack Test Suite - User Story 2
 *
 * Tests undo/redo functionality with the HistoryStack class.
 */

import { describe, it, expect } from 'vitest';
import type { Project } from '../../src/schema/types.js';
import type { PatchV1 } from '../../src/patch/types.js';
import { HistoryStack } from '../../src/history/history.js';

import baseProjectJson from '../patch/fixtures/projects/base-project.json';

const baseProject = baseProjectJson as unknown as Project;

function makePatch(ops: PatchV1['ops']): PatchV1 {
  return {
    patchVersion: 1,
    patchId: 'test-history-' + Math.random().toString(36).slice(2),
    baseSchemaVersion: 1,
    ops,
  };
}

function projectEquals(a: Project, b: Project): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ════════════════════════════════════════════════════════════════════════
// Basic HistoryStack
// ════════════════════════════════════════════════════════════════════════

describe('HistoryStack', () => {
  it('starts with empty stacks', () => {
    const history = new HistoryStack();
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
    expect(history.undoSize).toBe(0);
    expect(history.redoSize).toBe(0);
  });

  it('applies a patch and pushes to undo stack', () => {
    const history = new HistoryStack();
    const patch = makePatch([{
      op: 'paintRect',
      mapId: 'village_square',
      layerId: 'ground',
      x: 1, y: 1, w: 2, h: 2,
      tileId: 42,
    }]);

    const result = history.applyAndPush(baseProject, patch);
    expect(result).not.toBeNull();
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);
    expect(history.undoSize).toBe(1);
  });

  it('rejects invalid patches', () => {
    const history = new HistoryStack();
    const invalidPatch = makePatch([{
      op: 'paintRect',
      mapId: 'nonexistent_map',
      layerId: 'ground',
      x: 0, y: 0, w: 1, h: 1,
      tileId: 1,
    }]);

    const result = history.applyAndPush(baseProject, invalidPatch);
    expect(result).toBeNull();
    expect(history.canUndo()).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Undo / Redo
// ════════════════════════════════════════════════════════════════════════

describe('HistoryStack - undo/redo', () => {
  it('undo restores previous state', () => {
    const history = new HistoryStack();
    const patch = makePatch([{
      op: 'paintRect',
      mapId: 'village_square',
      layerId: 'ground',
      x: 1, y: 1, w: 2, h: 2,
      tileId: 42,
    }]);

    const applyResult = history.applyAndPush(baseProject, patch)!;
    const currentProject = applyResult.project;

    // Undo
    const undoResult = history.undo(currentProject);
    expect(undoResult).not.toBeNull();
    expect(projectEquals(undoResult!.project, baseProject)).toBe(true);
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(true);
  });

  it('redo restores patched state', () => {
    const history = new HistoryStack();
    const patch = makePatch([{
      op: 'paintRect',
      mapId: 'village_square',
      layerId: 'ground',
      x: 1, y: 1, w: 2, h: 2,
      tileId: 42,
    }]);

    const applyResult = history.applyAndPush(baseProject, patch)!;
    const patchedProject = applyResult.project;

    // Undo
    const undoResult = history.undo(patchedProject)!;

    // Redo
    const redoResult = history.redo(undoResult.project);
    expect(redoResult).not.toBeNull();
    expect(projectEquals(redoResult!.project, patchedProject)).toBe(true);
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);
  });

  it('undo on empty stack returns null', () => {
    const history = new HistoryStack();
    expect(history.undo(baseProject)).toBeNull();
  });

  it('redo on empty stack returns null', () => {
    const history = new HistoryStack();
    expect(history.redo(baseProject)).toBeNull();
  });

  it('new patch clears redo stack', () => {
    const history = new HistoryStack();

    const patch1 = makePatch([{
      op: 'paintRect', mapId: 'village_square', layerId: 'ground',
      x: 1, y: 1, w: 1, h: 1, tileId: 10,
    }]);
    const patch2 = makePatch([{
      op: 'paintRect', mapId: 'village_square', layerId: 'ground',
      x: 2, y: 2, w: 1, h: 1, tileId: 20,
    }]);

    // Apply patch1
    const r1 = history.applyAndPush(baseProject, patch1)!;
    let current = r1.project;

    // Undo
    const undoResult = history.undo(current)!;
    current = undoResult.project;
    expect(history.canRedo()).toBe(true);

    // Apply patch2 (should clear redo)
    const r2 = history.applyAndPush(current, patch2)!;
    current = r2.project;
    expect(history.canRedo()).toBe(false);
    expect(history.undoSize).toBe(1); // Only patch2
  });
});

// ════════════════════════════════════════════════════════════════════════
// Multiple Patches
// ════════════════════════════════════════════════════════════════════════

describe('HistoryStack - multiple patches', () => {
  it('multiple undos restore to original state', () => {
    const history = new HistoryStack();
    let current = baseProject;

    // Apply 3 patches
    const patches = [
      makePatch([{ op: 'paintRect', mapId: 'village_square', layerId: 'ground', x: 1, y: 1, w: 1, h: 1, tileId: 10 }]),
      makePatch([{ op: 'paintRect', mapId: 'village_square', layerId: 'ground', x: 2, y: 2, w: 1, h: 1, tileId: 20 }]),
      makePatch([{ op: 'paintRect', mapId: 'village_square', layerId: 'ground', x: 3, y: 3, w: 1, h: 1, tileId: 30 }]),
    ];

    for (const patch of patches) {
      const result = history.applyAndPush(current, patch)!;
      current = result.project;
    }

    expect(history.undoSize).toBe(3);

    // Undo all 3
    for (let i = 0; i < 3; i++) {
      const result = history.undo(current)!;
      current = result.project;
    }

    expect(projectEquals(current, baseProject)).toBe(true);
    expect(history.undoSize).toBe(0);
    expect(history.redoSize).toBe(3);
  });

  it('undo then redo preserves each state', () => {
    const history = new HistoryStack();
    let current = baseProject;
    const states: Project[] = [baseProject];

    // Apply 2 patches, save each state
    const patches = [
      makePatch([{ op: 'paintRect', mapId: 'village_square', layerId: 'ground', x: 1, y: 1, w: 1, h: 1, tileId: 10 }]),
      makePatch([{ op: 'paintRect', mapId: 'village_square', layerId: 'ground', x: 2, y: 2, w: 1, h: 1, tileId: 20 }]),
    ];

    for (const patch of patches) {
      const result = history.applyAndPush(current, patch)!;
      current = result.project;
      states.push(current);
    }

    // Undo once
    const undo1 = history.undo(current)!;
    expect(projectEquals(undo1.project, states[1])).toBe(true);

    // Redo once
    const redo1 = history.redo(undo1.project)!;
    expect(projectEquals(redo1.project, states[2])).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Max Size
// ════════════════════════════════════════════════════════════════════════

describe('HistoryStack - maxSize', () => {
  it('evicts oldest entry when maxSize exceeded', () => {
    const history = new HistoryStack({ maxSize: 2 });
    let current = baseProject;

    for (let i = 0; i < 5; i++) {
      const patch = makePatch([{
        op: 'paintRect', mapId: 'village_square', layerId: 'ground',
        x: 1, y: 1, w: 1, h: 1, tileId: i + 1,
      }]);
      const result = history.applyAndPush(current, patch)!;
      current = result.project;
    }

    expect(history.undoSize).toBe(2); // Only last 2 entries kept
  });
});

// ════════════════════════════════════════════════════════════════════════
// Clear
// ════════════════════════════════════════════════════════════════════════

describe('HistoryStack - clear', () => {
  it('clears both stacks', () => {
    const history = new HistoryStack();
    let current = baseProject;

    const result = history.applyAndPush(current, makePatch([{
      op: 'paintRect', mapId: 'village_square', layerId: 'ground',
      x: 1, y: 1, w: 1, h: 1, tileId: 5,
    }]))!;
    current = result.project;
    history.undo(current);

    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(true);

    history.clear();
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
    expect(history.undoSize).toBe(0);
    expect(history.redoSize).toBe(0);
  });
});
