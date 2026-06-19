import { describe, expect, it } from "vitest";
import {
  getAnimationState,
  getDirectionFromVector,
  moveToward,
  playerAnimationStates,
} from "./playerMovement";

describe("player movement", () => {
  it("defines placeholder animation states for every idle and walk direction", () => {
    expect(playerAnimationStates).toEqual([
      "idle-down",
      "idle-up",
      "idle-left",
      "idle-right",
      "walk-down",
      "walk-up",
      "walk-left",
      "walk-right",
    ]);
  });

  it("moves toward a destination without overshooting", () => {
    const step = moveToward({ x: 0, y: 0 }, { x: 100, y: 0 }, 50, 1, "down");

    expect(step.position).toEqual({ x: 50, y: 0 });
    expect(step.direction).toBe("right");
    expect(step.motionState).toBe("walk");
    expect(step.animationState).toBe("walk-right");
    expect(step.reachedDestination).toBe(false);
  });

  it("stops at the destination and keeps facing the final movement direction", () => {
    const step = moveToward({ x: 95, y: 100 }, { x: 100, y: 100 }, 50, 1, "down");

    expect(step.position).toEqual({ x: 100, y: 100 });
    expect(step.direction).toBe("right");
    expect(step.motionState).toBe("idle");
    expect(step.animationState).toBe("idle-right");
    expect(step.reachedDestination).toBe(true);
  });

  it("stays idle when there is no destination", () => {
    const step = moveToward({ x: 12, y: 34 }, null, 50, 1, "up");

    expect(step.position).toEqual({ x: 12, y: 34 });
    expect(step.direction).toBe("up");
    expect(step.motionState).toBe("idle");
    expect(step.animationState).toBe("idle-up");
    expect(step.reachedDestination).toBe(false);
  });

  it("chooses the dominant movement axis for direction", () => {
    expect(getDirectionFromVector(-40, 12, "down")).toBe("left");
    expect(getDirectionFromVector(18, -42, "down")).toBe("up");
    expect(getDirectionFromVector(0, 0, "right")).toBe("right");
    expect(getAnimationState("walk", "left")).toBe("walk-left");
  });
});
