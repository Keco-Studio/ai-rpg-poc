/**
 * Patch Engine v1 - Error Types and Helpers
 *
 * Structured error model with typed error codes for all validation
 * and application failure types. Error messages include operation
 * indices and data paths for actionable debugging.
 */

// ============================================================================
// Error Codes
// ============================================================================

/**
 * All possible error codes for patch validation and application failures.
 * Each code maps to a specific category of error for programmatic handling.
 */
export const PatchErrorCode = {
  /** Unrecognized operation type in ops array */
  UNKNOWN_OP: 'UNKNOWN_OP',
  /** Referenced ID doesn't exist (entity, map, tileset, dialogue, quest) */
  MISSING_REF: 'MISSING_REF',
  /** Attempting to create resource with ID that already exists */
  DUPLICATE_ID: 'DUPLICATE_ID',
  /** Coordinate or rect outside map boundaries */
  OUT_OF_BOUNDS: 'OUT_OF_BOUNDS',
  /** Tile ID outside valid range (0..maxTileId) */
  INVALID_TILE_ID: 'INVALID_TILE_ID',
  /** Layer doesn't exist or invalid layer reference */
  INVALID_LAYER: 'INVALID_LAYER',
  /** Map doesn't exist or invalid map reference */
  INVALID_MAP: 'INVALID_MAP',
  /** Patch version or schema version incompatible */
  SCHEMA_MISMATCH: 'SCHEMA_MISMATCH',
} as const;

export type PatchErrorCode = (typeof PatchErrorCode)[keyof typeof PatchErrorCode];

// ============================================================================
// Error Interface
// ============================================================================

/**
 * Structured error information for validation or application failures.
 * Provides enough context for programmatic error handling and debugging.
 */
export interface PatchError {
  /** Typed error code for programmatic handling */
  code: PatchErrorCode;
  /** Human-readable error description */
  message: string;
  /** Index of failing operation in patch.ops array */
  opIndex?: number;
  /** JSON path to problematic field (e.g., "ops[3].mapId") */
  path?: string;
  /** Additional context (e.g., available IDs, bounds info) */
  detail?: unknown;
}

// ============================================================================
// Validation Result
// ============================================================================

/**
 * The outcome of patch validation.
 * Discriminated union: ok=true means valid, ok=false includes error details.
 */
export type PatchValidationResult =
  | { ok: true }
  | { ok: false; errors: PatchError[] };

// ============================================================================
// Error Helper Functions
// ============================================================================

/**
 * Creates an OUT_OF_BOUNDS error for coordinates or rects outside map dimensions.
 */
export function errOutOfBounds(
  opIndex: number,
  path: string,
  message: string,
  detail?: unknown,
): PatchError {
  return { code: PatchErrorCode.OUT_OF_BOUNDS, message, opIndex, path, detail };
}

/**
 * Creates a MISSING_REF error for referenced IDs that don't exist.
 */
export function errMissingRef(
  opIndex: number,
  path: string,
  message: string,
  detail?: unknown,
): PatchError {
  return { code: PatchErrorCode.MISSING_REF, message, opIndex, path, detail };
}

/**
 * Creates a DUPLICATE_ID error for resource IDs that already exist.
 */
export function errDuplicateId(
  opIndex: number,
  path: string,
  message: string,
  detail?: unknown,
): PatchError {
  return { code: PatchErrorCode.DUPLICATE_ID, message, opIndex, path, detail };
}

/**
 * Creates an INVALID_TILE_ID error for tile IDs outside valid range.
 */
export function errInvalidTileId(
  opIndex: number,
  path: string,
  message: string,
  detail?: unknown,
): PatchError {
  return { code: PatchErrorCode.INVALID_TILE_ID, message, opIndex, path, detail };
}

/**
 * Creates an INVALID_LAYER error for non-existent layer references.
 */
export function errInvalidLayer(
  opIndex: number,
  path: string,
  message: string,
  detail?: unknown,
): PatchError {
  return { code: PatchErrorCode.INVALID_LAYER, message, opIndex, path, detail };
}

/**
 * Creates an INVALID_MAP error for non-existent map references.
 */
export function errInvalidMap(
  opIndex: number,
  path: string,
  message: string,
  detail?: unknown,
): PatchError {
  return { code: PatchErrorCode.INVALID_MAP, message, opIndex, path, detail };
}

/**
 * Creates a SCHEMA_MISMATCH error for version incompatibilities.
 */
export function errSchemaMismatch(
  message: string,
  detail?: unknown,
): PatchError {
  return { code: PatchErrorCode.SCHEMA_MISMATCH, message, detail };
}

/**
 * Creates an UNKNOWN_OP error for unrecognized operation types.
 */
export function errUnknownOp(
  opIndex: number,
  opType: string,
): PatchError {
  return {
    code: PatchErrorCode.UNKNOWN_OP,
    message: `Unknown operation type '${opType}'`,
    opIndex,
    path: `ops[${opIndex}].op`,
  };
}
