import { expect, test } from "@playwright/test";
import { confirmDefaultCharacter, enterMeadows, startApp, type CanvasLocator } from "./helpers";

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
  await expect(canvas).toHaveAttribute("data-region-progression", /crownfield:1-10.*starfall-tower:65-99/);

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
  await expect(canvas).toHaveAttribute("data-current-map-level-range", "1-5");
  await expect(canvas).toHaveAttribute("data-current-map-type", "field");
  await expect(canvas).toHaveAttribute("data-current-map-music-key", "music-crownfield-meadows");
  await expect(canvas).toHaveAttribute("data-current-map-recommended-elements", "neutral|fire");
  await expect(canvas).toHaveAttribute("data-current-map-drop-highlights", "jelly-gel|hopper-leg|soft-hide|minor-health-potion");
  await expect(canvas).toHaveAttribute("data-current-map-spawn-groups", "meadow-jelly-loop:green-jelly,field-hopper:3|meadow-pup-loop:meadow-pup:2");
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

test("world portals connect generated field and regional maps", async ({ page }) => {
  await startApp(page);

  const canvas = await enterMeadows(page);

  await clickUntilMapChanges(canvas, "crownfield-old-road", { x: 760, y: 304 });
  await expect(canvas).toHaveAttribute("data-current-map-name", "Old Road");
  await expect(canvas).toHaveAttribute("data-spawn-name", "MeadowReturn");
  await expect(canvas).toHaveAttribute("data-tilemap-key", "map-crownfield-old-road");

  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem("prok-save-slot-1") ?? "{}") as {
      currentMapId?: string;
      position?: { x: number; y: number };
      gameState?: {
        currentMapId?: string;
        position?: { x: number; y: number };
      };
    };

    save.currentMapId = "mossvale-hub";
    save.position = { x: 400, y: 304 };
    save.gameState = {
      ...save.gameState,
      currentMapId: "mossvale-hub",
      position: { x: 400, y: 304 },
    };
    localStorage.setItem("prok-save-slot-1", JSON.stringify(save));
  });
  await page.reload();
  await expect(canvas).toHaveAttribute("data-scene", "main-menu", { timeout: 10000 });
  await canvas.click({ position: { x: 270, y: 254 } });
  await expect(canvas).toHaveAttribute("data-current-map", "mossvale-hub");

  await clickUntilMapChanges(canvas, "mossvale-edge", { x: 760, y: 304 });
  await expect(canvas).toHaveAttribute("data-current-map-name", "Mossvale Edge");
  await expect(canvas).toHaveAttribute("data-spawn-name", "GroveGateSpawn");
  await expect(canvas).toHaveAttribute("data-tilemap-key", "map-mossvale-edge");
});

test("field monsters spawn scattered without visual overlap", async ({ page }) => {
  await useDeterministicRandom(page);
  await startApp(page);

  const canvas = await enterMeadows(page);

  await clickUntilMapChanges(canvas, "crownfield-old-road", { x: 760, y: 304 });
  await expect.poll(async () => Number(await canvas.getAttribute("data-enemy-alive-count"))).toBeGreaterThan(1);

  const positions = parsePositions(await canvas.getAttribute("data-enemy-positions"));
  expect(positions.length).toBeGreaterThan(1);

  for (let index = 0; index < positions.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < positions.length; otherIndex += 1) {
      expect(distance(positions[index], positions[otherIndex])).toBeGreaterThanOrEqual(32);
    }
  }
});

test("audio manager plays map music, action SFX, and updates volume settings", async ({ page }) => {
  await startApp(page);

  const canvas = await enterMeadows(page);

  await expect(canvas).toHaveAttribute("data-audio-music-key", "music-crownfield-meadows");
  await expect(canvas).toHaveAttribute("data-audio-music-volume", "0.8");
  await expect(canvas).toHaveAttribute("data-audio-sfx-volume", "0.8");
  await expect(canvas).toHaveAttribute("data-audio-music-muted", "false");
  await expect(canvas).toHaveAttribute("data-audio-sfx-muted", "false");
  await expect(canvas).toHaveAttribute("data-audio-placeholder-sfx", /ui-click.*attack.*hit.*skill-cast.*rare-drop/);
  await expect(canvas).toHaveAttribute("data-audio-missing-key", "");

  await expect.poll(async () => {
    const enemyPosition = (await canvas.getAttribute("data-enemy-position")) ?? "528,300";
    const [enemyX, enemyY] = enemyPosition.split(",").map((value) => Number(value));

    await canvas.click({ position: { x: enemyX, y: enemyY } });
    return await canvas.getAttribute("data-last-audio-sfx") ?? "";
  }, { timeout: 6000 }).toMatch(/hit|attack/);

  await page.keyboard.press("BracketLeft");
  await expect(canvas).toHaveAttribute("data-audio-music-volume", "0.7");
  await page.keyboard.press("Minus");
  await expect(canvas).toHaveAttribute("data-audio-sfx-volume", "0.7");
  await expect.poll(async () => {
    await page.keyboard.press("KeyN");
    return await canvas.getAttribute("data-audio-music-muted");
  }).toBe("true");
  await expect.poll(async () => {
    await page.keyboard.press("KeyJ");
    return await canvas.getAttribute("data-audio-sfx-muted");
  }).toBe("true");
});

async function clickUntilMapChanges(
  canvas: CanvasLocator,
  mapId: string,
  position: { x: number; y: number },
) {
  const deadline = Date.now() + 9000;

  while (Date.now() < deadline) {
    await canvas.click({ position });

    try {
      await expect.poll(async () => await canvas.getAttribute("data-current-map"), { timeout: 700 }).toBe(mapId);
      return;
    } catch {
      // Click can land before the world input listener settles under parallel load.
    }
  }

  await expect.poll(async () => await canvas.getAttribute("data-current-map"), { timeout: 3000 }).toBe(mapId);
}

async function useDeterministicRandom(page: Parameters<typeof startApp>[0]) {
  await page.addInitScript(() => {
    let seed = 12345;
    Math.random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  });
}

function parsePositions(rawPositions: string | null): { x: number; y: number }[] {
  return (rawPositions ?? "")
    .split("|")
    .filter((position) => position.length > 0)
    .map((position) => {
      const [x, y] = position.split(",").map((value) => Number(value));
      return { x, y };
    });
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
