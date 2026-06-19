import Phaser from "phaser";
import type { MonsterDefinition } from "../types/dataDefinitions";

export const EnemyTextureKeys = {
  GreenJellyPlaceholder: "enemy-green-jelly-placeholder",
} as const;

export type EnemyBehaviorMode = "idle" | "chasing" | "attacking" | "dead";

export interface EnemyTargetingState {
  selected: boolean;
  targetId: string | null;
}

export class EnemyEntity {
  readonly id: string;
  readonly name: string;
  readonly level: number;
  readonly maxHp: number;
  readonly stats: {
    attack: number;
    defense: number;
  };
  readonly sprite: Phaser.Physics.Arcade.Sprite;

  hp: number;
  behaviorMode: EnemyBehaviorMode = "idle";
  targetingState: EnemyTargetingState = {
    selected: false,
    targetId: null,
  };

  private readonly highlight: Phaser.GameObjects.Ellipse;
  private readonly hpBarBackground: Phaser.GameObjects.Rectangle;
  private readonly hpBarFill: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, monster: MonsterDefinition, position: Phaser.Math.Vector2) {
    this.id = monster.id;
    this.name = monster.name;
    this.level = monster.level;
    this.maxHp = monster.hp;
    this.hp = monster.hp;
    this.stats = {
      attack: monster.attack,
      defense: monster.defense,
    };

    this.highlight = scene.add.ellipse(position.x, position.y + 15, 56, 24, 0xfacc15, 0.22)
      .setStrokeStyle(2, 0xfef08a, 0.9)
      .setDepth(14)
      .setVisible(false);
    this.sprite = scene.physics.add.sprite(position.x, position.y, EnemyTextureKeys.GreenJellyPlaceholder);
    this.sprite.setName(this.id);
    this.sprite.setDepth(18);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setInteractive({ useHandCursor: true });
    this.sprite.body?.setSize(34, 24);
    this.sprite.body?.setOffset(7, 20);

    this.hpBarBackground = scene.add.rectangle(position.x, position.y - 34, 44, 6, 0x111827, 0.85)
      .setDepth(21);
    this.hpBarFill = scene.add.rectangle(position.x - 21, position.y - 34, 42, 4, 0x22c55e, 1)
      .setOrigin(0, 0.5)
      .setDepth(22);
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
    this.highlight.setVisible(selected && this.isAlive);
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);

    if (this.hp === 0) {
      this.die();
      return;
    }

    this.syncVisuals();
  }

  destroy(): void {
    this.highlight.destroy();
    this.hpBarBackground.destroy();
    this.hpBarFill.destroy();
    this.sprite.destroy();
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
    this.sprite.disableBody(true, true);
  }

  private syncVisuals(): void {
    this.highlight.setPosition(this.sprite.x, this.sprite.y + 15);
    this.hpBarBackground.setPosition(this.sprite.x, this.sprite.y - 34);
    this.hpBarFill.setPosition(this.sprite.x - 21, this.sprite.y - 34);
    this.hpBarFill.displayWidth = Math.max(0, 42 * (this.hp / this.maxHp));
  }
}
