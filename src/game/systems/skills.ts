import { eventBus } from "./eventBus";
import { useConsumableItem } from "./consumables";
import { applyStatusEffect, emitStatusEffectsChanged } from "./statusEffects";
import type { SkillDefinition, ItemDefinition, StatusEffectDefinition } from "../types/dataDefinitions";
import type { BaseStatKey, GameState, HotbarSlotState, StatModifier } from "../types/gameState";

export const hotbarSlotCount = 8;

export type SkillExecutionTarget =
  | {
    kind: "enemy";
    id: string;
    distance: number;
    hp: number;
    applyDamage: (damage: number) => void;
    applyStatusEffect?: (effectId: string) => void;
  }
  | {
    kind: "ground";
    x: number;
    y: number;
    distance: number;
    enemies: Array<{ id: string; hp: number; applyDamage: (damage: number) => void; applyStatusEffect?: (effectId: string) => void }>;
  }
  | {
    kind: "self";
    applyStatusEffect?: (effectId: string) => void;
  };

export interface SkillExecutionResult {
  success: boolean;
  reason?: "locked" | "insufficient-sp" | "cooldown" | "missing-target" | "out-of-range" | "invalid-target";
  skillId: string;
  damage: number;
  affectedTargetIds: string[];
}

export function createInitialSkillState(skillIds: string[] = []) {
  return {
    learned: skillIds.map((id) => ({ id, level: 1 })),
    cooldowns: {},
    activeToggleIds: [],
  };
}

export function createInitialHotbar(skillIds: string[] = [], potionId = "minor-health-potion"): HotbarSlotState[] {
  const slots: HotbarSlotState[] = skillIds.slice(0, hotbarSlotCount).map((id, index) => ({
    slot: index + 1,
    type: "skill",
    id,
  }));

  if (slots.length < hotbarSlotCount) {
    slots.push({ slot: slots.length + 1, type: "item", id: potionId });
  }

  return slots;
}

export function getSkillsByClass(skills: SkillDefinition[], classId: string): SkillDefinition[] {
  return skills.filter((skill) => skill.classId === classId);
}

export function getLearnedSkillLevel(state: GameState, skillId: string): number {
  return state.character.skills.learned.find((entry) => entry.id === skillId)?.level ?? 0;
}

export function canLevelSkill(state: GameState, skill: SkillDefinition): boolean {
  const currentLevel = getLearnedSkillLevel(state, skill.id);

  return state.playerProfile.level >= skill.requiredLevel
    && state.playerProfile.skillPoints > 0
    && currentLevel < skill.maxSkillLevel
    && (skill.requiredSkillLevel === 0 || currentLevel >= skill.requiredSkillLevel || currentLevel === 0);
}

export function allocateSkillPoint(state: GameState, skill: SkillDefinition): boolean {
  if (!canLevelSkill(state, skill)) {
    return false;
  }

  const learnedSkill = state.character.skills.learned.find((entry) => entry.id === skill.id);

  if (learnedSkill) {
    learnedSkill.level += 1;
  } else {
    state.character.skills.learned.push({ id: skill.id, level: 1 });
    if (!state.character.skillIds.includes(skill.id)) {
      state.character.skillIds.push(skill.id);
    }
  }

  state.playerProfile.skillPoints -= 1;
  eventBus.emit("skillPointsChanged", {
    skillId: skill.id,
    skillLevel: getLearnedSkillLevel(state, skill.id),
    skillPoints: state.playerProfile.skillPoints,
  });

  return true;
}

export function assignHotbarAction(state: GameState, slot: number, action: Omit<HotbarSlotState, "slot">): boolean {
  if (!isValidHotbarSlot(slot)) {
    return false;
  }

  const next = { slot, ...action };
  state.character.hotbar = state.character.hotbar.filter((entry) => (
    entry.slot === slot
    || action.type !== "skill"
    || entry.type !== action.type
    || entry.id !== action.id
  ));
  const existingIndex = state.character.hotbar.findIndex((entry) => entry.slot === slot);

  if (existingIndex >= 0) {
    state.character.hotbar[existingIndex] = next;
  } else {
    state.character.hotbar.push(next);
  }

  sortHotbar(state.character.hotbar);
  eventBus.emit("hotbarChanged", { hotbar: state.character.hotbar });

  return true;
}

/** Remove a hotbar action while keeping all persistence/event behavior in the skill system. */
export function clearHotbarAction(state: GameState, slot: number): boolean {
  if (!isValidHotbarSlot(slot) || !state.character.hotbar.some((entry) => entry.slot === slot)) {
    return false;
  }

  state.character.hotbar = state.character.hotbar.filter((entry) => entry.slot !== slot);
  eventBus.emit("hotbarChanged", { hotbar: state.character.hotbar });
  return true;
}

/** Move an assigned action between slots, preserving the established assignment semantics. */
export function moveHotbarAction(state: GameState, fromSlot: number, toSlot: number): boolean {
  if (!isValidHotbarSlot(fromSlot) || !isValidHotbarSlot(toSlot) || fromSlot === toSlot) {
    return false;
  }

  const from = getHotbarAction(state, fromSlot);
  if (!from) {
    return false;
  }

  const to = getHotbarAction(state, toSlot);
  state.character.hotbar = state.character.hotbar.filter((entry) => entry.slot !== fromSlot && entry.slot !== toSlot);
  state.character.hotbar.push({ slot: toSlot, type: from.type, id: from.id });
  if (to) {
    state.character.hotbar.push({ slot: fromSlot, type: to.type, id: to.id });
  }
  sortHotbar(state.character.hotbar);
  eventBus.emit("hotbarChanged", { hotbar: state.character.hotbar });
  return true;
}

export function getHotbarAction(state: GameState, slot: number): HotbarSlotState | null {
  return state.character.hotbar.find((entry) => entry.slot === slot) ?? null;
}

export function useHotbarSlot(
  state: GameState,
  slot: number,
  getSkill: (id: string) => SkillDefinition,
  getItem: (id: string) => ItemDefinition,
  target?: SkillExecutionTarget,
  getStatusEffect?: (id: string) => StatusEffectDefinition,
): SkillExecutionResult | null {
  const action = getHotbarAction(state, slot);

  if (!action) {
    return null;
  }

  if (action.type === "item") {
    const item = getItem(action.id);
    const result = getStatusEffect
      ? useConsumableItem(state, item, getStatusEffect)
      : { success: false };

    eventBus.emit("hotbarUsed", { slot, type: action.type, id: action.id, success: result.success });
    return null;
  }

  const result = executeSkill(state, getSkill(action.id), target, Date.now(), getStatusEffect);
  eventBus.emit("hotbarUsed", { slot, type: action.type, id: action.id, success: result.success });

  return result;
}

export function executeSkill(
  state: GameState,
  skill: SkillDefinition,
  target?: SkillExecutionTarget,
  now = Date.now(),
  getStatusEffect?: (id: string) => StatusEffectDefinition,
): SkillExecutionResult {
  const learnedLevel = getLearnedSkillLevel(state, skill.id);
  const cooldownReadyAt = state.character.skills.cooldowns[skill.id] ?? 0;

  if (learnedLevel <= 0) {
    return failed(skill.id, "locked");
  }

  if (state.character.stats.sp < skill.spCost) {
    return failed(skill.id, "insufficient-sp");
  }

  if (cooldownReadyAt > now) {
    return failed(skill.id, "cooldown");
  }

  if (skill.type === "passive") {
    applyPassiveSkills(state, [skill]);
    return succeeded(skill.id, 0, []);
  }

  if (skill.type === "toggle") {
    toggleSkill(state, skill);
    spendSkillCost(state, skill, now);
    return succeeded(skill.id, 0, []);
  }

  if (skill.targetingMode === "self") {
    applySelfBuff(state, skill, now);
    applySelfStatusEffects(state, skill, target, now, getStatusEffect);
    spendSkillCost(state, skill, now);
    return succeeded(skill.id, 0, ["player"]);
  }

  if (!target) {
    return failed(skill.id, "missing-target");
  }

  if (skill.targetingMode === "enemy") {
    if (target.kind !== "enemy") {
      return failed(skill.id, "invalid-target");
    }

    if (target.distance > skill.range) {
      return failed(skill.id, "out-of-range");
    }

    const damage = calculateSkillDamage(state, skill, learnedLevel);
    target.applyDamage(damage);
    for (const effectId of skill.statusEffects) {
      target.applyStatusEffect?.(effectId);
    }
    spendSkillCost(state, skill, now);

    return succeeded(skill.id, damage, [target.id]);
  }

  if (target.kind !== "ground") {
    return failed(skill.id, "invalid-target");
  }

  if (target.distance > skill.range) {
    return failed(skill.id, "out-of-range");
  }

  const damage = calculateSkillDamage(state, skill, learnedLevel);
  const affected = target.enemies.filter((enemy) => enemy.hp > 0);
  affected.forEach((enemy) => {
    enemy.applyDamage(damage);
    for (const effectId of skill.statusEffects) {
      enemy.applyStatusEffect?.(effectId);
    }
  });
  spendSkillCost(state, skill, now);

  return succeeded(skill.id, damage, affected.map((enemy) => enemy.id));
}

function applySelfStatusEffects(
  state: GameState,
  skill: SkillDefinition,
  target: SkillExecutionTarget | undefined,
  now: number,
  getStatusEffect?: (id: string) => StatusEffectDefinition,
): void {
  for (const effectId of skill.statusEffects) {
    if (target?.kind === "self" && target.applyStatusEffect) {
      target.applyStatusEffect(effectId);
    } else if (getStatusEffect) {
      applyStatusEffect(state.character.statusEffects, getStatusEffect(effectId), skill.id, now);
      emitStatusEffectsChanged("player", state.character.id, state.character.statusEffects);
    }
  }
}

export function applyPassiveSkills(state: GameState, skills: SkillDefinition[]): void {
  const passiveModifiers = skills
    .filter((skill) => skill.type === "passive" && getLearnedSkillLevel(state, skill.id) > 0)
    .map((skill) => createSkillModifier(skill, "passive"));
  const nonPassiveBuffs = state.character.statBuffs.filter((modifier) => !modifier.id.startsWith("skill-passive-"));

  state.character.statBuffs = [...nonPassiveBuffs, ...passiveModifiers];
}

export function expireSkillBuffs(state: GameState, now = Date.now()): void {
  state.character.statBuffs = state.character.statBuffs.filter((modifier) => !modifier.expiresAt || modifier.expiresAt > now);
}

function applySelfBuff(state: GameState, skill: SkillDefinition, now: number): void {
  const buff = skill.buff;

  if (!buff) {
    return;
  }

  state.character.statBuffs = state.character.statBuffs.filter((modifier) => modifier.sourceSkillId !== skill.id);
  state.character.statBuffs.push({
    ...createSkillModifier(skill, "buff"),
    expiresAt: now + buff.duration,
  });
}

function toggleSkill(state: GameState, skill: SkillDefinition): void {
  if (state.character.skills.activeToggleIds.includes(skill.id)) {
    state.character.skills.activeToggleIds = state.character.skills.activeToggleIds.filter((id) => id !== skill.id);
    state.character.statBuffs = state.character.statBuffs.filter((modifier) => modifier.sourceSkillId !== skill.id);
    return;
  }

  state.character.skills.activeToggleIds.push(skill.id);
  state.character.statBuffs.push(createSkillModifier(skill, "toggle"));
}

function createSkillModifier(skill: SkillDefinition, kind: "passive" | "buff" | "toggle"): StatModifier {
  const source = kind === "buff" ? skill.buff : skill.passiveModifiers;

  return {
    id: `skill-${kind}-${skill.id}`,
    sourceSkillId: skill.id,
    baseStats: cleanBaseStats(source?.baseStats),
    derivedStats: source?.derivedStats,
  };
}

function cleanBaseStats(source?: Record<string, number>): Partial<Record<BaseStatKey, number>> {
  const stats: Partial<Record<BaseStatKey, number>> = {};
  const allowedStats: BaseStatKey[] = ["str", "agi", "vit", "int", "dex", "luk"];

  for (const key of allowedStats) {
    const value = source?.[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      stats[key] = value;
    }
  }

  return stats;
}

function spendSkillCost(state: GameState, skill: SkillDefinition, now: number): void {
  state.character.stats.sp = Math.max(0, state.character.stats.sp - skill.spCost);
  state.character.skills.cooldowns[skill.id] = now + skill.cooldown;
  eventBus.emit("playerSpChanged", {
    sp: state.character.stats.sp,
    maxSp: state.character.stats.maxSp,
  });
  eventBus.emit("skillUsed", { skillId: skill.id, actorId: state.character.id });
}

function calculateSkillDamage(state: GameState, skill: SkillDefinition, learnedLevel: number): number {
  const scalingValue = skill.scalingStat === "none"
    ? 0
    : state.character.baseStats[skill.scalingStat] + state.character.allocatedStats[skill.scalingStat];
  const levelBonus = Math.max(0, learnedLevel - 1) * 4;

  return Math.max(1, Math.round((skill.power + scalingValue + levelBonus) * skill.damageMultiplier));
}

function failed(skillId: string, reason: NonNullable<SkillExecutionResult["reason"]>): SkillExecutionResult {
  return { success: false, reason, skillId, damage: 0, affectedTargetIds: [] };
}

function succeeded(skillId: string, damage: number, affectedTargetIds: string[]): SkillExecutionResult {
  return { success: true, skillId, damage, affectedTargetIds };
}

function isValidHotbarSlot(slot: number): boolean {
  return Number.isInteger(slot) && slot >= 1 && slot <= hotbarSlotCount;
}

function sortHotbar(hotbar: HotbarSlotState[]): void {
  hotbar.sort((left, right) => left.slot - right.slot);
}
