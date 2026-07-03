import Phaser from "phaser";
import { RegistryKeys } from "../constants/registryKeys";
import { SceneKeys } from "../constants/sceneKeys";
import type { DataRegistry } from "../data/dataRegistry";
import { getEnemyTextureKey } from "../entities/EnemyEntity";
import { getNpcTextureKey } from "../entities/NpcEntity";
import { getPlayerTextureKey } from "../entities/PlayerEntity";
import { getSupportTextureKey } from "../entities/supportTextures";

interface GalleryEntry {
  group: "players" | "monsters" | "npcs" | "supports";
  id: string;
  name: string;
  textureKey: string;
}

interface GalleryCell {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  spriteX: number;
  spriteY: number;
  spriteWidth: number;
  spriteHeight: number;
}

const cellWidth = 112;
const cellHeight = 92;
const columns = 10;

export class SpriteGalleryScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.SpriteGallery);
  }

  create(): void {
    const dataRegistry = this.registry.get(RegistryKeys.DataRegistry) as DataRegistry;
    const entries = this.getEntries(dataRegistry);
    const missing = entries.filter((entry) => !this.textures.exists(entry.textureKey));

    this.cameras.main.setBackgroundColor("#101318");
    this.scale.resize(1280, 1120);

    const cells: GalleryCell[] = [];
    let y = 28;

    for (const group of ["players", "monsters", "npcs", "supports"] as const) {
      const groupEntries = entries.filter((entry) => entry.group === group);
      y = this.drawGroup(group, groupEntries, y, cells);
    }

    const canvas = this.game.canvas;
    canvas.dataset.scene = "sprite-gallery";
    canvas.dataset.spriteGalleryMissing = missing.map((entry) => `${entry.group}:${entry.id}`).join("|");
    canvas.dataset.spriteGalleryPlayers = String(entries.filter((entry) => entry.group === "players").length);
    canvas.dataset.spriteGalleryMonsters = String(entries.filter((entry) => entry.group === "monsters").length);
    canvas.dataset.spriteGalleryNpcs = String(entries.filter((entry) => entry.group === "npcs").length);
    canvas.dataset.spriteGallerySupports = String(entries.filter((entry) => entry.group === "supports").length);
    canvas.dataset.spriteGalleryCells = JSON.stringify(cells);
  }

  private getEntries(dataRegistry: DataRegistry): GalleryEntry[] {
    return [
      ...dataRegistry.getClasses().map((entry) => ({
        group: "players" as const,
        id: entry.id,
        name: entry.name,
        textureKey: getPlayerTextureKey(entry.id),
      })),
      ...dataRegistry.getMonsters().map((entry) => ({
        group: "monsters" as const,
        id: entry.id,
        name: entry.name,
        textureKey: getEnemyTextureKey(entry.id),
      })),
      ...dataRegistry.getNpcs().map((entry) => ({
        group: "npcs" as const,
        id: entry.id,
        name: entry.name,
        textureKey: getNpcTextureKey(entry.id),
      })),
      ...dataRegistry.getSupports().map((entry) => ({
        group: "supports" as const,
        id: entry.id,
        name: entry.name,
        textureKey: getSupportTextureKey(entry.id),
      })),
    ];
  }

  private drawGroup(group: GalleryEntry["group"], entries: GalleryEntry[], y: number, cells: GalleryCell[]): number {
    this.add.text(24, y, `${group} (${entries.length})`, {
      color: "#f8fafc",
      fontFamily: "Arial, sans-serif",
      fontSize: "18px",
    });

    const startY = y + 28;

    entries.forEach((entry, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = 24 + col * cellWidth;
      const cellY = startY + row * cellHeight;
      const textureExists = this.textures.exists(entry.textureKey);

      this.add.rectangle(x, cellY, cellWidth - 8, cellHeight - 8, 0x17202a, 1)
        .setOrigin(0, 0)
        .setStrokeStyle(1, textureExists ? 0x3f6f66 : 0xdc2626);

      if (textureExists) {
        const scale = this.getScaleForTexture(entry.textureKey);
        const image = this.add.image(x + 52, cellY + 34, entry.textureKey)
          .setOrigin(0.5, 0.5)
          .setScale(scale);
        cells.push({
          id: `${entry.group}:${entry.id}`,
          x,
          y: cellY,
          width: cellWidth - 8,
          height: cellHeight - 8,
          spriteX: image.x - image.displayWidth / 2,
          spriteY: image.y - image.displayHeight / 2,
          spriteWidth: image.displayWidth,
          spriteHeight: image.displayHeight,
        });
      } else {
        this.add.text(x + 52, cellY + 28, "missing", {
          color: "#fca5a5",
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
        }).setOrigin(0.5);
        cells.push({
          id: `${entry.group}:${entry.id}`,
          x,
          y: cellY,
          width: cellWidth - 8,
          height: cellHeight - 8,
          spriteX: x + 16,
          spriteY: cellY + 12,
          spriteWidth: 72,
          spriteHeight: 44,
        });
      }

      this.add.text(x + 8, cellY + 66, entry.id, {
        color: "#cbd5e1",
        fixedWidth: cellWidth - 24,
        fontFamily: "Arial, sans-serif",
        fontSize: "10px",
      });

    });

    return startY + Math.ceil(entries.length / columns) * cellHeight + 28;
  }

  private getScaleForTexture(textureKey: string): number {
    const texture = this.textures.get(textureKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const maxEdge = Math.max(texture.width, texture.height);

    return maxEdge >= 96 ? 0.68 : maxEdge >= 64 ? 0.95 : 1.35;
  }
}
