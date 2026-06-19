import type { CharacterData, EquipmentData, GameState, InventoryItem } from "./gameState";

export interface InventoryData {
  items: InventoryItem[];
}

export interface SaveData {
  version: number;
  savedAt: string;
  gameState: GameState;
}

export type { CharacterData, EquipmentData };

