import { eventBus } from "./eventBus";
import { removeInventoryItem } from "./inventory";
import { applyStatusEffect, emitStatusEffectsChanged } from "./statusEffects";
import type { ItemDefinition, StatusEffectDefinition, SupportActionDefinition, SupportDefinition } from "../types/dataDefinitions";
import type { GameState, StatModifier } from "../types/gameState";
import type { LootDrop } from "./lootDrops";

export interface SupportActionResult {
  supportId: string;
  actionId: string;
  success: boolean;
  restoredHp: number;
  cleansedStatusIds: string[];
  appliedStatusEffectIds: string[];
  cooldownReadyAt: number;
}

export function createInitialSupportState(): GameState["support"] {
  return {
    equippedSupportId: null,
    levels: {},
    affinity: {},
    cooldowns: {},
    autoPickupFilter: "none",
  };
}

export function resolveSupportIdFromItem(item: ItemDefinition): string | null {
  if (item.supportId) {
    return item.supportId;
  }

  if (item.type !== "support") {
    return null;
  }

  const normalizedId = item.id.toLowerCase();
  const normalizedName = item.name.toLowerCase();

  if (normalizedId.includes("shrine-wisp") || normalizedName.includes("shrine wisp")) {
    return "shrine-wisp";
  }

  if (
    normalizedId.includes("pack-sprite")
    || normalizedName.includes("pack sprite")
    || normalizedId.includes("forager")
    || normalizedId.includes("courier")
  ) {
    return "pack-sprite";
  }

  return null;
}

export function syncEquippedSupportFromEquipment(
  state: GameState,
  getItem: (id: string) => ItemDefinition,
): string | null {
  const itemId = state.equipment.supportCharm;
  const supportId = itemId ? resolveSupportIdFromItem(getItem(itemId)) : null;

  state.support.equippedSupportId = supportId;

  if (supportId) {
    state.support.levels[supportId] = getSupportLevel(state, supportId);
    state.support.affinity[supportId] = state.support.affinity[supportId] ?? 0;
  }

  return supportId;
}

export function getSupportLevel(state: GameState, supportId: string): number {
  return Math.max(1, Math.floor(state.support.levels[supportId] ?? 1));
}

export function getSupportStatModifier(
  state: GameState,
  support: SupportDefinition | null,
): StatModifier | null {
  if (!support || state.support.equippedSupportId !== support.id) {
    return null;
  }

  const level = getSupportLevel(state, support.id);
  const multiplier = 1 + Math.max(0, level - 1) * 0.25;

  return {
    id: `support-${support.id}`,
    baseStats: scaleRecord(support.effects.baseStats, multiplier),
    derivedStats: scaleRecord(support.effects.derivedStats, multiplier) as StatModifier["derivedStats"],
  };
}

export function getSupportRaceDamage(
  state: GameState,
  support: SupportDefinition | null,
): Record<string, number> {
  if (!support || state.support.equippedSupportId !== support.id) {
    return {};
  }

  const level = getSupportLevel(state, support.id);
  return scaleRecord(support.effects.raceDamage, 1 + Math.max(0, level - 1) * 0.25) ?? {};
}

export function grantSupportAffinity(
  state: GameState,
  support: SupportDefinition | null,
  amount: number,
): { previousLevel: number; level: number; affinity: number } | null {
  if (!support || state.support.equippedSupportId !== support.id || amount <= 0) {
    return null;
  }

  const previousLevel = getSupportLevel(state, support.id);
  let affinity = (state.support.affinity[support.id] ?? 0) + Math.floor(amount);
  let level = previousLevel;

  while (level < support.maxLevel && affinity >= support.affinityPerLevel) {
    affinity -= support.affinityPerLevel;
    level += 1;
  }

  state.support.affinity[support.id] = affinity;
  state.support.levels[support.id] = level;

  if (level !== previousLevel) {
    eventBus.emit("supportChanged", {
      supportId: support.id,
      level,
      affinity,
      actionId: null,
    });
  }

  return { previousLevel, level, affinity };
}

export function updateSupportCompanion(
  state: GameState,
  support: SupportDefinition | null,
  getItem: (id: string) => ItemDefinition,
  getStatusEffect: (id: string) => StatusEffectDefinition,
  now = Date.now(),
): SupportActionResult | null {
  if (!support || state.support.equippedSupportId !== support.id) {
    return null;
  }

  for (const action of support.actions) {
    if (!isSupportActionReady(state, support, action, now) || !shouldTriggerAction(state, action)) {
      continue;
    }

    const result = executeSupportAction(state, support, action, getItem, getStatusEffect, now);
    if (result.success) {
      eventBus.emit("supportChanged", {
        supportId: support.id,
        level: getSupportLevel(state, support.id),
        affinity: state.support.affinity[support.id] ?? 0,
        actionId: action.id,
      });
      return result;
    }
  }

  return null;
}

export function shouldSupportAutoPickup(
  state: GameState,
  support: SupportDefinition | null,
  drop: LootDrop,
  getItem: (id: string) => ItemDefinition,
): boolean {
  if (!support || state.support.equippedSupportId !== support.id || state.support.autoPickupFilter === "none") {
    return false;
  }

  if (!support.effects.autoPickupFilters?.includes(state.support.autoPickupFilter)) {
    return false;
  }

  const filter = state.support.autoPickupFilter;

  if (filter === "all") {
    if (drop.kind === "gold") {
      return true;
    }
    const rarity = getItem(drop.itemId).rarity ?? "Common";
    return rarity === "Common" || rarity === "Uncommon";
  }

  if (filter === "gold") {
    return drop.kind === "gold";
  }

  if (filter === "materials" && drop.kind === "item") {
    return getItem(drop.itemId).type === "material";
  }

  return false;
}

export function cycleSupportAutoPickupFilter(state: GameState, support: SupportDefinition | null): GameState["support"]["autoPickupFilter"] {
  const available = support?.effects.autoPickupFilters ?? [];
  const filters: GameState["support"]["autoPickupFilter"][] = [
    "none",
    ...(available.includes("materials") ? ["materials" as const] : []),
    ...(available.includes("gold") ? ["gold" as const] : []),
    ...(available.includes("all") ? ["all" as const] : []),
  ];
  const currentIndex = filters.indexOf(state.support.autoPickupFilter);
  const next = filters[(currentIndex + 1) % filters.length] ?? "none";

  state.support.autoPickupFilter = next;
  eventBus.emit("supportChanged", {
    supportId: state.support.equippedSupportId,
    level: state.support.equippedSupportId ? getSupportLevel(state, state.support.equippedSupportId) : 0,
    affinity: state.support.equippedSupportId ? state.support.affinity[state.support.equippedSupportId] ?? 0 : 0,
    actionId: null,
  });

  return next;
}

export function getSupportSummary(state: GameState): string {
  const supportId = state.support.equippedSupportId;

  if (!supportId) {
    return "none";
  }

  return `${supportId}:level:${getSupportLevel(state, supportId)}:affinity:${state.support.affinity[supportId] ?? 0}:filter:${state.support.autoPickupFilter}`;
}

function executeSupportAction(
  state: GameState,
  support: SupportDefinition,
  action: SupportActionDefinition,
  getItem: (id: string) => ItemDefinition,
  getStatusEffect: (id: string) => StatusEffectDefinition,
  now: number,
): SupportActionResult {
  const cooldownReadyAt = now + action.cooldownMs;
  let restoredHp = 0;
  const cleansedStatusIds: string[] = [];
  const appliedStatusEffectIds: string[] = [];

  if (action.useConsumableItemId) {
    const item = getItem(action.useConsumableItemId);
    const stack = state.inventory.items.find((entry) => entry.id === item.id);
    const effect = item.consumableEffect;

    if (!stack || stack.quantity <= 0 || !effect?.restoreHp) {
      return failedSupportAction(support.id, action.id, cooldownReadyAt);
    }

    restoredHp = Math.min(effect.restoreHp, state.character.stats.maxHp - state.character.stats.hp);
    if (restoredHp <= 0) {
      return failedSupportAction(support.id, action.id, cooldownReadyAt);
    }

    removeInventoryItem(state.inventory, item.id, 1);
  }

  if (action.restoreHp) {
    restoredHp = Math.max(restoredHp, Math.min(action.restoreHp, state.character.stats.maxHp - state.character.stats.hp));
  }

  if (action.cleanseCategories && action.cleanseCategories.length > 0) {
    const categories = new Set(action.cleanseCategories);
    for (const effect of state.character.statusEffects) {
      const definition = getStatusEffect(effect.id);
      if (definition.dispelRules.dispellable && definition.dispelRules.categories.some((category) => categories.has(category))) {
        cleansedStatusIds.push(effect.id);
      }
    }

    state.character.statusEffects = state.character.statusEffects.filter((effect) => !cleansedStatusIds.includes(effect.id));
  }

  for (const effectId of action.statusEffectIds ?? []) {
    applyStatusEffect(state.character.statusEffects, getStatusEffect(effectId), support.id, now, {
      sourceKind: "unknown",
      persistThroughMapTransition: true,
    });
    appliedStatusEffectIds.push(effectId);
  }

  if (restoredHp > 0) {
    state.character.stats.hp = Math.min(state.character.stats.maxHp, state.character.stats.hp + restoredHp);
    eventBus.emit("playerHealthChanged", {
      hp: state.character.stats.hp,
      maxHp: state.character.stats.maxHp,
    });
  }

  if (cleansedStatusIds.length > 0 || appliedStatusEffectIds.length > 0) {
    emitStatusEffectsChanged("player", state.character.id, state.character.statusEffects);
  }

  if (restoredHp <= 0 && cleansedStatusIds.length === 0 && appliedStatusEffectIds.length === 0) {
    return failedSupportAction(support.id, action.id, cooldownReadyAt);
  }

  state.support.cooldowns[action.id] = cooldownReadyAt;
  return {
    supportId: support.id,
    actionId: action.id,
    success: true,
    restoredHp,
    cleansedStatusIds,
    appliedStatusEffectIds,
    cooldownReadyAt,
  };
}

function shouldTriggerAction(state: GameState, action: SupportActionDefinition): boolean {
  if (action.trigger === "lowHp") {
    const percent = state.character.stats.maxHp > 0
      ? Math.ceil((state.character.stats.hp / state.character.stats.maxHp) * 100)
      : 0;
    return percent <= (action.hpThresholdPercent ?? 35);
  }

  if (action.trigger === "statusPresent") {
    return action.cleanseCategories
      ? state.character.statusEffects.some((effect) => effect.id.length > 0)
      : false;
  }

  if (action.trigger === "combat") {
    return true;
  }

  return false;
}

function isSupportActionReady(
  state: GameState,
  support: SupportDefinition,
  action: SupportActionDefinition,
  now: number,
): boolean {
  return getSupportLevel(state, support.id) >= action.minLevel
    && (state.support.cooldowns[action.id] ?? 0) <= now;
}

function failedSupportAction(supportId: string, actionId: string, cooldownReadyAt: number): SupportActionResult {
  return {
    supportId,
    actionId,
    success: false,
    restoredHp: 0,
    cleansedStatusIds: [],
    appliedStatusEffectIds: [],
    cooldownReadyAt,
  };
}

function scaleRecord(source: Record<string, number> | undefined, multiplier: number): Record<string, number> | undefined {
  if (!source) {
    return undefined;
  }

  return Object.fromEntries(Object.entries(source).map(([key, value]) => [key, Math.round(value * multiplier)]));
}
