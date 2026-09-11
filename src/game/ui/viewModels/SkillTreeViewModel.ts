import type { DataRegistry } from "../../data/dataRegistry";
import { getUnlockedSkillTreeIds } from "../../systems/advancedClasses";
import { canLevelSkill, getLearnedSkillLevel } from "../../systems/skills";
import { baseStatLabels } from "../../systems/stats";
import type { BaseStatKey, GameState } from "../../types/gameState";
import type { SkillDefinition } from "../../types/dataDefinitions";

export interface SkillRowViewModel {
  skill: SkillDefinition;
  level: number;
  unlocked: boolean;
  effectText: string;
  requirementText: string;
  prerequisiteText: string;
  canAllocate: boolean;
}

/** Read-only skill-tree projection. All unlock and effect values come from domain data/systems. */
export class SkillTreeViewModel {
  readonly treeIds: readonly string[];
  readonly classLabel: string;
  readonly skillPoints: number;
  readonly skills: readonly SkillRowViewModel[];
  readonly selected: SkillRowViewModel | null;
  readonly selectedIndex: number;

  constructor(state: GameState, data: DataRegistry, selectedIndex = 0) {
    this.treeIds = getUnlockedSkillTreeIds(state);
    this.classLabel = [data.getClass(state.character.archetype).name, state.character.advancedClass?.name ?? ""].filter(Boolean).join(" / ");
    this.skillPoints = state.playerProfile.skillPoints;
    const skills = this.treeIds.flatMap((id) => data.getSkillsByClass(id));
    this.skills = skills.map((skill) => {
      const level = getLearnedSkillLevel(state, skill.id);
      const unlocked = state.playerProfile.level >= skill.requiredLevel && level >= skill.requiredSkillLevel;
      return {
        skill,
        level,
        unlocked,
        effectText: getSkillEffectText(skill),
        requirementText: `${unlocked ? "Unlocked" : "Locked"}: Lv ${skill.requiredLevel}${skill.requiredSkillLevel > 0 ? `, Skill Lv ${skill.requiredSkillLevel}` : ""}`,
        prerequisiteText: skill.requiredSkillLevel > 0 ? `Requires this skill Lv ${skill.requiredSkillLevel}` : "No prerequisite",
        canAllocate: canLevelSkill(state, skill),
      };
    });
    this.selectedIndex = clampIndex(selectedIndex, this.skills.length);
    this.selected = this.skills[this.selectedIndex] ?? null;
  }
}

export function getSkillEffectText(skill: SkillDefinition): string {
  const effects: string[] = [];
  if (skill.damageMultiplier > 0) effects.push(`Damage ${skill.damageMultiplier}x ${skill.scalingStat === "none" ? "flat" : baseStatLabels[skill.scalingStat]}`);
  effects.push(...getModifierText("Passive", skill.passiveModifiers));
  if (skill.buff) {
    effects.push(`Buff ${skill.buff.duration}ms`);
    effects.push(...getModifierText("Buff", skill.buff));
  }
  if (skill.statusEffects.length > 0) effects.push(`Status ${skill.statusEffects.join(", ")}`);
  if (skill.area > 0) effects.push(`Area ${skill.area}`);
  return effects.length > 0 ? effects.join("; ") : "Utility effect";
}

function getModifierText(label: string, modifier?: SkillDefinition["passiveModifiers"] | NonNullable<SkillDefinition["buff"]>): string[] {
  const effects: string[] = [];
  for (const [stat, value] of Object.entries(modifier?.baseStats ?? {})) {
    if (typeof value === "number") effects.push(`${label} ${baseStatLabels[stat as BaseStatKey] ?? stat} ${value > 0 ? "+" : ""}${value}`);
  }
  for (const [stat, value] of Object.entries(modifier?.derivedStats ?? {})) {
    if (typeof value === "number") effects.push(`${label} ${stat} ${value > 0 ? "+" : ""}${value}`);
  }
  return effects;
}

function clampIndex(index: number, length: number): number {
  return length === 0 ? 0 : Math.max(0, Math.min(index, length - 1));
}
