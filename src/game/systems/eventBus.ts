import type { ActiveStatusEffect, BaseStatKey, DerivedStats, HotbarSlotState, HuntingBoardState, InventoryState, StorageState } from "../types/gameState";
import type { ConsumableUseResult } from "./consumables";

export interface GameEventMap {
  playerHealthChanged: { hp: number; maxHp: number };
  playerSpChanged: { sp: number; maxSp: number };
  xpGained: { amount: number; totalXp: number; nextLevelXp: number | null };
  levelUp: {
    level: number;
    statPoints: number;
    skillPoints: number;
    hp: number;
    maxHp: number;
    sp: number;
    maxSp: number;
  };
  advancedClassUnlocked: { level: number };
  inventoryChanged: { inventory: InventoryState };
  equipmentChanged: { slot: string; itemId: string | null };
  statsChanged: { stat?: BaseStatKey; derivedStats: DerivedStats; statPoints: number };
  statResetRequested: { cost: number };
  statResetCompleted: { cost: number; refundedPoints: number; gold: number };
  statResetFailed: { reason: "insufficient-gold" | "no-allocated-stats"; cost: number; gold: number };
  skillUsed: { skillId: string; actorId: string };
  skillPointsChanged: { skillId: string; skillLevel: number; skillPoints: number };
  consumableUsed: ConsumableUseResult;
  autoPotionSettingsChanged: { hpThresholdPercent: number; spThresholdPercent: number };
  hotbarChanged: { hotbar: HotbarSlotState[] };
  hotbarUsed: { slot: number; type: "skill" | "item"; id: string; success: boolean };
  hotbarActionRequested: { slot: number };
  advancedClassChosen: { id: string; name: string };
  statusEffectsChanged: {
    targetKind: "player" | "enemy";
    targetId: string;
    statuses: ActiveStatusEffect[];
  };
  enemyKilled: { enemyId: string };
  bestiaryMilestoneUnlocked: { monsterId: string; milestone: number; family: string };
  enemyHealthChanged: { enemyId: string; name: string; hp: number; maxHp: number; boss?: boolean; phase?: number };
  enemyTargetChanged: { enemyId: string | null; name: string; hp: number; maxHp: number; boss?: boolean; phase?: number };
  lootDropped: { kind: "item" | "gold"; itemId?: string; quantity: number };
  lootPickedUp: { kind: "item" | "gold"; itemId?: string; quantity: number };
  mapChanged: { mapId: string; musicKey: string };
  saveCompleted: { saveSlot: number };
  dialogueOpened: { dialogueId: string };
  dialogueClosed: { dialogueId: string };
  craftingOpened: { npcId?: string };
  recipeUnlocked: { recipeId: string; recipeName: string };
  craftingChanged: { unlockedRecipeIds: string[] };
  huntingBoardChanged: { huntingBoard: HuntingBoardState };
  refinementOpened: { npcId: string };
  refinementAttempted: { itemId: string; success: boolean; previousLevel: number; nextLevel: number; consumedGold: number };
  shopOpened: { shopId: string; npcId: string };
  storageOpened: { npcId: string };
  storageChanged: { storage: StorageState };
  supportChanged: { supportId: string | null; level: number; affinity: number; actionId: string | null };
}

type GameEventName = keyof GameEventMap;
type GameEventHandler<EventName extends GameEventName> = (payload: GameEventMap[EventName]) => void;

class EventBus {
  private listeners = new Map<GameEventName, Set<GameEventHandler<GameEventName>>>();

  on<EventName extends GameEventName>(eventName: EventName, handler: GameEventHandler<EventName>): () => void {
    const listeners = this.listeners.get(eventName) ?? new Set<GameEventHandler<GameEventName>>();
    listeners.add(handler as GameEventHandler<GameEventName>);
    this.listeners.set(eventName, listeners);

    return () => {
      this.off(eventName, handler);
    };
  }

  off<EventName extends GameEventName>(eventName: EventName, handler: GameEventHandler<EventName>): void {
    this.listeners.get(eventName)?.delete(handler as GameEventHandler<GameEventName>);
  }

  emit<EventName extends GameEventName>(eventName: EventName, payload: GameEventMap[EventName]): void {
    for (const handler of this.listeners.get(eventName) ?? []) {
      handler(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
