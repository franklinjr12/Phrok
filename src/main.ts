import "./styles.css";
import Phaser from "phaser";
import { MainMenuScene } from "./game/scenes/mainMenu/MainMenuScene";

const app = document.querySelector<HTMLElement>("#app");

if (!app) {
  throw new Error("App root element was not found.");
}

const game = new Phaser.Game({
  backgroundColor: "#101318",
  parent: app,
  scale: {
    autoCenter: Phaser.Scale.CENTER_BOTH,
    mode: Phaser.Scale.RESIZE
  },
  scene: [MainMenuScene],
  type: Phaser.AUTO
});

app.dataset.ready = "true";
app.dataset.game = "initialized";

window.addEventListener("beforeunload", () => {
  game.destroy(true);
});
