/**
 * Unit Tests: ProjectSummary Generation
 *
 * Tests for buildProjectSummary() function.
 * Covers: deterministic ordering, array exclusion, constraint inclusion.
 */

import { describe, it, expect } from 'vitest';
import { buildProjectSummary } from '../../src/ai/projectSummary.js';
import { createTestProject } from './fixtures.js';

describe('buildProjectSummary', () => {
  // ========================================================================
  // T016: Stable ordering
  // ========================================================================
  describe('deterministic ordering', () => {
    it('produces identical output for the same project', () => {
      const project = createTestProject();
      const summary1 = buildProjectSummary(project);
      const summary2 = buildProjectSummary(project);

      expect(JSON.stringify(summary1)).toBe(JSON.stringify(summary2));
    });

    it('sorts tileset IDs alphabetically', () => {
      const project = createTestProject();
      const summary = buildProjectSummary(project);

      const ids = summary.tilesets.map((t) => t.id);
      expect(ids).toEqual([...ids].sort());
      // 'characters' should come before 'overworld'
      expect(ids[0]).toBe('characters');
      expect(ids[1]).toBe('overworld');
    });

    it('sorts map IDs alphabetically', () => {
      const project = createTestProject();
      const summary = buildProjectSummary(project);

      const ids = summary.maps.map((m) => m.id);
      expect(ids).toEqual([...ids].sort());
    });

    it('sorts entity def IDs alphabetically', () => {
      const project = createTestProject();
      const summary = buildProjectSummary(project);

      const ids = summary.entityDefs.map((e) => e.typeId);
      expect(ids).toEqual([...ids].sort());
      // 'npc_guard' should come before 'npc_merchant'
      expect(ids[0]).toBe('npc_guard');
      expect(ids[1]).toBe('npc_merchant');
    });

    it('sorts dialogue IDs alphabetically', () => {
      const project = createTestProject();
      const summary = buildProjectSummary(project);

      expect(summary.dialogueIds).toEqual([...summary.dialogueIds].sort());
    });

    it('sorts quest IDs alphabetically', () => {
      const project = createTestProject();
      const summary = buildProjectSummary(project);

      expect(summary.questIds).toEqual([...summary.questIds].sort());
    });

    it('sorts map layer IDs by z-index', () => {
      const project = createTestProject();
      const summary = buildProjectSummary(project);

      const town = summary.maps.find((m) => m.id === 'town01');
      expect(town).toBeDefined();
      // ground (z=0) before decoration (z=1)
      expect(town!.layerIds).toEqual(['ground', 'decoration']);
    });
  });

  // ========================================================================
  // T017: Excludes large arrays
  // ========================================================================
  describe('array exclusion', () => {
    it('does not include tile data arrays', () => {
      const project = createTestProject();
      const summary = buildProjectSummary(project);

      const json = JSON.stringify(summary);
      // Should not contain the actual tile array data
      const map = summary.maps.find((m) => m.id === 'town01');
      expect(map).toBeDefined();
      // Maps should not have tile data - only metadata
      expect((map as unknown as Record<string, unknown>).tileLayers).toBeUndefined();
      expect((map as unknown as Record<string, unknown>).data).toBeUndefined();
      // But should have layer IDs
      expect(map!.layerIds).toBeDefined();
      expect(map!.layerIds.length).toBeGreaterThan(0);
      // Full summary should be reasonably small
      expect(json.length).toBeLessThan(5000);
    });

    it('does not include collision data arrays', () => {
      const project = createTestProject();
      const summary = buildProjectSummary(project);

      const json = JSON.stringify(summary);
      // Should not contain collision data
      expect(json).not.toContain('collisionLayer');
    });
  });

  // ========================================================================
  // T018: Includes correct constraints
  // ========================================================================
  describe('constraints and metadata', () => {
    it('includes schema version', () => {
      const project = createTestProject();
      const summary = buildProjectSummary(project);

      expect(summary.schemaVersion).toBe(1);
    });

    it('includes guardrail constraints', () => {
      const project = createTestProject();
      const summary = buildProjectSummary(project);

      expect(summary.constraints).toBeDefined();
      expect(summary.constraints.maxOps).toBe(40);
      expect(summary.constraints.maxTileEdits).toBe(20000);
      expect(summary.constraints.maxCollisionEdits).toBe(20000);
      expect(summary.constraints.allowDestructive).toBe(false);
    });

    it('includes token estimate', () => {
      const project = createTestProject();
      const summary = buildProjectSummary(project);

      expect(summary.tokenEstimate).toBeGreaterThan(0);
      // Should be reasonable for a small project
      expect(summary.tokenEstimate).toBeLessThan(5000);
    });

    it('counts entity instances per def', () => {
      const project = createTestProject();
      const summary = buildProjectSummary(project);

      const guard = summary.entityDefs.find((e) => e.typeId === 'npc_guard');
      expect(guard).toBeDefined();
      expect(guard!.instanceCount).toBe(1);

      const merchant = summary.entityDefs.find(
        (e) => e.typeId === 'npc_merchant',
      );
      expect(merchant).toBeDefined();
      expect(merchant!.instanceCount).toBe(1);
    });

    it('reports correct map dimensions', () => {
      const project = createTestProject();
      const summary = buildProjectSummary(project);

      const town = summary.maps.find((m) => m.id === 'town01');
      expect(town).toBeDefined();
      expect(town!.width).toBe(10);
      expect(town!.height).toBe(10);
      expect(town!.tilesetId).toBe('overworld');
    });

    it('reports entity and trigger counts per map', () => {
      const project = createTestProject();
      const summary = buildProjectSummary(project);

      const town = summary.maps.find((m) => m.id === 'town01');
      expect(town).toBeDefined();
      expect(town!.entityCount).toBe(2);
      expect(town!.triggerCount).toBe(1);
    });

    it('detects dialogue interaction on entity defs', () => {
      const project = createTestProject();
      const summary = buildProjectSummary(project);

      const guard = summary.entityDefs.find((e) => e.typeId === 'npc_guard');
      expect(guard).toBeDefined();
      expect(guard!.hasDialogue).toBe(true);
      expect(guard!.isInteractive).toBe(true);
    });

    it('includes trigger summaries with event types', () => {
      const project = createTestProject();
      const summary = buildProjectSummary(project);

      expect(summary.triggers.length).toBe(1);
      expect(summary.triggers[0].id).toBe('town_entrance');
      expect(summary.triggers[0].mapId).toBe('town01');
      expect(summary.triggers[0].eventType).toBe('showMessage');
    });
  });

  // ========================================================================
  // Edge cases
  // ========================================================================
  describe('edge cases', () => {
    it('handles project with no quests', () => {
      const project = createTestProject();
      delete project.quests;

      const summary = buildProjectSummary(project);
      expect(summary.questIds).toEqual([]);
    });

    it('handles empty maps record', () => {
      const project = createTestProject();
      project.maps = {};

      const summary = buildProjectSummary(project);
      expect(summary.maps).toEqual([]);
      expect(summary.triggers).toEqual([]);
    });

    it('respects sortIds=false option', () => {
      const project = createTestProject();
      const summary = buildProjectSummary(project, { sortIds: false });

      // Should still generate a valid summary
      expect(summary.schemaVersion).toBe(1);
      expect(summary.tilesets.length).toBe(2);
    });
  });
});
