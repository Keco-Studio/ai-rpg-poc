/**
 * Debug overlay for displaying interaction feedback.
 *
 * Shows messages in a semi-transparent overlay positioned at top-center.
 * Auto-hides after a configurable duration.
 */

/** Default auto-hide duration in milliseconds */
const DEFAULT_HIDE_DELAY = 3000;

/**
 * Debug overlay that displays messages to the player.
 * Used for NPC dialogue, trigger messages, and debug information.
 */
export class DebugOverlay {
  private element: HTMLElement | null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private hideDelay: number;

  /**
   * Creates a new DebugOverlay.
   *
   * @param elementId - ID of the overlay DOM element
   * @param hideDelay - Auto-hide delay in ms (default: 3000)
   */
  constructor(elementId: string = 'debug-overlay', hideDelay: number = DEFAULT_HIDE_DELAY) {
    this.element = document.getElementById(elementId);
    this.hideDelay = hideDelay;
  }

  /**
   * Shows a message in the debug overlay.
   * Automatically hides after the configured delay.
   *
   * @param message - Text to display
   */
  show(message: string): void {
    if (!this.element) return;

    // Clear any existing hide timer
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }

    this.element.textContent = message;
    this.element.style.display = 'block';

    // Auto-hide after delay
    this.hideTimer = setTimeout(() => {
      this.hide();
    }, this.hideDelay);
  }

  /**
   * Hides the debug overlay immediately.
   */
  hide(): void {
    if (!this.element) return;

    this.element.style.display = 'none';
    this.element.textContent = '';

    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
}
