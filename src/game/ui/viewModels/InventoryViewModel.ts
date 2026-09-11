import type { DataRegistry } from "../../data/dataRegistry";
import { getInventoryWeight } from "../../systems/inventory";
import { calculateDerivedStats } from "../../systems/stats";
import { getItemRarity } from "../../systems/equipment";
import { getRefinedItemName, getRefineLevel, isItemRefinable } from "../../systems/refinement";
import { getVisibleItemDescription, getVisibleItemName } from "../../systems/market";
import type { EquipmentInstance, GameState, InventoryItem } from "../../types/gameState";
import type { ItemDefinition } from "../../types/dataDefinitions";

export interface InventoryViewModelEntry {
  itemId: string;
  quantity: number;
  source: "stack" | "equipment";
}

export interface InventorySelectionViewModel {
  item: ItemDefinition | null;
  entry: InventoryViewModelEntry | null;
  name: string;
  description: string;
  rarity: string;
  refineLevel: number | string;
}

export interface InventoryRowViewModel {
  entry: InventoryViewModelEntry;
  item: ItemDefinition;
  name: string;
  rarity: string;
  description: string;
}

/** Read-only inventory projection used by windows and HUDs. */
export class InventoryViewModel {
  readonly entries: readonly InventoryViewModelEntry[];
  readonly rows: readonly InventoryRowViewModel[];
  readonly selectedIndex: number;
  readonly selected: InventorySelectionViewModel;
  readonly gold: number;
  readonly weight: number;
  readonly weightLimit: number;

  constructor(state: GameState, data: DataRegistry, selectedIndex = 0) {
    this.entries = getInventoryEntries(state.inventory.items, state.inventory.equipmentInstances);
    this.rows = this.entries.map((entry) => {
      const item = data.getItem(entry.itemId);
      return {
        entry,
        item,
        name: isItemRefinable(item) ? getRefinedItemName(state.inventory, item) : getVisibleItemName(state.inventory, item),
        rarity: getItemRarity(item),
        description: getVisibleItemDescription(state.inventory, item),
      };
    });
    this.selectedIndex = clampIndex(selectedIndex, this.entries.length);
    const entry = this.entries[this.selectedIndex] ?? null;
    const item = entry ? data.getItem(entry.itemId) : null;
    const name = item
      ? isItemRefinable(item) ? getRefinedItemName(state.inventory, item) : getVisibleItemName(state.inventory, item)
      : "";
    this.selected = {
      item,
      entry,
      name,
      description: item ? getVisibleItemDescription(state.inventory, item) : "",
      rarity: item ? getItemRarity(item) : "",
      refineLevel: item && isItemRefinable(item) ? getRefineLevel(state.inventory, item.id) : "",
    };
    this.gold = state.inventory.gold;
    this.weight = getInventoryWeight(state.inventory);
    this.weightLimit = calculateDerivedStats(
      state,
      data.getClass(state.character.archetype),
      (id) => data.getItem(id),
      (id) => data.getStatusEffect(id),
      (id) => data.getSupport(id),
    ).weightLimit;
  }
}

export function getInventoryEntries(stacks: InventoryItem[], equipmentInstances: EquipmentInstance[]): InventoryViewModelEntry[] {
  return [
    ...stacks.map((stack) => ({ itemId: stack.id, quantity: stack.quantity, source: "stack" as const })),
    ...equipmentInstances.map((instance) => ({ itemId: instance.itemId, quantity: 1, source: "equipment" as const })),
  ];
}

function clampIndex(index: number, length: number): number {
  return length === 0 ? 0 : Math.max(0, Math.min(index, length - 1));
}
