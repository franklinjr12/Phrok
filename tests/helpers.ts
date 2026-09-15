import { expect, type Page } from "@playwright/test";

export type CanvasLocator = ReturnType<Page["locator"]>;

export async function openCharacterCreation(page: Page) {
  const canvas = page.locator("canvas");

  await expect(canvas).toHaveAttribute("data-scene", "main-menu", { timeout: 15000 });
  await canvas.click({ position: { x: 400, y: 204 } });
  await expect(canvas).toHaveAttribute("data-scene", "character-creation", { timeout: 15000 });

  return canvas;
}

export async function confirmDefaultCharacter(page: Page) {
  const canvas = await openCharacterCreation(page);

  await canvas.click({ position: { x: 630, y: 545 } });
  await expect(canvas).toHaveAttribute("data-scene", "world", { timeout: 15000 });
  await expect(canvas).toHaveAttribute("data-transition-state", "idle");

  return canvas;
}

export async function enterMeadows(page: Page) {
  const canvas = await confirmDefaultCharacter(page);

  await expect(canvas).toHaveAttribute("data-portal-count", "1");
  await clickUntilMapChanges(canvas, "crownfield-meadows", { x: 760, y: 304 });

  return canvas;
}

export async function startApp(page: Page) {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto("/");
}

export async function continueFromMainMenu(page: Page) {
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-scene", "main-menu", { timeout: 15000 });
  await expect(canvas).toHaveAttribute("data-continue-state", "available");
  const viewport = page.viewportSize() ?? { width: 800, height: 600 };
  await canvas.click({
    position: {
      x: viewport.width < 700 ? 270 : 400,
      y: viewport.height / 2 - 46,
    },
  });
  await expect(canvas).toHaveAttribute("data-scene", "world", { timeout: 15000 });
  await expect(canvas).toHaveAttribute("data-transition-state", "idle");
  return canvas;
}

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
      await expect(canvas).toHaveAttribute("data-scene", "world", { timeout: 4000 });
      await expect(canvas).toHaveAttribute("data-transition-state", "idle");
      return;
    } catch {
      // The click can land before the world input listener settles under parallel load.
    }
  }

  await expect.poll(async () => await canvas.getAttribute("data-current-map"), { timeout: 3000 }).toBe(mapId);
  await expect(canvas).toHaveAttribute("data-scene", "world", { timeout: 8000 });
  await expect(canvas).toHaveAttribute("data-transition-state", "idle");
}
