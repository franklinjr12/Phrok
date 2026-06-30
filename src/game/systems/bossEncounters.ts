import type { DataRegistry } from "../data/dataRegistry";
import type { BossPhaseDefinition, MonsterDefinition } from "../types/dataDefinitions";
import type { BossEncounterState, GameState } from "../types/gameState";
import { addInventoryItem, removeInventoryItem } from "./inventory";

export interface BossArenaResult {
  bossId: string;
  arenaMapId: string;
  locked: boolean;
}

export interface MvpSummonResult {
  success: boolean;
  bossId: string;
  arenaMapId?: string;
  consumedItemIds: string[];
  reason?: "not-mvp" | "missing-materials" | "not-repeatable";
}

export function createInitialBossEncounterState(): BossEncounterState {
  return {
    activeBossId: null,
    activeArenaMapId: null,
    defeatedBossIds: [],
    victoryExitUnlockedBossIds: [],
    summonedMvpIds: [],
    mvpRespawnTimers: {},
    lastPhaseByBossId: {},
  };
}

export function beginBossArenaEncounter(
  state: GameState,
  boss: MonsterDefinition,
  currentMapId: string,
): BossArenaResult | null {
  const arena = boss.bossArena;

  if (!boss.boss || !arena || arena.mapId !== currentMapId) {
    return null;
  }

  state.bossEncounters.activeBossId = boss.id;
  state.bossEncounters.activeArenaMapId = arena.mapId;
  state.worldFlags[`boss:${boss.id}:locked`] = arena.locksEncounter;

  return {
    bossId: boss.id,
    arenaMapId: arena.mapId,
    locked: arena.locksEncounter,
  };
}

export function resetActiveBossEncounter(state: GameState): string | null {
  const bossId = state.bossEncounters.activeBossId;

  if (!bossId) {
    return null;
  }

  state.worldFlags[`boss:${bossId}:locked`] = false;
  state.bossEncounters.activeBossId = null;
  state.bossEncounters.activeArenaMapId = null;
  state.bossEncounters.lastPhaseByBossId[bossId] = "";
  return bossId;
}

export function completeBossEncounter(
  state: GameState,
  boss: MonsterDefinition,
  dataRegistry: DataRegistry,
): string[] {
  addUnique(state.bossEncounters.defeatedBossIds, boss.id);
  state.worldFlags[`boss:${boss.id}:locked`] = false;
  state.worldFlags[`boss:${boss.id}:defeated`] = true;

  if (boss.bossArena?.canLeaveAfterVictory) {
    addUnique(state.bossEncounters.victoryExitUnlockedBossIds, boss.id);
    state.worldFlags[`boss:${boss.id}:exit-unlocked`] = true;
  }

  const rewardItemIds = boss.mvp?.specialRewardItemIds ?? [];
  for (const itemId of rewardItemIds) {
    addInventoryItem(state.inventory, dataRegistry.getItem(itemId), 1, false);
  }

  if (boss.mvp) {
    state.bossEncounters.mvpRespawnTimers[boss.id] = boss.mvp.respawnActivityMs;
  }

  if (state.bossEncounters.activeBossId === boss.id) {
    state.bossEncounters.activeBossId = null;
    state.bossEncounters.activeArenaMapId = null;
  }

  return rewardItemIds;
}

export function resolveBossPhase(
  boss: MonsterDefinition,
  hp: number,
  maxHp: number,
): BossPhaseDefinition | null {
  const phases = boss.bossPhases ?? [];

  if (phases.length === 0 || maxHp <= 0) {
    return null;
  }

  const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  return phases.filter((phase) => hpPercent <= phase.hpPercent).at(-1) ?? phases.at(-1) ?? null;
}

export function recordBossPhase(
  state: GameState,
  bossId: string,
  phase: BossPhaseDefinition | null,
): string | null {
  if (!phase) {
    return null;
  }

  const previousPhaseId = state.bossEncounters.lastPhaseByBossId[bossId] ?? "";
  state.bossEncounters.lastPhaseByBossId[bossId] = phase.id;

  return previousPhaseId !== phase.id ? `${bossId}:${previousPhaseId || "none"}->${phase.id}` : null;
}

export function summonMvp(
  state: GameState,
  boss: MonsterDefinition,
): MvpSummonResult {
  if (!boss.mvp) {
    return { success: false, bossId: boss.id, consumedItemIds: [], reason: "not-mvp" };
  }

  if (!boss.mvp.summon.repeatable && state.bossEncounters.summonedMvpIds.includes(boss.id)) {
    return { success: false, bossId: boss.id, consumedItemIds: [], reason: "not-repeatable" };
  }

  const missingMaterial = boss.mvp.summon.requiredMaterials.find((material) => (
    (state.inventory.items.find((entry) => entry.id === material.itemId)?.quantity ?? 0) < material.quantity
  ));

  if (missingMaterial) {
    return { success: false, bossId: boss.id, consumedItemIds: [], reason: "missing-materials" };
  }

  const consumedItemIds: string[] = [];
  for (const material of boss.mvp.summon.requiredMaterials) {
    removeInventoryItem(state.inventory, material.itemId, material.quantity, false);
    consumedItemIds.push(material.itemId);
  }

  addUnique(state.bossEncounters.summonedMvpIds, boss.id);
  state.bossEncounters.mvpRespawnTimers[boss.id] = 0;
  state.bossEncounters.activeBossId = boss.id;
  state.bossEncounters.activeArenaMapId = boss.mvp.summon.arenaMapId;
  state.worldFlags[`mvp:${boss.id}:summoned`] = true;

  return {
    success: true,
    bossId: boss.id,
    arenaMapId: boss.mvp.summon.arenaMapId,
    consumedItemIds,
  };
}

export function updateMvpRespawnTimers(
  state: GameState,
  bosses: MonsterDefinition[],
  activityMs: number,
): string[] {
  const readyBossIds: string[] = [];

  for (const boss of bosses) {
    const remaining = state.bossEncounters.mvpRespawnTimers[boss.id];

    if (!boss.mvp || remaining === undefined || remaining <= 0) {
      continue;
    }

    const nextRemaining = Math.max(0, remaining - Math.max(0, activityMs));
    state.bossEncounters.mvpRespawnTimers[boss.id] = nextRemaining;

    if (nextRemaining === 0) {
      readyBossIds.push(boss.id);
      state.worldFlags[`mvp:${boss.id}:ready`] = true;
    }
  }

  return readyBossIds;
}

function addUnique(values: string[], value: string): void {
  if (!values.includes(value)) {
    values.push(value);
  }
}
