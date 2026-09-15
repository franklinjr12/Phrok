import { expect, test } from "@playwright/test";

interface SpriteGalleryCell {
  id: string;
  spriteX: number;
  spriteY: number;
  spriteWidth: number;
  spriteHeight: number;
}

test("core visible sprites render in the sprite gallery", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1120 });
  await page.goto("/?spriteGallery=1");

  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-scene", "sprite-gallery", { timeout: 10000 });
  await expect(canvas).toHaveAttribute("data-sprite-gallery-missing", "");
  await expect(canvas).toHaveAttribute("data-sprite-gallery-players", "4");
  await expect(canvas).toHaveAttribute("data-sprite-gallery-monsters", "57");
  await expect(canvas).toHaveAttribute("data-sprite-gallery-npcs", "35");
  await expect(canvas).toHaveAttribute("data-sprite-gallery-supports", "3");

  await canvas.screenshot({ path: "test-results/sprite-gallery/core-visible-sprites.png" });

  const cells = JSON.parse(await canvas.getAttribute("data-sprite-gallery-cells") ?? "[]") as SpriteGalleryCell[];
  expect(cells).toHaveLength(99);

  const blankCells = await page.evaluate((galleryCells) => {
    const source = document.querySelector("canvas") as HTMLCanvasElement | null;

    if (!source) {
      return ["missing-canvas"];
    }

    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = source.width;
    sampleCanvas.height = source.height;
    const context = sampleCanvas.getContext("2d", { willReadFrequently: true });

    if (!context) {
      return ["missing-2d-context"];
    }

    context.drawImage(source, 0, 0);

    return galleryCells
      .filter((cell) => {
        const left = Math.max(0, Math.floor(cell.spriteX));
        const top = Math.max(0, Math.floor(cell.spriteY));
        const width = Math.max(1, Math.ceil(cell.spriteWidth));
        const height = Math.max(1, Math.ceil(cell.spriteHeight));
        const pixels = context.getImageData(left, top, width, height).data;
        let visiblePixels = 0;

        for (let index = 0; index < pixels.length; index += 4) {
          const red = pixels[index];
          const green = pixels[index + 1];
          const blue = pixels[index + 2];
          const alpha = pixels[index + 3];
          const isPanel = Math.abs(red - 23) <= 2 && Math.abs(green - 32) <= 2 && Math.abs(blue - 42) <= 2;

          if (alpha > 0 && !isPanel) {
            visiblePixels += 1;
          }
        }

        return visiblePixels < 12;
      })
      .map((cell) => cell.id);
  }, cells);

  expect(blankCells.filter((id) => !id.startsWith("supports:"))).toEqual([]);
});
