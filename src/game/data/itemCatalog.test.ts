import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { DropTableDefinition, ItemDefinition, ItemRarity } from "../types/dataDefinitions";
import type { EquipmentSlot } from "../types/gameState";

const dataPath = join(process.cwd(), "public", "assets", "data");

function readDataFile<T>(fileName: string): T[] {
  return JSON.parse(readFileSync(join(dataPath, fileName), "utf8")) as T[];
}

describe("item catalog", () => {
  const items = readDataFile<ItemDefinition>("items.json");
  const dropTables = readDataFile<DropTableDefinition>("drop-tables.json");

  it("covers the M6 item expansion counts, levels, rarity tiers, and slots", () => {
    expect(items.length).toBeGreaterThanOrEqual(300);
    expect(countByType("weapon")).toBeGreaterThanOrEqual(20);
    expect(countByType("armor")).toBeGreaterThanOrEqual(20);
    expect(countByType("accessory")).toBeGreaterThanOrEqual(20);
    expect(countByType("material")).toBeGreaterThanOrEqual(20);
    expect(countByType("consumable")).toBeGreaterThanOrEqual(10);
    expect(items.filter((item) => item.type === "sigil" || item.type === "support").length).toBeGreaterThanOrEqual(10);
    expect(Math.min(...items.map((item) => item.level ?? 1))).toBe(1);
    expect(Math.max(...items.map((item) => item.level ?? 1))).toBeGreaterThanOrEqual(99);

    const rarities = new Set(items.map((item) => item.rarity));
    expect(rarities).toEqual(new Set<ItemRarity>(["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"]));

    const visibleSlots = new Set<EquipmentSlot>();
    for (const item of items) {
      for (const slot of item.validEquipmentSlots ?? []) {
        visibleSlots.add(slot);
      }
    }
    expect(visibleSlots).toEqual(new Set<EquipmentSlot>([
      "weapon",
      "offhand",
      "head",
      "body",
      "cloak",
      "boots",
      "accessory1",
      "accessory2",
      "sigil",
      "supportCharm",
    ]));
  });

  it("provides class weapon paths and rarity-addressed drop tables", () => {
    const weaponTypes = new Set(items.filter((item) => item.type === "weapon").map((item) => item.weaponType));

    expect(Array.from(weaponTypes)).toEqual(expect.arrayContaining([
      "sword",
      "greatsword",
      "staff",
      "wand",
      "bow",
      "crossbow",
      "dagger",
      "shortsword",
    ]));
    expect(dropTables.flatMap((table) => table.entries).some((entry) => entry.rarity === "Mythic")).toBe(true);
  });

  function countByType(type: ItemDefinition["type"]): number {
    return items.filter((item) => item.type === type).length;
  }
});
