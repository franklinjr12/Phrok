import Phaser from "phaser";
import { RegistryKeys } from "../constants/registryKeys";
import { SceneKeys } from "../constants/sceneKeys";
import { createNewGameState } from "../data/gameState";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Preload);
  }

  create(): void {
    this.registry.set(RegistryKeys.GameState, createNewGameState());
    this.game.canvas.dataset.scene = "preload";
    this.scene.start(SceneKeys.MainMenu);
  }
}
