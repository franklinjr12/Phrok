import Phaser from "phaser";
import { RegistryKeys } from "../constants/registryKeys";
import { SceneKeys } from "../constants/sceneKeys";
import { loadDataRegistry } from "../data/dataRegistry";
import { createNewGameState } from "../data/gameState";
import { PlayerTextureKeys } from "../entities/PlayerEntity";

const prototypeMapKey = "map-crownfield-meadows";
const prototypeTilesKey = "prototype-tiles";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Preload);
  }

  preload(): void {
    this.load.tilemapTiledJSON(prototypeMapKey, "assets/maps/crownfield-meadows.json");
  }

  async create(): Promise<void> {
    this.createPlaceholderPlayerTexture();
    this.createPrototypeTileTexture();

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

  private createPrototypeTileTexture(): void {
    if (this.textures.exists(prototypeTilesKey)) {
      return;
    }

    const graphics = this.add.graphics();

    graphics.fillStyle(0x315c3a, 1);
    graphics.fillRect(0, 0, 32, 32);
    graphics.lineStyle(1, 0x47724d, 0.7);
    graphics.strokeRect(0, 0, 32, 32);

    graphics.fillStyle(0x334155, 1);
    graphics.fillRect(32, 0, 32, 32);
    graphics.lineStyle(2, 0x64748b, 0.9);
    graphics.strokeRect(34, 2, 28, 28);

    graphics.generateTexture(prototypeTilesKey, 64, 32);
    graphics.destroy();
  }
}
