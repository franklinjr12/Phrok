# Static data

JSON catalogs live in `public/assets/data/`. `src/game/data/dataRegistry.ts` owns loading, validation, and typed lookup today. `src/game/data/dataValidation.ts` contains validation logic.

Use `node scripts/query-data.mjs --collection <name> --id <id>` for one definition, or `node scripts/list-data.mjs --collection <name>` for compact identifiers. Avoid opening complete catalogs unless bulk changes are required.
