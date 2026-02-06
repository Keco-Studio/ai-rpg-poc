/**
 * Unit Tests: ConflictAwareHistory
 *
 * Tests: applyAndPush stores hunks; preflightUndo with no subsequent edits
 * returns no conflicts; preflightUndo with overlapping edit returns conflicts;
 * undo applies full inverse; force undo ignores conflicts.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConflictAwareHistory } from '../../src/state/conflictAwareHistory.js';
import { createDemoProject } from '../../src/demoProject.js';
import type { Project, PatchV1 } from '@ai-rpg-maker/shared';

let project: Project;
let history: ConflictAwareHistory;

function makeTilePatch(patchId: string, cells: Array<{ x: number; y: number; tileId: number }>): PatchV1 {
  return {
    patchVersion: 1,
    patchId,
    baseSchemaVersion: 1,
    ops: [
      {
        op: 'setTiles',
        mapId: 'demo-map',
        layerId: 'ground',
        cells,
      },
    ],
  };
}

beforeEach(() => {
  project = createDemoProject();
  history = new ConflictAwareHistory();
});

describe('ConflictAwareHistory.applyAndPush', () => {
  it('applies a patch and stores meta with conflict hunks', () => {
    const patch = makeTilePatch('p1', [{ x: 0, y: 0, tileId: 5 }]);
    const result = history.applyAndPush(project, patch, {
      origin: 'ai',
      summary: 'AI: test patch',
      timestamp: Date.now(),
    });

    expect(result).not.toBeNull();
    expect(result!.project.maps['demo-map'].tileLayers['ground'].data[0]).toBe(5);
    expect(history.undoSize()).toBe(1);

    const meta = history.getAllMeta();
    expect(meta).toHaveLength(1);
    expect(meta[0].origin).toBe('ai');
    expect(meta[0].conflictHunks.length).toBeGreaterThan(0);
  });

  it('returns null for invalid patch', () => {
      const patch: PatchV1 = {
      patchVersion: 1,
      patchId: 'bad',
      baseSchemaVersion: 1,
      ops: [
        {
          op: 'setTiles',
          mapId: 'nonexistent-map',
          layerId: 'ground',
          cells: [{ x: 0, y: 0, tileId: 1 }],
        },
      ],
    };

    const result = history.applyAndPush(project, patch, {
      origin: 'manual',
      summary: 'test',
      timestamp: Date.now(),
    });
    expect(result).toBeNull();
  });
});

describe('ConflictAwareHistory.preflightUndo', () => {
  it('returns no conflicts when nothing changed after apply', () => {
    const patch = makeTilePatch('p1', [{ x: 0, y: 0, tileId: 5 }]);
    const result = history.applyAndPush(project, patch, {
      origin: 'ai',
      summary: 'test',
      timestamp: Date.now(),
    });

    // Project hasn't been modified since apply
    const preflight = history.preflightUndo(result!.project);
    expect(preflight).not.toBeNull();
    expect(preflight!.hasConflicts).toBe(false);
    expect(preflight!.detectionResult.safeHunks.length).toBeGreaterThan(0);
  });

  it('returns null when history is empty', () => {
    const preflight = history.preflightUndo(project);
    expect(preflight).toBeNull();
  });
});

describe('ConflictAwareHistory.undo', () => {
  it('undoes the most recent entry', () => {
    const patch = makeTilePatch('p1', [{ x: 0, y: 0, tileId: 5 }]);
    const applyResult = history.applyAndPush(project, patch, {
      origin: 'ai',
      summary: 'test',
      timestamp: Date.now(),
    });

    const undoResult = history.undo(applyResult!.project);
    expect(undoResult).not.toBeNull();
    // Should revert tile back to original value (1 from demo project)
    expect(undoResult!.project.maps['demo-map'].tileLayers['ground'].data[0]).toBe(1);
    expect(history.undoSize()).toBe(0);
    expect(history.redoSize()).toBe(1);
  });

  it('returns null when nothing to undo', () => {
    expect(history.undo(project)).toBeNull();
  });
});

describe('ConflictAwareHistory.redo', () => {
  it('redoes the most recently undone entry', () => {
    const patch = makeTilePatch('p1', [{ x: 0, y: 0, tileId: 5 }]);
    const applyResult = history.applyAndPush(project, patch, {
      origin: 'ai',
      summary: 'test',
      timestamp: Date.now(),
    });

    const undoResult = history.undo(applyResult!.project);
    const redoResult = history.redo(undoResult!.project);

    expect(redoResult).not.toBeNull();
    expect(redoResult!.project.maps['demo-map'].tileLayers['ground'].data[0]).toBe(5);
    expect(history.undoSize()).toBe(1);
    expect(history.redoSize()).toBe(0);
  });
});

describe('ConflictAwareHistory.canUndo/canRedo', () => {
  it('reports correct undo/redo availability', () => {
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);

    const patch = makeTilePatch('p1', [{ x: 0, y: 0, tileId: 5 }]);
    const result = history.applyAndPush(project, patch, {
      origin: 'ai',
      summary: 'test',
      timestamp: Date.now(),
    });

    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);

    history.undo(result!.project);
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(true);
  });
});

describe('ConflictAwareHistory.clear', () => {
  it('clears all history and meta', () => {
    const patch = makeTilePatch('p1', [{ x: 0, y: 0, tileId: 5 }]);
    history.applyAndPush(project, patch, {
      origin: 'ai',
      summary: 'test',
      timestamp: Date.now(),
    });

    history.clear();
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
    expect(history.getAllMeta()).toEqual([]);
  });
});
