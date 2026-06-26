import { addInventoryItem, removeInventoryItem } from "./inventory";
import { eventBus } from "./eventBus";
import type { ItemDefinition, RecipeDefinition } from "../types/dataDefinitions";
import type { GameState, InventoryState } from "../types/gameState";

export type CraftingUnlockSource =
  | { type: "default" }
  | { type: "npc"; npcId: string }
  | { type: "bossDrop"; bossId: string }
  | { type: "quest"; questId: string }
  | { type: "huntingBoard"; boardId: string }
  | { type: "exploration"; regionId: string }
  | { type: "bestiaryMilestone"; enemyId: string; defeatCount: number };

export type CraftingResult =
  | { success: true; recipeId: string; itemId: string; quantity: number; gold: number }
  | CraftingFailure;

export type CraftingFailure = {
    success: false;
    recipeId: string;
    itemId: string;
    quantity: number;
    gold: number;
    reason: "locked" | "insufficient-level" | "wrong-region" | "wrong-npc" | "insufficient-gold" | "missing-materials";
    missingMaterials: RecipeMaterialStatus[];
  };

export interface RecipeMaterialStatus {
  itemId: string;
  required: number;
  owned: number;
  missing: number;
}

export function getVisibleRecipes(state: GameState, recipes: RecipeDefinition[]): RecipeDefinition[] {
  return recipes.filter((recipe) => isRecipeUnlocked(state, recipe) || recipe.unlockCondition.type !== "default");
}

export function isRecipeUnlocked(state: GameState, recipe: RecipeDefinition): boolean {
  return recipe.unlockCondition.type === "default" || state.crafting.unlockedRecipeIds.includes(recipe.id);
}

export function getRecipeMaterialStatus(
  inventory: InventoryState,
  recipe: RecipeDefinition,
): RecipeMaterialStatus[] {
  return recipe.requiredMaterials.map((material) => {
    const owned = getInventoryQuantity(inventory, material.itemId);

    return {
      itemId: material.itemId,
      required: material.quantity,
      owned,
      missing: Math.max(0, material.quantity - owned),
    };
  });
}

export function canCraftRecipe(
  state: GameState,
  recipe: RecipeDefinition,
  context: { regionId?: string; npcId?: string } = {},
): CraftingFailure | null {
  const missingMaterials = getRecipeMaterialStatus(state.inventory, recipe).filter((material) => material.missing > 0);

  if (!isRecipeUnlocked(state, recipe)) {
    return createFailure(state, recipe, "locked", missingMaterials);
  }

  if (state.playerProfile.level < recipe.requiredLevel) {
    return createFailure(state, recipe, "insufficient-level", missingMaterials);
  }

  if (recipe.requiredRegionId && recipe.requiredRegionId !== context.regionId) {
    return createFailure(state, recipe, "wrong-region", missingMaterials);
  }

  if (recipe.requiredNpcId && recipe.requiredNpcId !== context.npcId) {
    return createFailure(state, recipe, "wrong-npc", missingMaterials);
  }

  if (missingMaterials.length > 0) {
    return createFailure(state, recipe, "missing-materials", missingMaterials);
  }

  if (state.inventory.gold < recipe.requiredGold) {
    return createFailure(state, recipe, "insufficient-gold", missingMaterials);
  }

  return null;
}

export function craftRecipe(
  state: GameState,
  recipe: RecipeDefinition,
  getItem: (id: string) => ItemDefinition,
  context: { regionId?: string; npcId?: string } = {},
): CraftingResult {
  const failure = canCraftRecipe(state, recipe, context);

  if (failure) {
    return failure;
  }

  for (const material of recipe.requiredMaterials) {
    removeInventoryItem(state.inventory, material.itemId, material.quantity, false);
  }

  state.inventory.gold -= recipe.requiredGold;
  state.playerProfile.gold = state.inventory.gold;
  addInventoryItem(state.inventory, getItem(recipe.outputItemId), recipe.outputQuantity, false);
  eventBus.emit("inventoryChanged", { inventory: state.inventory });

  return {
    success: true,
    recipeId: recipe.id,
    itemId: recipe.outputItemId,
    quantity: recipe.outputQuantity,
    gold: state.inventory.gold,
  };
}

export function unlockRecipesForSource(
  state: GameState,
  recipes: RecipeDefinition[],
  source: CraftingUnlockSource,
): RecipeDefinition[] {
  const unlocked: RecipeDefinition[] = [];

  for (const recipe of recipes) {
    if (isRecipeUnlocked(state, recipe) || !matchesUnlockSource(recipe, source)) {
      continue;
    }

    state.crafting.unlockedRecipeIds.push(recipe.id);
    state.crafting.unlockNotifications.push(recipe.id);
    unlocked.push(recipe);
    eventBus.emit("recipeUnlocked", { recipeId: recipe.id, recipeName: recipe.name });
  }

  if (unlocked.length > 0) {
    eventBus.emit("craftingChanged", { unlockedRecipeIds: [...state.crafting.unlockedRecipeIds] });
  }

  return unlocked;
}

function matchesUnlockSource(recipe: RecipeDefinition, source: CraftingUnlockSource): boolean {
  const condition = recipe.unlockCondition;

  if (condition.type !== source.type) {
    return false;
  }

  if (condition.type === "default") {
    return true;
  }

  if (condition.type === "npc" && source.type === "npc") {
    return condition.npcId === source.npcId;
  }

  if (condition.type === "bossDrop" && source.type === "bossDrop") {
    return condition.bossId === source.bossId;
  }

  if (condition.type === "quest" && source.type === "quest") {
    return condition.questId === source.questId;
  }

  if (condition.type === "huntingBoard" && source.type === "huntingBoard") {
    return condition.boardId === source.boardId;
  }

  if (condition.type === "exploration" && source.type === "exploration") {
    return condition.regionId === source.regionId;
  }

  if (condition.type === "bestiaryMilestone" && source.type === "bestiaryMilestone") {
    return condition.enemyId === source.enemyId && source.defeatCount >= condition.defeatCount;
  }

  return false;
}

function createFailure(
  state: GameState,
  recipe: RecipeDefinition,
  reason: CraftingFailure["reason"],
  missingMaterials: RecipeMaterialStatus[],
): CraftingFailure {
  return {
    success: false,
    recipeId: recipe.id,
    itemId: recipe.outputItemId,
    quantity: recipe.outputQuantity,
    gold: state.inventory.gold,
    reason,
    missingMaterials,
  };
}

function getInventoryQuantity(inventory: InventoryState, itemId: string): number {
  const stackQuantity = inventory.items.find((entry) => entry.id === itemId)?.quantity ?? 0;
  const equipmentQuantity = inventory.equipmentInstances.filter((entry) => entry.itemId === itemId).length;

  return stackQuantity + equipmentQuantity;
}
