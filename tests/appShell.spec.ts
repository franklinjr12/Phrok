import { expect, test } from "@playwright/test";

test("loads the app shell", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Prok");
  await expect(page.locator("#app")).toHaveAttribute("data-ready", "true");
  await expect(page.locator("canvas")).toHaveAttribute("data-scene", "main-menu");
  await expect(page.locator("canvas")).toHaveAttribute(
    "data-menu-buttons",
    "New Game|Continue|Load Game|Settings|Credits|Quit",
  );
  await expect(page.locator("canvas")).toHaveAttribute("data-save-slot-count", "3");
  await expect(page.locator("canvas")).toHaveAttribute("data-save-slots", "1:empty:New Game|2:empty:New Game|3:empty:New Game");
  await expect(page.locator("canvas")).toHaveAttribute("data-save-slot-buttons", "Slot 1: New Game|Slot 2: New Game|Slot 3: New Game");
  await expect(page.locator("canvas")).toHaveAttribute("data-continue-state", "unavailable");
});
