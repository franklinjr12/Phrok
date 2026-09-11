import type { SkillDefinition } from "../../../types/dataDefinitions";
import type { BaseStatKey } from "../../../types/gameState";
import { getUnlockedSkillTreeIds } from "../../../systems/advancedClasses";
import { allocateSkillPoint, assignHotbarAction, getLearnedSkillLevel, hotbarSlotCount } from "../../../systems/skills";
import { baseStatLabels } from "../../../systems/stats";
import { addPanelButton, addPanelRectangle, addPanelText, wrapText } from "../panelPrimitives";
import { panelFill, panelStroke } from "../../uiTheme";
import type { PanelContext, UIPanel } from "../panelTypes";

export class SkillsPanel implements UIPanel {
  readonly id = "skills" as const;
  private selectedIndex = 0;
  constructor(private readonly context: PanelContext) {}

  render(): void {
    const { state, data } = this.context; const skills = this.getVisibleSkills(); const selected = skills[this.clampIndex(skills.length)] ?? null; const treeIds = getUnlockedSkillTreeIds(state);
    const classLabel = [data.getClass(state.character.archetype).name, state.character.advancedClass?.name ?? ""].filter(Boolean).join(" / ");
    addPanelRectangle(this.context, 70, 60, 660, 470, panelFill, 0.95).setOrigin(0).setStrokeStyle(2, panelStroke, 0.92);
    addPanelText(this.context, 96, 84, "Skills", 24, "#f8fafc"); addPanelText(this.context, 96, 120, `Class ${classLabel}   Skill Points ${state.playerProfile.skillPoints}`, 15, "#fde68a");
    this.context.debug.set("skillPanel", "visible"); this.context.debug.set("skillGroups", treeIds.join("|")); this.context.debug.set("skillPanelPoints", state.playerProfile.skillPoints);
    skills.forEach((skill, index) => { const y = 150 + index * 34; const level = getLearnedSkillLevel(state, skill.id); const locked = !this.isUnlocked(skill); const row = addPanelRectangle(this.context, 96, y, 330, 28, index === this.selectedIndex ? 0x293548 : 0x18222c, 0.94).setOrigin(0).setStrokeStyle(1, index === this.selectedIndex ? 0xfacc15 : 0x334155, 0.9).setInteractive({ useHandCursor: true }); row.on("pointerdown", () => { this.selectedIndex = index; this.context.rerender(); }); row.on("pointerover", () => this.context.showTooltip([skill.name, `${skill.type} ${skill.targetingMode}`, this.getEffectText(skill)], 438, y - 8)); row.on("pointerout", () => this.context.clearTooltip()); addPanelText(this.context, 110, y + 5, `${skill.name} ${level}/${skill.maxSkillLevel}`, 13, locked ? "#94a3b8" : "#f8fafc"); addPanelText(this.context, 292, y + 5, skill.type, 12, "#cbd5e1"); addPanelText(this.context, 352, y + 5, locked ? `Req Lv ${skill.requiredLevel}` : "Unlocked", 11, locked ? "#fca5a5" : "#bbf7d0"); });
    if (selected) { const level = getLearnedSkillLevel(state, selected.id); const effectText = this.getEffectText(selected); addPanelRectangle(this.context, 456, 158, 230, 240, 0x17212b, 0.95).setOrigin(0).setStrokeStyle(1, 0x475569, 0.86); addPanelText(this.context, 476, 178, selected.name, 17, "#f8fafc"); addPanelText(this.context, 476, 208, `Level ${level}/${selected.maxSkillLevel}   ${selected.targetingMode}`, 13, "#cbd5e1"); addPanelText(this.context, 476, 236, wrapText(selected.description, 24), 13, "#cbd5e1"); addPanelText(this.context, 476, 296, wrapText(effectText, 27), 12, "#fde68a"); addPanelText(this.context, 476, 348, `SP ${selected.spCost}  CD ${selected.cooldown}ms`, 13, "#93c5fd"); addPanelText(this.context, 476, 374, this.getRequirement(selected), 12, this.isUnlocked(selected) ? "#bbf7d0" : "#fca5a5"); this.context.debug.set("selectedSkill", selected.id); this.context.debug.set("selectedSkillLevel", level); this.context.debug.set("selectedSkillLocked", !this.isUnlocked(selected)); this.context.debug.set("selectedSkillTooltip", `${selected.type}|${selected.targetingMode}|${effectText}|${this.getRequirement(selected)}`); } else { this.context.debug.set("selectedSkill", ""); this.context.debug.set("selectedSkillLevel", ""); this.context.debug.set("selectedSkillLocked", ""); this.context.debug.set("selectedSkillTooltip", ""); }
    addPanelButton(this.context, 456, 420, 86, 34, "Level", () => this.levelSelected()); addPanelButton(this.context, 552, 420, 86, 34, "Slot 1", () => this.assignSkill(1)); addPanelButton(this.context, 648, 420, 66, 34, "Potion", () => this.assignPotion(2)); addPanelButton(this.context, 628, 476, 86, 28, "Close", () => this.context.closePanel()); this.context.debug.set("skillPanelButtons", "Level|Slot 1|Potion|Close"); this.context.syncSkill();
  }

  destroy(): void {}

  handleKey(event: KeyboardEvent): boolean {
    const slot = Number(event.key);
    if (!Number.isInteger(slot) || slot < 1 || slot > hotbarSlotCount) return false;
    event.preventDefault();
    this.assignSelectedSkill(slot);
    return true;
  }

  private getVisibleSkills(): SkillDefinition[] { return getUnlockedSkillTreeIds(this.context.state).flatMap((id) => this.context.data.getSkillsByClass(id)); }
  private clampIndex(length: number): number { if (length === 0) { this.selectedIndex = 0; return 0; } this.selectedIndex = Math.max(0, Math.min(this.selectedIndex, length - 1)); return this.selectedIndex; }
  private isUnlocked(skill: SkillDefinition): boolean { const { state } = this.context; return state.playerProfile.level >= skill.requiredLevel && getLearnedSkillLevel(state, skill.id) >= skill.requiredSkillLevel; }
  private getRequirement(skill: SkillDefinition): string { return `${this.isUnlocked(skill) ? "Unlocked" : "Locked"}: Lv ${skill.requiredLevel}${skill.requiredSkillLevel > 0 ? `, Skill Lv ${skill.requiredSkillLevel}` : ""}`; }
  private getEffectText(skill: SkillDefinition): string { const effects: string[] = []; if (skill.damageMultiplier > 0) effects.push(`Damage ${skill.damageMultiplier}x ${skill.scalingStat === "none" ? "flat" : baseStatLabels[skill.scalingStat]}`); effects.push(...this.getModifierText("Passive", skill.passiveModifiers)); if (skill.buff) { effects.push(`Buff ${skill.buff.duration}ms`); effects.push(...this.getModifierText("Buff", skill.buff)); } if (skill.statusEffects.length > 0) effects.push(`Status ${skill.statusEffects.join(", ")}`); if (skill.area > 0) effects.push(`Area ${skill.area}`); return effects.length > 0 ? effects.join("; ") : "Utility effect"; }
  private getModifierText(label: string, modifier?: SkillDefinition["passiveModifiers"] | NonNullable<SkillDefinition["buff"]>): string[] { const effects: string[] = []; for (const [stat, value] of Object.entries(modifier?.baseStats ?? {})) if (typeof value === "number") effects.push(`${label} ${baseStatLabels[stat as BaseStatKey] ?? stat} ${value > 0 ? "+" : ""}${value}`); for (const [stat, value] of Object.entries(modifier?.derivedStats ?? {})) if (typeof value === "number") effects.push(`${label} ${stat} ${value > 0 ? "+" : ""}${value}`); return effects; }
  private levelSelected(): void { const { state } = this.context; const skill = this.getVisibleSkills()[this.clampIndex(this.getVisibleSkills().length)]; const allocated = skill ? allocateSkillPoint(state, skill) : false; this.context.debug.set("lastSkillAllocation", allocated && skill ? `${skill.id}:${getLearnedSkillLevel(state, skill.id)}` : "failed"); this.context.syncSkill(); this.context.rerender(); }
  private assignSkill(slot: number): void { this.assignSelectedSkill(slot); }
  private assignSelectedSkill(slot: number): void { const { state } = this.context; const skill = this.getVisibleSkills()[this.clampIndex(this.getVisibleSkills().length)]; if (!skill || getLearnedSkillLevel(state, skill.id) <= 0) { this.context.debug.set("lastHotbarAssignment", "failed"); return; } assignHotbarAction(state, slot, { type: "skill", id: skill.id }); this.context.debug.set("lastHotbarAssignment", `${slot}:skill:${skill.id}`); }
  private assignPotion(slot: number): void { assignHotbarAction(this.context.state, slot, { type: "item", id: "minor-health-potion" }); this.context.debug.set("lastHotbarAssignment", `${slot}:item:minor-health-potion`); }
}
