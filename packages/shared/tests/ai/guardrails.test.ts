/**
 * Unit Tests: Guardrails
 *
 * Tests for checkGuardrails() function.
 * Covers: valid patches, oversized patches, destructive ops, intent detection.
 */

import { describe, it, expect } from 'vitest';
import { checkGuardrails } from '../../src/ai/guardrails.js';
import {
  createValidPatch,
  createOversizedPatch,
  createDestructivePatch,
  createDefaultGuardrails,
  createRelaxedGuardrails,
} from './fixtures.js';
import type { PatchV1 } from '../../src/patch/types.js';

describe('checkGuardrails', () => {
  // ========================================================================
  // T085: Guardrails allow valid patches
  // ========================================================================
  describe('valid patches', () => {
    it('allows patch within all limits', () => {
      const patch = createValidPatch();
      const config = createDefaultGuardrails();

      const result = checkGuardrails(patch, config, 'Create a forest map');

      expect(result.allowed).toBe(true);
      expect(result.exceeded).toEqual([]);
    });

    it('allows empty patch', () => {
      const patch: PatchV1 = {
        patchVersion: 1,
        patchId: 'empty',
        baseSchemaVersion: 1,
        ops: [],
      };

      const result = checkGuardrails(patch);

      expect(result.allowed).toBe(true);
    });
  });

  // ========================================================================
  // T086: Guardrails block oversized patches (ops)
  // ========================================================================
  describe('operation count checks', () => {
    it('blocks patch exceeding maxOps', () => {
      const patch = createOversizedPatch(); // 50 ops
      const config = createDefaultGuardrails(); // maxOps: 40

      const result = checkGuardrails(patch, config);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('50 operations');
      expect(result.reason).toContain('limit of 40');
      expect(result.exceeded.find((e) => e.threshold === 'maxOps')).toBeDefined();
    });

    it('allows patch at exactly maxOps limit', () => {
      const ops = [];
      for (let i = 0; i < 40; i++) {
        ops.push({
          op: 'paintRect' as const,
          mapId: 'town01',
          layerId: 'ground',
          x: 1,
          y: 1,
          w: 1,
          h: 1,
          tileId: 2,
        });
      }
      const patch: PatchV1 = {
        patchVersion: 1,
        patchId: 'exact',
        baseSchemaVersion: 1,
        ops,
      };

      const result = checkGuardrails(patch, createDefaultGuardrails());

      expect(result.allowed).toBe(true);
    });
  });

  // ========================================================================
  // T087: Guardrails block oversized patches (tile edits)
  // ========================================================================
  describe('tile edit checks', () => {
    it('blocks patch exceeding maxTileEdits', () => {
      const patch: PatchV1 = {
        patchVersion: 1,
        patchId: 'big-tiles',
        baseSchemaVersion: 1,
        ops: [
          {
            op: 'paintRect',
            mapId: 'town01',
            layerId: 'ground',
            x: 0,
            y: 0,
            w: 200,
            h: 200,
            tileId: 1,
          },
        ],
      };
      const config = { ...createDefaultGuardrails(), maxTileEdits: 20000 };

      const result = checkGuardrails(patch, config);

      expect(result.allowed).toBe(false);
      expect(result.exceeded.find((e) => e.threshold === 'maxTileEdits')).toBeDefined();
    });

    it('counts setTiles cells correctly', () => {
      const cells = [];
      for (let i = 0; i < 100; i++) {
        cells.push({ x: i % 10, y: Math.floor(i / 10), tileId: 1 });
      }
      const patch: PatchV1 = {
        patchVersion: 1,
        patchId: 'set-tiles',
        baseSchemaVersion: 1,
        ops: [{ op: 'setTiles', mapId: 'town01', layerId: 'ground', cells }],
      };

      const result = checkGuardrails(patch, { maxTileEdits: 50 });

      expect(result.allowed).toBe(false);
      const exceeded = result.exceeded.find((e) => e.threshold === 'maxTileEdits');
      expect(exceeded).toBeDefined();
      expect(exceeded!.value).toBe(100);
    });
  });

  // ========================================================================
  // T088: Guardrails block destructive operations
  // ========================================================================
  describe('destructive operation checks', () => {
    it('blocks delete operations by default', () => {
      const patch = createDestructivePatch();
      const config = createDefaultGuardrails();

      const result = checkGuardrails(patch, config, 'do something');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('destructive');
    });
  });

  // ========================================================================
  // T089: Guardrails respect allowDestructive flag
  // ========================================================================
  describe('allowDestructive flag', () => {
    it('allows delete operations when allowDestructive is true', () => {
      const patch = createDestructivePatch();
      const config = createRelaxedGuardrails(); // allowDestructive: true

      const result = checkGuardrails(patch, config);

      expect(result.allowed).toBe(true);
    });
  });

  // ========================================================================
  // T090: Guardrails detect explicit delete intent from prompt
  // ========================================================================
  describe('intent detection', () => {
    it('allows delete operations when user explicitly requests deletion', () => {
      const patch = createDestructivePatch();
      const config = createDefaultGuardrails(); // allowDestructive: false

      const result = checkGuardrails(
        patch,
        config,
        'delete all the guards from the town',
      );

      // With destructive intent detected, allowed should be true
      expect(result.allowed).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('delete');
    });

    it('detects "remove" keyword as destructive intent', () => {
      const patch = createDestructivePatch();
      const config = createDefaultGuardrails();

      const result = checkGuardrails(
        patch,
        config,
        'remove the merchant from the map',
      );

      expect(result.allowed).toBe(true);
    });

    it('does not detect non-destructive keywords', () => {
      const patch = createDestructivePatch();
      const config = createDefaultGuardrails();

      const result = checkGuardrails(
        patch,
        config,
        'add more guards to the town',
      );

      expect(result.allowed).toBe(false);
    });
  });

  // ========================================================================
  // T094: Oversized patch triggers downsize request
  // ========================================================================
  describe('confirmation threshold', () => {
    it('sets requiresConfirmation for large patches', () => {
      const ops = [];
      for (let i = 0; i < 25; i++) {
        ops.push({
          op: 'paintRect' as const,
          mapId: 'town01',
          layerId: 'ground',
          x: 1,
          y: 1,
          w: 1,
          h: 1,
          tileId: 2,
        });
      }
      const patch: PatchV1 = {
        patchVersion: 1,
        patchId: 'large',
        baseSchemaVersion: 1,
        ops,
      };

      const result = checkGuardrails(patch, createDefaultGuardrails());

      expect(result.allowed).toBe(true);
      expect(result.requiresConfirmation).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('does not require confirmation for small patches', () => {
      const patch = createValidPatch();

      const result = checkGuardrails(patch, createDefaultGuardrails());

      expect(result.requiresConfirmation).toBe(false);
    });
  });
});
