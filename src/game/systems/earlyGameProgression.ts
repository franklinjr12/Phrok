import { eventBus } from "./eventBus";
import type { GameState } from "../types/gameState";

export const earlyGameMilestoneLevel = 20;
export const earlyGameMilestoneFlag = "early-game-milestone";
export const earlyGameThornPriestId = "thorn-priest";

export function shouldTriggerEarlyGameMilestone(state: GameState): boolean {
  return state.worldFlags[earlyGameMilestoneFlag] !== true
    && state.bossEncounters.defeatedBossIds.includes(earlyGameThornPriestId)
    && state.playerProfile.level >= earlyGameMilestoneLevel - 2;
}

export function completeEarlyGameMilestone(state: GameState): boolean {
  if (!shouldTriggerEarlyGameMilestone(state)) {
    return false;
  }

  state.worldFlags[earlyGameMilestoneFlag] = true;
  eventBus.emit("earlyGameMilestone", {
    level: state.playerProfile.level,
    defeatedBossIds: [...state.bossEncounters.defeatedBossIds],
  });
  return true;
}

export function getEarlyGameMilestoneLines(): string[] {
  return [
    "Crownfield survived.",
    "Mossvale opened.",
    "Old Sewers conquered.",
    "Green Chapel conquered.",
    "Your build is only beginning.",
  ];
}
