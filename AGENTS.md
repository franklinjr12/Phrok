# Stack

- Phaser 4
- TypeScript
- Vite
- Vitest
- Playwright

# Repository map

- Runtime: `src/game/`
- Scenes: `src/game/scenes/`
- UI: `src/game/scenes/UIScene.ts`
- World runtime: `src/game/scenes/WorldScene.ts`
- Domain systems: `src/game/systems/`
- Data registry: `src/game/data/`
- Static game data: `public/assets/data/`
- E2E tests: `tests/`
- Architecture docs: `docs/architecture/`
- Game design: `docs/design/`
- Epics: `docs/epics/`

Read only documentation relevant to current task. For large data catalogs, use `scripts/query-data.mjs` or `scripts/list-data.mjs` first.

# Verification

Use `./scripts/verify.ps1` from repository root. Use scoped verification while iterating; use `-Scope Full` before completing architectural work.

# Agent workflow

- Work on one backlog/refactor task at a time.
- Resolve named epics through `docs/epics/index.md` and its one epic file.
- Do not inspect complete GDD, backlog, or large game-data files unless bulk work requires it.
- Prefer existing focused tests and deterministic debug scenarios.
- Preserve gameplay behavior, save compatibility, and public event names during refactors.
- Do not redesign unrelated systems or run repository-wide formatting.
- Final report: changes, tests run, remaining issues.

# Assets

Use sprite generation only when task requires a missing sprite.
