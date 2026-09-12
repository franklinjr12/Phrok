import Phaser from "phaser";

export type AttackSheetDefinition = {
  /** File name inside `assets/sprites/animations`. */
  fileName: string;
  frameWidth: number;
  frameHeight: number;
  /**
   * Per-frame hold times. Phaser uses a frame's own duration in place of the
   * animation's `msPerFrame`, so these are the exact on-screen timings.
   */
  frameDurationsMs: readonly number[];
};

/**
 * Attack sheets are produced by `scripts/build_attack_spritesheet.py` from the
 * hand-authored art in `assets/sprites/animations`. The script scales each sheet
 * so the character matches the class's idle sprite and centres every frame on the
 * same anchor, which is why the game can swap textures without touching origins.
 */
export const attackSheetDefinitions: Record<string, AttackSheetDefinition> = {
  swordsman: {
    fileName: "swordsman-attack.png",
    frameWidth: 92,
    frameHeight: 62,
    // Damage resolves the moment the swing starts, so the windup is kept short
    // (the slash lands 180ms in) and the hold sits on the impact frame and its
    // trailing arc. The 410ms total stays well inside the melee cooldown, so
    // consecutive swings never clip each other.
    frameDurationsMs: [30, 35, 35, 40, 40, 95, 75, 60],
  },
};

export function getAttackTextureKey(archetype: string): string {
  return `player-${archetype}-attack`;
}

export function getAttackAnimationKey(archetype: string): string {
  return `attack-${archetype}`;
}

export function getAttackSheet(archetype: string): AttackSheetDefinition | undefined {
  return attackSheetDefinitions[archetype];
}

export function getAttackDurationMs(archetype: string): number {
  return getAttackSheet(archetype)?.frameDurationsMs.reduce((total, frame) => total + frame, 0) ?? 0;
}

/** Registers every attack animation whose spritesheet finished loading. */
export function createAttackAnimations(scene: Phaser.Scene): void {
  for (const [archetype, sheet] of Object.entries(attackSheetDefinitions)) {
    const textureKey = getAttackTextureKey(archetype);
    const animationKey = getAttackAnimationKey(archetype);

    if (!scene.textures.exists(textureKey) || scene.anims.exists(animationKey)) {
      continue;
    }

    scene.anims.create({
      key: animationKey,
      frames: sheet.frameDurationsMs.map((duration, index) => ({
        key: textureKey,
        frame: index,
        duration,
      })),
      duration: getAttackDurationMs(archetype),
      repeat: 0,
    });
  }
}
