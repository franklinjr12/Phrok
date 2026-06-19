import "./styles.css";
import { createGame } from "./game/Game";

const app = document.querySelector<HTMLElement>("#app");

if (!app) {
  throw new Error("App root element was not found.");
}

const game = createGame(app);

app.dataset.ready = "true";
app.dataset.game = "initialized";

window.addEventListener("beforeunload", () => {
  game.destroy(true);
});
