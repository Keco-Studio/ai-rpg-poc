/**
 * Unit Tests: Orchestrator
 *
 * Tests for proposePatchWithRepair() and proposePatchOnce().
 * Covers: valid patch flow, parse errors, validation errors, repair loop.
 */

import { describe, it, expect } from 'vitest';
import {
  proposePatchWithRepair,
  proposePatchOnce,
} from '../../src/ai/orchestrator.js';
import { MockProvider } from '../../src/ai/provider.js';
import { buildProjectSummary } from '../../src/ai/projectSummary.js';
import { buildSystemPrompt } from '../../src/ai/promptTemplates.js';
import { DEFAULT_GUARDRAILS } from '../../src/ai/types.js';
import {
  createTestProject,
  createValidPatch,
  createValidPatchJson,
  PLAIN_TEXT_RESPONSE,
  MIXED_CONTENT_RESPONSE,
} from './fixtures.js';

describe('proposePatchOnce', () => {
  // ========================================================================
  // T037: Orchestrator with MockProvider (valid patch)
  // ========================================================================
  it('returns success for valid patch from provider', async () => {
    const project = createTestProject();
    const provider = new MockProvider({
      responses: [
        {
          success: true,
          rawText: createValidPatchJson(),
        },
      ],
    });

    const summary = buildProjectSummary(project);
    const systemPrompt = buildSystemPrompt();

    const result = await proposePatchOnce(
      project,
      'Create a forest map',
      provider,
      systemPrompt,
      summary,
      DEFAULT_GUARDRAILS,
    );

    expect(result.status).toBe('success');
    expect(result.patch).toBeDefined();
    expect(result.patch!.patchId).toBe('test-patch-001');
    expect(result.summary).toBeDefined();
    expect(result.message).toContain('ready for review');
  });

  // ========================================================================
  // T038: Orchestrator handles parse errors
  // ========================================================================
  it('returns parse_failed for non-JSON response', async () => {
    const project = createTestProject();
    const provider = new MockProvider({
      responses: [
        {
          success: true,
          rawText: PLAIN_TEXT_RESPONSE,
        },
      ],
    });

    const summary = buildProjectSummary(project);
    const systemPrompt = buildSystemPrompt();

    const result = await proposePatchOnce(
      project,
      'Create a forest',
      provider,
      systemPrompt,
      summary,
      DEFAULT_GUARDRAILS,
    );

    expect(result.status).toBe('parse_failed');
    expect(result.patch).toBeUndefined();
  });

  it('returns parse_failed for mixed content response', async () => {
    const project = createTestProject();
    const provider = new MockProvider({
      responses: [
        {
          success: true,
          rawText: MIXED_CONTENT_RESPONSE,
        },
      ],
    });

    const summary = buildProjectSummary(project);
    const systemPrompt = buildSystemPrompt();

    const result = await proposePatchOnce(
      project,
      'Create a forest',
      provider,
      systemPrompt,
      summary,
      DEFAULT_GUARDRAILS,
    );

    expect(result.status).toBe('parse_failed');
  });

  // ========================================================================
  // T039: Orchestrator handles validation errors
  // ========================================================================
  it('returns validation_failed for invalid patch references', async () => {
    const project = createTestProject();
    // Patch that references non-existent tileset
    const invalidPatch = {
      patchVersion: 1,
      patchId: 'test-invalid-001',
      baseSchemaVersion: 1,
      ops: [
        {
          op: 'createMap',
          map: {
            id: 'bad_map',
            name: 'Bad Map',
            tilesetId: 'nonexistent_tileset',
            width: 10,
            height: 10,
          },
        },
      ],
    };

    const provider = new MockProvider({
      responses: [
        {
          success: true,
          rawText: JSON.stringify(invalidPatch),
        },
      ],
    });

    const summary = buildProjectSummary(project);
    const systemPrompt = buildSystemPrompt();

    const result = await proposePatchOnce(
      project,
      'Create a map',
      provider,
      systemPrompt,
      summary,
      DEFAULT_GUARDRAILS,
    );

    expect(result.status).toBe('validation_failed');
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
    expect(result.errors![0].errorType).toBe('MISSING_REF');
  });

  it('returns provider_error when provider fails', async () => {
    const project = createTestProject();
    const provider = new MockProvider({
      responses: [
        {
          success: false,
          error: 'API rate limit exceeded',
        },
      ],
    });

    const summary = buildProjectSummary(project);
    const systemPrompt = buildSystemPrompt();

    const result = await proposePatchOnce(
      project,
      'Create a map',
      provider,
      systemPrompt,
      summary,
      DEFAULT_GUARDRAILS,
    );

    expect(result.status).toBe('provider_error');
    expect(result.message).toContain('rate limit');
  });

  it('returns parse_failed for empty rawText', async () => {
    const project = createTestProject();
    const provider = new MockProvider({
      responses: [
        {
          success: true,
          rawText: '',
        },
      ],
    });

    const summary = buildProjectSummary(project);
    const systemPrompt = buildSystemPrompt();

    const result = await proposePatchOnce(
      project,
      'Create a map',
      provider,
      systemPrompt,
      summary,
      DEFAULT_GUARDRAILS,
    );

    expect(result.status).toBe('parse_failed');
  });
});

describe('proposePatchWithRepair', () => {
  // ========================================================================
  // T065: Repair succeeds on first attempt
  // ========================================================================
  it('returns success without repair when first attempt valid', async () => {
    const project = createTestProject();
    const provider = new MockProvider({
      responses: [
        {
          success: true,
          rawText: createValidPatchJson(),
        },
      ],
    });

    const result = await proposePatchWithRepair(
      project,
      'Create a forest map',
      provider,
      { maxRepairAttempts: 2 },
    );

    expect(result.status).toBe('success');
    expect(result.repairAttempts).toBe(0);
    expect(provider.getCallCount()).toBe(1);
  });

  // ========================================================================
  // T066: Repair succeeds on second attempt
  // ========================================================================
  it('succeeds after one repair attempt', async () => {
    const project = createTestProject();
    const validPatch = createValidPatch();
    const validJson = createValidPatchJson();

    const provider = new MockProvider({
      responses: [
        {
          success: true,
          rawText: PLAIN_TEXT_RESPONSE, // First attempt: parse failure
        },
        {
          success: true,
          rawText: validJson, // Second attempt: success
        },
      ],
    });

    const result = await proposePatchWithRepair(
      project,
      'Create a forest map',
      provider,
      { maxRepairAttempts: 2 },
    );

    expect(result.status).toBe('success');
    expect(result.repairAttempts).toBe(1);
    expect(provider.getCallCount()).toBe(2);
  });

  // ========================================================================
  // T067: Repair exhausts attempts and returns errors
  // ========================================================================
  it('returns error after exhausting repair attempts', async () => {
    const project = createTestProject();
    const provider = new MockProvider({
      responses: [
        {
          success: true,
          rawText: PLAIN_TEXT_RESPONSE, // Always invalid
        },
      ],
    });

    const result = await proposePatchWithRepair(
      project,
      'Create a forest map',
      provider,
      { maxRepairAttempts: 2 },
    );

    expect(result.status).toBe('parse_failed');
    expect(result.repairAttempts).toBe(2);
    expect(provider.getCallCount()).toBe(3); // Initial + 2 repairs
  });

  // ========================================================================
  // T068: Parse errors trigger format repair request
  // ========================================================================
  it('sends repair context after parse failure', async () => {
    const project = createTestProject();
    const provider = new MockProvider({
      responses: [
        {
          success: true,
          rawText: 'not json', // Parse failure
        },
        {
          success: true,
          rawText: createValidPatchJson(), // Success on repair
        },
      ],
    });

    const result = await proposePatchWithRepair(
      project,
      'Create a forest map',
      provider,
      { maxRepairAttempts: 2 },
    );

    expect(result.status).toBe('success');

    // Check that the second call had repair context
    const inputs = provider.getReceivedInputs();
    expect(inputs.length).toBe(2);
    expect(inputs[1].repairContext).toBeDefined();
    expect(inputs[1].repairContext!.attemptNumber).toBe(1);
    expect(inputs[1].repairContext!.errors.length).toBeGreaterThan(0);
  });

  // ========================================================================
  // T069: Validation errors trigger structured error feedback
  // ========================================================================
  it('sends structured errors in repair context after validation failure', async () => {
    const project = createTestProject();

    // First response: valid JSON but invalid references
    const invalidPatch = {
      patchVersion: 1,
      patchId: 'test-invalid',
      baseSchemaVersion: 1,
      ops: [
        {
          op: 'createMap',
          map: {
            id: 'bad_map',
            name: 'Bad Map',
            tilesetId: 'nonexistent',
            width: 10,
            height: 10,
          },
        },
      ],
    };

    const provider = new MockProvider({
      responses: [
        {
          success: true,
          rawText: JSON.stringify(invalidPatch), // Validation failure
        },
        {
          success: true,
          rawText: createValidPatchJson(), // Success on repair
        },
      ],
    });

    const result = await proposePatchWithRepair(
      project,
      'Create a map',
      provider,
      { maxRepairAttempts: 2 },
    );

    expect(result.status).toBe('success');

    // Check repair context had structured errors
    const inputs = provider.getReceivedInputs();
    expect(inputs[1].repairContext).toBeDefined();
    expect(inputs[1].repairContext!.errors.length).toBeGreaterThan(0);
    expect(inputs[1].repairContext!.errors[0].errorType).toBe('MISSING_REF');
  });

  it('does not retry on provider_error', async () => {
    const project = createTestProject();
    const provider = new MockProvider({
      responses: [
        {
          success: false,
          error: 'Network error',
        },
      ],
    });

    const result = await proposePatchWithRepair(
      project,
      'Create a map',
      provider,
      { maxRepairAttempts: 2 },
    );

    expect(result.status).toBe('provider_error');
    expect(provider.getCallCount()).toBe(1); // No retries
  });
});
