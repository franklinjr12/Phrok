import { expect, test, type Locator } from "@playwright/test";
import { confirmDefaultCharacter, openCharacterCreation, startApp } from "./helpers";

test("all four base classes start with their signature combat skill", async ({ page }) => {
  await startApp(page);
  const canvas = await openCharacterCreation(page);

  await expect(canvas).toHaveAttribute("data-starting-skill", "power-slash");
  await canvas.click({ position: { x: 320, y: 270 } });
  await expect(canvas).toHaveAttribute("data-starting-skill", "fire-bolt");
  await canvas.click({ position: { x: 320, y: 330 } });
  await expect(canvas).toHaveAttribute("data-starting-skill", "double-shot");
  await canvas.click({ position: { x: 320, y: 390 } });
  await expect(canvas).toHaveAttribute("data-starting-skill", "quick-stab");
});

test("debug scenario can teleport, spawn elites, and force Silvermane", async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("phrok-early-game-debug", JSON.stringify({
      classId: "swordsman",
      level: 18,
      mapId: "deep-mossvale",
      forceRareVariantId: "silvermane-stalker",
      spawnMonsterIds: ["old-road-bruiser"],
    }));
  });
  await startApp(page);
  const canvas = await confirmDefaultCharacter(page);

  await expect(canvas).toHaveAttribute("data-current-map", "deep-mossvale");
  await expect(canvas).toHaveAttribute("data-player-level", "18");
  await expect(canvas).toHaveAttribute("data-rare-spawn-active", "silvermane-stalker");
  await expect(canvas).toHaveAttribute("data-debug-spawned-monsters", "old-road-bruiser");
});

test("first Sewer Glutton and Thorn Priest kills grant rewards and the demo milestone", async ({ page }) => {
  test.setTimeout(120000);
  await page.addInitScript(() => {
    sessionStorage.setItem("phrok-early-game-debug", JSON.stringify({
      classId: "swordsman",
      level: 20,
      mapId: "crownfield-meadows",
      allocatedStats: { str: 50, vit: 40 },
      spawnMonsterIds: ["sewer-glutton", "thorn-priest"],
      itemIds: ["minor-health-potion"],
    }));
  });
  await startApp(page);
  const canvas = await confirmDefaultCharacter(page);

  await expect(canvas).toHaveAttribute("data-current-map", "crownfield-meadows");
  await expect(canvas).toHaveAttribute("data-debug-spawned-monsters", "sewer-glutton|thorn-priest");
  await clickPrimaryEnemy(canvas);
  await expect.poll(async () => await canvas.getAttribute("data-reward-choice-panel"), { timeout: 45000 }).toBe("visible");
  await canvas.click({ position: { x: 400, y: 237 } });
  await expect.poll(async () => await canvas.getAttribute("data-last-reward-choice")).toMatch(/sewer-glutton-first-clear:/);
  await expect.poll(async () => await canvas.getAttribute("data-reward-choice-panel")).not.toBe("visible");

  await clickPrimaryEnemy(canvas);
  await expect.poll(async () => await canvas.getAttribute("data-reward-choice-panel"), { timeout: 45000 }).toBe("visible");
  await canvas.click({ position: { x: 400, y: 237 } });
  await expect.poll(async () => await canvas.getAttribute("data-last-reward-choice")).toMatch(/thorn-priest-first-clear:/);
  await expect.poll(async () => await canvas.getAttribute("data-milestone-panel"), { timeout: 15000 }).toBe("visible");
  await expect(canvas).toHaveAttribute("data-early-game-milestone", "shown");
});

async function clickPrimaryEnemy(canvas: Locator) {
  const position = (await canvas.getAttribute("data-enemy-position")) ?? "400,300";
  const [x, y] = position.split(",").map((value) => Number(value));
  await canvas.click({ position: { x, y } });
}
