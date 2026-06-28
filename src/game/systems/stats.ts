import { getEquipmentStats } from "./equipment";
import { eventBus } from "./eventBus";
import { getStatusStatModifiers } from "./statusEffects";
import { getSupportRaceDamage, getSupportStatModifier } from "./supports";
import type { ClassDefinition, ItemDefinition, StatusEffectDefinition, SupportDefinition } from "../types/dataDefinitions";
import type { BaseStatKey, BaseStats, DerivedStats, GameState, StatModifier } from "../types/gameState";

export const baseStatKeys: BaseStatKey[] = ["str", "agi", "vit", "int", "dex", "luk"];

export const baseStatLabels: Record<BaseStatKey, string> = {
  str: "STR",
  agi: "AGI",
  vit: "VIT",
  int: "INT",
  dex: "DEX",
  luk: "LUK",
};

export const statResetCost = 50;

export function createEmptyBaseStats(): BaseStats {
  return {
    str: 0,
    agi: 0,
    vit: 0,
    int: 0,
    dex: 0,
    luk: 0,
  };
}

export function createClassBaseStats(playerClass: ClassDefinition): BaseStats {
  const stats = createEmptyBaseStats();
  const role = playerClass.id;

  if (role === "mage") {
    Object.assign(stats, { str: 3, agi: 4, vit: 4, int: 9, dex: 5, luk: 5 });
  } else if (role === "archer") {
    Object.assign(stats, { str: 5, agi: 7, vit: 5, int: 3, dex: 9, luk: 5 });
  } else if (role === "thief") {
    Object.assign(stats, { str: 6, agi: 9, vit: 4, int: 3, dex: 7, luk: 6 });
  } else {
    Object.assign(stats, { str: 8, agi: 5, vit: 7, int: 3, dex: 5, luk: 4 });
  }

  return stats;
}

export function getTotalBaseStats(
  state: GameState,
  getStatusEffect?: (id: string) => StatusEffectDefinition,
  getSupport?: (id: string) => SupportDefinition,
): BaseStats {
  const totals = createEmptyBaseStats();

  for (const key of baseStatKeys) {
    totals[key] = state.character.baseStats[key] + state.character.allocatedStats[key];
  }

  for (const modifier of getAllStatModifiers(state, getStatusEffect, getSupport)) {
    for (const key of baseStatKeys) {
      totals[key] += modifier.baseStats?.[key] ?? 0;
    }
  }

  return totals;
}

export function getStatCost(currentTotal: number): number {
  if (currentTotal < 10) {
    return 1;
  }

  if (currentTotal < 20) {
    return 2;
  }

  if (currentTotal < 30) {
    return 3;
  }

  return 4;
}

export function allocateStatPoint(
  state: GameState,
  playerClass: ClassDefinition,
  stat: BaseStatKey,
  getItem: (id: string) => ItemDefinition,
): boolean {
  const totalStats = getTotalBaseStats(state);
  const cost = getStatCost(totalStats[stat]);

  if (state.playerProfile.statPoints < cost) {
    return false;
  }

  const before = calculateDerivedStats(state, playerClass, getItem);
  state.character.allocatedStats[stat] += 1;
  state.playerProfile.statPoints -= cost;
  const derivedStats = calculateDerivedStats(state, playerClass, getItem);
  syncCharacterVitalsToDerivedStats(state, derivedStats, before);
  eventBus.emit("statsChanged", { stat, derivedStats, statPoints: state.playerProfile.statPoints });

  return true;
}

export function resetAllocatedStats(
  state: GameState,
  playerClass: ClassDefinition,
  getItem: (id: string) => ItemDefinition,
  cost = statResetCost,
): boolean {
  if (state.inventory.gold < cost || getSpentStatPoints(state) === 0) {
    return false;
  }

  const before = calculateDerivedStats(state, playerClass, getItem);
  const refundedPoints = getRefundableStatPoints(state);
  state.inventory.gold -= cost;
  state.playerProfile.gold = state.inventory.gold;
  state.playerProfile.statPoints += refundedPoints;
  state.character.allocatedStats = createEmptyBaseStats();
  const derivedStats = calculateDerivedStats(state, playerClass, getItem);
  syncCharacterVitalsToDerivedStats(state, derivedStats, before);
  eventBus.emit("statResetCompleted", { cost, refundedPoints, gold: state.inventory.gold });
  eventBus.emit("statsChanged", { derivedStats, statPoints: state.playerProfile.statPoints });

  return true;
}

export function getSpentStatPoints(state: GameState): number {
  return baseStatKeys.reduce((total, key) => total + state.character.allocatedStats[key], 0);
}

export function getRefundableStatPoints(state: GameState): number {
  let points = 0;

  for (const key of baseStatKeys) {
    for (let index = 0; index < state.character.allocatedStats[key]; index += 1) {
      points += getStatCost(state.character.baseStats[key] + index);
    }
  }

  return points;
}

export function calculateDerivedStats(
  state: GameState,
  playerClass: ClassDefinition,
  getItem: (id: string) => ItemDefinition,
  getStatusEffect?: (id: string) => StatusEffectDefinition,
  getSupport?: (id: string) => SupportDefinition,
): DerivedStats {
  const modifiers = getAllStatModifiers(state, getStatusEffect, getSupport);
  const gear = getEquipmentStats(state.equipment, getItem, state.inventory.refinementLevels);
  const support = state.support.equippedSupportId && getSupport ? getSupport(state.support.equippedSupportId) : null;
  const stats = getTotalBaseStats(state, getStatusEffect, getSupport);

  for (const key of baseStatKeys) {
    stats[key] += gear.baseStats[key] ?? 0;
  }

  const levelBonus = Math.max(0, state.playerProfile.level - 1);
  const derived: DerivedStats = {
    maxHp: Math.round(playerClass.baseStats.hp + levelBonus * playerClass.growthRates.hp + stats.vit * 5 + stats.str),
    maxSp: Math.round(playerClass.baseStats.sp + levelBonus * playerClass.growthRates.sp + stats.int * 3 + stats.vit),
    physicalAttack: Math.round(playerClass.baseStats.attack + levelBonus * playerClass.growthRates.attack + stats.str * 2 + stats.dex),
    rangedAttack: Math.round(playerClass.baseStats.attack + levelBonus * playerClass.growthRates.attack + stats.dex * 2 + stats.agi),
    magicAttack: Math.round(playerClass.baseStats.attack + levelBonus * playerClass.growthRates.attack + stats.int * 3),
    defense: Math.round(playerClass.baseStats.defense + levelBonus * playerClass.growthRates.defense + stats.vit * 2),
    magicDefense: Math.round(stats.int * 2 + stats.vit),
    hit: Math.round(75 + stats.dex * 2 + stats.luk),
    dodge: Math.round(4 + stats.agi * 1.5 + stats.luk * 0.4),
    crit: Math.round(4 + stats.luk * 0.6 + stats.dex * 0.2),
    attackSpeed: Math.round(100 + stats.agi * 1.5 + stats.dex * 0.5),
    castSpeed: Math.round(100 + stats.int + stats.dex * 0.5),
    cooldownReduction: gear.cooldownReduction,
    moveSpeed: Math.round(100 + stats.agi * 0.4),
    weightLimit: Math.round(60 + stats.str * 8 + stats.vit * 4),
    dropChance: gear.dropChance,
    elementDamage: { ...gear.elementDamage },
    raceDamage: { ...gear.raceDamage, ...getSupportRaceDamage(state, support) },
    resistances: { ...gear.resistances },
  };

  return applyDerivedModifiers(derived, [
    ...modifiers,
    { id: "equipment", derivedStats: gear.derivedStats },
  ]);
}

export function syncCharacterVitalsToDerivedStats(
  state: GameState,
  next: DerivedStats,
  previous?: DerivedStats,
): void {
  const hpDelta = previous ? next.maxHp - previous.maxHp : 0;
  const spDelta = previous ? next.maxSp - previous.maxSp : 0;

  state.character.stats.maxHp = next.maxHp;
  state.character.stats.maxSp = next.maxSp;
  state.character.stats.hp = Math.min(next.maxHp, Math.max(1, state.character.stats.hp + Math.max(0, hpDelta)));
  state.character.stats.sp = Math.min(next.maxSp, Math.max(0, state.character.stats.sp + Math.max(0, spDelta)));
}

function applyDerivedModifiers(derived: DerivedStats, modifiers: StatModifier[]): DerivedStats {
  const next = { ...derived };

  for (const modifier of modifiers) {
    for (const [key, value] of Object.entries(modifier.derivedStats ?? {})) {
      const statKey = key as keyof DerivedStats;
      const currentValue = next[statKey];

      if (typeof value === "number" && typeof currentValue === "number") {
        (next as Record<string, unknown>)[statKey] = currentValue + value;
      }
    }
  }

  return next;
}

function getAllStatModifiers(
  state: GameState,
  getStatusEffect?: (id: string) => StatusEffectDefinition,
  getSupport?: (id: string) => SupportDefinition,
): StatModifier[] {
  const statusModifiers = getStatusEffect
    ? getStatusStatModifiers(state.character.statusEffects, getStatusEffect)
    : [];
  const supportModifier = state.support.equippedSupportId && getSupport
    ? getSupportStatModifier(state, getSupport(state.support.equippedSupportId))
    : null;

  return [
    ...state.character.statBuffs,
    ...statusModifiers,
    ...(supportModifier ? [supportModifier] : []),
  ];
}
