import { uiTheme } from "../../uiTheme";
import type { ItemDefinition } from "../../../types/dataDefinitions";
import type { BaseStatKey, EquipmentSlot } from "../../../types/gameState";
import { compareEquipmentItems, equipmentSlotLabels, equipmentSlots, getEquipmentStats, getItemEquipmentSlot, getItemEquipmentStats, removeEquipment } from "../../../systems/equipment";
import { calculateDerivedStats } from "../../../systems/stats";
import { baseStatLabels } from "../../../systems/stats";
import { getItemRarity } from "../../../systems/equipment";
import { getRefineLevel, isItemRefinable } from "../../../systems/refinement";
import { addPanelButton, addPanelRectangle, addPanelText, wrapText } from "../panelPrimitives";
import { panelFill, panelStroke } from "../../uiTheme";
import type { PanelContext, UIPanel } from "../panelTypes";

export class EquipmentPanel implements UIPanel {
  readonly id = "equipment" as const;
  private selectedSlot: EquipmentSlot = "weapon";
  constructor(private readonly context: PanelContext) {}

  render(): void {
    const { state, data } = this.context;
    addPanelRectangle(this.context, 70, 60, 660, 470, panelFill, 0.94).setOrigin(0).setStrokeStyle(2, panelStroke, 0.92);
    addPanelText(this.context, 96, 84, "Equipment", 24, uiTheme.text.primary);
    const stats = getEquipmentStats(state.equipment, (id) => data.getItem(id), state.inventory.refinementLevels);
    const derived = calculateDerivedStats(state, data.getClass(state.character.archetype), (id) => data.getItem(id), (id) => data.getStatusEffect(id), (id) => data.getSupport(id));
    addPanelText(this.context, 96, 120, `Attack ${derived.physicalAttack}   Defense ${derived.defense}   Gear ${this.getEquipmentBonusText(stats)}`, 15, uiTheme.text.positive);
    this.context.debug.set("equipmentPanel", "visible");
    this.context.debug.set("equipmentSlotsVisible", equipmentSlots.join("|"));
    equipmentSlots.forEach((slot, index) => {
      const column = index < 5 ? 0 : 1; const row = index % 5; const x = 96 + column * 290; const y = 160 + row * 52;
      const itemId = state.equipment[slot]; const item = itemId ? data.getItem(itemId) : null; const selected = slot === this.selectedSlot;
      const rowObject = addPanelRectangle(this.context, x, y, 254, 38, selected ? uiTheme.colors.selected : uiTheme.colors.inset, 0.94).setOrigin(0).setStrokeStyle(1, selected ? uiTheme.colors.accent : uiTheme.colors.border, 0.9).setInteractive({ useHandCursor: true });
      rowObject.on("pointerdown", () => { this.selectedSlot = slot; this.context.rerender(); });
      if (item) { rowObject.on("pointerover", () => this.context.showComparison(item)); rowObject.on("pointerout", () => this.context.clearComparison()); }
      addPanelText(this.context, x + 12, y + 7, equipmentSlotLabels[slot], 12, uiTheme.text.muted);
      addPanelText(this.context, x + 112, y + 6, item ? `${item.name}${item && isItemRefinable(item) ? ` +${getRefineLevel(state.inventory, item.id)}` : ""}` : "Empty", 13, item ? uiTheme.text.primary : "#64748b");
      addPanelText(this.context, x + 112, y + 22, item ? this.getImportantStatText(item) : "—", 10, item ? uiTheme.text.positive : "#64748b");
      if (item) {
        rowObject.on("pointerover", () => this.context.showTooltip([
          `${equipmentSlotLabels[slot]} · ${item.name}`,
          `Rarity: ${getItemRarity(item)}${isItemRefinable(item) ? `  Refine +${getRefineLevel(state.inventory, item.id)}` : ""}`,
          `Effect: ${this.getItemModifierText(item)}`,
        ], x + 10, y + 42));
        rowObject.on("pointerout", () => this.context.clearTooltip());
      }
    });
    addPanelButton(this.context, 96, 450, 102, 34, "Remove", () => this.removeSelected());
    addPanelButton(this.context, 210, 450, 102, 34, "Close", () => this.context.closePanel());
    this.renderSelectedDetails();
    this.renderComparisonFrame();
  }

  destroy(): void {}

  private renderSelectedDetails(): void {
    const { state, data } = this.context; const itemId = state.equipment[this.selectedSlot]; const item = itemId ? data.getItem(itemId) : null;
    addPanelRectangle(this.context, 96, 346, 386, 86, uiTheme.colors.inset, 0.95).setOrigin(0).setStrokeStyle(1, uiTheme.colors.border, 0.86);
    addPanelText(this.context, 112, 360, `${equipmentSlotLabels[this.selectedSlot]}: ${item?.name ?? "Empty"}`, 14, item ? uiTheme.text.primary : uiTheme.text.muted);
    addPanelText(this.context, 112, 384, item ? `Rarity ${getItemRarity(item)}   Refine +${isItemRefinable(item) ? getRefineLevel(state.inventory, item.id) : 0}` : "No item equipped", 11, item ? uiTheme.text.accent : "#64748b");
    addPanelText(this.context, 112, 404, wrapText(`Effects: ${item ? this.getItemModifierText(item) : "None"}`, 48), 11, item ? uiTheme.text.positive : "#64748b");
  }

  private renderComparisonFrame(): void {
    addPanelRectangle(this.context, 520, 346, 170, 138, uiTheme.colors.inset, 0.95).setOrigin(0).setStrokeStyle(1, uiTheme.colors.border, 0.86);
    addPanelText(this.context, 536, 362, "Comparison", 16, uiTheme.text.primary);
    addPanelText(this.context, 536, 392, "Hover gear to compare.", 13, uiTheme.text.muted);
  }

  private removeSelected(): void {
    if (removeEquipment(this.context.state, this.selectedSlot)) this.context.debug.set("lastEquipmentAction", `remove:${this.selectedSlot}`);
  }

  private getItemModifierText(item: ItemDefinition): string {
    const effects: string[] = []; const modifiers = item.statModifiers ?? {};
    for (const [stat, value] of Object.entries(modifiers.baseStats ?? {})) if (typeof value === "number") effects.push(`${baseStatLabels[stat as BaseStatKey] ?? stat} ${this.formatSigned(value)}`);
    for (const [stat, value] of Object.entries(modifiers.derivedStats ?? {})) if (typeof value === "number") effects.push(`${stat} ${this.formatSigned(value)}`);
    for (const [key, value] of Object.entries(modifiers.elementDamage ?? {})) effects.push(`${key} damage ${this.formatSigned(value)}`);
    for (const [key, value] of Object.entries(modifiers.raceDamage ?? {})) effects.push(`${key} damage ${this.formatSigned(value)}`);
    for (const [key, value] of Object.entries(modifiers.resistances ?? {})) effects.push(`${key} resist ${this.formatSigned(value)}`);
    return effects.length > 0 ? effects.join(", ") : "None";
  }

  private getEquipmentBonusText(stats: ReturnType<typeof getEquipmentStats>): string {
    const bonuses = [stats.attack ? `ATK +${stats.attack}` : "", stats.magicAttack ? `MATK +${stats.magicAttack}` : "", stats.defense ? `DEF +${stats.defense}` : "", stats.magicDefense ? `MDEF +${stats.magicDefense}` : "", stats.hp ? `HP +${stats.hp}` : "", stats.sp ? `SP +${stats.sp}` : "", stats.crit ? `Crit +${stats.crit}` : "", stats.attackSpeed ? `ASPD +${stats.attackSpeed}` : "", stats.castSpeed ? `Cast +${stats.castSpeed}` : "", stats.cooldownReduction ? `CDR +${stats.cooldownReduction}` : "", stats.moveSpeed ? `Move +${stats.moveSpeed}` : "", stats.dropChance ? `Drop +${stats.dropChance}` : "", ...Object.entries(stats.elementDamage).map(([key, value]) => `${key} +${value}`), ...Object.entries(stats.raceDamage).map(([key, value]) => `${key} +${value}`), ...Object.entries(stats.resistances).map(([key, value]) => `${key} resist +${value}`)].filter(Boolean);
    return bonuses.length > 0 ? bonuses.join(" ") : "None";
  }

  private formatSigned(value: number): string { return value > 0 ? `+${value}` : String(value); }

  private getImportantStatText(item: ItemDefinition): string {
    const stats = getItemEquipmentStats(item);
    const values = [stats.attack ? `ATK ${this.formatSigned(stats.attack)}` : "", stats.defense ? `DEF ${this.formatSigned(stats.defense)}` : "", stats.hp ? `HP ${this.formatSigned(stats.hp)}` : "", stats.sp ? `SP ${this.formatSigned(stats.sp)}` : ""];
    return values.filter(Boolean).join(" ") || "Utility equipment";
  }
}
