/**
 * AI RPG Maker - Runtime Entry Point
 *
 * Initializes the game engine, loads the demo project, compiles the map scene,
 * and starts the game loop.
 */

import { createEngine } from './game/createEngine.js';
import { loadProject, loadTilesetImage, sliceTileset } from './loader/loadAssets.js';
import { compileMapScene } from './compiler/compileMapScene.js';
import { DebugOverlay } from './ui/debugOverlay.js';

/** Path to the demo project (relative to Vite public/dev server root) */
const PROJECT_URL = '/examples/demo-project/project.json';
const ASSETS_BASE = '/examples/demo-project';

async function main(): Promise<void> {
  console.log('[RPG Runtime] Starting...');

  try {
    // Step 1: Load and validate project
    console.log('[RPG Runtime] Loading project...');
    const project = await loadProject(PROJECT_URL);
    console.log(`[RPG Runtime] Project loaded: "${project.metadata.name}"`);

    // Step 2: Create engine with pixel-crisp settings
    const tileSize = project.config.tileSize;
    const viewportWidth = project.config.viewportSize.width * tileSize;
    const viewportHeight = project.config.viewportSize.height * tileSize;

    const engine = createEngine({
      canvasElementId: 'game-canvas',
      width: viewportWidth,
      height: viewportHeight,
    });

    // Step 3: Load tileset images
    const startingMap = project.maps[project.config.startingMap];
    if (!startingMap) {
      throw new Error(`Starting map '${project.config.startingMap}' not found`);
    }

    const tileset = project.tilesets[startingMap.tilesetId];
    if (!tileset) {
      throw new Error(`Tileset '${startingMap.tilesetId}' not found`);
    }

    console.log(`[RPG Runtime] Loading tileset: ${tileset.name}...`);
    const tilesetImage = await loadTilesetImage(tileset, ASSETS_BASE);
    const spriteSheet = sliceTileset(tilesetImage, tileset);

    // Step 4: Create debug overlay
    const debugOverlay = new DebugOverlay();

    // Step 5: Compile map scene
    console.log(`[RPG Runtime] Compiling map: ${startingMap.name}...`);
    const scene = compileMapScene(
      engine,
      startingMap,
      project,
      spriteSheet,
      tileSize,
      debugOverlay,
    );

    // Step 6: Add scene and start game
    engine.addScene('main', scene);
    engine.goToScene('main');

    console.log('[RPG Runtime] Starting game engine...');
    await engine.start();
    console.log('[RPG Runtime] Game running!');
  } catch (error) {
    console.error('[RPG Runtime] Failed to start:', error);
    showFatalError(error instanceof Error ? error.message : String(error));
  }
}

/**
 * Shows a fatal error message when the game fails to start.
 */
function showFatalError(message: string): void {
  const overlay = document.getElementById('error-overlay');
  const errorList = document.getElementById('error-list');
  if (overlay && errorList) {
    errorList.innerHTML = `
      <div class="error-item">
        <div class="error-code">[FATAL]</div>
        <div>${message}</div>
      </div>
    `;
    overlay.style.display = 'block';
  }
}

// Start the application
main();
