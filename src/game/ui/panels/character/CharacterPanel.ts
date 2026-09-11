import { eventBus } from "../../../systems/eventBus";
import { cycleAutoPotionThreshold, getAutoPotionSettingsSummary } from "../../../systems/consumables";
import { cycleSupportAutoPickupFilter } from "../../../systems/supports";
import { allocateStatPoint, baseStatKeys, baseStatLabels, calculateDerivedStats, getStatCost, getTotalBaseStats, resetAllocatedStats, statResetCost } from "../../../systems/stats";
import { addPanelButton, addPanelRectangle, addPanelText } from "../panelPrimitives";
import { panelFill, panelStroke } from "../../uiTheme";
import type { PanelContext, UIPanel } from "../panelTypes";

export class CharacterPanel implements UIPanel {
  readonly id = "character" as const;
  constructor(private readonly context: PanelContext) {}

  render(): void {
    const { state, data } = this.context;
    addPanelRectangle(this.context, 56, 48, 688, 504, panelFill, 0.95).setOrigin(0).setStrokeStyle(2, panelStroke, 0.92);
    addPanelText(this.context, 84, 72, "Character", 24, "#f8fafc");
    addPanelText(this.context, 84, 108, `${state.playerProfile.name}   Lv ${state.playerProfile.level}   Points ${state.playerProfile.statPoints}`, 15, "#fde68a");
    addPanelText(this.context, 84, 144, "Base Stats", 16, "#f8fafc");
    const totalStats = getTotalBaseStats(state, (id) => data.getStatusEffect(id), (id) => data.getSupport(id));
    this.context.debug.set("characterPanel", "visible");
    this.context.debug.set("statAllocationPoints", state.playerProfile.statPoints);
    baseStatKeys.forEach((key, index) => {
      const y = 174 + index * 42; const cost = getStatCost(totalStats[key]); const canIncrease = state.playerProfile.statPoints >= cost;
      const row = addPanelRectangle(this.context, 84, y - 8, 176, 28, 0x000000, 0.01).setOrigin(0).setInteractive({ useHandCursor: true });
      row.on("pointerover", () => this.context.showTooltip([baseStatLabels[key], `Total ${totalStats[key]}`, `Next cost ${cost}`], 320, y - 8));
      row.on("pointerout", () => this.context.clearTooltip());
      addPanelText(this.context, 92, y, baseStatLabels[key], 15, "#94a3b8"); addPanelText(this.context, 152, y, String(totalStats[key]), 15, "#f8fafc"); addPanelText(this.context, 198, y, `Cost ${cost}`, 13, canIncrease ? "#bbf7d0" : "#fca5a5");
      addPanelButton(this.context, 270, y - 8, 34, 30, "+", () => this.increaseStat(key));
    });
    addPanelText(this.context, 342, 144, "Derived Stats", 16, "#f8fafc");
    const derived = calculateDerivedStats(state, data.getClass(state.character.archetype), (id) => data.getItem(id), (id) => data.getStatusEffect(id), (id) => data.getSupport(id));
    const rows = [["Max HP", derived.maxHp], ["Max SP", derived.maxSp], ["Physical ATK", derived.physicalAttack], ["Ranged ATK", derived.rangedAttack], ["Magic ATK", derived.magicAttack], ["Defense", derived.defense], ["Magic DEF", derived.magicDefense], ["Hit", derived.hit], ["Dodge", derived.dodge], ["Crit", `${derived.crit}%`], ["Attack Speed", derived.attackSpeed], ["Cast Speed", derived.castSpeed], ["Move Speed", derived.moveSpeed], ["Weight Limit", derived.weightLimit]] as const;
    rows.forEach(([label, value], index) => { const column = index < 7 ? 0 : 1; const row = index % 7; const x = 342 + column * 178; const y = 174 + row * 36; const hover = addPanelRectangle(this.context, x - 8, y - 7, 160, 26, 0x000000, 0.01).setOrigin(0).setInteractive({ useHandCursor: true }); hover.on("pointerover", () => this.context.showTooltip([label, `Value ${value}`, "Includes class, gear, buffs, support."], x - 12, y + 22)); hover.on("pointerout", () => this.context.clearTooltip()); addPanelText(this.context, x, y, label, 13, "#94a3b8"); addPanelText(this.context, x + 104, y, String(value), 13, "#f8fafc"); });
    addPanelText(this.context, 84, 420, `Auto HP ${state.character.consumables.autoPotion.hpThresholdPercent}%`, 13, "#fca5a5"); addPanelText(this.context, 204, 420, `Auto SP ${state.character.consumables.autoPotion.spThresholdPercent}%`, 13, "#93c5fd"); addPanelText(this.context, 326, 420, `Support ${state.support.autoPickupFilter}`, 13, "#67e8f9");
    addPanelButton(this.context, 84, 440, 92, 28, "HP Auto", () => this.cycleAutoPotion("hp")); addPanelButton(this.context, 188, 440, 92, 28, "SP Auto", () => this.cycleAutoPotion("sp")); addPanelButton(this.context, 292, 440, 112, 28, "Support", () => this.cycleSupport());
    addPanelButton(this.context, 84, 468, 120, 34, "Confirm", () => { this.context.debug.set("lastStatConfirmation", "confirmed"); this.context.closePanel(); }); addPanelButton(this.context, 216, 468, 120, 34, "Reset", () => this.resetStats()); addPanelButton(this.context, 348, 468, 86, 34, "Close", () => this.context.closePanel());
    this.context.debug.set("characterPanelButtons", "HP Auto|SP Auto|Support|Confirm|Reset|Close"); this.context.debug.set("autoPotionSettings", getAutoPotionSettingsSummary(state)); this.context.syncSupport();
  }

  destroy(): void {}

  private increaseStat(stat: (typeof baseStatKeys)[number]): void {
    const { state, data } = this.context; const increased = allocateStatPoint(state, data.getClass(state.character.archetype), stat, (id) => data.getItem(id)); this.context.debug.set("lastStatAllocation", increased ? `increase:${stat}` : `failed:${stat}`);
  }

  private resetStats(): void {
    const { state, data } = this.context; this.context.debug.set("statResetPrompt", `confirm:${statResetCost}`); const reset = resetAllocatedStats(state, data.getClass(state.character.archetype), (id) => data.getItem(id));
    if (!reset) { const reason = state.inventory.gold < statResetCost ? "insufficient-gold" : "no-allocated-stats"; eventBus.emit("statResetFailed", { reason, cost: statResetCost, gold: state.inventory.gold }); }
  }

  private cycleAutoPotion(kind: "hp" | "sp"): void { const threshold = cycleAutoPotionThreshold(this.context.state, kind); this.context.debug.set("lastAutoPotionSetting", `${kind}:${threshold}`); this.context.debug.set("autoPotionSettings", getAutoPotionSettingsSummary(this.context.state)); this.context.rerender(); }
  private cycleSupport(): void { const { state, data } = this.context; const support = state.support.equippedSupportId ? data.getSupport(state.support.equippedSupportId) : null; const filter = cycleSupportAutoPickupFilter(state, support); this.context.debug.set("lastSupportFilter", filter); this.context.syncSupport(); this.context.rerender(); }
}
