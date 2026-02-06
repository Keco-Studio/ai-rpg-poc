/**
 * Integration Test: AI Patch Flow
 *
 * Tests: create project → apply patch → verify project updated and
 * history entry has AI origin → verify undo reverts.
 */

import { describe, it, expect } from 'vitest';
import { ConflictAwareHistory } from '../../src/state/conflictAwareHistory.js';
import { createDemoProject } from '../../src/demoProject.js';
import type { PatchV1 } from '@ai-rpg-maker/shared';

describe('AI Patch Flow', () => {
  it('apply AI patch → verify project updated → history has AI origin', () => {
    const project = createDemoProject();
    const history = new ConflictAwareHistory();

    // Simulate an AI-generated patch that paints tiles
    const aiPatch: PatchV1 = {
      patchVersion: 1,
      patchId: 'ai-patch-001',
      baseSchemaVersion: 1,
      meta: {
        author: 'AI',
        note: 'AI-generated tile changes',
      },
      ops: [
        {
          op: 'paintRect',
          mapId: 'demo-map',
          layerId: 'ground',
          x: 0,
          y: 0,
          w: 4,
          h: 4,
          tileId: 15,
        },
      ],
    };

    // Apply the patch
    const result = history.applyAndPush(project, aiPatch, {
      origin: 'ai',
      summary: 'AI: Fill 4x4 area with tile 15',
      timestamp: Date.now(),
    });

    expect(result).not.toBeNull();

    // Verify project was updated
    const updatedMap = result!.project.maps['demo-map'];
    const layer = updatedMap.tileLayers['ground'];
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        expect(layer.data[y * 16 + x]).toBe(15);
      }
    }

    // Verify tile outside the rect was not changed
    expect(layer.data[5]).toBe(1); // Original grass

    // Verify history metadata
    const meta = history.getAllMeta();
    expect(meta).toHaveLength(1);
    expect(meta[0].origin).toBe('ai');
    expect(meta[0].summary).toContain('AI');
  });

  it('apply AI patch → undo → verify project reverted', () => {
    const project = createDemoProject();
    const history = new ConflictAwareHistory();

    const aiPatch: PatchV1 = {
      patchVersion: 1,
      patchId: 'ai-patch-002',
      baseSchemaVersion: 1,
      ops: [
        {
          op: 'placeEntity',
          mapId: 'demo-map',
          instance: {
            id: 'ai-npc-1',
            entityId: 'guard-entity',
            x: 10,
            y: 10,
          },
        },
      ],
    };

    const applyResult = history.applyAndPush(project, aiPatch, {
      origin: 'ai',
      summary: 'AI: Place guard NPC',
      timestamp: Date.now(),
    });
    expect(applyResult).not.toBeNull();

    // Verify entity was placed
    const placedEntity = applyResult!.project.maps['demo-map'].entities.find(
      (e) => e.instanceId === 'ai-npc-1',
    );
    expect(placedEntity).toBeTruthy();
    expect(placedEntity!.position).toEqual({ x: 10, y: 10 });

    // Undo
    const undoResult = history.undo(applyResult!.project);
    expect(undoResult).not.toBeNull();

    // Verify entity was removed
    const removedEntity = undoResult!.project.maps['demo-map'].entities.find(
      (e) => e.instanceId === 'ai-npc-1',
    );
    expect(removedEntity).toBeUndefined();
  });

  it('reject AI proposal → project unchanged', () => {
    const project = createDemoProject();
    const history = new ConflictAwareHistory();

    // Simulate reject: simply don't apply the patch
    // The history should remain empty
    expect(history.undoSize()).toBe(0);
    expect(history.getAllMeta()).toEqual([]);

    // Project should be unchanged
    expect(project.maps['demo-map'].tileLayers['ground'].data[0]).toBe(1);
  });
});
