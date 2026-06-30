import { addGold, addInventoryItem } from "./inventory";
import type { AdvancedClassDefinition } from "./advancedClasses";
import { advancedClassDefinitions } from "./advancedClasses";
import type { DataRegistry } from "../data/dataRegistry";
import type { DungeonDefinition } from "../types/dataDefinitions";
import type { ChallengeDungeonState, GameState } from "../types/gameState";

export const challengeDungeonUnlockLevel = 70;
export const challengeDungeonUnlockFlag = "challenge-dungeons-unlocked";

export type ChallengeDungeonModifierId =
  | "overgrown"
  | "cursed"
  | "swarming"
  | "elite"
  | "volatile"
  | "treasure";

export interface ChallengeDungeonModifier {
  id: ChallengeDungeonModifierId;
  name: string;
  description: string;
  enemyHpMultiplier: number;
  enemyDamageMultiplier: number;
  rewardMultiplier: number;
}

export interface ChallengeDungeonStart {
  dungeonId: string;
  modifier: ChallengeDungeonModifier;
  modifierDisplay: string;
  difficultyDisplay: string;
  rewardDisplay: string;
}

export interface ChallengeDungeonCompletion {
  dungeonId: string;
  modifierId: ChallengeDungeonModifierId;
  rewards: Array<{ itemId: string; quantity: number }>;
  gold: number;
  repeatCount: number;
}

export interface ClassTrialDefinition {
  id: string;
  advancedClassId: string;
  name: string;
  lesson: string;
  monsterIds: string[];
  rewardItemId: string;
  rewardKind: "skillAugment" | "cosmetic";
  replayable: true;
}

export type ClassTrialStartResult =
  | { success: true; trial: ClassTrialDefinition; replay: boolean }
  | { success: false; reason: "no-advanced-class" | "missing-trial" };

export function createInitialChallengeDungeonState(): ChallengeDungeonState {
  return {
    unlocked: false,
    activeRun: null,
    completedRunsByDungeonId: {},
    completedRunsByModifierId: {},
    completedClassTrialIds: [],
    activeClassTrialId: null,
  };
}

export const challengeDungeonModifiers: ChallengeDungeonModifier[] = [
  {
    id: "overgrown",
    name: "Overgrown",
    description: "Hazards linger longer and plant packs reinforce rooms.",
    enemyHpMultiplier: 1.2,
    enemyDamageMultiplier: 1.1,
    rewardMultiplier: 1.25,
  },
  {
    id: "cursed",
    name: "Cursed",
    description: "Status effects last longer and healing windows shrink.",
    enemyHpMultiplier: 1.15,
    enemyDamageMultiplier: 1.22,
    rewardMultiplier: 1.32,
  },
  {
    id: "swarming",
    name: "Swarming",
    description: "More lesser enemies pressure every combat room.",
    enemyHpMultiplier: 1.1,
    enemyDamageMultiplier: 1.12,
    rewardMultiplier: 1.22,
  },
  {
    id: "elite",
    name: "Elite",
    description: "Key enemies gain elite durability and burst.",
    enemyHpMultiplier: 1.35,
    enemyDamageMultiplier: 1.28,
    rewardMultiplier: 1.45,
  },
  {
    id: "volatile",
    name: "Volatile",
    description: "Boss mechanics resolve faster and hazards chain together.",
    enemyHpMultiplier: 1.18,
    enemyDamageMultiplier: 1.35,
    rewardMultiplier: 1.38,
  },
  {
    id: "treasure",
    name: "Treasure",
    description: "Enemy pressure rises modestly while bonus caches appear.",
    enemyHpMultiplier: 1.12,
    enemyDamageMultiplier: 1.08,
    rewardMultiplier: 1.5,
  },
];

export const classTrials: ClassTrialDefinition[] = [
  createClassTrial("knight", "Charge lanes teach burst timing.", ["tower-guardian", "brass-burrower"], "starfall-skill-augment", "skillAugment"),
  createClassTrial("guardian", "Guard windows teach mitigation and holy counters.", ["bell-wraith", "tower-guardian"], "hallowed-bell-charm", "cosmetic"),
  createClassTrial("wizard", "Element swaps teach long-cast planning.", ["elemental-rune", "rune-chimera"], "starfall-skill-augment", "skillAugment"),
  createClassTrial("sage", "Rune traps teach spell denial and field control.", ["rune-archivist", "elemental-rune"], "rune-glass", "cosmetic"),
  createClassTrial("hunter", "Trap routes teach kiting and range discipline.", ["black-reed-stalker", "tower-guardian"], "starfall-skill-augment", "skillAugment"),
  createClassTrial("minstrel", "Song chains teach rhythm uptime under pressure.", ["rune-archivist", "bell-wraith"], "starfall-raiment-token", "cosmetic"),
  createClassTrial("assassin", "Poison windows teach execution timing.", ["dune-tyrant", "fallen-star-saint"], "starfall-skill-augment", "skillAugment"),
  createClassTrial("rogue", "Debuff swaps teach control, loot, and hybrid spacing.", ["sunken-corsair", "rune-archivist"], "corsair-coin", "cosmetic"),
];

export function isChallengeDungeonAvailable(state: GameState, dungeon: DungeonDefinition | undefined): boolean {
  return Boolean(dungeon?.replayable)
    && (state.challengeDungeons.unlocked
      || state.worldFlags[challengeDungeonUnlockFlag] === true
      || state.playerProfile.level >= challengeDungeonUnlockLevel);
}

export function beginChallengeDungeon(
  state: GameState,
  dungeon: DungeonDefinition,
  modifierId = pickDefaultModifierId(dungeon),
  startedAt = new Date().toISOString(),
): ChallengeDungeonStart | null {
  if (!isChallengeDungeonAvailable(state, dungeon)) {
    return null;
  }

  const modifier = getChallengeDungeonModifier(modifierId);
  state.challengeDungeons.unlocked = true;
  state.worldFlags[challengeDungeonUnlockFlag] = true;
  state.challengeDungeons.activeRun = {
    dungeonId: dungeon.id,
    modifierId: modifier.id,
    startedAt,
    rewardMultiplier: modifier.rewardMultiplier,
    enemyHpMultiplier: modifier.enemyHpMultiplier,
    enemyDamageMultiplier: modifier.enemyDamageMultiplier,
  };

  return {
    dungeonId: dungeon.id,
    modifier,
    modifierDisplay: formatChallengeModifierDisplay(modifier),
    difficultyDisplay: formatChallengeDifficultyDisplay(modifier),
    rewardDisplay: `x${modifier.rewardMultiplier.toFixed(2)}`,
  };
}

export function completeChallengeDungeon(
  state: GameState,
  dataRegistry: Pick<DataRegistry, "getDungeon" | "getItem">,
): ChallengeDungeonCompletion | null {
  const activeRun = state.challengeDungeons.activeRun;

  if (!activeRun) {
    return null;
  }

  const dungeon = dataRegistry.getDungeon(activeRun.dungeonId);
  const repeatCount = state.challengeDungeons.completedRunsByDungeonId[dungeon.id] ?? 0;
  const rewardQuantity = Math.max(1, Math.ceil(activeRun.rewardMultiplier + repeatCount * 0.25));
  const rewardIds = [...dungeon.rewardItemIds, ...dungeon.rareMaterialIds].slice(0, 4);
  const rewards = rewardIds.map((itemId) => ({ itemId, quantity: rewardQuantity }));

  for (const reward of rewards) {
    addInventoryItem(state.inventory, dataRegistry.getItem(reward.itemId), reward.quantity);
  }

  const gold = Math.round(dungeon.levelRange.max * 12 * activeRun.rewardMultiplier);
  addGold(state.inventory, gold);
  state.playerProfile.gold = state.inventory.gold;
  state.challengeDungeons.completedRunsByDungeonId[dungeon.id] = repeatCount + 1;
  state.challengeDungeons.completedRunsByModifierId[activeRun.modifierId] = (
    state.challengeDungeons.completedRunsByModifierId[activeRun.modifierId] ?? 0
  ) + 1;
  state.challengeDungeons.activeRun = null;

  return {
    dungeonId: dungeon.id,
    modifierId: activeRun.modifierId as ChallengeDungeonModifierId,
    rewards,
    gold,
    repeatCount: repeatCount + 1,
  };
}

export function startClassTrial(state: GameState): ClassTrialStartResult {
  const advancedClassId = state.character.advancedClass?.id;

  if (!advancedClassId) {
    return { success: false, reason: "no-advanced-class" };
  }

  const trial = getClassTrial(advancedClassId);

  if (!trial) {
    return { success: false, reason: "missing-trial" };
  }

  state.challengeDungeons.activeClassTrialId = trial.id;

  return {
    success: true,
    trial,
    replay: state.challengeDungeons.completedClassTrialIds.includes(trial.id),
  };
}

export function completeClassTrial(
  state: GameState,
  dataRegistry: Pick<DataRegistry, "getItem">,
): ClassTrialDefinition | null {
  const trial = state.challengeDungeons.activeClassTrialId
    ? classTrials.find((candidate) => candidate.id === state.challengeDungeons.activeClassTrialId)
    : undefined;

  if (!trial) {
    return null;
  }

  addInventoryItem(state.inventory, dataRegistry.getItem(trial.rewardItemId), 1);

  if (!state.challengeDungeons.completedClassTrialIds.includes(trial.id)) {
    state.challengeDungeons.completedClassTrialIds.push(trial.id);
  }

  state.challengeDungeons.activeClassTrialId = null;

  return trial;
}

export function getClassTrial(advancedClassId: string): ClassTrialDefinition | undefined {
  return classTrials.find((trial) => trial.advancedClassId === advancedClassId);
}

export function formatChallengeModifierDisplay(modifier: ChallengeDungeonModifier): string {
  return `${modifier.name}: ${modifier.description}`;
}

export function formatChallengeDifficultyDisplay(modifier: ChallengeDungeonModifier): string {
  return `HP x${modifier.enemyHpMultiplier.toFixed(2)} / Damage x${modifier.enemyDamageMultiplier.toFixed(2)}`;
}

export function getChallengeDungeonModifier(id: string): ChallengeDungeonModifier {
  return challengeDungeonModifiers.find((modifier) => modifier.id === id) ?? challengeDungeonModifiers[0];
}

function pickDefaultModifierId(dungeon: DungeonDefinition): ChallengeDungeonModifierId {
  return challengeDungeonModifiers[dungeon.id.length % challengeDungeonModifiers.length].id;
}

function createClassTrial(
  advancedClassId: AdvancedClassDefinition["id"],
  lesson: string,
  monsterIds: string[],
  rewardItemId: string,
  rewardKind: ClassTrialDefinition["rewardKind"],
): ClassTrialDefinition {
  const advancedClass = advancedClassDefinitions.find((definition) => definition.id === advancedClassId)!;

  return {
    id: `${advancedClassId}-trial`,
    advancedClassId,
    name: `${advancedClass.name} Trial`,
    lesson,
    monsterIds,
    rewardItemId,
    rewardKind,
    replayable: true,
  };
}
