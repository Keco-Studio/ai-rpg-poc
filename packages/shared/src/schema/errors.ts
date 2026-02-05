/**
 * Validation error types for Project Schema v1.
 *
 * All validation errors follow this structure for clear, actionable error messages.
 * Error codes are used for programmatic handling; messages are human-readable.
 */

/**
 * A single validation error with code, message, path, and optional suggestion.
 */
export interface ValidationError {
  /** Error code for programmatic handling (e.g., "TILE_INDEX_OUT_OF_BOUNDS") */
  code: string;
  /** Human-readable error message */
  message: string;
  /** JSON path to problematic field (e.g., "maps.dungeon.tileLayers.ground.data[156]") */
  path: string;
  /** Suggested fix (if applicable) */
  suggestion?: string;
}

/**
 * Result of project validation.
 * Contains overall validity flag and array of errors (empty if valid).
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Array of errors (empty if valid) */
  errors: ValidationError[];
}

/** Known validation error codes */
export const ValidationErrorCode = {
  /** Schema structure validation failed (Zod parse error) */
  SCHEMA_VALIDATION_FAILED: 'SCHEMA_VALIDATION_FAILED',
  /** Required field is missing */
  MISSING_FIELD: 'MISSING_FIELD',
  /** Tile index exceeds tileset bounds */
  TILE_INDEX_OUT_OF_BOUNDS: 'TILE_INDEX_OUT_OF_BOUNDS',
  /** ID reference points to non-existent entity */
  INVALID_REFERENCE: 'INVALID_REFERENCE',
  /** Array length doesn't match expected dimensions */
  ARRAY_LENGTH_MISMATCH: 'ARRAY_LENGTH_MISMATCH',
  /** Position or coordinate is outside map boundaries */
  POSITION_OUT_OF_BOUNDS: 'POSITION_OUT_OF_BOUNDS',
  /** Schema version is not supported */
  SCHEMA_VERSION_MISMATCH: 'SCHEMA_VERSION_MISMATCH',
  /** Dialogue root node ID not found in nodes */
  DIALOGUE_ROOT_NOT_FOUND: 'DIALOGUE_ROOT_NOT_FOUND',
} as const;
