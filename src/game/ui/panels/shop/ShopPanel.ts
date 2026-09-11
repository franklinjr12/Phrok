import Phaser from "phaser";
import { getItemRarity } from "../../../systems/equipment";
import { buyShopItem, getMarketSellValue, getShopBuyPrice, getVisibleItemName, sellInventoryItem } from "../../../systems/market";
import type { DataRegistry } from "../../../data/dataRegistry";
import type { ItemDefinition, ShopDefinition } from "../../../types/dataDefinitions";
import type { EquipmentInstance, GameState, InventoryItem } from "../../../types/gameState";
import { uiTheme } from "../../uiTheme";
import type { PanelContext, UIPanel } from "../../panels/panelTypes";
import { addPanelButton as addPanelButtonPrimitive, addPanelRectangle as addPanelRectanglePrimitive, addPanelText as addPanelTextPrimitive } from "../../panels/panelPrimitives";
import type { InventoryViewModelEntry as InventoryPanelEntry } from "../../viewModels/InventoryViewModel";
const { panelDepth, hudDepth, panelFill, panelStroke } = uiTheme;
export class ShopPanel implements UIPanel {
 readonly id = "shop" as const;
 constructor(private readonly context: PanelContext) {}
 open(payload?: unknown): void { const values = (payload ?? {}) as Record<string, unknown>; if (typeof values.activeShopId === "string") this.activeShopId = values.activeShopId as string; if (typeof values.selectedShopIndex === "number") this.selectedShopIndex = values.selectedShopIndex as number; if (typeof values.selectedMarketInventoryIndex === "number") this.selectedMarketInventoryIndex = values.selectedMarketInventoryIndex as number; }
 render(): void { this.renderShopPanel(this.context.state, this.context.data); }
 destroy(): void {}
 
private renderShopPanel(state: GameState, dataRegistry: DataRegistry): void {
    const shop = this.getActiveShop(dataRegistry);
    const inventoryEntries = this.getInventoryPanelEntries(state.inventory.items, state.inventory.equipmentInstances);
    const selectedStockIndex = this.clampSelectedShopIndex(shop.stock);
    const selectedStock = shop.stock[selectedStockIndex] ?? null;
    const selectedStockItem = selectedStock ? dataRegistry.getItem(selectedStock.itemId) : null;
    const selectedInventory = inventoryEntries[this.clampSelectedMarketInventoryIndex(inventoryEntries)] ?? null;
    const selectedInventoryItem = selectedInventory ? dataRegistry.getItem(selectedInventory.itemId) : null;

    this.addPanelRectangle(64, 54, 672, 500, panelFill, 0.96)
      .setOrigin(0)
      .setStrokeStyle(2, panelStroke, 0.92);
    this.addPanelText(92, 78, shop.name, 23, uiTheme.text.primary);
    this.addPanelText(92, 112, `Gold ${state.inventory.gold}`, 15, uiTheme.text.accent);
    this.addPanelText(92, 146, "Stock", 14, uiTheme.text.muted);
    this.addPanelText(392, 146, "Inventory Sell", 14, uiTheme.text.muted);

    shop.stock.forEach((stock, index) => {
      const item = dataRegistry.getItem(stock.itemId);
      const y = 176 + index * 34;
      const row = this.addPanelRectangle(92, y - 6, 268, 28, index === selectedStockIndex ? uiTheme.colors.selected : uiTheme.colors.inset, 0.94)
        .setOrigin(0)
        .setStrokeStyle(1, index === selectedStockIndex ? uiTheme.colors.accent : uiTheme.colors.border, 0.9)
        .setInteractive({ useHandCursor: true });
      row.on("pointerdown", () => {
        this.selectedShopIndex = index;
        this.context.rerender();
      });
      this.addPanelText(104, y, item.name, 13, uiTheme.text.primary);
      this.addPanelText(282, y, `${getShopBuyPrice(item, stock)}g`, 13, uiTheme.text.accent);
      this.addPanelText(326, y, `x${stock.quantity}`, 12, uiTheme.text.secondary);
    });

    inventoryEntries.slice(0, 7).forEach((entry, index) => {
      const item = dataRegistry.getItem(entry.itemId);
      const y = 176 + index * 34;
      const row = this.addPanelRectangle(392, y - 6, 268, 28, index === this.selectedMarketInventoryIndex ? uiTheme.colors.selected : uiTheme.colors.inset, 0.94)
        .setOrigin(0)
        .setStrokeStyle(1, index === this.selectedMarketInventoryIndex ? uiTheme.colors.accent : uiTheme.colors.border, 0.9)
        .setInteractive({ useHandCursor: true });
      row.on("pointerdown", () => {
        const isDoubleClick = this.lastMarketInventoryClickIndex === index
          && this.context.scene.time.now - this.lastMarketInventoryClickTime <= 700;
        this.selectedMarketInventoryIndex = index;
        this.lastMarketInventoryClickIndex = index;
        this.lastMarketInventoryClickTime = this.context.scene.time.now;

        if (isDoubleClick) {
          this.sellSelectedMarketItem();
        } else {
          this.context.rerender();
        }
      });
      this.addPanelText(404, y, getVisibleItemName(state.inventory, item), 13, uiTheme.text.primary);
      this.addPanelText(582, y, `${getMarketSellValue(item)}g`, 13, uiTheme.text.accent);
      this.addPanelText(626, y, `x${entry.quantity}`, 12, uiTheme.text.secondary);
    });

    this.renderMarketDetails(92, 432, "Buy", selectedStockItem, selectedStock ? getShopBuyPrice(selectedStockItem!, selectedStock) : 0, () => this.buySelectedShopItem());
    this.renderMarketDetails(392, 432, "Sell", selectedInventoryItem, selectedInventoryItem ? getMarketSellValue(selectedInventoryItem) : 0, () => this.sellSelectedMarketItem());
    this.addPanelButton(626, 490, 90, 28, "Sell All", () => this.sellSelectedMarketItem(1, true));
    this.addPanelButton(636, 512, 78, 28, "Close", () => this.context.closePanel());
    this.syncShopDataset(shop, selectedStockItem, selectedInventoryItem, state.inventory.gold);
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

private clampSelectedShopIndex(stock: ShopDefinition["stock"]): number {
    if (stock.length === 0) {
      this.selectedShopIndex = 0;
      return 0;
    }

    this.selectedShopIndex = Phaser.Math.Clamp(this.selectedShopIndex, 0, stock.length - 1);
    return this.selectedShopIndex;
  }

private selectedShopIndex = 0;

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

private lastMarketInventoryClickIndex = -1;

private lastMarketInventoryClickTime = 0;

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

private renderMarketDetails(
    x: number,
    y: number,
    actionLabel: string,
    item: ItemDefinition | null,
    price: number,
    callback: () => void,
  ): void {
    this.addPanelRectangle(x, y, 268, 64, uiTheme.colors.inset, 0.95)
      .setOrigin(0)
      .setStrokeStyle(1, uiTheme.colors.border, 0.86);
    this.addPanelText(x + 14, y + 12, item ? item.name : "No item selected", 14, item ? uiTheme.text.primary : uiTheme.text.muted);
    this.addPanelText(x + 14, y + 36, item ? `${getItemRarity(item)}   ${price}g` : "", 12, item ? this.getRarityColor(item) : uiTheme.text.muted);
    this.addPanelButton(x + 174, y + 16, 72, 32, actionLabel, callback);
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

private addPanelButton(x: number, y: number, width: number, height: number, label: string, callback: () => void): void {
    addPanelButtonPrimitive(this.context, x, y, width, height, label, callback);
  }

private buySelectedShopItem(): void {
    if (!this.context.state || !this.context.data) {
      return;
    }

    const shop = this.getActiveShop(this.context.data);
    const stock = shop.stock[this.clampSelectedShopIndex(shop.stock)];
    const result = buyShopItem(
      this.context.state,
      shop,
      stock,
      (id) => this.context.data!.getItem(id),
    );

    this.context.debug?.set("lastShopAction", result.success
? `buy:${result.itemId}:${result.price}:${result.gold}`
: `buy-failed:${result.reason}:${result.itemId}:${result.price}:${result.gold}`);
    this.context.rerender();
  }

private syncShopDataset(
    shop: ShopDefinition,
    selectedStockItem: ItemDefinition | null,
    selectedInventoryItem: ItemDefinition | null,
    gold: number,
  ): void {
    this.context.debug?.set("shopPanel", "visible");
    this.context.debug?.set("appraiserPanel", "hidden");
    this.context.debug?.set("activeShop", shop.id);
    this.context.debug?.set("activeShopName", shop.name);
    this.context.debug?.set("activeShopRegion", shop.regionId);
    this.context.debug?.set("shopStock", shop.stock.map((stock) => stock.itemId).join("|"));
    this.context.debug?.set("shopStockPrices", shop.stock
.map((stock) => getShopBuyPrice(this.context.data!.getItem(stock.itemId), stock))
.join("|"));
    this.context.debug?.set("shopButtons", "Buy|Sell|Sell All|Close");
    this.context.debug?.set("selectedShopItem", selectedStockItem?.id ?? "");
    this.context.debug?.set("selectedShopItemName", selectedStockItem?.name ?? "");
    this.context.debug?.set("selectedShopSellItem", selectedInventoryItem?.id ?? "");
    this.context.debug?.set("selectedShopSellValue", selectedInventoryItem ? String(getMarketSellValue(selectedInventoryItem)) : "");
    this.context.debug?.set("inventoryGold", String(gold));
    this.context.debug?.set("playerGold", String(gold));
  }
}
