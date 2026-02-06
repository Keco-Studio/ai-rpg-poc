/**
 * Integration Test: Manual Edit Flow
 *
 * Tests: create project → paint tiles → undo → redo → paint collision →
 * undo → verify project state at each step.
 */

import { describe, it, expect } from 'vitest';
import { TransactionManager } from '../../src/state/transaction.js';
import { ConflictAwareHistory } from '../../src/state/conflictAwareHistory.js';
import { createDemoProject } from '../../src/demoProject.js';
import type { Project } from '@ai-rpg-maker/shared';

describe('Manual Edit Flow', () => {
  it('paint tiles → undo → redo → verify state', () => {
    const project = createDemoProject();
    const txManager = new TransactionManager();
    const history = new ConflictAwareHistory();

    // Step 1: Paint 3 tiles
    const tx1 = txManager.begin('brush', 'demo-map', 'ground');
    txManager.addCells(tx1, [
      { x: 0, y: 0, value: 10 },
      { x: 1, y: 0, value: 10 },
      { x: 2, y: 0, value: 10 },
    ]);
    const result1 = txManager.commit(tx1, project, 10);
    expect(result1).not.toBeNull();

    // Push to history
    const pushResult = history.applyAndPush(project, result1!.patch, {
      origin: 'manual',
      summary: result1!.meta.summary,
      timestamp: Date.now(),
    });
    expect(pushResult).not.toBeNull();

    let currentProject = pushResult!.project;

    // Verify tiles were painted
    const layer = currentProject.maps['demo-map'].tileLayers['ground'];
    expect(layer.data[0]).toBe(10);
    expect(layer.data[1]).toBe(10);
    expect(layer.data[2]).toBe(10);

    // Step 2: Undo
    const undoResult = history.undo(currentProject);
    expect(undoResult).not.toBeNull();
    currentProject = undoResult!.project;

    // Verify tiles reverted
    const undoneLayer = currentProject.maps['demo-map'].tileLayers['ground'];
    expect(undoneLayer.data[0]).toBe(1); // Original grass
    expect(undoneLayer.data[1]).toBe(1);
    expect(undoneLayer.data[2]).toBe(1);

    // Step 3: Redo
    const redoResult = history.redo(currentProject);
    expect(redoResult).not.toBeNull();
    currentProject = redoResult!.project;

    // Verify tiles restored
    const redoneLayer = currentProject.maps['demo-map'].tileLayers['ground'];
    expect(redoneLayer.data[0]).toBe(10);
    expect(redoneLayer.data[1]).toBe(10);
    expect(redoneLayer.data[2]).toBe(10);
  });

  it('paint collision → undo → verify state', () => {
    const project = createDemoProject();
    const txManager = new TransactionManager();
    const history = new ConflictAwareHistory();

    // Paint collision
    const tx = txManager.begin('collision', 'demo-map', null);
    txManager.addCells(tx, [
      { x: 5, y: 5, value: 1 },
      { x: 6, y: 5, value: 1 },
    ]);
    const result = txManager.commit(tx, project, 0);
    expect(result).not.toBeNull();

    const pushResult = history.applyAndPush(project, result!.patch, {
      origin: 'manual',
      summary: result!.meta.summary,
      timestamp: Date.now(),
    });
    let currentProject = pushResult!.project;

    // Verify collision set
    const mapWidth = 16;
    expect(currentProject.maps['demo-map'].collisionLayer[5 * mapWidth + 5]).toBe(1);
    expect(currentProject.maps['demo-map'].collisionLayer[5 * mapWidth + 6]).toBe(1);

    // Undo
    const undoResult = history.undo(currentProject);
    currentProject = undoResult!.project;

    // Verify collision reverted
    expect(currentProject.maps['demo-map'].collisionLayer[5 * mapWidth + 5]).toBe(0);
    expect(currentProject.maps['demo-map'].collisionLayer[5 * mapWidth + 6]).toBe(0);
  });

  it('rect tool produces paintRect op', () => {
    const project = createDemoProject();
    const txManager = new TransactionManager();

    // Simulate rect tool: all cells form a filled rectangle
    const tx = txManager.begin('rect', 'demo-map', 'ground');
    const cells = [];
    for (let y = 2; y <= 4; y++) {
      for (let x = 3; x <= 6; x++) {
        cells.push({ x, y, value: 5 });
      }
    }
    txManager.addCells(tx, cells);
    const result = txManager.commit(tx, project, 5);

    expect(result).not.toBeNull();
    // Should produce a paintRect op (rectangle optimization)
    const paintRectOps = result!.patch.ops.filter((op) => op.op === 'paintRect');
    expect(paintRectOps.length).toBe(1);
    if (paintRectOps[0].op === 'paintRect') {
      expect(paintRectOps[0].x).toBe(3);
      expect(paintRectOps[0].y).toBe(2);
      expect(paintRectOps[0].w).toBe(4);
      expect(paintRectOps[0].h).toBe(3);
    }
  });

  it('erase tool produces clearTiles op', () => {
    const project = createDemoProject();
    const txManager = new TransactionManager();

    const tx = txManager.begin('erase', 'demo-map', 'ground');
    txManager.addCells(tx, [
      { x: 0, y: 0, value: 0 },
      { x: 1, y: 0, value: 0 },
    ]);
    const result = txManager.commit(tx, project, 0);

    expect(result).not.toBeNull();
    const clearOps = result!.patch.ops.filter((op) => op.op === 'clearTiles');
    expect(clearOps.length).toBe(1);
  });
});
