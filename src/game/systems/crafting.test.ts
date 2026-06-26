import { beforeEach, describe, expect, it } from "vitest";
import { createNewGameState } from "../data/gameState";
import { eventBus } from "./eventBus";
import {
  canCraftRecipe,
  craftRecipe,
  getRecipeMaterialStatus,
  getVisibleRecipes,
  unlockRecipesForSource,
} from "./crafting";
import type { ItemDefinition, RecipeDefinition } from "../types/dataDefinitions";

describe("crafting", () => {
  beforeEach(() => {
    eventBus.clear();
  });

  it("lists default recipes and reports missing materials", () => {
    const state = createNewGameState();
    const recipe = createRecipe();

    expect(getVisibleRecipes(state, [recipe]).map((entry) => entry.id)).toEqual(["recipe-minor-health-potion"]);
    expect(getRecipeMaterialStatus(state.inventory, recipe)).toEqual([
      { itemId: "jelly-gel", required: 2, owned: 0, missing: 2 },
      { itemId: "soft-hide", required: 1, owned: 0, missing: 1 },
    ]);
    expect(canCraftRecipe(state, recipe)?.reason).toBe("missing-materials");
  });

  it("consumes materials and gold, creates output, and emits inventory updates", () => {
    const state = createNewGameState();
    const recipe = createRecipe();
    const updates: string[] = [];
    state.inventory.items.push({ id: "jelly-gel", quantity: 2 }, { id: "soft-hide", quantity: 1 });
    state.inventory.gold = 8;
    state.playerProfile.gold = 8;
    eventBus.on("inventoryChanged", ({ inventory }) => updates.push(`${inventory.gold}:${inventory.items.length}`));

    const result = craftRecipe(state, recipe, getItem);

    expect(result).toEqual({
      success: true,
      recipeId: "recipe-minor-health-potion",
      itemId: "minor-health-potion",
      quantity: 2,
      gold: 3,
    });
    expect(state.inventory.items).toEqual([{ id: "training-sword", quantity: 1 }, { id: "minor-health-potion", quantity: 2 }]);
    expect(state.playerProfile.gold).toBe(3);
    expect(updates).toEqual(["3:2"]);
  });

  it("unlocks matching source recipes and blocks locked recipes", () => {
    const state = createNewGameState();
    const recipe = createRecipe({
      id: "recipe-npc-sword",
      unlockCondition: { type: "npc", npcId: "crownfield-crafter" },
    });

    expect(canCraftRecipe(state, recipe)?.reason).toBe("locked");
    expect(unlockRecipesForSource(state, [recipe], { type: "npc", npcId: "other-npc" })).toEqual([]);
    expect(unlockRecipesForSource(state, [recipe], { type: "npc", npcId: "crownfield-crafter" })).toEqual([recipe]);
    expect(state.crafting.unlockedRecipeIds).toEqual(["recipe-npc-sword"]);
    expect(state.crafting.unlockNotifications).toEqual(["recipe-npc-sword"]);
  });
});

function createRecipe(overrides: Partial<RecipeDefinition> = {}): RecipeDefinition {
  return {
    id: "recipe-minor-health-potion",
    name: "Minor Health Potion Pattern",
    outputItemId: "minor-health-potion",
    outputQuantity: 2,
    requiredMaterials: [
      { itemId: "jelly-gel", quantity: 2 },
      { itemId: "soft-hide", quantity: 1 },
    ],
    requiredGold: 5,
    requiredLevel: 1,
    unlockCondition: { type: "default" },
    ingredientItemIds: ["jelly-gel", "soft-hide"],
    resultItemId: "minor-health-potion",
    ...overrides,
  };
}

function getItem(id: string): ItemDefinition {
  return {
    id,
    name: id,
    description: "",
    type: id === "minor-health-potion" ? "consumable" : "material",
    value: 1,
  };
}
