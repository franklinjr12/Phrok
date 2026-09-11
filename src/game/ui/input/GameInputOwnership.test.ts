import { describe, expect, it } from "vitest";
import { GameInputOwnership } from "./GameInputOwnership";

describe("GameInputOwnership", () => {
  it("keeps ordinary windows compatible with gameplay while capturing their pointer", () => {
    const ownership = new GameInputOwnership("ordinary-window");
    ownership.setPointerCapture((pointer) => pointer.x === 10 && pointer.y === 20);

    expect(ownership.allowsGameplayKeyboard()).toBe(true);
    expect(ownership.allowsWorldPointer({ x: 10, y: 20 } as Phaser.Input.Pointer)).toBe(false);
    expect(ownership.allowsWorldPointer({ x: 11, y: 20 } as Phaser.Input.Pointer)).toBe(true);
  });

  it.each(["modal", "dialogue", "text-entry", "skill-targeting", "game-over"] as const)(
    "%s blocks gameplay input",
    (owner) => {
      const ownership = new GameInputOwnership(owner);
      expect(ownership.allowsGameplayKeyboard()).toBe(false);
      expect(ownership.allowsWorldPointer({ x: 0, y: 0 } as Phaser.Input.Pointer)).toBe(false);
    },
  );

  it("cancels targeting back to world input", () => {
    const ownership = new GameInputOwnership("ordinary-window");
    ownership.setWindowOwner("ordinary-window");
    ownership.set("skill-targeting");
    expect(ownership.cancelSkillTargeting()).toBe(true);
    expect(ownership.current).toBe("ordinary-window");
  });

  it("does not let window changes override dialogue ownership", () => {
    const ownership = new GameInputOwnership();
    ownership.set("dialogue");
    ownership.setWindowOwner("ordinary-window");
    expect(ownership.current).toBe("dialogue");
    ownership.restoreWindowOwner();
    expect(ownership.current).toBe("ordinary-window");
  });
});
