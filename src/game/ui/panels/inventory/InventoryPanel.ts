import { uiTheme } from "../../uiTheme";
import type { ItemDefinition } from "../../../types/dataDefinitions";
import {
  equipItem,
  getItemEquipmentSlot,
  getItemRarity,
  getItemSellValue,
  getItemEquipmentStats,
  getValidEquipmentSlots,
  removeEquipment,
} from "../../../systems/equipment";
import { removeInventoryItem } from "../../../systems/inventory";
import { useConsumableItem } from "../../../systems/consumables";
import { isItemAppraisable, isItemAppraised } from "../../../systems/market";
import { assignHotbarAction } from "../../../systems/skills";
import { getRefineLevel, isItemRefinable } from "../../../systems/refinement";
import { addPanelButton, addPanelRectangle, addPanelText, clampWrappedText } from "../panelPrimitives";
import { panelFill, panelStroke } from "../../uiTheme";
import { InventoryViewModel, type InventorySelectionViewModel } from "../../viewModels/InventoryViewModel";
import type { PanelContext, UIPanel } from "../panelTypes";

export class InventoryPanel implements UIPanel {
  readonly id = "inventory" as const;
  private selectedIndex = 0;

  constructor(private readonly context: PanelContext) {}

  render(): void {
    const { state, data } = this.context;
    const model = new InventoryViewModel(state, data, this.selectedIndex);
    this.selectedIndex = model.selectedIndex;
    addPanelRectangle(this.context, 92, 72, 616, 442, panelFill, 0.94)
      .setOrigin(0).setStrokeStyle(2, panelStroke, 0.92);
    addPanelText(this.context, 118, 94, "Inventory", 24, uiTheme.text.primary);
    addPanelText(this.context, 118, 128, `Gold ${model.gold}   Weight ${model.weight}/${model.weightLimit}`, 15, uiTheme.text.accent);
    addPanelText(this.context, 118, 160, "Item", 13, uiTheme.text.muted);
    addPanelText(this.context, 372, 160, "Qty", 13, uiTheme.text.muted);
    addPanelText(this.context, 430, 160, "Rarity", 13, uiTheme.text.muted);

    const entries = model.entries;
    this.context.debug.set("inventoryPanel", "visible");
    this.context.debug.set("inventoryItemCount", entries.length);
    const selected = model.selectedIndex;

    model.rows.forEach((entryRow, index) => {
      const { entry, item } = entryRow;
      const y = 188 + index * 44;
      const row = addPanelRectangle(this.context, 112, y - 8, 382, 34, index === selected ? uiTheme.colors.selected : uiTheme.colors.inset, 0.94)
        .setOrigin(0).setStrokeStyle(1, index === selected ? uiTheme.colors.accent : uiTheme.colors.border, 0.9)
        .setInteractive({ useHandCursor: true });
      if (item.type === "consumable") {
        row.setData("hotbarAction", { type: "item", id: item.id });
        this.context.scene.input.setDraggable(row, true);
      }
      row.on("pointerdown", () => { this.selectedIndex = index; this.context.rerender(); });
      row.on("pointerover", () => {
        this.context.showComparison(item);
        this.context.showTooltip([entryRow.name, entryRow.rarity, entryRow.description], 340, y - 8);
      });
      row.on("pointerout", () => { this.context.clearComparison(); this.context.clearTooltip(); });
      addPanelRectangle(this.context, 124, y, 18, 18, this.getItemIconColor(item), 0.94)
        .setOrigin(0).setStrokeStyle(1, 0xf8fafc, 0.58);
      const refineLevel = isItemRefinable(item) ? getRefineLevel(state.inventory, item.id) : 0;
      addPanelText(this.context, 152, y - 2, `${entryRow.name}${refineLevel > 0 ? ` +${refineLevel}` : ""}`, 15, uiTheme.text.primary);
      addPanelText(this.context, 374, y - 2, String(entry.quantity), 15, uiTheme.text.primary);
      addPanelText(this.context, 430, y - 2, entryRow.rarity, 15, this.getRarityColor(item));
    });

    this.syncSelectedDataset(model.selected);
    this.renderDetails(model.selected);
    this.renderButtons(model.selected.item);
  }

  destroy(): void {}

  private syncSelectedDataset(selection: InventorySelectionViewModel): void {
    const { item, entry } = selection;
    this.context.debug.setSelectedInventorySnapshot({
      itemId: item?.id,
      itemName: selection.name,
      refineLevel: selection.refineLevel,
      quantity: entry?.quantity ?? "",
      rarity: selection.rarity,
      description: selection.description,
      source: entry?.source ?? "",
    });
  }

  private renderDetails(selection: InventorySelectionViewModel): void {
    const { item, entry } = selection;
    addPanelRectangle(this.context, 512, 158, 164, 252, uiTheme.colors.inset, 0.95).setOrigin(0).setStrokeStyle(1, uiTheme.colors.border, 0.86);
    addPanelRectangle(this.context, 532, 184, 44, 44, item ? this.getItemIconColor(item) : uiTheme.colors.border, 0.94).setOrigin(0).setStrokeStyle(1, 0xf8fafc, 0.64);
    if (!item || !entry) { addPanelText(this.context, 532, 252, "No item selected", 16, uiTheme.text.muted); return; }
    addPanelText(this.context, 532, 246, selection.name, 17, uiTheme.text.primary);
    addPanelText(this.context, 532, 276, `${entry.source === "equipment" ? "Quantity 1" : `Quantity ${entry.quantity}`}   Value ${getItemSellValue(item)}`, 12, uiTheme.text.secondary);
    addPanelText(this.context, 532, 300, selection.rarity, 14, this.getRarityColor(item));
    addPanelText(this.context, 532, 328, clampWrappedText(selection.description, 20, 2), 12, uiTheme.text.secondary);
    const visibleStats = isItemAppraised(this.context.state.inventory, item) ? this.getItemStatText(item) : "Hidden until appraisal";
    addPanelText(this.context, 532, 368, `Stats ${visibleStats}\nSlot ${getValidEquipmentSlots(item).join(", ") || "None"}`, 11, uiTheme.text.positive);
    addPanelText(this.context, 532, 406, `Appraisal ${isItemAppraisable(item) ? (isItemAppraised(this.context.state.inventory, item) ? "Revealed" : "Required") : "N/A"}   Refine +${selection.refineLevel || 0}`, 10, uiTheme.text.muted);
    addPanelText(this.context, 532, 430, `Pack weight ${this.context.state.inventory.items.find((entry) => entry.id === item.id)?.quantity ?? 1}   Sell ${getItemSellValue(item)}`, 10, uiTheme.text.accent);
  }

  private renderButtons(item: ItemDefinition | null): void {
    const equipmentEntry = item ? this.context.state.inventory.equipmentInstances.some((instance) => instance.itemId === item.id) : false;
    const useLabel = equipmentEntry ? "Unequip" : item && getItemEquipmentSlot(item) ? "Equip" : "Use";
    addPanelButton(this.context, 512, 430, 78, 34, useLabel, () => this.useSelected());
    addPanelButton(this.context, 598, 430, 78, 34, "Drop", () => this.dropSelected());
    if (item?.type === "consumable") addPanelButton(this.context, 512, 476, 78, 28, "Slot 1", () => this.assignSelectedConsumable());
    addPanelButton(this.context, 598, 476, 78, 28, "Close", () => this.context.closePanel());
    this.context.debug.set("inventoryButtons", `${useLabel}|Drop${item?.type === "consumable" ? "|Slot 1" : ""}|Close`);
  }

  private useSelected(): void {
    const { state, data } = this.context;
    const model = new InventoryViewModel(state, data, this.selectedIndex);
    this.selectedIndex = model.selectedIndex;
    const entry = model.selected.entry;
    const item = model.selected.item;
    if (!item) return;
    if (model.selected.entry?.source === "equipment") {
      const slot = this.getEquippedSlot(item.id);
      if (slot) removeEquipment(state, slot);
      return;
    }
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
    const { state, data } = this.context;
    const model = new InventoryViewModel(state, data, this.selectedIndex);
    this.selectedIndex = model.selectedIndex;
    const entry = model.selected.entry;
    if (!entry) return;
    removeInventoryItem(state.inventory, entry.itemId, 1);
    this.context.debug.set("lastInventoryAction", `drop:${entry.itemId}`);
  }

  private assignSelectedConsumable(): void {
    const model = new InventoryViewModel(this.context.state, this.context.data, this.selectedIndex);
    const item = model.selected.item;
    if (!item || item.type !== "consumable") return;
    const assigned = assignHotbarAction(this.context.state, 1, { type: "item", id: item.id });
    this.context.debug.set("lastHotbarAssignment", assigned ? `1:item:${item.id}` : "failed");
    this.context.rerender();
  }

  private getEquippedSlot(itemId: string): import("../../../types/gameState").EquipmentSlot | null {
    return (Object.entries(this.context.state.equipment).find(([, equippedId]) => equippedId === itemId)?.[0] as import("../../../types/gameState").EquipmentSlot | undefined) ?? null;
  }

  private getItemStatText(item: ItemDefinition): string {
    const stats = getItemEquipmentStats(item);
    const values = [stats.attack ? `ATK ${stats.attack > 0 ? "+" : ""}${stats.attack}` : "", stats.defense ? `DEF ${stats.defense > 0 ? "+" : ""}${stats.defense}` : "", stats.hp ? `HP ${stats.hp > 0 ? "+" : ""}${stats.hp}` : "", stats.sp ? `SP ${stats.sp > 0 ? "+" : ""}${stats.sp}` : ""];
    return values.filter(Boolean).join(" ") || "None";
  }

  private getItemIconColor(item: ItemDefinition): number {
    const colors: Record<string, number> = { weapon: 0xb45309, armor: uiTheme.colors.border, accessory: 0xa16207, sigil: 0x7c3aed, support: 0x0891b2, consumable: 0xdc2626 };
    return colors[item.type] ?? 0x0f766e;
  }

  private getRarityColor(item: ItemDefinition): string {
    const colors: Record<string, string> = { Common: uiTheme.text.secondary, Uncommon: uiTheme.text.positive, Rare: uiTheme.text.info, Epic: "#c4b5fd", Legendary: uiTheme.text.accent, Mythic: "#f9a8d4" };
    return colors[getItemRarity(item)] ?? uiTheme.text.secondary;
  }
}
