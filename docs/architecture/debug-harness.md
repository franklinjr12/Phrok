# Agent and debug harness

The project currently exposes gameplay state through test-facing canvas attributes in scene code. A typed `window.__PHROK_DEBUG__` API and named deterministic scenarios are planned refactors, not yet runtime contracts.

When adding debug instrumentation, keep it development/test-only, expose snapshots rather than Phaser internals, and preserve normal user-journey smoke coverage.
