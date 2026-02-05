import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { validateProject } from '../../src/schema/validate.js';
import { ValidationErrorCode } from '../../src/schema/errors.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadFixture(name: string): unknown {
  const path = resolve(__dirname, 'fixtures', name);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

describe('validateProject', () => {
  // T047: Valid project passes validation
  it('should pass validation for a valid minimal project', () => {
    const project = loadFixture('valid-minimal.json');
    const result = validateProject(project);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // T048: Missing required fields produces SCHEMA_VALIDATION_FAILED error
  it('should reject project with missing required fields', () => {
    const project = loadFixture('invalid-missing-fields.json');
    const result = validateProject(project);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(
      result.errors.some(
        (e) => e.code === ValidationErrorCode.SCHEMA_VALIDATION_FAILED,
      ),
    ).toBe(true);
  });

  // T049: Out-of-bounds tile index produces TILE_INDEX_OUT_OF_BOUNDS error
  it('should reject project with out-of-bounds tile index', () => {
    const project = loadFixture('invalid-tile-index.json');
    const result = validateProject(project);

    expect(result.valid).toBe(false);
    expect(
      result.errors.some(
        (e) => e.code === ValidationErrorCode.TILE_INDEX_OUT_OF_BOUNDS,
      ),
    ).toBe(true);

    const tileError = result.errors.find(
      (e) => e.code === ValidationErrorCode.TILE_INDEX_OUT_OF_BOUNDS,
    );
    expect(tileError?.message).toContain('99');
    expect(tileError?.path).toContain('data[');
  });

  // T050: Invalid entityDefId reference produces INVALID_REFERENCE error
  it('should reject project with invalid entityDefId reference', () => {
    const project = loadFixture('invalid-reference.json');
    const result = validateProject(project);

    expect(result.valid).toBe(false);
    expect(
      result.errors.some(
        (e) => e.code === ValidationErrorCode.INVALID_REFERENCE,
      ),
    ).toBe(true);

    const refError = result.errors.find(
      (e) => e.code === ValidationErrorCode.INVALID_REFERENCE,
    );
    expect(refError?.message).toContain('npc:nonexistent-entity');
  });

  // T051: Tile layer array length mismatch produces ARRAY_LENGTH_MISMATCH error
  it('should reject project with tile layer array length mismatch', () => {
    const project = loadFixture('invalid-array-length.json');
    const result = validateProject(project);

    expect(result.valid).toBe(false);
    expect(
      result.errors.some(
        (e) => e.code === ValidationErrorCode.ARRAY_LENGTH_MISMATCH,
      ),
    ).toBe(true);

    const lengthError = result.errors.find(
      (e) => e.code === ValidationErrorCode.ARRAY_LENGTH_MISMATCH,
    );
    expect(lengthError?.message).toContain('5');
    expect(lengthError?.message).toContain('9');
  });

  // T052: Entity position out of bounds produces POSITION_OUT_OF_BOUNDS error
  it('should reject project with entity spawn position out of bounds', () => {
    // Create a project with out-of-bounds entity
    const project = loadFixture('valid-minimal.json') as Record<string, unknown>;
    const maps = project['maps'] as Record<string, Record<string, unknown>>;
    const map = maps['map:start'];
    map['entities'] = [
      {
        instanceId: 'instance:oob',
        entityDefId: 'npc:guard',
        position: { x: 99, y: 99 },
      },
    ];

    const result = validateProject(project);

    expect(result.valid).toBe(false);
    expect(
      result.errors.some(
        (e) => e.code === ValidationErrorCode.POSITION_OUT_OF_BOUNDS,
      ),
    ).toBe(true);

    const posError = result.errors.find(
      (e) => e.code === ValidationErrorCode.POSITION_OUT_OF_BOUNDS,
    );
    expect(posError?.message).toContain('99');
  });

  // Additional: Invalid starting map reference
  it('should reject project with invalid startingMap reference', () => {
    const project = loadFixture('valid-minimal.json') as Record<string, unknown>;
    const config = project['config'] as Record<string, unknown>;
    config['startingMap'] = 'map:nonexistent';

    const result = validateProject(project);

    expect(result.valid).toBe(false);
    expect(
      result.errors.some(
        (e) =>
          e.code === ValidationErrorCode.INVALID_REFERENCE &&
          e.path === 'config.startingMap',
      ),
    ).toBe(true);
  });

  // Additional: Dialogue rootNodeId not found
  it('should reject project with invalid dialogue rootNodeId', () => {
    const project = loadFixture('valid-minimal.json') as Record<string, unknown>;
    const dialogues = project['dialogues'] as Record<
      string,
      Record<string, unknown>
    >;
    dialogues['dialogue:greeting']['rootNodeId'] = 'node-nonexistent';

    const result = validateProject(project);

    expect(result.valid).toBe(false);
    expect(
      result.errors.some(
        (e) => e.code === ValidationErrorCode.DIALOGUE_ROOT_NOT_FOUND,
      ),
    ).toBe(true);
  });

  // Additional: Player spawn out of bounds
  it('should reject project with player spawn outside map', () => {
    const project = loadFixture('valid-minimal.json') as Record<string, unknown>;
    const config = project['config'] as Record<string, unknown>;
    config['playerSpawn'] = { x: 50, y: 50 };

    const result = validateProject(project);

    expect(result.valid).toBe(false);
    expect(
      result.errors.some(
        (e) =>
          e.code === ValidationErrorCode.POSITION_OUT_OF_BOUNDS &&
          e.path === 'config.playerSpawn',
      ),
    ).toBe(true);
  });

  // Additional: Completely invalid input
  it('should reject null input', () => {
    const result = validateProject(null);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject empty object', () => {
    const result = validateProject({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
