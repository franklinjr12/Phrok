import { beforeEach, describe, expect, it } from "vitest";
import { createNewGameState } from "../data/gameState";
import { eventBus } from "./eventBus";
import {
  depositStorageItem,
  getContainerEntries,
  getFilteredStorageEntries,
  withdrawStorageItem,
  type StorageListOptions,
} from "./storage";
import type { ItemDefinition } from "../types/dataDefinitions";

describe("storage", () => {
  beforeEach(() => {
    eventBus.clear();
  });

  it("deposits and withdraws stackable items without changing gold", () => {
    const state = createNewGameState();
    const item = getItem("jelly-gel");
    const events: string[] = [];
    state.inventory.items.push({ id: item.id, quantity: 3 });
    state.inventory.gold = 77;
    state.playerProfile.gold = 77;
    eventBus.on("storageChanged", ({ storage }) => events.push(storage.items.map((entry) => `${entry.id}:${entry.quantity}`).join("|")));

    expect(depositStorageItem(state, item, 2)).toMatchObject({
      success: true,
      itemId: "jelly-gel",
      quantity: 2,
      gold: 77,
      storageQuantity: 2,
    });
    expect(state.inventory.items).toContainEqual({ id: "jelly-gel", quantity: 1 });
    expect(state.storage.items).toContainEqual({ id: "jelly-gel", quantity: 2 });

    expect(withdrawStorageItem(state, item, 1)).toMatchObject({
      success: true,
      itemId: "jelly-gel",
      quantity: 1,
      gold: 77,
      inventoryQuantity: 2,
    });
    expect(state.inventory.gold).toBe(77);
    expect(state.playerProfile.gold).toBe(77);
    expect(events).toEqual(["jelly-gel:2", "jelly-gel:1"]);
  });

  it("moves equipment instances through shared storage without replacing instance ids", () => {
    const state = createNewGameState();
    const item = getItem("rare-sword");
    state.inventory.items = [];
    state.inventory.equipmentInstances = [
      { instanceId: "rare-sword-a", itemId: "rare-sword" },
      { instanceId: "rare-sword-b", itemId: "rare-sword" },
    ];

    expect(depositStorageItem(state, item)).toMatchObject({ success: true, storageQuantity: 1 });
    expect(state.inventory.equipmentInstances).toEqual([{ instanceId: "rare-sword-b", itemId: "rare-sword" }]);
    expect(state.storage.equipmentInstances).toEqual([{ instanceId: "rare-sword-a", itemId: "rare-sword" }]);

    expect(withdrawStorageItem(state, item)).toMatchObject({ success: true, inventoryQuantity: 2 });
    expect(state.inventory.equipmentInstances.map((entry) => entry.instanceId)).toEqual(["rare-sword-b", "rare-sword-a"]);
    expect(state.storage.equipmentInstances).toEqual([]);
  });

  it("filters by category, rarity, class, level, name, and sorts", () => {
    const entries = getContainerEntries([
      { id: "jelly-gel", quantity: 4 },
      { id: "minor-health-potion", quantity: 2 },
      { id: "moonlit-reed", quantity: 1 },
    ], [
      { instanceId: "rare-sword-a", itemId: "rare-sword" },
      { instanceId: "high-axe-a", itemId: "high-axe" },
    ]);
    const options: StorageListOptions = {
      category: "all",
      rarity: "all",
      classFilter: "all",
      levelFilter: "all",
      classId: "swordsman",
      playerLevel: 10,
      nameSearch: "",
      sortMode: "name",
      sortDirection: "asc",
    };

    expect(getFilteredStorageEntries(entries, { ...options, category: "equipment" }, getItem).map((entry) => entry.itemId))
      .toEqual(["high-axe", "rare-sword"]);
    expect(getFilteredStorageEntries(entries, { ...options, rarity: "Rare" }, getItem).map((entry) => entry.itemId))
      .toEqual(["moonlit-reed", "rare-sword"]);
    expect(getFilteredStorageEntries(entries, { ...options, classFilter: "current" }, getItem).map((entry) => entry.itemId))
      .not.toContain("high-axe");
    expect(getFilteredStorageEntries(entries, { ...options, levelFilter: "usable" }, getItem).map((entry) => entry.itemId))
      .not.toContain("high-axe");
    expect(getFilteredStorageEntries(entries, { ...options, nameSearch: "potion" }, getItem).map((entry) => entry.itemId))
      .toEqual(["minor-health-potion"]);
    expect(getFilteredStorageEntries(entries, { ...options, sortMode: "level", sortDirection: "desc" }, getItem).map((entry) => entry.itemId)[0])
      .toBe("high-axe");
    expect(getFilteredStorageEntries(entries, { ...options, sortMode: "quantity", sortDirection: "desc" }, getItem).map((entry) => entry.itemId)[0])
      .toBe("jelly-gel");
  });
});

function getItem(id: string): ItemDefinition {
  const items: Record<string, ItemDefinition> = {
    "jelly-gel": {
      id,
      name: "Jelly Gel",
      description: "",
      type: "material",
      rarity: "Common",
      level: 1,
      value: 2,
    },
    "minor-health-potion": {
      id,
      name: "Minor Health Potion",
      description: "",
      type: "consumable",
      rarity: "Common",
      level: 1,
      value: 6,
    },
    "moonlit-reed": {
      id,
      name: "Moonlit Reed",
      description: "",
      type: "material",
      rarity: "Rare",
      level: 18,
      value: 35,
    },
    "rare-sword": {
      id,
      name: "Rare Sword",
      description: "",
      type: "weapon",
      rarity: "Rare",
      level: 8,
      allowedClassIds: ["swordsman"],
      value: 40,
    },
    "high-axe": {
      id,
      name: "High Axe",
      description: "",
      type: "weapon",
      rarity: "Epic",
      level: 45,
      allowedClassIds: ["merchant"],
      value: 80,
    },
  };

  const item = items[id];

  if (!item) {
    throw new Error(`Unknown item ${id}`);
  }

  return item;
}
