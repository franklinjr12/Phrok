import { addInventoryItem } from "./inventory";
import { completeEarlyGameMilestone } from "./earlyGameProgression";
import { eventBus } from "./eventBus";
import type { DataRegistry } from "../data/dataRegistry";
import type { RewardChoiceDefinition, RewardChoiceOptionDefinition } from "../types/dataDefinitions";
import type { GameState } from "../types/gameState";

export function getRewardChoiceForSource(dataRegistry: DataRegistry, sourceId: string): RewardChoiceDefinition | null {
  return dataRegistry.getRewardChoices().find((choice) => choice.sourceId === sourceId) ?? null;
}

export function getRewardChoiceOptions(
  choice: RewardChoiceDefinition,
  classId: string,
): RewardChoiceOptionDefinition[] {
  return choice.classOptions[classId] ?? choice.classOptions.any ?? [];
}

export function isRewardChoicePending(state: GameState, choiceId: string): boolean {
  return state.worldFlags[pendingFlag(choiceId)] === true && state.worldFlags[claimedFlag(choiceId)] !== true;
}

export function queueRewardChoice(state: GameState, choice: RewardChoiceDefinition): boolean {
  if (choice.once && state.worldFlags[claimedFlag(choice.id)] === true) {
    return false;
  }
  state.worldFlags[pendingFlag(choice.id)] = true;
  eventBus.emit("rewardChoiceOpened", { choiceId: choice.id, sourceId: choice.sourceId });
  return true;
}

export function claimRewardChoice(
  state: GameState,
  dataRegistry: DataRegistry,
  choice: RewardChoiceDefinition,
  optionId: string,
): RewardChoiceOptionDefinition | null {
  const option = getRewardChoiceOptions(choice, state.character.archetype).find((entry) => entry.id === optionId);
  if (!option || (choice.once && state.worldFlags[claimedFlag(choice.id)] === true)) {
    return null;
  }

  addInventoryItem(state.inventory, dataRegistry.getItem(option.itemId), 1, false);
  state.worldFlags[claimedFlag(choice.id)] = true;
  delete state.worldFlags[pendingFlag(choice.id)];
  eventBus.emit("rewardChoiceClaimed", { choiceId: choice.id, optionId: option.id, itemId: option.itemId });
  eventBus.emit("inventoryChanged", { inventory: state.inventory });
  completeEarlyGameMilestone(state);
  return option;
}

function pendingFlag(choiceId: string): string {
  return `reward-choice-pending:${choiceId}`;
}

function claimedFlag(choiceId: string): string {
  return `reward-choice-claimed:${choiceId}`;
}
