import Phaser from "phaser";
import type { CharacterData } from "../types/gameState";
import {
  getAnimationState,
  moveToward,
  playerAnimationStates,
  type PlayerAnimationState,
  type PlayerDirection,
  type PlayerMotionState,
  type Vector2Like,
} from "./playerMovement";

export const PlayerTextureKeys = {
  Placeholder: "player-placeholder",
} as const;

export const PLAYER_SPEED = 220;

export class PlayerEntity {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly character: CharacterData;
  readonly speed = PLAYER_SPEED;

  direction: PlayerDirection = "down";
  motionState: PlayerMotionState = "idle";
  animationState: PlayerAnimationState = "idle-down";
  destination: Vector2Like | null = null;

  constructor(scene: Phaser.Scene, character: CharacterData, position: Vector2Like) {
    this.character = character;
    this.sprite = scene.physics.add.sprite(position.x, position.y, PlayerTextureKeys.Placeholder);
    this.sprite.setName("player");
    this.sprite.setDepth(20);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.body?.setSize(24, 28);
    this.sprite.body?.setOffset(12, 20);
    this.createPlaceholderAnimations(scene);
    this.applyAnimationState();
  }

  get position(): Vector2Like {
    return {
      x: this.sprite.x,
      y: this.sprite.y,
    };
  }

  setPosition(position: Vector2Like): void {
    this.sprite.setPosition(position.x, position.y);
  }

  setDestination(destination: Vector2Like): void {
    this.destination = { ...destination };
  }

  clearDestination(): void {
    this.destination = null;
  }

  update(deltaMs: number): void {
    const step = moveToward(this.position, this.destination, this.speed, deltaMs / 1000, this.direction);

    this.setPosition(step.position);
    this.direction = step.direction;
    this.motionState = step.motionState;
    this.animationState = step.animationState;

    if (step.reachedDestination) {
      this.clearDestination();
    }

    this.applyAnimationState();
  }

  private createPlaceholderAnimations(scene: Phaser.Scene): void {
    for (const state of playerAnimationStates) {
      if (scene.anims.exists(state)) {
        continue;
      }

      scene.anims.create({
        key: state,
        frames: [{ key: PlayerTextureKeys.Placeholder }],
        frameRate: 1,
        repeat: -1,
      });
    }
  }

  private applyAnimationState(): void {
    const expectedState = getAnimationState(this.motionState, this.direction);
    this.animationState = expectedState;
    this.sprite.setData("direction", this.direction);
    this.sprite.setData("motionState", this.motionState);
    this.sprite.setData("animationState", expectedState);
    this.sprite.anims.play(expectedState, true);
  }
}
