import { eventBus } from "./eventBus";
import { advancedClassUnlockLevel } from "./advancedClasses";
import type { XpTableDefinition } from "../types/dataDefinitions";
import type { GameState } from "../types/gameState";

const maxLevel = 99;
const statPointsPerLevel = 3;
const skillPointsPerLevel = 1;
const hpPerLevel = 5;
const spPerLevel = 2;

export interface XpGainResult {
  amount: number;
  totalXp: number;
  levelsGained: number[];
  nextLevelXp: number | null;
}

export function awardXp(state: GameState, xpTable: XpTableDefinition, amount: number): XpGainResult {
  const safeAmount = Math.max(0, Math.floor(amount));
  state.playerProfile.xp += safeAmount;

  const levelsGained: number[] = [];

  while (state.playerProfile.level < maxLevel) {
    const nextLevel = state.playerProfile.level + 1;
    const nextThreshold = getLevelXpThreshold(xpTable, nextLevel);

    if (nextThreshold === null || state.playerProfile.xp < nextThreshold) {
      break;
    }

    state.playerProfile.level = nextLevel;
    state.playerProfile.statPoints += statPointsPerLevel;
    state.playerProfile.skillPoints += skillPointsPerLevel;
    state.character.stats.maxHp += hpPerLevel;
    state.character.stats.hp = state.character.stats.maxHp;
    state.character.stats.maxSp += spPerLevel;
    state.character.stats.sp = state.character.stats.maxSp;
    levelsGained.push(nextLevel);
    eventBus.emit("levelUp", {
      level: nextLevel,
      statPoints: state.playerProfile.statPoints,
      skillPoints: state.playerProfile.skillPoints,
      hp: state.character.stats.hp,
      maxHp: state.character.stats.maxHp,
      sp: state.character.stats.sp,
      maxSp: state.character.stats.maxSp,
    });
    if (nextLevel === advancedClassUnlockLevel) {
      eventBus.emit("advancedClassUnlocked", { level: nextLevel });
    }
  }

  const result = {
    amount: safeAmount,
    totalXp: state.playerProfile.xp,
    levelsGained,
    nextLevelXp: getLevelXpThreshold(xpTable, state.playerProfile.level + 1),
  };

  eventBus.emit("xpGained", result);

  return result;
}

export function getLevelXpThreshold(xpTable: XpTableDefinition, level: number): number | null {
  if (level > maxLevel) {
    return null;
  }

  const threshold = xpTable.levels[String(level)];
  return typeof threshold === "number" ? threshold : null;
}
