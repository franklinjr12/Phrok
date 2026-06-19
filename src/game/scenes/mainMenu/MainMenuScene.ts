import Phaser from "phaser";
import { createMainMenuLayout } from "./mainMenuLayout";

const buttonStyle: Phaser.Types.GameObjects.Text.TextStyle = {
  align: "center",
  backgroundColor: "#263241",
  color: "#f4f7fb",
  fixedWidth: 220,
  fontFamily: "Arial, sans-serif",
  fontSize: "24px",
  padding: {
    x: 20,
    y: 14
  }
};

const buttonHoverStyle: Phaser.Types.GameObjects.Text.TextStyle = {
  backgroundColor: "#3a526d",
  color: "#ffffff"
};

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super("MainMenuScene");
  }

  create(): void {
    const { width, height } = this.scale;
    const layout = createMainMenuLayout(width, height);
    const canvas = this.game.canvas;

    this.cameras.main.setBackgroundColor("#101318");

    for (const button of layout.buttons) {
      this.createMenuButton(button.x, button.y, button.label);
    }

    canvas.dataset.scene = "main-menu";
    canvas.dataset.menuButtons = layout.buttons.map((button) => button.label).join("|");
  }

  private createMenuButton(x: number, y: number, label: string): Phaser.GameObjects.Text {
    const button = this.add
      .text(x, y, label, buttonStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    button.on("pointerover", () => {
      this.game.canvas.dataset.activeButton = label;
      button.setStyle(buttonHoverStyle);
    });

    button.on("pointerout", () => {
      delete this.game.canvas.dataset.activeButton;
      button.setStyle(buttonStyle);
    });

    button.on("pointerdown", () => {
      this.game.canvas.dataset.pressedButton = label;
      button.setAlpha(0.82);
    });

    button.on("pointerup", () => {
      delete this.game.canvas.dataset.pressedButton;
      button.setAlpha(1);
    });

    return button;
  }
}
