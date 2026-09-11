import { uiTheme } from "../../uiTheme";
import { assignHotbarAction, allocateSkillPoint, hotbarSlotCount } from "../../../systems/skills";
import { addPanelButton, addPanelRectangle, addPanelText, wrapText } from "../panelPrimitives";
import { panelFill, panelStroke } from "../../uiTheme";
import { SkillTreeViewModel, type SkillRowViewModel } from "../../viewModels/SkillTreeViewModel";
import type { PanelContext, UIPanel } from "../panelTypes";

export class SkillsPanel implements UIPanel {
  readonly id = "skills" as const;
  private selectedIndex = 0;
  constructor(private readonly context: PanelContext) {}

  render(): void {
    const { state, data } = this.context;
    const model = new SkillTreeViewModel(state, data, this.selectedIndex);
    this.selectedIndex = model.selectedIndex;
    addPanelRectangle(this.context, 70, 60, 660, 470, panelFill, 0.95).setOrigin(0).setStrokeStyle(2, panelStroke, 0.92);
    addPanelText(this.context, 96, 84, "Skills", 24, uiTheme.text.primary);
    addPanelText(this.context, 96, 120, `Class ${model.classLabel}   Skill Points ${model.skillPoints}`, 15, uiTheme.text.accent);
    this.context.debug.set("skillPanel", "visible");
    this.context.debug.set("skillGroups", model.treeIds.join("|"));
    this.context.debug.set("skillPanelPoints", model.skillPoints);

    model.skills.forEach((row, index) => {
      const y = 150 + index * 34;
      if (index > 0) addPanelRectangle(this.context, 102, y - 11, 2, 11, uiTheme.colors.border, 0.75).setOrigin(0);
      const box = addPanelRectangle(this.context, 96, y, 330, 28, index === model.selectedIndex ? uiTheme.colors.selected : uiTheme.colors.inset, 0.94)
        .setOrigin(0).setStrokeStyle(1, index === model.selectedIndex ? uiTheme.colors.accent : uiTheme.colors.border, 0.9)
        .setInteractive({ useHandCursor: true });
      if (row.unlocked) {
        box.setData("hotbarAction", { type: "skill", id: row.skill.id });
        this.context.scene.input.setDraggable(box, true);
      }
      box.on("pointerdown", () => { this.selectedIndex = index; this.context.rerender(); });
      box.on("pointerover", () => this.context.showTooltip([row.skill.name, `${row.skill.type} ${row.skill.targetingMode}`, row.effectText], 438, y - 8));
      box.on("pointerout", () => this.context.clearTooltip());
      addPanelText(this.context, 110, y + 5, `${row.skill.name}  Lv ${row.level}/${row.skill.maxSkillLevel}`, 13, row.unlocked ? uiTheme.text.primary : uiTheme.text.muted);
      addPanelText(this.context, 292, y + 5, row.skill.type, 12, uiTheme.text.secondary);
      addPanelText(this.context, 352, y + 5, row.unlocked ? (row.canAllocate ? "Ready" : "Learned") : `Req Lv ${row.skill.requiredLevel}`, 11, row.unlocked ? uiTheme.text.positive : uiTheme.text.negative);
    });

    this.renderSelected(model.selected);
    addPanelButton(this.context, 456, 420, 86, 34, "Level", () => this.levelSelected());
    addPanelButton(this.context, 552, 420, 86, 34, "Slot 1", () => this.assignSelectedSkill(1));
    addPanelButton(this.context, 648, 420, 66, 34, "Potion", () => this.assignPotion(2));
    addPanelButton(this.context, 628, 476, 86, 28, "Close", () => this.context.closePanel());
    this.context.debug.set("skillPanelButtons", "Level|Slot 1|Potion|Close");
  }

  destroy(): void {}

  handleKey(event: KeyboardEvent): boolean {
    const slot = Number(event.key);
    if (!Number.isInteger(slot) || slot < 1 || slot > hotbarSlotCount) return false;
    event.preventDefault();
    this.assignSelectedSkill(slot);
    return true;
  }

  private renderSelected(selected: SkillRowViewModel | null): void {
    if (!selected) {
      this.context.debug.set("selectedSkill", "");
      this.context.debug.set("selectedSkillLevel", "");
      this.context.debug.set("selectedSkillLocked", "");
      this.context.debug.set("selectedSkillTooltip", "");
      return;
    }
    addPanelRectangle(this.context, 456, 158, 230, 240, uiTheme.colors.inset, 0.95).setOrigin(0).setStrokeStyle(1, uiTheme.colors.border, 0.86);
    addPanelText(this.context, 476, 178, selected.skill.name, 17, uiTheme.text.primary);
    addPanelText(this.context, 476, 208, `Level ${selected.level}/${selected.skill.maxSkillLevel}   ${selected.skill.targetingMode}   ${selected.skill.type}`, 12, uiTheme.text.secondary);
    addPanelText(this.context, 476, 232, wrapText(selected.skill.description, 24), 12, uiTheme.text.secondary);
    addPanelText(this.context, 476, 284, wrapText(`Effect: ${selected.effectText}`, 27), 11, uiTheme.text.accent);
    addPanelText(this.context, 476, 334, `SP ${selected.skill.spCost}  CD ${selected.skill.cooldown}ms  Range ${selected.skill.range}`, 11, uiTheme.text.info);
    addPanelText(this.context, 476, 356, `Target ${selected.skill.targetingMode}   Skill point cost 1`, 11, uiTheme.text.info);
    addPanelText(this.context, 476, 378, selected.prerequisiteText, 11, selected.unlocked ? uiTheme.text.positive : uiTheme.text.negative);
    addPanelText(this.context, 476, 396, `Next level: ${selected.level >= selected.skill.maxSkillLevel ? "Maxed" : selected.canAllocate ? "Available" : selected.requirementText}`, 10, selected.canAllocate ? uiTheme.text.positive : uiTheme.text.negative);
    this.context.debug.set("selectedSkill", selected.skill.id);
    this.context.debug.set("selectedSkillLevel", selected.level);
    this.context.debug.set("selectedSkillLocked", !selected.unlocked);
    this.context.debug.set("selectedSkillTooltip", `${selected.skill.type}|${selected.skill.targetingMode}|${selected.effectText}|${selected.requirementText}`);
  }

  private getModel(): SkillTreeViewModel {
    return new SkillTreeViewModel(this.context.state, this.context.data, this.selectedIndex);
  }

  private levelSelected(): void {
    const model = this.getModel();
    const selected = model.selected;
    const allocated = selected ? allocateSkillPoint(this.context.state, selected.skill) : false;
    this.context.debug.set("lastSkillAllocation", allocated && selected ? `${selected.skill.id}:${selected.level + 1}` : "failed");
    this.context.rerender();
  }

  private assignSelectedSkill(slot: number): void {
    const selected = this.getModel().selected;
    if (!selected || selected.level <= 0) {
      this.context.debug.set("lastHotbarAssignment", "failed");
      return;
    }
    const assigned = assignHotbarAction(this.context.state, slot, { type: "skill", id: selected.skill.id });
    this.context.debug.set("lastHotbarAssignment", assigned ? `${slot}:skill:${selected.skill.id}` : "failed");
  }

  private assignPotion(slot: number): void {
    const assigned = assignHotbarAction(this.context.state, slot, { type: "item", id: "minor-health-potion" });
    this.context.debug.set("lastHotbarAssignment", assigned ? `${slot}:item:minor-health-potion` : "failed");
  }
}
