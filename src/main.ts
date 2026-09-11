import "./styles.css";
import { createGame } from "./game/Game";

const app = document.querySelector<HTMLElement>("#app");

if (!app) {
  throw new Error("App root element was not found.");
}

const game = createGame(app);

// Kept private to the browser shell so deterministic Playwright states can pause
// Phaser's frame clock after a state has settled before taking a screenshot.
(window as Window & { __phrokGame?: typeof game }).__phrokGame = game;

app.dataset.ready = "true";
app.dataset.game = "initialized";

window.addEventListener("beforeunload", () => {
  game.destroy(true);
});
