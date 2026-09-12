import Phaser from "phaser";
import type { CharacterData } from "../types/gameState";
import { EntityPresentationController } from "../presentation/EntityPresentationController";
import { getAttackAnimationKey } from "../presentation/attackAnimations";
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
  Archer: "player-archer",
  Mage: "player-mage",
  Swordsman: "player-swordsman",
  Thief: "player-thief",
} as const;

export function getPlayerTextureKey(archetype: string): string {
  return `player-${archetype}`;
}

export const PLAYER_SPEED = 220;

export class PlayerEntity {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly character: CharacterData;
  readonly speed = PLAYER_SPEED;
  readonly presentation: EntityPresentationController;

  direction: PlayerDirection = "down";
  motionState: PlayerMotionState = "idle";
  animationState: PlayerAnimationState = "idle-down";
  destination: Vector2Like | null = null;
  path: Vector2Like[] = [];

  constructor(scene: Phaser.Scene, character: CharacterData, position: Vector2Like) {
    this.character = character;
    this.sprite = scene.physics.add.sprite(position.x, position.y, this.getAvailableTextureKey(scene));
    this.sprite.setName("player");
    this.sprite.setDepth(20);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.body?.setSize(24, 28);
    this.sprite.body?.setOffset(12, 20);
    this.createClassAnimations(scene);
    this.presentation = new EntityPresentationController(scene, this.sprite, {
      textureKey: this.getAvailableTextureKey(scene),
      attackAnimationKey: getAttackAnimationKey(this.getAvailableArchetype(scene)),
      depthOffset: 1,
      idlePhase: Math.random() * Math.PI * 2,
    });
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
    this.presentation.syncVisualTransform();
  }

  setDestination(destination: Vector2Like): void {
    this.destination = { ...destination };
    this.path = [];
  }

  setPath(path: Vector2Like[]): void {
    const [, ...remainingPath] = path;

    this.path = remainingPath.map((point) => ({ ...point }));
    this.destination = this.path.shift() ?? null;
  }

  clearDestination(): void {
    this.destination = null;
    this.path = [];
  }

  update(deltaMs: number): void {
    const step = moveToward(this.position, this.destination, this.speed, deltaMs / 1000, this.direction);

    this.setPosition(step.position);
    this.direction = step.direction;
    this.motionState = step.motionState;
    this.animationState = step.animationState;

    if (step.reachedDestination) {
      this.destination = this.path.shift() ?? null;
    }

    this.applyAnimationState();
    this.presentation.update(deltaMs, this.motionState, this.direction);
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

  playDeath(): void {
    this.presentation.playDeath();
  }

  destroy(): void {
    this.presentation.destroy();
    this.sprite.destroy();
  }

  private createClassAnimations(scene: Phaser.Scene): void {
    const textureKey = this.getAvailableTextureKey(scene);

    for (const state of playerAnimationStates) {
      if (scene.anims.exists(state)) {
        scene.anims.remove(state);
      }

      scene.anims.create({
        key: state,
        frames: [{ key: textureKey }],
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

  private getAvailableTextureKey(scene: Phaser.Scene): string {
    return getPlayerTextureKey(this.getAvailableArchetype(scene));
  }

  /** The archetype actually rendered, falling back to the swordsman sprite. */
  private getAvailableArchetype(scene: Phaser.Scene): string {
    return scene.textures.exists(getPlayerTextureKey(this.character.archetype))
      ? this.character.archetype
      : "swordsman";
  }
}
