import { describe, expect, it } from "vitest";
import { loadDataRegistry } from "./dataRegistry";

const validFiles: Record<string, unknown[]> = {
  "classes.json": [
    {
      id: "swordsman",
      name: "Swordsman",
      baseStats: { hp: 30, sp: 8, attack: 6, defense: 4 },
      startingSkillIds: ["power-slash"],
      startingItemIds: ["training-sword"],
    },
  ],
  "skills.json": [{ id: "power-slash", name: "Power Slash", classId: "swordsman", power: 12 }],
  "items.json": [{ id: "training-sword", name: "Training Sword", type: "weapon" }],
  "monsters.json": [{ id: "green-jelly", name: "Green Jelly", hp: 10, attack: 2, dropTableId: "green-jelly-drops" }],
  "drop-tables.json": [{ id: "green-jelly-drops", entries: [{ itemId: "training-sword", chance: 1 }] }],
  "maps.json": [{ id: "crownfield-meadows", name: "Crownfield Meadows" }],
  "npcs.json": [{ id: "field-guide", name: "Field Guide", mapId: "crownfield-meadows" }],
  "recipes.json": [{ id: "training-sword-repair", name: "Training Sword Repair", resultItemId: "training-sword" }],
  "supports.json": [{ id: "mira", name: "Mira" }],
  "quests.json": [{ id: "first-steps", name: "First Steps" }],
  "status-effects.json": [{ id: "guarded", name: "Guarded" }],
  "xp-tables.json": [{ id: "standard", levels: { "1": 0, "2": 100 } }],
  "difficulties.json": [{ id: "normal", name: "Normal" }],
};

describe("loadDataRegistry", () => {
  it("loads typed JSON data and returns entries by ID", async () => {
    const registry = await loadDataRegistry("/assets/data", createFetch(validFiles));

    expect(registry.getClass("swordsman").startingSkillIds).toEqual(["power-slash"]);
    expect(registry.getSkill("power-slash")).toMatchObject({ spCost: 0, target: "enemy" });
    expect(registry.getItem("training-sword")).toMatchObject({ value: 0 });
    expect(registry.getMonster("green-jelly").dropTableId).toBe("green-jelly-drops");
    expect(registry.getMap("crownfield-meadows").monsterIds).toEqual([]);
    expect(registry.getSupport("mira").skillIds).toEqual([]);
    expect(registry.getDifficulty("normal").enemyHpMultiplier).toBe(1);
  });

  it("throws a clear error for missing IDs", async () => {
    const registry = await loadDataRegistry("/assets/data", createFetch(validFiles));

    expect(() => registry.getItem("missing-item")).toThrow('Missing items data for ID "missing-item".');
  });

  it("includes file name and ID when validation fails", async () => {
    const invalidFiles = {
      ...validFiles,
      "items.json": [{ id: "broken-item", type: "weapon" }],
    };

    await expect(loadDataRegistry("/assets/data", createFetch(invalidFiles))).rejects.toThrow(
      'items.json entry "broken-item" is missing name',
    );
  });
});

function createFetch(files: Record<string, unknown[]>): Parameters<typeof loadDataRegistry>[1] {
  return async (path) => {
    const fileName = path.split("/").at(-1) ?? "";
    const data = files[fileName];

    return {
      ok: data !== undefined,
      status: data === undefined ? 404 : 200,
      json: async () => data,
    };
  };
}

