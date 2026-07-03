import Phaser from "phaser";
import { RegistryKeys } from "../constants/registryKeys";
import { SceneKeys } from "../constants/sceneKeys";
import { loadDataRegistry } from "../data/dataRegistry";
import { createNewGameState } from "../data/gameState";
import { EnemyTextureKeys, getEnemyTextureKey } from "../entities/EnemyEntity";
import { getNpcTextureKey, NpcTextureKeys } from "../entities/NpcEntity";
import { getPlayerTextureKey } from "../entities/PlayerEntity";
import { getSupportTextureKey } from "../entities/supportTextures";
import type { MapDefinition } from "../types/dataDefinitions";
import townServiceNpcUrl from "../../../assets/sprites/town-service-npc.png?url";

const spriteAssetUrls = import.meta.glob("../../../assets/sprites/**/*.png", {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>;
const prototypeTilesKey = "prototype-tiles";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Preload);
  }

  preload(): void {
    this.load.image(NpcTextureKeys.TownService, townServiceNpcUrl);
    this.loadEnemySprites();
  }

  async create(): Promise<void> {
    this.createPlayerClassTextures();
    this.createFallbackEnemyTexture();
    this.createPrototypeTileTexture();

    try {
      const dataRegistry = await loadDataRegistry();

      await this.loadMapAssets(dataRegistry.getMaps());
      this.registry.set(RegistryKeys.DataRegistry, dataRegistry);
      this.registry.set(RegistryKeys.GameState, createNewGameState());
    } catch (error) {
      console.error("Failed to load game data.", error);
      this.game.canvas.dataset.dataLoadError = error instanceof Error ? error.message : "Unknown data load error.";
      return;
    }

    this.game.canvas.dataset.scene = "preload";
    this.scene.start(new URLSearchParams(window.location.search).get("spriteGallery") === "1"
      ? SceneKeys.SpriteGallery
      : SceneKeys.MainMenu);
  }

  private async loadMapAssets(maps: MapDefinition[]): Promise<void> {
    const unloadedMaps = maps.filter((map) => !this.cache.tilemap.exists(map.tilemapKey));

    if (unloadedMaps.length === 0) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
      this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
        reject(new Error(`Failed to load map asset ${file.key}.`));
      });

      for (const map of unloadedMaps) {
        this.load.tilemapTiledJSON(map.tilemapKey, `assets/maps/${map.id}.json`);
      }

      this.load.start();
    });
  }

  private createPlayerClassTextures(): void {
    const classPalettes = [
      { id: "swordsman", tunic: 0x2f80ed, trim: 0xd6b45f, weapon: 0xdbeafe },
      { id: "mage", tunic: 0x7c3aed, trim: 0xfef3c7, weapon: 0xf97316 },
      { id: "archer", tunic: 0x15803d, trim: 0xfacc15, weapon: 0x92400e },
      { id: "thief", tunic: 0x334155, trim: 0x22d3ee, weapon: 0xcbd5e1 },
    ] as const;

    for (const palette of classPalettes) {
      const textureKey = getPlayerTextureKey(palette.id);

      if (this.textures.exists(textureKey)) {
        continue;
      }

      const graphics = this.add.graphics();
      graphics.fillStyle(0x0f172a, 1);
      graphics.fillRect(15, 6, 18, 4);
      graphics.fillStyle(0xf8d3a7, 1);
      graphics.fillRect(14, 10, 20, 14);
      graphics.fillStyle(0x111827, 1);
      graphics.fillRect(18, 15, 4, 3);
      graphics.fillRect(28, 15, 4, 3);
      graphics.fillStyle(palette.tunic, 1);
      graphics.fillRect(12, 24, 24, 20);
      graphics.fillStyle(palette.trim, 1);
      graphics.fillRect(12, 24, 24, 4);
      graphics.fillRect(18, 44, 5, 6);
      graphics.fillRect(27, 44, 5, 6);
      graphics.fillStyle(0x111827, 1);
      graphics.fillRect(10, 28, 4, 14);
      graphics.fillRect(34, 28, 4, 14);
      graphics.fillStyle(palette.weapon, 1);
      graphics.fillRect(38, 20, 3, 26);
      graphics.lineStyle(2, 0x020617, 1);
      graphics.strokeRect(12, 10, 24, 40);
      graphics.generateTexture(textureKey, 48, 52);
      graphics.destroy();
    }
  }

  private createFallbackEnemyTexture(): void {
    if (this.textures.exists(EnemyTextureKeys.GreenJellyFallback)) {
      return;
    }

    const graphics = this.add.graphics();
    graphics.fillStyle(0x14532d, 1);
    graphics.fillEllipse(24, 34, 42, 28);
    graphics.fillStyle(0x22c55e, 1);
    graphics.fillEllipse(24, 30, 38, 26);
    graphics.fillStyle(0x86efac, 1);
    graphics.fillEllipse(16, 24, 14, 8);
    graphics.fillEllipse(31, 23, 10, 6);
    graphics.fillStyle(0xf8fafc, 1);
    graphics.fillCircle(17, 29, 3);
    graphics.fillCircle(31, 29, 3);
    graphics.fillStyle(0x052e16, 1);
    graphics.fillCircle(17, 29, 1);
    graphics.fillCircle(31, 29, 1);
    graphics.fillStyle(0xfacc15, 1);
    graphics.fillRect(20, 13, 8, 4);
    graphics.fillRect(18, 17, 12, 3);
    graphics.lineStyle(2, 0x166534, 1);
    graphics.strokeEllipse(24, 30, 38, 26);
    graphics.generateTexture(EnemyTextureKeys.GreenJellyFallback, 48, 52);
    graphics.destroy();
  }

  private createPrototypeTileTexture(): void {
    if (this.textures.exists(prototypeTilesKey)) {
      return;
    }

    const graphics = this.add.graphics();

    graphics.fillStyle(0x2f5d50, 1);
    graphics.fillRect(0, 0, 32, 32);
    graphics.fillStyle(0x5f8f52, 1);
    graphics.fillRect(5, 5, 6, 3);
    graphics.fillRect(19, 12, 8, 3);
    graphics.fillRect(10, 23, 12, 3);
    graphics.lineStyle(1, 0x86a85f, 0.7);
    graphics.strokeRect(0, 0, 32, 32);

    graphics.fillStyle(0x3f3f46, 1);
    graphics.fillRect(32, 0, 32, 32);
    graphics.fillStyle(0x52525b, 1);
    graphics.fillRect(36, 5, 24, 5);
    graphics.fillRect(38, 18, 18, 4);
    graphics.lineStyle(2, 0x94a3b8, 0.9);
    graphics.strokeRect(34, 2, 28, 28);

    graphics.generateTexture(prototypeTilesKey, 64, 32);
    graphics.destroy();
  }

  private loadEnemySprites(): void {
    for (const [path, url] of Object.entries(spriteAssetUrls)) {
      const normalizedPath = path.replace(/\\/g, "/");
      const spriteId = normalizedPath.split("/").pop()?.replace(/\.png$/i, "") ?? "";
      const textureKey = this.getSpriteTextureKey(normalizedPath, spriteId);

      if (!this.textures.exists(textureKey)) {
        this.load.image(textureKey, url);
      }
    }
  }

  private getSpriteTextureKey(path: string, spriteId: string): string {
    if (path.includes("/players/")) {
      return getPlayerTextureKey(spriteId);
    }

    if (path.includes("/npcs/")) {
      return getNpcTextureKey(spriteId);
    }

    if (path.includes("/supports/")) {
      return getSupportTextureKey(spriteId);
    }

    if (["archer", "mage", "swordsman", "thief"].includes(spriteId)) {
      return getPlayerTextureKey(spriteId);
    }

    return getEnemyTextureKey(spriteId);
  }
}
