import type { ItemDefinition } from "../types/dataDefinitions";
import type { EquipmentData, GameState } from "../types/gameState";

export type ItemEffectId =
  | "cracked-momentum"
  | "cracked-scorch"
  | "cracked-followup"
  | "cracked-siphon"
  | "cracked-ward";

export interface ItemEffectContext {
  movedSinceAttack: boolean;
  critical: boolean;
  elementMatchup: "weak" | "normal" | "resist";
  dodged: boolean;
  attackElement: string;
}

export interface ItemEffectResult {
  damageMultiplier: number;
  bonusDamage: number;
  restoreSp: number;
  applyScorch: boolean;
  applyWard: boolean;
}

export function getEquippedEffectIds(
  equipment: EquipmentData,
  getItem: (id: string) => ItemDefinition,
): ItemEffectId[] {
  return Object.values(equipment)
    .flatMap((itemId) => itemId ? getItem(itemId).effectIds ?? [] : [])
    .filter((effectId): effectId is ItemEffectId => isItemEffectId(effectId));
}

export function resolveItemEffects(
  state: GameState,
  getItem: (id: string) => ItemDefinition,
  context: ItemEffectContext,
): ItemEffectResult {
  const effectIds = getEquippedEffectIds(state.equipment, getItem);
  const result: ItemEffectResult = {
    damageMultiplier: 1,
    bonusDamage: 0,
    restoreSp: 0,
    applyScorch: false,
    applyWard: false,
  };

  if (effectIds.includes("cracked-momentum") && context.movedSinceAttack) {
    result.damageMultiplier += 0.18;
  }
  if (effectIds.includes("cracked-followup") && context.critical) {
    result.bonusDamage += 4;
  }
  if (effectIds.includes("cracked-siphon") && context.elementMatchup === "weak") {
    result.restoreSp += 4;
  }
  if (effectIds.includes("cracked-scorch") && context.attackElement === "fire") {
    result.applyScorch = true;
  }
  if (effectIds.includes("cracked-ward") && context.dodged) {
    result.applyWard = true;
  }

  return result;
}

function isItemEffectId(value: string): value is ItemEffectId {
  return value === "cracked-momentum"
    || value === "cracked-scorch"
    || value === "cracked-followup"
    || value === "cracked-siphon"
    || value === "cracked-ward";
}
