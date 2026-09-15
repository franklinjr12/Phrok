import type { GameState } from "../types/gameState";

export type ContextualHintId = "move" | "attack" | "skill" | "loot" | "points" | "sewer-prep";

export interface ContextualHint {
  id: ContextualHintId;
  message: string;
}

const hints: ContextualHint[] = [
  { id: "move", message: "Click the ground to move." },
  { id: "attack", message: "Click an enemy to attack." },
  { id: "skill", message: "Press 1 to use your class skill." },
  { id: "loot", message: "Click dropped items to pick them up." },
  { id: "points", message: "Open Character (C) to spend stat points." },
  { id: "sewer-prep", message: "Crownfield can craft, refine, heal, and store gear before you return." },
];

export function getContextualHint(id: ContextualHintId): ContextualHint | null {
  return hints.find((hint) => hint.id === id) ?? null;
}

export function isHintDismissed(state: GameState, id: ContextualHintId): boolean {
  return state.worldFlags[hintFlag(id)] === true;
}

export function dismissHint(state: GameState, id: ContextualHintId): boolean {
  if (isHintDismissed(state, id)) {
    return false;
  }
  state.worldFlags[hintFlag(id)] = true;
  return true;
}

export function getActiveHint(state: GameState, demonstrated: Partial<Record<ContextualHintId, boolean>>): ContextualHint | null {
  return hints.find((hint) => {
    if (isHintDismissed(state, hint.id) || demonstrated[hint.id]) {
      return false;
    }
    if (hint.id === "sewer-prep" && state.worldFlags["hint-ready:sewer-prep"] !== true) {
      return false;
    }
    return true;
  }) ?? null;
}

function hintFlag(id: ContextualHintId): string {
  return `hint-dismissed:${id}`;
}
