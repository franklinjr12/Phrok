import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PLAYER_MELEE_COOLDOWN_MS } from "../constants/combatTiming";
import { attackSheetDefinitions, getAttackDurationMs } from "./attackAnimations";

const animationRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "assets", "sprites", "animations");

describe("attack animations", () => {
  it("matches the generated spritesheet dimensions", () => {
    for (const [archetype, sheet] of Object.entries(attackSheetDefinitions)) {
      const { width, height } = readPngSize(join(animationRoot, sheet.fileName));
      const columns = width / sheet.frameWidth;
      const rows = height / sheet.frameHeight;

      expect({ archetype, columns, rows }).toEqual({
        archetype,
        columns: Math.round(columns),
        rows: Math.round(rows),
      });
      expect(columns * rows, `${archetype} frame count`).toBe(sheet.frameDurationsMs.length);
    }
  });

  it("finishes inside the melee cooldown so swings never clip", () => {
    for (const archetype of Object.keys(attackSheetDefinitions)) {
      expect(getAttackDurationMs(archetype), `${archetype} swing duration`)
        .toBeLessThan(PLAYER_MELEE_COOLDOWN_MS);
    }
  });
});

function readPngSize(path: string): { width: number; height: number } {
  const header = readFileSync(path).subarray(16, 24);

  return { width: header.readUInt32BE(0), height: header.readUInt32BE(4) };
}
