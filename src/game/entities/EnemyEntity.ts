import Phaser from "phaser";
import type { MonsterDefinition } from "../types/dataDefinitions";
import type { ActiveStatusEffect } from "../types/gameState";
import { EntityPresentationController } from "../presentation/EntityPresentationController";

export const EnemyTextureKeys = {
  GreenJellyFallback: "enemy-green-jelly",
} as const;

export function getEnemyTextureKey(monsterId: string): string {
  return `enemy-${monsterId}`;
}

export type EnemyBehaviorMode = "idle" | "chasing" | "attacking" | "casting" | "returning" | "dead";
export type BossPhase = 1 | 2 | 3;

export const bossProtocol = {
  controlResistance: 0.85,
  knockbackResistance: 0.9,
  stealthDetectionRangeMultiplier: 1.5,
  leashAreaMultiplier: 1.75,
} as const;

export interface EnemyTargetingState {
  selected: boolean;
  targetId: string | null;
}

export class EnemyEntity {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly maxHp: number;
  readonly behavior: MonsterDefinition["behavior"];
  readonly aggroRange: number;
  readonly attackRange: number;
  readonly leashDistance: number;
  readonly leashTimeoutMs: number;
  readonly baseLeashDistance: number;
  readonly bossProtocolEnabled: boolean;
  readonly assistRadius: number;
  readonly castRange: number;
  readonly castCooldownMs: number;
  readonly respawnMs: number;
  readonly elite: boolean;
  readonly boss: boolean;
  readonly stats: {
    attack: number;
    defense: number;
  };
  readonly textureKey: string;
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly presentation: EntityPresentationController;

  hp: number;
  bossPhase: BossPhase = 1;
  statusEffects: ActiveStatusEffect[] = [];
  behaviorMode: EnemyBehaviorMode = "idle";
  targetingState: EnemyTargetingState = {
    selected: false,
    targetId: null,
  };

  private readonly highlight: Phaser.GameObjects.Ellipse;
  private readonly hpBarBackground: Phaser.GameObjects.Rectangle;
  private readonly hpBarFill: Phaser.GameObjects.Rectangle;
  private readonly castTelegraph: Phaser.GameObjects.Ellipse;
  private readonly castBarBackground: Phaser.GameObjects.Rectangle;
  private readonly castBarFill: Phaser.GameObjects.Rectangle;
  private readonly traitMarker?: Phaser.GameObjects.Text;
  private selectionTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, monster: MonsterDefinition, position: Phaser.Math.Vector2) {
    this.id = monster.id;
    this.name = monster.name;
    this.level = monster.level;
    this.behavior = monster.behavior;
    this.aggroRange = monster.aggroRange;
    this.attackRange = monster.attackRange;
    this.baseLeashDistance = monster.leashDistance;
    this.bossProtocolEnabled = monster.boss;
    this.leashDistance = monster.boss
      ? Math.ceil(monster.leashDistance * bossProtocol.leashAreaMultiplier)
      : monster.leashDistance;
    this.leashTimeoutMs = monster.leashTimeoutMs;
    this.assistRadius = monster.assistRadius;
    this.castRange = monster.castRange;
    this.castCooldownMs = monster.castCooldownMs;
    this.respawnMs = monster.respawnMs;
    this.elite = monster.elite;
    this.boss = monster.boss;
    const statMultiplier = monster.boss ? 2.4 : monster.elite ? 1.7 : 1;
    this.maxHp = Math.ceil(monster.hp * statMultiplier);
    this.hp = this.maxHp;
    this.stats = {
      attack: Math.ceil(monster.attack * (monster.boss ? 1.8 : monster.elite ? 1.4 : 1)),
      defense: Math.ceil(monster.defense * (monster.boss ? 1.6 : monster.elite ? 1.3 : 1)),
    };

    this.textureKey = this.getAvailableTextureKey(scene, monster.spriteMonsterId || monster.id);

    this.highlight = scene.add.ellipse(position.x, position.y + 15, 56, 24, 0xfacc15, 0.22)
      .setStrokeStyle(2, 0xfef08a, 0.9)
      .setDepth(14)
      .setVisible(false);
    this.sprite = scene.physics.add.sprite(position.x, position.y, this.textureKey);
    this.sprite.setName(this.id);
    this.sprite.setDepth(18);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setInteractive({ useHandCursor: true });
    this.sprite.body?.setSize(34, 24);
    this.sprite.body?.setOffset(7, 20);
    if (monster.visualTint) {
      this.sprite.setTint(monster.visualTint);
    }
    if (monster.visualScale && monster.visualScale !== 1) {
      this.sprite.setScale(monster.visualScale);
    }
    this.presentation = new EntityPresentationController(scene, this.sprite, {
      textureKey: this.textureKey,
      depthOffset: 1,
      idlePhase: Math.random() * Math.PI * 2,
      idleAmplitude: 0.82 + Math.random() * 0.36,
    });
    this.sprite.on(Phaser.Input.Events.POINTER_OVER, () => this.presentation.setHovered(true));
    this.sprite.on(Phaser.Input.Events.POINTER_OUT, () => this.presentation.setHovered(false));

    this.hpBarBackground = scene.add.rectangle(position.x, position.y - 34, 44, 6, 0x111827, 0.85)
      .setDepth(21);
    this.hpBarFill = scene.add.rectangle(position.x - 21, position.y - 34, 42, 4, 0x22c55e, 1)
      .setOrigin(0, 0.5)
      .setDepth(22);
    this.castTelegraph = scene.add.ellipse(position.x, position.y + 15, 76, 36, 0x38bdf8, 0.18)
      .setStrokeStyle(2, 0x7dd3fc, 0.9)
      .setDepth(13)
      .setVisible(false);
    this.castBarBackground = scene.add.rectangle(position.x, position.y - 44, 46, 5, 0x0f172a, 0.85)
      .setDepth(23)
      .setVisible(false);
    this.castBarFill = scene.add.rectangle(position.x - 22, position.y - 44, 0, 3, 0x7dd3fc, 1)
      .setOrigin(0, 0.5)
      .setDepth(24)
      .setVisible(false);
    if (monster.elite || monster.boss || monster.rareVariant) {
      this.traitMarker = scene.add.text(position.x, position.y - 52, monster.boss ? "BOSS" : monster.rareVariant ? "RARE" : "ELITE", {
        color: monster.boss ? "#fca5a5" : monster.rareVariant ? "#e0f2fe" : "#fde68a",
        fontFamily: "Arial, sans-serif",
        fontSize: monster.boss ? "11px" : "10px",
      })
        .setOrigin(0.5)
        .setDepth(23);
    }
    this.syncVisuals();
  }

  get position(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(this.sprite.x, this.sprite.y);
  }

  get isAlive(): boolean {
    return this.hp > 0;
  }

  setSelected(selected: boolean, targetId: string | null): void {
    this.targetingState = {
      selected,
      targetId,
    };
    this.selectionTween?.stop();
    this.highlight.setVisible(selected && this.isAlive);
    this.highlight.setScale(1);
    if (selected && this.isAlive) {
      this.selectionTween = this.sprite.scene.tweens.add({
        targets: this.highlight,
        scaleX: 1.12,
        scaleY: 1.12,
        duration: 420,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  takeDamage(amount: number): void {
    if (amount <= 0 || !this.isAlive) {
      return;
    }
    this.hp = Math.max(0, this.hp - amount);
    this.bossPhase = this.getBossPhase();

    if (this.hp === 0) {
      this.presentation.playDeath();
      this.die();
      return;
    }

    this.presentation.playHurt();
    this.syncVisuals();
  }

  updatePresentation(deltaMs: number): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body | null;
    const velocityX = body?.velocity.x ?? 0;
    const velocityY = body?.velocity.y ?? 0;
    const motion = Math.abs(velocityX) + Math.abs(velocityY) > 1 ? "walk" : "idle";
    const direction = Math.abs(velocityX) > 1 ? (velocityX < 0 ? "left" : "right") : "none";
    this.presentation.update(deltaMs, motion, direction);
  }

  playLunge(deltaX: number, deltaY: number): void {
    this.presentation.playLunge(deltaX, deltaY);
  }

  playAttack(): void {
    this.presentation.playAttack();
  }

  playCast(): void {
    this.presentation.playCast();
  }

  playHurt(): void {
    this.presentation.playHurt();
  }

  playSpawn(): void {
    this.presentation.playSpawn();
  }

  destroy(): void {
    this.selectionTween?.stop();
    this.presentation.destroy();
    this.highlight.destroy();
    this.hpBarBackground.destroy();
    this.hpBarFill.destroy();
    this.castTelegraph.destroy();
    this.castBarBackground.destroy();
    this.castBarFill.destroy();
    this.traitMarker?.destroy();
    this.sprite.destroy();
  }

  setCastProgress(progress: number | null): void {
    const visible = progress !== null && this.isAlive;
    const clampedProgress = Phaser.Math.Clamp(progress ?? 0, 0, 1);

    this.castTelegraph.setVisible(visible);
    this.castBarBackground.setVisible(visible);
    this.castBarFill
      .setVisible(visible)
      .setDisplaySize(44 * clampedProgress, 3);

    if (visible) {
      this.castTelegraph.setAlpha(0.14 + clampedProgress * 0.18);
    }
  }

  updateVisuals(): void {
    this.syncVisuals();
  }

  getControlDurationMultiplier(): number {
    return this.bossProtocolEnabled ? 1 - bossProtocol.controlResistance : 1;
  }

  getKnockbackDistance(distance: number): number {
    return this.bossProtocolEnabled
      ? distance * (1 - bossProtocol.knockbackResistance)
      : distance;
  }

  detectsStealth(distanceToTarget: number, baseDetectionRange: number): boolean {
    return this.bossProtocolEnabled && distanceToTarget <= baseDetectionRange * bossProtocol.stealthDetectionRangeMultiplier;
  }

  private die(): void {
    this.behaviorMode = "dead";
    this.targetingState = {
      selected: false,
      targetId: null,
    };
    this.highlight.setVisible(false);
    this.hpBarBackground.setVisible(false);
    this.hpBarFill.setVisible(false);
    this.setCastProgress(null);
    this.traitMarker?.setVisible(false);
    this.sprite.disableBody(true, true);
  }

  private syncVisuals(): void {
    this.highlight.setPosition(this.sprite.x, this.sprite.y + 15);
    this.hpBarBackground.setPosition(this.sprite.x, this.sprite.y - 34);
    this.hpBarFill.setPosition(this.sprite.x - 21, this.sprite.y - 34);
    this.castTelegraph.setPosition(this.sprite.x, this.sprite.y + 15);
    this.castBarBackground.setPosition(this.sprite.x, this.sprite.y - 44);
    this.castBarFill.setPosition(this.sprite.x - 22, this.sprite.y - 44);
    this.traitMarker?.setPosition(this.sprite.x, this.sprite.y - 52);
    this.hpBarFill.displayWidth = Math.max(0, 42 * (this.hp / this.maxHp));
  }

  private getBossPhase(): BossPhase {
    if (!this.bossProtocolEnabled) {
      return 1;
    }

    const hpRatio = this.hp / this.maxHp;

    if (hpRatio <= 0.25) {
      return 3;
    }

    if (hpRatio <= 0.5) {
      return 2;
    }

    return 1;
  }

  private getAvailableTextureKey(scene: Phaser.Scene, monsterId: string): string {
    const textureKey = getEnemyTextureKey(monsterId);

    return scene.textures.exists(textureKey)
      ? textureKey
      : EnemyTextureKeys.GreenJellyFallback;
  }
}
