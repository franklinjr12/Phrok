import type { MonsterDefinition, XpTableDefinition } from "../types/dataDefinitions";

export interface LevelBandEstimate {
  level: number;
  xpToNext: number | null;
  representativeXp: number;
  estimatedKills: number | null;
}

export interface MonsterDifficultyEstimate {
  monsterId: string;
  level: number;
  hp: number;
  attack: number;
  defense: number;
  xpReward: number;
  durability: number;
  expectedHitsToKill: number;
  threatRatio: number;
}

export function getXpToNextLevel(xpTable: XpTableDefinition, level: number): number | null {
  const current = xpTable.levels[String(level)];
  const next = xpTable.levels[String(level + 1)];
  if (typeof current !== "number" || typeof next !== "number") {
    return null;
  }
  return Math.max(0, next - current);
}

export function estimateKillsToLevel(xpToNext: number | null, monsterXp: number): number | null {
  if (xpToNext == null || monsterXp <= 0) {
    return null;
  }
  return Math.ceil(xpToNext / monsterXp);
}

export function estimateMonsterDifficulty(
  monster: MonsterDefinition,
  playerAttack: number,
  playerHp: number,
): MonsterDifficultyEstimate {
  const durability = monster.hp + monster.defense * 4;
  const expectedHitsToKill = Math.max(1, Math.ceil(monster.hp / Math.max(1, playerAttack - monster.defense * 0.65)));
  const threatRatio = Number((monster.attack / Math.max(1, playerHp)).toFixed(3));
  return {
    monsterId: monster.id,
    level: monster.level,
    hp: monster.hp,
    attack: monster.attack,
    defense: monster.defense,
    xpReward: monster.xpReward,
    durability,
    expectedHitsToKill,
    threatRatio,
  };
}

export function buildEarlyGameBalanceReport(
  xpTable: XpTableDefinition,
  monsters: MonsterDefinition[],
  playerAttack: number,
  playerHp: number,
  throughLevel = 20,
): {
  levels: LevelBandEstimate[];
  monsters: MonsterDifficultyEstimate[];
} {
  const representative = monsters.filter((monster) => monster.level <= throughLevel);
  return {
    levels: Array.from({ length: throughLevel }, (_, index) => {
      const level = index + 1;
      const xpToNext = getXpToNextLevel(xpTable, level);
      const bandMonsters = representative.filter((monster) => monster.level >= level - 2 && monster.level <= level + 2);
      const representativeXp = bandMonsters.length > 0
        ? Math.round(bandMonsters.reduce((sum, monster) => sum + monster.xpReward, 0) / bandMonsters.length)
        : 0;
      return {
        level,
        xpToNext,
        representativeXp,
        estimatedKills: estimateKillsToLevel(xpToNext, representativeXp),
      };
    }),
    monsters: representative.map((monster) => estimateMonsterDifficulty(monster, playerAttack, playerHp)),
  };
}

export function findEarlyGameStatOutliers(monsters: MonsterDefinition[]): MonsterDefinition[] {
  return monsters.filter((monster) => {
    if (monster.boss || monster.elite || monster.level > 20) {
      return false;
    }
    const hpPerLevel = monster.hp / Math.max(1, monster.level);
    const attackPerLevel = monster.attack / Math.max(1, monster.level);
    return hpPerLevel > 40 || attackPerLevel > 4 || monster.hp > monster.level * 25;
  });
}
