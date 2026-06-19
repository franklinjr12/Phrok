import { beforeEach, describe, expect, it } from "vitest";
import { createNewGameState } from "../data/gameState";
import { compareEquipmentItems, equipItem, getEquipmentStats, getItemEquipmentStats, removeEquipment } from "./equipment";
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

    expect(comparison.current).toEqual({ attack: 2, defense: 0 });
    expect(comparison.next).toEqual({ attack: 5, defense: 0 });
    expect(comparison.delta).toEqual({ attack: 3, defense: 0 });
    expect(getItemEquipmentStats(getItem("leather-vest"))).toEqual({ attack: 0, defense: 2 });
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

  throw new Error(`Unknown item ${id}`);
}
