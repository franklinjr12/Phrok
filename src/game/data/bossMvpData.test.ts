import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import type { ItemDefinition, MonsterDefinition } from "../types/dataDefinitions";

const mvpIds = [
  "king-slime-verdant",
  "thorn-matriarch",
  "sunken-corsair",
  "brass-burrower",
  "dune-tyrant",
  "bell-wraith",
  "rune-chimera",
  "fallen-star-saint",
];

describe("boss and MVP data", () => {
  it("defines regional MVPs with phases, rituals, respawn timers, loot, and bestiary-ready monster IDs", () => {
    const monsters = readJson<MonsterDefinition>("monsters.json");
    const items = readJson<ItemDefinition>("items.json");
    const itemIds = new Set(items.map((item) => item.id));

    const mvps = mvpIds.map((id) => {
      const monster = monsters.find((entry) => entry.id === id);
      if (!monster) {
        throw new Error(`Missing MVP ${id}`);
      }
      return monster;
    });

    expect(mvps).toHaveLength(8);
    for (const mvp of mvps) {
      expect(mvp.boss).toBe(true);
      expect(mvp.bossArena?.locksEncounter).toBe(true);
      expect(mvp.bossArena?.canLeaveAfterVictory).toBe(true);
      expect(mvp.bossPhases?.map((phase) => phase.hpPercent)).toEqual([100, 66, 33]);
      expect(mvp.bossPhases?.every((phase) => phase.attackIds.length > 0)).toBe(true);
      expect(mvp.mvp?.regional).toBe(true);
      expect(mvp.mvp?.summon.repeatable).toBe(true);
      expect(mvp.mvp?.summon.requiredMaterials.length).toBeGreaterThanOrEqual(2);
      expect(mvp.mvp?.respawnActivityMs).toBeGreaterThan(0);
      expect(mvp.mvp?.specialRewardItemIds.every((itemId) => itemIds.has(itemId))).toBe(true);
    }
  });
});

function readJson<T>(fileName: string): T[] {
  return JSON.parse(readFileSync(new URL(`../../../public/assets/data/${fileName}`, import.meta.url), "utf8")) as T[];
}
