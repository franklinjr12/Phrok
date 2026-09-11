import { eventBus } from "./eventBus";
import type { InventoryItem, InventoryState } from "../types/gameState";
import type { ItemDefinition } from "../types/dataDefinitions";

export interface InventoryChangePayload {
  inventory: InventoryState;
}

export function addInventoryItem(
  inventory: InventoryState,
  item: ItemDefinition,
  quantity: number,
  emitChange = true,
): InventoryState {
  const safeQuantity = Math.max(1, Math.floor(quantity));

  if (isStackableItem(item)) {
    const existingItem = inventory.items.find((entry) => entry.id === item.id);

    if (existingItem) {
      existingItem.quantity += safeQuantity;
    } else {
      inventory.items.push({ id: item.id, quantity: safeQuantity });
    }
  } else {
    for (let index = 0; index < safeQuantity; index += 1) {
      inventory.equipmentInstances.push({
        instanceId: `${item.id}-${Date.now()}-${inventory.equipmentInstances.length + index}`,
        itemId: item.id,
      });
    }
  }

  if (emitChange) {
    eventBus.emit("inventoryChanged", { inventory });
  }

  return inventory;
}

export function addGold(inventory: InventoryState, amount: number, emitChange = true): InventoryState {
  inventory.gold += Math.max(0, Math.floor(amount));

  if (emitChange) {
    eventBus.emit("inventoryChanged", { inventory });
  }

  return inventory;
}

export function removeInventoryItem(
  inventory: InventoryState,
  itemId: string,
  quantity: number,
  emitChange = true,
): boolean {
  const safeQuantity = Math.max(1, Math.floor(quantity));
  const existingItem = inventory.items.find((entry) => entry.id === itemId);

  if (existingItem) {
    if (existingItem.quantity < safeQuantity) {
      return false;
    }

    existingItem.quantity -= safeQuantity;

    if (existingItem.quantity === 0) {
      inventory.items = inventory.items.filter((entry) => entry !== existingItem);
    }

    if (emitChange) {
      eventBus.emit("inventoryChanged", { inventory });
    }

    return true;
  }

  const equipmentIndex = inventory.equipmentInstances.findIndex((entry) => entry.itemId === itemId);

  if (equipmentIndex === -1) {
    return false;
  }

  inventory.equipmentInstances.splice(equipmentIndex, 1);

  if (emitChange) {
    eventBus.emit("inventoryChanged", { inventory });
  }

  return true;
}

export function getFirstInventoryStack(inventory: InventoryState): InventoryItem | null {
  return inventory.items[0] ?? null;
}

/** Returns the gameplay inventory weight used by UI presentation and capacity checks. */
export function getInventoryWeight(inventory: InventoryState): number {
  const stackWeight = inventory.items.reduce((total, item) => total + item.quantity, 0);
  return stackWeight + inventory.equipmentInstances.length;
}

function isStackableItem(item: ItemDefinition): boolean {
  return item.type === "consumable" || item.type === "material" || item.type === "key";
}
