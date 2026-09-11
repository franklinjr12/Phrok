# State and events

Persisted state types are defined in `src/game/types/gameState.ts` and `src/game/types/saveData.ts`; runtime state helpers currently live in `src/game/data/gameState.ts`. Save shape is a compatibility boundary: structural refactors must not change it.

The runtime event bus is `src/game/systems/eventBus.ts`. Preserve existing event names and payload semantics. Event declarations may later split by domain without introducing multiple global buses.
