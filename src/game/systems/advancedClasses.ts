import type { ClassDefinition } from "../types/dataDefinitions";
import type { GameState } from "../types/gameState";

export const advancedClassUnlockLevel = 40;

export type AdvancedClassChoiceResult =
  | { success: true; id: string; name: string }
  | { success: false; reason: "level-too-low" | "already-chosen" | "invalid-choice" };

export function isAdvancedClassEligible(state: GameState): boolean {
  return state.playerProfile.level >= advancedClassUnlockLevel;
}

export function isAdvancedClassServiceAvailable(state: GameState): boolean {
  return isAdvancedClassEligible(state) && !state.character.advancedClass;
}

export function chooseAdvancedClass(
  state: GameState,
  baseClass: ClassDefinition,
  specializationName: string,
): AdvancedClassChoiceResult {
  if (!isAdvancedClassEligible(state)) {
    return { success: false, reason: "level-too-low" };
  }

  if (state.character.advancedClass) {
    return { success: false, reason: "already-chosen" };
  }

  const selectedName = baseClass.advancedClassOptions.find((option) => option === specializationName);

  if (!selectedName) {
    return { success: false, reason: "invalid-choice" };
  }

  const id = toAdvancedClassId(selectedName);
  state.character.advancedClass = {
    id,
    name: selectedName,
    baseClassId: baseClass.id,
    unlockedAtLevel: state.playerProfile.level,
  };
  state.worldFlags[`advanced-class:${id}`] = true;
  state.worldFlags["advanced-skill-tree-unlocked"] = true;

  return { success: true, id, name: selectedName };
}

export function getUnlockedSkillTreeIds(state: GameState): string[] {
  return [
    state.character.archetype,
    state.character.advancedClass?.id ?? "",
  ].filter((id) => id.length > 0);
}

export function toAdvancedClassId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
