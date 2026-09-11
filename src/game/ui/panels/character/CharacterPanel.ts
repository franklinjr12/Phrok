import { uiTheme } from "../../uiTheme";
import { eventBus } from "../../../systems/eventBus";
import { cycleAutoPotionThreshold, getAutoPotionSettingsSummary } from "../../../systems/consumables";
import { cycleSupportAutoPickupFilter } from "../../../systems/supports";
import { allocateStatPoint, resetAllocatedStats, statResetCost } from "../../../systems/stats";
import { addPanelButton, addPanelRectangle, addPanelText } from "../panelPrimitives";
import { panelFill, panelStroke } from "../../uiTheme";
import { CharacterWindowViewModel } from "../../viewModels/CharacterWindowViewModel";
import type { PanelContext, UIPanel } from "../panelTypes";

export class CharacterPanel implements UIPanel {
  readonly id = "character" as const;
  constructor(private readonly context: PanelContext) {}

  render(): void {
    const { state, data } = this.context;
    const model = new CharacterWindowViewModel(state, data);
    addPanelRectangle(this.context, 56, 48, 688, 504, panelFill, 0.95).setOrigin(0).setStrokeStyle(2, panelStroke, 0.92);
    addPanelText(this.context, 84, 72, "Character", 24, uiTheme.text.primary);
    addPanelText(this.context, 84, 108, `${model.name}   ${model.classLabel}   Lv ${model.level}`, 14, uiTheme.text.accent);
    addPanelText(this.context, 84, 132, `Available stat points  ${model.statPoints}`, 15, uiTheme.text.info);
    addPanelText(this.context, 84, 162, "Base Stats", 16, uiTheme.text.primary);
    this.context.debug.set("characterPanel", "visible");
    this.context.debug.set("statAllocationPoints", model.statPoints);

    model.baseStats.forEach((stat, index) => {
      const y = 192 + index * 42;
      const row = addPanelRectangle(this.context, 84, y - 8, 176, 28, 0x000000, 0.01).setOrigin(0).setInteractive({ useHandCursor: true });
      row.on("pointerover", () => this.context.showTooltip([stat.label, `Total ${stat.total}`, `Next cost ${stat.cost}`], 320, y - 8));
      row.on("pointerout", () => this.context.clearTooltip());
      addPanelText(this.context, 92, y, stat.label, 15, uiTheme.text.muted);
      addPanelText(this.context, 152, y, String(stat.total), 15, uiTheme.text.primary);
      addPanelText(this.context, 198, y, `Cost ${stat.cost}`, 13, stat.canIncrease ? uiTheme.text.positive : uiTheme.text.negative);
      addPanelButton(this.context, 270, y - 8, 34, 30, "+", () => this.increaseStat(stat.key));
    });

    addPanelText(this.context, 342, 162, "Derived Stats", 16, uiTheme.text.primary);
    model.derivedStats.forEach((stat, index) => {
      const column = index < 7 ? 0 : 1;
      const row = index % 7;
      const x = 342 + column * 178;
      const y = 192 + row * 30;
      const hover = addPanelRectangle(this.context, x - 8, y - 7, 160, 26, 0x000000, 0.01).setOrigin(0).setInteractive({ useHandCursor: true });
      hover.on("pointerover", () => this.context.showTooltip([stat.label, `Value ${stat.value}`, "Includes class, gear, buffs, support."], x - 12, y + 22));
      hover.on("pointerout", () => this.context.clearTooltip());
      addPanelText(this.context, x, y, stat.label, 13, uiTheme.text.muted);
      addPanelText(this.context, x + 104, y, String(stat.value), 13, uiTheme.text.primary);
    });

    addPanelText(this.context, 84, 420, `Auto HP ${model.hpThresholdPercent}%`, 13, uiTheme.text.negative);
    addPanelText(this.context, 204, 420, `Auto SP ${model.spThresholdPercent}%`, 13, uiTheme.text.info);
    addPanelText(this.context, 326, 420, `Support ${model.supportFilter}`, 13, "#67e8f9");
    addPanelButton(this.context, 84, 440, 92, 28, "HP Auto", () => this.cycleAutoPotion("hp"));
    addPanelButton(this.context, 188, 440, 92, 28, "SP Auto", () => this.cycleAutoPotion("sp"));
    addPanelButton(this.context, 292, 440, 112, 28, "Support", () => this.cycleSupport());
    addPanelButton(this.context, 84, 468, 120, 34, "Confirm", () => { this.context.debug.set("lastStatConfirmation", "confirmed"); this.context.closePanel(); });
    addPanelButton(this.context, 216, 468, 120, 34, "Reset", () => this.resetStats());
    addPanelButton(this.context, 348, 468, 86, 34, "Close", () => this.context.closePanel());
    this.context.debug.set("characterPanelButtons", "HP Auto|SP Auto|Support|Confirm|Reset|Close");
    this.context.debug.set("autoPotionSettings", getAutoPotionSettingsSummary(state));
  }

  destroy(): void {}

  private increaseStat(stat: Parameters<typeof allocateStatPoint>[2]): void {
    const { state, data } = this.context;
    const increased = allocateStatPoint(state, data.getClass(state.character.archetype), stat, (id) => data.getItem(id));
    this.context.debug.set("lastStatAllocation", increased ? `increase:${stat}` : `failed:${stat}`);
  }

  private resetStats(): void {
    const { state, data } = this.context;
    this.context.debug.set("statResetPrompt", `confirm:${statResetCost}`);
    const reset = resetAllocatedStats(state, data.getClass(state.character.archetype), (id) => data.getItem(id));
    if (!reset) {
      const reason = state.inventory.gold < statResetCost ? "insufficient-gold" : "no-allocated-stats";
      eventBus.emit("statResetFailed", { reason, cost: statResetCost, gold: state.inventory.gold });
    }
  }

  private cycleAutoPotion(kind: "hp" | "sp"): void {
    const threshold = cycleAutoPotionThreshold(this.context.state, kind);
    this.context.debug.set("lastAutoPotionSetting", `${kind}:${threshold}`);
    this.context.debug.set("autoPotionSettings", getAutoPotionSettingsSummary(this.context.state));
    this.context.rerender();
  }

  private cycleSupport(): void {
    const { state, data } = this.context;
    const support = state.support.equippedSupportId ? data.getSupport(state.support.equippedSupportId) : null;
    const filter = cycleSupportAutoPickupFilter(state, support);
    this.context.debug.set("lastSupportFilter", filter);
    this.context.rerender();
  }
}
