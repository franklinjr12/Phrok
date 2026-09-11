import type { DataRegistry } from "../../data/dataRegistry";
import { getQuestLogSummary, getQuestObjectiveProgress, getQuestStatus } from "../../systems/quests";
import type { QuestDefinition } from "../../types/dataDefinitions";
import type { GameState } from "../../types/gameState";

export type QuestStatus = ReturnType<typeof getQuestStatus>;

export interface QuestRowViewModel {
  quest: QuestDefinition;
  status: QuestStatus;
}

export interface QuestDetailsViewModel {
  quest: QuestDefinition;
  status: QuestStatus;
  objectiveProgress: string;
  objectiveRows: readonly { description: string; current: number; target: number }[];
  hints: string;
  rewardItems: string;
}

/** Read-only quest-log projection shared by rendering and diagnostics. */
export class QuestLogViewModel {
  readonly quests: readonly QuestRowViewModel[];
  readonly selectedIndex: number;
  readonly selected: QuestDetailsViewModel | null;
  readonly activeCount: number;
  readonly completedCount: number;
  readonly summary: string;

  constructor(state: GameState, data: DataRegistry, selectedIndex = 0) {
    const quests = data.getQuests();
    this.quests = quests.map((quest) => ({ quest, status: getQuestStatus(state, quest) }));
    this.selectedIndex = clampIndex(selectedIndex, quests.length);
    const quest = quests[this.selectedIndex] ?? null;
    if (quest) {
      const progress = state.quests.activeQuests.find((entry) => entry.questId === quest.id) ?? null;
      this.selected = {
        quest,
        status: getQuestStatus(state, quest),
        objectiveProgress: getQuestObjectiveProgress(quest, progress),
        objectiveRows: quest.objectives.map((objective) => ({
          description: objective.description,
          current: progress?.objectiveProgress[objective.id] ?? 0,
          target: objective.targetCount,
        })),
        hints: quest.objectives.map((objective) => objective.regionHint || objective.mapId).filter(Boolean).join("|"),
        rewardItems: quest.rewards.items.map((item) => `${data.getItem(item.itemId).name} x${item.quantity}`).join(", "),
      };
    } else {
      this.selected = null;
    }
    this.activeCount = state.quests.activeQuestIds.length;
    this.completedCount = state.quests.completedQuestIds.length;
    this.summary = getQuestLogSummary(state, quests);
  }
}

function clampIndex(index: number, length: number): number {
  return length === 0 ? 0 : Math.max(0, Math.min(index, length - 1));
}
