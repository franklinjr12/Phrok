import Phaser from "phaser";
import { RegistryKeys } from "../constants/registryKeys";
import {
  compareEquipmentItems,
  equipItem,
  equipmentSlotLabels,
  equipmentSlots,
  getEquipmentStats,
  getItemEquipmentSlot,
  getItemRarity,
  removeEquipment,
} from "../systems/equipment";
import { eventBus } from "../systems/eventBus";
import { removeInventoryItem } from "../systems/inventory";
import type { DataRegistry } from "../data/dataRegistry";
import type { ItemDefinition } from "../types/dataDefinitions";
import type { EquipmentInstance, EquipmentSlot, GameState, InventoryItem } from "../types/gameState";

type PanelMode = "inventory" | "equipment";
type InventoryPanelEntry = {
  itemId: string;
  quantity: number;
  source: "stack" | "equipment";
};

const panelDepth = 130;
const hudDepth = 100;
const panelFill = 0x101820;
const panelStroke = 0xd6b45f;

export class UIScene extends Phaser.Scene {
  private state?: GameState;
  private dataRegistry?: DataRegistry;
  private unsubscribeHealth?: () => void;
  private unsubscribeSp?: () => void;
  private unsubscribeXp?: () => void;
  private unsubscribeLevelUp?: () => void;
  private unsubscribeInventory?: () => void;
  private unsubscribeEquipment?: () => void;
  private unsubscribeLootDropped?: () => void;
  private unsubscribeLootPickedUp?: () => void;
  private unsubscribeEnemyHealth?: () => void;
  private unsubscribeEnemyTarget?: () => void;
  private unsubscribeMapChanged?: () => void;
  private unsubscribeSaveCompleted?: () => void;
  private hpText?: Phaser.GameObjects.Text;
  private spText?: Phaser.GameObjects.Text;
  private levelText?: Phaser.GameObjects.Text;
  private goldText?: Phaser.GameObjects.Text;
  private weightText?: Phaser.GameObjects.Text;
  private xpText?: Phaser.GameObjects.Text;
  private attackText?: Phaser.GameObjects.Text;
  private xpBarFill?: Phaser.GameObjects.Rectangle;
  private targetFrame?: Phaser.GameObjects.Rectangle;
  private targetNameText?: Phaser.GameObjects.Text;
  private targetHpText?: Phaser.GameObjects.Text;
  private mapNameText?: Phaser.GameObjects.Text;
  private activePanel: PanelMode | null = null;
  private selectedInventoryIndex = 0;
  private selectedEquipmentSlot: EquipmentSlot = "weapon";
  private panelObjects: Phaser.GameObjects.GameObject[] = [];
  private comparisonObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super("UIScene");
  }

  create(): void {
    const state = this.registry.get(RegistryKeys.GameState) as GameState;
    const dataRegistry = this.registry.get(RegistryKeys.DataRegistry) as DataRegistry;
    this.state = state;
    this.dataRegistry = dataRegistry;

    this.game.canvas.dataset.uiScene = "running";
    this.game.canvas.dataset.uiPanel = "closed";
    this.game.canvas.dataset.gameplayInputBlocked = "false";
    this.syncPlayerStats(state, dataRegistry);
    this.createHud(state, dataRegistry);
    this.createMapLabel(dataRegistry.getMap(state.currentMapId).name);
    this.syncXpBar(state, dataRegistry);
    this.createTargetFrame();
    this.registerKeyboard();
    this.registerEvents(state, dataRegistry);
  }

  private registerKeyboard(): void {
    this.input.keyboard?.on("keydown-I", this.toggleInventoryPanel, this);
    this.input.keyboard?.on("keydown-C", this.toggleEquipmentPanel, this);
    this.input.keyboard?.on("keydown-P", this.toggleEquipmentPanel, this);
    this.input.keyboard?.on("keydown-ESC", this.closePanel, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown-I", this.toggleInventoryPanel, this);
      this.input.keyboard?.off("keydown-C", this.toggleEquipmentPanel, this);
      this.input.keyboard?.off("keydown-P", this.toggleEquipmentPanel, this);
      this.input.keyboard?.off("keydown-ESC", this.closePanel, this);
      this.unsubscribeHealth?.();
      this.unsubscribeSp?.();
      this.unsubscribeXp?.();
      this.unsubscribeLevelUp?.();
      this.unsubscribeInventory?.();
      this.unsubscribeEquipment?.();
      this.unsubscribeLootDropped?.();
      this.unsubscribeLootPickedUp?.();
      this.unsubscribeEnemyHealth?.();
      this.unsubscribeEnemyTarget?.();
      this.unsubscribeMapChanged?.();
      this.unsubscribeSaveCompleted?.();
    });
  }

  private registerEvents(state: GameState, dataRegistry: DataRegistry): void {
    this.unsubscribeHealth = eventBus.on("playerHealthChanged", ({ hp, maxHp }) => {
      this.game.canvas.dataset.playerHp = `${hp}/${maxHp}`;
      this.hpText?.setText(`HP ${hp}/${maxHp}`);
    });

    this.unsubscribeSp = eventBus.on("playerSpChanged", ({ sp, maxSp }) => {
      this.game.canvas.dataset.playerSp = `${sp}/${maxSp}`;
      this.spText?.setText(`SP ${sp}/${maxSp}`);
    });

    this.unsubscribeXp = eventBus.on("xpGained", ({ totalXp }) => {
      this.game.canvas.dataset.playerXp = String(totalXp);
      this.syncXpBar(state, dataRegistry);
    });

    this.unsubscribeLevelUp = eventBus.on("levelUp", ({ level, statPoints, skillPoints, hp, maxHp, sp, maxSp }) => {
      this.game.canvas.dataset.playerLevel = String(level);
      this.game.canvas.dataset.lastLevelUp = String(level);
      this.game.canvas.dataset.playerStatPoints = String(statPoints);
      this.game.canvas.dataset.playerSkillPoints = String(skillPoints);
      this.game.canvas.dataset.playerHp = `${hp}/${maxHp}`;
      this.game.canvas.dataset.playerSp = `${sp}/${maxSp}`;
      this.hpText?.setText(`HP ${hp}/${maxHp}`);
      this.spText?.setText(`SP ${sp}/${maxSp}`);
      this.levelText?.setText(`Lv ${level}`);
      this.syncXpBar(state, dataRegistry);
    });

    this.unsubscribeInventory = eventBus.on("inventoryChanged", ({ inventory }) => {
      const firstInventoryEntry = this.getInventoryPanelEntries(inventory.items, inventory.equipmentInstances)[0];
      const firstInventoryItem = firstInventoryEntry ? dataRegistry.getItem(firstInventoryEntry.itemId) : null;

      this.game.canvas.dataset.inventoryItem = firstInventoryItem?.id ?? "";
      this.game.canvas.dataset.inventoryItemName = firstInventoryItem?.name ?? "";
      this.game.canvas.dataset.inventoryStackCount = String(inventory.items.length);
      this.game.canvas.dataset.equipmentInstanceCount = String(inventory.equipmentInstances.length);
      this.game.canvas.dataset.inventoryGold = String(inventory.gold);
      this.game.canvas.dataset.playerGold = String(inventory.gold);
      this.goldText?.setText(`Gold ${inventory.gold}`);
      this.weightText?.setText(`Weight ${this.getInventoryWeight(state)}/60`);
      this.refreshOpenPanel();
    });

    this.unsubscribeEquipment = eventBus.on("equipmentChanged", () => {
      this.syncEquipmentDataset(state, dataRegistry);
      this.refreshAttackText(state, dataRegistry);
      this.refreshOpenPanel();
    });

    this.unsubscribeLootDropped = eventBus.on("lootDropped", ({ kind, itemId, quantity }) => {
      this.game.canvas.dataset.lastLootDrop = kind === "gold" ? `gold:${quantity}` : `${itemId}:${quantity}`;
    });

    this.unsubscribeLootPickedUp = eventBus.on("lootPickedUp", ({ kind, itemId, quantity }) => {
      this.game.canvas.dataset.lastLootPickup = kind === "gold" ? `gold:${quantity}` : `${itemId}:${quantity}`;
    });

    this.unsubscribeEnemyHealth = eventBus.on("enemyHealthChanged", ({ enemyId, name, hp, maxHp }) => {
      if (this.game.canvas.dataset.targetEnemyId === enemyId) {
        this.setTargetFrame(enemyId, name, hp, maxHp);
      }
    });

    this.unsubscribeEnemyTarget = eventBus.on("enemyTargetChanged", ({ enemyId, name, hp, maxHp }) => {
      if (!enemyId) {
        this.clearTargetFrame();
        return;
      }

      this.setTargetFrame(enemyId, name, hp, maxHp);
    });

    this.unsubscribeMapChanged = eventBus.on("mapChanged", ({ mapId }) => {
      const map = dataRegistry.getMap(mapId);
      this.mapNameText?.setText(map.name);
      this.game.canvas.dataset.currentMap = map.id;
      this.game.canvas.dataset.currentMapName = map.name;
    });

    this.unsubscribeSaveCompleted = eventBus.on("saveCompleted", ({ saveSlot }) => {
      this.game.canvas.dataset.lastAutosaveSlot = String(saveSlot);
    });
  }

  private createHud(state: GameState, dataRegistry: DataRegistry): void {
    this.add.rectangle(12, 12, 318, 118, 0x101820, 0.82)
      .setOrigin(0)
      .setStrokeStyle(1, 0xd6b45f, 0.65)
      .setScrollFactor(0)
      .setDepth(hudDepth);
    this.hpText = this.addHudText(24, 22, `HP ${state.character.stats.hp}/${state.character.stats.maxHp}`, "#fca5a5");
    this.spText = this.addHudText(24, 46, `SP ${state.character.stats.sp}/${state.character.stats.maxSp}`, "#93c5fd");
    this.levelText = this.addHudText(178, 22, `Lv ${state.playerProfile.level}`, "#f8fafc");
    this.goldText = this.addHudText(178, 46, `Gold ${state.inventory.gold}`, "#fde68a");
    this.weightText = this.addHudText(24, 92, `Weight ${this.getInventoryWeight(state)}/60`, "#cbd5e1");
    this.attackText = this.addHudText(178, 92, "", "#bbf7d0");
    this.addHudText(24, 70, "XP", "#f8fafc");
    this.add.rectangle(58, 80, 180, 8, 0x111827, 0.9)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(hudDepth);
    this.xpBarFill = this.add.rectangle(58, 80, 1, 6, 0xfacc15, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(hudDepth + 1);
    this.xpText = this.addHudText(246, 70, "", "#fde68a");
    this.createHotbar();
    this.refreshAttackText(state, dataRegistry);
    this.syncEquipmentDataset(state, dataRegistry);
    this.game.canvas.dataset.hudVisible = "true";
    this.game.canvas.dataset.hotbarVisible = "true";
    this.game.canvas.dataset.xpBar = "visible";
    this.game.canvas.dataset.xpBarWidth = "0";
    this.xpBarFill.displayWidth = state.playerProfile.xp > 0 ? 1 : 0;
  }

  private createHotbar(): void {
    const width = Number(this.scale.width || 800);
    const x = Math.max(210, width / 2 - 140);
    const y = Math.max(540, Number(this.scale.height || 600) - 58);

    for (let index = 0; index < 6; index += 1) {
      this.add.rectangle(x + index * 48, y, 38, 38, 0x17212b, 0.9)
        .setStrokeStyle(1, index === 0 ? 0xfacc15 : 0x64748b, 0.9)
        .setScrollFactor(0)
        .setDepth(hudDepth);
      this.add.text(x + index * 48 - 4, y - 8, String(index + 1), {
        color: "#f8fafc",
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
      })
        .setScrollFactor(0)
        .setDepth(hudDepth + 1);
    }

    this.game.canvas.dataset.hotbarSlots = "1|2|3|4|5|6";
  }

  private addHudText(x: number, y: number, text: string, color: string): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, {
      color,
      fontFamily: "Arial, sans-serif",
      fontSize: "15px",
    })
      .setScrollFactor(0)
      .setDepth(hudDepth + 1);
  }

  private toggleInventoryPanel(): void {
    if (this.activePanel === "inventory") {
      this.closePanel();
      return;
    }

    this.openPanel("inventory");
  }

  private toggleEquipmentPanel(): void {
    if (this.activePanel === "equipment") {
      this.closePanel();
      return;
    }

    this.openPanel("equipment");
  }

  private openPanel(mode: PanelMode): void {
    this.activePanel = mode;
    this.game.canvas.dataset.uiPanel = mode;
    this.game.canvas.dataset.gameplayInputBlocked = "true";
    this.renderPanel();
  }

  private closePanel(): void {
    this.activePanel = null;
    this.clearPanelObjects();
    this.game.canvas.dataset.uiPanel = "closed";
    this.game.canvas.dataset.gameplayInputBlocked = "false";
    this.game.canvas.dataset.itemComparison = "hidden";
  }

  private refreshOpenPanel(): void {
    if (this.activePanel) {
      this.renderPanel();
    }
  }

  private renderPanel(): void {
    this.clearPanelObjects();

    if (!this.state || !this.dataRegistry || !this.activePanel) {
      return;
    }

    if (this.activePanel === "inventory") {
      this.renderInventoryPanel(this.state, this.dataRegistry);
    } else {
      this.renderEquipmentPanel(this.state, this.dataRegistry);
    }
  }

  private renderInventoryPanel(state: GameState, dataRegistry: DataRegistry): void {
    this.addPanelRectangle(92, 72, 616, 442, panelFill, 0.94)
      .setOrigin(0)
      .setStrokeStyle(2, panelStroke, 0.92);
    this.addPanelText(118, 94, "Inventory", 24, "#f8fafc");
    this.addPanelText(118, 128, `Gold ${state.inventory.gold}   Weight ${this.getInventoryWeight(state)}/60`, 15, "#fde68a");
    this.addPanelText(118, 160, "Item", 13, "#94a3b8");
    this.addPanelText(372, 160, "Qty", 13, "#94a3b8");
    this.addPanelText(430, 160, "Rarity", 13, "#94a3b8");
    const inventoryEntries = this.getInventoryPanelEntries(state.inventory.items, state.inventory.equipmentInstances);
    this.game.canvas.dataset.inventoryPanel = "visible";
    this.game.canvas.dataset.inventoryItemCount = String(inventoryEntries.length);

    const selected = this.clampSelectedInventoryIndex(inventoryEntries);
    inventoryEntries.forEach((entry, index) => {
      const item = dataRegistry.getItem(entry.itemId);
      const y = 188 + index * 44;
      const row = this.addPanelRectangle(112, y - 8, 382, 34, index === selected ? 0x293548 : 0x18222c, 0.94)
        .setOrigin(0)
        .setStrokeStyle(1, index === selected ? 0xfacc15 : 0x334155, 0.9)
        .setInteractive({ useHandCursor: true });
      row.on("pointerdown", () => {
        this.selectedInventoryIndex = index;
        this.renderPanel();
      });
      row.on("pointerover", () => this.showComparison(item));
      this.addPanelRectangle(124, y, 18, 18, this.getItemIconColor(item), 0.94)
        .setOrigin(0)
        .setStrokeStyle(1, 0xf8fafc, 0.58);
      this.addPanelText(152, y - 2, item.name, 15, "#f8fafc");
      this.addPanelText(374, y - 2, String(entry.quantity), 15, "#f8fafc");
      this.addPanelText(430, y - 2, getItemRarity(item), 15, this.getRarityColor(item));
    });

    const selectedEntry = inventoryEntries[selected] ?? null;
    const selectedItem = selectedEntry ? dataRegistry.getItem(selectedEntry.itemId) : null;
    this.syncSelectedInventoryDataset(selectedItem, selectedEntry?.quantity ?? null, selectedEntry?.source ?? null);
    this.renderItemDetails(selectedItem, selectedEntry);
    this.renderInventoryButtons(selectedItem);
  }

  private renderItemDetails(item: ItemDefinition | null, entry: InventoryPanelEntry | null): void {
    this.addPanelRectangle(512, 158, 164, 252, 0x17212b, 0.95)
      .setOrigin(0)
      .setStrokeStyle(1, 0x475569, 0.86);
    this.addPanelRectangle(532, 184, 44, 44, item ? this.getItemIconColor(item) : 0x334155, 0.94)
      .setOrigin(0)
      .setStrokeStyle(1, 0xf8fafc, 0.64);

    if (!item || !entry) {
      this.addPanelText(532, 252, "No item selected", 16, "#94a3b8");
      return;
    }

    this.addPanelText(532, 246, item.name, 17, "#f8fafc");
    this.addPanelText(532, 276, entry.source === "equipment" ? "Quantity 1" : `Quantity ${entry.quantity}`, 14, "#cbd5e1");
    this.addPanelText(532, 300, getItemRarity(item), 14, this.getRarityColor(item));
    this.addPanelText(532, 332, this.wrapText(item.description, 20), 13, "#cbd5e1");
    this.addPanelText(532, 386, `Value ${item.value}`, 13, "#fde68a");
  }

  private renderInventoryButtons(item: ItemDefinition | null): void {
    const useLabel = item && getItemEquipmentSlot(item) ? "Equip" : "Use";
    this.addPanelButton(512, 430, 78, 34, useLabel, () => this.useSelectedInventoryItem());
    this.addPanelButton(598, 430, 78, 34, "Drop", () => this.dropSelectedInventoryItem());
    this.addPanelButton(598, 476, 78, 28, "Close", () => this.closePanel());
    this.game.canvas.dataset.inventoryButtons = `${useLabel}|Drop|Close`;
  }

  private renderEquipmentPanel(state: GameState, dataRegistry: DataRegistry): void {
    this.addPanelRectangle(70, 60, 660, 470, panelFill, 0.94)
      .setOrigin(0)
      .setStrokeStyle(2, panelStroke, 0.92);
    this.addPanelText(96, 84, "Equipment", 24, "#f8fafc");
    const baseAttack = dataRegistry.getClass(state.character.archetype).baseStats.attack;
    const stats = getEquipmentStats(state.equipment, (id) => dataRegistry.getItem(id));
    this.addPanelText(96, 120, `Attack ${baseAttack + stats.attack}   Defense +${stats.defense}`, 15, "#bbf7d0");
    this.game.canvas.dataset.equipmentPanel = "visible";
    this.game.canvas.dataset.equipmentSlotsVisible = equipmentSlots.join("|");

    equipmentSlots.forEach((slot, index) => {
      const column = index < 5 ? 0 : 1;
      const row = index % 5;
      const x = 96 + column * 290;
      const y = 160 + row * 52;
      const equippedItemId = state.equipment[slot];
      const item = equippedItemId ? dataRegistry.getItem(equippedItemId) : null;
      const selected = slot === this.selectedEquipmentSlot;
      const rowObject = this.addPanelRectangle(x, y, 254, 38, selected ? 0x293548 : 0x18222c, 0.94)
        .setOrigin(0)
        .setStrokeStyle(1, selected ? 0xfacc15 : 0x334155, 0.9)
        .setInteractive({ useHandCursor: true });
      rowObject.on("pointerdown", () => {
        this.selectedEquipmentSlot = slot;
        this.renderPanel();
      });
      if (item) {
        rowObject.on("pointerover", () => this.showComparison(item));
      }
      this.addPanelText(x + 12, y + 9, equipmentSlotLabels[slot], 14, "#94a3b8");
      this.addPanelText(x + 112, y + 9, item?.name ?? "Empty", 14, item ? "#f8fafc" : "#64748b");
    });

    this.addPanelButton(96, 450, 102, 34, "Remove", () => this.removeSelectedEquipment());
    this.addPanelButton(210, 450, 102, 34, "Close", () => this.closePanel());
    this.renderComparisonFrame();
    this.syncEquipmentDataset(state, dataRegistry);
  }

  private renderComparisonFrame(): void {
    this.addPanelRectangle(520, 346, 170, 138, 0x17212b, 0.95)
      .setOrigin(0)
      .setStrokeStyle(1, 0x475569, 0.86);
    this.addPanelText(536, 362, "Comparison", 16, "#f8fafc");
    this.addPanelText(536, 392, "Hover gear to compare.", 13, "#94a3b8");
  }

  private showComparison(item: ItemDefinition): void {
    if (!this.state || !this.dataRegistry || !getItemEquipmentSlot(item)) {
      this.game.canvas.dataset.itemComparison = "hidden";
      return;
    }

    const slot = getItemEquipmentSlot(item)!;
    const currentItem = this.state.equipment[slot] ? this.dataRegistry.getItem(this.state.equipment[slot]!) : null;
    const { delta } = compareEquipmentItems(currentItem, item);
    const attackDelta = delta.attack;
    const defenseDelta = delta.defense;
    const comparison = [
      `current=${currentItem?.name ?? "Empty"}`,
      `new=${item.name}`,
      `attack=${this.formatDelta(attackDelta)}`,
      `defense=${this.formatDelta(defenseDelta)}`,
      "requirements=None",
      "effects=None",
    ].join("|");

    this.game.canvas.dataset.itemComparison = "visible";
    this.game.canvas.dataset.itemComparisonText = comparison;
    this.game.canvas.dataset.itemComparisonIncrease = attackDelta > 0 || defenseDelta > 0 ? "visible" : "none";
    this.game.canvas.dataset.itemComparisonDecrease = attackDelta < 0 || defenseDelta < 0 ? "visible" : "none";

    this.clearComparisonObjects();

    if (this.activePanel === "equipment") {
      this.addComparisonText(536, 392, this.wrapText(`Current: ${currentItem?.name ?? "Empty"}`, 18), 12, "#cbd5e1");
      this.addComparisonText(536, 432, this.wrapText(`New: ${item.name}`, 18), 12, "#cbd5e1");
      this.addComparisonText(632, 392, `ATK ${this.formatDelta(attackDelta)}`, 12, attackDelta >= 0 ? "#bbf7d0" : "#fca5a5");
      this.addComparisonText(632, 432, `DEF ${this.formatDelta(defenseDelta)}`, 12, defenseDelta >= 0 ? "#bbf7d0" : "#fca5a5");
      this.addComparisonText(536, 468, "Req None   FX None", 11, "#94a3b8");
    } else if (this.activePanel === "inventory") {
      this.addComparisonRectangle(112, 390, 382, 96, 0x17212b, 0.95)
        .setOrigin(0)
        .setStrokeStyle(1, 0x475569, 0.86);
      this.addComparisonText(128, 404, "Compare", 14, "#f8fafc");
      this.addComparisonText(128, 430, this.wrapText(`Current: ${currentItem?.name ?? "Empty"}`, 26), 12, "#cbd5e1");
      this.addComparisonText(292, 430, this.wrapText(`New: ${item.name}`, 24), 12, "#cbd5e1");
      this.addComparisonText(128, 468, `ATK ${this.formatDelta(attackDelta)}   DEF ${this.formatDelta(defenseDelta)}`, 12, attackDelta >= 0 && defenseDelta >= 0 ? "#bbf7d0" : "#fca5a5");
      this.addComparisonText(292, 468, "Req None   FX None", 11, "#94a3b8");
    }
  }

  private useSelectedInventoryItem(): void {
    if (!this.state || !this.dataRegistry) {
      return;
    }

    const entries = this.getInventoryPanelEntries(this.state.inventory.items, this.state.inventory.equipmentInstances);
    const entry = entries[this.clampSelectedInventoryIndex(entries)];
    const item = entry ? this.dataRegistry.getItem(entry.itemId) : null;

    if (!item) {
      return;
    }

    if (getItemEquipmentSlot(item)) {
      equipItem(this.state, item);
      this.game.canvas.dataset.lastInventoryAction = `equip:${item.id}`;
      return;
    }

    removeInventoryItem(this.state.inventory, item.id, 1);
    this.game.canvas.dataset.lastInventoryAction = `use:${item.id}`;
  }

  private dropSelectedInventoryItem(): void {
    if (!this.state || !this.dataRegistry) {
      return;
    }

    const entries = this.getInventoryPanelEntries(this.state.inventory.items, this.state.inventory.equipmentInstances);
    const entry = entries[this.clampSelectedInventoryIndex(entries)];

    if (!entry) {
      return;
    }

    removeInventoryItem(this.state.inventory, entry.itemId, 1);
    this.game.canvas.dataset.lastInventoryAction = `drop:${entry.itemId}`;
  }

  private removeSelectedEquipment(): void {
    if (!this.state) {
      return;
    }

    if (removeEquipment(this.state, this.selectedEquipmentSlot)) {
      this.game.canvas.dataset.lastEquipmentAction = `remove:${this.selectedEquipmentSlot}`;
    }
  }

  private addPanelButton(x: number, y: number, width: number, height: number, label: string, callback: () => void): void {
    const button = this.addPanelRectangle(x, y, width, height, 0x263241, 0.96)
      .setOrigin(0)
      .setStrokeStyle(1, 0xfacc15, 0.9)
      .setInteractive({ useHandCursor: true });
    button.on("pointerdown", callback);
    this.addPanelText(x + 14, y + 9, label, 13, "#f8fafc");
  }

  private addPanelRectangle(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    alpha: number,
  ): Phaser.GameObjects.Rectangle {
    const rectangle = this.add.rectangle(x, y, width, height, color, alpha)
      .setScrollFactor(0)
      .setDepth(panelDepth);
    this.panelObjects.push(rectangle);
    return rectangle;
  }

  private addPanelText(x: number, y: number, text: string, fontSize: number, color: string): Phaser.GameObjects.Text {
    const object = this.add.text(x, y, text, {
      color,
      fontFamily: "Arial, sans-serif",
      fontSize: `${fontSize}px`,
      lineSpacing: 4,
    })
      .setScrollFactor(0)
      .setDepth(panelDepth + 1);
    this.panelObjects.push(object);
    return object;
  }

  private addComparisonRectangle(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    alpha: number,
  ): Phaser.GameObjects.Rectangle {
    const rectangle = this.addPanelRectangle(x, y, width, height, color, alpha);
    this.comparisonObjects.push(rectangle);
    return rectangle;
  }

  private addComparisonText(x: number, y: number, text: string, fontSize: number, color: string): Phaser.GameObjects.Text {
    const object = this.addPanelText(x, y, text, fontSize, color);
    this.comparisonObjects.push(object);
    return object;
  }

  private clearPanelObjects(): void {
    for (const object of this.panelObjects) {
      object.destroy();
    }

    this.panelObjects = [];
    this.comparisonObjects = [];
  }

  private clearComparisonObjects(): void {
    const comparisonObjects = new Set(this.comparisonObjects);

    for (const object of comparisonObjects) {
      object.destroy();
    }

    this.panelObjects = this.panelObjects.filter((object) => !comparisonObjects.has(object));
    this.comparisonObjects = [];
  }

  private createTargetFrame(): void {
    this.targetFrame = this.add.rectangle(400, 44, 250, 48, 0x111827, 0.78)
      .setStrokeStyle(2, 0xfacc15, 0.95)
      .setScrollFactor(0)
      .setDepth(hudDepth)
      .setVisible(false);
    this.targetNameText = this.add.text(292, 28, "", {
      color: "#f8fafc",
      fontFamily: "Arial, sans-serif",
      fontSize: "16px",
    })
      .setScrollFactor(0)
      .setDepth(hudDepth + 1)
      .setVisible(false);
    this.targetHpText = this.add.text(292, 48, "", {
      color: "#bbf7d0",
      fontFamily: "Arial, sans-serif",
      fontSize: "13px",
    })
      .setScrollFactor(0)
      .setDepth(hudDepth + 1)
      .setVisible(false);
    this.clearTargetFrame();
  }

  private createMapLabel(mapName: string): void {
    this.mapNameText = this.add.text(348, 18, mapName, {
      color: "#f8fafc",
      fontFamily: "Arial, sans-serif",
      fontSize: "18px",
    })
      .setScrollFactor(0)
      .setDepth(hudDepth);
    this.game.canvas.dataset.currentMapName = mapName;
  }

  private setTargetFrame(enemyId: string, name: string, hp: number, maxHp: number): void {
    this.targetFrame?.setVisible(true);
    this.targetNameText?.setText(name).setVisible(true);
    this.targetHpText?.setText(`HP ${hp}/${maxHp}`).setVisible(true);
    this.game.canvas.dataset.targetFrame = "visible";
    this.game.canvas.dataset.targetEnemyId = enemyId;
    this.game.canvas.dataset.targetEnemyName = name;
    this.game.canvas.dataset.targetEnemyHp = `${hp}/${maxHp}`;
  }

  private clearTargetFrame(): void {
    this.targetFrame?.setVisible(false);
    this.targetNameText?.setVisible(false);
    this.targetHpText?.setVisible(false);
    this.game.canvas.dataset.targetFrame = "hidden";
    this.game.canvas.dataset.targetEnemyId = "";
    this.game.canvas.dataset.targetEnemyName = "";
    this.game.canvas.dataset.targetEnemyHp = "";
  }

  private syncPlayerStats(state: GameState, dataRegistry: DataRegistry): void {
    const playerClass = dataRegistry.getClass(state.character.archetype);
    const firstInventoryEntry = this.getInventoryPanelEntries(state.inventory.items, state.inventory.equipmentInstances)[0];
    const firstInventoryItem = firstInventoryEntry ? dataRegistry.getItem(firstInventoryEntry.itemId) : null;
    const firstSkillId = state.character.skillIds[0] ?? playerClass.startingSkillIds[0];
    const firstSkill = firstSkillId ? dataRegistry.getSkill(firstSkillId) : null;

    this.game.canvas.dataset.playerHp = `${state.character.stats.hp}/${state.character.stats.maxHp}`;
    this.game.canvas.dataset.playerSp = `${state.character.stats.sp}/${state.character.stats.maxSp}`;
    this.game.canvas.dataset.playerXp = String(state.playerProfile.xp);
    this.game.canvas.dataset.playerXpNext = String(dataRegistry.getXpTable("standard").levels[String(state.playerProfile.level + 1)] ?? "");
    this.game.canvas.dataset.playerLevel = String(state.playerProfile.level);
    this.game.canvas.dataset.playerGold = String(state.playerProfile.gold);
    this.game.canvas.dataset.playerStatPoints = String(state.playerProfile.statPoints);
    this.game.canvas.dataset.playerSkillPoints = String(state.playerProfile.skillPoints);
    this.game.canvas.dataset.playerClass = playerClass.id;
    this.game.canvas.dataset.inventoryItem = firstInventoryItem?.id ?? "";
    this.game.canvas.dataset.inventoryItemName = firstInventoryItem?.name ?? "";
    this.game.canvas.dataset.inventoryGold = String(state.inventory.gold);
    this.game.canvas.dataset.inventoryStackCount = String(state.inventory.items.length);
    this.game.canvas.dataset.equipmentInstanceCount = String(state.inventory.equipmentInstances.length);
    this.game.canvas.dataset.skill = firstSkill?.id ?? "";
    this.game.canvas.dataset.skillName = firstSkill?.name ?? "";
    this.syncEquipmentDataset(state, dataRegistry);
  }

  private syncEquipmentDataset(state: GameState, dataRegistry: DataRegistry): void {
    const slotSummary = equipmentSlots
      .map((slot) => `${slot}:${state.equipment[slot] ?? "empty"}`)
      .join("|");
    const stats = getEquipmentStats(state.equipment, (id) => dataRegistry.getItem(id));
    const baseAttack = dataRegistry.getClass(state.character.archetype).baseStats.attack;

    this.game.canvas.dataset.equipmentSlots = slotSummary;
    this.game.canvas.dataset.equipmentWeapon = state.equipment.weapon ?? "";
    this.game.canvas.dataset.equipmentAttackBonus = String(stats.attack);
    this.game.canvas.dataset.playerAttackStat = String(baseAttack + stats.attack);
  }

  private syncXpBar(state: GameState, dataRegistry: DataRegistry): void {
    const xpTable = dataRegistry.getXpTable("standard");
    const currentLevelXp = xpTable.levels[String(state.playerProfile.level)] ?? 0;
    const nextLevelXp = xpTable.levels[String(state.playerProfile.level + 1)] ?? null;
    const progress = nextLevelXp === null
      ? 1
      : Phaser.Math.Clamp((state.playerProfile.xp - currentLevelXp) / (nextLevelXp - currentLevelXp), 0, 1);
    const width = Math.round(progress * 180);

    if (this.xpBarFill) {
      this.xpBarFill.displayWidth = width;
    }

    this.xpText?.setText(`${state.playerProfile.xp}/${nextLevelXp ?? "MAX"}`);
    this.game.canvas.dataset.playerXpNext = String(nextLevelXp ?? "");
    this.game.canvas.dataset.xpBarWidth = String(width);
  }

  private refreshAttackText(state: GameState, dataRegistry: DataRegistry): void {
    const stats = getEquipmentStats(state.equipment, (id) => dataRegistry.getItem(id));
    const baseAttack = dataRegistry.getClass(state.character.archetype).baseStats.attack;
    this.attackText?.setText(`Attack ${baseAttack + stats.attack}`);
    this.game.canvas.dataset.playerAttackStat = String(baseAttack + stats.attack);
  }

  private syncSelectedInventoryDataset(item: ItemDefinition | null, quantity: number | null, source: string | null): void {
    this.game.canvas.dataset.selectedInventoryItem = item?.id ?? "";
    this.game.canvas.dataset.selectedInventoryItemName = item?.name ?? "";
    this.game.canvas.dataset.selectedInventoryItemQuantity = quantity ? String(quantity) : "";
    this.game.canvas.dataset.selectedInventoryItemRarity = item ? getItemRarity(item) : "";
    this.game.canvas.dataset.selectedInventoryItemDescription = item?.description ?? "";
    this.game.canvas.dataset.selectedInventoryItemSource = source ?? "";
  }

  private getInventoryWeight(state: GameState): number {
    const stackWeight = state.inventory.items.reduce((total, item) => total + item.quantity, 0);
    return stackWeight + state.inventory.equipmentInstances.length;
  }

  private clampSelectedInventoryIndex(items: InventoryPanelEntry[]): number {
    if (items.length === 0) {
      this.selectedInventoryIndex = 0;
      return 0;
    }

    this.selectedInventoryIndex = Phaser.Math.Clamp(this.selectedInventoryIndex, 0, items.length - 1);
    return this.selectedInventoryIndex;
  }

  private getInventoryPanelEntries(
    stacks: InventoryItem[],
    equipmentInstances: EquipmentInstance[],
  ): InventoryPanelEntry[] {
    return [
      ...stacks.map((stack) => ({
        itemId: stack.id,
        quantity: stack.quantity,
        source: "stack" as const,
      })),
      ...equipmentInstances.map((instance) => ({
        itemId: instance.itemId,
        quantity: 1,
        source: "equipment" as const,
      })),
    ];
  }

  private getItemIconColor(item: ItemDefinition): number {
    if (item.type === "weapon") {
      return 0xb45309;
    }

    if (item.type === "armor") {
      return 0x475569;
    }

    if (item.type === "consumable") {
      return 0xdc2626;
    }

    return 0x0f766e;
  }

  private getRarityColor(item: ItemDefinition): string {
    const rarity = getItemRarity(item);

    if (rarity === "Rare") {
      return "#c4b5fd";
    }

    if (rarity === "Uncommon") {
      return "#93c5fd";
    }

    return "#cbd5e1";
  }

  private formatDelta(value: number): string {
    return value >= 0 ? `+${value}` : String(value);
  }

  private wrapText(text: string, lineLength: number): string {
    const words = text.split(" ");
    const lines: string[] = [];
    let line = "";

    for (const word of words) {
      const next = line ? `${line} ${word}` : word;

      if (next.length > lineLength) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }

    if (line) {
      lines.push(line);
    }

    return lines.join("\n");
  }
}
