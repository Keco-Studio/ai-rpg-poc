/**
 * Unit Tests: Conflict Detection
 *
 * Tests for detectConflicts() and buildConflictHunks().
 * Covers: no conflicts, conflicts detected, partial conflicts.
 */

import { describe, it, expect } from 'vitest';
import { detectConflicts, buildConflictHunks } from '../../src/ai/conflict.js';
import { applyPatch } from '../../src/patch/apply.js';
import {
  createTestProject,
  createValidPatch,
} from './fixtures.js';
import type { ConflictHunk } from '../../src/ai/types.js';
import type { Project } from '../../src/schema/types.js';

describe('detectConflicts', () => {
  // ========================================================================
  // T126: No conflicts detected when unchanged
  // ========================================================================
  describe('no conflicts', () => {
    it('detects no conflicts when project unchanged since patch', () => {
      const project = createTestProject();
      const patch = createValidPatch();

      // Apply the patch
      const { project: afterProject } = applyPatch(project, patch);

      // Build hunks from applied patch
      const hunks = buildConflictHunks(afterProject, patch);

      // Check conflicts against the same (unchanged) state
      const result = detectConflicts(afterProject, hunks);

      expect(result.hasConflicts).toBe(false);
      expect(result.conflicts).toEqual([]);
      expect(result.safeHunks.length).toBe(hunks.length);
    });
  });

  // ========================================================================
  // T127: Conflicts detected when manually edited
  // ========================================================================
  describe('conflicts detected', () => {
    it('detects conflict when entity was manually changed', () => {
      const project = createTestProject();

      // Create a hunk for an entity that was "applied" in a patch
      const hunks: ConflictHunk[] = [
        {
          type: 'entity',
          ref: 'map:town01:entity:guard_1',
          postPatchSnapshot: JSON.stringify({
            instanceId: 'guard_1',
            entityDefId: 'npc_guard',
            position: { x: 5, y: 3 },
          }),
        },
      ];

      // Manually move the entity (simulating user edit)
      const modifiedProject = structuredClone(project);
      modifiedProject.maps.town01.entities[0].position = { x: 8, y: 8 };

      const result = detectConflicts(modifiedProject, hunks);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts.length).toBe(1);
      expect(result.conflicts[0].hunkRef).toBe('map:town01:entity:guard_1');
      expect(result.conflicts[0].humanReadable).toContain('guard_1');
    });

    it('detects conflict when tiles were manually changed', () => {
      const project = createTestProject();

      // Create a hunk capturing the current tile data
      const hunks: ConflictHunk[] = [
        {
          type: 'tiles',
          ref: 'map:town01:layer:ground',
          postPatchSnapshot: JSON.stringify(
            project.maps.town01.tileLayers.ground.data,
          ),
        },
      ];

      // Manually change a tile
      const modifiedProject = structuredClone(project);
      modifiedProject.maps.town01.tileLayers.ground.data[0] = 999;

      const result = detectConflicts(modifiedProject, hunks);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts.length).toBe(1);
      expect(result.conflicts[0].humanReadable).toContain('town01');
      expect(result.conflicts[0].humanReadable).toContain('ground');
    });
  });

  // ========================================================================
  // T128: Partial conflicts (some hunks safe, some conflict)
  // ========================================================================
  describe('partial conflicts', () => {
    it('separates safe hunks from conflicting hunks', () => {
      const project = createTestProject();

      const hunks: ConflictHunk[] = [
        {
          type: 'entity',
          ref: 'map:town01:entity:guard_1',
          postPatchSnapshot: JSON.stringify({
            instanceId: 'guard_1',
            entityDefId: 'npc_guard',
            position: { x: 5, y: 3 },
          }),
        },
        {
          type: 'entity',
          ref: 'map:town01:entity:merchant_1',
          postPatchSnapshot: JSON.stringify({
            instanceId: 'merchant_1',
            entityDefId: 'npc_merchant',
            position: { x: 2, y: 7 },
          }),
        },
      ];

      // Only modify guard, leave merchant unchanged
      const modifiedProject = structuredClone(project);
      modifiedProject.maps.town01.entities[0].position = { x: 9, y: 9 };

      const result = detectConflicts(modifiedProject, hunks);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflicts.length).toBe(1);
      expect(result.safeHunks.length).toBe(1);
      expect(result.conflicts[0].hunkRef).toBe('map:town01:entity:guard_1');
      expect(result.safeHunks[0]).toBe('map:town01:entity:merchant_1');
    });
  });
});

describe('buildConflictHunks', () => {
  it('creates hunks for tile operations', () => {
    const project = createTestProject();
    const patch = createValidPatch();

    // Apply the patch to get post-apply state
    const { project: afterProject } = applyPatch(project, patch);

    const hunks = buildConflictHunks(afterProject, patch);

    // Should have hunks for the created map's layer and the placed entity
    expect(hunks.length).toBeGreaterThan(0);

    // Should have a tile hunk
    const tileHunk = hunks.find((h) => h.type === 'tiles');
    expect(tileHunk).toBeDefined();
    expect(tileHunk!.ref).toContain('forest01');
  });

  it('creates hunks for entity operations', () => {
    const project = createTestProject();
    const patch = createValidPatch();

    const { project: afterProject } = applyPatch(project, patch);
    const hunks = buildConflictHunks(afterProject, patch);

    const entityHunk = hunks.find((h) => h.type === 'entity');
    expect(entityHunk).toBeDefined();
    expect(entityHunk!.ref).toContain('ranger_1');
  });

  it('deduplicates hunks for same ref', () => {
    const project = createTestProject();

    // Patch with multiple ops affecting same entity
    const patch = {
      ...createValidPatch(),
      patchId: 'dedup-test',
    };

    const { project: afterProject } = applyPatch(project, patch);
    const hunks = buildConflictHunks(afterProject, patch);

    // Each ref should appear at most once
    const refs = hunks.map((h) => h.ref);
    const uniqueRefs = new Set(refs);
    expect(refs.length).toBe(uniqueRefs.size);
  });
});
