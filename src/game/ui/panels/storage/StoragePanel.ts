import Phaser from "phaser";
import { getItemRarity } from "../../../systems/equipment";
import { getVisibleItemName } from "../../../systems/market";
import { depositStorageItem, getContainerEntries, getFilteredStorageEntries, withdrawStorageItem, type StorageCategoryFilter, type StorageClassFilter, type StorageLevelFilter, type StorageListEntry, type StorageListOptions, type StorageSortDirection, type StorageSortMode } from "../../../systems/storage";
import type { DataRegistry } from "../../../data/dataRegistry";
import type { ItemDefinition, ItemRarity } from "../../../types/dataDefinitions";
import type { GameState } from "../../../types/gameState";
import { uiTheme } from "../../uiTheme";
import type { PanelContext, UIPanel } from "../../panels/panelTypes";
import { addPanelButton as addPanelButtonPrimitive, addPanelRectangle as addPanelRectanglePrimitive, addPanelText as addPanelTextPrimitive } from "../../panels/panelPrimitives";
const { panelDepth, hudDepth, panelFill, panelStroke } = uiTheme;
export class StoragePanel implements UIPanel {
 readonly id = "storage" as const;
 constructor(private readonly context: PanelContext) {}
 open(payload?: unknown): void { const values = (payload ?? {}) as Record<string, unknown>; if (typeof values.selectedStorageInventoryIndex === "number") this.selectedStorageInventoryIndex = values.selectedStorageInventoryIndex as number; if (typeof values.selectedStorageIndex === "number") this.selectedStorageIndex = values.selectedStorageIndex as number; if (typeof values.storageInventoryPage === "number") this.storageInventoryPage = values.storageInventoryPage as number; if (typeof values.storagePage === "number") this.storagePage = values.storagePage as number; if (typeof values.activeStorageNpcId === "string") this.activeStorageNpcId = values.activeStorageNpcId as string; }
 render(): void { this.renderStoragePanel(this.context.state, this.context.data); }
 destroy(): void {}
 handleKey(event: KeyboardEvent): boolean { return this.handleStorageSearchKey(event); }
private renderStoragePanel(state: GameState, dataRegistry: DataRegistry): void {
    const entries = this.getFilteredStoragePanelEntries(state, dataRegistry);
    const inventoryEntries = entries.inventoryEntries;
    const storageEntries = entries.storageEntries;
    const selectedInventory = inventoryEntries[this.clampStorageInventoryIndex(inventoryEntries)] ?? null;
    const selectedStorage = storageEntries[this.clampStorageIndex(storageEntries)] ?? null;
    const selectedInventoryItem = selectedInventory ? dataRegistry.getItem(selectedInventory.itemId) : null;
    const selectedStorageItem = selectedStorage ? dataRegistry.getItem(selectedStorage.itemId) : null;
    const inventoryRows = this.getPagedStorageRows(inventoryEntries, this.storageInventoryPage);
    const storageRows = this.getPagedStorageRows(storageEntries, this.storagePage);

    this.addPanelRectangle(44, 48, 712, 506, panelFill, 0.96)
      .setOrigin(0)
      .setStrokeStyle(2, panelStroke, 0.92);
    this.addPanelText(72, 72, "Storage", 24, uiTheme.text.primary);
    this.addPanelText(72, 106, `Gold ${state.inventory.gold}   Search ${this.storageSearchText || "*"}`, 14, uiTheme.text.accent);

    this.addPanelButton(72, 132, 104, 30, `Type ${this.storageCategoryFilter}`, () => this.cycleStorageCategoryFilter());
    this.addPanelButton(184, 132, 112, 30, `Rarity ${this.storageRarityFilter}`, () => this.cycleStorageRarityFilter());
    this.addPanelButton(304, 132, 104, 30, `Class ${this.storageClassFilter}`, () => this.cycleStorageClassFilter());
    this.addPanelButton(416, 132, 104, 30, `Level ${this.storageLevelFilter}`, () => this.cycleStorageLevelFilter());
    this.addPanelButton(528, 132, 104, 30, `Sort ${this.storageSortMode}`, () => this.cycleStorageSortMode());
    this.addPanelButton(640, 132, 76, 30, "Clear", () => this.clearStorageSearch());

    this.addPanelText(72, 178, `Inventory ${inventoryEntries.length}`, 14, uiTheme.text.muted);
    this.addPanelText(416, 178, `Stored ${storageEntries.length}`, 14, uiTheme.text.muted);
    this.renderStorageEntryRows(72, 204, inventoryRows, this.storageInventoryPage, this.selectedStorageInventoryIndex, state, dataRegistry, (index) => {
      this.selectedStorageInventoryIndex = index;
      this.context.rerender();
    });
    this.renderStorageEntryRows(416, 204, storageRows, this.storagePage, this.selectedStorageIndex, state, dataRegistry, (index) => {
      this.selectedStorageIndex = index;
      this.context.rerender();
    });

    this.addPanelButton(72, 450, 68, 30, "Prev", () => this.changeStorageInventoryPage(-1, inventoryEntries.length));
    this.addPanelButton(148, 450, 68, 30, "Next", () => this.changeStorageInventoryPage(1, inventoryEntries.length));
    this.addPanelButton(260, 450, 86, 34, "Deposit", () => this.depositSelectedStorageItem());
    this.addPanelButton(416, 450, 68, 30, "Prev", () => this.changeStoragePage(-1, storageEntries.length));
    this.addPanelButton(492, 450, 68, 30, "Next", () => this.changeStoragePage(1, storageEntries.length));
    this.addPanelButton(604, 450, 92, 34, "Withdraw", () => this.withdrawSelectedStorageItem());
    this.addPanelButton(604, 502, 92, 28, "Close", () => this.context.closePanel());

    this.renderStorageDetails(72, 492, "Inventory", selectedInventoryItem, selectedInventory);
    this.renderStorageDetails(416, 492, "Stored", selectedStorageItem, selectedStorage);
    this.syncStorageDataset(state, dataRegistry, inventoryEntries, storageEntries, selectedInventoryItem, selectedStorageItem);
  }

private getFilteredStoragePanelEntries(
    state: GameState,
    dataRegistry: DataRegistry,
  ): { inventoryEntries: StorageListEntry[]; storageEntries: StorageListEntry[] } {
    const options = this.getStorageListOptions(state);
    const getItem = (id: string) => dataRegistry.getItem(id);

    return {
      inventoryEntries: getFilteredStorageEntries(
        getContainerEntries(state.inventory.items, state.inventory.equipmentInstances),
        options,
        getItem,
      ),
      storageEntries: getFilteredStorageEntries(
        getContainerEntries(state.storage.items, state.storage.equipmentInstances),
        options,
        getItem,
      ),
    };
  }

private getStorageListOptions(state: GameState): StorageListOptions {
    return {
      category: this.storageCategoryFilter,
      rarity: this.storageRarityFilter,
      classFilter: this.storageClassFilter,
      levelFilter: this.storageLevelFilter,
      classId: state.character.archetype,
      playerLevel: state.playerProfile.level,
      nameSearch: this.storageSearchText,
      sortMode: this.storageSortMode,
      sortDirection: this.storageSortDirection,
    };
  }

private storageCategoryFilter: StorageCategoryFilter = "all";

private storageRarityFilter: ItemRarity | "all" = "all";

private storageClassFilter: StorageClassFilter = "all";

private storageLevelFilter: StorageLevelFilter = "all";

private storageSearchText = "";

private storageSortMode: StorageSortMode = "name";

private storageSortDirection: StorageSortDirection = "asc";

private clampStorageInventoryIndex(entries: StorageListEntry[]): number {
    this.selectedStorageInventoryIndex = Phaser.Math.Clamp(
      this.selectedStorageInventoryIndex,
      0,
      Math.max(0, entries.length - 1),
    );
    return this.selectedStorageInventoryIndex;
  }

private selectedStorageInventoryIndex = 0;

private clampStorageIndex(entries: StorageListEntry[]): number {
    this.selectedStorageIndex = Phaser.Math.Clamp(
      this.selectedStorageIndex,
      0,
      Math.max(0, entries.length - 1),
    );
    return this.selectedStorageIndex;
  }

private selectedStorageIndex = 0;

private getPagedStorageRows(
    entries: StorageListEntry[],
    page: number,
  ): Array<{ entry: StorageListEntry; index: number }> {
    const pageSize = this.getStoragePageSize();
    const safePage = this.clampStoragePage(page, entries.length);

    return entries
      .slice(safePage * pageSize, safePage * pageSize + pageSize)
      .map((entry, index) => ({
        entry,
        index: safePage * pageSize + index,
      }));
  }

private getStoragePageSize(): number {
    return 6;
  }

private clampStoragePage(page: number, entryCount: number): number {
    const maxPage = Math.max(0, Math.ceil(entryCount / this.getStoragePageSize()) - 1);
    return Phaser.Math.Clamp(page, 0, maxPage);
  }

private storageInventoryPage = 0;

private storagePage = 0;

private addPanelRectangle(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    alpha: number,
  ): Phaser.GameObjects.Rectangle {
    return addPanelRectanglePrimitive(this.context, x, y, width, height, color, alpha);
  }

private addPanelText(x: number, y: number, text: string, fontSize: number, color: string, wrapWidth?: number): Phaser.GameObjects.Text {
    return addPanelTextPrimitive(this.context, x, y, text, fontSize, color, wrapWidth);
  }

private addPanelButton(x: number, y: number, width: number, height: number, label: string, callback: () => void): void {
    addPanelButtonPrimitive(this.context, x, y, width, height, label, callback);
  }

private cycleStorageCategoryFilter(): void {
    const filters: StorageCategoryFilter[] = ["all", "equipment", "consumable", "material"];
    this.storageCategoryFilter = this.getNextValue(filters, this.storageCategoryFilter);
    this.resetStorageSelections();
    this.context.rerender();
  }

private getNextValue<T>(values: T[], current: T): T {
    const index = values.indexOf(current);
    return values[(index + 1) % values.length];
  }

private resetStorageSelections(): void {
    this.selectedStorageInventoryIndex = 0;
    this.selectedStorageIndex = 0;
    this.storageInventoryPage = 0;
    this.storagePage = 0;
  }

private cycleStorageRarityFilter(): void {
    const filters: Array<ItemRarity | "all"> = ["all", "Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"];
    this.storageRarityFilter = this.getNextValue(filters, this.storageRarityFilter);
    this.resetStorageSelections();
    this.context.rerender();
  }

private cycleStorageClassFilter(): void {
    const filters: StorageClassFilter[] = ["all", "current"];
    this.storageClassFilter = this.getNextValue(filters, this.storageClassFilter);
    this.resetStorageSelections();
    this.context.rerender();
  }

private cycleStorageLevelFilter(): void {
    const filters: StorageLevelFilter[] = ["all", "usable"];
    this.storageLevelFilter = this.getNextValue(filters, this.storageLevelFilter);
    this.resetStorageSelections();
    this.context.rerender();
  }

private cycleStorageSortMode(): void {
    const modes: StorageSortMode[] = ["name", "level", "rarity", "quantity"];
    if (this.storageSortMode === "quantity" && this.storageSortDirection === "asc") {
      this.storageSortDirection = "desc";
    } else if (this.storageSortMode === "quantity") {
      this.storageSortMode = "name";
      this.storageSortDirection = "asc";
    } else {
      this.storageSortMode = this.getNextValue(modes, this.storageSortMode);
      this.storageSortDirection = "asc";
    }
    this.resetStorageSelections();
    this.context.rerender();
  }

private clearStorageSearch(): void {
    this.storageSearchText = "";
    this.storageCategoryFilter = "all";
    this.storageRarityFilter = "all";
    this.storageClassFilter = "all";
    this.storageLevelFilter = "all";
    this.resetStorageSelections();
    this.context.rerender();
  }

private renderStorageEntryRows(
    x: number,
    y: number,
    rows: Array<{ entry: StorageListEntry; index: number }>,
    page: number,
    selectedIndex: number,
    state: GameState,
    dataRegistry: DataRegistry,
    select: (index: number) => void,
  ): void {
    rows.forEach(({ entry, index }, rowIndex) => {
      const item = dataRegistry.getItem(entry.itemId);
      const rowY = y + rowIndex * 36;
      const selected = index === selectedIndex;
      const row = this.addPanelRectangle(x, rowY - 5, 300, 30, selected ? uiTheme.colors.selected : uiTheme.colors.inset, 0.94)
        .setOrigin(0)
        .setStrokeStyle(1, selected ? uiTheme.colors.accent : uiTheme.colors.border, 0.9)
        .setInteractive({ useHandCursor: true });
      row.on("pointerdown", () => select(index));
      row.on("pointerover", () => this.context.showComparison(item));
      this.addPanelRectangle(x + 10, rowY + 2, 16, 16, this.getItemIconColor(item), 0.94)
        .setOrigin(0)
        .setStrokeStyle(1, 0xf8fafc, 0.58);
      this.addPanelText(x + 34, rowY, this.truncateText(getVisibleItemName(state.inventory, item), 22), 13, uiTheme.text.primary);
      this.addPanelText(x + 214, rowY, `x${entry.quantity}`, 12, uiTheme.text.secondary);
      this.addPanelText(x + 250, rowY, getItemRarity(item), 12, this.getRarityColor(item));
    });

    if (rows.length === 0) {
      this.addPanelText(x + 10, y + 34, page > 0 ? "No entries on page" : "No items", 13, "#64748b");
    }
  }

private getItemIconColor(item: ItemDefinition): number {
    if (item.type === "weapon") {
      return 0xb45309;
    }

    if (item.type === "armor") {
      return uiTheme.colors.border;
    }

    if (item.type === "accessory") {
      return 0xa16207;
    }

    if (item.type === "sigil") {
      return 0x7c3aed;
    }

    if (item.type === "support") {
      return 0x0891b2;
    }

    if (item.type === "consumable") {
      return 0xdc2626;
    }

    return 0x0f766e;
  }

private truncateText(text: string, maxLength: number): string {
    return text.length <= maxLength ? text : `${text.slice(0, Math.max(0, maxLength - 1))}.`;
  }

private getRarityColor(item: ItemDefinition): string {
    const rarity = getItemRarity(item);

    const colors = {
      Common: uiTheme.text.secondary,
      Uncommon: uiTheme.text.positive,
      Rare: uiTheme.text.info,
      Epic: "#c4b5fd",
      Legendary: uiTheme.text.accent,
      Mythic: "#f9a8d4",
    };

    return colors[rarity];
  }

private changeStorageInventoryPage(delta: number, entryCount: number): void {
    this.storageInventoryPage = this.clampStoragePage(this.storageInventoryPage + delta, entryCount);
    this.selectedStorageInventoryIndex = Math.min(this.selectedStorageInventoryIndex, Math.max(0, entryCount - 1));
    this.context.rerender();
  }

private depositSelectedStorageItem(): void {
    if (!this.context.state || !this.context.data) {
      return;
    }

    const { inventoryEntries } = this.getFilteredStoragePanelEntries(this.context.state, this.context.data);
    const entry = inventoryEntries[this.clampStorageInventoryIndex(inventoryEntries)];
    const item = entry ? this.context.data.getItem(entry.itemId) : undefined;
    const result = depositStorageItem(this.context.state, item, 1);

    this.context.debug?.set("lastStorageAction", result.success
? `deposit:${result.itemId}:${result.quantity}:${result.storageQuantity}:${result.gold}`
: `deposit-failed:${result.reason}:${result.itemId}:${result.gold}`);
    this.context.rerender();
  }

private changeStoragePage(delta: number, entryCount: number): void {
    this.storagePage = this.clampStoragePage(this.storagePage + delta, entryCount);
    this.selectedStorageIndex = Math.min(this.selectedStorageIndex, Math.max(0, entryCount - 1));
    this.context.rerender();
  }

private withdrawSelectedStorageItem(): void {
    if (!this.context.state || !this.context.data) {
      return;
    }

    const { storageEntries } = this.getFilteredStoragePanelEntries(this.context.state, this.context.data);
    const entry = storageEntries[this.clampStorageIndex(storageEntries)];
    const item = entry ? this.context.data.getItem(entry.itemId) : undefined;
    const result = withdrawStorageItem(this.context.state, item, 1);

    this.context.debug?.set("lastStorageAction", result.success
? `withdraw:${result.itemId}:${result.quantity}:${result.inventoryQuantity}:${result.gold}`
: `withdraw-failed:${result.reason}:${result.itemId}:${result.gold}`);
    this.context.rerender();
  }

private renderStorageDetails(
    x: number,
    y: number,
    label: string,
    item: ItemDefinition | null,
    entry: StorageListEntry | null,
  ): void {
    const text = item && entry
      ? `${label}: ${this.truncateText(item.name, 19)} x${entry.quantity}`
      : `${label}: Empty`;

    this.addPanelText(x, y, text, 12, item ? uiTheme.text.secondary : "#64748b");
  }

private syncStorageDataset(
    state: GameState,
    dataRegistry: DataRegistry,
    inventoryEntries: StorageListEntry[],
    storageEntries: StorageListEntry[],
    selectedInventoryItem: ItemDefinition | null,
    selectedStorageItem: ItemDefinition | null,
  ): void {
    this.context.debug?.set("shopPanel", "hidden");
    this.context.debug?.set("appraiserPanel", "hidden");
    this.context.debug?.set("storagePanel", "visible");
    this.context.debug?.set("activeStorageNpc", this.activeStorageNpcId);
    this.context.debug?.set("storageFilterCategory", this.storageCategoryFilter);
    this.context.debug?.set("storageFilterRarity", this.storageRarityFilter);
    this.context.debug?.set("storageFilterClass", this.storageClassFilter);
    this.context.debug?.set("storageFilterLevel", this.storageLevelFilter);
    this.context.debug?.set("storageSearch", this.storageSearchText);
    this.context.debug?.set("storageSort", `${this.storageSortMode}:${this.storageSortDirection}`);
    this.context.debug?.set("storageInventoryItemCount", String(inventoryEntries.length));
    this.context.debug?.set("storageItemCount", String(storageEntries.length));
    this.context.debug?.set("storageStackCount", String(state.storage.items.length));
    this.context.debug?.set("storageEquipmentInstanceCount", String(state.storage.equipmentInstances.length));
    this.context.debug?.set("storageVisibleInventoryItems", inventoryEntries.map((entry) => entry.itemId).join("|"));
    this.context.debug?.set("storageVisibleItems", storageEntries.map((entry) => entry.itemId).join("|"));
    this.context.debug?.set("storageInventoryPage", String(this.storageInventoryPage));
    this.context.debug?.set("storagePage", String(this.storagePage));
    this.context.debug?.set("selectedStorageInventoryItem", selectedInventoryItem?.id ?? "");
    this.context.debug?.set("selectedStorageInventoryItemName", selectedInventoryItem ? getVisibleItemName(state.inventory, selectedInventoryItem) : "");
    this.context.debug?.set("selectedStorageItem", selectedStorageItem?.id ?? "");
    this.context.debug?.set("selectedStorageItemName", selectedStorageItem ? getVisibleItemName(state.inventory, selectedStorageItem) : "");
    this.context.debug?.set("storageButtons", "Deposit|Withdraw|Close");
    this.context.debug?.set("inventoryGold", String(state.inventory.gold));
    this.context.debug?.set("playerGold", String(state.inventory.gold));
    this.context.debug?.set("storageClassFilteredItems", inventoryEntries
      .concat(storageEntries)
      .filter((entry) => {
        const item = dataRegistry.getItem(entry.itemId);
        return (item.allowedClassIds ?? []).includes(state.character.archetype);
      })
      .map((entry) => entry.itemId)
      .join("|"));
  }

private activeStorageNpcId = "";

private handleStorageSearchKey(event: KeyboardEvent): boolean {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return false;
    }

    if (event.key === "Backspace") {
      this.storageSearchText = this.storageSearchText.slice(0, -1);
    } else if (event.key === "Delete") {
      this.storageSearchText = "";
    } else if (event.key.length === 1) {
      this.storageSearchText = `${this.storageSearchText}${event.key}`.slice(0, 24);
    } else {
      return false;
    }

    event.preventDefault();
    this.resetStorageSelections();
    this.context.debug?.set("storageSearch", this.storageSearchText);
    this.context.rerender();
    return true;
  }
}
