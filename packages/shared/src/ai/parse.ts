/**
 * AI Orchestration - Response Parsing
 *
 * Strict JSON extraction from AI responses.
 * Rejects non-JSON content, mixed content (JSON + commentary),
 * and structurally invalid PatchV1 documents.
 */

import type { PatchV1 } from '../patch/types.js';
import type { ParseResult } from './types.js';

/**
 * Parse AI response to extract PatchV1 JSON.
 *
 * Strict parsing rules:
 * 1. Response must start with { (after trimming whitespace)
 * 2. Response must end with } (after trimming whitespace)
 * 3. Response must be valid JSON
 * 4. Parsed object must have patchVersion and ops fields
 *
 * @param rawText - Raw AI response text
 * @returns ParseResult with patch or structured error
 */
export function parseAIResponse(rawText: string): ParseResult {
  const trimmed = rawText.trim();

  // Check for empty response
  if (trimmed.length === 0) {
    return {
      success: false,
      error: {
        type: 'no_json',
        message: 'Empty response from AI provider',
        rawText,
      },
    };
  }

  // Check if response starts with { and ends with }
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    // Check if it contains JSON embedded in text (mixed content)
    const jsonMatch = extractEmbeddedJson(trimmed);
    if (jsonMatch) {
      return {
        success: false,
        error: {
          type: 'mixed_content',
          message:
            'Response contains JSON mixed with commentary. Return ONLY the JSON object with no surrounding text.',
          rawText,
        },
      };
    }

    return {
      success: false,
      error: {
        type: 'no_json',
        message:
          'Response is not JSON. Expected response to start with { and end with }.',
        rawText,
      },
    };
  }

  // Attempt JSON parse
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (e) {
    return {
      success: false,
      error: {
        type: 'invalid_json',
        message: `Invalid JSON: ${(e as Error).message}`,
        rawText,
      },
    };
  }

  // Validate PatchV1 structure
  if (!isValidPatchStructure(parsed)) {
    return {
      success: false,
      error: {
        type: 'invalid_patch',
        message:
          'JSON object is not a valid PatchV1. Required fields: patchVersion (must be 1), patchId (string), baseSchemaVersion (must be 1), ops (array).',
        rawText,
      },
    };
  }

  return {
    success: true,
    patch: parsed as PatchV1,
  };
}

/**
 * Check if a parsed object has the basic PatchV1 structure.
 */
function isValidPatchStructure(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null) return false;

  const patch = obj as Record<string, unknown>;

  // Must have patchVersion = 1
  if (patch.patchVersion !== 1) return false;

  // Must have patchId as non-empty string
  if (typeof patch.patchId !== 'string' || patch.patchId.length === 0)
    return false;

  // Must have baseSchemaVersion = 1
  if (patch.baseSchemaVersion !== 1) return false;

  // Must have ops as array
  if (!Array.isArray(patch.ops)) return false;

  return true;
}

/**
 * Try to find embedded JSON in mixed content.
 * Looks for { ... } patterns that could be JSON objects.
 */
function extractEmbeddedJson(text: string): boolean {
  // Look for code fence blocks containing JSON
  if (text.includes('```json') || text.includes('```')) {
    return true;
  }

  // Look for a JSON object not at the start/end
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1) return false;

  // If there's text before the first { or after the last }
  const before = text.substring(0, firstBrace).trim();
  const after = text.substring(lastBrace + 1).trim();

  if (before.length > 0 || after.length > 0) {
    // Try to parse the embedded JSON to confirm it's actually JSON
    const candidate = text.substring(firstBrace, lastBrace + 1);
    try {
      JSON.parse(candidate);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}
