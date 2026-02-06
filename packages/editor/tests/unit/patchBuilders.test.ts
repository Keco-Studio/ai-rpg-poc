/**
 * Unit Tests: Patch Builders
 *
 * Tests: brush stroke → setTiles; rectangular stroke → paintRect;
 * collision cells; entity place/move/delete ops; rect fill op
 */

import { describe, it, expect } from 'vitest';
import {
  buildTileOps,
  buildCollisionOps,
  buildRectFillOp,
  buildPlaceEntityOp,
  buildMoveEntityOp,
  buildDeleteEntityOp,
  buildCreateTriggerOp,
} from '../../src/adapters/patchBuilders.js';
import type { CellChange } from '../../src/state/types.js';

describe('buildTileOps', () => {
  it('returns empty array for empty cells', () => {
    const ops = buildTileOps([], 'map:test', 'layer:ground', 1);
    expect(ops).toEqual([]);
  });

  it('emits setTiles for scattered brush strokes', () => {
    const cells: CellChange[] = [
      { x: 0, y: 0, value: 5 },
      { x: 3, y: 1, value: 5 },
      { x: 7, y: 4, value: 5 },
    ];
    const ops = buildTileOps(cells, 'map:test', 'layer:ground', 5);
    expect(ops).toHaveLength(1);
    expect(ops[0].op).toBe('setTiles');
    if (ops[0].op === 'setTiles') {
      expect(ops[0].cells).toHaveLength(3);
      expect(ops[0].mapId).toBe('map:test');
      expect(ops[0].layerId).toBe('layer:ground');
    }
  });

  it('emits paintRect for rectangular brush stroke', () => {
    // A 3x2 rectangle from (1,1) to (3,2)
    const cells: CellChange[] = [
      { x: 1, y: 1, value: 5 },
      { x: 2, y: 1, value: 5 },
      { x: 3, y: 1, value: 5 },
      { x: 1, y: 2, value: 5 },
      { x: 2, y: 2, value: 5 },
      { x: 3, y: 2, value: 5 },
    ];
    const ops = buildTileOps(cells, 'map:test', 'layer:ground', 5);
    expect(ops).toHaveLength(1);
    expect(ops[0].op).toBe('paintRect');
    if (ops[0].op === 'paintRect') {
      expect(ops[0].x).toBe(1);
      expect(ops[0].y).toBe(1);
      expect(ops[0].w).toBe(3);
      expect(ops[0].h).toBe(2);
      expect(ops[0].tileId).toBe(5);
    }
  });

  it('emits setTiles when rectangle has mixed tile values', () => {
    const cells: CellChange[] = [
      { x: 0, y: 0, value: 1 },
      { x: 1, y: 0, value: 2 },
      { x: 0, y: 1, value: 1 },
      { x: 1, y: 1, value: 2 },
    ];
    const ops = buildTileOps(cells, 'map:test', 'layer:ground', 1);
    expect(ops).toHaveLength(1);
    expect(ops[0].op).toBe('setTiles');
  });

  it('emits clearTiles for erase (all values 0)', () => {
    const cells: CellChange[] = [
      { x: 0, y: 0, value: 0 },
      { x: 1, y: 0, value: 0 },
      { x: 2, y: 0, value: 0 },
    ];
    const ops = buildTileOps(cells, 'map:test', 'layer:ground', 0);
    expect(ops).toHaveLength(1);
    expect(ops[0].op).toBe('clearTiles');
    if (ops[0].op === 'clearTiles') {
      expect(ops[0].cells).toHaveLength(3);
    }
  });

  it('emits paintRect for single cell', () => {
    const cells: CellChange[] = [{ x: 5, y: 3, value: 10 }];
    const ops = buildTileOps(cells, 'map:test', 'layer:ground', 10);
    expect(ops).toHaveLength(1);
    // Single cell is technically a 1x1 rectangle
    expect(ops[0].op).toBe('paintRect');
    if (ops[0].op === 'paintRect') {
      expect(ops[0].w).toBe(1);
      expect(ops[0].h).toBe(1);
    }
  });
});

describe('buildCollisionOps', () => {
  it('returns empty array for empty cells', () => {
    const ops = buildCollisionOps([], 'map:test');
    expect(ops).toEqual([]);
  });

  it('emits setCollisionCells for scattered collision cells', () => {
    const cells: CellChange[] = [
      { x: 0, y: 0, value: 1 },
      { x: 5, y: 3, value: 1 },
      { x: 10, y: 7, value: 1 },
    ];
    const ops = buildCollisionOps(cells, 'map:test');
    expect(ops).toHaveLength(1);
    expect(ops[0].op).toBe('setCollisionCells');
  });

  it('emits setCollisionRect for rectangular collision region', () => {
    const cells: CellChange[] = [
      { x: 2, y: 2, value: 1 },
      { x: 3, y: 2, value: 1 },
      { x: 2, y: 3, value: 1 },
      { x: 3, y: 3, value: 1 },
    ];
    const ops = buildCollisionOps(cells, 'map:test');
    expect(ops).toHaveLength(1);
    expect(ops[0].op).toBe('setCollisionRect');
    if (ops[0].op === 'setCollisionRect') {
      expect(ops[0].x).toBe(2);
      expect(ops[0].y).toBe(2);
      expect(ops[0].w).toBe(2);
      expect(ops[0].h).toBe(2);
      expect(ops[0].solid).toBe(1);
    }
  });
});

describe('buildRectFillOp', () => {
  it('creates a paintRect op', () => {
    const op = buildRectFillOp('map:test', 'layer:ground', 5, 2, 3, 4, 5);
    expect(op.op).toBe('paintRect');
    if (op.op === 'paintRect') {
      expect(op.mapId).toBe('map:test');
      expect(op.layerId).toBe('layer:ground');
      expect(op.tileId).toBe(5);
      expect(op.x).toBe(2);
      expect(op.y).toBe(3);
      expect(op.w).toBe(4);
      expect(op.h).toBe(5);
    }
  });
});

describe('entity ops', () => {
  it('buildPlaceEntityOp creates a placeEntity op', () => {
    const op = buildPlaceEntityOp('map:test', 'entity:guard', 5, 10);
    expect(op.op).toBe('placeEntity');
    if (op.op === 'placeEntity') {
      expect(op.mapId).toBe('map:test');
      expect(op.instance.entityId).toBe('entity:guard');
      expect(op.instance.x).toBe(5);
      expect(op.instance.y).toBe(10);
      expect(op.instance.id).toBeTruthy();
    }
  });

  it('buildMoveEntityOp creates a moveEntity op', () => {
    const op = buildMoveEntityOp('map:test', 'instance:guard-1', 7, 8);
    expect(op.op).toBe('moveEntity');
    if (op.op === 'moveEntity') {
      expect(op.mapId).toBe('map:test');
      expect(op.instanceId).toBe('instance:guard-1');
      expect(op.x).toBe(7);
      expect(op.y).toBe(8);
    }
  });

  it('buildDeleteEntityOp creates a deleteEntity op', () => {
    const op = buildDeleteEntityOp('map:test', 'instance:guard-1');
    expect(op.op).toBe('deleteEntity');
    if (op.op === 'deleteEntity') {
      expect(op.mapId).toBe('map:test');
      expect(op.instanceId).toBe('instance:guard-1');
    }
  });
});

describe('buildCreateTriggerOp', () => {
  it('creates a createTrigger op', () => {
    const op = buildCreateTriggerOp('map:test', 'trigger:entrance', {
      x: 0, y: 5, width: 2, height: 3,
    });
    expect(op.op).toBe('createTrigger');
    if (op.op === 'createTrigger') {
      expect(op.mapId).toBe('map:test');
      expect(op.trigger.id).toBe('trigger:entrance');
      expect(op.trigger.rect).toEqual({ x: 0, y: 5, w: 2, h: 3 });
    }
  });
});
