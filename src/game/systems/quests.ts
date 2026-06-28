import { addGold, addInventoryItem } from "./inventory";
import { awardXp } from "./progression";
import { eventBus } from "./eventBus";
import type { DataRegistry } from "../data/dataRegistry";
import type { QuestDefinition, QuestObjectiveDefinition } from "../types/dataDefinitions";
import type { GameState, QuestProgressState, QuestState } from "../types/gameState";

export type QuestEvent =
  | { type: "visitMap"; targetId: string; amount?: number }
  | { type: "killMonster"; targetId: string; amount?: number }
  | { type: "collectItem"; targetId: string; amount?: number }
  | { type: "talkToNpc"; targetId: string; amount?: number }
  | { type: "reachLevel"; targetId: string; amount?: number }
  | { type: "completeQuest"; targetId: string; amount?: number };

export function createInitialQuestState(): QuestState {
  return {
    activeQuestIds: [],
    completedQuestIds: [],
    activeQuests: [],
    completedAt: {},
  };
}

export function canAcceptQuest(state: GameState, quest: QuestDefinition): boolean {
  return !state.quests.activeQuestIds.includes(quest.id)
    && !state.quests.completedQuestIds.includes(quest.id)
    && state.playerProfile.level >= quest.requiredLevel
    && quest.requiredFlags.every((flag) => state.worldFlags[flag] === true);
}

export function acceptQuest(
  state: GameState,
  quest: QuestDefinition,
  acceptedAt = new Date().toISOString(),
): QuestProgressState | null {
  if (!canAcceptQuest(state, quest)) {
    return null;
  }

  const progress: QuestProgressState = {
    questId: quest.id,
    objectiveProgress: Object.fromEntries(quest.objectives.map((objective) => [objective.id, 0])),
    acceptedAt,
    readyToComplete: quest.objectives.length === 0,
  };

  state.quests.activeQuestIds.push(quest.id);
  state.quests.activeQuests.push(progress);
  emitQuestChanged(state, quest.id, "accepted");
  return progress;
}

export function updateQuestObjectives(
  state: GameState,
  dataRegistry: DataRegistry,
  event: QuestEvent,
): string[] {
  const updated: string[] = [];

  for (const progress of state.quests.activeQuests) {
    const quest = dataRegistry.getQuest(progress.questId);
    let changed = false;

    for (const objective of quest.objectives) {
      if (!matchesObjective(objective, event)) {
        continue;
      }

      const current = progress.objectiveProgress[objective.id] ?? 0;
      const next = Math.min(objective.targetCount, current + Math.max(1, Math.floor(event.amount ?? 1)));

      if (next !== current) {
        progress.objectiveProgress[objective.id] = next;
        changed = true;
        updated.push(`${quest.id}:${objective.id}:${next}/${objective.targetCount}`);
      }
    }

    if (changed) {
      progress.readyToComplete = isQuestReadyToComplete(quest, progress);
    }
  }

  if (updated.length > 0) {
    emitQuestChanged(state, updated[0].split(":")[0], "progress");
  }

  return updated;
}

export function completeQuest(
  state: GameState,
  dataRegistry: DataRegistry,
  questId: string,
  completedAt = new Date().toISOString(),
): boolean {
  const progress = state.quests.activeQuests.find((entry) => entry.questId === questId);

  if (!progress) {
    return false;
  }

  const quest = dataRegistry.getQuest(questId);
  if (!isQuestReadyToComplete(quest, progress)) {
    return false;
  }

  state.quests.activeQuestIds = state.quests.activeQuestIds.filter((id) => id !== questId);
  state.quests.activeQuests = state.quests.activeQuests.filter((entry) => entry.questId !== questId);
  state.quests.completedQuestIds.push(questId);
  state.quests.completedAt[questId] = completedAt;

  addGold(state.inventory, quest.rewards.gold);
  awardXp(state, dataRegistry.getXpTable("standard"), quest.rewards.xp);

  for (const rewardItem of quest.rewards.items) {
    addInventoryItem(state.inventory, dataRegistry.getItem(rewardItem.itemId), rewardItem.quantity);
  }

  for (const flag of [...quest.unlockFlags, ...quest.rewards.unlockFlags]) {
    state.worldFlags[flag] = true;
  }

  updateQuestObjectives(state, dataRegistry, { type: "completeQuest", targetId: questId });
  emitQuestChanged(state, questId, "completed");
  return true;
}

export function getQuestObjectiveProgress(
  quest: QuestDefinition,
  progress: QuestProgressState | null,
): string {
  return quest.objectives
    .map((objective) => `${objective.id}:${progress?.objectiveProgress[objective.id] ?? 0}/${objective.targetCount}`)
    .join("|");
}

export function getQuestStatus(state: GameState, quest: QuestDefinition): "completed" | "ready" | "active" | "available" | "locked" {
  if (state.quests.completedQuestIds.includes(quest.id)) {
    return "completed";
  }

  const progress = state.quests.activeQuests.find((entry) => entry.questId === quest.id);
  if (progress) {
    return progress.readyToComplete ? "ready" : "active";
  }

  return canAcceptQuest(state, quest) ? "available" : "locked";
}

export function getQuestLogSummary(state: GameState, quests: QuestDefinition[]): string {
  return quests
    .map((quest) => {
      const progress = state.quests.activeQuests.find((entry) => entry.questId === quest.id) ?? null;
      return `${quest.id}:${getQuestStatus(state, quest)}:${getQuestObjectiveProgress(quest, progress)}`;
    })
    .join(";");
}

function isQuestReadyToComplete(quest: QuestDefinition, progress: QuestProgressState): boolean {
  return quest.objectives.every((objective) => (progress.objectiveProgress[objective.id] ?? 0) >= objective.targetCount);
}

function matchesObjective(objective: QuestObjectiveDefinition, event: QuestEvent): boolean {
  if (objective.type !== event.type) {
    return false;
  }

  if (objective.type === "reachLevel") {
    return Number(event.targetId) >= Number(objective.targetId);
  }

  return objective.targetId === event.targetId;
}

function emitQuestChanged(state: GameState, questId: string, reason: "accepted" | "progress" | "completed"): void {
  eventBus.emit("questChanged", { quests: state.quests, questId, reason });
}
