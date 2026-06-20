import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createCharacterGameState, createNewGameState } from "../data/gameState";
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
    expect(getSkillsByClass([powerSlash, { ...powerSlash, id: "fire-bolt", classId: "mage" }], "swordsman"))
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

  it("defines every Mage base skill in JSON with elemental, defensive, AoE, and passive roles", () => {
    const mageSkills = getMageSkills();

    expect(mageSkills.map((skill) => skill.id)).toEqual([
      "fire-bolt",
      "frost-bolt",
      "lightning-spark",
      "mana-recovery",
      "arcane-shield",
      "flame-wall",
      "frost-ring",
      "spell-focus",
    ]);
    expect(mageSkills.every((skill) => skill.classId === "mage")).toBe(true);
    expect(mageSkills.filter((skill) => skill.type === "passive").map((skill) => skill.id)).toEqual([
      "mana-recovery",
      "spell-focus",
    ]);
    expect(mageSkills.filter((skill) => skill.targetingMode === "ground").map((skill) => skill.id)).toEqual([
      "flame-wall",
      "frost-ring",
    ]);
    expect(new Set(mageSkills.map((skill) => skill.element))).toEqual(new Set(["fire", "ice", "lightning", "neutral", "arcane"]));
    expect(mageClass.startingSkillIds).toEqual(["fire-bolt"]);
  });

  it("executes Mage ranged magic, shield, and AoE control skills from JSON with meaningful SP costs", () => {
    const skills = getMageSkillMap();
    const state = createCharacterGameState("Mira", mageClass);
    state.playerProfile.level = 10;
    state.character.stats.sp = 50;
    state.character.skills.learned.push(
      { id: "frost-bolt", level: 1 },
      { id: "lightning-spark", level: 1 },
      { id: "arcane-shield", level: 1 },
      { id: "flame-wall", level: 1 },
      { id: "frost-ring", level: 1 },
    );
    let enemyHp = 100;
    const singleTargetEffects: string[] = [];

    expect(executeSkill(state, skills["fire-bolt"], {
      kind: "enemy",
      id: "green-jelly",
      distance: 160,
      hp: enemyHp,
      applyDamage: (damage) => {
        enemyHp -= damage;
      },
      applyStatusEffect: (effectId) => singleTargetEffects.push(effectId),
    }, 1000).success).toBe(true);
    expect(executeSkill(state, skills["frost-bolt"], damageProbe(["slow"]), 3000).success).toBe(true);
    expect(executeSkill(state, skills["lightning-spark"], damageProbe(["marked"]), 5000).success).toBe(true);
    expect(enemyHp).toBeLessThan(100);
    expect(singleTargetEffects).toEqual(["burn"]);

    expect(executeSkill(state, skills["arcane-shield"], undefined, 7000, () => shielded).success).toBe(true);
    expect(state.character.statBuffs.find((buff) => buff.sourceSkillId === "arcane-shield")).toMatchObject({
      derivedStats: { defense: 4, magicDefense: 8 },
    });
    expect(state.character.statusEffects).toMatchObject([{ id: "shielded", sourceId: "arcane-shield" }]);

    const flameEffects: Record<string, string[]> = { slime: [], wisp: [] };
    const flameResult = executeSkill(state, skills["flame-wall"], {
      kind: "ground",
      x: 100,
      y: 100,
      distance: 80,
      enemies: [
        {
          id: "slime",
          hp: 30,
          applyDamage: () => undefined,
          applyStatusEffect: (effectId) => flameEffects.slime.push(effectId),
        },
        {
          id: "wisp",
          hp: 24,
          applyDamage: () => undefined,
          applyStatusEffect: (effectId) => flameEffects.wisp.push(effectId),
        },
      ],
    }, 9000);
    const frostEffects: Record<string, string[]> = { slime: [], wisp: [] };
    const frostResult = executeSkill(state, skills["frost-ring"], {
      kind: "ground",
      x: 100,
      y: 100,
      distance: 80,
      enemies: [
        {
          id: "slime",
          hp: 30,
          applyDamage: () => undefined,
          applyStatusEffect: (effectId) => frostEffects.slime.push(effectId),
        },
        {
          id: "wisp",
          hp: 24,
          applyDamage: () => undefined,
          applyStatusEffect: (effectId) => frostEffects.wisp.push(effectId),
        },
      ],
    }, 10000);

    expect(flameResult).toMatchObject({
      success: true,
      affectedTargetIds: ["slime", "wisp"],
    });
    expect(frostResult).toMatchObject({
      success: true,
      affectedTargetIds: ["slime", "wisp"],
    });
    expect(flameEffects).toEqual({ slime: ["burn"], wisp: ["burn"] });
    expect(frostEffects).toEqual({ slime: ["freeze"], wisp: ["freeze"] });
    expect(state.character.stats.sp).toBe(16);
  });

  it("applies Mage passive stats and INT scaling for spell damage", () => {
    const skills = getMageSkillMap();
    const state = createCharacterGameState("Mira", mageClass);
    state.character.skills.learned.push(
      { id: "mana-recovery", level: 1 },
      { id: "spell-focus", level: 1 },
    );
    const before = calculateDerivedStats(state, mageClass, getItem);

    applyPassiveSkills(state, Object.values(skills));
    const after = calculateDerivedStats(state, mageClass, getItem);

    expect(after.maxSp).toBeGreaterThan(before.maxSp);
    expect(after.castSpeed).toBeGreaterThan(before.castSpeed);
    expect(after.magicAttack).toBeGreaterThan(before.magicAttack);
    expect(after.hit).toBeGreaterThan(before.hit);

    const intState = createCharacterGameState("Mira", mageClass);
    const neutralState = createCharacterGameState("Mira", mageClass);
    intState.character.allocatedStats.int = 5;

    expect(executeSkill(intState, skills["fire-bolt"], damageProbe(), 1000).damage)
      .toBeGreaterThan(executeSkill(neutralState, skills["fire-bolt"], damageProbe(), 1000).damage);
  });

  it("defines every Archer base skill in JSON with ranged, AoE, mobility, and passive roles", () => {
    const archerSkills = getArcherSkills();

    expect(archerSkills.map((skill) => skill.id)).toEqual([
      "double-shot",
      "arrow-rain",
      "hawk-eye",
      "quick-step",
      "elemental-arrows",
      "pinning-shot",
      "focus",
      "bow-training",
    ]);
    expect(archerSkills.every((skill) => skill.classId === "archer")).toBe(true);
    expect(archerSkills.filter((skill) => skill.type === "passive").map((skill) => skill.id)).toEqual([
      "hawk-eye",
      "bow-training",
    ]);
    expect(archerSkills.filter((skill) => skill.targetingMode === "ground").map((skill) => skill.id)).toEqual([
      "arrow-rain",
    ]);
    expect(archerSkills.filter((skill) => skill.targetingMode === "enemy").every((skill) => skill.range >= 172)).toBe(true);
    expect(archerSkills.every((skill) => skill.scalingStat === "dex")).toBe(true);
    expect(archerClass.startingSkillIds).toEqual(["pinning-shot"]);
  });

  it("executes Archer ranged single-target, AoE, movement, and stance skills from JSON", () => {
    const skills = getArcherSkillMap();
    const state = createCharacterGameState("Robin", archerClass);
    state.playerProfile.level = 10;
    state.character.stats.sp = 50;
    state.character.skills.learned.push(
      { id: "double-shot", level: 1 },
      { id: "arrow-rain", level: 1 },
      { id: "quick-step", level: 1 },
      { id: "elemental-arrows", level: 1 },
      { id: "focus", level: 1 },
    );
    let enemyHp = 100;
    const singleTargetEffects: string[] = [];

    expect(executeSkill(state, skills["pinning-shot"], {
      kind: "enemy",
      id: "green-jelly",
      distance: 160,
      hp: enemyHp,
      applyDamage: (damage) => {
        enemyHp -= damage;
      },
      applyStatusEffect: (effectId) => singleTargetEffects.push(effectId),
    }, 1000).success).toBe(true);
    expect(executeSkill(state, skills["double-shot"], rangedDamageProbe(), 3000).success).toBe(true);
    expect(enemyHp).toBeLessThan(100);
    expect(singleTargetEffects).toEqual(["slow"]);

    const rainEffects: Record<string, string[]> = { slime: [], wisp: [] };
    const rainResult = executeSkill(state, skills["arrow-rain"], {
      kind: "ground",
      x: 100,
      y: 100,
      distance: 140,
      enemies: [
        {
          id: "slime",
          hp: 30,
          applyDamage: () => undefined,
          applyStatusEffect: (effectId) => rainEffects.slime.push(effectId),
        },
        {
          id: "wisp",
          hp: 24,
          applyDamage: () => undefined,
          applyStatusEffect: (effectId) => rainEffects.wisp.push(effectId),
        },
      ],
    }, 5000);

    expect(rainResult).toMatchObject({
      success: true,
      affectedTargetIds: ["slime", "wisp"],
    });
    expect(rainEffects).toEqual({ slime: ["bleed"], wisp: ["bleed"] });

    expect(executeSkill(state, skills["quick-step"], undefined, 11000).success).toBe(true);
    expect(state.character.statBuffs.find((buff) => buff.sourceSkillId === "quick-step")).toMatchObject({
      derivedStats: { moveSpeed: 18, dodge: 10 },
    });

    expect(executeSkill(state, skills["focus"], undefined, 13000).success).toBe(true);
    expect(state.character.statBuffs.find((buff) => buff.sourceSkillId === "focus")).toMatchObject({
      derivedStats: { rangedAttack: 6, hit: 6 },
    });

    expect(executeSkill(state, skills["elemental-arrows"], undefined, 15000).success).toBe(true);
    expect(state.character.skills.activeToggleIds).toContain("elemental-arrows");
    expect(state.character.statBuffs.find((buff) => buff.sourceSkillId === "elemental-arrows")).toMatchObject({
      derivedStats: { rangedAttack: 4, magicAttack: 2 },
    });
  });

  it("applies Archer passive stats and DEX scaling for bow skills", () => {
    const skills = getArcherSkillMap();
    const state = createCharacterGameState("Robin", archerClass);
    state.character.skills.learned.push(
      { id: "hawk-eye", level: 1 },
      { id: "bow-training", level: 1 },
    );
    const before = calculateDerivedStats(state, archerClass, getItem);

    applyPassiveSkills(state, Object.values(skills));
    const after = calculateDerivedStats(state, archerClass, getItem);

    expect(after.rangedAttack).toBeGreaterThan(before.rangedAttack);
    expect(after.hit).toBeGreaterThan(before.hit);
    expect(after.crit).toBeGreaterThan(before.crit);
    expect(after.attackSpeed).toBeGreaterThan(before.attackSpeed);

    const dexState = createCharacterGameState("Robin", archerClass);
    const neutralState = createCharacterGameState("Robin", archerClass);
    dexState.character.allocatedStats.dex = 5;
    dexState.character.skills.learned.push({ id: "double-shot", level: 1 }, { id: "arrow-rain", level: 1 });
    neutralState.character.skills.learned.push({ id: "double-shot", level: 1 }, { id: "arrow-rain", level: 1 });

    expect(executeSkill(dexState, skills["double-shot"], rangedDamageProbe(), 1000).damage)
      .toBeGreaterThan(executeSkill(neutralState, skills["double-shot"], rangedDamageProbe(), 1000).damage);
    expect(executeSkill(dexState, skills["arrow-rain"], rainDamageProbe(), 3000).damage)
      .toBeGreaterThan(executeSkill(neutralState, skills["arrow-rain"], rainDamageProbe(), 3000).damage);
  });
});

function getSwordsmanSkills(): SkillDefinition[] {
  const skills = JSON.parse(readFileSync(new URL("../../../public/assets/data/skills.json", import.meta.url), "utf8")) as SkillDefinition[];

  return skills.filter((skill) => skill.classId === "swordsman");
}

function getSwordsmanSkillMap(): Record<string, SkillDefinition> {
  return Object.fromEntries(getSwordsmanSkills().map((skill) => [skill.id, skill]));
}

function getMageSkills(): SkillDefinition[] {
  const skills = JSON.parse(readFileSync(new URL("../../../public/assets/data/skills.json", import.meta.url), "utf8")) as SkillDefinition[];

  return skills.filter((skill) => skill.classId === "mage");
}

function getMageSkillMap(): Record<string, SkillDefinition> {
  return Object.fromEntries(getMageSkills().map((skill) => [skill.id, skill]));
}

function getArcherSkills(): SkillDefinition[] {
  const skills = JSON.parse(readFileSync(new URL("../../../public/assets/data/skills.json", import.meta.url), "utf8")) as SkillDefinition[];

  return skills.filter((skill) => skill.classId === "archer");
}

function getArcherSkillMap(): Record<string, SkillDefinition> {
  return Object.fromEntries(getArcherSkills().map((skill) => [skill.id, skill]));
}

function damageProbe(effects?: string[]) {
  return {
    kind: "enemy" as const,
    id: "green-jelly",
    distance: 48,
    hp: 100,
    applyDamage: () => undefined,
    applyStatusEffect: (effectId: string) => effects?.push(effectId),
  };
}

function rangedDamageProbe(effects?: string[]) {
  return {
    ...damageProbe(effects),
    distance: 160,
  };
}

function rainDamageProbe() {
  return {
    kind: "ground" as const,
    x: 100,
    y: 100,
    distance: 140,
    enemies: [
      {
        id: "slime",
        hp: 30,
        applyDamage: () => undefined,
      },
    ],
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

const mageClass: ClassDefinition = {
  id: "mage",
  name: "Mage",
  description: "",
  roleSummary: "",
  recommendedStats: [],
  difficultyRating: "Hard",
  baseStats: {
    hp: 22,
    sp: 18,
    attack: 8,
    defense: 2,
  },
  growthRates: {
    hp: 3,
    sp: 5,
    attack: 4,
    defense: 1,
  },
  startingWeaponId: "apprentice-staff",
  allowedWeaponTypes: ["staff"],
  startingSkillIds: ["fire-bolt"],
  startingItemIds: ["apprentice-staff"],
  advancedClassOptions: [],
};

const archerClass: ClassDefinition = {
  id: "archer",
  name: "Archer",
  description: "",
  roleSummary: "",
  recommendedStats: [],
  difficultyRating: "Normal",
  baseStats: {
    hp: 26,
    sp: 12,
    attack: 7,
    defense: 3,
  },
  growthRates: {
    hp: 4,
    sp: 3,
    attack: 4,
    defense: 2,
  },
  startingWeaponId: "shortbow",
  allowedWeaponTypes: ["bow"],
  startingSkillIds: ["pinning-shot"],
  startingItemIds: ["shortbow"],
  advancedClassOptions: [],
};

const shielded: StatusEffectDefinition = {
  id: "shielded",
  name: "Shielded",
  description: "Defense and magic defense are increased.",
  type: "buff",
  duration: 6000,
  tickInterval: 1000,
  stackBehavior: "refresh",
  maxStacks: 1,
  statModifiers: { derivedStats: { defense: 5, magicDefense: 5 } },
  visualIcon: "icon-status-shielded",
  dispelRules: { dispellable: true, categories: ["boon"] },
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
