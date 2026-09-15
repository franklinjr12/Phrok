import { claimRewardChoice, getRewardChoiceOptions, getRewardChoiceForSource } from "../../../systems/rewardChoices";
import { uiTheme } from "../../uiTheme";
import { addPanelButton, addPanelRectangle, addPanelText } from "../panelPrimitives";
import type { PanelContext, UIPanel } from "../panelTypes";

export class RewardChoicePanel implements UIPanel {
  readonly id = "rewardChoice" as const;
  readonly window = { modal: true, blocksGameplay: true, closable: false, draggable: false };
  private choiceId = "";

  constructor(private readonly context: PanelContext) {}

  open(payload?: unknown): void {
    const values = (payload ?? {}) as { choiceId?: string; sourceId?: string };
    this.choiceId = values.choiceId
      ?? (values.sourceId ? getRewardChoiceForSource(this.context.data, values.sourceId)?.id ?? "" : "");
  }

  render(): void {
    const choice = this.context.data.getRewardChoices().find((entry) => entry.id === this.choiceId);
    if (!choice) {
      return;
    }
    const options = getRewardChoiceOptions(choice, this.context.state.character.archetype);
    addPanelRectangle(this.context, 160, 120, 480, 320, uiTheme.colors.background, 0.96).setOrigin(0).setStrokeStyle(2, uiTheme.colors.accent, 0.9);
    addPanelText(this.context, 184, 144, choice.title, 22, uiTheme.text.primary);
    addPanelText(this.context, 184, 180, choice.prompt, 14, uiTheme.text.secondary);
    options.forEach((option, index) => {
      const item = this.context.data.getItem(option.itemId);
      const y = 220 + index * 42;
      addPanelButton(this.context, 184, y, 432, 34, `${option.label}: ${item.name}`, () => {
        this.context.debug.set("lastRewardChoice", `${choice.id}:${option.id}:${option.itemId}`);
        this.context.closePanel();
        claimRewardChoice(this.context.state, this.context.data, choice, option.id);
      });
    });
    this.context.debug.set("rewardChoicePanel", "visible");
    this.context.debug.set("rewardChoiceId", choice.id);
    this.context.debug.set("rewardChoiceOptions", options.map((option) => option.itemId).join("|"));
  }

  destroy(): void {}
}
