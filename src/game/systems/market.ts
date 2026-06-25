import { getItemRarity, getItemSellValue } from "./equipment";
import { addInventoryItem, removeInventoryItem } from "./inventory";
import { eventBus } from "./eventBus";
import type { ItemDefinition, ShopDefinition, ShopStockEntryDefinition } from "../types/dataDefinitions";
import type { GameState, InventoryState } from "../types/gameState";

export type MarketResult =
  | { success: true; itemId: string; quantity: number; gold: number; price: number }
  | { success: false; itemId: string; quantity: number; gold: number; price: number; reason: "insufficient-gold" | "missing-stock" | "missing-item" | "not-appraisable" | "already-appraised" };

const appraisableTypes = new Set<ItemDefinition["type"]>(["weapon", "armor", "accessory", "sigil", "support", "material"]);
const defaultBuyPriceMultiplier = 1.8;
const defaultAppraisalCostMultiplier = 0.35;
const defaultMinimumAppraisalCost = 15;

export function getShopBuyPrice(item: ItemDefinition, stockEntry?: ShopStockEntryDefinition): number {
  return Math.max(1, Math.ceil(item.value * (stockEntry?.priceMultiplier ?? defaultBuyPriceMultiplier)));
}

export function getMarketSellValue(item: ItemDefinition, multiplier = 1): number {
  return Math.max(1, Math.floor(getItemSellValue(item) * multiplier));
}

export function buyShopItem(
  state: GameState,
  shop: ShopDefinition,
  stockEntry: ShopStockEntryDefinition | undefined,
  getItem: (id: string) => ItemDefinition,
  quantity = 1,
): MarketResult {
  const safeQuantity = Math.max(1, Math.floor(quantity));

  if (!stockEntry || !shop.stock.includes(stockEntry)) {
    return createResult(false, "", safeQuantity, state.inventory.gold, 0, "missing-stock");
  }

  const item = getItem(stockEntry.itemId);
  const price = getShopBuyPrice(item, stockEntry) * safeQuantity;

  if (state.inventory.gold < price) {
    return createResult(false, item.id, safeQuantity, state.inventory.gold, price, "insufficient-gold");
  }

  state.inventory.gold -= price;
  state.playerProfile.gold = state.inventory.gold;
  addInventoryItem(state.inventory, item, safeQuantity, false);
  eventBus.emit("inventoryChanged", { inventory: state.inventory });

  return createResult(true, item.id, safeQuantity, state.inventory.gold, price);
}

export function sellInventoryItem(
  state: GameState,
  item: ItemDefinition | undefined,
  quantity = 1,
  sellMultiplier = 1,
): MarketResult {
  const safeQuantity = Math.max(1, Math.floor(quantity));

  if (!item) {
    return createResult(false, "", safeQuantity, state.inventory.gold, 0, "missing-item");
  }

  const price = getMarketSellValue(item, sellMultiplier) * safeQuantity;

  if (!removeInventoryItem(state.inventory, item.id, safeQuantity, false)) {
    return createResult(false, item.id, safeQuantity, state.inventory.gold, price, "missing-item");
  }

  state.inventory.gold += price;
  state.playerProfile.gold = state.inventory.gold;
  eventBus.emit("inventoryChanged", { inventory: state.inventory });

  return createResult(true, item.id, safeQuantity, state.inventory.gold, price);
}

export function isItemAppraisable(item: ItemDefinition): boolean {
  const rarity = getItemRarity(item);

  return Boolean(item.appraisable)
    || (appraisableTypes.has(item.type) && rarity !== "Common" && rarity !== "Uncommon");
}

export function isItemAppraised(inventory: InventoryState, item: ItemDefinition): boolean {
  return !isItemAppraisable(item) || inventory.appraisedItemIds.includes(item.id);
}

export function getAppraisalCost(item: ItemDefinition, appraiser?: ShopDefinition["appraiser"]): number {
  if (!isItemAppraisable(item)) {
    return 0;
  }

  const multiplier = appraiser?.identifyCostMultiplier ?? defaultAppraisalCostMultiplier;
  const minimum = appraiser?.minIdentifyCost ?? defaultMinimumAppraisalCost;

  return Math.max(minimum, Math.ceil(item.value * multiplier));
}

export function appraiseInventoryItem(
  state: GameState,
  item: ItemDefinition | undefined,
  appraiser?: ShopDefinition["appraiser"],
): MarketResult {
  if (!item || !playerOwnsItem(state.inventory, item.id)) {
    return createResult(false, item?.id ?? "", 1, state.inventory.gold, 0, "missing-item");
  }

  if (!isItemAppraisable(item)) {
    return createResult(false, item.id, 1, state.inventory.gold, 0, "not-appraisable");
  }

  if (isItemAppraised(state.inventory, item)) {
    return createResult(false, item.id, 1, state.inventory.gold, 0, "already-appraised");
  }

  const price = getAppraisalCost(item, appraiser);

  if (state.inventory.gold < price) {
    return createResult(false, item.id, 1, state.inventory.gold, price, "insufficient-gold");
  }

  state.inventory.gold -= price;
  state.playerProfile.gold = state.inventory.gold;
  state.inventory.appraisedItemIds.push(item.id);
  eventBus.emit("inventoryChanged", { inventory: state.inventory });

  return createResult(true, item.id, 1, state.inventory.gold, price);
}

export function getVisibleItemName(inventory: InventoryState, item: ItemDefinition): string {
  return isItemAppraised(inventory, item)
    ? item.name
    : `Unappraised ${getItemRarity(item)} ${getItemTypeLabel(item)}`;
}

export function getVisibleItemDescription(inventory: InventoryState, item: ItemDefinition): string {
  return isItemAppraised(inventory, item)
    ? item.description
    : "An appraiser can reveal this item's exact properties.";
}

function getItemTypeLabel(item: ItemDefinition): string {
  return item.type === "sigil" ? "sigil" : item.type === "support" ? "charm" : item.type;
}

function playerOwnsItem(inventory: InventoryState, itemId: string): boolean {
  return inventory.items.some((entry) => entry.id === itemId && entry.quantity > 0)
    || inventory.equipmentInstances.some((entry) => entry.itemId === itemId);
}

function createResult(
  success: true,
  itemId: string,
  quantity: number,
  gold: number,
  price: number,
): MarketResult;
function createResult(
  success: false,
  itemId: string,
  quantity: number,
  gold: number,
  price: number,
  reason: "insufficient-gold" | "missing-stock" | "missing-item" | "not-appraisable" | "already-appraised",
): MarketResult;
function createResult(
  success: boolean,
  itemId: string,
  quantity: number,
  gold: number,
  price: number,
  reason?: "insufficient-gold" | "missing-stock" | "missing-item" | "not-appraisable" | "already-appraised",
): MarketResult {
  return success
    ? { success, itemId, quantity, gold, price }
    : { success, itemId, quantity, gold, price, reason: reason ?? "missing-item" };
}
