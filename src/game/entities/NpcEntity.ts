import Phaser from "phaser";
import type { NpcDefinition } from "../types/dataDefinitions";
import type { Vector2Like } from "./playerMovement";

export const NpcTextureKeys = {
  TownService: "npc-town-service",
} as const;

export class NpcEntity {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly nameLabel: Phaser.GameObjects.Text;
  readonly interactionRadius: number;

  constructor(
    scene: Phaser.Scene,
    readonly definition: NpcDefinition,
    position: Vector2Like,
  ) {
    this.interactionRadius = definition.interactionRadius;
    this.sprite = scene.add.sprite(position.x, position.y, NpcTextureKeys.TownService)
      .setName(definition.id)
      .setDepth(18)
      .setInteractive({ useHandCursor: true });
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
    return this.sprite.getBounds().contains(x, y)
      || this.nameLabel.getBounds().contains(x, y)
      || Phaser.Math.Distance.Between(x, y, this.sprite.x, this.sprite.y) <= this.interactionRadius;
  }
}
