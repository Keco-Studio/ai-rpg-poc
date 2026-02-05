/**
 * Trigger region compiler.
 *
 * Converts schema TriggerRegion definitions into runtime trigger handlers.
 * Handles onEnter events when player position overlaps trigger bounds.
 */

import type { GameMap, TriggerRegion, TriggerEvent, Project } from '@ai-rpg-maker/shared';
import type { DebugOverlay } from '../ui/debugOverlay.js';

/** Tracks which triggers have been activated (for once-only triggers) */
const activatedTriggers = new Set<string>();

export interface TriggerSystem {
  /** Check triggers against current player position (call each frame) */
  update: (playerTileX: number, playerTileY: number) => void;
  /** Reset all trigger activation state */
  reset: () => void;
}

/**
 * Compiles trigger regions from a map into a runtime trigger system.
 *
 * @param map - Game map with trigger definitions
 * @param project - Full project for dialogue/map lookups
 * @param debugOverlay - Debug overlay for showing messages
 * @returns TriggerSystem with update method for per-frame checks
 */
export function compileTriggers(
  map: GameMap,
  project: Project,
  debugOverlay: DebugOverlay,
): TriggerSystem {
  let lastPlayerTileX = -1;
  let lastPlayerTileY = -1;

  function isInBounds(
    x: number,
    y: number,
    trigger: TriggerRegion,
  ): boolean {
    const { bounds } = trigger;
    return (
      x >= bounds.x &&
      x < bounds.x + bounds.width &&
      y >= bounds.y &&
      y < bounds.y + bounds.height
    );
  }

  function executeTriggerEvent(event: TriggerEvent): void {
    switch (event.type) {
      case 'showMessage':
        debugOverlay.show(event.data.message);
        break;
      case 'startDialogue': {
        const dialogue = project.dialogues[event.data.dialogueId];
        if (dialogue) {
          const rootNode = dialogue.nodes[dialogue.rootNodeId];
          if (rootNode) {
            debugOverlay.show(`${rootNode.speaker}: ${rootNode.text}`);
          }
        }
        break;
      }
      case 'log':
        console.log(`[Trigger] ${event.data.message}`);
        break;
      case 'teleport':
        console.log(
          `[Trigger] Teleport to ${event.data.targetMap} at (${event.data.targetPosition.x}, ${event.data.targetPosition.y})`,
        );
        break;
    }
  }

  function update(playerTileX: number, playerTileY: number): void {
    // Only check on position change
    if (playerTileX === lastPlayerTileX && playerTileY === lastPlayerTileY) {
      return;
    }

    const wasInPreviousPosition =
      lastPlayerTileX >= 0 && lastPlayerTileY >= 0;

    for (const trigger of map.triggers) {
      const isNowInside = isInBounds(playerTileX, playerTileY, trigger);
      const wasInside = wasInPreviousPosition
        ? isInBounds(lastPlayerTileX, lastPlayerTileY, trigger)
        : false;

      // onEnter: player just entered the trigger region
      if (isNowInside && !wasInside && trigger.events.onEnter) {
        // Check once-only activation
        if (trigger.activation.once && activatedTriggers.has(trigger.id)) {
          continue;
        }

        // Execute all onEnter events
        for (const event of trigger.events.onEnter) {
          executeTriggerEvent(event);
        }

        // Mark as activated if once-only
        if (trigger.activation.once) {
          activatedTriggers.add(trigger.id);
        }
      }
    }

    lastPlayerTileX = playerTileX;
    lastPlayerTileY = playerTileY;
  }

  function reset(): void {
    activatedTriggers.clear();
    lastPlayerTileX = -1;
    lastPlayerTileY = -1;
  }

  return { update, reset };
}
