import { addGold, addInventoryItem } from "./inventory";
import type { DataRegistry } from "../data/dataRegistry";
import type { EndgameTowerState, GameState } from "../types/gameState";

export const endgameTowerId = "starfall-tower";
export const endgameTowerEntranceMapId = "starfall-astral-spire";
export const endgameTowerUnlockFlag = "endgame-tower-unlock";
export const endgameTowerMaxFloor = 30;

export type EndgameTowerModifierId =
  | "burning"
  | "cursed"
  | "swarming"
  | "elite"
  | "fragile"
  | "treasure"
  | "elemental";

export type EndgameTowerChallengeKind = "wave" | "hazard" | "miniboss" | "majorBoss";
export type EndgameTowerRewardCategory = "sigil" | "refinement" | "cosmetic" | "mythic" | "skillAugment";

export interface EndgameTowerModifier {
  id: EndgameTowerModifierId;
  name: string;
  rewardMultiplier: number;
  behavior: string;
  incompatibleWith: EndgameTowerModifierId[];
}

export interface EndgameTowerReward {
  itemId: string;
  quantity: number;
  category: EndgameTowerRewardCategory;
  guaranteed: boolean;
}

export interface EndgameTowerFloor {
  floor: number;
  kind: EndgameTowerChallengeKind;
  monsterIds: string[];
  modifierIds: EndgameTowerModifierId[];
  rewardScale: number;
  rewards: EndgameTowerReward[];
}

export interface EndgameTowerFloorStart {
  floor: EndgameTowerFloor;
  modifierDisplay: string;
}

export interface EndgameTowerCompletion {
  floor: EndgameTowerFloor;
  rewards: EndgameTowerReward[];
  highestFloorCompleted: number;
  nextFloor: number;
}

export const endgameTowerModifiers: EndgameTowerModifier[] = [
  {
    id: "burning",
    name: "Burning",
    rewardMultiplier: 1.12,
    behavior: "Periodic fire lanes add pressure between waves.",
    incompatibleWith: ["fragile"],
  },
  {
    id: "cursed",
    name: "Cursed",
    rewardMultiplier: 1.15,
    behavior: "Healing is reduced while curse casters are alive.",
    incompatibleWith: ["treasure"],
  },
  {
    id: "swarming",
    name: "Swarming",
    rewardMultiplier: 1.1,
    behavior: "Extra lesser enemies spawn in each wave.",
    incompatibleWith: ["elite"],
  },
  {
    id: "elite",
    name: "Elite",
    rewardMultiplier: 1.18,
    behavior: "One wave enemy is promoted to elite strength.",
    incompatibleWith: ["swarming"],
  },
  {
    id: "fragile",
    name: "Fragile",
    rewardMultiplier: 1.08,
    behavior: "Enemies deal more damage but have reduced defense.",
    incompatibleWith: ["burning"],
  },
  {
    id: "treasure",
    name: "Treasure",
    rewardMultiplier: 1.25,
    behavior: "Challenge pressure is lower and bonus loot is added.",
    incompatibleWith: ["cursed"],
  },
  {
    id: "elemental",
    name: "Elemental",
    rewardMultiplier: 1.14,
    behavior: "Enemy attacks rotate fire, ice, lightning, and arcane effects.",
    incompatibleWith: [],
  },
];

export const endgameTowerFloors: EndgameTowerFloor[] = Array.from({ length: endgameTowerMaxFloor }, (_, index) => {
  const floor = index + 1;
  const kind = getFloorKind(floor);
  const modifierIds = getFloorModifierIds(floor);
  const rewardScale = getFloorRewardScale(floor, modifierIds);

  return {
    floor,
    kind,
    monsterIds: getFloorMonsterIds(kind, floor),
    modifierIds,
    rewardScale,
    rewards: getFloorRewards(floor, kind, rewardScale),
  };
});

export function createInitialEndgameTowerState(): EndgameTowerState {
  return {
    unlocked: false,
    currentFloor: 1,
    highestFloorCompleted: 0,
    completedMilestoneFloors: [],
    repeatClearCountByFloor: {},
    activeRunId: null,
  };
}

export function isEndgameTowerAvailable(state: GameState, mapId: string): boolean {
  return mapId === endgameTowerEntranceMapId
    && (state.endgameTower.unlocked || state.worldFlags[endgameTowerUnlockFlag] === true);
}

export function beginEndgameTowerFloor(state: GameState): EndgameTowerFloorStart | null {
  if (!state.endgameTower.unlocked && state.worldFlags[endgameTowerUnlockFlag] !== true) {
    return null;
  }

  state.endgameTower.unlocked = true;
  const floor = getEndgameTowerFloor(state.endgameTower.currentFloor);
  state.endgameTower.activeRunId = `${endgameTowerId}:floor-${floor.floor}`;

  return {
    floor,
    modifierDisplay: formatModifierDisplay(floor),
  };
}

export function completeEndgameTowerFloor(
  state: GameState,
  dataRegistry: Pick<DataRegistry, "getItem">,
): EndgameTowerCompletion | null {
  const floor = getEndgameTowerFloor(state.endgameTower.currentFloor);

  if (!state.endgameTower.activeRunId) {
    return null;
  }

  const repeatCount = state.endgameTower.repeatClearCountByFloor[String(floor.floor)] ?? 0;
  const rewards = scaleRepeatRewards(floor.rewards, repeatCount);

  for (const reward of rewards) {
    addInventoryItem(state.inventory, dataRegistry.getItem(reward.itemId), reward.quantity);
  }

  addGold(state.inventory, floor.floor * 35);
  state.playerProfile.gold = state.inventory.gold;

  state.endgameTower.highestFloorCompleted = Math.max(state.endgameTower.highestFloorCompleted, floor.floor);
  state.endgameTower.repeatClearCountByFloor[String(floor.floor)] = repeatCount + 1;

  if (isMilestoneFloor(floor.floor) && !state.endgameTower.completedMilestoneFloors.includes(floor.floor)) {
    state.endgameTower.completedMilestoneFloors.push(floor.floor);
  }

  const nextFloor = floor.floor >= endgameTowerMaxFloor ? endgameTowerMaxFloor : floor.floor + 1;
  state.endgameTower.currentFloor = nextFloor;
  state.endgameTower.activeRunId = null;

  return {
    floor,
    rewards,
    highestFloorCompleted: state.endgameTower.highestFloorCompleted,
    nextFloor,
  };
}

export function getEndgameTowerFloor(floor: number): EndgameTowerFloor {
  const clampedFloor = Math.max(1, Math.min(endgameTowerMaxFloor, Math.floor(floor)));
  return endgameTowerFloors[clampedFloor - 1];
}

export function isMilestoneFloor(floor: number): boolean {
  return floor % 5 === 0;
}

export function formatModifierDisplay(floor: EndgameTowerFloor): string {
  return floor.modifierIds
    .map((modifierId) => getEndgameTowerModifier(modifierId).name)
    .join(" + ");
}

export function getEndgameTowerModifier(id: EndgameTowerModifierId): EndgameTowerModifier {
  return endgameTowerModifiers.find((modifier) => modifier.id === id)!;
}

function getFloorKind(floor: number): EndgameTowerChallengeKind {
  if (floor % 10 === 0) {
    return "majorBoss";
  }

  if (floor % 5 === 0) {
    return "miniboss";
  }

  return floor % 3 === 0 ? "hazard" : "wave";
}

function getFloorModifierIds(floor: number): EndgameTowerModifierId[] {
  const modifierIds = endgameTowerModifiers.map((modifier) => modifier.id);
  const first = modifierIds[(floor - 1) % modifierIds.length];
  const second = modifierIds[(floor + 2) % modifierIds.length];
  const firstModifier = getEndgameTowerModifier(first);

  return firstModifier.incompatibleWith.includes(second) ? [first] : [first, second];
}

function getFloorRewardScale(floor: number, modifierIds: EndgameTowerModifierId[]): number {
  const modifierScale = modifierIds.reduce((total, modifierId) => total * getEndgameTowerModifier(modifierId).rewardMultiplier, 1);
  return Number((1 + floor * 0.08 + modifierScale - 1).toFixed(2));
}

function getFloorMonsterIds(kind: EndgameTowerChallengeKind, floor: number): string[] {
  if (kind === "majorBoss") {
    return floor === endgameTowerMaxFloor ? ["fallen-star-saint"] : ["rune-chimera"];
  }

  if (kind === "miniboss") {
    return ["tower-guardian", "astral-construct"];
  }

  if (kind === "hazard") {
    return ["elemental-rune", "rune-archivist"];
  }

  return ["elemental-rune", "tower-guardian", "astral-construct"];
}

function getFloorRewards(
  floor: number,
  kind: EndgameTowerChallengeKind,
  rewardScale: number,
): EndgameTowerReward[] {
  const rewards: EndgameTowerReward[] = [
    {
      itemId: floor < 12 ? "sigil-flame-sigil-7" : floor < 22 ? "sigil-tide-sigil-8" : "sigil-of-fortune",
      quantity: Math.max(1, Math.floor(rewardScale)),
      category: "sigil",
      guaranteed: isMilestoneFloor(floor),
    },
    {
      itemId: floor < 15 ? "rune-ore" : "astral-gear",
      quantity: Math.max(1, Math.ceil(rewardScale)),
      category: "refinement",
      guaranteed: true,
    },
  ];

  if (isMilestoneFloor(floor)) {
    rewards.push({
      itemId: "starfall-raiment-token",
      quantity: Math.max(1, Math.floor(floor / 10) + 1),
      category: "cosmetic",
      guaranteed: true,
    });
  }

  if (kind === "majorBoss") {
    rewards.push({
      itemId: floor === endgameTowerMaxFloor ? "mythic-meteor-core" : "chimera-runeplate",
      quantity: Math.max(1, Math.floor(floor / 10)),
      category: "mythic",
      guaranteed: true,
    });
    rewards.push({
      itemId: "starfall-skill-augment",
      quantity: Math.max(1, Math.floor(floor / 15)),
      category: "skillAugment",
      guaranteed: true,
    });
  }

  if (floor % 4 === 0) {
    rewards.push({
      itemId: "rune-glass",
      quantity: Math.max(1, Math.floor(rewardScale)),
      category: "refinement",
      guaranteed: false,
    });
  }

  return rewards;
}

function scaleRepeatRewards(rewards: EndgameTowerReward[], repeatCount: number): EndgameTowerReward[] {
  const repeatMultiplier = repeatCount === 0 ? 1 : 0.55;

  return rewards.map((reward) => ({
    ...reward,
    quantity: reward.guaranteed
      ? reward.quantity
      : Math.max(1, Math.floor(reward.quantity * repeatMultiplier)),
  }));
}
