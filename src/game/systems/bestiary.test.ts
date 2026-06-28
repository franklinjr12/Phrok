import { describe, expect, it } from "vitest";
import { createNewGameState } from "../data/gameState";
import type { DropTableDefinition, MonsterDefinition } from "../types/dataDefinitions";
import { bestiaryFamilyBonus, getBestiaryFamilyDamageBonuses, recordMonsterKill } from "./bestiary";

const monster: MonsterDefinition = {
  id: "green-jelly",
  name: "Green Jelly",
  family: "slime",
  element: "neutral",
  level: 1,
  hp: 10,
  attack: 2,
  defense: 1,
  xpReward: 5,
  dropTableId: "green-jelly-drops",
  behavior: "passive",
  aggroRange: 150,
  attackRange: 70,
  leashDistance: 240,
  leashTimeoutMs: 6500,
  assistRadius: 96,
  castRange: 160,
  castCooldownMs: 2200,
  respawnMs: 15000,
  elite: false,
  boss: false,
};

const dropTable: DropTableDefinition = {
  id: "green-jelly-drops",
  entries: [
    { itemId: "jelly-gel", chance: 1, minQuantity: 1, maxQuantity: 2 },
    { itemId: "rare-jelly-core", chance: 0.05, minQuantity: 1, maxQuantity: 1 },
    { type: "gold", chance: 1, minQuantity: 3, maxQuantity: 5 },
  ],
};

describe("bestiary", () => {
  it("tracks kills, milestones, drops, and family bonuses", () => {
    const state = createNewGameState();

    recordMonsterKill(state, monster, dropTable, "2026-06-28T00:00:00.000Z");
    expect(state.bestiary.entries["green-jelly"]).toMatchObject({
      kills: 1,
      firstDiscoveredAt: "2026-06-28T00:00:00.000Z",
      unlockedMilestones: [1],
    });
    expect(state.bestiary.discoveredEnemyIds).toEqual(["green-jelly"]);
    expect(state.bestiary.defeatedEnemyIds).toEqual(["green-jelly"]);

    for (let count = 1; count < 15; count += 1) {
      recordMonsterKill(state, monster, dropTable);
    }
    expect(state.bestiary.entries["green-jelly"].unlockedMilestones).toEqual([1, 5, 15]);
    expect(state.bestiary.entries["green-jelly"].discoveredDropIds).toEqual(["jelly-gel"]);

    for (let count = 15; count < 100; count += 1) {
      recordMonsterKill(state, monster, dropTable);
    }
    expect(state.bestiary.entries["green-jelly"].unlockedMilestones).toEqual([1, 5, 15, 30, 50, 100]);
    expect(state.bestiary.entries["green-jelly"].discoveredDropIds).toEqual(["jelly-gel", "rare-jelly-core"]);
    expect(getBestiaryFamilyDamageBonuses(state)).toEqual({ slime: bestiaryFamilyBonus });
  });
});
