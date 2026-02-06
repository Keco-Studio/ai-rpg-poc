/**
 * Unit Tests: Transaction Manager
 *
 * Tests: begin creates Transaction, addCells accumulates,
 * commit builds valid PatchV1, cancel clears transaction.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TransactionManager } from '../../src/state/transaction.js';
import { createDemoProject } from '../../src/demoProject.js';
import type { Project } from '@ai-rpg-maker/shared';

let project: Project;
let txManager: TransactionManager;

beforeEach(() => {
  project = createDemoProject();
  txManager = new TransactionManager();
});

describe('TransactionManager.begin', () => {
  it('creates a transaction with correct fields', () => {
    const tx = txManager.begin('brush', 'demo-map', 'ground');
    expect(tx.toolType).toBe('brush');
    expect(tx.mapId).toBe('demo-map');
    expect(tx.layerId).toBe('ground');
    expect(tx.cells).toEqual([]);
    expect(tx.entityOps).toEqual([]);
    expect(tx.id).toBeTruthy();
    expect(tx.startedAt).toBeGreaterThan(0);
  });

  it('creates unique transaction IDs', () => {
    const tx1 = txManager.begin('brush', 'demo-map', 'ground');
    txManager.cancel();
    const tx2 = txManager.begin('brush', 'demo-map', 'ground');
    expect(tx1.id).not.toBe(tx2.id);
  });
});

describe('TransactionManager.addCells', () => {
  it('accumulates cells into the transaction', () => {
    const tx = txManager.begin('brush', 'demo-map', 'ground');
    txManager.addCells(tx, [{ x: 0, y: 0, value: 5 }]);
    expect(tx.cells).toHaveLength(1);

    txManager.addCells(tx, [
      { x: 1, y: 0, value: 5 },
      { x: 2, y: 0, value: 5 },
    ]);
    expect(tx.cells).toHaveLength(3);
  });
});

describe('TransactionManager.addOps', () => {
  it('accumulates entity ops into the transaction', () => {
    const tx = txManager.begin('entity', 'demo-map', null);
    txManager.addOps(tx, [
      {
        op: 'placeEntity',
        mapId: 'demo-map',
        instance: { id: 'inst-1', entityId: 'guard-entity', x: 3, y: 3 },
      },
    ]);
    expect(tx.entityOps).toHaveLength(1);
  });
});

describe('TransactionManager.commit', () => {
  it('builds valid PatchV1 and returns ApplyResult + meta', () => {
    const tx = txManager.begin('brush', 'demo-map', 'ground');
    txManager.addCells(tx, [
      { x: 0, y: 0, value: 5 },
      { x: 1, y: 0, value: 5 },
      { x: 2, y: 0, value: 5 },
    ]);

    const result = txManager.commit(tx, project, 5);
    expect(result).not.toBeNull();
    expect(result!.patch.patchVersion).toBe(1);
    expect(result!.patch.ops.length).toBeGreaterThan(0);
    expect(result!.result.project).toBeTruthy();
    expect(result!.meta.origin).toBe('manual');
    expect(result!.meta.summary).toContain('Painted');
    expect(result!.meta.timestamp).toBeGreaterThan(0);
  });

  it('returns null for empty transaction', () => {
    const tx = txManager.begin('brush', 'demo-map', 'ground');
    const result = txManager.commit(tx, project, 5);
    expect(result).toBeNull();
  });

  it('applies tile changes to the project', () => {
    const tx = txManager.begin('brush', 'demo-map', 'ground');
    txManager.addCells(tx, [{ x: 0, y: 0, value: 10 }]);

    const result = txManager.commit(tx, project, 10);
    expect(result).not.toBeNull();

    const updatedMap = result!.result.project.maps['demo-map'];
    const layer = updatedMap.tileLayers['ground'];
    expect(layer.data[0]).toBe(10);
  });

  it('builds collision ops for collision tool', () => {
    const tx = txManager.begin('collision', 'demo-map', null);
    txManager.addCells(tx, [
      { x: 0, y: 0, value: 1 },
      { x: 1, y: 0, value: 1 },
    ]);

    const result = txManager.commit(tx, project, 0);
    expect(result).not.toBeNull();

    const updatedMap = result!.result.project.maps['demo-map'];
    expect(updatedMap.collisionLayer[0]).toBe(1);
    expect(updatedMap.collisionLayer[1]).toBe(1);
  });

  it('handles entity ops via commit', () => {
    const tx = txManager.begin('entity', 'demo-map', null);
    txManager.addOps(tx, [
      {
        op: 'placeEntity',
        mapId: 'demo-map',
        instance: { id: 'new-guard', entityId: 'guard-entity', x: 3, y: 3 },
      },
    ]);

    const result = txManager.commit(tx, project, 0);
    expect(result).not.toBeNull();

    const updatedMap = result!.result.project.maps['demo-map'];
    const newEntity = updatedMap.entities.find(
      (e) => e.instanceId === 'new-guard',
    );
    expect(newEntity).toBeTruthy();
    expect(newEntity!.position).toEqual({ x: 3, y: 3 });
  });
});

describe('TransactionManager.cancel', () => {
  it('clears the current transaction', () => {
    txManager.begin('brush', 'demo-map', 'ground');
    txManager.cancel();
    // After cancel, begin should work without issue
    const tx = txManager.begin('brush', 'demo-map', 'ground');
    expect(tx).toBeTruthy();
  });
});
