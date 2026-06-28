import { beforeEach, describe, expect, it } from "vitest";
import { createNewGameState } from "../data/gameState";
import { eventBus } from "./eventBus";
import {
  cycleSupportAutoPickupFilter,
  getSupportStatModifier,
  grantSupportAffinity,
  shouldSupportAutoPickup,
  syncEquippedSupportFromEquipment,
  updateSupportCompanion,
} from "./supports";
import type { ItemDefinition, StatusEffectDefinition, SupportDefinition } from "../types/dataDefinitions";

describe("supports", () => {
  beforeEach(() => {
    eventBus.clear();
  });

  it("syncs one equipped support from the support charm slot", () => {
    const state = createNewGameState();
    state.inventory.items.push({ id: "pack-charm", quantity: 1 }, { id: "wisp-charm", quantity: 1 });
    state.equipment.supportCharm = "pack-charm";

    expect(syncEquippedSupportFromEquipment(state, getItem)).toBe("pack-sprite");
    expect(state.support.equippedSupportId).toBe("pack-sprite");
    expect(state.support.levels["pack-sprite"]).toBe(1);

    state.equipment.supportCharm = "wisp-charm";

    expect(syncEquippedSupportFromEquipment(state, getItem)).toBe("shrine-wisp");
    expect(state.support.equippedSupportId).toBe("shrine-wisp");
  });

  it("applies Pack Sprite carry weight, configurable auto-pickup, and emergency potion help", () => {
    const state = createNewGameState();
    state.support.equippedSupportId = "pack-sprite";
    state.support.levels["pack-sprite"] = 1;
    state.support.autoPickupFilter = "materials";
    state.inventory.items.push({ id: "minor-health-potion", quantity: 1 });
    state.character.stats.hp = 10;

    expect(getSupportStatModifier(state, packSprite)?.derivedStats).toEqual({ weightLimit: 24 });
    expect(shouldSupportAutoPickup(state, packSprite, { kind: "item", itemId: "jelly-gel", quantity: 1 }, getItem)).toBe(true);
    expect(shouldSupportAutoPickup(state, packSprite, { kind: "gold", quantity: 4 }, getItem)).toBe(false);

    cycleSupportAutoPickupFilter(state, packSprite);
    expect(state.support.autoPickupFilter).toBe("gold");

    const result = updateSupportCompanion(state, packSprite, getItem, getStatusEffect, 1000);

    expect(result).toMatchObject({ success: true, actionId: "emergency-potion", restoredHp: 35 });
    expect(state.inventory.items.find((item) => item.id === "minor-health-potion")).toBeUndefined();
    expect(state.support.cooldowns["emergency-potion"]).toBe(13000);
  });

  it("lets Shrine Wisp heal, cleanse, bless, and level separately", () => {
    const state = createNewGameState();
    state.support.equippedSupportId = "shrine-wisp";
    state.support.levels["shrine-wisp"] = 1;
    state.character.stats.hp = 20;
    state.character.statusEffects = [{
      id: "poison",
      sourceId: "test",
      stacks: 1,
      appliedAt: 0,
      expiresAt: 5000,
      nextTickAt: 1000,
    }];

    expect(updateSupportCompanion(state, shrineWisp, getItem, getStatusEffect, 1000)).toMatchObject({
      actionId: "minor-heal",
      restoredHp: 18,
    });
    expect(updateSupportCompanion(state, shrineWisp, getItem, getStatusEffect, 2000)).toMatchObject({
      actionId: "cleanse",
      cleansedStatusIds: ["poison"],
    });

    grantSupportAffinity(state, shrineWisp, 60);
    expect(state.support.levels["shrine-wisp"]).toBe(2);

    expect(updateSupportCompanion(state, shrineWisp, getItem, getStatusEffect, 3000)).toMatchObject({
      actionId: "blessing-aura",
      appliedStatusEffectIds: ["blessed"],
    });
  });
});

const packSprite: SupportDefinition = {
  id: "pack-sprite",
  name: "Pack Sprite",
  description: "",
  skillIds: [],
  maxLevel: 5,
  affinityPerLevel: 50,
  effects: {
    derivedStats: { weightLimit: 24 },
    autoPickupFilters: ["materials", "gold", "all"],
  },
  actions: [{
    id: "emergency-potion",
    name: "Emergency Potion",
    trigger: "lowHp",
    cooldownMs: 12000,
    minLevel: 1,
    hpThresholdPercent: 35,
    useConsumableItemId: "minor-health-potion",
  }],
};

const shrineWisp: SupportDefinition = {
  id: "shrine-wisp",
  name: "Shrine Wisp",
  description: "",
  skillIds: [],
  maxLevel: 5,
  affinityPerLevel: 50,
  effects: {
    derivedStats: { magicDefense: 3 },
    raceDamage: { undead: 4 },
  },
  actions: [
    {
      id: "minor-heal",
      name: "Minor Heal",
      trigger: "lowHp",
      cooldownMs: 10000,
      minLevel: 1,
      hpThresholdPercent: 55,
      restoreHp: 18,
    },
    {
      id: "cleanse",
      name: "Cleanse",
      trigger: "statusPresent",
      cooldownMs: 16000,
      minLevel: 1,
      cleanseCategories: ["toxin"],
    },
    {
      id: "blessing-aura",
      name: "Blessing Aura",
      trigger: "combat",
      cooldownMs: 20000,
      minLevel: 2,
      statusEffectIds: ["blessed"],
    },
  ],
};

function getItem(id: string): ItemDefinition {
  if (id === "minor-health-potion") {
    return {
      id,
      name: "Minor Health Potion",
      description: "",
      type: "consumable",
      value: 6,
      consumableEffect: {
        restoreHp: 35,
        cooldownMs: 8000,
        statusEffectIds: [],
        persistThroughMapTransition: false,
      },
    };
  }

  if (id === "jelly-gel") {
    return { id, name: "Jelly Gel", description: "", type: "material", value: 2 };
  }

  if (id === "wisp-charm") {
    return { id, name: "Shrine Wisp Charm", description: "", type: "support", value: 1, supportId: "shrine-wisp" };
  }

  return { id, name: "Pack Sprite Charm", description: "", type: "support", value: 1, supportId: "pack-sprite" };
}

function getStatusEffect(id: string): StatusEffectDefinition {
  if (id === "blessed") {
    return {
      id,
      name: "Blessed",
      description: "",
      type: "buff",
      duration: 8000,
      tickInterval: 1000,
      stackBehavior: "refresh",
      maxStacks: 1,
      statModifiers: { baseStats: { luk: 2 } },
      visualIcon: "icon-status-blessed",
      dispelRules: { dispellable: true, categories: ["boon", "holy"] },
    };
  }

  return {
    id,
    name: "Poison",
    description: "",
    type: "damage",
    duration: 6000,
    tickInterval: 1000,
    stackBehavior: "stack",
    maxStacks: 5,
    statModifiers: {},
    visualIcon: "icon-status-poison",
    dispelRules: { dispellable: true, categories: ["toxin"] },
  };
}
