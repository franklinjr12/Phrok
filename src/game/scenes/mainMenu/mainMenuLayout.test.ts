import { describe, expect, it } from "vitest";
import { createMainMenuLayout } from "./mainMenuLayout";

describe("createMainMenuLayout", () => {
  it("places the main menu buttons around the screen center", () => {
    const layout = createMainMenuLayout(800, 600);

    expect(layout.centerX).toBe(400);
    expect(layout.centerY).toBe(300);
    expect(layout.buttons).toEqual([
      {
        action: "new-game",
        label: "New Game",
        x: 270,
        y: 204,
      },
      {
        action: "continue",
        label: "Continue",
        x: 270,
        y: 254,
      },
      {
        action: "load-game",
        label: "Load Game",
        x: 270,
        y: 304,
      },
      {
        action: "settings",
        label: "Settings",
        x: 270,
        y: 354,
      },
      {
        action: "credits",
        label: "Credits",
        x: 270,
        y: 404,
      },
      {
        action: "quit",
        label: "Quit",
        x: 270,
        y: 454,
      },
    ]);
    expect(layout.saveSlots).toEqual([
      { slot: 1, x: 600, y: 250 },
      { slot: 2, x: 600, y: 308 },
      { slot: 3, x: 600, y: 366 },
    ]);
  });

  it("scales button positions from the provided scene size", () => {
    const layout = createMainMenuLayout(1024, 768);

    expect(layout.buttons).toEqual([
      {
        action: "new-game",
        label: "New Game",
        x: 382,
        y: 288,
      },
      {
        action: "continue",
        label: "Continue",
        x: 382,
        y: 338,
      },
      {
        action: "load-game",
        label: "Load Game",
        x: 382,
        y: 388,
      },
      {
        action: "settings",
        label: "Settings",
        x: 382,
        y: 438,
      },
      {
        action: "credits",
        label: "Credits",
        x: 382,
        y: 488,
      },
      {
        action: "quit",
        label: "Quit",
        x: 382,
        y: 538,
      },
    ]);
    expect(layout.saveSlots).toEqual([
      { slot: 1, x: 712, y: 334 },
      { slot: 2, x: 712, y: 392 },
      { slot: 3, x: 712, y: 450 },
    ]);
  });
});
