import type { InventoryState } from "../types/gameState";

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
  inventoryChanged: { inventory: InventoryState };
  equipmentChanged: { slot: string; itemId: string | null };
  skillUsed: { skillId: string; actorId: string };
  enemyKilled: { enemyId: string };
  enemyHealthChanged: { enemyId: string; name: string; hp: number; maxHp: number };
  enemyTargetChanged: { enemyId: string | null; name: string; hp: number; maxHp: number };
  lootDropped: { kind: "item" | "gold"; itemId?: string; quantity: number };
  lootPickedUp: { kind: "item" | "gold"; itemId?: string; quantity: number };
  mapChanged: { mapId: string };
  saveCompleted: { saveSlot: number };
  dialogueOpened: { dialogueId: string };
  dialogueClosed: { dialogueId: string };
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
