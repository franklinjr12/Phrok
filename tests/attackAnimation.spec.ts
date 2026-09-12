import { expect, test } from "@playwright/test";
import { enterMeadows, startApp } from "./helpers";

test("swordsman plays the swing animation when it hits and returns to its idle sprite", async ({ page }) => {
  await startApp(page);
  const canvas = await enterMeadows(page);

  const observedFrames = new Set<string>();
  const deadline = Date.now() + 25000;

  while (Date.now() < deadline) {
    if ((await canvas.getAttribute("data-enemy-selected")) !== "true") {
      const [x, y] = ((await canvas.getAttribute("data-enemy-position")) ?? "").split(",").map(Number);
      if (Number.isFinite(x)) await canvas.click({ position: { x, y } });
    }

    observedFrames.add((await canvas.getAttribute("data-player-rendered-frame")) ?? "");

    if (countSwingFrames(observedFrames) >= 4) break;
    await page.waitForTimeout(20);
  }

  // The swing walks through the attack sheet, then the idle texture comes back.
  expect(countSwingFrames(observedFrames)).toBeGreaterThanOrEqual(4);
  await expect.poll(async () => await canvas.getAttribute("data-player-rendered-frame"))
    .toBe("player-swordsman:0");
});

function countSwingFrames(frames: Set<string>): number {
  return [...frames].filter((frame) => frame.startsWith("player-swordsman-attack:")).length;
}
