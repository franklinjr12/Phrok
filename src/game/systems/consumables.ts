import { eventBus } from "./eventBus";
import { removeInventoryItem } from "./inventory";
import { applyStatusEffect, emitStatusEffectsChanged } from "./statusEffects";
import type { ItemDefinition, StatusEffectDefinition } from "../types/dataDefinitions";
import type { GameState, HotbarSlotState } from "../types/gameState";

export type ConsumableUseReason =
  | "not-consumable"
  | "missing-item"
  | "cooldown"
  | "full"
  | "no-effect";

export interface ConsumableUseResult {
  success: boolean;
  reason?: ConsumableUseReason;
  itemId: string;
  restoredHp: number;
  restoredSp: number;
  appliedStatusEffectIds: string[];
  cooldownReadyAt: number;
  automatic: boolean;
}

export const autoPotionThresholdSteps = [0, 25, 50, 75] as const;

export function createInitialConsumableState() {
  return {
    cooldowns: {},
    autoPotion: {
      hpThresholdPercent: 0,
      spThresholdPercent: 0,
    },
  };
}

export function useConsumableItem(
  state: GameState,
  item: ItemDefinition,
  getStatusEffect: (id: string) => StatusEffectDefinition,
  now = Date.now(),
  automatic = false,
): ConsumableUseResult {
  if (item.type !== "consumable") {
    return failed(item.id, "not-consumable", automatic);
  }

  const effect = item.consumableEffect;

  if (!effect) {
    return failed(item.id, "no-effect", automatic);
  }

  const inventoryStack = state.inventory.items.find((entry) => entry.id === item.id);

  if (!inventoryStack || inventoryStack.quantity <= 0) {
    return failed(item.id, "missing-item", automatic);
  }

  const cooldownReadyAt = state.character.consumables.cooldowns[item.id] ?? 0;

  if (cooldownReadyAt > now) {
    return failed(item.id, "cooldown", automatic, cooldownReadyAt);
  }

  const restoredHp = Math.max(0, Math.min(
    effect.restoreHp ?? 0,
    state.character.stats.maxHp - state.character.stats.hp,
  ));
  const restoredSp = Math.max(0, Math.min(
    effect.restoreSp ?? 0,
    state.character.stats.maxSp - state.character.stats.sp,
  ));
  const hasStatusEffects = effect.statusEffectIds.length > 0;

  if (restoredHp === 0 && restoredSp === 0 && !hasStatusEffects) {
    return failed(item.id, "full", automatic);
  }

  if ((effect.restoreHp ?? 0) > 0 && restoredHp === 0 && (effect.restoreSp ?? 0) === 0 && !hasStatusEffects) {
    return failed(item.id, "full", automatic);
  }

  if ((effect.restoreSp ?? 0) > 0 && restoredSp === 0 && (effect.restoreHp ?? 0) === 0 && !hasStatusEffects) {
    return failed(item.id, "full", automatic);
  }

  const removed = removeInventoryItem(state.inventory, item.id, 1);

  if (!removed) {
    return failed(item.id, "missing-item", automatic);
  }

  state.character.stats.hp = Math.min(state.character.stats.maxHp, state.character.stats.hp + restoredHp);
  state.character.stats.sp = Math.min(state.character.stats.maxSp, state.character.stats.sp + restoredSp);

  if (restoredHp > 0) {
    eventBus.emit("playerHealthChanged", {
      hp: state.character.stats.hp,
      maxHp: state.character.stats.maxHp,
    });
  }

  if (restoredSp > 0) {
    eventBus.emit("playerSpChanged", {
      sp: state.character.stats.sp,
      maxSp: state.character.stats.maxSp,
    });
  }

  for (const effectId of effect.statusEffectIds) {
    applyStatusEffect(state.character.statusEffects, getStatusEffect(effectId), item.id, now, {
      sourceKind: "item",
      persistThroughMapTransition: effect.persistThroughMapTransition,
    });
  }

  if (effect.statusEffectIds.length > 0) {
    emitStatusEffectsChanged("player", state.character.id, state.character.statusEffects);
  }

  const readyAt = now + Math.max(0, effect.cooldownMs);
  state.character.consumables.cooldowns[item.id] = readyAt;

  const result: ConsumableUseResult = {
    success: true,
    itemId: item.id,
    restoredHp,
    restoredSp,
    appliedStatusEffectIds: [...effect.statusEffectIds],
    cooldownReadyAt: readyAt,
    automatic,
  };
  eventBus.emit("consumableUsed", result);

  return result;
}

export function updateAutoPotion(
  state: GameState,
  getItem: (id: string) => ItemDefinition,
  getStatusEffect: (id: string) => StatusEffectDefinition,
  now = Date.now(),
): ConsumableUseResult | null {
  if (state.settings.autoPotionEnabled === false) {
    return null;
  }

  const hpPercent = percent(state.character.stats.hp, state.character.stats.maxHp);
  const spPercent = percent(state.character.stats.sp, state.character.stats.maxSp);
  const settings = state.character.consumables.autoPotion;

  if (settings.hpThresholdPercent > 0 && hpPercent <= settings.hpThresholdPercent) {
    const item = getAssignedConsumable(state.character.hotbar, getItem, "hp");

    if (item) {
      const result = useConsumableItem(state, item, getStatusEffect, now, true);

      if (result.success || result.reason === "cooldown") {
        return result;
      }
    }
  }

  if (settings.spThresholdPercent > 0 && spPercent <= settings.spThresholdPercent) {
    const item = getAssignedConsumable(state.character.hotbar, getItem, "sp");

    if (item) {
      const result = useConsumableItem(state, item, getStatusEffect, now, true);

      if (result.success || result.reason === "cooldown") {
        return result;
      }
    }
  }

  return null;
}

export function cycleAutoPotionThreshold(state: GameState, kind: "hp" | "sp"): number {
  const key = kind === "hp" ? "hpThresholdPercent" : "spThresholdPercent";
  const current = state.character.consumables.autoPotion[key];
  const currentIndex = autoPotionThresholdSteps.findIndex((entry) => entry === current);
  const next = autoPotionThresholdSteps[(currentIndex + 1) % autoPotionThresholdSteps.length] ?? autoPotionThresholdSteps[0];

  state.character.consumables.autoPotion[key] = next;
  eventBus.emit("autoPotionSettingsChanged", {
    hpThresholdPercent: state.character.consumables.autoPotion.hpThresholdPercent,
    spThresholdPercent: state.character.consumables.autoPotion.spThresholdPercent,
  });

  return next;
}

export function removeNonPersistentConsumableStatusEffects(state: GameState): string[] {
  const removedIds = state.character.statusEffects
    .filter((effect) => effect.sourceKind === "item" && effect.persistThroughMapTransition !== true)
    .map((effect) => effect.id);

  if (removedIds.length === 0) {
    return [];
  }

  state.character.statusEffects = state.character.statusEffects
    .filter((effect) => effect.sourceKind !== "item" || effect.persistThroughMapTransition === true);
  emitStatusEffectsChanged("player", state.character.id, state.character.statusEffects);

  return removedIds;
}

export function getConsumableCooldownSummary(state: GameState): string {
  return Object.entries(state.character.consumables.cooldowns)
    .map(([itemId, readyAt]) => `${itemId}:${readyAt}`)
    .join("|");
}

export function getAutoPotionSettingsSummary(state: GameState): string {
  const settings = state.character.consumables.autoPotion;

  return `hp:${settings.hpThresholdPercent}|sp:${settings.spThresholdPercent}`;
}

function getAssignedConsumable(
  hotbar: HotbarSlotState[],
  getItem: (id: string) => ItemDefinition,
  kind: "hp" | "sp",
): ItemDefinition | null {
  for (const entry of hotbar) {
    if (entry.type !== "item") {
      continue;
    }

    const item = getItem(entry.id);
    const amount = kind === "hp"
      ? item.consumableEffect?.restoreHp
      : item.consumableEffect?.restoreSp;

    if (item.type === "consumable" && amount && amount > 0) {
      return item;
    }
  }

  return null;
}

function percent(current: number, max: number): number {
  if (max <= 0) {
    return 0;
  }

  return Math.ceil((current / max) * 100);
}

function failed(
  itemId: string,
  reason: ConsumableUseReason,
  automatic: boolean,
  cooldownReadyAt = 0,
): ConsumableUseResult {
  const result: ConsumableUseResult = {
    success: false,
    reason,
    itemId,
    restoredHp: 0,
    restoredSp: 0,
    appliedStatusEffectIds: [],
    cooldownReadyAt,
    automatic,
  };
  eventBus.emit("consumableUsed", result);

  return result;
}
