/**
 * Engine creation utility for the Excalibur runtime.
 *
 * Configures the engine with pixel-crisp rendering settings:
 * - antialiasing: false (no smoothing on canvas)
 * - pixelRatio: 1 (force 1:1 pixel ratio)
 * - Nearest-neighbor filtering for pixel art
 */

import { Engine, DisplayMode, Color } from 'excalibur';

export interface CreateEngineOptions {
  /** Canvas element ID or HTMLCanvasElement */
  canvasElementId?: string;
  /** Viewport width in pixels */
  width: number;
  /** Viewport height in pixels */
  height: number;
}

/**
 * Creates an Excalibur Engine configured for pixel-crisp rendering.
 *
 * @param options - Engine configuration options
 * @returns Configured Excalibur Engine instance
 */
export function createEngine(options: CreateEngineOptions): Engine {
  const engine = new Engine({
    canvasElementId: options.canvasElementId ?? 'game-canvas',
    width: options.width,
    height: options.height,
    displayMode: DisplayMode.Fixed,
    antialiasing: false,
    pixelRatio: 1,
    suppressPlayButton: true,
    backgroundColor: Color.Black,
  });

  return engine;
}
