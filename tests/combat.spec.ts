import { expect, test } from "@playwright/test";
import { enterMeadows, startApp } from "./helpers";

test("world supports target selection and auto-attack combat", async ({ page }) => {
  await startApp(page);

  const canvas = await enterMeadows(page);
  await expect(canvas).toHaveAttribute("data-spawned-monster", "green-jelly");
  await expect(canvas).toHaveAttribute("data-current-map-name", "Crownfield Meadows");
  await expect(canvas).toHaveAttribute("data-spawn-name", "TownGateSpawn");
  await expect(canvas).toHaveAttribute("data-last-autosave-slot", "1");
  await expect(canvas).toHaveAttribute("data-last-autosave-map", "crownfield-meadows");
  await expect(canvas).toHaveAttribute("data-monster-spawn-zone-count", "1");
  await expect(canvas).toHaveAttribute("data-monster-spawn-zones", "JellyGrove:green-jelly:1");
  await expect(canvas).toHaveAttribute("data-enemy-entity-count", "1");
  await expect(canvas).toHaveAttribute("data-enemy-behavior", "passive");
  await expect(canvas).toHaveAttribute("data-enemy-aggro-range", "150");
  await expect(canvas).toHaveAttribute("data-enemy-leash-distance", "240");
  await expect(canvas).toHaveAttribute("data-gathering-spot-count", "1");
  await expect(canvas).toHaveAttribute("data-treasure-spot-count", "1");
  await expect(canvas).toHaveAttribute("data-enemy-hp", "10/10");
  await expect(canvas).toHaveAttribute("data-target-frame", "hidden");

  await canvas.click({ position: { x: 528, y: 300 } });
  await expect.poll(async () => {
    const selected = await canvas.getAttribute("data-enemy-selected");
    const enemyHp = await canvas.getAttribute("data-enemy-hp");
    return selected === "true" || enemyHp === "0/10" ? "engaged" : "idle";
  }).toBe("engaged");
  await expect(canvas).toHaveAttribute("data-auto-attack", /moving-to-range|attacking|stopped/);

  await expect.poll(async () => await canvas.getAttribute("data-enemy-hp")).not.toBe("10/10");
  await expect.poll(async () => await canvas.getAttribute("data-last-combat-formula")).toContain("weapon=2");
  await expect.poll(async () => await canvas.getAttribute("data-enemy-alive"), { timeout: 6000 }).toBe("false");
  await expect(canvas).toHaveAttribute("data-enemy-hp", "0/10");
  await expect(canvas).toHaveAttribute("data-auto-attack", "stopped");
  await expect(canvas).toHaveAttribute("data-target-frame", "hidden");
  await expect(canvas).toHaveAttribute("data-player-xp", "5");
  await expect(canvas).toHaveAttribute("data-last-xp-gain", "5");
  await expect(canvas).toHaveAttribute("data-player-level", "1");
  await expect(canvas).toHaveAttribute("data-xp-bar-width", "9");
  await expect(canvas).toHaveAttribute("data-pending-loot-count", "2");
  await expect(canvas).toHaveAttribute("data-last-loot-drop", /gold:[3-5]/);

  await canvas.click({ position: { x: 528, y: 322 } });
  await expect(canvas).toHaveAttribute("data-pending-loot-count", "1");
  await expect(canvas).toHaveAttribute("data-last-loot-pickup", /jelly-gel:[1-2]/);
  await expect(canvas).toHaveAttribute("data-inventory-stack-count", "2");

  await canvas.click({ position: { x: 556, y: 322 } });
  await expect(canvas).toHaveAttribute("data-pending-loot-count", "0");
  await expect(canvas).toHaveAttribute("data-last-loot-pickup", /gold:[3-5]/);
  await expect.poll(async () => Number(await canvas.getAttribute("data-player-gold"))).toBeGreaterThan(0);
  await expect.poll(async () => Number(await canvas.getAttribute("data-inventory-gold"))).toBeGreaterThan(0);
});

test("hotbar skill key fails without target and executes against selected enemies", async ({ page }) => {
  await startApp(page);

  const canvas = await enterMeadows(page);

  await page.keyboard.press("Digit1");
  await expect(canvas).toHaveAttribute("data-last-skill-use", "1:power-slash:failed:missing-target");
  await expect(canvas).toHaveAttribute("data-last-hotbar-use", "1:skill:power-slash:failed");

  await canvas.click({ position: { x: 528, y: 300 } });
  await expect.poll(async () => {
    const selected = await canvas.getAttribute("data-enemy-selected");
    const enemyHp = await canvas.getAttribute("data-enemy-hp");
    return selected === "true" || enemyHp === "0/10" ? "engaged" : "idle";
  }).toBe("engaged");

  await page.keyboard.press("Digit1");
  await expect.poll(async () => await canvas.getAttribute("data-last-skill-use")).toMatch(/1:power-slash:(success|failed:(out-of-range|cooldown))/);
  await expect(canvas).toHaveAttribute("data-skill-cooldowns", /power-slash:|^$/);
});
