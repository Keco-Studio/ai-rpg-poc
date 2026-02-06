/**
 * Unit Tests: AI Response Parsing
 *
 * Tests for parseAIResponse() function.
 * Covers: valid JSON, non-JSON, mixed content, invalid structure.
 */

import { describe, it, expect } from 'vitest';
import { parseAIResponse } from '../../src/ai/parse.js';
import {
  createValidPatchJson,
  INVALID_PATCH_RESPONSE,
  MIXED_CONTENT_RESPONSE,
  PLAIN_TEXT_RESPONSE,
} from './fixtures.js';

describe('parseAIResponse', () => {
  // ========================================================================
  // T028: Parse accepts valid PatchV1 JSON
  // ========================================================================
  describe('valid PatchV1 JSON', () => {
    it('parses valid PatchV1 JSON string', () => {
      const result = parseAIResponse(createValidPatchJson());

      expect(result.success).toBe(true);
      expect(result.patch).toBeDefined();
      expect(result.patch!.patchVersion).toBe(1);
      expect(result.patch!.patchId).toBe('test-patch-001');
      expect(result.patch!.ops.length).toBe(4);
    });

    it('handles whitespace around valid JSON', () => {
      const result = parseAIResponse(`  \n${createValidPatchJson()}\n  `);

      expect(result.success).toBe(true);
      expect(result.patch).toBeDefined();
    });

    it('parses minimal valid patch', () => {
      const minimal = JSON.stringify({
        patchVersion: 1,
        patchId: 'minimal-001',
        baseSchemaVersion: 1,
        ops: [],
      });

      const result = parseAIResponse(minimal);

      expect(result.success).toBe(true);
      expect(result.patch).toBeDefined();
      expect(result.patch!.ops).toEqual([]);
    });
  });

  // ========================================================================
  // T029: Parse rejects non-JSON content
  // ========================================================================
  describe('non-JSON content', () => {
    it('rejects plain text response', () => {
      const result = parseAIResponse(PLAIN_TEXT_RESPONSE);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.type).toBe('no_json');
    });

    it('rejects empty response', () => {
      const result = parseAIResponse('');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.type).toBe('no_json');
    });

    it('rejects whitespace-only response', () => {
      const result = parseAIResponse('   \n\n   ');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.type).toBe('no_json');
    });

    it('rejects invalid JSON (syntax error)', () => {
      const result = parseAIResponse('{ "patchVersion": 1, "ops": }');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.type).toBe('invalid_json');
    });
  });

  // ========================================================================
  // T030: Parse rejects mixed content (JSON + commentary)
  // ========================================================================
  describe('mixed content', () => {
    it('rejects JSON embedded in markdown', () => {
      const result = parseAIResponse(MIXED_CONTENT_RESPONSE);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.type).toBe('mixed_content');
    });

    it('rejects JSON with leading commentary', () => {
      const json = createValidPatchJson();
      const mixed = `Here is the patch:\n${json}`;

      const result = parseAIResponse(mixed);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.type).toBe('mixed_content');
    });

    it('rejects JSON with trailing commentary', () => {
      const json = createValidPatchJson();
      const mixed = `${json}\n\nI hope this helps!`;

      const result = parseAIResponse(mixed);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      // Either no_json or mixed_content depending on parsing
      expect(['no_json', 'mixed_content']).toContain(result.error!.type);
    });
  });

  // ========================================================================
  // Invalid PatchV1 structure
  // ========================================================================
  describe('invalid PatchV1 structure', () => {
    it('rejects JSON without patchVersion', () => {
      const result = parseAIResponse(
        JSON.stringify({
          patchId: 'test',
          baseSchemaVersion: 1,
          ops: [],
        }),
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.type).toBe('invalid_patch');
    });

    it('rejects JSON without ops array', () => {
      const result = parseAIResponse(
        JSON.stringify({
          patchVersion: 1,
          patchId: 'test',
          baseSchemaVersion: 1,
        }),
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.type).toBe('invalid_patch');
    });

    it('rejects JSON with wrong patchVersion', () => {
      const result = parseAIResponse(
        JSON.stringify({
          patchVersion: 2,
          patchId: 'test',
          baseSchemaVersion: 1,
          ops: [],
        }),
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.type).toBe('invalid_patch');
    });

    it('rejects arbitrary JSON object', () => {
      const result = parseAIResponse(INVALID_PATCH_RESPONSE);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.type).toBe('invalid_patch');
    });

    it('rejects JSON with empty patchId', () => {
      const result = parseAIResponse(
        JSON.stringify({
          patchVersion: 1,
          patchId: '',
          baseSchemaVersion: 1,
          ops: [],
        }),
      );

      expect(result.success).toBe(false);
      expect(result.error!.type).toBe('invalid_patch');
    });
  });
});
