import { beforeEach, describe, expect, it } from "vitest";
import { createNewGameState } from "../data/gameState";
import { eventBus } from "./eventBus";
import {
  allocateStatPoint,
  calculateDerivedStats,
  createEmptyBaseStats,
  getRefundableStatPoints,
  getStatCost,
  resetAllocatedStats,
} from "./stats";
import type { ClassDefinition, ItemDefinition } from "../types/dataDefinitions";

describe("stats", () => {
  beforeEach(() => {
    eventBus.clear();
  });

  it("calculates derived stats from base stats, gear, buffs, and level growth", () => {
    const state = createNewGameState();
    state.playerProfile.level = 2;
    state.character.statBuffs = [{
      id: "training-focus",
      baseStats: { str: 1 },
      derivedStats: { crit: 3 },
    }];

    const stats = calculateDerivedStats(state, swordsman, getItem);

    expect(stats.maxHp).toBe(79);
    expect(stats.maxSp).toBe(26);
    expect(stats.physicalAttack).toBe(34);
    expect(stats.defense).toBe(21);
    expect(stats.crit).toBe(10);
    expect(stats.weightLimit).toBe(160);
  });

  it("allocates points using range-based costs and immediately refreshes derived vitals", () => {
    const state = createNewGameState();
    const events: string[] = [];
    state.playerProfile.statPoints = 3;
    eventBus.on("statsChanged", ({ stat, statPoints }) => events.push(`${stat}:${statPoints}`));

    expect(getStatCost(8)).toBe(1);
    expect(getStatCost(10)).toBe(2);
    expect(allocateStatPoint(state, swordsman, "str", getItem)).toBe(true);
    expect(allocateStatPoint(state, swordsman, "str", getItem)).toBe(true);
    expect(allocateStatPoint(state, swordsman, "str", getItem)).toBe(false);

    expect(state.character.allocatedStats.str).toBe(2);
    expect(state.playerProfile.statPoints).toBe(1);
    expect(state.character.stats.maxHp).toBe(75);
    expect(events).toEqual(["str:2", "str:1"]);
  });

  it("resets allocated stats for gold while preserving class starting stats", () => {
    const state = createNewGameState();
    state.playerProfile.statPoints = 3;
    state.inventory.gold = 75;
    state.playerProfile.gold = 75;
    allocateStatPoint(state, swordsman, "str", getItem);
    allocateStatPoint(state, swordsman, "agi", getItem);

    expect(getRefundableStatPoints(state)).toBe(2);
    expect(resetAllocatedStats(state, swordsman, getItem, 50)).toBe(true);

    expect(state.inventory.gold).toBe(25);
    expect(state.playerProfile.gold).toBe(25);
    expect(state.playerProfile.statPoints).toBe(3);
    expect(state.character.baseStats.str).toBe(8);
    expect(state.character.allocatedStats).toEqual(createEmptyBaseStats());
  });
});

const swordsman: ClassDefinition = {
  id: "swordsman",
  name: "Swordsman",
  description: "",
  roleSummary: "",
  recommendedStats: [],
  difficultyRating: "Easy",
  baseStats: {
    hp: 30,
    sp: 8,
    attack: 6,
    defense: 4,
  },
  growthRates: {
    hp: 5,
    sp: 2,
    attack: 3,
    defense: 3,
  },
  startingWeaponId: "training-sword",
  allowedWeaponTypes: [],
  startingSkillIds: [],
  startingItemIds: [],
  advancedClassOptions: [],
};

function getItem(id: string): ItemDefinition {
  return {
    id,
    name: "Training Sword",
    description: "",
    type: "weapon",
    value: 10,
  };
}
