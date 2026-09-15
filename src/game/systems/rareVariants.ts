import type { DataRegistry } from "../data/dataRegistry";
import type { RareVariantDefinition } from "../types/dataDefinitions";
import type { GameState } from "../types/gameState";

export interface RareSpawnRoll {
  variant: RareVariantDefinition;
  spawned: boolean;
}

export function getRareVariantsForMap(dataRegistry: DataRegistry, mapId: string): RareVariantDefinition[] {
  return dataRegistry.getRareVariants().filter((variant) => variant.mapIds.includes(mapId));
}

export function rollRareSpawn(
  state: GameState,
  variant: RareVariantDefinition,
  random: () => number = Math.random,
  force = false,
): RareSpawnRoll {
  const activeKey = rareSpawnActiveFlag(variant.id);
  const forceFlag = state.worldFlags[debugForceRareFlag(variant.id)] === true || force;
  if (state.worldFlags[activeKey] === true && !forceFlag) {
    return { variant, spawned: false };
  }

  const spawned = forceFlag || random() <= variant.spawnChance;
  if (spawned) {
    state.worldFlags[activeKey] = true;
  }
  return { variant, spawned };
}

export function clearRareSpawnActive(state: GameState, variantId: string): void {
  delete state.worldFlags[rareSpawnActiveFlag(variantId)];
}

export function recordRareVariantKill(state: GameState, variantId: string): void {
  state.worldFlags[rareKillFlag(variantId)] = true;
  state.worldFlags[rareFirstKillFlag(variantId)] = true;
  clearRareSpawnActive(state, variantId);
}

export function hasRareFirstKill(state: GameState, variantId: string): boolean {
  return state.worldFlags[rareFirstKillFlag(variantId)] === true;
}

export function debugForceRareFlag(variantId: string): string {
  return `debug:force-rare-variant:${variantId}`;
}

function rareSpawnActiveFlag(variantId: string): string {
  return `rare-spawn-active:${variantId}`;
}

function rareKillFlag(variantId: string): string {
  return `rare-kill:${variantId}`;
}

function rareFirstKillFlag(variantId: string): string {
  return `rare-first-kill:${variantId}`;
}
