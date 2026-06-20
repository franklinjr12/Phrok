import { expect, test } from "@playwright/test";
import { confirmDefaultCharacter, startApp } from "./helpers";

test("town NPCs can be clicked to open blocking placeholder service dialogue", async ({ page }) => {
  await startApp(page);

  const canvas = await confirmDefaultCharacter(page);
  await expect(canvas).toHaveAttribute("data-npc-names", "Maela Hearth|Borin Lockbar|Tessa Vale|Orun Brightslag|Nima Threadwell|Sella Greenward|Joric Wayfare|Perrin Slate");
  await expect(canvas).toHaveAttribute("data-dialogue-state", "closed");

  await canvas.click({ position: { x: 304, y: 240 } });
  await expect(canvas).toHaveAttribute("data-last-clicked-npc", "maela-hearth");
  await expect(canvas).toHaveAttribute("data-last-clicked-npc-service-type", "inn");
  await expect.poll(async () => await canvas.getAttribute("data-dialogue-state"), { timeout: 6000 }).toBe("open");
  await expect(canvas).toHaveAttribute("data-dialogue-npc-name", "Maela Hearth");
  await expect(canvas).toHaveAttribute("data-dialogue-id", "maela-hearth-greeting");
  await expect(canvas).toHaveAttribute("data-dialogue-service-type", "inn");
  await expect(canvas).toHaveAttribute("data-dialogue-text", "Fresh linen, warm soup, and a bed that does not ask questions. That is my promise.");
  await expect(canvas).toHaveAttribute("data-dialogue-choice-labels", "Rest at the inn");
  await expect(canvas).toHaveAttribute("data-dialogue-choice-disabled", "true");
  await expect(canvas).toHaveAttribute("data-dialogue-blocking-movement", "true");

  const blockedX = Number(await canvas.getAttribute("data-player-x"));
  await canvas.click({ position: { x: 560, y: 300 } });
  await page.waitForTimeout(150);
  expect(Number(await canvas.getAttribute("data-player-x"))).toBeCloseTo(blockedX, 1);

  await canvas.click({ position: { x: 650, y: 550 } });
  await expect(canvas).toHaveAttribute("data-dialogue-line-index", "1");
  await expect(canvas).toHaveAttribute("data-dialogue-text", "The inn rooms are being aired out for new arrivals.");
  await canvas.click({ position: { x: 650, y: 550 } });
  await expect(canvas).toHaveAttribute("data-dialogue-state", "closed");
  await expect(canvas).toHaveAttribute("data-dialogue-blocking-movement", "false");
});

test("town stat reset NPC offers reset service with confirmation state", async ({ page }) => {
  await startApp(page);

  const canvas = await confirmDefaultCharacter(page);

  await canvas.click({ position: { x: 336, y: 432 } });
  await expect(canvas).toHaveAttribute("data-last-clicked-npc", "sella-greenward");
  await expect(canvas).toHaveAttribute("data-last-clicked-npc-service-type", "stat-reset");
  await expect.poll(async () => await canvas.getAttribute("data-dialogue-state"), { timeout: 6000 }).toBe("open");
  await expect(canvas).toHaveAttribute("data-dialogue-npc-name", "Sella Greenward");
  await expect(canvas).toHaveAttribute("data-dialogue-service-type", "stat-reset");
  await expect(canvas).toHaveAttribute("data-dialogue-choice-labels", "Reset stats");
  await expect(canvas).toHaveAttribute("data-dialogue-choice-disabled", "false");

  await canvas.click({ position: { x: 86, y: 530 } });
  await expect(canvas).toHaveAttribute("data-last-dialogue-choice", "reset-stats");
  await expect(canvas).toHaveAttribute("data-last-stat-reset", /failed:(insufficient-gold|no-allocated-stats):50:0/);
});
