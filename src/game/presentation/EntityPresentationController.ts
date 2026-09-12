import Phaser from "phaser";
import type { PlayerDirection, PlayerMotionState } from "../entities/playerMovement";

export type PresentationDirection = PlayerDirection | "none";

export type PresentationControllerOptions = {
  textureKey: string;
  depthOffset?: number;
  idlePhase?: number;
  idleAmplitude?: number;
  /**
   * Animation played by `playAttack`. The animation's frames must be centred on
   * the same anchor as `textureKey` so the entity does not shift when it starts.
   */
  attackAnimationKey?: string;
};

/**
 * Owns visual-only transforms for an entity.
 *
 * The logical sprite remains the physics/collision object. The controller
 * renders a sibling sprite and only changes that sibling's transform, so a
 * bob, recoil, or lunge can never move the gameplay position.
 */
export class EntityPresentationController {
  readonly visualSprite: Phaser.GameObjects.Sprite;

  private readonly scene: Phaser.Scene;
  private readonly logicalSprite: Phaser.GameObjects.Sprite;
  private readonly baseTextureKey: string;
  private readonly attackAnimationKey?: string;
  private readonly idlePhase: number;
  private readonly idleAmplitude: number;
  private readonly offset = { x: 0, y: 0 };
  private actionTween?: Phaser.Tweens.Tween;
  private elapsedMs = 0;
  private hovered = false;
  private destroyed = false;
  private attackPlaying = false;

  constructor(
    scene: Phaser.Scene,
    logicalSprite: Phaser.GameObjects.Sprite,
    options: PresentationControllerOptions,
  ) {
    this.scene = scene;
    this.logicalSprite = logicalSprite;
    this.baseTextureKey = options.textureKey;
    this.attackAnimationKey = options.attackAnimationKey;
    this.idlePhase = options.idlePhase ?? Math.random() * Math.PI * 2;
    this.idleAmplitude = options.idleAmplitude ?? 1;
    this.visualSprite = scene.add.sprite(logicalSprite.x, logicalSprite.y, options.textureKey)
      .setOrigin(logicalSprite.originX, logicalSprite.originY)
      .setDepth((logicalSprite.depth ?? 0) + (options.depthOffset ?? 1))
      .setData("presentationLayer", true);

    // Keep the logical object available for input and physics, but render the
    // presentation sibling instead.
    logicalSprite.setAlpha(0);
    this.syncVisualTransform();
  }

  update(deltaMs: number, motionState: PlayerMotionState = "idle", direction: PresentationDirection = "none"): void {
    if (this.destroyed) return;

    this.elapsedMs += deltaMs;
    const moving = motionState === "walk";
    const bobAmplitude = (moving ? 2.1 : 0.8) * this.idleAmplitude;
    const bobSpeed = moving ? 0.022 : 0.0018;
    const bob = Math.sin(this.elapsedMs * bobSpeed + this.idlePhase) * bobAmplitude;
    const rhythm = Math.sin(this.elapsedMs * (moving ? 0.044 : 0.0018) + this.idlePhase) * (moving ? 0.018 : 0.012);
    const baseScale = this.hovered ? 1.05 : 1;

    this.visualSprite.setFlipX(direction === "left");
    this.visualSprite.setData("presentationDirection", direction);
    this.visualSprite.setData("presentationMotion", motionState);

    if (this.attackPlaying) {
      // The swing itself carries the motion, so hold the idle squash flat and
      // only keep the entity following its logical position.
      this.visualSprite.setScale(baseScale);
      this.visualSprite.setRotation(0);
      this.visualSprite.setPosition(
        this.logicalSprite.x + this.offset.x,
        this.logicalSprite.y + this.offset.y,
      );
    } else if (!this.actionTween?.isPlaying()) {
      this.visualSprite.setScale(baseScale * (1 + rhythm), baseScale * (1 - rhythm));
      this.visualSprite.setRotation(0);
      this.visualSprite.setPosition(
        this.logicalSprite.x + this.offset.x,
        this.logicalSprite.y + this.offset.y + bob,
      );
    } else {
      this.syncVisualTransform();
    }
  }

  /** Texture and animation frame currently rendered, for world diagnostics. */
  get renderedFrame(): string {
    const frame = this.attackPlaying ? this.visualSprite.anims.currentFrame?.index ?? 0 : 0;

    return `${this.visualSprite.texture.key}:${frame}`;
  }

  syncVisualTransform(): void {
    if (this.destroyed) return;
    this.visualSprite.setPosition(
      this.logicalSprite.x + this.offset.x,
      this.logicalSprite.y + this.offset.y,
    );
  }

  playLunge(deltaX: number, deltaY: number, durationMs = 135): void {
    if (this.destroyed) return;
    this.stopActionTween();
    this.offset.x = 0;
    this.offset.y = 0;
    this.actionTween = this.scene.tweens.add({
      targets: this.offset,
      x: deltaX,
      y: deltaY,
      duration: Math.max(1, Math.round(durationMs * 0.4)),
      ease: "Sine.easeOut",
      yoyo: true,
      hold: Math.max(0, Math.round(durationMs * 0.18)),
      onUpdate: () => this.syncVisualTransform(),
      onComplete: () => {
        this.offset.x = 0;
        this.offset.y = 0;
        this.actionTween = undefined;
        this.syncVisualTransform();
      },
    });
  }

  playAttack(): void {
    if (this.destroyed) return;
    this.stopAction();

    if (this.attackAnimationKey && this.scene.anims.exists(this.attackAnimationKey)) {
      this.attackPlaying = true;
      this.visualSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.restoreBaseTexture());
      // Restart rather than ignore, so a fresh swing always replays from frame one.
      this.visualSprite.anims.play(this.attackAnimationKey);
      return;
    }

    this.actionTween = this.scene.tweens.add({
      targets: this.visualSprite,
      scaleX: 1.08,
      scaleY: 0.94,
      duration: 65,
      yoyo: true,
      ease: "Sine.easeOut",
      onComplete: () => {
        this.actionTween = undefined;
        this.visualSprite.setScale(1, 1);
      },
    });
  }

  playCast(): void {
    if (this.destroyed) return;
    this.stopAction();
    this.actionTween = this.scene.tweens.add({
      targets: this.visualSprite,
      scaleX: 1.06,
      scaleY: 1.06,
      duration: 220,
      yoyo: true,
      repeat: 1,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.actionTween = undefined;
        this.visualSprite.setScale(1, 1);
      },
    });
  }

  playHurt(): void {
    if (this.destroyed) return;
    this.stopAction();
    this.visualSprite.setTint(0xffb4b4);
    this.offset.x = -5;
    this.actionTween = this.scene.tweens.add({
      targets: this.offset,
      x: 0,
      duration: 105,
      yoyo: true,
      ease: "Sine.easeOut",
      onUpdate: () => this.syncVisualTransform(),
      onComplete: () => {
        this.offset.x = 0;
        this.actionTween = undefined;
        this.visualSprite.clearTint();
        this.syncVisualTransform();
      },
    });
  }

  playDeath(): void {
    if (this.destroyed) return;
    this.stopAction();
    this.actionTween = this.scene.tweens.add({
      targets: this.visualSprite,
      angle: 82,
      scaleX: 0.72,
      scaleY: 0.72,
      alpha: 0,
      duration: 320,
      ease: "Cubic.easeIn",
      onComplete: () => { this.actionTween = undefined; },
    });
  }

  playSpawn(): void {
    if (this.destroyed) return;
    this.stopAction();
    this.visualSprite.setAlpha(0).setScale(0.72).setAngle(0);
    this.actionTween = this.scene.tweens.add({
      targets: this.visualSprite,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 260,
      ease: "Back.easeOut",
      onComplete: () => { this.actionTween = undefined; },
    });
  }

  setHovered(hovered: boolean): void {
    if (this.destroyed) return;
    this.hovered = hovered;
    this.visualSprite.setAlpha(hovered ? 1 : 0.96);
    this.visualSprite.setScale(hovered ? 1.05 : 1);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stopAction();
    this.visualSprite.destroy();
  }

  private stopAction(): void {
    this.restoreBaseTexture();
    this.stopActionTween();
  }

  /**
   * Resets the tweened transform without touching a running attack animation, so
   * a lunge can carry the swing forward instead of cutting it short.
   */
  private stopActionTween(): void {
    this.actionTween?.stop();
    this.actionTween = undefined;
    this.offset.x = 0;
    this.offset.y = 0;
    this.visualSprite.setRotation(0).setScale(1, 1).setAlpha(1).clearTint();
    this.syncVisualTransform();
  }

  /** Ends any running attack animation and returns the sprite to its idle frame. */
  private restoreBaseTexture(): void {
    if (!this.attackPlaying) return;
    this.attackPlaying = false;
    this.visualSprite.off(Phaser.Animations.Events.ANIMATION_COMPLETE);
    this.visualSprite.anims.stop();
    this.visualSprite.setTexture(this.baseTextureKey);
  }
}
