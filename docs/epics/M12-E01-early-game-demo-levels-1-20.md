# M12-E01 Early Game Demo — Levels 1–20

Status: implemented.

The live design is documented in [early-game.md](../design/early-game.md). This epic reused existing domain systems (bestiary, loot, bosses, hunting board, crafting, refinement, sigils, VFX, modular UI) and added data-driven rare variants, reward choices, contextual hints, cracked-sigil effect IDs, and optional `VITE_DEMO_MODE` travel gating.

Deterministic checks live in `src/game/systems/earlyGameSlice.test.ts`, `src/game/systems/earlyGameScenario.ts`, and `tests/earlyGame.spec.ts`.
