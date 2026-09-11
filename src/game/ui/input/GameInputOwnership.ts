import type Phaser from "phaser";

/** The subsystem currently entitled to exclusive game input, if any. */
export type InputOwner =
  | "world"
  | "ordinary-window"
  | "modal"
  | "dialogue"
  | "text-entry"
  | "skill-targeting"
  | "game-over";

export const gameInputOwnershipRegistryKey = "gameInputOwnership";

type PointerCapturePredicate = (pointer: Phaser.Input.Pointer) => boolean;

/**
 * Shared, intentionally small input-routing boundary between world and UI scenes.
 * It owns no gameplay state: it only answers which layer may receive an input.
 */
export class GameInputOwnership {
  private pointerCapture?: PointerCapturePredicate;
  private windowOwner: "world" | "ordinary-window" | "modal" = "world";

  constructor(private owner: InputOwner = "world") {}

  get current(): InputOwner { return this.owner; }

  set(owner: InputOwner): void { this.owner = owner; }

  /** Updates window state without displacing a dialogue, targeting, or game-over lock. */
  setWindowOwner(owner: "world" | "ordinary-window" | "modal"): void {
    this.windowOwner = owner;
    if (this.owner === "world" || this.owner === "ordinary-window" || this.owner === "modal") {
      this.owner = owner;
    }
  }

  restoreWindowOwner(): void { this.owner = this.windowOwner; }

  setPointerCapture(predicate: PointerCapturePredicate | undefined): void {
    this.pointerCapture = predicate;
  }

  blocksGameplay(): boolean {
    return this.owner === "modal"
      || this.owner === "dialogue"
      || this.owner === "text-entry"
      || this.owner === "skill-targeting"
      || this.owner === "game-over";
  }

  allowsWorldPointer(pointer: Phaser.Input.Pointer): boolean {
    return !this.blocksGameplay() && !this.pointerCapture?.(pointer);
  }

  allowsGameplayKeyboard(): boolean { return !this.blocksGameplay(); }

  cancelSkillTargeting(): boolean {
    if (this.owner !== "skill-targeting") return false;
    this.restoreWindowOwner();
    return true;
  }
}

export function getGameInputOwnership(registry: Phaser.Data.DataManager): GameInputOwnership {
  const existing = registry.get(gameInputOwnershipRegistryKey) as GameInputOwnership | undefined;
  if (existing) return existing;
  const ownership = new GameInputOwnership();
  registry.set(gameInputOwnershipRegistryKey, ownership);
  return ownership;
}
