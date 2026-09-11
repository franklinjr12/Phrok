import Phaser from "phaser";
import { getRefinedItemName, getRefineLevel, getRefinementPreview, isItemRefinable, refineItem, type RefinementPreview } from "../../../systems/refinement";
import { eventBus } from "../../../systems/eventBus";
import type { DataRegistry } from "../../../data/dataRegistry";
import type { ItemDefinition } from "../../../types/dataDefinitions";
import type { EquipmentInstance, GameState, InventoryItem } from "../../../types/gameState";
import { uiTheme } from "../../uiTheme";
import type { PanelContext, UIPanel } from "../../panels/panelTypes";
import { addPanelButton as addPanelButtonPrimitive, addPanelRectangle as addPanelRectanglePrimitive, addPanelText as addPanelTextPrimitive } from "../../panels/panelPrimitives";
import type { InventoryViewModelEntry as InventoryPanelEntry } from "../../viewModels/InventoryViewModel";
const { panelDepth, hudDepth, panelFill, panelStroke } = uiTheme;
export class RefinementPanel implements UIPanel {
 readonly id = "refinement" as const;
 constructor(private readonly context: PanelContext) {}
 open(payload?: unknown): void { const values = (payload ?? {}) as Record<string, unknown>; if (typeof values.selectedRefinementIndex === "number") this.selectedRefinementIndex = values.selectedRefinementIndex as number; if (typeof values.activeRefinementNpcId === "string") this.activeRefinementNpcId = values.activeRefinementNpcId as string; }
 render(): void { this.renderRefinementPanel(this.context.state, this.context.data); }
 destroy(): void {}
 
private renderRefinementPanel(state: GameState, dataRegistry: DataRegistry): void {
    const entries = this.getInventoryPanelEntries(state.inventory.items, state.inventory.equipmentInstances)
      .filter((entry) => isItemRefinable(dataRegistry.getItem(entry.itemId)));
    const selected = this.clampSelectedRefinementIndex(entries);
    const selectedEntry = entries[selected] ?? null;
    const selectedItem = selectedEntry ? dataRegistry.getItem(selectedEntry.itemId) : null;
    const preview = getRefinementPreview(state, selectedItem);

    this.addPanelRectangle(76, 62, 648, 470, panelFill, 0.96)
      .setOrigin(0)
      .setStrokeStyle(2, panelStroke, 0.92);
    this.addPanelText(104, 86, "Refinement", 23, uiTheme.text.primary);
    this.addPanelText(104, 120, `Gold ${state.inventory.gold}`, 15, uiTheme.text.accent);
    this.addPanelText(104, 154, "Gear", 14, uiTheme.text.muted);

    entries.slice(0, 8).forEach((entry, index) => {
      const item = dataRegistry.getItem(entry.itemId);
      const level = getRefineLevel(state.inventory, item.id);
      const y = 184 + index * 34;
      const row = this.addPanelRectangle(104, y - 6, 338, 28, index === selected ? uiTheme.colors.selected : uiTheme.colors.inset, 0.94)
        .setOrigin(0)
        .setStrokeStyle(1, index === selected ? uiTheme.colors.accent : uiTheme.colors.border, 0.9)
        .setInteractive({ useHandCursor: true });
      row.on("pointerdown", () => {
        this.selectedRefinementIndex = index;
        this.context.rerender();
      });
      this.addPanelText(116, y, this.truncateText(getRefinedItemName(state.inventory, item), 25), 13, uiTheme.text.primary);
      this.addPanelText(326, y, `+${level}`, 13, level > 0 ? uiTheme.text.accent : uiTheme.text.muted);
      this.addPanelText(374, y, entry.source, 12, uiTheme.text.secondary);
    });

    this.addPanelRectangle(472, 154, 220, 254, uiTheme.colors.inset, 0.95)
      .setOrigin(0)
      .setStrokeStyle(1, uiTheme.colors.border, 0.86);

    if (selectedItem) {
      const materialText = preview.materials
        .map((material) => `${dataRegistry.getItem(material.itemId).name} ${material.owned}/${material.required}`)
        .join("; ");
      const statusText = preview.canRefine ? "Ready" : `Blocked: ${preview.blockReason}`;

      this.addPanelText(492, 176, this.truncateText(getRefinedItemName(state.inventory, selectedItem), 22), 16, uiTheme.text.primary);
      this.addPanelText(492, 206, `Target +${preview.targetLevel}   Chance ${Math.round(preview.successChance * 100)}%`, 13, uiTheme.text.positive);
      this.addPanelText(492, 232, `Cost ${preview.goldCost}g`, 13, uiTheme.text.accent);
      this.addPanelText(492, 260, this.wrapText(materialText || "No materials", 25), 12, preview.blockReason === "missing-materials" ? uiTheme.text.negative : uiTheme.text.secondary);
      this.addPanelText(492, 334, this.wrapText(preview.failureResult, 25), 12, "#fbbf24");
      this.addPanelText(492, 372, statusText, 13, preview.canRefine ? uiTheme.text.positive : uiTheme.text.negative);
    } else {
      this.addPanelText(492, 190, "No refinable item", 15, uiTheme.text.muted);
    }

    this.addPanelButton(472, 430, 92, 34, "Refine", () => this.refineSelectedItem());
    this.addPanelButton(600, 478, 92, 28, "Close", () => this.context.closePanel());
    this.syncRefinementDataset(state, entries, selectedItem, preview);
  }

private getInventoryPanelEntries(
    stacks: InventoryItem[],
    equipmentInstances: EquipmentInstance[],
  ): InventoryPanelEntry[] {
    return [
      ...stacks.map((stack) => ({
        itemId: stack.id,
        quantity: stack.quantity,
        source: "stack" as const,
      })),
      ...equipmentInstances.map((instance) => ({
        itemId: instance.itemId,
        quantity: 1,
        source: "equipment" as const,
      })),
    ];
  }

private clampSelectedRefinementIndex(items: InventoryPanelEntry[]): number {
    if (items.length === 0) {
      this.selectedRefinementIndex = 0;
      return 0;
    }

    this.selectedRefinementIndex = Phaser.Math.Clamp(this.selectedRefinementIndex, 0, items.length - 1);
    return this.selectedRefinementIndex;
  }

private selectedRefinementIndex = 0;

private addPanelRectangle(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    alpha: number,
  ): Phaser.GameObjects.Rectangle {
    return addPanelRectanglePrimitive(this.context, x, y, width, height, color, alpha);
  }

private addPanelText(x: number, y: number, text: string, fontSize: number, color: string, wrapWidth?: number): Phaser.GameObjects.Text {
    return addPanelTextPrimitive(this.context, x, y, text, fontSize, color, wrapWidth);
  }

private truncateText(text: string, maxLength: number): string {
    return text.length <= maxLength ? text : `${text.slice(0, Math.max(0, maxLength - 1))}.`;
  }

private wrapText(text: string, lineLength: number): string {
    const words = text.split(" ");
    const lines: string[] = [];
    let line = "";

    for (const word of words) {
      const next = line ? `${line} ${word}` : word;

      if (next.length > lineLength) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }

    if (line) {
      lines.push(line);
    }

    return lines.join("\n");
  }

private addPanelButton(x: number, y: number, width: number, height: number, label: string, callback: () => void): void {
    addPanelButtonPrimitive(this.context, x, y, width, height, label, callback);
  }

private refineSelectedItem(): void {
    if (!this.context.state || !this.context.data) {
      return;
    }

    const entries = this.getInventoryPanelEntries(this.context.state.inventory.items, this.context.state.inventory.equipmentInstances)
      .filter((entry) => isItemRefinable(this.context.data!.getItem(entry.itemId)));
    const entry = entries[this.clampSelectedRefinementIndex(entries)];
    const item = entry ? this.context.data.getItem(entry.itemId) : null;
    const result = refineItem(this.context.state, item);

    this.context.debug?.set("lastRefinementAction", result.success
? `success:${result.itemId}:${result.previousLevel}->${result.nextLevel}:${result.consumedGold}`
: `failed:${result.reason}:${result.itemId}:${result.previousLevel}->${result.nextLevel}:${result.consumedGold}`);
    eventBus.emit("refinementAttempted", {
      itemId: result.itemId,
      success: result.success,
      previousLevel: result.previousLevel,
      nextLevel: result.nextLevel,
      consumedGold: result.consumedGold,
    });
    this.context.rerender();
  }

private syncRefinementDataset(
    state: GameState,
    entries: InventoryPanelEntry[],
    selectedItem: ItemDefinition | null,
    preview: RefinementPreview,
  ): void {
    this.context.debug?.set("shopPanel", "hidden");
    this.context.debug?.set("appraiserPanel", "hidden");
    this.context.debug?.set("storagePanel", "hidden");
    this.context.debug?.set("craftingPanel", "hidden");
    this.context.debug?.set("refinementPanel", "visible");
    this.context.debug?.set("activeRefinementNpc", this.activeRefinementNpcId);
    this.context.debug?.set("refinableItems", entries.map((entry) => entry.itemId).join("|"));
    this.context.debug?.set("selectedRefinementItem", selectedItem?.id ?? "");
    this.context.debug?.set("selectedRefinementItemName", selectedItem ? getRefinedItemName(state.inventory, selectedItem) : "");
    this.context.debug?.set("selectedRefinementLevel", selectedItem ? String(getRefineLevel(state.inventory, selectedItem.id)) : "");
    this.context.debug?.set("selectedRefinementTargetLevel", selectedItem ? String(preview.targetLevel) : "");
    this.context.debug?.set("selectedRefinementCost", selectedItem ? String(preview.goldCost) : "");
    this.context.debug?.set("selectedRefinementMaterials", preview.materials
.map((material) => `${material.itemId}:${material.owned}/${material.required}`)
.join("|"));
    this.context.debug?.set("selectedRefinementSuccessChance", selectedItem ? String(preview.successChance) : "");
    this.context.debug?.set("selectedRefinementFailureResult", selectedItem ? preview.failureResult : "");
    this.context.debug?.set("selectedRefinementCanRefine", String(Boolean(selectedItem && preview.canRefine)));
    this.context.debug?.set("selectedRefinementBlockReason", selectedItem ? preview.blockReason : "no-item");
    this.context.debug?.set("refinementButtons", "Refine|Close");
    this.context.debug?.set("inventoryGold", String(state.inventory.gold));
    this.context.debug?.set("playerGold", String(state.inventory.gold));
  }

private activeRefinementNpcId = "";
}
