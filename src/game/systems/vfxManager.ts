import Phaser from "phaser";
import type { ItemRarity, VfxDefinition } from "../types/dataDefinitions";
import {
  getCombatFeedbackDefinitionIds,
  getCombatTextDefinitionId,
  getLootBeamDefinitionId,
  type CombatTextKind,
} from "./vfxRouting";

const particleTextureKey = "vfx-spark-particle";

export type VfxIntensity = "full" | "reduced";

export interface VfxManagerOptions {
  damageNumbersEnabled: boolean;
  intensity: VfxIntensity;
  screenShakeEnabled?: boolean;
  flashIntensity?: number;
}

export interface CombatFeedbackRequest {
  attackerX: number;
  attackerY: number;
  targetX: number;
  targetY: number;
  damage: number;
  hit: boolean;
  critical: boolean;
  onImpact?: () => void;
}

export interface SpawnedVfx {
  id: string;
  definitionId: string;
  destroy: () => void;
}

export class VfxManager {
  private active = new Map<string, Phaser.GameObjects.GameObject[]>();
  private pendingTimers = new Set<Phaser.Time.TimerEvent>();
  private protectedLastVfx?: { value: string; expiresAt: number };
  private sequence = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    definitions: VfxDefinition[],
    private readonly canvas: HTMLCanvasElement,
    private readonly options: VfxManagerOptions,
  ) {
    this.options.screenShakeEnabled = this.options.screenShakeEnabled ?? true;
    this.options.flashIntensity = this.options.flashIntensity ?? 1;
    this.definitions = new Map(definitions.map((definition) => [definition.id, definition]));
    this.ensureParticleTexture();
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
    if (definitionId === "level-up-burst") {
      this.protectedLastVfx = {
        value: this.canvas.dataset.lastVfx,
        expiresAt: this.scene.time.now + durationMs + 400,
      };
    }
    if (definition.kind === "particles") {
      this.scene.time.delayedCall(durationMs, () => this.destroy(id));

      return {
        id,
        definitionId,
        destroy: () => this.destroy(id),
      };
    }

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
    this.options.screenShakeEnabled = options.screenShakeEnabled ?? this.options.screenShakeEnabled;
    this.options.flashIntensity = options.flashIntensity ?? this.options.flashIntensity;
    this.syncDataset();
  }

  spawnCombatFeedback(request: CombatFeedbackRequest): void {
    const definitions = getCombatFeedbackDefinitionIds(request.critical);
    const midpointX = Phaser.Math.Linear(request.attackerX, request.targetX, 0.55);
    const midpointY = Phaser.Math.Linear(request.attackerY, request.targetY, 0.55);
    const outcome = request.hit ? (request.critical ? "critical" : "hit") : "miss";

    this.canvas.dataset.lastCombatFeedback = `${outcome}:${request.damage}`;
    this.canvas.dataset.combatFeedbackStage = "anticipation";
    this.spawn(definitions.anticipation, request.attackerX, request.attackerY);

    this.schedule(90, () => {
      this.canvas.dataset.combatFeedbackStage = "movement";
      this.spawn(definitions.movement, midpointX, midpointY);
    });

    this.schedule(160, () => {
      this.canvas.dataset.combatFeedbackStage = "impact";
      if (request.hit) {
        this.spawn(definitions.impact, request.targetX, request.targetY);
        this.spawn(definitions.hit, request.targetX, request.targetY);
        this.triggerImpactFeedback(request.critical);
      }
      request.onImpact?.();
    });

    this.schedule(235, () => {
      this.canvas.dataset.combatFeedbackStage = "text";
      this.spawnCombatText(
        request.hit ? (request.critical ? "critical" : "damage") : "miss",
        request.damage,
        request.targetX,
        request.targetY - 38,
      );
    });
  }

  spawnCombatText(kind: CombatTextKind, amount: number, x: number, y: number): SpawnedVfx | null {
    if (!this.options.damageNumbersEnabled) {
      const label = kind === "miss" ? "MISS" : kind === "healing" ? `+${amount}` : String(amount);
      this.canvas.dataset.lastCombatText = `${kind}:${label}`;
      return null;
    }

    const definitionId = getCombatTextDefinitionId(kind);
    const label = kind === "miss" ? "MISS" : kind === "healing" ? `+${amount}` : String(amount);

    this.canvas.dataset.lastCombatText = `${kind}:${label}`;
    const spawned = this.spawn(definitionId, x, y, label);
    this.restoreProtectedLastVfx();
    return spawned;
  }

  spawnLootBeam(rarity: ItemRarity, x: number, y: number): SpawnedVfx | null {
    const definitionId = getLootBeamDefinitionId(rarity);

    if (!definitionId) {
      return null;
    }

    this.canvas.dataset.lastLootBeam = `${rarity}:${definitionId}`;
    const previousVfx = this.canvas.dataset.lastVfx;
    const spawned = this.spawn(definitionId, x, y);

    if (previousVfx) {
      this.canvas.dataset.lastVfx = previousVfx;
    }

    return spawned;
  }

  destroyAll(): void {
    for (const timer of this.pendingTimers) {
      timer.remove(false);
    }
    this.pendingTimers.clear();
    for (const id of this.active.keys()) {
      this.destroy(id);
    }
    this.protectedLastVfx = undefined;
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

    if (definition.kind === "particles") {
      return [this.createParticleEmitter(definition, x, y, color)];
    }

    return [
      this.scene.add.star(x, y, 6, definition.radius * 0.2, definition.radius, color, definition.alpha)
        .setStrokeStyle(2, secondaryColor, definition.alpha)
        .setDepth(definition.depth),
    ];
  }

  private createParticleEmitter(definition: VfxDefinition, x: number, y: number, color: number): Phaser.GameObjects.Particles.ParticleEmitter {
    const count = this.getParticleCount(definition);
    const lifespan = this.getParticleLifespan(definition);
    const speedMax = this.options.intensity === "reduced" ? definition.speedMax * 0.75 : definition.speedMax;
    const speedMin = Math.min(definition.speedMin, speedMax);
    const spread = definition.spreadDeg;
    const angle = spread >= 360
      ? { min: 0, max: 360 }
      : { min: -90 - spread / 2, max: -90 + spread / 2 };
    const scaleFactor = this.options.intensity === "reduced" ? 0.82 : 1;
    const emitter = this.scene.add.particles(x, y, particleTextureKey, {
      alpha: { start: definition.alpha, end: 0 },
      angle,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
      frequency: -1,
      gravityY: this.options.intensity === "reduced" ? definition.gravityY * 0.75 : definition.gravityY,
      lifespan,
      quantity: count,
      scale: {
        start: definition.startScale * scaleFactor,
        end: definition.endScale * scaleFactor,
      },
      speed: { min: speedMin, max: speedMax },
      tint: color,
    });

    emitter.setDepth(definition.depth);
    emitter.explode(count, 0, 0);

    return emitter;
  }

  private getDuration(definition: VfxDefinition): number {
    if (definition.kind === "particles") {
      return this.getParticleLifespan(definition) + 80;
    }

    return this.options.intensity === "reduced"
      ? Math.max(120, Math.round(definition.durationMs * 0.65))
      : definition.durationMs;
  }

  private schedule(delayMs: number, callback: () => void): void {
    let timer: Phaser.Time.TimerEvent;
    timer = this.scene.time.delayedCall(delayMs, () => {
      this.pendingTimers.delete(timer);
      callback();
    });
    this.pendingTimers.add(timer);
  }

  private triggerImpactFeedback(critical: boolean): void {
    const intensity = this.options.intensity === "reduced" ? 0.65 : 1;
    const flashIntensity = Phaser.Math.Clamp(this.options.flashIntensity ?? 0, 0, 1);

    if (this.options.screenShakeEnabled) {
      const shakeDuration = Math.round((critical ? 110 : 70) * intensity);
      const shakeStrength = (critical ? 0.008 : 0.004) * intensity;
      this.scene.cameras.main.shake(shakeDuration, shakeStrength, false);
    }

    if (flashIntensity > 0) {
      const flashDuration = Math.max(20, Math.round((critical ? 100 : 55) * intensity * flashIntensity));
      this.scene.cameras.main.flash(flashDuration, 255, 255, 255, false);
    }
  }

  private restoreProtectedLastVfx(): void {
    if (!this.protectedLastVfx) {
      return;
    }

    if (this.scene.time.now <= this.protectedLastVfx.expiresAt) {
      this.canvas.dataset.lastVfx = this.protectedLastVfx.value;
      return;
    }

    this.protectedLastVfx = undefined;
  }

  private getParticleCount(definition: VfxDefinition): number {
    return this.options.intensity === "reduced"
      ? Math.max(1, Math.ceil(definition.particleCount * 0.55))
      : definition.particleCount;
  }

  private getParticleLifespan(definition: VfxDefinition): number {
    return this.options.intensity === "reduced"
      ? Math.max(80, Math.round(definition.lifespanMs * 0.65))
      : definition.lifespanMs;
  }

  private ensureParticleTexture(): void {
    if (this.scene.textures.exists(particleTextureKey)) {
      return;
    }

    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(4, 4, 4);
    graphics.fillStyle(0xffffff, 0.5);
    graphics.fillCircle(4, 4, 2);
    graphics.generateTexture(particleTextureKey, 8, 8);
    graphics.destroy();
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
    this.canvas.dataset.screenShakeEnabled = String(Boolean(this.options.screenShakeEnabled));
    this.canvas.dataset.flashIntensity = (this.options.flashIntensity ?? 0).toFixed(2);
  }
}
