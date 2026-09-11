import { describe, expect, it, beforeEach } from "vitest";
import { eventBus } from "./eventBus";
import { addGold, addInventoryItem, getInventoryWeight, removeInventoryItem } from "./inventory";
import type { InventoryState } from "../types/gameState";

describe("inventory", () => {
  beforeEach(() => {
    eventBus.clear();
  });

  it("adds stackable items and emits changes", () => {
    const inventory = createInventory();
    const changes: number[] = [];
    eventBus.on("inventoryChanged", ({ inventory }) => changes.push(inventory.items.length));

    addInventoryItem(inventory, {
      id: "jelly-gel",
      name: "Jelly Gel",
      description: "",
      type: "material",
      value: 2,
    }, 2);
    addInventoryItem(inventory, {
      id: "jelly-gel",
      name: "Jelly Gel",
      description: "",
      type: "material",
      value: 2,
    }, 3);

    expect(inventory.items).toEqual([{ id: "jelly-gel", quantity: 5 }]);
    expect(changes).toEqual([1, 1]);
  });

  it("adds non-stackable equipment as instances", () => {
    const inventory = createInventory();

    addInventoryItem(inventory, {
      id: "training-sword",
      name: "Training Sword",
      description: "",
      type: "weapon",
      value: 10,
    }, 2, false);

    expect(inventory.items).toEqual([]);
    expect(inventory.equipmentInstances).toHaveLength(2);
    expect(inventory.equipmentInstances[0].itemId).toBe("training-sword");
  });

  it("removes stackable items, equipment instances, and tracks gold", () => {
    const inventory = createInventory();
    inventory.items.push({ id: "jelly-gel", quantity: 3 });
    inventory.equipmentInstances.push({ instanceId: "training-sword-1", itemId: "training-sword" });

    addGold(inventory, 8, false);

    expect(removeInventoryItem(inventory, "jelly-gel", 2, false)).toBe(true);
    expect(removeInventoryItem(inventory, "training-sword", 1, false)).toBe(true);
    expect(inventory.items).toEqual([{ id: "jelly-gel", quantity: 1 }]);
    expect(inventory.equipmentInstances).toEqual([]);
    expect(inventory.gold).toBe(8);
  });

  it("counts stack quantities and equipment instances as weight", () => {
    const inventory = createInventory();
    inventory.items.push({ id: "potion", quantity: 4 });
    inventory.equipmentInstances.push({ instanceId: "sword-1", itemId: "sword" });

    expect(getInventoryWeight(inventory)).toBe(5);
  });
});

function createInventory(): InventoryState {
  return {
    items: [],
    gold: 0,
    equipmentInstances: [],
    appraisedItemIds: [],
    refinementLevels: {},
  };
}
