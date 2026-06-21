import Phaser from "phaser";
import { RegistryKeys } from "../constants/registryKeys";
import { SceneKeys } from "../constants/sceneKeys";
import { loadDataRegistry } from "../data/dataRegistry";
import { createNewGameState } from "../data/gameState";
import { EnemyTextureKeys, getEnemyTextureKey } from "../entities/EnemyEntity";
import { NpcTextureKeys } from "../entities/NpcEntity";
import { PlayerTextureKeys } from "../entities/PlayerEntity";
import townServiceNpcUrl from "../../../assets/sprites/town-service-npc.png?url";

const spriteAssetUrls = import.meta.glob("../../../assets/sprites/*.png", {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>;
const mapAssets = [
  { key: "map-crownfield-town", path: "assets/maps/crownfield-town.json" },
  { key: "map-crownfield-meadows", path: "assets/maps/crownfield-meadows.json" },
] as const;
const prototypeTilesKey = "prototype-tiles";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Preload);
  }

  preload(): void {
    for (const mapAsset of mapAssets) {
      this.load.tilemapTiledJSON(mapAsset.key, mapAsset.path);
    }

    this.load.image(NpcTextureKeys.TownService, townServiceNpcUrl);
    this.loadEnemySprites();
  }

  async create(): Promise<void> {
    this.createPlaceholderPlayerTexture();
    this.createPlaceholderEnemyTexture();
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

  private createPlaceholderEnemyTexture(): void {
    if (this.textures.exists(EnemyTextureKeys.GreenJellyPlaceholder)) {
      return;
    }

    const graphics = this.add.graphics();
    graphics.fillStyle(0x35c46a, 1);
    graphics.fillEllipse(24, 31, 42, 30);
    graphics.fillStyle(0x86efac, 0.9);
    graphics.fillEllipse(17, 22, 16, 10);
    graphics.fillStyle(0xf8fafc, 1);
    graphics.fillCircle(17, 29, 3);
    graphics.fillCircle(31, 29, 3);
    graphics.fillStyle(0x052e16, 1);
    graphics.fillCircle(17, 29, 1);
    graphics.fillCircle(31, 29, 1);
    graphics.lineStyle(2, 0x166534, 1);
    graphics.strokeEllipse(24, 31, 42, 30);
    graphics.generateTexture(EnemyTextureKeys.GreenJellyPlaceholder, 48, 52);
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

  private loadEnemySprites(): void {
    for (const [path, url] of Object.entries(spriteAssetUrls)) {
      const fileName = path.split("/").pop() ?? "";
      const monsterId = fileName.replace(/\.png$/i, "");
      const textureKey = getEnemyTextureKey(monsterId);

      if (!this.textures.exists(textureKey)) {
        this.load.image(textureKey, url);
      }
    }
  }
}
