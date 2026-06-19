# Repository Guidelines

## Project Structure & Module Organization

This is a Vite + TypeScript Phaser project. The browser entry point is `src/main.ts`, shared styling is in `src/styles.css`, and game code belongs under `src/game/`. Scene classes currently live in `src/game/scenes/`, for example `MainMenuScene.ts`. End-to-end tests are in `tests/` and use Playwright. Design and planning notes live in `docs/`. Generated output such as `dist/`, `test-results/`, and `playwright-report/` should not be edited by hand.

## Build, Test, and Development Commands

- `npm install`: install dependencies from `package-lock.json`.
- `npm run dev`: start the Vite development server.
- `npm run build`: type-check with `tsc --noEmit` and create the production Vite build.
- `npm test`: run the Playwright test suite.
- `npm run test:ui`: open Playwright's interactive test runner.
- `npm run preview`: serve the production build locally for final checks.

## Coding Style & Naming Conventions

Use TypeScript modules and keep imports explicit. Follow the existing style: two-space indentation, double quotes, semicolons, and trailing commas only where TypeScript or the formatter naturally adds them. Name Phaser scene classes in `PascalCase` with a `Scene` suffix, such as `MainMenuScene`. Use `camelCase` for variables, functions, and private helpers. Keep scene-specific constants near the scene that owns them until they are reused across modules.

## Testing Guidelines

Use Vitest for game logic and backend-style tests once those modules exist. Use Playwright for end-to-end and frontend tests. Because this is a game, Playwright tests should simulate user input directly, such as pressing keys, moving the mouse to a position, and clicking the canvas. Place browser tests in `tests/` using the `*.spec.ts` suffix. Every feature or significant code change must include a test: logic changes should be covered by Vitest, and visual or interaction changes should be covered by Playwright. Run `npm test` before submitting changes. For UI-heavy changes, use `npm run test:ui` or inspect the generated Playwright report after failures.

## Project Notes & Planning

The project backlog lives in `docs/backlog.md`. The full game design and project description live in `docs/gdd.md`. Consult these documents when implementation details, feature intent, or priorities are unclear.

## Commit & Pull Request Guidelines

This repository does not yet have commit history to derive a local convention from. Use short, imperative commit messages, for example `Add main menu scene` or `Document test workflow`. Pull requests should include a concise summary, testing performed, and linked issue or backlog item when applicable. Include screenshots or short recordings for visible UI/gameplay changes.

## Agent-Specific Instructions

Do not edit generated build or test report directories. For Unity projects only: do not try to build C# code, because Unity performs that build itself. This repository is currently a web Phaser project, so use the npm scripts above for verification.
