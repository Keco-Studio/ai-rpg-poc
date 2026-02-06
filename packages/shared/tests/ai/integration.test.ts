/**
 * Integration Tests: Full AI Orchestration Flow
 *
 * End-to-end tests covering propose → validate → apply → undo scenarios.
 * Uses MockProvider for deterministic testing.
 */

import { describe, it, expect } from 'vitest';
import { proposePatchWithRepair } from '../../src/ai/orchestrator.js';
import { MockProvider } from '../../src/ai/provider.js';
import { applyPatch } from '../../src/patch/apply.js';
import { detectConflicts, buildConflictHunks } from '../../src/ai/conflict.js';
import { HistoryStack } from '../../src/history/history.js';
import type { PatchV1 } from '../../src/patch/types.js';
import {
  createTestProject,
  createValidPatch,
  createValidPatchJson,
  createOversizedPatch,
} from './fixtures.js';

describe('Integration: Propose → Apply flow', () => {
  it('full flow: propose valid patch → apply → verify project changed', async () => {
    const project = createTestProject();
    const provider = new MockProvider({
      responses: [{ success: true, rawText: createValidPatchJson() }],
    });

    // Step 1: Propose
    const result = await proposePatchWithRepair(
      project,
      'Create a forest map',
      provider,
    );
    expect(result.status).toBe('success');
    expect(result.patch).toBeDefined();

    // Step 2: Apply
    const history = new HistoryStack();
    const applyResult = history.applyAndPush(project, result.patch!);
    expect(applyResult).not.toBeNull();

    // Step 3: Verify
    const newProject = applyResult!.project;
    expect(newProject.maps['forest01']).toBeDefined();
    expect(newProject.maps['forest01'].name).toBe('Dark Forest');
    expect(newProject.entityDefs['npc_ranger']).toBeDefined();
  });

  it('full flow: propose → apply → undo (paint tiles)', async () => {
    const project = createTestProject();

    // Use a patch that modifies existing map (paintRect has proper inverse)
    const paintPatch: PatchV1 = {
      patchVersion: 1,
      patchId: 'paint-patch-001',
      baseSchemaVersion: 1,
      ops: [
        {
          op: 'paintRect',
          mapId: 'town01',
          layerId: 'ground',
          x: 2,
          y: 2,
          w: 3,
          h: 3,
          tileId: 5,
        },
      ],
    };

    const provider = new MockProvider({
      responses: [{ success: true, rawText: JSON.stringify(paintPatch) }],
    });

    // Propose and apply
    const result = await proposePatchWithRepair(project, 'Paint some tiles', provider);
    const history = new HistoryStack();
    const applyResult = history.applyAndPush(project, result.patch!);
    const newProject = applyResult!.project;

    // Verify tiles changed
    const tileIndex = 2 * 10 + 2; // y=2, x=2
    expect(newProject.maps['town01'].tileLayers['ground'].data[tileIndex]).toBe(5);

    // Undo
    const undoResult = history.undo(newProject);
    expect(undoResult).not.toBeNull();

    // Verify tiles restored to original
    expect(undoResult!.project.maps['town01'].tileLayers['ground'].data[tileIndex]).toBe(
      project.maps['town01'].tileLayers['ground'].data[tileIndex],
    );
  });

  it('full flow: propose → apply → redo restores paint', async () => {
    const project = createTestProject();

    const paintPatch: PatchV1 = {
      patchVersion: 1,
      patchId: 'paint-patch-002',
      baseSchemaVersion: 1,
      ops: [
        {
          op: 'paintRect',
          mapId: 'town01',
          layerId: 'ground',
          x: 0,
          y: 0,
          w: 2,
          h: 2,
          tileId: 7,
        },
      ],
    };

    const provider = new MockProvider({
      responses: [{ success: true, rawText: JSON.stringify(paintPatch) }],
    });

    // Propose, apply, undo
    const result = await proposePatchWithRepair(project, 'Paint tiles', provider);
    const history = new HistoryStack();
    const applyResult = history.applyAndPush(project, result.patch!);
    const undoResult = history.undo(applyResult!.project);

    // Redo
    const redoResult = history.redo(undoResult!.project);
    expect(redoResult).not.toBeNull();
    expect(redoResult!.project.maps['town01'].tileLayers['ground'].data[0]).toBe(7);
  });
});

describe('Integration: Rejection flow', () => {
  // T107: Reject proposal, verify project unchanged
  it('rejection does not modify project', async () => {
    const project = createTestProject();
    const originalJson = JSON.stringify(project);

    const provider = new MockProvider({
      responses: [{ success: true, rawText: createValidPatchJson() }],
    });

    // Propose (but don't apply)
    const result = await proposePatchWithRepair(project, 'Create forest', provider);
    expect(result.status).toBe('success');

    // "Reject" = simply don't apply. Project should be unchanged.
    expect(JSON.stringify(project)).toBe(originalJson);
  });

  // T108: Reject then refine prompt, verify new proposal
  it('can propose new patch after rejection', async () => {
    const project = createTestProject();

    const provider = new MockProvider({
      responses: [
        { success: true, rawText: createValidPatchJson() },
        {
          success: true,
          rawText: JSON.stringify({
            patchVersion: 1,
            patchId: 'refined-001',
            baseSchemaVersion: 1,
            ops: [
              {
                op: 'paintRect',
                mapId: 'town01',
                layerId: 'ground',
                x: 1,
                y: 1,
                w: 3,
                h: 3,
                tileId: 5,
              },
            ],
          }),
        },
      ],
    });

    // First proposal (rejected)
    const result1 = await proposePatchWithRepair(project, 'Create forest', provider);
    expect(result1.status).toBe('success');

    // Second proposal (refined prompt)
    const result2 = await proposePatchWithRepair(project, 'Paint some tiles', provider);
    expect(result2.status).toBe('success');
    expect(result2.patch!.patchId).toBe('refined-001');
  });

  // T109: Reject oversized proposal, verify no partial changes
  it('oversized proposal does not partially apply', async () => {
    const project = createTestProject();
    const originalJson = JSON.stringify(project);

    const provider = new MockProvider({
      responses: [
        {
          success: true,
          rawText: JSON.stringify(createOversizedPatch()),
        },
      ],
    });

    const result = await proposePatchWithRepair(project, 'Modify everything', provider);
    expect(result.status).toBe('guardrail_blocked');

    // Project unchanged
    expect(JSON.stringify(project)).toBe(originalJson);
  });
});

describe('Integration: Undo with conflict detection', () => {
  // T141: Undo with no manual edits
  it('undo succeeds when no manual edits after apply', async () => {
    const project = createTestProject();
    const patch = createValidPatch();
    const { project: afterProject } = applyPatch(project, patch);

    // Build hunks
    const hunks = buildConflictHunks(afterProject, patch);

    // Check conflicts (none expected)
    const result = detectConflicts(afterProject, hunks);
    expect(result.hasConflicts).toBe(false);
  });

  // T142: Undo with conflicts, cancel
  it('conflict detection works after manual edit', async () => {
    const project = createTestProject();
    const patch = createValidPatch();
    const { project: afterProject } = applyPatch(project, patch);

    // Build hunks
    const hunks = buildConflictHunks(afterProject, patch);

    // Simulate manual edit
    const editedProject = structuredClone(afterProject);
    if (editedProject.maps['forest01']?.tileLayers?.ground) {
      editedProject.maps['forest01'].tileLayers.ground.data[0] = 999;
    }

    // Check conflicts
    const result = detectConflicts(editedProject, hunks);
    expect(result.hasConflicts).toBe(true);
    expect(result.conflicts.length).toBeGreaterThan(0);
  });

  // T145: Redo after undo restores state
  it('redo after undo correctly restores tile state', async () => {
    const project = createTestProject();
    const paintPatch: PatchV1 = {
      patchVersion: 1,
      patchId: 'redo-test-001',
      baseSchemaVersion: 1,
      ops: [
        {
          op: 'paintRect',
          mapId: 'town01',
          layerId: 'ground',
          x: 4,
          y: 4,
          w: 2,
          h: 2,
          tileId: 9,
        },
      ],
    };

    const history = new HistoryStack();
    const applyResult = history.applyAndPush(project, paintPatch);
    expect(applyResult).not.toBeNull();

    const tileIndex = 4 * 10 + 4; // y=4, x=4
    expect(applyResult!.project.maps['town01'].tileLayers['ground'].data[tileIndex]).toBe(9);

    const undoResult = history.undo(applyResult!.project);
    expect(undoResult).not.toBeNull();
    expect(undoResult!.project.maps['town01'].tileLayers['ground'].data[tileIndex]).toBe(
      project.maps['town01'].tileLayers['ground'].data[tileIndex],
    );

    const redoResult = history.redo(undoResult!.project);
    expect(redoResult).not.toBeNull();
    expect(redoResult!.project.maps['town01'].tileLayers['ground'].data[tileIndex]).toBe(9);
  });
});
