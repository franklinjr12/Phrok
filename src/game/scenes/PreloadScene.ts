import Phaser from "phaser";
import { RegistryKeys } from "../constants/registryKeys";
import { SceneKeys } from "../constants/sceneKeys";
import { loadDataRegistry } from "../data/dataRegistry";
import { createNewGameState } from "../data/gameState";
import { PlayerTextureKeys } from "../entities/PlayerEntity";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Preload);
  }

  async create(): Promise<void> {
    this.createPlaceholderPlayerTexture();

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

  private createPlaceholderPlayerTexture(): void {
    if (this.textures.exists(PlayerTextureKeys.Placeholder)) {
      return;
    }

    const graphics = this.add.graphics();
    graphics.fillStyle(0x4fd1c5, 1);
    graphics.fillRoundedRect(10, 4, 28, 20, 8);
    graphics.fillStyle(0x2563eb, 1);
    graphics.fillRoundedRect(8, 20, 32, 28, 6);
    graphics.fillStyle(0xf8fafc, 1);
    graphics.fillCircle(18, 13, 3);
    graphics.fillCircle(30, 13, 3);
    graphics.lineStyle(2, 0x0f172a, 1);
    graphics.strokeRoundedRect(8, 4, 32, 44, 8);
    graphics.generateTexture(PlayerTextureKeys.Placeholder, 48, 52);
    graphics.destroy();
  }
}
