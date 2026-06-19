import { describe, expect, it } from "vitest";
import { createNewGameState } from "../data/gameState";
import type { SkillDefinition, StatusEffectDefinition } from "../types/dataDefinitions";
import {
  allocateSkillPoint,
  assignHotbarAction,
  executeSkill,
  getHotbarAction,
  getLearnedSkillLevel,
  getSkillsByClass,
} from "./skills";

const powerSlash: SkillDefinition = {
  id: "power-slash",
  name: "Power Slash",
  class: "swordsman",
  description: "Strike hard.",
  classId: "swordsman",
  type: "active",
  targetingMode: "enemy",
  requiredLevel: 1,
  requiredSkillLevel: 0,
  maxSkillLevel: 5,
  spCost: 2,
  cooldown: 1000,
  castTime: 0,
  recoveryTime: 200,
  range: 80,
  area: 0,
  element: "neutral",
  scalingStat: "str",
  damageMultiplier: 1,
  statusEffects: ["stagger"],
  animationKey: "power-slash",
  icon: "power-slash",
  passiveModifiers: {},
  power: 12,
  target: "enemy",
};

const guarded: StatusEffectDefinition = {
  id: "guarded",
  name: "Guarded",
  description: "Defensive status.",
  type: "buff",
  duration: 5000,
  tickInterval: 1000,
  stackBehavior: "refresh",
  maxStacks: 1,
  statModifiers: { derivedStats: { defense: 5 } },
  visualIcon: "icon-status-guarded",
  dispelRules: { dispellable: true, categories: ["boon"] },
};

describe("skills", () => {
  it("queries skills by class", () => {
    expect(getSkillsByClass([powerSlash, { ...powerSlash, id: "ember-bolt", classId: "mage" }], "swordsman"))
      .toEqual([powerSlash]);
  });

  it("allocates skill points into learned skill levels", () => {
    const state = createNewGameState();
    state.playerProfile.skillPoints = 1;

    expect(allocateSkillPoint(state, powerSlash)).toBe(true);
    expect(getLearnedSkillLevel(state, "power-slash")).toBe(2);
    expect(state.playerProfile.skillPoints).toBe(0);
  });

  it("assigns hotbar actions to slots 1 through 8", () => {
    const state = createNewGameState();

    expect(assignHotbarAction(state, 8, { type: "skill", id: "power-slash" })).toBe(true);
    expect(getHotbarAction(state, 8)).toEqual({ slot: 8, type: "skill", id: "power-slash" });
    expect(assignHotbarAction(state, 9, { type: "skill", id: "power-slash" })).toBe(false);
  });

  it("executes active target skills with SP, range, cooldown, damage, and effects", () => {
    const state = createNewGameState();
    let hp = 40;
    const effects: string[] = [];
    const firstResult = executeSkill(state, powerSlash, {
      kind: "enemy",
      id: "green-jelly",
      distance: 64,
      hp,
      applyDamage: (damage) => {
        hp -= damage;
      },
      applyStatusEffect: (effectId) => effects.push(effectId),
    }, 1000);

    expect(firstResult).toMatchObject({
      success: true,
      skillId: "power-slash",
      affectedTargetIds: ["green-jelly"],
    });
    expect(firstResult.damage).toBeGreaterThan(0);
    expect(hp).toBeLessThan(40);
    expect(effects).toEqual(["stagger"]);
    expect(state.character.stats.sp).toBe(22);
    expect(executeSkill(state, powerSlash, undefined, 1001).reason).toBe("cooldown");
  });

  it("fails target skills gracefully without target or range", () => {
    const state = createNewGameState();

    expect(executeSkill(state, powerSlash).reason).toBe("missing-target");
    expect(executeSkill(state, powerSlash, {
      kind: "enemy",
      id: "green-jelly",
      distance: 200,
      hp: 10,
      applyDamage: () => undefined,
    }).reason).toBe("out-of-range");
  });

  it("applies self-targeted status effects through definitions", () => {
    const state = createNewGameState();
    const guardStance: SkillDefinition = {
      ...powerSlash,
      id: "guard-stance",
      name: "Guard Stance",
      targetingMode: "self",
      target: "self",
      power: 0,
      damageMultiplier: 0,
      statusEffects: ["guarded"],
    };
    state.character.skills.learned.push({ id: "guard-stance", level: 1 });

    const result = executeSkill(state, guardStance, undefined, 1000, () => guarded);

    expect(result.success).toBe(true);
    expect(state.character.statusEffects).toMatchObject([
      { id: "guarded", sourceId: "guard-stance", expiresAt: 6000 },
    ]);
  });
});
