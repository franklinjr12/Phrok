import { acceptQuest, completeQuest } from "../../../systems/quests";
import { uiTheme } from "../../uiTheme";
import { QuestLogViewModel, type QuestDetailsViewModel, type QuestStatus } from "../../viewModels/QuestLogViewModel";
import type { PanelContext, UIPanel } from "../panelTypes";
import { addPanelButton, addPanelRectangle, addPanelText, clampWrappedText, truncateText } from "../panelPrimitives";
import { panelFill, panelStroke } from "../../uiTheme";

export class QuestLogPanel implements UIPanel {
  readonly id = "questLog" as const;
  private selectedQuestIndex = 0;
  constructor(private readonly context: PanelContext) {}

  open(payload?: unknown): void {
    const values = (payload ?? {}) as Record<string, unknown>;
    if (typeof values.selectedQuestIndex === "number") this.selectedQuestIndex = values.selectedQuestIndex;
  }

  render(): void {
    const { state, data } = this.context;
    const model = new QuestLogViewModel(state, data, this.selectedQuestIndex);
    this.selectedQuestIndex = model.selectedIndex;
    addPanelRectangle(this.context, 64, 54, 672, 500, panelFill, 0.96).setOrigin(0).setStrokeStyle(2, panelStroke, 0.9);
    addPanelText(this.context, 92, 78, "Quest Log", 23, uiTheme.text.primary);
    addPanelText(this.context, 92, 112, `Active ${model.activeCount}   Completed ${model.completedCount}`, 14, uiTheme.text.accent);
    addPanelText(this.context, 92, 146, "Campaign", 14, uiTheme.text.muted);

    model.quests.slice(0, 10).forEach((row, index) => {
      const y = 174 + index * 28;
      const box = addPanelRectangle(this.context, 92, y - 6, 360, 26, index === model.selectedIndex ? uiTheme.colors.selected : uiTheme.colors.inset, 0.94)
        .setOrigin(0).setInteractive({ useHandCursor: true });
      box.on("pointerdown", () => { this.selectedQuestIndex = index; this.context.rerender(); });
      addPanelText(this.context, 104, y, truncateText(row.quest.name, 28), 13, uiTheme.text.primary);
      addPanelText(this.context, 344, y, row.quest.type, 12, uiTheme.text.info);
      addPanelText(this.context, 398, y, row.status, 12, this.getQuestStatusColor(row.status));
    });

    addPanelRectangle(this.context, 482, 146, 220, 286, uiTheme.colors.inset, 0.95).setOrigin(0).setStrokeStyle(1, uiTheme.colors.border, 0.9);
    this.renderDetails(model.selected);
    addPanelButton(this.context, 482, 450, 92, 34, "Accept", () => this.acceptSelectedQuest());
    addPanelButton(this.context, 584, 450, 92, 34, "Complete", () => this.completeSelectedQuest());
    addPanelButton(this.context, 606, 496, 92, 30, "Close", () => this.context.closePanel());
    this.context.debug.set("questLogPanel", "visible");
    this.context.debug.set("questCount", model.quests.length);
    this.context.debug.set("questLogSummary", model.summary);
    this.context.debug.set("activeQuests", state.quests.activeQuestIds.join("|"));
    this.context.debug.set("completedQuests", state.quests.completedQuestIds.join("|"));
    this.context.debug.set("questLogButtons", "Accept|Complete|Close");
    this.context.debug.set("selectedQuest", model.selected?.quest.id ?? "");
    this.context.debug.set("selectedQuestName", model.selected?.quest.name ?? "");
    this.context.debug.set("selectedQuestStatus", model.selected?.status ?? "");
    this.context.debug.set("selectedQuestObjectives", model.selected?.objectiveProgress ?? "");
    this.context.debug.set("selectedQuestHints", model.selected?.hints ?? "");
  }

  destroy(): void {}

  private renderDetails(selected: QuestDetailsViewModel | null): void {
    if (!selected) {
      addPanelText(this.context, 502, 184, "No quests", 15, uiTheme.text.muted);
      return;
    }
    addPanelText(this.context, 502, 168, truncateText(selected.quest.name, 22), 16, uiTheme.text.primary);
    addPanelText(this.context, 502, 198, `Status ${selected.status}`, 13, this.getQuestStatusColor(selected.status));
    addPanelText(this.context, 502, 224, clampWrappedText(selected.quest.description, 25, 4), 12, uiTheme.text.secondary);
    addPanelText(this.context, 502, 304, clampWrappedText(selected.objectiveRows.map((objective) => `${objective.description} ${objective.current}/${objective.target}`).join(" | "), 24, 3), 12, uiTheme.text.primary);
    addPanelText(this.context, 502, 366, clampWrappedText(`Hints ${selected.hints || "None"}`, 24, 2), 12, uiTheme.text.info);
    addPanelText(this.context, 502, 404, clampWrappedText(`Rewards XP ${selected.quest.rewards.xp} Gold ${selected.quest.rewards.gold} ${selected.rewardItems}`, 24, 2), 12, uiTheme.text.accent);
  }

  private getQuestStatusColor(status: QuestStatus): string {
    if (status === "completed") return uiTheme.text.positive;
    if (status === "ready") return uiTheme.text.accent;
    if (status === "active") return uiTheme.text.info;
    if (status === "locked") return uiTheme.text.muted;
    return uiTheme.text.primary;
  }

  private acceptSelectedQuest(): void {
    const { state, data } = this.context;
    const quest = data.getQuests()[this.selectedQuestIndex];
    const accepted = quest ? acceptQuest(state, quest) : null;
    this.context.debug.set("lastQuestAction", accepted && quest ? `accepted:${quest.id}` : "accept-failed");
    this.context.rerender();
  }

  private completeSelectedQuest(): void {
    const { state, data } = this.context;
    const quest = data.getQuests()[this.selectedQuestIndex];
    const completed = quest ? completeQuest(state, data, quest.id) : false;
    this.context.debug.set("lastQuestAction", completed && quest ? `completed:${quest.id}` : "complete-failed");
    this.context.rerender();
  }
}
