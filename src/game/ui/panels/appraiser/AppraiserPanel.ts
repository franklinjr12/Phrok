import Phaser from "phaser";
import { getItemRarity } from "../../../systems/equipment";
import { appraiseInventoryItem, getAppraisalCost, getMarketSellValue, getVisibleItemDescription, getVisibleItemName, isItemAppraised, sellInventoryItem } from "../../../systems/market";
import type { DataRegistry } from "../../../data/dataRegistry";
import type { ItemDefinition, ShopDefinition } from "../../../types/dataDefinitions";
import type { EquipmentInstance, GameState, InventoryItem } from "../../../types/gameState";
import { uiTheme } from "../../uiTheme";
import type { PanelContext, UIPanel } from "../../panels/panelTypes";
import { addPanelButton as addPanelButtonPrimitive, addPanelRectangle as addPanelRectanglePrimitive, addPanelText as addPanelTextPrimitive } from "../../panels/panelPrimitives";
import type { InventoryViewModelEntry as InventoryPanelEntry } from "../../viewModels/InventoryViewModel";
const { panelDepth, hudDepth, panelFill, panelStroke } = uiTheme;
export class AppraiserPanel implements UIPanel {
 readonly id = "appraiser" as const;
 constructor(private readonly context: PanelContext) {}
 open(payload?: unknown): void { const values = (payload ?? {}) as Record<string, unknown>; if (typeof values.activeShopId === "string") this.activeShopId = values.activeShopId as string; if (typeof values.selectedMarketInventoryIndex === "number") this.selectedMarketInventoryIndex = values.selectedMarketInventoryIndex as number; }
 render(): void { this.renderAppraiserPanel(this.context.state, this.context.data); }
 destroy(): void {}
 
private renderAppraiserPanel(state: GameState, dataRegistry: DataRegistry): void {
    const shop = this.getActiveShop(dataRegistry);
    const inventoryEntries = this.getInventoryPanelEntries(state.inventory.items, state.inventory.equipmentInstances);
    const selected = inventoryEntries[this.clampSelectedMarketInventoryIndex(inventoryEntries)] ?? null;
    const item = selected ? dataRegistry.getItem(selected.itemId) : null;
    const appraiser = shop.appraiser;
    const improvedSellMultiplier = appraiser?.improvedSellMultiplier ?? 1.25;
    const appraisalCost = item ? getAppraisalCost(item, appraiser) : 0;
    const improvedSellValue = item ? getMarketSellValue(item, improvedSellMultiplier) : 0;

    this.addPanelRectangle(70, 60, 660, 470, panelFill, 0.96)
      .setOrigin(0)
      .setStrokeStyle(2, panelStroke, 0.92);
    this.addPanelText(96, 84, shop.name, 23, uiTheme.text.primary);
    this.addPanelText(96, 118, `Gold ${state.inventory.gold}   Appraisal from ${appraisalCost}g   Sell bonus x${improvedSellMultiplier}`, 14, uiTheme.text.accent);
    this.addPanelText(96, 152, "Inventory", 14, uiTheme.text.muted);

    inventoryEntries.slice(0, 8).forEach((entry, index) => {
      const rowItem = dataRegistry.getItem(entry.itemId);
      const y = 182 + index * 34;
      const row = this.addPanelRectangle(96, y - 6, 352, 28, index === this.selectedMarketInventoryIndex ? uiTheme.colors.selected : uiTheme.colors.inset, 0.94)
        .setOrigin(0)
        .setStrokeStyle(1, index === this.selectedMarketInventoryIndex ? uiTheme.colors.accent : uiTheme.colors.border, 0.9)
        .setInteractive({ useHandCursor: true });
      row.on("pointerdown", () => {
        this.selectedMarketInventoryIndex = index;
        this.context.rerender();
      });
      this.addPanelText(108, y, getVisibleItemName(state.inventory, rowItem), 13, uiTheme.text.primary);
      this.addPanelText(318, y, isItemAppraised(state.inventory, rowItem) ? "Known" : "Unknown", 12, isItemAppraised(state.inventory, rowItem) ? uiTheme.text.positive : uiTheme.text.negative);
      this.addPanelText(386, y, `${getMarketSellValue(rowItem, improvedSellMultiplier)}g`, 13, uiTheme.text.accent);
    });

    this.addPanelRectangle(476, 158, 210, 250, uiTheme.colors.inset, 0.95)
      .setOrigin(0)
      .setStrokeStyle(1, uiTheme.colors.border, 0.86);
    if (item) {
      const known = isItemAppraised(state.inventory, item);
      this.addPanelText(496, 180, getVisibleItemName(state.inventory, item), 16, uiTheme.text.primary);
      this.addPanelText(496, 212, `${getItemRarity(item)} ${item.type}`, 13, this.getRarityColor(item));
      this.addPanelText(496, 240, this.wrapText(getVisibleItemDescription(state.inventory, item), 24), 12, uiTheme.text.secondary);
      this.addPanelText(496, 318, `Appraise ${known ? "Done" : `${appraisalCost}g`}`, 13, known ? uiTheme.text.positive : uiTheme.text.accent);
      this.addPanelText(496, 346, `Sell+ ${improvedSellValue}g`, 13, uiTheme.text.accent);
    } else {
      this.addPanelText(496, 212, "No item selected", 15, uiTheme.text.muted);
    }

    this.addPanelButton(476, 426, 90, 34, "Appraise", () => this.appraiseSelectedMarketItem());
    this.addPanelButton(576, 426, 74, 34, "Sell+", () => this.sellSelectedMarketItem(improvedSellMultiplier));
    this.addPanelButton(596, 484, 90, 28, "Close", () => this.context.closePanel());
    this.syncAppraiserDataset(shop, item, state.inventory.gold, appraisalCost, improvedSellValue);
  }

private getActiveShop(dataRegistry: DataRegistry): ShopDefinition {
    const shop = this.activeShopId ? dataRegistry.getShop(this.activeShopId) : dataRegistry.getShops()[0];

    if (!shop) {
      throw new Error("No shop data is available.");
    }

    return shop;
  }

private activeShopId = "";

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

private clampSelectedMarketInventoryIndex(items: InventoryPanelEntry[]): number {
    if (items.length === 0) {
      this.selectedMarketInventoryIndex = 0;
      return 0;
    }

    this.selectedMarketInventoryIndex = Phaser.Math.Clamp(this.selectedMarketInventoryIndex, 0, items.length - 1);
    return this.selectedMarketInventoryIndex;
  }

private selectedMarketInventoryIndex = 0;

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

private getRarityColor(item: ItemDefinition): string {
    const rarity = getItemRarity(item);

    const colors = {
      Common: uiTheme.text.secondary,
      Uncommon: uiTheme.text.positive,
      Rare: uiTheme.text.info,
      Epic: "#c4b5fd",
      Legendary: uiTheme.text.accent,
      Mythic: "#f9a8d4",
    };

    return colors[rarity];
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

private appraiseSelectedMarketItem(): void {
    if (!this.context.state || !this.context.data) {
      return;
    }

    const shop = this.getActiveShop(this.context.data);
    const entries = this.getInventoryPanelEntries(this.context.state.inventory.items, this.context.state.inventory.equipmentInstances);
    const entry = entries[this.clampSelectedMarketInventoryIndex(entries)];
    const item = entry ? this.context.data.getItem(entry.itemId) : undefined;
    const result = appraiseInventoryItem(this.context.state, item, shop.appraiser);

    this.context.debug?.set("lastAppraiserAction", result.success
? `appraise:${result.itemId}:${result.price}:${result.gold}`
: `appraise-failed:${result.reason}:${result.itemId}:${result.price}:${result.gold}`);
    this.context.rerender();
  }

private sellSelectedMarketItem(sellMultiplier = 1, sellAll = false): void {
    if (!this.context.state || !this.context.data) {
      return;
    }

    const entries = this.getInventoryPanelEntries(this.context.state.inventory.items, this.context.state.inventory.equipmentInstances);
    const entry = entries[this.clampSelectedMarketInventoryIndex(entries)];
    const item = entry ? this.context.data.getItem(entry.itemId) : undefined;
    const quantity = sellAll ? entry?.quantity ?? 1 : 1;
    const result = sellInventoryItem(this.context.state, item, quantity, sellMultiplier);

    this.context.debug?.set("lastShopAction", result.success
? `sell:${result.itemId}:${result.price}:${result.gold}`
: `sell-failed:${result.reason}:${result.itemId}:${result.price}:${result.gold}`);
    this.context.debug?.set("lastShopSellQuantity", String(result.quantity));
    this.context.rerender();
  }

private syncAppraiserDataset(
    shop: ShopDefinition,
    item: ItemDefinition | null,
    gold: number,
    appraisalCost: number,
    improvedSellValue: number,
  ): void {
    this.context.debug?.set("shopPanel", "hidden");
    this.context.debug?.set("appraiserPanel", "visible");
    this.context.debug?.set("activeShop", shop.id);
    this.context.debug?.set("activeShopName", shop.name);
    this.context.debug?.set("activeShopRegion", shop.regionId);
    this.context.debug?.set("appraiserIdentifyCost", item ? String(appraisalCost) : "");
    this.context.debug?.set("appraiserImprovedSellValue", item ? String(improvedSellValue) : "");
    this.context.debug?.set("selectedAppraiserItem", item?.id ?? "");
    this.context.debug?.set("selectedAppraiserItemName", item ? getVisibleItemName(this.context.state!.inventory, item) : "");
    this.context.debug?.set("selectedAppraiserItemKnown", item ? String(isItemAppraised(this.context.state!.inventory, item)) : "");
    this.context.debug?.set("selectedAppraiserItemDescription", item ? getVisibleItemDescription(this.context.state!.inventory, item) : "");
    this.context.debug?.set("appraisedItems", this.context.state?.inventory.appraisedItemIds.join("|") ?? "");
    this.context.debug?.set("inventoryGold", String(gold));
    this.context.debug?.set("playerGold", String(gold));
  }
}
