import { eventBus } from "./eventBus";
import { removeInventoryItem } from "./inventory";
import { isEquipmentItem } from "./equipment";
import type { ItemDefinition } from "../types/dataDefinitions";
import type { GameState, InventoryState } from "../types/gameState";

export const maxRefineLevel = 10;

export type RefinementFailureReason =
  | "no-item"
  | "not-refinable"
  | "max-level"
  | "insufficient-gold"
  | "missing-materials";

export type RefinementResult =
  | {
    success: true;
    itemId: string;
    previousLevel: number;
    nextLevel: number;
    consumedGold: number;
    materialStatus: RefinementMaterialStatus[];
    successChance: number;
  }
  | {
    success: false;
    itemId: string;
    previousLevel: number;
    nextLevel: number;
    consumedGold: number;
    materialStatus: RefinementMaterialStatus[];
    successChance: number;
    reason: RefinementFailureReason | "failed-roll";
    failureResult: string;
  };

export interface RefinementMaterialStatus {
  itemId: string;
  required: number;
  owned: number;
  missing: number;
}

export interface RefinementPreview {
  itemId: string;
  currentLevel: number;
  targetLevel: number;
  goldCost: number;
  materials: RefinementMaterialStatus[];
  successChance: number;
  failureResult: string;
  canRefine: boolean;
  blockReason: RefinementFailureReason | "";
}

export type RandomSource = () => number;

export function getRefineLevel(inventory: InventoryState, itemId: string): number {
  return Math.max(0, Math.min(maxRefineLevel, Math.floor(inventory.refinementLevels[itemId] ?? 0)));
}

export function getRefinedItemName(inventory: InventoryState, item: ItemDefinition): string {
  const level = getRefineLevel(inventory, item.id);

  return level > 0 && isItemRefinable(item) ? `${item.name} +${level}` : item.name;
}

export function isItemRefinable(item: ItemDefinition): boolean {
  return item.refinable !== false && isEquipmentItem(item);
}

export function getRefinementPreview(state: GameState, item: ItemDefinition | null): RefinementPreview {
  if (!item) {
    return createBlockedPreview("", 0, "no-item");
  }

  const currentLevel = getRefineLevel(state.inventory, item.id);
  const targetLevel = Math.min(maxRefineLevel, currentLevel + 1);
  const materials = getRefinementMaterialStatus(state.inventory, currentLevel);
  const goldCost = getRefinementGoldCost(currentLevel);
  const blockReason = getRefinementBlockReason(state, item, materials, goldCost, currentLevel);

  return {
    itemId: item.id,
    currentLevel,
    targetLevel,
    goldCost,
    materials,
    successChance: getRefinementSuccessChance(currentLevel),
    failureResult: getRefinementFailureResult(currentLevel),
    canRefine: blockReason === "",
    blockReason,
  };
}

export function refineItem(
  state: GameState,
  item: ItemDefinition | null,
  random: RandomSource = Math.random,
): RefinementResult {
  const preview = getRefinementPreview(state, item);

  if (!item || !preview.canRefine) {
    return {
      success: false,
      itemId: item?.id ?? "",
      previousLevel: preview.currentLevel,
      nextLevel: preview.currentLevel,
      consumedGold: 0,
      materialStatus: preview.materials,
      successChance: preview.successChance,
      reason: preview.blockReason || "no-item",
      failureResult: preview.failureResult,
    };
  }

  consumeRefinementCosts(state, preview);

  const succeeded = random() <= preview.successChance;
  const nextLevel = succeeded
    ? preview.targetLevel
    : getFailureLevel(preview.currentLevel, random);

  state.inventory.refinementLevels[item.id] = nextLevel;
  state.playerProfile.gold = state.inventory.gold;
  eventBus.emit("inventoryChanged", { inventory: state.inventory });
  eventBus.emit("equipmentChanged", { slot: "refinement", itemId: item.id });
  eventBus.emit("refinementAttempted", {
    itemId: item.id,
    success: succeeded,
    previousLevel: preview.currentLevel,
    nextLevel,
    consumedGold: preview.goldCost,
  });

  if (succeeded) {
    return {
      success: true,
      itemId: item.id,
      previousLevel: preview.currentLevel,
      nextLevel,
      consumedGold: preview.goldCost,
      materialStatus: preview.materials,
      successChance: preview.successChance,
    };
  }

  return {
    success: false,
    itemId: item.id,
    previousLevel: preview.currentLevel,
    nextLevel,
    consumedGold: preview.goldCost,
    materialStatus: preview.materials,
    successChance: preview.successChance,
    reason: "failed-roll",
    failureResult: preview.failureResult,
  };
}

export function getRefinementSuccessChance(currentLevel: number): number {
  if (currentLevel < 4) {
    return 1;
  }

  if (currentLevel < 7) {
    return 0.7 - (currentLevel - 4) * 0.1;
  }

  return 0.45 - (currentLevel - 7) * 0.05;
}

export function getRefinementFailureResult(currentLevel: number): string {
  if (currentLevel < 4) {
    return "No failure before +5";
  }

  if (currentLevel < 7) {
    return "Failure loses 1 refine level";
  }

  return "Failure loses 1-2 refine levels";
}

function createBlockedPreview(itemId: string, currentLevel: number, blockReason: RefinementFailureReason): RefinementPreview {
  return {
    itemId,
    currentLevel,
    targetLevel: currentLevel,
    goldCost: 0,
    materials: [],
    successChance: 0,
    failureResult: "No item selected",
    canRefine: false,
    blockReason,
  };
}

function getRefinementBlockReason(
  state: GameState,
  item: ItemDefinition,
  materials: RefinementMaterialStatus[],
  goldCost: number,
  currentLevel: number,
): RefinementFailureReason | "" {
  if (!isItemRefinable(item)) {
    return "not-refinable";
  }

  if (currentLevel >= maxRefineLevel) {
    return "max-level";
  }

  if (materials.some((material) => material.missing > 0)) {
    return "missing-materials";
  }

  if (state.inventory.gold < goldCost) {
    return "insufficient-gold";
  }

  return "";
}

function getRefinementMaterialStatus(inventory: InventoryState, currentLevel: number): RefinementMaterialStatus[] {
  return getRefinementMaterialRequirements(currentLevel).map((requirement) => {
    const owned = inventory.items.find((entry) => entry.id === requirement.itemId)?.quantity ?? 0;

    return {
      ...requirement,
      owned,
      missing: Math.max(0, requirement.required - owned),
    };
  });
}

function getRefinementMaterialRequirements(currentLevel: number): Array<{ itemId: string; required: number }> {
  if (currentLevel < 2) {
    return [{ itemId: "copper-ore", required: 1 + currentLevel }];
  }

  if (currentLevel < 5) {
    return [
      { itemId: "iron-ore", required: currentLevel - 1 },
      { itemId: "stabilizer", required: 1 },
    ];
  }

  if (currentLevel < 8) {
    return [
      { itemId: "silver-ore", required: currentLevel - 3 },
      { itemId: "stabilizer", required: 1 },
    ];
  }

  return [
    { itemId: "rune-ore", required: currentLevel - 6 },
    { itemId: "stabilizer", required: 2 },
    { itemId: "boss-catalyst", required: 1 },
  ];
}

function getRefinementGoldCost(currentLevel: number): number {
  return 20 + currentLevel * 15;
}

function consumeRefinementCosts(state: GameState, preview: RefinementPreview): void {
  for (const material of preview.materials) {
    removeInventoryItem(state.inventory, material.itemId, material.required, false);
  }

  state.inventory.gold -= preview.goldCost;
}

function getFailureLevel(currentLevel: number, random: RandomSource): number {
  if (currentLevel < 5) {
    return currentLevel;
  }

  if (currentLevel < 8) {
    return Math.max(0, currentLevel - 1);
  }

  return Math.max(0, currentLevel - (random() < 0.5 ? 1 : 2));
}
