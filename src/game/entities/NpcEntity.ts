import Phaser from "phaser";
import type { NpcDefinition } from "../types/dataDefinitions";
import type { Vector2Like } from "./playerMovement";

export const NpcTextureKeys = {
  TownService: "npc-town-service",
} as const;

export function getNpcTextureKey(npcId: string): string {
  return `npc-${npcId}`;
}

export class NpcEntity {
  private static readonly clickPadding = 8;

  readonly sprite: Phaser.GameObjects.Sprite;
  readonly nameLabel: Phaser.GameObjects.Text;
  readonly interactionRadius: number;
  private readonly interactionHighlight: Phaser.GameObjects.Ellipse;
  private interactionTween?: Phaser.Tweens.Tween;

  constructor(
    scene: Phaser.Scene,
    readonly definition: NpcDefinition,
    position: Vector2Like,
  ) {
    this.interactionRadius = definition.interactionRadius;
    const textureKey = scene.textures.exists(getNpcTextureKey(definition.id))
      ? getNpcTextureKey(definition.id)
      : NpcTextureKeys.TownService;

    this.interactionHighlight = scene.add.ellipse(position.x, position.y + 16, 58, 24, 0x38bdf8, 0.12)
      .setStrokeStyle(2, 0x7dd3fc, 0.8)
      .setDepth(14)
      .setVisible(false);

    this.sprite = scene.add.sprite(position.x, position.y, textureKey)
      .setName(definition.id)
      .setDepth(18)
      .setInteractive({ useHandCursor: true });
    this.sprite.on(Phaser.Input.Events.POINTER_OVER, () => this.setHovered(true));
    this.sprite.on(Phaser.Input.Events.POINTER_OUT, () => this.setHovered(false));
    this.nameLabel = scene.add.text(position.x, position.y - 34, definition.name, {
      color: "#f8fafc",
      fontFamily: "Arial, sans-serif",
      fontSize: "12px",
    })
      .setOrigin(0.5)
      .setDepth(19);
  }

  get id(): string {
    return this.definition.id;
  }

  get name(): string {
    return this.definition.name;
  }

  get dialogueId(): string {
    return this.definition.dialogueId;
  }

  get serviceType(): string {
    return this.definition.serviceType;
  }

  get position(): Vector2Like {
    return {
      x: this.sprite.x,
      y: this.sprite.y,
    };
  }

  containsPoint(x: number, y: number): boolean {
    const clickBounds = Phaser.Geom.Rectangle.Inflate(this.sprite.getBounds(), NpcEntity.clickPadding, NpcEntity.clickPadding);
    return clickBounds.contains(x, y) || this.nameLabel.getBounds().contains(x, y);
  }

  pulseInteraction(): void {
    this.interactionTween?.stop();
    this.interactionHighlight.setVisible(true).setAlpha(0.8).setScale(0.86);
    this.interactionTween = this.sprite.scene.tweens.add({
      targets: this.interactionHighlight,
      alpha: 0,
      scale: 1.3,
      duration: 260,
      ease: "Sine.easeOut",
      onComplete: () => {
        this.interactionHighlight.setVisible(false);
        this.interactionTween = undefined;
      },
    });
  }

  destroy(): void {
    this.interactionTween?.stop();
    this.interactionHighlight.destroy();
    this.nameLabel.destroy();
    this.sprite.destroy();
  }

  private setHovered(hovered: boolean): void {
    if (this.interactionTween?.isPlaying()) return;
    this.interactionHighlight.setVisible(hovered).setAlpha(hovered ? 0.34 : 0);
    this.sprite.setScale(hovered ? 1.04 : 1);
  }
}
