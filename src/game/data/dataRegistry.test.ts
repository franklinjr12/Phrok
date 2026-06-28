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
    { id: "training-sword", name: "Training Sword", type: "weapon", rarity: "Uncommon", weaponType: "sword" },
    { id: "jelly-gel", name: "Jelly Gel", type: "material" },
    {
      id: "minor-health-potion",
      name: "Minor Health Potion",
      type: "consumable",
      consumableEffect: {
        restoreHp: 35,
        cooldownMs: 8000,
        statusEffectIds: [],
      },
    },
  ],
  "monsters.json": [{ id: "green-jelly", name: "Green Jelly", hp: 10, attack: 2, dropTableId: "green-jelly-drops" }],
  "regions.json": [
    {
      id: "crownfield",
      name: "Crownfield",
      levelRange: { min: 1, max: 8 },
      mapIds: ["crownfield-meadows"],
      dungeonIds: [],
      monsterIds: ["green-jelly"],
      bossIds: [],
    },
  ],
  "drop-tables.json": [
    {
      id: "green-jelly-drops",
      entries: [
        { itemId: "jelly-gel", chance: 1 },
        { rarity: "Rare", chance: 0.2 },
        { type: "gold", chance: 1, minQuantity: 3, maxQuantity: 5 },
      ],
    },
  ],
  "maps.json": [
    {
      id: "crownfield-meadows",
      name: "Crownfield Meadows",
      regionId: "crownfield",
      levelRange: { min: 2, max: 6 },
      type: "field",
      portals: [
        {
          id: "town-road-return",
          targetMapId: "crownfield-town",
          targetSpawnName: "FieldRoadReturn",
        },
      ],
      spawnGroups: [{ id: "starter-spawns", monsterIds: ["green-jelly"], maxCount: 2 }],
      musicKey: "music-crownfield-meadows",
      recommendedElements: ["neutral", "fire"],
      dropHighlights: ["jelly-gel"],
    },
  ],
  "dungeons.json": [
    {
      id: "old-sewers",
      mapId: "old-sewers",
      name: "Old Sewers",
      levelRange: { min: 5, max: 15 },
      bossId: "sewer-glutton",
      roomPlan: [
        { id: "sluice-gate", name: "Sluice Gate", encounterRole: "entrance" },
        { id: "cistern", name: "Cistern", encounterRole: "boss" },
      ],
      enemyThemes: ["beast"],
      hazardIds: ["sludge"],
      hazards: [{ id: "sludge", name: "Sludge", effect: "slow" }],
      rewardItemIds: ["jelly-gel"],
      rareMaterialIds: ["jelly-gel"],
      mechanics: ["dense packs"],
      bossMechanics: ["devour"],
    },
  ],
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
      shopId: "field-shop",
    },
  ],
  "shops.json": [
    {
      id: "field-shop",
      name: "Field Shop",
      regionId: "crownfield",
      mapId: "crownfield-meadows",
      npcId: "field-guide",
      serviceType: "shop",
      stock: [{ itemId: "minor-health-potion", quantity: 3, priceMultiplier: 1.5 }],
    },
    {
      id: "field-appraiser",
      name: "Field Appraiser",
      regionId: "crownfield",
      mapId: "crownfield-meadows",
      npcId: "field-guide",
      serviceType: "appraiser",
      stock: [],
      appraiser: {
        identifyCostMultiplier: 0.4,
        minIdentifyCost: 12,
        improvedSellMultiplier: 1.3,
      },
    },
  ],
  "recipes.json": [
    {
      id: "training-sword-repair",
      name: "Training Sword Repair",
      outputItemId: "training-sword",
      outputQuantity: 1,
      requiredMaterials: [{ itemId: "jelly-gel", quantity: 2 }],
      requiredGold: 5,
      requiredLevel: 2,
      requiredRegionId: "crownfield",
      requiredNpcId: "field-guide",
      unlockCondition: { type: "npc", npcId: "field-guide" },
    },
  ],
  "supports.json": [{
    id: "mira",
    name: "Mira",
    maxLevel: 4,
    affinityPerLevel: 25,
    effects: {
      derivedStats: { weightLimit: 12 },
      autoPickupFilters: ["materials"],
    },
    actions: [{
      id: "mira-heal",
      name: "Mira Heal",
      trigger: "lowHp",
      cooldownMs: 9000,
      minLevel: 1,
      hpThresholdPercent: 40,
      restoreHp: 10,
    }],
  }],
  "quests.json": [{
    id: "first-steps",
    name: "First Steps",
    type: "main",
    objectives: [{
      id: "enter-meadow",
      type: "visitMap",
      targetId: "crownfield-meadows",
      targetCount: 1,
      regionHint: "Crownfield Meadows",
      mapId: "crownfield-meadows",
    }],
    rewards: {
      xp: 40,
      gold: 12,
      items: [{ itemId: "jelly-gel", quantity: 2 }],
      unlockFlags: ["meadows-clear"],
    },
    requiredLevel: 1,
    requiredFlags: [],
    unlockFlags: ["act1"],
    npcStart: "field-guide",
    npcTurnIn: "field-guide",
    mapMarkers: [{ mapId: "crownfield-meadows", label: "Meadow", x: 1, y: 2 }],
  }],
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
    expect(registry.getItems().map((entry) => entry.id)).toEqual(["training-sword", "jelly-gel", "minor-health-potion"]);
    expect(registry.getItem("training-sword")).toMatchObject({
      value: 0,
      rarity: "Uncommon",
      icon: "placeholder-training-sword",
      validEquipmentSlots: ["weapon"],
      weaponType: "sword",
      appraisable: false,
    });
    expect(registry.getItem("minor-health-potion").consumableEffect).toEqual({
      restoreHp: 35,
      restoreSp: undefined,
      cooldownMs: 8000,
      statusEffectIds: [],
      persistThroughMapTransition: false,
    });
    expect(registry.getMonster("green-jelly")).toMatchObject({
      dropTableId: "green-jelly-drops",
      behavior: "passive",
      aggroRange: 180,
      attackRange: 70,
      leashDistance: 320,
      leashTimeoutMs: 8000,
      assistRadius: 140,
      castRange: 160,
      castCooldownMs: 2200,
      respawnMs: 8000,
      elite: false,
      boss: false,
    });
    expect(registry.getRegions().map((entry) => entry.id)).toEqual(["crownfield"]);
    expect(registry.getRegion("crownfield")).toMatchObject({
      levelRange: { min: 1, max: 8 },
      mapIds: ["crownfield-meadows"],
      monsterIds: ["green-jelly"],
    });
    expect(registry.getDropTable("green-jelly-drops").entries).toContainEqual({
      itemId: undefined,
      type: "gold",
      rarity: undefined,
      chance: 1,
      minQuantity: 3,
      maxQuantity: 5,
    });
    expect(registry.getDropTable("green-jelly-drops").entries).toContainEqual({
      itemId: undefined,
      type: "item",
      rarity: "Rare",
      chance: 0.2,
      minQuantity: 1,
      maxQuantity: 1,
    });
    expect(registry.getMap("crownfield-meadows")).toMatchObject({
      regionId: "crownfield",
      levelRange: { min: 2, max: 6 },
      type: "field",
      musicKey: "music-crownfield-meadows",
      recommendedElements: ["neutral", "fire"],
      dropHighlights: ["jelly-gel"],
      tilemapKey: "map-crownfield-meadows",
    });
    expect(registry.getMap("crownfield-meadows").portals[0]).toMatchObject({
      name: "town-road-return",
      targetMapId: "crownfield-town",
    });
    expect(registry.getMap("crownfield-meadows").spawnGroups[0]).toMatchObject({
      id: "starter-spawns",
      monsterIds: ["green-jelly"],
      maxCount: 2,
    });
    expect(registry.getMaps().map((entry) => entry.id)).toEqual(["crownfield-meadows"]);
    expect(registry.getDungeon("old-sewers")).toMatchObject({
      mapId: "old-sewers",
      bossId: "sewer-glutton",
      replayable: true,
      shortcutUnlockId: "",
      roomPlan: [
        { id: "sluice-gate", name: "Sluice Gate", encounterRole: "entrance" },
        { id: "cistern", name: "Cistern", encounterRole: "boss" },
      ],
    });
    expect(registry.getDungeonByMapId("old-sewers")?.id).toBe("old-sewers");
    expect(registry.getDialogue("field-guide-greeting").choices).toContainEqual({
      id: "guide-service",
      label: "Ask for guidance",
      disabled: true,
    });
    expect(registry.getNpc("field-guide")).toMatchObject({
      interactionRadius: 72,
      dialogueId: "field-guide-greeting",
      serviceType: "guide",
      shopId: "field-shop",
    });
    expect(registry.getShop("field-shop")).toMatchObject({
      name: "Field Shop",
      regionId: "crownfield",
      mapId: "crownfield-meadows",
      npcId: "field-guide",
      serviceType: "shop",
      stock: [{ itemId: "minor-health-potion", quantity: 3, priceMultiplier: 1.5 }],
    });
    expect(registry.getShop("field-appraiser").appraiser).toEqual({
      identifyCostMultiplier: 0.4,
      minIdentifyCost: 12,
      improvedSellMultiplier: 1.3,
    });
    expect(registry.getShopByNpcId("field-guide")?.id).toBe("field-shop");
    expect(registry.getRecipes()[0]).toMatchObject({
      id: "training-sword-repair",
      outputItemId: "training-sword",
      outputQuantity: 1,
      requiredMaterials: [{ itemId: "jelly-gel", quantity: 2 }],
      requiredGold: 5,
      requiredLevel: 2,
      requiredRegionId: "crownfield",
      requiredNpcId: "field-guide",
      unlockCondition: { type: "npc", npcId: "field-guide" },
      ingredientItemIds: ["jelly-gel"],
      resultItemId: "training-sword",
    });
    expect(registry.getSupport("mira")).toMatchObject({
      skillIds: [],
      maxLevel: 4,
      affinityPerLevel: 25,
      effects: {
        derivedStats: { weightLimit: 12 },
        autoPickupFilters: ["materials"],
      },
      actions: [{
        id: "mira-heal",
        trigger: "lowHp",
        cooldownMs: 9000,
        minLevel: 1,
        hpThresholdPercent: 40,
        restoreHp: 10,
      }],
    });
    expect(registry.getQuest("first-steps")).toMatchObject({
      type: "main",
      objectives: [{
        id: "enter-meadow",
        type: "visitMap",
        targetId: "crownfield-meadows",
        targetCount: 1,
      }],
      rewards: {
        xp: 40,
        gold: 12,
        items: [{ itemId: "jelly-gel", quantity: 2 }],
        unlockFlags: ["meadows-clear"],
      },
      requiredLevel: 1,
      npcStart: "field-guide",
      npcTurnIn: "field-guide",
    });
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
