import { describe, expect, it } from "vitest";
import { createMainMenuLayout } from "./mainMenuLayout";

describe("createMainMenuLayout", () => {
  it("places the main menu buttons around the screen center", () => {
    const layout = createMainMenuLayout(800, 600);

    expect(layout.centerX).toBe(400);
    expect(layout.centerY).toBe(300);
    expect(layout.buttons).toEqual([
      {
        label: "Slot 1: New Game",
        x: 400,
        y: 204,
        slot: 1,
      },
      {
        label: "Slot 2: New Game",
        x: 400,
        y: 280,
        slot: 2,
      },
      {
        label: "Slot 3: New Game",
        x: 400,
        y: 356,
        slot: 3,
      },
      {
        label: "Options",
        x: 400,
        y: 432,
        slot: null,
      },
    ]);
  });

  it("scales button positions from the provided scene size", () => {
    const layout = createMainMenuLayout(1024, 768);

    expect(layout.buttons).toEqual([
      {
        label: "Slot 1: New Game",
        x: 512,
        y: 288,
        slot: 1,
      },
      {
        label: "Slot 2: New Game",
        x: 512,
        y: 364,
        slot: 2,
      },
      {
        label: "Slot 3: New Game",
        x: 512,
        y: 440,
        slot: 3,
      },
      {
        label: "Options",
        x: 512,
        y: 516,
        slot: null,
      },
    ]);
  });
});
