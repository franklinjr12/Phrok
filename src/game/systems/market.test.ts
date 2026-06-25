import { beforeEach, describe, expect, it } from "vitest";
import { createNewGameState } from "../data/gameState";
import { eventBus } from "./eventBus";
import {
  appraiseInventoryItem,
  buyShopItem,
  getAppraisalCost,
  getShopBuyPrice,
  getVisibleItemDescription,
  getVisibleItemName,
  isItemAppraised,
  sellInventoryItem,
} from "./market";
import type { ItemDefinition, ShopDefinition } from "../types/dataDefinitions";

describe("market", () => {
  beforeEach(() => {
    eventBus.clear();
  });

  it("buys shop stock with gold and adds items to inventory", () => {
    const state = createNewGameState();
    const shop = createShop("shop");
    const events: number[] = [];
    state.inventory.gold = 20;
    state.playerProfile.gold = 20;
    eventBus.on("inventoryChanged", ({ inventory }) => events.push(inventory.gold));

    const result = buyShopItem(state, shop, shop.stock[0], getItem);

    expect(result).toMatchObject({ success: true, itemId: "minor-health-potion", price: 9, gold: 11 });
    expect(state.inventory.items).toContainEqual({ id: "minor-health-potion", quantity: 1 });
    expect(state.playerProfile.gold).toBe(11);
    expect(events).toEqual([11]);
  });

  it("sells selected inventory at normal and improved appraiser rates", () => {
    const state = createNewGameState();
    state.inventory.items.push({ id: "rare-relic", quantity: 2 });

    expect(sellInventoryItem(state, getItem("rare-relic"))).toMatchObject({
      success: true,
      itemId: "rare-relic",
      price: 62,
      gold: 62,
    });
    expect(sellInventoryItem(state, getItem("rare-relic"), 1, 1.35)).toMatchObject({
      success: true,
      itemId: "rare-relic",
      price: 83,
      gold: 145,
    });
    expect(state.inventory.items.some((entry) => entry.id === "rare-relic")).toBe(false);
  });

  it("reveals unknown item details for a balanced appraisal cost", () => {
    const state = createNewGameState();
    const shop = createShop("appraiser");
    const item = getItem("rare-relic");
    state.inventory.items.push({ id: item.id, quantity: 1 });
    state.inventory.gold = 30;
    state.playerProfile.gold = 30;

    expect(getVisibleItemName(state.inventory, item)).toBe("Unappraised Rare material");
    expect(getVisibleItemDescription(state.inventory, item)).toBe("An appraiser can reveal this item's exact properties.");
    expect(getAppraisalCost(item, shop.appraiser)).toBe(15);

    expect(appraiseInventoryItem(state, item, shop.appraiser)).toMatchObject({
      success: true,
      itemId: item.id,
      price: 15,
      gold: 15,
    });
    expect(isItemAppraised(state.inventory, item)).toBe(true);
    expect(getVisibleItemName(state.inventory, item)).toBe("Rare Relic");
    expect(getVisibleItemDescription(state.inventory, item)).toBe("A relic with readable maker marks.");
  });

  it("rejects purchases and appraisal when gold is insufficient", () => {
    const state = createNewGameState();
    const shop = createShop("shop");
    const item = getItem("rare-relic");
    state.inventory.items.push({ id: item.id, quantity: 1 });

    expect(getShopBuyPrice(getItem("minor-health-potion"), shop.stock[0])).toBe(9);
    expect(buyShopItem(state, shop, shop.stock[0], getItem)).toMatchObject({
      success: false,
      reason: "insufficient-gold",
    });
    expect(appraiseInventoryItem(state, item, createShop("appraiser").appraiser)).toMatchObject({
      success: false,
      reason: "insufficient-gold",
    });
  });
});

function createShop(serviceType: ShopDefinition["serviceType"]): ShopDefinition {
  return {
    id: serviceType === "appraiser" ? "test-appraiser" : "test-shop",
    name: serviceType === "appraiser" ? "Test Appraiser" : "Test Shop",
    regionId: "crownfield",
    mapId: "crownfield-town",
    npcId: "test-npc",
    serviceType,
    stock: serviceType === "shop"
      ? [{ itemId: "minor-health-potion", quantity: 3, priceMultiplier: 1.5 }]
      : [],
    appraiser: serviceType === "appraiser"
      ? { identifyCostMultiplier: 0.3, minIdentifyCost: 15, improvedSellMultiplier: 1.35 }
      : undefined,
  };
}

function getItem(id: string): ItemDefinition {
  if (id === "minor-health-potion") {
    return {
      id,
      name: "Minor Health Potion",
      description: "Restores a little HP.",
      type: "consumable",
      value: 6,
    };
  }

  if (id === "rare-relic") {
    return {
      id,
      name: "Rare Relic",
      description: "A relic with readable maker marks.",
      type: "material",
      rarity: "Rare",
      appraisable: true,
      value: 40,
    };
  }

  throw new Error(`Unknown item ${id}`);
}
