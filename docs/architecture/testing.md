# Testing

Vitest logic tests sit beside source files under `src/` and run with `npm run test:logic`. Playwright browser tests live under `tests/` and run with `npm run test:e2e`.

Scoped verification is exposed by `scripts/verify.ps1`: `Logic`, `UI`, `World`, `Combat`, `Data`, and `Full`. Full verification runs build, logic, and E2E suites. Existing baseline failures must be separated from regressions.
