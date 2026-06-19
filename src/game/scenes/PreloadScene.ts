import Phaser from "phaser";
import { RegistryKeys } from "../constants/registryKeys";
import { SceneKeys } from "../constants/sceneKeys";
import { loadDataRegistry } from "../data/dataRegistry";
import { createNewGameState } from "../data/gameState";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Preload);
  }

  async create(): Promise<void> {
    try {
      const dataRegistry = await loadDataRegistry();

      this.registry.set(RegistryKeys.DataRegistry, dataRegistry);
      this.registry.set(RegistryKeys.GameState, createNewGameState());
    } catch (error) {
      console.error("Failed to load game data.", error);
      this.game.canvas.dataset.dataLoadError = error instanceof Error ? error.message : "Unknown data load error.";
      return;
    }

    this.game.canvas.dataset.scene = "preload";
    this.scene.start(SceneKeys.MainMenu);
  }
}
