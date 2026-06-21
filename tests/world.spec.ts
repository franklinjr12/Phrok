import { expect, test } from "@playwright/test";
import { confirmDefaultCharacter, enterMeadows, startApp } from "./helpers";

test("world supports mouse click player movement without WASD movement", async ({ page }) => {
  await startApp(page);

  const canvas = await confirmDefaultCharacter(page);
  await expect(canvas).toHaveAttribute("data-player-character-id", "player");
  await expect(canvas).toHaveAttribute("data-player-has-collision-body", "true");
  await expect(canvas).toHaveAttribute("data-camera-following-player", "true");
  await expect(canvas).toHaveAttribute("data-player-animation-state", "idle-down");
  await expect(canvas).toHaveAttribute("data-wasd-movement", "disabled");
  await expect(canvas).toHaveAttribute("data-current-region", "crownfield");
  await expect(canvas).toHaveAttribute("data-current-region-name", "Crownfield");
  await expect(canvas).toHaveAttribute("data-current-map-level-range", "1-3");
  await expect(canvas).toHaveAttribute("data-current-map-type", "town");
  await expect(canvas).toHaveAttribute("data-current-map-music-key", "music-crownfield-town");
  await expect(canvas).toHaveAttribute("data-region-progression", /crownfield:1-8.*starfall-tower:49-60/);

  const startX = Number(await canvas.getAttribute("data-player-x"));
  const startY = Number(await canvas.getAttribute("data-player-y"));

  await page.keyboard.press("KeyD");
  await page.waitForTimeout(100);
  expect(Number(await canvas.getAttribute("data-player-x"))).toBeCloseTo(startX, 1);
  expect(Number(await canvas.getAttribute("data-player-y"))).toBeCloseTo(startY, 1);
  await expect(canvas).toHaveAttribute("data-player-destination", "");

  await canvas.click({ position: { x: 160, y: 128 } });
  await expect(canvas).toHaveAttribute("data-last-movement-click-valid", "false");
  await expect(canvas).toHaveAttribute("data-movement-marker", "hidden");
  await expect(canvas).toHaveAttribute("data-player-destination", "");

  await canvas.click({ position: { x: 560, y: 300 } });
  await expect(canvas).toHaveAttribute("data-last-movement-click-valid", "true");
  await expect.poll(async () => Number(await canvas.getAttribute("data-last-path-length"))).toBeGreaterThan(1);
  await expect(canvas).toHaveAttribute("data-player-motion-state", "walk");
  await expect(canvas).toHaveAttribute("data-player-direction", "right");
  await expect(canvas).toHaveAttribute("data-player-animation-state", /walk-right|idle-right/);

  await expect.poll(async () => Number(await canvas.getAttribute("data-player-x"))).toBeGreaterThan(startX + 80);
  await expect.poll(async () => await canvas.getAttribute("data-player-destination")).toBe("");
  await expect(canvas).toHaveAttribute("data-player-motion-state", "idle");
  await expect(canvas).toHaveAttribute("data-player-animation-state", /idle-/);
  await expect(canvas).toHaveAttribute("data-movement-marker", "hidden");
});

test("world portals connect town and field", async ({ page }) => {
  await startApp(page);

  const canvas = await enterMeadows(page);

  await expect(canvas).toHaveAttribute("data-current-map", "crownfield-meadows");
  await expect(canvas).toHaveAttribute("data-current-map-name", "Crownfield Meadows");
  await expect(canvas).toHaveAttribute("data-current-region", "crownfield");
  await expect(canvas).toHaveAttribute("data-current-map-level-range", "2-6");
  await expect(canvas).toHaveAttribute("data-current-map-type", "field");
  await expect(canvas).toHaveAttribute("data-current-map-music-key", "music-crownfield-meadows");
  await expect(canvas).toHaveAttribute("data-current-map-recommended-elements", "neutral|fire");
  await expect(canvas).toHaveAttribute("data-current-map-drop-highlights", "jelly-gel|hopper-leg");
  await expect(canvas).toHaveAttribute("data-current-map-spawn-groups", "meadow-field-hoppers:green-jelly,field-hopper:3");
  await expect(canvas).toHaveAttribute("data-spawn-point", "80,304");
  await expect(canvas).toHaveAttribute("data-spawn-name", "TownGateSpawn");
  await expect(canvas).toHaveAttribute("data-safe-zone", "field-entrance");
  await expect(canvas).toHaveAttribute("data-last-transition", "TownEastGate:crownfield-meadows:TownGateSpawn");

  await canvas.click({ position: { x: 20, y: 304 } });
  await expect.poll(async () => await canvas.getAttribute("data-current-map"), { timeout: 6000 }).toBe("crownfield-town");
  await expect(canvas).toHaveAttribute("data-current-map-name", "Crownfield");
  await expect(canvas).toHaveAttribute("data-spawn-point", "704,304");
  await expect(canvas).toHaveAttribute("data-spawn-name", "FieldRoadReturn");
  await expect(canvas).toHaveAttribute("data-spawned-monster", "");
  await expect(canvas).toHaveAttribute("data-last-autosave-map", "crownfield-town");
});
