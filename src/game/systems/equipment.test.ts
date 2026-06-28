import { beforeEach, describe, expect, it } from "vitest";
import { createNewGameState } from "../data/gameState";
import { compareEquipmentItems, equipItem, getEquipmentStats, getItemEquipmentStats, getItemSellValue, removeEquipment } from "./equipment";
import { eventBus } from "./eventBus";
import type { ItemDefinition } from "../types/dataDefinitions";

describe("equipment", () => {
  beforeEach(() => {
    eventBus.clear();
  });

  it("equips owned weapons, removes gear, and emits changes", () => {
    const state = createNewGameState();
    const events: string[] = [];
    eventBus.on("equipmentChanged", ({ slot, itemId }) => events.push(`${slot}:${itemId ?? "empty"}`));

    removeEquipment(state, "weapon");
    expect(state.equipment.weapon).toBeNull();
    expect(getEquipmentStats(state.equipment, getItem).attack).toBe(0);

    expect(equipItem(state, getItem("training-sword"))).toBe(true);
    expect(state.equipment.weapon).toBe("training-sword");
    expect(getEquipmentStats(state.equipment, getItem).attack).toBe(2);
    expect(events).toEqual(["weapon:empty", "weapon:training-sword"]);
  });

  it("rejects missing or unequippable items", () => {
    const state = createNewGameState();

    expect(equipItem(state, {
      id: "borrowed-sword",
      name: "Borrowed Sword",
      description: "",
      type: "weapon",
      value: 25,
    }, false)).toBe(false);
    expect(equipItem(state, {
      id: "jelly-gel",
      name: "Jelly Gel",
      description: "",
      type: "material",
      value: 2,
    }, false)).toBe(false);
    expect(state.equipment.weapon).toBe("training-sword");
  });

  it("reports stat increases and decreases through equipment stat deltas", () => {
    const strongWeapon = getItem("strong-sword");
    const weakWeapon = getItem("training-sword");

    expect(getEquipmentStats({ ...createNewGameState().equipment, weapon: strongWeapon.id }, (id) => (
      id === strongWeapon.id ? strongWeapon : weakWeapon
    )).attack - getEquipmentStats({ ...createNewGameState().equipment, weapon: weakWeapon.id }, getItem).attack).toBe(3);
    expect(getEquipmentStats({ ...createNewGameState().equipment, weapon: weakWeapon.id }, getItem).attack - getEquipmentStats({ ...createNewGameState().equipment, weapon: strongWeapon.id }, (id) => (
      id === strongWeapon.id ? strongWeapon : weakWeapon
    )).attack).toBe(-3);
  });

  it("compares current and next equipment stats", () => {
    const comparison = compareEquipmentItems(getItem("training-sword"), getItem("strong-sword"));

    expect(comparison.current).toMatchObject({ attack: 2, defense: 0 });
    expect(comparison.next).toMatchObject({ attack: 5, defense: 0 });
    expect(comparison.delta).toMatchObject({ attack: 3, defense: 0 });
    expect(getItemEquipmentStats(getItem("leather-vest"))).toMatchObject({ attack: 0, defense: 2 });
  });

  it("stacks multiple slots and supports two accessories", () => {
    const state = createNewGameState();
    state.inventory.items.push(
      { id: "swift-ring", quantity: 1 },
      { id: "lucky-ring", quantity: 1 },
      { id: "leather-vest", quantity: 1 },
    );

    expect(equipItem(state, getItem("swift-ring"), false)).toBe(true);
    expect(equipItem(state, getItem("lucky-ring"), false)).toBe(true);
    expect(equipItem(state, getItem("leather-vest"), false)).toBe(true);

    expect(state.equipment.accessory1).toBe("swift-ring");
    expect(state.equipment.accessory2).toBe("lucky-ring");
    expect(state.equipment.body).toBe("leather-vest");
    expect(getEquipmentStats(state.equipment, getItem)).toMatchObject({
      attack: 2,
      defense: 2,
      crit: 1,
      dropChance: 2,
    });
  });

  it("enforces class weapon restrictions and two-handed offhand rules", () => {
    const state = createNewGameState();
    state.inventory.items.push(
      { id: "apprentice-staff", quantity: 1 },
      { id: "rusted-buckler", quantity: 1 },
    );

    expect(equipItem(state, getItem("apprentice-staff"), false, {
      id: "swordsman",
      name: "Swordsman",
      description: "",
      roleSummary: "",
      recommendedStats: [],
      difficultyRating: "Easy",
      baseStats: { hp: 1, sp: 1, attack: 1, defense: 1 },
      growthRates: { hp: 1, sp: 1, attack: 1, defense: 1 },
      startingWeaponId: "training-sword",
      allowedWeaponTypes: ["sword"],
      startingSkillIds: [],
      startingItemIds: [],
      advancedClassOptions: [],
    })).toBe(false);

    expect(equipItem(state, getItem("apprentice-staff"), false, undefined, undefined, getItem)).toBe(true);
    expect(equipItem(state, getItem("rusted-buckler"), false, undefined, "offhand", getItem)).toBe(false);
  });

  it("applies rarity to declared item stats and sell value", () => {
    const item = getItem("legendary-guard");

    expect(getItemEquipmentStats(item)).toMatchObject({
      defense: 8,
      magicDefense: 4,
    });
    expect(getItemSellValue(item)).toBe(180);
  });

  it("equips only one sigil and applies its build-defining effects", () => {
    const state = createNewGameState();
    state.inventory.items.push(
      { id: "wolf-sigil", quantity: 1 },
      { id: "flame-sigil", quantity: 1 },
      { id: "fake-sigil-token", quantity: 1 },
    );

    expect(equipItem(state, getItem("fake-sigil-token"), false, undefined, "sigil")).toBe(false);
    expect(equipItem(state, getItem("wolf-sigil"), false)).toBe(true);
    expect(state.equipment.sigil).toBe("wolf-sigil");
    expect(getEquipmentStats(state.equipment, getItem)).toMatchObject({
      attack: 6,
      attackSpeed: 2,
      raceDamage: { beast: 3 },
    });

    expect(equipItem(state, getItem("flame-sigil"), false)).toBe(true);
    expect(state.equipment.sigil).toBe("flame-sigil");
    expect(getEquipmentStats(state.equipment, getItem)).toMatchObject({
      magicAttack: 3,
      elementDamage: { fire: 5 },
      resistances: { fire: 2 },
    });
  });
});

function getItem(id: string): ItemDefinition {
  if (id === "training-sword") {
    return {
      id,
      name: "Training Sword",
      description: "",
      type: "weapon",
      value: 10,
    };
  }

  if (id === "strong-sword") {
    return {
      id,
      name: "Strong Sword",
      description: "",
      type: "weapon",
      value: 25,
    };
  }

  if (id === "leather-vest") {
    return {
      id,
      name: "Leather Vest",
      description: "",
      type: "armor",
      value: 12,
    };
  }

  if (id === "swift-ring") {
    return {
      id,
      name: "Swift Ring",
      description: "",
      type: "accessory",
      value: 18,
      validEquipmentSlots: ["accessory1", "accessory2"],
      statModifiers: { derivedStats: { crit: 1 } },
    };
  }

  if (id === "lucky-ring") {
    return {
      id,
      name: "Lucky Ring",
      description: "",
      type: "accessory",
      value: 20,
      validEquipmentSlots: ["accessory1", "accessory2"],
      statModifiers: { derivedStats: { dropChance: 2 } },
    };
  }

  if (id === "apprentice-staff") {
    return {
      id,
      name: "Apprentice Staff",
      description: "",
      type: "weapon",
      value: 12,
      weaponType: "staff",
      twoHanded: true,
    };
  }

  if (id === "rusted-buckler") {
    return {
      id,
      name: "Rusted Buckler",
      description: "",
      type: "armor",
      value: 12,
      equipmentSlot: "offhand",
      validEquipmentSlots: ["offhand"],
      statModifiers: { derivedStats: { defense: 2 } },
    };
  }

  if (id === "legendary-guard") {
    return {
      id,
      name: "Legendary Guard",
      description: "",
      type: "armor",
      value: 60,
      rarity: "Legendary",
      equipmentSlot: "body",
      validEquipmentSlots: ["body"],
      statModifiers: { derivedStats: { defense: 4, magicDefense: 2 } },
    };
  }

  if (id === "wolf-sigil") {
    return {
      id,
      name: "Wolf Sigil",
      description: "",
      type: "sigil",
      value: 60,
      equipmentSlot: "sigil",
      validEquipmentSlots: ["sigil"],
      statModifiers: { derivedStats: { physicalAttack: 4, attackSpeed: 2 }, raceDamage: { beast: 3 } },
    };
  }

  if (id === "flame-sigil") {
    return {
      id,
      name: "Flame Sigil",
      description: "",
      type: "sigil",
      value: 60,
      equipmentSlot: "sigil",
      validEquipmentSlots: ["sigil"],
      statModifiers: { derivedStats: { magicAttack: 3 }, elementDamage: { fire: 5 }, resistances: { fire: 2 } },
    };
  }

  if (id === "fake-sigil-token") {
    return {
      id,
      name: "Fake Sigil Token",
      description: "",
      type: "material",
      value: 1,
      validEquipmentSlots: ["sigil"],
    };
  }

  throw new Error(`Unknown item ${id}`);
}
