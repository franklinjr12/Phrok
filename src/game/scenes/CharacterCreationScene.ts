import Phaser from "phaser";
import { RegistryKeys } from "../constants/registryKeys";
import { SceneKeys } from "../constants/sceneKeys";
import type { GameState } from "../types/gameState";

export class CharacterCreationScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.CharacterCreation);
  }

  create(): void {
    const state = this.registry.get(RegistryKeys.GameState) as GameState | undefined;

    this.cameras.main.setBackgroundColor("#131a22");
    this.add.text(this.scale.width / 2, this.scale.height / 2, "Character Creation", {
      color: "#f4f7fb",
      fontFamily: "Arial, sans-serif",
      fontSize: "28px",
    }).setOrigin(0.5);

    this.game.canvas.dataset.scene = "character-creation";
    this.game.canvas.dataset.characterName = state?.playerProfile.name ?? "";

    this.input.keyboard?.once("keydown-ENTER", () => {
      this.startWorld();
    });

    this.input.once("pointerup", () => {
      this.startWorld();
    });
  }

  private startWorld(): void {
    this.scene.start(SceneKeys.World);
  }
}
