/**
 * Unit Tests: Prompt Templates
 *
 * Tests for buildSystemPrompt() and buildUserPrompt() functions.
 * Covers: format contract, constraint embedding, repair context.
 */

import { describe, it, expect } from 'vitest';
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildRepairInstruction,
} from '../../src/ai/promptTemplates.js';
import { createTestSummary, createDefaultGuardrails } from './fixtures.js';
import type { RepairContext } from '../../src/ai/types.js';

describe('buildSystemPrompt', () => {
  // ========================================================================
  // T023: System prompt includes format contract
  // ========================================================================
  it('includes PatchV1 format specification', () => {
    const prompt = buildSystemPrompt();

    expect(prompt).toContain('PatchV1');
    expect(prompt).toContain('patchVersion');
    expect(prompt).toContain('"ops"');
  });

  it('includes ONLY JSON instruction', () => {
    const prompt = buildSystemPrompt();

    expect(prompt).toContain('ONLY');
    expect(prompt).toContain('JSON');
    expect(prompt).toContain('no explanations');
  });

  it('includes constraint values', () => {
    const guardrails = createDefaultGuardrails();
    const prompt = buildSystemPrompt(guardrails);

    expect(prompt).toContain('40'); // maxOps
    expect(prompt).toContain('20000'); // maxTileEdits
  });

  it('lists all operation types', () => {
    const prompt = buildSystemPrompt();

    expect(prompt).toContain('createMap');
    expect(prompt).toContain('createLayer');
    expect(prompt).toContain('paintRect');
    expect(prompt).toContain('setTiles');
    expect(prompt).toContain('clearTiles');
    expect(prompt).toContain('setCollisionCells');
    expect(prompt).toContain('setCollisionRect');
    expect(prompt).toContain('createEntityDef');
    expect(prompt).toContain('placeEntity');
    expect(prompt).toContain('moveEntity');
    expect(prompt).toContain('deleteEntity');
    expect(prompt).toContain('createTrigger');
    expect(prompt).toContain('updateTrigger');
    expect(prompt).toContain('createDialogue');
    expect(prompt).toContain('updateDialogueNode');
    expect(prompt).toContain('createQuest');
    expect(prompt).toContain('updateQuest');
  });

  it('includes validation rules', () => {
    const prompt = buildSystemPrompt();

    expect(prompt).toContain('within map bounds');
    expect(prompt).toContain('tileset range');
    expect(prompt).toContain('must exist');
  });

  it('uses custom guardrail values', () => {
    const custom = { ...createDefaultGuardrails(), maxOps: 100, maxTileEdits: 50000 };
    const prompt = buildSystemPrompt(custom);

    expect(prompt).toContain('100');
    expect(prompt).toContain('50000');
  });
});

describe('buildUserPrompt', () => {
  it('includes project summary as JSON', () => {
    const summary = createTestSummary();
    const prompt = buildUserPrompt('Create a forest map', summary);

    expect(prompt).toContain('Project Summary:');
    expect(prompt).toContain('"schemaVersion"');
    expect(prompt).toContain('"tilesets"');
  });

  it('includes user goal', () => {
    const summary = createTestSummary();
    const prompt = buildUserPrompt('Create a forest map', summary);

    expect(prompt).toContain('User Request: Create a forest map');
  });

  it('includes generation instruction when no repair context', () => {
    const summary = createTestSummary();
    const prompt = buildUserPrompt('Create a forest map', summary);

    expect(prompt).toContain('Generate a PatchV1 JSON patch');
  });

  it('includes repair context when provided', () => {
    const summary = createTestSummary();
    const repairContext: RepairContext = {
      attemptNumber: 1,
      maxAttempts: 2,
      previousPatch: {
        patchVersion: 1,
        patchId: 'test',
        baseSchemaVersion: 1,
        ops: [],
      },
      errors: [
        {
          operationIndex: 0,
          operationType: 'createMap',
          errorType: 'MISSING_REF',
          message: "Tileset 'forest' not found",
          context: { requestedId: 'forest' },
        },
      ],
      instruction: 'Fix the tileset reference',
    };

    const prompt = buildUserPrompt('Create a forest map', summary, repairContext);

    expect(prompt).toContain('Previous Attempt Failed');
    expect(prompt).toContain('Attempt 1/2');
    expect(prompt).toContain('MISSING_REF');
    expect(prompt).toContain('Fix the tileset reference');
    expect(prompt).toContain('corrected PatchV1 JSON');
  });
});

describe('buildRepairInstruction', () => {
  it('generates instruction for single error', () => {
    const instruction = buildRepairInstruction(1);

    expect(instruction).toContain('1 validation error');
    // Should use singular "error" in the count portion
    expect(instruction).toMatch(/1 validation error[^s]/);

  });

  it('generates instruction for multiple errors', () => {
    const instruction = buildRepairInstruction(3);

    expect(instruction).toContain('3 validation errors');
  });
});
