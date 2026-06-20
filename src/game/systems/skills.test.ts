import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createNewGameState } from "../data/gameState";
import { calculateDerivedStats } from "./stats";
import type { ClassDefinition, ItemDefinition, SkillDefinition, StatusEffectDefinition } from "../types/dataDefinitions";
import {
  allocateSkillPoint,
  applyPassiveSkills,
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

  it("defines every Swordsman base skill in JSON with usable active and passive roles", () => {
    const swordsmanSkills = getSwordsmanSkills();

    expect(swordsmanSkills.map((skill) => skill.id)).toEqual([
      "power-slash",
      "guard-stance",
      "iron-body",
      "sweeping-cut",
      "battle-cry",
      "endure-pain",
      "weapon-training",
      "counter-blow",
    ]);
    expect(swordsmanSkills.every((skill) => skill.classId === "swordsman")).toBe(true);
    expect(swordsmanSkills.filter((skill) => skill.type === "passive").map((skill) => skill.id)).toEqual([
      "iron-body",
      "endure-pain",
      "weapon-training",
    ]);
    expect(swordsmanSkills.filter((skill) => skill.type !== "passive").map((skill) => skill.id)).toEqual([
      "power-slash",
      "guard-stance",
      "sweeping-cut",
      "battle-cry",
      "counter-blow",
    ]);
  });

  it("executes Swordsman active skills, toggles, and self buffs from JSON", () => {
    const skills = getSwordsmanSkillMap();
    const state = createNewGameState();
    state.playerProfile.level = 10;
    state.character.stats.sp = 50;
    state.character.skills.learned.push(
      { id: "guard-stance", level: 1 },
      { id: "sweeping-cut", level: 1 },
      { id: "battle-cry", level: 1 },
      { id: "counter-blow", level: 1 },
    );
    let hp = 100;
    const effects: string[] = [];
    const target = {
      kind: "enemy" as const,
      id: "green-jelly",
      distance: 48,
      hp,
      applyDamage: (damage: number) => {
        hp -= damage;
      },
      applyStatusEffect: (effectId: string) => effects.push(effectId),
    };

    expect(executeSkill(state, skills["power-slash"], target, 1000).success).toBe(true);
    expect(executeSkill(state, skills["sweeping-cut"], target, 3000).success).toBe(true);
    expect(executeSkill(state, skills["counter-blow"], target, 6000).success).toBe(true);
    expect(hp).toBeLessThan(100);
    expect(effects).toEqual(["armor-break", "stun", "bleed", "stun"]);

    expect(executeSkill(state, skills["guard-stance"], undefined, 9000).success).toBe(true);
    expect(state.character.skills.activeToggleIds).toContain("guard-stance");
    expect(state.character.statBuffs.find((buff) => buff.sourceSkillId === "guard-stance")).toMatchObject({
      derivedStats: { defense: 6, magicDefense: 3, moveSpeed: -18 },
    });

    expect(executeSkill(state, skills["battle-cry"], undefined, 11000, () => blessed).success).toBe(true);
    expect(state.character.statBuffs.find((buff) => buff.sourceSkillId === "battle-cry")).toMatchObject({
      derivedStats: { physicalAttack: 5, hit: 8 },
    });
    expect(state.character.statusEffects).toMatchObject([{ id: "blessed", sourceId: "battle-cry" }]);
  });

  it("applies Swordsman passive stats and active damage scaling from the correct stats", () => {
    const skills = getSwordsmanSkillMap();
    const state = createNewGameState();
    state.playerProfile.level = 10;
    state.character.skills.learned.push(
      { id: "iron-body", level: 1 },
      { id: "endure-pain", level: 1 },
      { id: "weapon-training", level: 1 },
    );
    const before = calculateDerivedStats(state, swordsmanClass, getItem);

    applyPassiveSkills(state, Object.values(skills));
    const after = calculateDerivedStats(state, swordsmanClass, getItem);

    expect(after.maxHp).toBeGreaterThan(before.maxHp);
    expect(after.defense).toBeGreaterThan(before.defense);
    expect(after.physicalAttack).toBeGreaterThan(before.physicalAttack);
    expect(after.hit).toBeGreaterThan(before.hit);

    const strState = createNewGameState();
    const dexState = createNewGameState();
    const neutralCounterState = createNewGameState();
    strState.character.allocatedStats.str = 5;
    dexState.character.allocatedStats.dex = 5;
    dexState.character.skills.learned.push({ id: "counter-blow", level: 1 });
    neutralCounterState.character.skills.learned.push({ id: "counter-blow", level: 1 });

    expect(executeSkill(strState, skills["power-slash"], damageProbe(), 1000).damage)
      .toBeGreaterThan(executeSkill(createNewGameState(), skills["power-slash"], damageProbe(), 1000).damage);
    expect(executeSkill(dexState, skills["counter-blow"], damageProbe(), 1000).damage)
      .toBeGreaterThan(executeSkill(neutralCounterState, skills["counter-blow"], damageProbe(), 1000).damage);
  });
});

function getSwordsmanSkills(): SkillDefinition[] {
  const skills = JSON.parse(readFileSync(new URL("../../../public/assets/data/skills.json", import.meta.url), "utf8")) as SkillDefinition[];

  return skills.filter((skill) => skill.classId === "swordsman");
}

function getSwordsmanSkillMap(): Record<string, SkillDefinition> {
  return Object.fromEntries(getSwordsmanSkills().map((skill) => [skill.id, skill]));
}

function damageProbe() {
  return {
    kind: "enemy" as const,
    id: "green-jelly",
    distance: 48,
    hp: 100,
    applyDamage: () => undefined,
  };
}

const blessed: StatusEffectDefinition = {
  id: "blessed",
  name: "Blessed",
  description: "Core attributes are improved.",
  type: "buff",
  duration: 8000,
  tickInterval: 1000,
  stackBehavior: "refresh",
  maxStacks: 1,
  statModifiers: { baseStats: { vit: 2, int: 2, luk: 2 } },
  visualIcon: "icon-status-blessed",
  dispelRules: { dispellable: true, categories: ["boon"] },
};

const swordsmanClass: ClassDefinition = {
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
  allowedWeaponTypes: ["sword"],
  startingSkillIds: ["power-slash"],
  startingItemIds: ["training-sword"],
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
