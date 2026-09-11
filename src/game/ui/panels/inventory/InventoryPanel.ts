import type { ItemDefinition } from "../../../types/dataDefinitions";
import type { EquipmentInstance, GameState, InventoryItem } from "../../../types/gameState";
import {
  equipItem,
  getItemEquipmentSlot,
  getItemRarity,
  getItemSellValue,
} from "../../../systems/equipment";
import { getRefinedItemName, getRefineLevel, isItemRefinable } from "../../../systems/refinement";
import { removeInventoryItem } from "../../../systems/inventory";
import { useConsumableItem } from "../../../systems/consumables";
import { getVisibleItemDescription, getVisibleItemName } from "../../../systems/market";
import { addPanelButton, addPanelRectangle, addPanelText, clampWrappedText } from "../panelPrimitives";
import { panelFill, panelStroke } from "../../uiTheme";
import type { PanelContext, UIPanel } from "../panelTypes";

export type InventoryPanelEntry = {
  itemId: string;
  quantity: number;
  source: "stack" | "equipment";
};

export class InventoryPanel implements UIPanel {
  readonly id = "inventory" as const;
  private selectedIndex = 0;

  constructor(private readonly context: PanelContext) {}

  render(): void {
    const { state, data } = this.context;
    addPanelRectangle(this.context, 92, 72, 616, 442, panelFill, 0.94)
      .setOrigin(0).setStrokeStyle(2, panelStroke, 0.92);
    addPanelText(this.context, 118, 94, "Inventory", 24, "#f8fafc");
    addPanelText(this.context, 118, 128, `Gold ${state.inventory.gold}   Weight ${this.getInventoryWeight()}/${this.getWeightLimit()}`, 15, "#fde68a");
    addPanelText(this.context, 118, 160, "Item", 13, "#94a3b8");
    addPanelText(this.context, 372, 160, "Qty", 13, "#94a3b8");
    addPanelText(this.context, 430, 160, "Rarity", 13, "#94a3b8");

    const entries = this.getEntries(state.inventory.items, state.inventory.equipmentInstances);
    this.context.debug.set("inventoryPanel", "visible");
    this.context.debug.set("inventoryItemCount", entries.length);
    const selected = this.clampIndex(entries.length);

    entries.forEach((entry, index) => {
      const item = data.getItem(entry.itemId);
      const y = 188 + index * 44;
      const row = addPanelRectangle(this.context, 112, y - 8, 382, 34, index === selected ? 0x293548 : 0x18222c, 0.94)
        .setOrigin(0).setStrokeStyle(1, index === selected ? 0xfacc15 : 0x334155, 0.9)
        .setInteractive({ useHandCursor: true });
      row.on("pointerdown", () => { this.selectedIndex = index; this.context.rerender(); });
      row.on("pointerover", () => {
        this.context.showComparison(item);
        this.context.showTooltip([getVisibleItemName(state.inventory, item), getItemRarity(item), getVisibleItemDescription(state.inventory, item)], 340, y - 8);
      });
      row.on("pointerout", () => { this.context.clearComparison(); this.context.clearTooltip(); });
      addPanelRectangle(this.context, 124, y, 18, 18, this.getItemIconColor(item), 0.94)
        .setOrigin(0).setStrokeStyle(1, 0xf8fafc, 0.58);
      addPanelText(this.context, 152, y - 2, isItemRefinable(item) ? getRefinedItemName(state.inventory, item) : getVisibleItemName(state.inventory, item), 15, "#f8fafc");
      addPanelText(this.context, 374, y - 2, String(entry.quantity), 15, "#f8fafc");
      addPanelText(this.context, 430, y - 2, getItemRarity(item), 15, this.getRarityColor(item));
    });

    const entry = entries[selected] ?? null;
    const item = entry ? data.getItem(entry.itemId) : null;
    this.syncSelectedDataset(item, entry?.quantity ?? null, entry?.source ?? null);
    this.renderDetails(item, entry);
    this.renderButtons(item);
  }

  destroy(): void {}

  private getEntries(stacks: InventoryItem[], equipmentInstances: EquipmentInstance[]): InventoryPanelEntry[] {
    return [
      ...stacks.map((stack) => ({ itemId: stack.id, quantity: stack.quantity, source: "stack" as const })),
      ...equipmentInstances.map((instance) => ({ itemId: instance.itemId, quantity: 1, source: "equipment" as const })),
    ];
  }

  private clampIndex(length: number): number {
    if (length === 0) { this.selectedIndex = 0; return 0; }
    this.selectedIndex = Math.max(0, Math.min(this.selectedIndex, length - 1));
    return this.selectedIndex;
  }

  private syncSelectedDataset(item: ItemDefinition | null, quantity: number | null, source: string | null): void {
    const { state } = this.context;
    this.context.debug.setSelectedInventorySnapshot({
      itemId: item?.id,
      itemName: item && isItemRefinable(item) ? getRefinedItemName(state.inventory, item) : item ? getVisibleItemName(state.inventory, item) : "",
      refineLevel: item && isItemRefinable(item) ? getRefineLevel(state.inventory, item.id) : "",
      quantity: quantity ?? "",
      rarity: item ? getItemRarity(item) : "",
      description: item ? getVisibleItemDescription(state.inventory, item) : "",
      source: source ?? "",
    });
  }

  private renderDetails(item: ItemDefinition | null, entry: InventoryPanelEntry | null): void {
    const { state } = this.context;
    addPanelRectangle(this.context, 512, 158, 164, 252, 0x17212b, 0.95).setOrigin(0).setStrokeStyle(1, 0x475569, 0.86);
    addPanelRectangle(this.context, 532, 184, 44, 44, item ? this.getItemIconColor(item) : 0x334155, 0.94).setOrigin(0).setStrokeStyle(1, 0xf8fafc, 0.64);
    if (!item || !entry) { addPanelText(this.context, 532, 252, "No item selected", 16, "#94a3b8"); return; }
    addPanelText(this.context, 532, 246, isItemRefinable(item) ? getRefinedItemName(state.inventory, item) : getVisibleItemName(state.inventory, item), 17, "#f8fafc");
    addPanelText(this.context, 532, 276, entry.source === "equipment" ? "Quantity 1" : `Quantity ${entry.quantity}`, 14, "#cbd5e1");
    addPanelText(this.context, 532, 300, getItemRarity(item), 14, this.getRarityColor(item));
    addPanelText(this.context, 532, 332, clampWrappedText(getVisibleItemDescription(state.inventory, item), 20, 3), 13, "#cbd5e1");
    addPanelText(this.context, 532, 392, `Sell ${getItemSellValue(item)}`, 13, "#fde68a");
  }

  private renderButtons(item: ItemDefinition | null): void {
    const useLabel = item && getItemEquipmentSlot(item) ? "Equip" : "Use";
    addPanelButton(this.context, 512, 430, 78, 34, useLabel, () => this.useSelected());
    addPanelButton(this.context, 598, 430, 78, 34, "Drop", () => this.dropSelected());
    addPanelButton(this.context, 598, 476, 78, 28, "Close", () => this.context.closePanel());
    this.context.debug.set("inventoryButtons", `${useLabel}|Drop|Close`);
  }

  private useSelected(): void {
    const { state, data } = this.context;
    const entries = this.getEntries(state.inventory.items, state.inventory.equipmentInstances);
    const entry = entries[this.clampIndex(entries.length)];
    const item = entry ? data.getItem(entry.itemId) : null;
    if (!item) return;
    if (getItemEquipmentSlot(item)) {
      const equipped = equipItem(state, item, true, data.getClass(state.character.archetype), undefined, (id) => data.getItem(id));
      this.context.debug.set("lastInventoryAction", equipped ? `equip:${item.id}` : `equip-failed:${item.id}`);
      return;
    }
    if (item.type === "consumable") {
      const result = useConsumableItem(state, item, (id) => data.getStatusEffect(id));
      this.context.debug.set("lastInventoryAction", result.success ? `use:${item.id}` : `use-failed:${item.id}:${result.reason}`);
      return;
    }
    removeInventoryItem(state.inventory, item.id, 1);
    this.context.debug.set("lastInventoryAction", `use:${item.id}`);
  }

  private dropSelected(): void {
    const { state } = this.context;
    const entries = this.getEntries(state.inventory.items, state.inventory.equipmentInstances);
    const entry = entries[this.clampIndex(entries.length)];
    if (!entry) return;
    removeInventoryItem(state.inventory, entry.itemId, 1);
    this.context.debug.set("lastInventoryAction", `drop:${entry.itemId}`);
  }

  private getInventoryWeight(): number { return this.context.getInventoryWeight(); }
  private getWeightLimit(): number { return this.context.getWeightLimit(); }

  private getItemIconColor(item: ItemDefinition): number {
    const colors: Record<string, number> = { weapon: 0xb45309, armor: 0x475569, accessory: 0xa16207, sigil: 0x7c3aed, support: 0x0891b2, consumable: 0xdc2626 };
    return colors[item.type] ?? 0x0f766e;
  }

  private getRarityColor(item: ItemDefinition): string {
    const colors: Record<string, string> = { Common: "#cbd5e1", Uncommon: "#86efac", Rare: "#93c5fd", Epic: "#c4b5fd", Legendary: "#fde68a", Mythic: "#f9a8d4" };
    return colors[getItemRarity(item)] ?? "#cbd5e1";
  }
}
