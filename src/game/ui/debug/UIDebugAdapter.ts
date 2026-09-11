export type DebugValue = string | number | boolean | null | undefined;

/** Keeps current canvas dataset contracts stable while UI ownership moves into runtime modules. */
export class UIDebugAdapter {
  constructor(private readonly canvas: HTMLCanvasElement) {}

  set(key: string, value: DebugValue): void {
    this.canvas.dataset[key] = value === null || value === undefined ? "" : String(value);
  }

  setActivePanel(panelId: string | null): void {
    this.set("uiPanel", panelId ?? "closed");
  }

  setGameplayInputBlocked(blocked: boolean): void {
    this.set("gameplayInputBlocked", blocked);
  }

  setInventorySnapshot(itemId: string, itemName: string, stackCount: number, equipmentInstanceCount: number, gold: number): void {
    this.set("inventoryItem", itemId);
    this.set("inventoryItemName", itemName);
    this.set("inventoryStackCount", stackCount);
    this.set("equipmentInstanceCount", equipmentInstanceCount);
    this.set("inventoryGold", gold);
    this.set("playerGold", gold);
  }

  setSelectedInventorySnapshot(snapshot: {
    itemId?: string;
    itemName?: string;
    refineLevel?: number | string;
    quantity?: number | string;
    rarity?: string;
    description?: string;
    source?: string;
  }): void {
    this.set("selectedInventoryItem", snapshot.itemId);
    this.set("selectedInventoryItemName", snapshot.itemName);
    this.set("selectedInventoryItemRefineLevel", snapshot.refineLevel);
    this.set("selectedInventoryItemQuantity", snapshot.quantity);
    this.set("selectedInventoryItemRarity", snapshot.rarity);
    this.set("selectedInventoryItemDescription", snapshot.description);
    this.set("selectedInventoryItemSource", snapshot.source);
  }
}
