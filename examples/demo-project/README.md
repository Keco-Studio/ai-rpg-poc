# Demo RPG Project

A demonstration project for the AI RPG Maker runtime.

## What's Included

- **10x10 dungeon room** with wall borders and floor tiles
- **Player character** (green sprite) at spawn position (5, 5)
- **Guard NPC** (blue sprite) at position (3, 3) with dialogue
- **Trigger region** in the bottom-right corner (7-8, 7-8)

## How to Play

1. Start the runtime dev server:
   ```bash
   npm run dev --workspace=packages/runtime
   ```
2. Open `http://localhost:5173` in your browser
3. Use Arrow keys or WASD to move the player
4. Walk next to the Guard and press Spacebar or E to interact
5. Walk into the trigger region (bottom-right corner) to see a message

## Project Structure

```
demo-project/
├── project.json                    # Project data (Schema v1)
└── assets/
    └── tilesets/
        └── dungeon-tileset.png     # 16x16 tileset (4x4 grid, 16 tiles)
```

## Tileset Map

| Index | Tile |
|-------|------|
| 0 | Empty (black) |
| 1 | Wall (dark gray brick) |
| 2 | Floor (brown/tan) |
| 3-7 | Various terrain |
| 8 | Player character (green) |
| 9 | NPC character (blue) |
| 10-15 | Additional tiles |

## Modifying the Demo

Edit `project.json` to:

- Change map layout: Modify `tileLayers.ground.data` array
- Move entities: Update `position` in entity instances
- Add dialogue: Add nodes to `dialogues.dialogue:greeting.nodes`
- Add triggers: Append to `maps.map:start.triggers` array

After changes, the runtime will validate the project and show errors if invalid.
