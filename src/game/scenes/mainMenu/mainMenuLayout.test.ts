import { describe, expect, it } from "vitest";
import { createMainMenuLayout } from "./mainMenuLayout";

describe("createMainMenuLayout", () => {
  it("places the main menu buttons around the screen center", () => {
    const layout = createMainMenuLayout(800, 600);

    expect(layout.centerX).toBe(400);
    expect(layout.centerY).toBe(300);
    expect(layout.buttons).toEqual([
      {
        label: "Start Game",
        x: 400,
        y: 258,
      },
      {
        label: "Options",
        x: 400,
        y: 342,
      },
    ]);
  });

  it("scales button positions from the provided scene size", () => {
    const layout = createMainMenuLayout(1024, 768);

    expect(layout.buttons).toEqual([
      {
        label: "Start Game",
        x: 512,
        y: 342,
      },
      {
        label: "Options",
        x: 512,
        y: 426,
      },
    ]);
  });
});
