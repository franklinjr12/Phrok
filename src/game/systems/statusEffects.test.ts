import { describe, expect, it } from "vitest";
import { createNewGameState } from "../data/gameState";
import type { StatusEffectDefinition } from "../types/dataDefinitions";
import { calculateDerivedStats } from "./stats";
import {
  applyStatusEffect,
  getStatusSummary,
  hasControlEffect,
  updateStatusEffects,
} from "./statusEffects";

const poison: StatusEffectDefinition = {
  id: "poison",
  name: "Poison",
  description: "Damage over time.",
  type: "damage",
  duration: 5000,
  tickInterval: 1000,
  stackBehavior: "stack",
  maxStacks: 3,
  statModifiers: {},
  damageOverTime: { amount: 2, damageType: "true" },
  visualIcon: "icon-status-poison",
  dispelRules: { dispellable: true, categories: ["toxin"] },
};

const freeze: StatusEffectDefinition = {
  id: "freeze",
  name: "Freeze",
  description: "Stops action.",
  type: "control",
  duration: 2000,
  tickInterval: 1000,
  stackBehavior: "replace",
  maxStacks: 1,
  statModifiers: { derivedStats: { moveSpeed: -100 } },
  controlEffect: "freeze",
  visualIcon: "icon-status-freeze",
  dispelRules: { dispellable: true, categories: ["ice"] },
};

const blessed: StatusEffectDefinition = {
  id: "blessed",
  name: "Blessed",
  description: "Raises vitality.",
  type: "buff",
  duration: 5000,
  tickInterval: 1000,
  stackBehavior: "refresh",
  maxStacks: 1,
  statModifiers: { baseStats: { vit: 2 }, derivedStats: { defense: 3 } },
  visualIcon: "icon-status-blessed",
  dispelRules: { dispellable: true, categories: ["boon"] },
};

const definitions = new Map([
  [poison.id, poison],
  [freeze.id, freeze],
  [blessed.id, blessed],
]);

describe("statusEffects", () => {
  it("stacks, ticks damage, and expires active status effects", () => {
    const active = applyStatusEffect([], poison, "skill", 1000);
    applyStatusEffect(active, poison, "skill", 1500);

    expect(active).toMatchObject([{ id: "poison", stacks: 2, expiresAt: 6500 }]);

    const firstTick = updateStatusEffects(active, getDefinition, 2500);
    expect(firstTick.damage).toBe(4);
    expect(firstTick.tickedIds).toEqual(["poison"]);
    expect(active).toHaveLength(1);

    const expired = updateStatusEffects(active, getDefinition, 6500);
    expect(expired.expiredIds).toEqual(["poison"]);
    expect(active).toEqual([]);
  });

  it("reports control effects and status summaries", () => {
    const active = applyStatusEffect([], freeze, "skill", 1000);

    expect(hasControlEffect(active, getDefinition, "freeze")).toBe(true);
    expect(getStatusSummary(active, getDefinition)).toBe("freeze:Freeze:1:icon-status-freeze");
  });

  it("feeds active status modifiers into derived stats", () => {
    const state = createNewGameState();
    const baseline = calculateDerivedStats(state, createClass(), getItem);
    applyStatusEffect(state.character.statusEffects, blessed, "skill", 1000);
    const modified = calculateDerivedStats(state, createClass(), getItem, getDefinition);

    expect(modified.maxHp).toBe(baseline.maxHp + 10);
    expect(modified.defense).toBe(baseline.defense + 7);
  });
});

function getDefinition(id: string): StatusEffectDefinition {
  const definition = definitions.get(id);

  if (!definition) {
    throw new Error(`Missing status ${id}`);
  }

  return definition;
}

function createClass() {
  return {
    id: "swordsman",
    name: "Swordsman",
    description: "",
    roleSummary: "",
    recommendedStats: [],
    difficultyRating: "Normal" as const,
    baseStats: { hp: 30, sp: 8, attack: 6, defense: 4 },
    growthRates: { hp: 5, sp: 2, attack: 3, defense: 3 },
    startingWeaponId: "training-sword",
    allowedWeaponTypes: [],
    startingSkillIds: ["power-slash"],
    startingItemIds: ["training-sword"],
    advancedClassOptions: [],
  };
}

function getItem(id: string) {
  return {
    id,
    name: id,
    description: "",
    type: "material" as const,
    value: 0,
  };
}
