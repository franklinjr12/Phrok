import { addGold, addInventoryItem } from "./inventory";
import { awardXp } from "./progression";
import { eventBus } from "./eventBus";
import type { DataRegistry } from "../data/dataRegistry";
import type { ItemDefinition, MonsterDefinition, RegionDefinition } from "../types/dataDefinitions";
import type { GameState, HuntingBoardState } from "../types/gameState";

export type HuntingContractRank = "normal" | "elite" | "boss";

export interface HuntingContractDefinition {
  id: string;
  name: string;
  regionId: string;
  targetMonsterId: string;
  targetCount: number;
  rank: HuntingContractRank;
  recommendedLevel: number;
  rewardXp: number;
  rewardGold: number;
  rewardItems: Array<{ itemId: string; quantity: number }>;
  locked: boolean;
  lockReason: string;
}

export type HuntingBoardRefreshReason = "map-clear" | "boss-kill" | "rest";

export function createInitialHuntingBoardState(): HuntingBoardState {
  return {
    activeContractIds: [],
    completedContractIds: [],
    progress: {},
    turnInCounts: {},
    unlockedBossContractRegionIds: [],
    refreshCount: 0,
    lastRefreshReason: "initial",
  };
}

export function getRegionalHuntingContracts(
  state: GameState,
  dataRegistry: DataRegistry,
  regionId: string,
): HuntingContractDefinition[] {
  const region = dataRegistry.getRegion(regionId);
  const regionMonsters = region.monsterIds
    .map((monsterId) => dataRegistry.getMonster(monsterId))
    .sort((left, right) => left.level - right.level);
  const normalTargets = regionMonsters
    .filter((monster) => !monster.elite && !monster.boss && !monster.rareVariant)
    .slice(0, 5);
  const eliteTarget = findFirstMonster(dataRegistry, [...region.bossIds, ...region.monsterIds], "elite");
  const bossTarget = findFirstMonster(dataRegistry, region.bossIds, "boss");

  return [
    ...normalTargets.map((monster, index) => createContract(dataRegistry, region, monster, "normal", index)),
    eliteTarget ? createContract(dataRegistry, region, eliteTarget, "elite", 0) : null,
    bossTarget ? createContract(dataRegistry, region, bossTarget, "boss", 0, !isBossContractUnlocked(state, region.id)) : null,
  ].filter((contract): contract is HuntingContractDefinition => Boolean(contract));
}

export function acceptHuntingContract(state: GameState, contract: HuntingContractDefinition): boolean {
  if (
    contract.locked
    || state.huntingBoard.activeContractIds.includes(contract.id)
    || state.huntingBoard.completedContractIds.includes(contract.id)
  ) {
    return false;
  }

  state.huntingBoard.activeContractIds.push(contract.id);
  state.huntingBoard.progress[contract.id] = state.huntingBoard.progress[contract.id] ?? 0;
  emitHuntingBoardChanged(state);
  return true;
}

export function recordHuntingBoardKill(
  state: GameState,
  dataRegistry: DataRegistry,
  monsterId: string,
): string[] {
  const activeContracts = getAllHuntingContracts(state, dataRegistry)
    .filter((contract) => (
      state.huntingBoard.activeContractIds.includes(contract.id)
      && contract.targetMonsterId === monsterId
      && !state.huntingBoard.completedContractIds.includes(contract.id)
    ));
  const progressed: string[] = [];

  for (const contract of activeContracts) {
    const nextProgress = Math.min(contract.targetCount, (state.huntingBoard.progress[contract.id] ?? 0) + 1);
    state.huntingBoard.progress[contract.id] = nextProgress;
    progressed.push(`${contract.id}:${nextProgress}/${contract.targetCount}`);
  }

  if (progressed.length > 0) {
    emitHuntingBoardChanged(state);
  }

  return progressed;
}

export function turnInHuntingContract(
  state: GameState,
  dataRegistry: DataRegistry,
  contractId: string,
): boolean {
  const contract = getAllHuntingContracts(state, dataRegistry).find((entry) => entry.id === contractId);

  if (
    !contract
    || !state.huntingBoard.activeContractIds.includes(contract.id)
    || state.huntingBoard.completedContractIds.includes(contract.id)
    || (state.huntingBoard.progress[contract.id] ?? 0) < contract.targetCount
  ) {
    return false;
  }

  state.huntingBoard.activeContractIds = state.huntingBoard.activeContractIds.filter((id) => id !== contract.id);
  state.huntingBoard.completedContractIds.push(contract.id);
  state.huntingBoard.turnInCounts[contract.id] = (state.huntingBoard.turnInCounts[contract.id] ?? 0) + 1;
  addGold(state.inventory, contract.rewardGold);
  awardXp(state, dataRegistry.getXpTable("standard"), contract.rewardXp);

  for (const rewardItem of contract.rewardItems) {
    addInventoryItem(state.inventory, dataRegistry.getItem(rewardItem.itemId), rewardItem.quantity);
  }

  emitHuntingBoardChanged(state);
  return true;
}

export function refreshHuntingBoard(state: GameState, reason: HuntingBoardRefreshReason): boolean {
  if (state.huntingBoard.activeContractIds.length > 0) {
    return false;
  }

  state.huntingBoard.completedContractIds = [];
  state.huntingBoard.progress = {};
  state.huntingBoard.refreshCount += 1;
  state.huntingBoard.lastRefreshReason = reason;
  emitHuntingBoardChanged(state);
  return true;
}

export function unlockBossContractForMonster(
  state: GameState,
  dataRegistry: DataRegistry,
  monsterId: string,
): string | null {
  const region = dataRegistry.getRegions().find((entry) => entry.bossIds.includes(monsterId));

  if (!region || isBossContractUnlocked(state, region.id)) {
    return null;
  }

  state.huntingBoard.unlockedBossContractRegionIds.push(region.id);
  emitHuntingBoardChanged(state);
  return region.id;
}

export function getHuntingBoardSummary(state: GameState, dataRegistry: DataRegistry, regionId: string): string {
  return getRegionalHuntingContracts(state, dataRegistry, regionId)
    .map((contract) => {
      const progress = state.huntingBoard.progress[contract.id] ?? 0;
      const status = contract.locked
        ? "locked"
        : state.huntingBoard.completedContractIds.includes(contract.id)
          ? "completed"
          : state.huntingBoard.activeContractIds.includes(contract.id)
            ? "active"
            : "available";

      return `${contract.id}:${status}:${progress}/${contract.targetCount}`;
    })
    .join("|");
}

function getAllHuntingContracts(state: GameState, dataRegistry: DataRegistry): HuntingContractDefinition[] {
  return dataRegistry.getRegions().flatMap((region) => getRegionalHuntingContracts(state, dataRegistry, region.id));
}

function createContract(
  dataRegistry: DataRegistry,
  region: RegionDefinition,
  monster: MonsterDefinition,
  rank: HuntingContractRank,
  index: number,
  locked = false,
): HuntingContractDefinition {
  const rewardItemId = getRewardItemId(dataRegistry, monster);
  const rankMultiplier = rank === "boss" ? 5 : rank === "elite" ? 3 : 1 + index;
  const targetCount = rank === "normal" ? 3 + index : 1;
  const contractKind = rank === "normal" ? `hunt-${index + 1}` : rank;

  return {
    id: `${region.id}-${contractKind}-${monster.id}`,
    name: `${region.name} ${rank === "normal" ? "Hunt" : rank === "elite" ? "Elite Hunt" : "Boss Writ"}: ${monster.name}`,
    regionId: region.id,
    targetMonsterId: monster.id,
    targetCount,
    rank,
    recommendedLevel: monster.level,
    rewardXp: Math.max(10, monster.xpReward * targetCount + region.levelRange.min * 3 * rankMultiplier),
    rewardGold: Math.max(8, monster.level * 4 * rankMultiplier + targetCount * 6),
    rewardItems: rewardItemId ? [{ itemId: rewardItemId, quantity: rank === "normal" ? 1 : rankMultiplier }] : [],
    locked,
    lockReason: locked ? "Defeat region boss once" : "",
  };
}

function findFirstMonster(
  dataRegistry: DataRegistry,
  monsterIds: string[],
  rank: Extract<HuntingContractRank, "elite" | "boss">,
): MonsterDefinition | null {
  for (const monsterId of monsterIds) {
    const monster = dataRegistry.getMonster(monsterId);

    if ((rank === "elite" && monster.elite) || (rank === "boss" && monster.boss)) {
      return monster;
    }
  }

  return null;
}

function getRewardItemId(dataRegistry: DataRegistry, monster: MonsterDefinition): string {
  const dropTable = dataRegistry.getDropTable(monster.dropTableId);
  const entry = dropTable.entries.find((drop) => {
    if (!drop.itemId) {
      return false;
    }

    const item = dataRegistry.getItem(drop.itemId);
    return item.type === "material" || item.type === "consumable" || item.type === "key";
  });

  return entry?.itemId ?? "";
}

function isBossContractUnlocked(state: GameState, regionId: string): boolean {
  return state.huntingBoard.unlockedBossContractRegionIds.includes(regionId);
}

function emitHuntingBoardChanged(state: GameState): void {
  eventBus.emit("huntingBoardChanged", { huntingBoard: state.huntingBoard });
}
