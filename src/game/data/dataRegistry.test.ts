import { describe, expect, it } from "vitest";
import { loadDataRegistry } from "./dataRegistry";

const validFiles: Record<string, unknown[]> = {
  "classes.json": [
    {
      id: "swordsman",
      name: "Swordsman",
      baseStats: { hp: 30, sp: 8, attack: 6, defense: 4 },
      growthRates: { hp: 5, sp: 2, attack: 3, defense: 3 },
      startingWeaponId: "training-sword",
      startingSkillIds: ["power-slash"],
      startingItemIds: ["training-sword"],
      advancedClassOptions: ["Knight"],
    },
  ],
  "skills.json": [{ id: "power-slash", name: "Power Slash", classId: "swordsman", power: 12 }],
  "items.json": [
    { id: "training-sword", name: "Training Sword", type: "weapon" },
    { id: "jelly-gel", name: "Jelly Gel", type: "material" },
  ],
  "monsters.json": [{ id: "green-jelly", name: "Green Jelly", hp: 10, attack: 2, dropTableId: "green-jelly-drops" }],
  "drop-tables.json": [
    {
      id: "green-jelly-drops",
      entries: [
        { itemId: "jelly-gel", chance: 1 },
        { type: "gold", chance: 1, minQuantity: 3, maxQuantity: 5 },
      ],
    },
  ],
  "maps.json": [{ id: "crownfield-meadows", name: "Crownfield Meadows" }],
  "dialogues.json": [
    {
      id: "field-guide-greeting",
      lines: ["Keep your boots on the road."],
      choices: [{ id: "guide-service", label: "Ask for guidance", disabled: true }],
    },
  ],
  "npcs.json": [
    {
      id: "field-guide",
      name: "Field Guide",
      mapId: "crownfield-meadows",
      dialogueId: "field-guide-greeting",
      serviceType: "guide",
    },
  ],
  "recipes.json": [{ id: "training-sword-repair", name: "Training Sword Repair", resultItemId: "training-sword" }],
  "supports.json": [{ id: "mira", name: "Mira" }],
  "quests.json": [{ id: "first-steps", name: "First Steps" }],
  "status-effects.json": [
    {
      id: "guarded",
      name: "Guarded",
      type: "buff",
      duration: 5000,
      tickInterval: 1000,
      stackBehavior: "refresh",
      maxStacks: 1,
      statModifiers: { derivedStats: { defense: 5 } },
      visualIcon: "icon-status-guarded",
      dispelRules: { dispellable: true, categories: ["boon"] },
    },
  ],
  "xp-tables.json": [{ id: "standard", levels: { "1": 0, "2": 100 } }],
  "difficulties.json": [{ id: "normal", name: "Normal" }],
};

describe("loadDataRegistry", () => {
  it("loads typed JSON data and returns entries by ID", async () => {
    const registry = await loadDataRegistry("/assets/data", createFetch(validFiles));

    expect(registry.getClasses().map((entry) => entry.id)).toEqual(["swordsman"]);
    expect(registry.getClass("swordsman").startingSkillIds).toEqual(["power-slash"]);
    expect(registry.getClass("swordsman").startingWeaponId).toBe("training-sword");
    expect(registry.getClass("swordsman").difficultyRating).toBe("Normal");
    expect(registry.getSkill("power-slash")).toMatchObject({
      spCost: 0,
      target: "enemy",
      type: "active",
      targetingMode: "enemy",
      requiredLevel: 1,
      maxSkillLevel: 5,
      cooldown: 0,
      range: 72,
      element: "neutral",
      icon: "power-slash",
    });
    expect(registry.getSkillsByClass("swordsman").map((skill) => skill.id)).toEqual(["power-slash"]);
    expect(registry.getItem("training-sword")).toMatchObject({ value: 0 });
    expect(registry.getMonster("green-jelly").dropTableId).toBe("green-jelly-drops");
    expect(registry.getDropTable("green-jelly-drops").entries).toContainEqual({
      itemId: undefined,
      type: "gold",
      chance: 1,
      minQuantity: 3,
      maxQuantity: 5,
    });
    expect(registry.getMap("crownfield-meadows").monsterIds).toEqual([]);
    expect(registry.getDialogue("field-guide-greeting").choices).toContainEqual({
      id: "guide-service",
      label: "Ask for guidance",
      disabled: true,
    });
    expect(registry.getNpc("field-guide")).toMatchObject({
      interactionRadius: 72,
      dialogueId: "field-guide-greeting",
      serviceType: "guide",
    });
    expect(registry.getSupport("mira").skillIds).toEqual([]);
    expect(registry.getStatusEffect("guarded")).toMatchObject({
      type: "buff",
      duration: 5000,
      tickInterval: 1000,
      stackBehavior: "refresh",
      statModifiers: { derivedStats: { defense: 5 } },
      visualIcon: "icon-status-guarded",
      dispelRules: { dispellable: true, categories: ["boon"] },
    });
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
