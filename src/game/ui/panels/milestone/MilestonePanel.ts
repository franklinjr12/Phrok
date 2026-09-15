import { getEarlyGameMilestoneLines } from "../../../systems/earlyGameProgression";
import { uiTheme } from "../../uiTheme";
import { addPanelButton, addPanelRectangle, addPanelText } from "../panelPrimitives";
import type { PanelContext, UIPanel } from "../panelTypes";

export class MilestonePanel implements UIPanel {
  readonly id = "milestone" as const;
  readonly window = { modal: true, blocksGameplay: true, closable: true, draggable: false };

  constructor(private readonly context: PanelContext) {}

  render(): void {
    const lines = getEarlyGameMilestoneLines();
    addPanelRectangle(this.context, 140, 90, 520, 360, uiTheme.colors.background, 0.96).setOrigin(0).setStrokeStyle(2, uiTheme.colors.accent, 0.92);
    addPanelText(this.context, 168, 112, "The road continues", 22, uiTheme.text.primary);
    lines.forEach((line, index) => {
      addPanelText(this.context, 168, 160 + index * 28, line, 15, uiTheme.text.secondary);
    });
    addPanelText(this.context, 168, 318, "Blueharbor, Amber Dunes, Ironroot, Moonveil, and Starfall wait beyond Mossvale.", 13, uiTheme.text.accent);
    addPanelButton(this.context, 168, 380, 160, 36, "Continue", () => this.context.closePanel());
    this.context.debug.set("milestonePanel", "visible");
    this.context.debug.set("earlyGameMilestone", "shown");
  }

  destroy(): void {}
}
