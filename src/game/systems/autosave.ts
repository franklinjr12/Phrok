import type { SaveData } from "../types/saveData";
import type { GameState } from "../types/gameState";

export const autosaveStorageKey = "prok-autosave";
export const autosaveSlot = 0;

export function createSaveData(gameState: GameState, savedAt = new Date().toISOString()): SaveData {
  return {
    version: 1,
    savedAt,
    gameState: structuredClone(gameState),
  };
}

export function writeAutosave(gameState: GameState, storage: Storage = window.localStorage): SaveData {
  const saveData = createSaveData(gameState);
  storage.setItem(autosaveStorageKey, JSON.stringify(saveData));

  return saveData;
}
