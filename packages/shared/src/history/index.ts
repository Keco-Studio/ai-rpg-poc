/**
 * History Module - Undo/Redo Management
 *
 * Provides a simple HistoryStack utility for tracking applied patches
 * and supporting undo/redo operations.
 *
 * @example
 * ```typescript
 * import { HistoryStack } from '@ai-rpg-maker/shared';
 *
 * const history = new HistoryStack({ maxSize: 100 });
 * const result = history.applyAndPush(project, patch);
 * ```
 */

export { HistoryStack } from './history.js';
export type { HistoryEntry, HistoryStackOptions } from './history.js';
