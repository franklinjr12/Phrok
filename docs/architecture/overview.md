# Runtime architecture

`src/main.ts` boots Vite/Phaser through `src/game/Game.ts`. Scene lifecycle currently lives under `src/game/scenes/`: boot, preload, menu, character creation, world, UI, dialogue, game-over, and sprite gallery.

Domain behavior is mostly pure or state-oriented code under `src/game/systems/`. Runtime entities live under `src/game/entities/`; map pathfinding lives under `src/game/map/`; JSON loading and validation live under `src/game/data/`.

Current refactor direction: keep `GameState` and public event names stable while extracting focused UI/world controllers from the two large runtime scenes.
