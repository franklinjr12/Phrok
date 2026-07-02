import Phaser from "phaser";
import type { ItemRarity, VfxDefinition } from "../types/dataDefinitions";
import { getCombatTextDefinitionId, getLootBeamDefinitionId, type CombatTextKind } from "./vfxRouting";

export type VfxIntensity = "full" | "reduced";

export interface VfxManagerOptions {
  damageNumbersEnabled: boolean;
  intensity: VfxIntensity;
}

export interface SpawnedVfx {
  id: string;
  definitionId: string;
  destroy: () => void;
}

export class VfxManager {
  private active = new Map<string, Phaser.GameObjects.GameObject[]>();
  private sequence = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    definitions: VfxDefinition[],
    private readonly canvas: HTMLCanvasElement,
    private readonly options: VfxManagerOptions,
  ) {
    this.definitions = new Map(definitions.map((definition) => [definition.id, definition]));
    this.syncDataset();
  }

  private readonly definitions: Map<string, VfxDefinition>;

  spawn(definitionId: string, x: number, y: number, text = ""): SpawnedVfx | null {
    const definition = this.definitions.get(definitionId);

    if (!definition) {
      this.canvas.dataset.lastVfx = `missing:${definitionId}`;
      return null;
    }

    const id = `vfx-${this.sequence++}`;
    const objects = this.createObjects(definition, x, y, text);
    this.active.set(id, objects);
    this.canvas.dataset.lastVfx = `${definitionId}:${Math.round(x)},${Math.round(y)}`;
    this.syncDataset();

    const durationMs = this.getDuration(definition);
    this.scene.tweens.add({
      targets: objects,
      y: `-=${definition.rise}`,
      alpha: 0,
      scale: `+=${0.18 * definition.scale}`,
      duration: durationMs,
      ease: "Sine.easeOut",
      onComplete: () => this.destroy(id),
    });

    return {
      id,
      definitionId,
      destroy: () => this.destroy(id),
    };
  }

  setOptions(options: VfxManagerOptions): void {
    this.options.damageNumbersEnabled = options.damageNumbersEnabled;
    this.options.intensity = options.intensity;
    this.syncDataset();
  }

  spawnCombatText(kind: CombatTextKind, amount: number, x: number, y: number): SpawnedVfx | null {
    if (!this.options.damageNumbersEnabled) {
      this.canvas.dataset.lastCombatText = "disabled";
      return null;
    }

    const definitionId = getCombatTextDefinitionId(kind);
    const label = kind === "miss" ? "MISS" : kind === "healing" ? `+${amount}` : String(amount);

    this.canvas.dataset.lastCombatText = `${kind}:${label}`;
    return this.spawn(definitionId, x, y, label);
  }

  spawnLootBeam(rarity: ItemRarity, x: number, y: number): SpawnedVfx | null {
    const definitionId = getLootBeamDefinitionId(rarity);

    if (!definitionId) {
      return null;
    }

    this.canvas.dataset.lastLootBeam = `${rarity}:${definitionId}`;
    return this.spawn(definitionId, x, y);
  }

  destroyAll(): void {
    for (const id of this.active.keys()) {
      this.destroy(id);
    }
  }

  getActiveCount(): number {
    return this.active.size;
  }

  private createObjects(definition: VfxDefinition, x: number, y: number, text: string): Phaser.GameObjects.GameObject[] {
    const color = Phaser.Display.Color.HexStringToColor(definition.color).color;
    const secondaryColor = Phaser.Display.Color.HexStringToColor(definition.secondaryColor ?? definition.color).color;

    if (definition.kind === "text") {
      return [
        this.scene.add.text(x, y, text, {
          color: definition.color,
          fontFamily: "Arial, sans-serif",
          fontSize: `${Math.round(18 * definition.scale)}px`,
          fontStyle: definition.id === "critical-number" ? "bold" : "",
          stroke: definition.secondaryColor ?? "#0f172a",
          strokeThickness: 3,
        }).setOrigin(0.5).setDepth(definition.depth).setAlpha(definition.alpha),
      ];
    }

    if (definition.kind === "beam") {
      const height = this.options.intensity === "reduced" ? definition.rise * 0.62 : definition.rise;
      const width = this.options.intensity === "reduced" ? definition.radius * 0.55 : definition.radius;

      return [
        this.scene.add.rectangle(x, y - height / 2, width, height, color, definition.alpha)
          .setDepth(definition.depth),
        this.scene.add.ellipse(x, y, width * 1.15, 10, secondaryColor, definition.alpha)
          .setDepth(definition.depth + 1),
      ];
    }

    if (definition.kind === "ring") {
      return [
        this.scene.add.ellipse(x, y, definition.radius * 2, definition.radius, color, 0)
          .setStrokeStyle(3, color, definition.alpha)
          .setDepth(definition.depth),
        this.scene.add.circle(x, y, definition.radius * 0.28, secondaryColor, definition.alpha * 0.55)
          .setDepth(definition.depth + 1),
      ];
    }

    return [
      this.scene.add.star(x, y, 6, definition.radius * 0.2, definition.radius, color, definition.alpha)
        .setStrokeStyle(2, secondaryColor, definition.alpha)
        .setDepth(definition.depth),
    ];
  }

  private getDuration(definition: VfxDefinition): number {
    return this.options.intensity === "reduced"
      ? Math.max(120, Math.round(definition.durationMs * 0.65))
      : definition.durationMs;
  }

  private destroy(id: string): void {
    const objects = this.active.get(id);

    if (!objects) {
      return;
    }

    for (const object of objects) {
      object.destroy();
    }

    this.active.delete(id);
    this.syncDataset();
  }

  private syncDataset(): void {
    this.canvas.dataset.activeVfxCount = String(this.getActiveCount());
    this.canvas.dataset.damageNumbersEnabled = String(this.options.damageNumbersEnabled);
    this.canvas.dataset.vfxIntensity = this.options.intensity;
  }
}
