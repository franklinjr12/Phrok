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
  getItemSellValue,
  removeEquipment,
} from "../systems/equipment";
import {
  getRefinedItemName,
  getRefineLevel,
  getRefinementPreview,
  isItemRefinable,
  refineItem,
  type RefinementPreview,
} from "../systems/refinement";
import {
  allocateStatPoint,
  baseStatKeys,
  baseStatLabels,
  calculateDerivedStats,
  getStatCost,
  getTotalBaseStats,
  resetAllocatedStats,
  statResetCost,
} from "../systems/stats";
import { writeSaveSlot } from "../systems/autosave";
import {
  cycleAutoPotionThreshold,
  getAutoPotionSettingsSummary,
  getConsumableCooldownSummary,
  useConsumableItem,
} from "../systems/consumables";
import {
  cycleSupportAutoPickupFilter,
  getSupportSummary,
  syncEquippedSupportFromEquipment,
} from "../systems/supports";
import {
  canCraftRecipe,
  craftRecipe,
  getRecipeMaterialStatus,
  getVisibleRecipes,
  unlockRecipesForSource,
} from "../systems/crafting";
import { eventBus } from "../systems/eventBus";
import { removeInventoryItem } from "../systems/inventory";
import {
  appraiseInventoryItem,
  buyShopItem,
  getAppraisalCost,
  getMarketSellValue,
  getShopBuyPrice,
  getVisibleItemDescription,
  getVisibleItemName,
  isItemAppraisable,
  isItemAppraised,
  sellInventoryItem,
} from "../systems/market";
import {
  depositStorageItem,
  getContainerEntries,
  getFilteredStorageEntries,
  withdrawStorageItem,
  type StorageCategoryFilter,
  type StorageClassFilter,
  type StorageLevelFilter,
  type StorageListEntry,
  type StorageListOptions,
  type StorageSortDirection,
  type StorageSortMode,
} from "../systems/storage";
import { allocateSkillPoint, assignHotbarAction, getLearnedSkillLevel, hotbarSlotCount } from "../systems/skills";
import { advancedClassUnlockLevel, getUnlockedSkillTreeIds, isAdvancedClassServiceAvailable } from "../systems/advancedClasses";
import { getStatusSummary } from "../systems/statusEffects";
import type { DataRegistry } from "../data/dataRegistry";
import type { ItemDefinition, ItemRarity, RecipeDefinition, ShopDefinition, SkillDefinition } from "../types/dataDefinitions";
import type { BaseStatKey, EquipmentInstance, EquipmentSlot, GameState, InventoryItem } from "../types/gameState";

type PanelMode = "inventory" | "equipment" | "character" | "skills" | "crafting" | "refinement" | "shop" | "appraiser" | "storage";
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
  private unsubscribeAdvancedClassUnlocked?: () => void;
  private unsubscribeAdvancedClassChosen?: () => void;
  private unsubscribeInventory?: () => void;
  private unsubscribeEquipment?: () => void;
  private unsubscribeStats?: () => void;
  private unsubscribeStatResetCompleted?: () => void;
  private unsubscribeStatResetFailed?: () => void;
  private unsubscribeLootDropped?: () => void;
  private unsubscribeLootPickedUp?: () => void;
  private unsubscribeEnemyHealth?: () => void;
  private unsubscribeEnemyTarget?: () => void;
  private unsubscribeMapChanged?: () => void;
  private unsubscribeSaveCompleted?: () => void;
  private unsubscribeSkillPointsChanged?: () => void;
  private unsubscribeConsumableUsed?: () => void;
  private unsubscribeAutoPotionSettingsChanged?: () => void;
  private unsubscribeHotbarChanged?: () => void;
  private unsubscribeHotbarUsed?: () => void;
  private unsubscribeStatusEffectsChanged?: () => void;
  private unsubscribeSupportChanged?: () => void;
  private unsubscribeCraftingOpened?: () => void;
  private unsubscribeCraftingChanged?: () => void;
  private unsubscribeRefinementOpened?: () => void;
  private unsubscribeRecipeUnlocked?: () => void;
  private unsubscribeShopOpened?: () => void;
  private unsubscribeStorageOpened?: () => void;
  private unsubscribeStorageChanged?: () => void;
  private hpText?: Phaser.GameObjects.Text;
  private spText?: Phaser.GameObjects.Text;
  private levelText?: Phaser.GameObjects.Text;
  private goldText?: Phaser.GameObjects.Text;
  private weightText?: Phaser.GameObjects.Text;
  private xpText?: Phaser.GameObjects.Text;
  private attackText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private xpBarFill?: Phaser.GameObjects.Rectangle;
  private targetFrame?: Phaser.GameObjects.Rectangle;
  private targetNameText?: Phaser.GameObjects.Text;
  private targetHpText?: Phaser.GameObjects.Text;
  private bossFrame?: Phaser.GameObjects.Rectangle;
  private bossHpBarBackground?: Phaser.GameObjects.Rectangle;
  private bossHpBarFill?: Phaser.GameObjects.Rectangle;
  private bossNameText?: Phaser.GameObjects.Text;
  private bossHpText?: Phaser.GameObjects.Text;
  private bossPhaseText?: Phaser.GameObjects.Text;
  private mapNameText?: Phaser.GameObjects.Text;
  private advancedClassNotificationText?: Phaser.GameObjects.Text;
  private activePanel: PanelMode | null = null;
  private selectedInventoryIndex = 0;
  private selectedShopIndex = 0;
  private selectedMarketInventoryIndex = 0;
  private selectedStorageInventoryIndex = 0;
  private selectedStorageIndex = 0;
  private selectedCraftingIndex = 0;
  private selectedRefinementIndex = 0;
  private storageInventoryPage = 0;
  private storagePage = 0;
  private selectedEquipmentSlot: EquipmentSlot = "weapon";
  private selectedSkillIndex = 0;
  private activeShopId = "";
  private activeStorageNpcId = "";
  private activeCraftingNpcId = "";
  private activeRefinementNpcId = "";
  private storageCategoryFilter: StorageCategoryFilter = "all";
  private storageRarityFilter: ItemRarity | "all" = "all";
  private storageClassFilter: StorageClassFilter = "all";
  private storageLevelFilter: StorageLevelFilter = "all";
  private storageSearchText = "";
  private storageSortMode: StorageSortMode = "name";
  private storageSortDirection: StorageSortDirection = "asc";
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
    syncEquippedSupportFromEquipment(state, (id) => dataRegistry.getItem(id));

    this.game.canvas.dataset.uiScene = "running";
    this.game.canvas.dataset.uiPanel = "closed";
    this.game.canvas.dataset.gameplayInputBlocked = "false";
    this.syncPlayerStats(state, dataRegistry);
    this.createHud(state, dataRegistry);
    this.createAdvancedClassNotification(state);
    this.createMapLabel(state.currentMapId, dataRegistry);
    this.syncXpBar(state, dataRegistry);
    this.createTargetFrame();
    this.createBossFrame();
    this.registerKeyboard();
    this.registerEvents(state, dataRegistry);
  }

  private registerKeyboard(): void {
    this.input.keyboard?.on("keydown-I", this.toggleInventoryPanel, this);
    this.input.keyboard?.on("keydown-C", this.toggleCharacterPanel, this);
    this.input.keyboard?.on("keydown-K", this.toggleSkillPanel, this);
    this.input.keyboard?.on("keydown-P", this.toggleEquipmentPanel, this);
    this.input.keyboard?.on("keydown-R", this.toggleCraftingPanel, this);
    this.input.keyboard?.on("keydown-S", this.manualSave, this);
    this.input.keyboard?.on("keydown-ESC", this.closePanel, this);
    this.input.keyboard?.on("keydown", this.handleHotbarKey, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown-I", this.toggleInventoryPanel, this);
      this.input.keyboard?.off("keydown-C", this.toggleCharacterPanel, this);
      this.input.keyboard?.off("keydown-K", this.toggleSkillPanel, this);
      this.input.keyboard?.off("keydown-P", this.toggleEquipmentPanel, this);
      this.input.keyboard?.off("keydown-R", this.toggleCraftingPanel, this);
      this.input.keyboard?.off("keydown-S", this.manualSave, this);
      this.input.keyboard?.off("keydown-ESC", this.closePanel, this);
      this.input.keyboard?.off("keydown", this.handleHotbarKey, this);
      this.unsubscribeHealth?.();
      this.unsubscribeSp?.();
      this.unsubscribeXp?.();
      this.unsubscribeLevelUp?.();
      this.unsubscribeAdvancedClassUnlocked?.();
      this.unsubscribeAdvancedClassChosen?.();
      this.unsubscribeInventory?.();
      this.unsubscribeEquipment?.();
      this.unsubscribeStats?.();
      this.unsubscribeStatResetCompleted?.();
      this.unsubscribeStatResetFailed?.();
      this.unsubscribeLootDropped?.();
      this.unsubscribeLootPickedUp?.();
      this.unsubscribeEnemyHealth?.();
      this.unsubscribeEnemyTarget?.();
      this.unsubscribeMapChanged?.();
      this.unsubscribeSaveCompleted?.();
      this.unsubscribeSkillPointsChanged?.();
      this.unsubscribeConsumableUsed?.();
      this.unsubscribeAutoPotionSettingsChanged?.();
      this.unsubscribeHotbarChanged?.();
      this.unsubscribeHotbarUsed?.();
      this.unsubscribeStatusEffectsChanged?.();
      this.unsubscribeSupportChanged?.();
      this.unsubscribeCraftingOpened?.();
      this.unsubscribeCraftingChanged?.();
      this.unsubscribeRefinementOpened?.();
      this.unsubscribeRecipeUnlocked?.();
      this.unsubscribeShopOpened?.();
      this.unsubscribeStorageOpened?.();
      this.unsubscribeStorageChanged?.();
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
      this.syncAdvancedClassDataset(state, dataRegistry);
      if (level >= advancedClassUnlockLevel && !state.character.advancedClass) {
        this.showAdvancedClassNotification();
      }
      this.syncXpBar(state, dataRegistry);
    });

    this.unsubscribeAdvancedClassUnlocked = eventBus.on("advancedClassUnlocked", () => {
      this.syncAdvancedClassDataset(state, dataRegistry);
      this.showAdvancedClassNotification();
    });

    this.unsubscribeAdvancedClassChosen = eventBus.on("advancedClassChosen", () => {
      this.syncAdvancedClassDataset(state, dataRegistry);
      this.syncSkillDataset(state, dataRegistry);
      this.hideAdvancedClassNotification();
      this.refreshOpenPanel();
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
      this.weightText?.setText(`Weight ${this.getInventoryWeight(state)}/${this.getWeightLimit(state, dataRegistry)}`);
      this.refreshOpenPanel();
    });

    this.unsubscribeEquipment = eventBus.on("equipmentChanged", () => {
      syncEquippedSupportFromEquipment(state, (id) => dataRegistry.getItem(id));
      this.syncSupportDataset(state, dataRegistry);
      this.syncEquipmentDataset(state, dataRegistry);
      this.syncDerivedStatsDataset(state, dataRegistry);
      this.refreshCombatText(state, dataRegistry);
      this.refreshOpenPanel();
    });

    this.unsubscribeStats = eventBus.on("statsChanged", () => {
      this.syncVitalsDataset(state);
      this.syncBaseStatsDataset(state, dataRegistry);
      this.syncDerivedStatsDataset(state, dataRegistry);
      this.refreshCombatText(state, dataRegistry);
      this.hpText?.setText(`HP ${state.character.stats.hp}/${state.character.stats.maxHp}`);
      this.spText?.setText(`SP ${state.character.stats.sp}/${state.character.stats.maxSp}`);
      this.weightText?.setText(`Weight ${this.getInventoryWeight(state)}/${this.getWeightLimit(state, dataRegistry)}`);
      this.refreshOpenPanel();
    });

    this.unsubscribeStatResetCompleted = eventBus.on("statResetCompleted", ({ cost, refundedPoints, gold }) => {
      this.game.canvas.dataset.statResetPrompt = "closed";
      this.game.canvas.dataset.lastStatReset = `success:${cost}:${refundedPoints}`;
      this.game.canvas.dataset.playerGold = String(gold);
      this.game.canvas.dataset.inventoryGold = String(gold);
      this.goldText?.setText(`Gold ${gold}`);
      this.refreshOpenPanel();
    });

    this.unsubscribeStatResetFailed = eventBus.on("statResetFailed", ({ reason, cost, gold }) => {
      this.game.canvas.dataset.statResetPrompt = "closed";
      this.game.canvas.dataset.lastStatReset = `failed:${reason}:${cost}:${gold}`;
    });

    this.unsubscribeLootDropped = eventBus.on("lootDropped", ({ kind, itemId, quantity }) => {
      this.game.canvas.dataset.lastLootDrop = kind === "gold" ? `gold:${quantity}` : `${itemId}:${quantity}`;
    });

    this.unsubscribeLootPickedUp = eventBus.on("lootPickedUp", ({ kind, itemId, quantity }) => {
      this.game.canvas.dataset.lastLootPickup = kind === "gold" ? `gold:${quantity}` : `${itemId}:${quantity}`;
    });

    this.unsubscribeEnemyHealth = eventBus.on("enemyHealthChanged", ({ enemyId, name, hp, maxHp, boss, phase }) => {
      if (this.game.canvas.dataset.targetEnemyId === enemyId) {
        this.setTargetFrame(enemyId, name, hp, maxHp);
      }

      if (boss) {
        this.setBossFrame(name, hp, maxHp, phase ?? 1);
      }
    });

    this.unsubscribeEnemyTarget = eventBus.on("enemyTargetChanged", ({ enemyId, name, hp, maxHp, boss, phase }) => {
      if (!enemyId) {
        this.clearTargetFrame();
        this.clearBossFrame();
        return;
      }

      this.setTargetFrame(enemyId, name, hp, maxHp);
      if (boss) {
        this.setBossFrame(name, hp, maxHp, phase ?? 1);
      } else {
        this.clearBossFrame();
      }
    });

    this.unsubscribeMapChanged = eventBus.on("mapChanged", ({ mapId, musicKey }) => {
      this.updateMapMetadata(mapId, dataRegistry);
      this.game.canvas.dataset.currentMapMusicKey = musicKey;
    });

    this.unsubscribeSaveCompleted = eventBus.on("saveCompleted", ({ saveSlot }) => {
      this.game.canvas.dataset.lastAutosaveSlot = String(saveSlot);
    });

    this.unsubscribeSkillPointsChanged = eventBus.on("skillPointsChanged", ({ skillId, skillLevel, skillPoints }) => {
      this.game.canvas.dataset.lastSkillAllocation = `${skillId}:${skillLevel}`;
      this.game.canvas.dataset.playerSkillPoints = String(skillPoints);
      this.syncSkillDataset(state, dataRegistry);
      this.refreshOpenPanel();
    });

    this.unsubscribeConsumableUsed = eventBus.on("consumableUsed", (result) => {
      this.game.canvas.dataset.lastConsumableUse = result.success
        ? `${result.itemId}:success:hp:${result.restoredHp}:sp:${result.restoredSp}:status:${result.appliedStatusEffectIds.join(",")}`
        : `${result.itemId}:failed:${result.reason}`;
      this.game.canvas.dataset.lastConsumableAutomatic = String(result.automatic);
      this.game.canvas.dataset.consumableCooldowns = getConsumableCooldownSummary(state);
      this.syncVitalsDataset(state);
      this.refreshOpenPanel();
    });

    this.unsubscribeAutoPotionSettingsChanged = eventBus.on("autoPotionSettingsChanged", ({ hpThresholdPercent, spThresholdPercent }) => {
      this.game.canvas.dataset.autoPotionSettings = `hp:${hpThresholdPercent}|sp:${spThresholdPercent}`;
      this.refreshOpenPanel();
    });

    this.unsubscribeHotbarChanged = eventBus.on("hotbarChanged", ({ hotbar }) => {
      this.game.canvas.dataset.hotbarAssignments = hotbar.map((entry) => `${entry.slot}:${entry.type}:${entry.id}`).join("|");
      this.refreshOpenPanel();
    });

    this.unsubscribeHotbarUsed = eventBus.on("hotbarUsed", ({ slot, type, id, success }) => {
      this.game.canvas.dataset.lastHotbarUse = `${slot}:${type}:${id}:${success ? "success" : "failed"}`;
    });

    this.unsubscribeStatusEffectsChanged = eventBus.on("statusEffectsChanged", ({ targetKind, targetId, statuses }) => {
      const summary = getStatusSummary(statuses, (id) => dataRegistry.getStatusEffect(id));

      this.game.canvas.dataset.lastStatusChange = `${targetKind}:${targetId}:${summary}`;

      if (targetKind === "player") {
        this.game.canvas.dataset.playerStatusEffects = summary;
        this.game.canvas.dataset.playerStatusEffectIcons = this.getPlayerStatusIcons(state, dataRegistry);
        this.statusText?.setText(this.getPlayerStatusText(state, dataRegistry));
        this.syncDerivedStatsDataset(state, dataRegistry);
        this.refreshCombatText(state, dataRegistry);
      } else if (this.game.canvas.dataset.targetEnemyId === targetId) {
        this.game.canvas.dataset.targetStatusEffects = summary;
      }
    });

    this.unsubscribeSupportChanged = eventBus.on("supportChanged", ({ supportId, level, affinity, actionId }) => {
      this.game.canvas.dataset.lastSupportChange = `${supportId ?? "none"}:${level}:${affinity}:${actionId ?? ""}`;
      this.syncSupportDataset(state, dataRegistry);
      this.syncDerivedStatsDataset(state, dataRegistry);
      this.weightText?.setText(`Weight ${this.getInventoryWeight(state)}/${this.getWeightLimit(state, dataRegistry)}`);
      this.refreshOpenPanel();
    });

    this.unsubscribeCraftingOpened = eventBus.on("craftingOpened", ({ npcId }) => {
      this.activeCraftingNpcId = npcId ?? "";
      this.selectedCraftingIndex = 0;
      this.game.canvas.dataset.activeCraftingNpc = this.activeCraftingNpcId;
      unlockRecipesForSource(state, dataRegistry.getRecipes(), { type: "npc", npcId: this.activeCraftingNpcId });
      this.openPanel("crafting");
    });

    this.unsubscribeCraftingChanged = eventBus.on("craftingChanged", ({ unlockedRecipeIds }) => {
      this.game.canvas.dataset.unlockedRecipes = unlockedRecipeIds.join("|");
      this.refreshOpenPanel();
    });

    this.unsubscribeRecipeUnlocked = eventBus.on("recipeUnlocked", ({ recipeId, recipeName }) => {
      this.game.canvas.dataset.lastRecipeUnlock = `${recipeId}:${recipeName}`;
    });

    this.unsubscribeRefinementOpened = eventBus.on("refinementOpened", ({ npcId }) => {
      this.activeRefinementNpcId = npcId;
      this.selectedRefinementIndex = 0;
      this.game.canvas.dataset.activeRefinementNpc = npcId;
      this.openPanel("refinement");
    });

    this.unsubscribeShopOpened = eventBus.on("shopOpened", ({ shopId, npcId }) => {
      const shop = dataRegistry.getShop(shopId);
      this.activeShopId = shopId;
      this.selectedShopIndex = 0;
      this.selectedMarketInventoryIndex = 0;
      this.game.canvas.dataset.activeShopNpc = npcId;
      this.openPanel(shop.serviceType === "appraiser" ? "appraiser" : "shop");
    });

    this.unsubscribeStorageOpened = eventBus.on("storageOpened", ({ npcId }) => {
      this.activeStorageNpcId = npcId;
      this.selectedStorageInventoryIndex = 0;
      this.selectedStorageIndex = 0;
      this.storageInventoryPage = 0;
      this.storagePage = 0;
      this.game.canvas.dataset.activeStorageNpc = npcId;
      this.openPanel("storage");
    });

    this.unsubscribeStorageChanged = eventBus.on("storageChanged", ({ storage }) => {
      this.game.canvas.dataset.storageStackCount = String(storage.items.length);
      this.game.canvas.dataset.storageEquipmentInstanceCount = String(storage.equipmentInstances.length);
      this.refreshOpenPanel();
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
    this.weightText = this.addHudText(24, 92, `Weight ${this.getInventoryWeight(state)}/${this.getWeightLimit(state, dataRegistry)}`, "#cbd5e1");
    this.attackText = this.addHudText(178, 92, "", "#bbf7d0");
    this.statusText = this.addHudText(24, 112, this.getPlayerStatusText(state, dataRegistry), "#f9a8d4");
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
    this.refreshCombatText(state, dataRegistry);
    this.syncEquipmentDataset(state, dataRegistry);
    this.syncBaseStatsDataset(state, dataRegistry);
    this.syncDerivedStatsDataset(state, dataRegistry);
    this.game.canvas.dataset.hudVisible = "true";
    this.game.canvas.dataset.hotbarVisible = "true";
    this.game.canvas.dataset.xpBar = "visible";
    this.game.canvas.dataset.xpBarWidth = "0";
    this.game.canvas.dataset.playerStatusEffects = getStatusSummary(
      state.character.statusEffects,
      (id) => dataRegistry.getStatusEffect(id),
    );
    this.game.canvas.dataset.playerStatusEffectIcons = this.getPlayerStatusIcons(state, dataRegistry);
    this.game.canvas.dataset.consumableCooldowns = getConsumableCooldownSummary(state);
    this.game.canvas.dataset.autoPotionSettings = getAutoPotionSettingsSummary(state);
    this.xpBarFill.displayWidth = state.playerProfile.xp > 0 ? 1 : 0;
  }

  private createHotbar(): void {
    const width = Number(this.scale.width || 800);
    const x = Math.max(210, width / 2 - 140);
    const y = Math.max(540, Number(this.scale.height || 600) - 58);

    for (let index = 0; index < hotbarSlotCount; index += 1) {
      const assignment = this.state?.character.hotbar.find((entry) => entry.slot === index + 1);
      this.add.rectangle(x + index * 42, y, 36, 36, 0x17212b, 0.9)
        .setStrokeStyle(1, index === 0 ? 0xfacc15 : 0x64748b, 0.9)
        .setScrollFactor(0)
        .setDepth(hudDepth);
      this.add.text(x + index * 42 - 12, y - 12, String(index + 1), {
        color: "#f8fafc",
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
      })
        .setScrollFactor(0)
        .setDepth(hudDepth + 1);
      this.add.text(x + index * 42 - 12, y + 2, assignment?.type === "item" ? "POT" : (assignment?.id.slice(0, 3).toUpperCase() ?? ""), {
        color: "#cbd5e1",
        fontFamily: "Arial, sans-serif",
        fontSize: "10px",
      })
        .setScrollFactor(0)
        .setDepth(hudDepth + 1);
    }

    this.game.canvas.dataset.hotbarSlots = Array.from({ length: hotbarSlotCount }, (_, index) => String(index + 1)).join("|");
    this.game.canvas.dataset.hotbarAssignments = this.state?.character.hotbar.map((entry) => `${entry.slot}:${entry.type}:${entry.id}`).join("|") ?? "";
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

  private getPlayerStatusText(state: GameState, dataRegistry: DataRegistry): string {
    if (state.character.statusEffects.length === 0) {
      return "Status None";
    }

    const names = state.character.statusEffects
      .map((effect) => {
        const definition = dataRegistry.getStatusEffect(effect.id);
        return effect.stacks > 1 ? `${definition.name} x${effect.stacks}` : definition.name;
      })
      .join(", ");

    return `Status ${names}`;
  }

  private getPlayerStatusIcons(state: GameState, dataRegistry: DataRegistry): string {
    return state.character.statusEffects
      .map((effect) => dataRegistry.getStatusEffect(effect.id).visualIcon)
      .join("|");
  }

  private toggleInventoryPanel(): void {
    if (this.activePanel === "storage") {
      return;
    }

    if (this.activePanel === "inventory") {
      this.closePanel();
      return;
    }

    this.openPanel("inventory");
  }

  private toggleEquipmentPanel(): void {
    if (this.activePanel === "storage") {
      return;
    }

    if (this.activePanel === "equipment") {
      this.closePanel();
      return;
    }

    this.openPanel("equipment");
  }

  private toggleCharacterPanel(): void {
    if (this.activePanel === "storage") {
      return;
    }

    if (this.activePanel === "character") {
      this.closePanel();
      return;
    }

    this.openPanel("character");
  }

  private toggleSkillPanel(): void {
    if (this.activePanel === "storage") {
      return;
    }

    if (this.activePanel === "skills") {
      this.closePanel();
      return;
    }

    this.openPanel("skills");
  }

  private toggleCraftingPanel(): void {
    if (this.activePanel === "storage") {
      return;
    }

    if (this.activePanel === "crafting") {
      this.closePanel();
      return;
    }

    this.activeCraftingNpcId = this.getDefaultCraftingNpcId();
    unlockRecipesForSource(this.state!, this.dataRegistry!.getRecipes(), { type: "npc", npcId: this.activeCraftingNpcId });
    this.openPanel("crafting");
  }

  private openPanel(mode: PanelMode): void {
    this.activePanel = mode;
    this.game.canvas.dataset.uiPanel = mode;
    this.game.canvas.dataset.gameplayInputBlocked = "true";
    this.resetPanelDatasets();
    this.renderPanel();
  }

  private closePanel(): void {
    this.activePanel = null;
    this.clearPanelObjects();
    this.game.canvas.dataset.uiPanel = "closed";
    this.game.canvas.dataset.gameplayInputBlocked = "false";
    this.game.canvas.dataset.itemComparison = "hidden";
    this.resetPanelDatasets();
  }

  private resetPanelDatasets(): void {
    this.game.canvas.dataset.shopPanel = "hidden";
    this.game.canvas.dataset.appraiserPanel = "hidden";
    this.game.canvas.dataset.storagePanel = "hidden";
    this.game.canvas.dataset.craftingPanel = "hidden";
    this.game.canvas.dataset.refinementPanel = "hidden";
    this.game.canvas.dataset.supportPanel = "hidden";
  }

  private manualSave(): void {
    if (this.activePanel === "storage") {
      return;
    }

    if (!this.state?.currentSaveSlot) {
      this.game.canvas.dataset.lastManualSaveSlot = "";
      this.game.canvas.dataset.lastManualSaveStatus = "no-slot";
      return;
    }

    const saveData = writeSaveSlot(this.state.currentSaveSlot, this.state);

    this.game.canvas.dataset.lastManualSaveSlot = String(this.state.currentSaveSlot);
    this.game.canvas.dataset.lastManualSaveStatus = "saved";
    this.game.canvas.dataset.lastManualSaveMap = saveData.currentMapId;
    eventBus.emit("saveCompleted", { saveSlot: this.state.currentSaveSlot });
  }

  private requestHotbarAction(slot: number): void {
    if (this.game.canvas.dataset.gameplayInputBlocked === "true") {
      return;
    }

    eventBus.emit("hotbarActionRequested", { slot });
  }

  private handleHotbarKey(event: KeyboardEvent): void {
    if (this.activePanel === "storage" && this.handleStorageSearchKey(event)) {
      return;
    }

    const slot = Number(event.key);

    if (Number.isInteger(slot) && slot >= 1 && slot <= hotbarSlotCount) {
      this.requestHotbarAction(slot);
    }
  }

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
    this.game.canvas.dataset.storageSearch = this.storageSearchText;
    this.renderPanel();
    return true;
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
    } else if (this.activePanel === "equipment") {
      this.renderEquipmentPanel(this.state, this.dataRegistry);
    } else if (this.activePanel === "character") {
      this.renderCharacterPanel(this.state, this.dataRegistry);
    } else if (this.activePanel === "skills") {
      this.renderSkillPanel(this.state, this.dataRegistry);
    } else if (this.activePanel === "crafting") {
      this.renderCraftingPanel(this.state, this.dataRegistry);
    } else if (this.activePanel === "refinement") {
      this.renderRefinementPanel(this.state, this.dataRegistry);
    } else if (this.activePanel === "shop") {
      this.renderShopPanel(this.state, this.dataRegistry);
    } else if (this.activePanel === "appraiser") {
      this.renderAppraiserPanel(this.state, this.dataRegistry);
    } else {
      this.renderStoragePanel(this.state, this.dataRegistry);
    }
  }

  private renderSkillPanel(state: GameState, dataRegistry: DataRegistry): void {
    const classSkills = this.getVisibleSkillTreeSkills(state, dataRegistry);
    const selectedSkill = classSkills[this.clampSelectedSkillIndex(classSkills)] ?? null;
    const skillTreeIds = getUnlockedSkillTreeIds(state);
    const classLabel = [
      dataRegistry.getClass(state.character.archetype).name,
      state.character.advancedClass?.name ?? "",
    ].filter((entry) => entry.length > 0).join(" / ");

    this.addPanelRectangle(70, 60, 660, 470, panelFill, 0.95)
      .setOrigin(0)
      .setStrokeStyle(2, panelStroke, 0.92);
    this.addPanelText(96, 84, "Skills", 24, "#f8fafc");
    this.addPanelText(96, 120, `Class ${classLabel}   Skill Points ${state.playerProfile.skillPoints}`, 15, "#fde68a");
    this.game.canvas.dataset.skillPanel = "visible";
    this.game.canvas.dataset.skillGroups = skillTreeIds.join("|");
    this.game.canvas.dataset.skillPanelPoints = String(state.playerProfile.skillPoints);

    classSkills.forEach((skill, index) => {
      const y = 150 + index * 34;
      const level = getLearnedSkillLevel(state, skill.id);
      const locked = !this.isSkillUnlocked(state, skill);
      const row = this.addPanelRectangle(96, y, 330, 28, index === this.selectedSkillIndex ? 0x293548 : 0x18222c, 0.94)
        .setOrigin(0)
        .setStrokeStyle(1, index === this.selectedSkillIndex ? 0xfacc15 : 0x334155, 0.9)
        .setInteractive({ useHandCursor: true });
      row.on("pointerdown", () => {
        this.selectedSkillIndex = index;
        this.renderPanel();
      });
      this.addPanelText(110, y + 5, `${skill.name} ${level}/${skill.maxSkillLevel}`, 13, locked ? "#94a3b8" : "#f8fafc");
      this.addPanelText(292, y + 5, skill.type, 12, "#cbd5e1");
      this.addPanelText(352, y + 5, locked ? `Req Lv ${skill.requiredLevel}` : "Unlocked", 11, locked ? "#fca5a5" : "#bbf7d0");
    });

    if (selectedSkill) {
      const level = getLearnedSkillLevel(state, selectedSkill.id);
      const effectText = this.getSkillEffectText(selectedSkill);
      this.addPanelRectangle(456, 158, 230, 240, 0x17212b, 0.95)
        .setOrigin(0)
        .setStrokeStyle(1, 0x475569, 0.86);
      this.addPanelText(476, 178, selectedSkill.name, 17, "#f8fafc");
      this.addPanelText(476, 208, `Level ${level}/${selectedSkill.maxSkillLevel}   ${selectedSkill.targetingMode}`, 13, "#cbd5e1");
      this.addPanelText(476, 236, this.wrapText(selectedSkill.description, 24), 13, "#cbd5e1");
      this.addPanelText(476, 296, this.wrapText(effectText, 27), 12, "#fde68a");
      this.addPanelText(476, 348, `SP ${selectedSkill.spCost}  CD ${selectedSkill.cooldown}ms`, 13, "#93c5fd");
      this.addPanelText(476, 374, this.getSkillRequirementText(state, selectedSkill), 12, this.isSkillUnlocked(state, selectedSkill) ? "#bbf7d0" : "#fca5a5");
      this.game.canvas.dataset.selectedSkill = selectedSkill.id;
      this.game.canvas.dataset.selectedSkillLevel = String(level);
      this.game.canvas.dataset.selectedSkillLocked = String(!this.isSkillUnlocked(state, selectedSkill));
      this.game.canvas.dataset.selectedSkillTooltip = `${selectedSkill.type}|${selectedSkill.targetingMode}|${effectText}|${this.getSkillRequirementText(state, selectedSkill)}`;
    } else {
      this.game.canvas.dataset.selectedSkill = "";
      this.game.canvas.dataset.selectedSkillLevel = "";
      this.game.canvas.dataset.selectedSkillLocked = "";
      this.game.canvas.dataset.selectedSkillTooltip = "";
    }

    this.addPanelButton(456, 420, 86, 34, "Level", () => this.levelSelectedSkill());
    this.addPanelButton(552, 420, 86, 34, "Slot 1", () => this.assignSelectedSkillToHotbar(1));
    this.addPanelButton(648, 420, 66, 34, "Potion", () => this.assignPotionToHotbar(2));
    this.addPanelButton(628, 476, 86, 28, "Close", () => this.closePanel());
    this.game.canvas.dataset.skillPanelButtons = "Level|Slot 1|Potion|Close";
    this.syncSkillDataset(state, dataRegistry);
  }

  private renderInventoryPanel(state: GameState, dataRegistry: DataRegistry): void {
    this.addPanelRectangle(92, 72, 616, 442, panelFill, 0.94)
      .setOrigin(0)
      .setStrokeStyle(2, panelStroke, 0.92);
    this.addPanelText(118, 94, "Inventory", 24, "#f8fafc");
    this.addPanelText(118, 128, `Gold ${state.inventory.gold}   Weight ${this.getInventoryWeight(state)}/${this.getWeightLimit(state, dataRegistry)}`, 15, "#fde68a");
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
      this.addPanelText(152, y - 2, isItemRefinable(item) ? getRefinedItemName(state.inventory, item) : getVisibleItemName(state.inventory, item), 15, "#f8fafc");
      this.addPanelText(374, y - 2, String(entry.quantity), 15, "#f8fafc");
      this.addPanelText(430, y - 2, getItemRarity(item), 15, this.getRarityColor(item));
    });

    const selectedEntry = inventoryEntries[selected] ?? null;
    const selectedItem = selectedEntry ? dataRegistry.getItem(selectedEntry.itemId) : null;
    this.syncSelectedInventoryDataset(selectedItem, selectedEntry?.quantity ?? null, selectedEntry?.source ?? null);
    this.renderItemDetails(selectedItem, selectedEntry);
    this.renderInventoryButtons(selectedItem);
  }

  private renderCraftingPanel(state: GameState, dataRegistry: DataRegistry): void {
    const recipes = getVisibleRecipes(state, dataRegistry.getRecipes())
      .sort((left, right) => left.requiredLevel - right.requiredLevel || left.name.localeCompare(right.name));
    const selected = this.clampSelectedCraftingIndex(recipes);
    const selectedRecipe = recipes[selected] ?? null;
    const outputItem = selectedRecipe ? dataRegistry.getItem(selectedRecipe.outputItemId) : null;
    const craftFailure = selectedRecipe ? canCraftRecipe(state, selectedRecipe, this.getCraftingContext(state, dataRegistry)) : null;

    this.addPanelRectangle(64, 54, 672, 500, panelFill, 0.96)
      .setOrigin(0)
      .setStrokeStyle(2, panelStroke, 0.92);
    this.addPanelText(92, 78, "Crafting", 23, "#f8fafc");
    this.addPanelText(92, 112, `Gold ${state.inventory.gold}   Known ${recipes.filter((recipe) => this.isCraftingRecipeUnlocked(state, recipe)).length}/${dataRegistry.getRecipes().length}`, 14, "#fde68a");
    this.addPanelText(92, 146, "Recipes", 14, "#94a3b8");

    recipes.slice(0, 9).forEach((recipe, index) => {
      const rowItem = dataRegistry.getItem(recipe.outputItemId);
      const locked = !this.isCraftingRecipeUnlocked(state, recipe);
      const y = 176 + index * 34;
      const row = this.addPanelRectangle(92, y - 6, 360, 28, index === selected ? 0x293548 : 0x18222c, 0.94)
        .setOrigin(0)
        .setStrokeStyle(1, index === selected ? 0xfacc15 : 0x334155, 0.9)
        .setInteractive({ useHandCursor: true });
      row.on("pointerdown", () => {
        this.selectedCraftingIndex = index;
        this.renderPanel();
      });
      this.addPanelText(104, y, this.truncateText(locked ? "Locked Recipe" : recipe.name, 26), 13, locked ? "#94a3b8" : "#f8fafc");
      this.addPanelText(306, y, `Lv ${recipe.requiredLevel}`, 12, state.playerProfile.level >= recipe.requiredLevel ? "#bbf7d0" : "#fca5a5");
      this.addPanelText(362, y, rowItem.type, 12, "#cbd5e1");
    });

    this.addPanelRectangle(482, 146, 220, 286, 0x17212b, 0.95)
      .setOrigin(0)
      .setStrokeStyle(1, 0x475569, 0.86);

    if (selectedRecipe && outputItem) {
      const locked = !this.isCraftingRecipeUnlocked(state, selectedRecipe);
      const materialText = getRecipeMaterialStatus(state.inventory, selectedRecipe)
        .map((material) => {
          const item = dataRegistry.getItem(material.itemId);
          return `${item.name} ${material.owned}/${material.required}`;
        })
        .join("; ");
      const statusText = craftFailure
        ? `Blocked: ${craftFailure.reason}`
        : "Ready";

      this.addPanelText(502, 168, this.truncateText(locked ? "Locked Recipe" : selectedRecipe.name, 22), 16, "#f8fafc");
      this.addPanelText(502, 198, `${outputItem.name} x${selectedRecipe.outputQuantity}`, 13, this.getRarityColor(outputItem));
      this.addPanelText(502, 224, `Gold ${selectedRecipe.requiredGold}   Region ${selectedRecipe.requiredRegionId ?? "Any"}`, 12, "#fde68a");
      this.addPanelText(502, 250, this.wrapText(materialText || "No materials", 25), 12, craftFailure?.reason === "missing-materials" ? "#fca5a5" : "#cbd5e1");
      this.addPanelText(502, 342, this.wrapText(statusText, 24), 13, craftFailure ? "#fca5a5" : "#bbf7d0");
      this.addPanelText(502, 372, this.wrapText(this.getRecipeUnlockText(selectedRecipe), 24), 12, locked ? "#94a3b8" : "#bbf7d0");
    } else {
      this.addPanelText(502, 184, "No recipe selected", 15, "#94a3b8");
    }

    this.addPanelButton(482, 450, 92, 34, "Craft", () => this.craftSelectedRecipe());
    this.addPanelButton(606, 502, 92, 28, "Close", () => this.closePanel());
    this.syncCraftingDataset(state, dataRegistry, recipes, selectedRecipe, outputItem, craftFailure);
  }

  private renderRefinementPanel(state: GameState, dataRegistry: DataRegistry): void {
    const entries = this.getInventoryPanelEntries(state.inventory.items, state.inventory.equipmentInstances)
      .filter((entry) => isItemRefinable(dataRegistry.getItem(entry.itemId)));
    const selected = this.clampSelectedRefinementIndex(entries);
    const selectedEntry = entries[selected] ?? null;
    const selectedItem = selectedEntry ? dataRegistry.getItem(selectedEntry.itemId) : null;
    const preview = getRefinementPreview(state, selectedItem);

    this.addPanelRectangle(76, 62, 648, 470, panelFill, 0.96)
      .setOrigin(0)
      .setStrokeStyle(2, panelStroke, 0.92);
    this.addPanelText(104, 86, "Refinement", 23, "#f8fafc");
    this.addPanelText(104, 120, `Gold ${state.inventory.gold}`, 15, "#fde68a");
    this.addPanelText(104, 154, "Gear", 14, "#94a3b8");

    entries.slice(0, 8).forEach((entry, index) => {
      const item = dataRegistry.getItem(entry.itemId);
      const level = getRefineLevel(state.inventory, item.id);
      const y = 184 + index * 34;
      const row = this.addPanelRectangle(104, y - 6, 338, 28, index === selected ? 0x293548 : 0x18222c, 0.94)
        .setOrigin(0)
        .setStrokeStyle(1, index === selected ? 0xfacc15 : 0x334155, 0.9)
        .setInteractive({ useHandCursor: true });
      row.on("pointerdown", () => {
        this.selectedRefinementIndex = index;
        this.renderPanel();
      });
      this.addPanelText(116, y, this.truncateText(getRefinedItemName(state.inventory, item), 25), 13, "#f8fafc");
      this.addPanelText(326, y, `+${level}`, 13, level > 0 ? "#fde68a" : "#94a3b8");
      this.addPanelText(374, y, entry.source, 12, "#cbd5e1");
    });

    this.addPanelRectangle(472, 154, 220, 254, 0x17212b, 0.95)
      .setOrigin(0)
      .setStrokeStyle(1, 0x475569, 0.86);

    if (selectedItem) {
      const materialText = preview.materials
        .map((material) => `${dataRegistry.getItem(material.itemId).name} ${material.owned}/${material.required}`)
        .join("; ");
      const statusText = preview.canRefine ? "Ready" : `Blocked: ${preview.blockReason}`;

      this.addPanelText(492, 176, this.truncateText(getRefinedItemName(state.inventory, selectedItem), 22), 16, "#f8fafc");
      this.addPanelText(492, 206, `Target +${preview.targetLevel}   Chance ${Math.round(preview.successChance * 100)}%`, 13, "#bbf7d0");
      this.addPanelText(492, 232, `Cost ${preview.goldCost}g`, 13, "#fde68a");
      this.addPanelText(492, 260, this.wrapText(materialText || "No materials", 25), 12, preview.blockReason === "missing-materials" ? "#fca5a5" : "#cbd5e1");
      this.addPanelText(492, 334, this.wrapText(preview.failureResult, 25), 12, "#fbbf24");
      this.addPanelText(492, 372, statusText, 13, preview.canRefine ? "#bbf7d0" : "#fca5a5");
    } else {
      this.addPanelText(492, 190, "No refinable item", 15, "#94a3b8");
    }

    this.addPanelButton(472, 430, 92, 34, "Refine", () => this.refineSelectedItem());
    this.addPanelButton(600, 478, 92, 28, "Close", () => this.closePanel());
    this.syncRefinementDataset(state, entries, selectedItem, preview);
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

    this.addPanelText(532, 246, this.state && isItemRefinable(item) ? getRefinedItemName(this.state.inventory, item) : this.state ? getVisibleItemName(this.state.inventory, item) : item.name, 17, "#f8fafc");
    this.addPanelText(532, 276, entry.source === "equipment" ? "Quantity 1" : `Quantity ${entry.quantity}`, 14, "#cbd5e1");
    this.addPanelText(532, 300, getItemRarity(item), 14, this.getRarityColor(item));
    this.addPanelText(532, 332, this.wrapText(this.state ? getVisibleItemDescription(this.state.inventory, item) : item.description, 20), 13, "#cbd5e1");
    this.addPanelText(532, 386, `Sell ${getItemSellValue(item)}`, 13, "#fde68a");
  }

  private renderInventoryButtons(item: ItemDefinition | null): void {
    const useLabel = item && getItemEquipmentSlot(item) ? "Equip" : "Use";
    this.addPanelButton(512, 430, 78, 34, useLabel, () => this.useSelectedInventoryItem());
    this.addPanelButton(598, 430, 78, 34, "Drop", () => this.dropSelectedInventoryItem());
    this.addPanelButton(598, 476, 78, 28, "Close", () => this.closePanel());
    this.game.canvas.dataset.inventoryButtons = `${useLabel}|Drop|Close`;
  }

  private renderShopPanel(state: GameState, dataRegistry: DataRegistry): void {
    const shop = this.getActiveShop(dataRegistry);
    const inventoryEntries = this.getInventoryPanelEntries(state.inventory.items, state.inventory.equipmentInstances);
    const selectedStockIndex = this.clampSelectedShopIndex(shop.stock);
    const selectedStock = shop.stock[selectedStockIndex] ?? null;
    const selectedStockItem = selectedStock ? dataRegistry.getItem(selectedStock.itemId) : null;
    const selectedInventory = inventoryEntries[this.clampSelectedMarketInventoryIndex(inventoryEntries)] ?? null;
    const selectedInventoryItem = selectedInventory ? dataRegistry.getItem(selectedInventory.itemId) : null;

    this.addPanelRectangle(64, 54, 672, 500, panelFill, 0.96)
      .setOrigin(0)
      .setStrokeStyle(2, panelStroke, 0.92);
    this.addPanelText(92, 78, shop.name, 23, "#f8fafc");
    this.addPanelText(92, 112, `Gold ${state.inventory.gold}`, 15, "#fde68a");
    this.addPanelText(92, 146, "Stock", 14, "#94a3b8");
    this.addPanelText(392, 146, "Inventory Sell", 14, "#94a3b8");

    shop.stock.forEach((stock, index) => {
      const item = dataRegistry.getItem(stock.itemId);
      const y = 176 + index * 34;
      const row = this.addPanelRectangle(92, y - 6, 268, 28, index === selectedStockIndex ? 0x293548 : 0x18222c, 0.94)
        .setOrigin(0)
        .setStrokeStyle(1, index === selectedStockIndex ? 0xfacc15 : 0x334155, 0.9)
        .setInteractive({ useHandCursor: true });
      row.on("pointerdown", () => {
        this.selectedShopIndex = index;
        this.renderPanel();
      });
      this.addPanelText(104, y, item.name, 13, "#f8fafc");
      this.addPanelText(282, y, `${getShopBuyPrice(item, stock)}g`, 13, "#fde68a");
      this.addPanelText(326, y, `x${stock.quantity}`, 12, "#cbd5e1");
    });

    inventoryEntries.slice(0, 7).forEach((entry, index) => {
      const item = dataRegistry.getItem(entry.itemId);
      const y = 176 + index * 34;
      const row = this.addPanelRectangle(392, y - 6, 268, 28, index === this.selectedMarketInventoryIndex ? 0x293548 : 0x18222c, 0.94)
        .setOrigin(0)
        .setStrokeStyle(1, index === this.selectedMarketInventoryIndex ? 0xfacc15 : 0x334155, 0.9)
        .setInteractive({ useHandCursor: true });
      row.on("pointerdown", () => {
        this.selectedMarketInventoryIndex = index;
        this.renderPanel();
      });
      this.addPanelText(404, y, getVisibleItemName(state.inventory, item), 13, "#f8fafc");
      this.addPanelText(582, y, `${getMarketSellValue(item)}g`, 13, "#fde68a");
      this.addPanelText(626, y, `x${entry.quantity}`, 12, "#cbd5e1");
    });

    this.renderMarketDetails(92, 432, "Buy", selectedStockItem, selectedStock ? getShopBuyPrice(selectedStockItem!, selectedStock) : 0, () => this.buySelectedShopItem());
    this.renderMarketDetails(392, 432, "Sell", selectedInventoryItem, selectedInventoryItem ? getMarketSellValue(selectedInventoryItem) : 0, () => this.sellSelectedMarketItem());
    this.addPanelButton(636, 512, 78, 28, "Close", () => this.closePanel());
    this.syncShopDataset(shop, selectedStockItem, selectedInventoryItem, state.inventory.gold);
  }

  private renderAppraiserPanel(state: GameState, dataRegistry: DataRegistry): void {
    const shop = this.getActiveShop(dataRegistry);
    const inventoryEntries = this.getInventoryPanelEntries(state.inventory.items, state.inventory.equipmentInstances);
    const selected = inventoryEntries[this.clampSelectedMarketInventoryIndex(inventoryEntries)] ?? null;
    const item = selected ? dataRegistry.getItem(selected.itemId) : null;
    const appraiser = shop.appraiser;
    const improvedSellMultiplier = appraiser?.improvedSellMultiplier ?? 1.25;
    const appraisalCost = item ? getAppraisalCost(item, appraiser) : 0;
    const improvedSellValue = item ? getMarketSellValue(item, improvedSellMultiplier) : 0;

    this.addPanelRectangle(70, 60, 660, 470, panelFill, 0.96)
      .setOrigin(0)
      .setStrokeStyle(2, panelStroke, 0.92);
    this.addPanelText(96, 84, shop.name, 23, "#f8fafc");
    this.addPanelText(96, 118, `Gold ${state.inventory.gold}   Appraisal from ${appraisalCost}g   Sell bonus x${improvedSellMultiplier}`, 14, "#fde68a");
    this.addPanelText(96, 152, "Inventory", 14, "#94a3b8");

    inventoryEntries.slice(0, 8).forEach((entry, index) => {
      const rowItem = dataRegistry.getItem(entry.itemId);
      const y = 182 + index * 34;
      const row = this.addPanelRectangle(96, y - 6, 352, 28, index === this.selectedMarketInventoryIndex ? 0x293548 : 0x18222c, 0.94)
        .setOrigin(0)
        .setStrokeStyle(1, index === this.selectedMarketInventoryIndex ? 0xfacc15 : 0x334155, 0.9)
        .setInteractive({ useHandCursor: true });
      row.on("pointerdown", () => {
        this.selectedMarketInventoryIndex = index;
        this.renderPanel();
      });
      this.addPanelText(108, y, getVisibleItemName(state.inventory, rowItem), 13, "#f8fafc");
      this.addPanelText(318, y, isItemAppraised(state.inventory, rowItem) ? "Known" : "Unknown", 12, isItemAppraised(state.inventory, rowItem) ? "#bbf7d0" : "#fca5a5");
      this.addPanelText(386, y, `${getMarketSellValue(rowItem, improvedSellMultiplier)}g`, 13, "#fde68a");
    });

    this.addPanelRectangle(476, 158, 210, 250, 0x17212b, 0.95)
      .setOrigin(0)
      .setStrokeStyle(1, 0x475569, 0.86);
    if (item) {
      const known = isItemAppraised(state.inventory, item);
      this.addPanelText(496, 180, getVisibleItemName(state.inventory, item), 16, "#f8fafc");
      this.addPanelText(496, 212, `${getItemRarity(item)} ${item.type}`, 13, this.getRarityColor(item));
      this.addPanelText(496, 240, this.wrapText(getVisibleItemDescription(state.inventory, item), 24), 12, "#cbd5e1");
      this.addPanelText(496, 318, `Appraise ${known ? "Done" : `${appraisalCost}g`}`, 13, known ? "#bbf7d0" : "#fde68a");
      this.addPanelText(496, 346, `Sell+ ${improvedSellValue}g`, 13, "#fde68a");
    } else {
      this.addPanelText(496, 212, "No item selected", 15, "#94a3b8");
    }

    this.addPanelButton(476, 426, 90, 34, "Appraise", () => this.appraiseSelectedMarketItem());
    this.addPanelButton(576, 426, 74, 34, "Sell+", () => this.sellSelectedMarketItem(improvedSellMultiplier));
    this.addPanelButton(596, 484, 90, 28, "Close", () => this.closePanel());
    this.syncAppraiserDataset(shop, item, state.inventory.gold, appraisalCost, improvedSellValue);
  }

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
    this.addPanelText(72, 72, "Storage", 24, "#f8fafc");
    this.addPanelText(72, 106, `Gold ${state.inventory.gold}   Search ${this.storageSearchText || "*"}`, 14, "#fde68a");

    this.addPanelButton(72, 132, 104, 30, `Type ${this.storageCategoryFilter}`, () => this.cycleStorageCategoryFilter());
    this.addPanelButton(184, 132, 112, 30, `Rarity ${this.storageRarityFilter}`, () => this.cycleStorageRarityFilter());
    this.addPanelButton(304, 132, 104, 30, `Class ${this.storageClassFilter}`, () => this.cycleStorageClassFilter());
    this.addPanelButton(416, 132, 104, 30, `Level ${this.storageLevelFilter}`, () => this.cycleStorageLevelFilter());
    this.addPanelButton(528, 132, 104, 30, `Sort ${this.storageSortMode}`, () => this.cycleStorageSortMode());
    this.addPanelButton(640, 132, 76, 30, "Clear", () => this.clearStorageSearch());

    this.addPanelText(72, 178, `Inventory ${inventoryEntries.length}`, 14, "#94a3b8");
    this.addPanelText(416, 178, `Stored ${storageEntries.length}`, 14, "#94a3b8");
    this.renderStorageEntryRows(72, 204, inventoryRows, this.storageInventoryPage, this.selectedStorageInventoryIndex, state, dataRegistry, (index) => {
      this.selectedStorageInventoryIndex = index;
      this.renderPanel();
    });
    this.renderStorageEntryRows(416, 204, storageRows, this.storagePage, this.selectedStorageIndex, state, dataRegistry, (index) => {
      this.selectedStorageIndex = index;
      this.renderPanel();
    });

    this.addPanelButton(72, 450, 68, 30, "Prev", () => this.changeStorageInventoryPage(-1, inventoryEntries.length));
    this.addPanelButton(148, 450, 68, 30, "Next", () => this.changeStorageInventoryPage(1, inventoryEntries.length));
    this.addPanelButton(260, 450, 86, 34, "Deposit", () => this.depositSelectedStorageItem());
    this.addPanelButton(416, 450, 68, 30, "Prev", () => this.changeStoragePage(-1, storageEntries.length));
    this.addPanelButton(492, 450, 68, 30, "Next", () => this.changeStoragePage(1, storageEntries.length));
    this.addPanelButton(604, 450, 92, 34, "Withdraw", () => this.withdrawSelectedStorageItem());
    this.addPanelButton(604, 502, 92, 28, "Close", () => this.closePanel());

    this.renderStorageDetails(72, 492, "Inventory", selectedInventoryItem, selectedInventory);
    this.renderStorageDetails(416, 492, "Stored", selectedStorageItem, selectedStorage);
    this.syncStorageDataset(state, dataRegistry, inventoryEntries, storageEntries, selectedInventoryItem, selectedStorageItem);
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
      const row = this.addPanelRectangle(x, rowY - 5, 300, 30, selected ? 0x293548 : 0x18222c, 0.94)
        .setOrigin(0)
        .setStrokeStyle(1, selected ? 0xfacc15 : 0x334155, 0.9)
        .setInteractive({ useHandCursor: true });
      row.on("pointerdown", () => select(index));
      row.on("pointerover", () => this.showComparison(item));
      this.addPanelRectangle(x + 10, rowY + 2, 16, 16, this.getItemIconColor(item), 0.94)
        .setOrigin(0)
        .setStrokeStyle(1, 0xf8fafc, 0.58);
      this.addPanelText(x + 34, rowY, this.truncateText(getVisibleItemName(state.inventory, item), 22), 13, "#f8fafc");
      this.addPanelText(x + 214, rowY, `x${entry.quantity}`, 12, "#cbd5e1");
      this.addPanelText(x + 250, rowY, getItemRarity(item), 12, this.getRarityColor(item));
    });

    if (rows.length === 0) {
      this.addPanelText(x + 10, y + 34, page > 0 ? "No entries on page" : "No items", 13, "#64748b");
    }
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

    this.addPanelText(x, y, text, 12, item ? "#cbd5e1" : "#64748b");
  }

  private renderMarketDetails(
    x: number,
    y: number,
    actionLabel: string,
    item: ItemDefinition | null,
    price: number,
    callback: () => void,
  ): void {
    this.addPanelRectangle(x, y, 268, 64, 0x17212b, 0.95)
      .setOrigin(0)
      .setStrokeStyle(1, 0x475569, 0.86);
    this.addPanelText(x + 14, y + 12, item ? item.name : "No item selected", 14, item ? "#f8fafc" : "#94a3b8");
    this.addPanelText(x + 14, y + 36, item ? `${getItemRarity(item)}   ${price}g` : "", 12, item ? this.getRarityColor(item) : "#94a3b8");
    this.addPanelButton(x + 174, y + 16, 72, 32, actionLabel, callback);
  }

  private renderEquipmentPanel(state: GameState, dataRegistry: DataRegistry): void {
    this.addPanelRectangle(70, 60, 660, 470, panelFill, 0.94)
      .setOrigin(0)
      .setStrokeStyle(2, panelStroke, 0.92);
    this.addPanelText(96, 84, "Equipment", 24, "#f8fafc");
    const stats = getEquipmentStats(state.equipment, (id) => dataRegistry.getItem(id), state.inventory.refinementLevels);
    const derivedStats = calculateDerivedStats(
      state,
      dataRegistry.getClass(state.character.archetype),
      (id) => dataRegistry.getItem(id),
      (id) => dataRegistry.getStatusEffect(id),
      (id) => dataRegistry.getSupport(id),
    );
    this.addPanelText(96, 120, `Attack ${derivedStats.physicalAttack}   Defense ${derivedStats.defense}   Gear ${this.getEquipmentBonusText(stats)}`, 15, "#bbf7d0");
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
    this.renderSelectedEquipmentDetails(state, dataRegistry);
    this.renderComparisonFrame();
    this.syncEquipmentDataset(state, dataRegistry);
  }

  private renderSelectedEquipmentDetails(state: GameState, dataRegistry: DataRegistry): void {
    const itemId = state.equipment[this.selectedEquipmentSlot];
    const item = itemId ? dataRegistry.getItem(itemId) : null;
    const name = item?.name ?? "Empty";
    const effects = item ? this.getItemModifierText(item) : "None";

    this.addPanelRectangle(96, 346, 386, 86, 0x17212b, 0.95)
      .setOrigin(0)
      .setStrokeStyle(1, 0x475569, 0.86);
    this.addPanelText(112, 360, `${equipmentSlotLabels[this.selectedEquipmentSlot]}: ${name}`, 14, item ? "#f8fafc" : "#94a3b8");
    this.addPanelText(112, 388, this.wrapText(`Effects: ${effects}`, 48), 12, item ? "#bbf7d0" : "#64748b");
  }

  private renderCharacterPanel(state: GameState, dataRegistry: DataRegistry): void {
    this.addPanelRectangle(56, 48, 688, 504, panelFill, 0.95)
      .setOrigin(0)
      .setStrokeStyle(2, panelStroke, 0.92);
    this.addPanelText(84, 72, "Character", 24, "#f8fafc");
    this.addPanelText(84, 108, `${state.playerProfile.name}   Lv ${state.playerProfile.level}   Points ${state.playerProfile.statPoints}`, 15, "#fde68a");
    this.addPanelText(84, 144, "Base Stats", 16, "#f8fafc");

    const totalStats = getTotalBaseStats(
      state,
      (id) => dataRegistry.getStatusEffect(id),
      (id) => dataRegistry.getSupport(id),
    );
    this.game.canvas.dataset.characterPanel = "visible";
    this.game.canvas.dataset.statAllocationPoints = String(state.playerProfile.statPoints);

    baseStatKeys.forEach((key, index) => {
      const y = 174 + index * 42;
      const cost = getStatCost(totalStats[key]);
      const canIncrease = state.playerProfile.statPoints >= cost;

      this.addPanelText(92, y, baseStatLabels[key], 15, "#94a3b8");
      this.addPanelText(152, y, String(totalStats[key]), 15, "#f8fafc");
      this.addPanelText(198, y, `Cost ${cost}`, 13, canIncrease ? "#bbf7d0" : "#fca5a5");
      this.addPanelButton(270, y - 8, 34, 30, "+", () => this.increaseStat(key));
    });

    this.addPanelText(342, 144, "Derived Stats", 16, "#f8fafc");
    const derived = calculateDerivedStats(
      state,
      dataRegistry.getClass(state.character.archetype),
      (id) => dataRegistry.getItem(id),
      (id) => dataRegistry.getStatusEffect(id),
      (id) => dataRegistry.getSupport(id),
    );
    const rows = [
      ["Max HP", derived.maxHp],
      ["Max SP", derived.maxSp],
      ["Physical ATK", derived.physicalAttack],
      ["Ranged ATK", derived.rangedAttack],
      ["Magic ATK", derived.magicAttack],
      ["Defense", derived.defense],
      ["Magic DEF", derived.magicDefense],
      ["Hit", derived.hit],
      ["Dodge", derived.dodge],
      ["Crit", `${derived.crit}%`],
      ["Attack Speed", derived.attackSpeed],
      ["Cast Speed", derived.castSpeed],
      ["Move Speed", derived.moveSpeed],
      ["Weight Limit", derived.weightLimit],
    ] as const;

    rows.forEach(([label, value], index) => {
      const column = index < 7 ? 0 : 1;
      const row = index % 7;
      const x = 342 + column * 178;
      const y = 174 + row * 36;
      this.addPanelText(x, y, label, 13, "#94a3b8");
      this.addPanelText(x + 104, y, String(value), 13, "#f8fafc");
    });

    this.addPanelText(84, 420, `Auto HP ${state.character.consumables.autoPotion.hpThresholdPercent}%`, 13, "#fca5a5");
    this.addPanelText(204, 420, `Auto SP ${state.character.consumables.autoPotion.spThresholdPercent}%`, 13, "#93c5fd");
    this.addPanelText(326, 420, `Support ${state.support.autoPickupFilter}`, 13, "#67e8f9");
    this.addPanelButton(84, 440, 92, 28, "HP Auto", () => this.cycleAutoPotion("hp"));
    this.addPanelButton(188, 440, 92, 28, "SP Auto", () => this.cycleAutoPotion("sp"));
    this.addPanelButton(292, 440, 112, 28, "Support", () => this.cycleSupportFilter());
    this.addPanelButton(84, 468, 120, 34, "Confirm", () => this.confirmStats());
    this.addPanelButton(216, 468, 120, 34, "Reset", () => this.requestStatReset());
    this.addPanelButton(348, 468, 86, 34, "Close", () => this.closePanel());
    this.game.canvas.dataset.characterPanelButtons = "HP Auto|SP Auto|Support|Confirm|Reset|Close";
    this.game.canvas.dataset.autoPotionSettings = getAutoPotionSettingsSummary(state);
    this.syncSupportDataset(state, dataRegistry);
  }

  private renderComparisonFrame(): void {
    this.addPanelRectangle(520, 346, 170, 138, 0x17212b, 0.95)
      .setOrigin(0)
      .setStrokeStyle(1, 0x475569, 0.86);
    this.addPanelText(536, 362, "Comparison", 16, "#f8fafc");
    this.addPanelText(536, 392, "Hover gear to compare.", 13, "#94a3b8");
  }

  private showComparison(item: ItemDefinition): void {
    if (!this.state || !this.dataRegistry || !getItemEquipmentSlot(item, this.state.equipment)) {
      this.game.canvas.dataset.itemComparison = "hidden";
      return;
    }

    const slot = getItemEquipmentSlot(item, this.state.equipment)!;
    const currentItem = this.state.equipment[slot] ? this.dataRegistry.getItem(this.state.equipment[slot]!) : null;
    const { delta } = compareEquipmentItems(currentItem, item);
    const attackDelta = delta.attack;
    const defenseDelta = delta.defense;
    const effectText = this.getItemModifierText(item);
    const comparison = [
      `current=${currentItem?.name ?? "Empty"}`,
      `new=${item.name}`,
      `attack=${this.formatDelta(attackDelta)}`,
      `defense=${this.formatDelta(defenseDelta)}`,
      `requirements=${this.getItemRequirementText(item)}`,
      `effects=${effectText}`,
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
      this.addComparisonText(536, 468, this.wrapText(`Req ${this.getItemRequirementText(item)}   FX ${effectText}`, 24), 11, "#94a3b8");
    } else if (this.activePanel === "inventory") {
      this.addComparisonRectangle(112, 390, 382, 96, 0x17212b, 0.95)
        .setOrigin(0)
        .setStrokeStyle(1, 0x475569, 0.86);
      this.addComparisonText(128, 404, "Compare", 14, "#f8fafc");
      this.addComparisonText(128, 430, this.wrapText(`Current: ${currentItem?.name ?? "Empty"}`, 26), 12, "#cbd5e1");
      this.addComparisonText(292, 430, this.wrapText(`New: ${item.name}`, 24), 12, "#cbd5e1");
      this.addComparisonText(128, 468, `ATK ${this.formatDelta(attackDelta)}   DEF ${this.formatDelta(defenseDelta)}`, 12, attackDelta >= 0 && defenseDelta >= 0 ? "#bbf7d0" : "#fca5a5");
      this.addComparisonText(292, 468, this.wrapText(`Req ${this.getItemRequirementText(item)}   FX ${effectText}`, 24), 11, "#94a3b8");
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
      const equipped = equipItem(
        this.state,
        item,
        true,
        this.dataRegistry.getClass(this.state.character.archetype),
        undefined,
        (id) => this.dataRegistry!.getItem(id),
      );
      this.game.canvas.dataset.lastInventoryAction = equipped ? `equip:${item.id}` : `equip-failed:${item.id}`;
      return;
    }

    if (item.type === "consumable") {
      const result = useConsumableItem(
        this.state,
        item,
        (id) => this.dataRegistry!.getStatusEffect(id),
      );
      this.game.canvas.dataset.lastInventoryAction = result.success
        ? `use:${item.id}`
        : `use-failed:${item.id}:${result.reason}`;
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

  private buySelectedShopItem(): void {
    if (!this.state || !this.dataRegistry) {
      return;
    }

    const shop = this.getActiveShop(this.dataRegistry);
    const stock = shop.stock[this.clampSelectedShopIndex(shop.stock)];
    const result = buyShopItem(
      this.state,
      shop,
      stock,
      (id) => this.dataRegistry!.getItem(id),
    );

    this.game.canvas.dataset.lastShopAction = result.success
      ? `buy:${result.itemId}:${result.price}:${result.gold}`
      : `buy-failed:${result.reason}:${result.itemId}:${result.price}:${result.gold}`;
    this.refreshOpenPanel();
  }

  private sellSelectedMarketItem(sellMultiplier = 1): void {
    if (!this.state || !this.dataRegistry) {
      return;
    }

    const entries = this.getInventoryPanelEntries(this.state.inventory.items, this.state.inventory.equipmentInstances);
    const entry = entries[this.clampSelectedMarketInventoryIndex(entries)];
    const item = entry ? this.dataRegistry.getItem(entry.itemId) : undefined;
    const result = sellInventoryItem(this.state, item, 1, sellMultiplier);

    this.game.canvas.dataset.lastShopAction = result.success
      ? `sell:${result.itemId}:${result.price}:${result.gold}`
      : `sell-failed:${result.reason}:${result.itemId}:${result.price}:${result.gold}`;
    this.refreshOpenPanel();
  }

  private appraiseSelectedMarketItem(): void {
    if (!this.state || !this.dataRegistry) {
      return;
    }

    const shop = this.getActiveShop(this.dataRegistry);
    const entries = this.getInventoryPanelEntries(this.state.inventory.items, this.state.inventory.equipmentInstances);
    const entry = entries[this.clampSelectedMarketInventoryIndex(entries)];
    const item = entry ? this.dataRegistry.getItem(entry.itemId) : undefined;
    const result = appraiseInventoryItem(this.state, item, shop.appraiser);

    this.game.canvas.dataset.lastAppraiserAction = result.success
      ? `appraise:${result.itemId}:${result.price}:${result.gold}`
      : `appraise-failed:${result.reason}:${result.itemId}:${result.price}:${result.gold}`;
    this.refreshOpenPanel();
  }

  private craftSelectedRecipe(): void {
    if (!this.state || !this.dataRegistry) {
      return;
    }

    const recipes = getVisibleRecipes(this.state, this.dataRegistry.getRecipes())
      .sort((left, right) => left.requiredLevel - right.requiredLevel || left.name.localeCompare(right.name));
    const recipe = recipes[this.clampSelectedCraftingIndex(recipes)];

    if (!recipe) {
      this.game.canvas.dataset.lastCraftingAction = "craft-failed:no-recipe";
      return;
    }

    const result = craftRecipe(
      this.state,
      recipe,
      (id) => this.dataRegistry!.getItem(id),
      this.getCraftingContext(this.state, this.dataRegistry),
    );

    this.game.canvas.dataset.lastCraftingAction = result.success
      ? `craft:${result.recipeId}:${result.itemId}:${result.quantity}:${result.gold}`
      : `craft-failed:${result.reason}:${result.recipeId}`;
    this.refreshOpenPanel();
  }

  private refineSelectedItem(): void {
    if (!this.state || !this.dataRegistry) {
      return;
    }

    const entries = this.getInventoryPanelEntries(this.state.inventory.items, this.state.inventory.equipmentInstances)
      .filter((entry) => isItemRefinable(this.dataRegistry!.getItem(entry.itemId)));
    const entry = entries[this.clampSelectedRefinementIndex(entries)];
    const item = entry ? this.dataRegistry.getItem(entry.itemId) : null;
    const result = refineItem(this.state, item);

    this.game.canvas.dataset.lastRefinementAction = result.success
      ? `success:${result.itemId}:${result.previousLevel}->${result.nextLevel}:${result.consumedGold}`
      : `failed:${result.reason}:${result.itemId}:${result.previousLevel}->${result.nextLevel}:${result.consumedGold}`;
    this.syncDerivedStatsDataset(this.state, this.dataRegistry);
    this.refreshOpenPanel();
  }

  private depositSelectedStorageItem(): void {
    if (!this.state || !this.dataRegistry) {
      return;
    }

    const { inventoryEntries } = this.getFilteredStoragePanelEntries(this.state, this.dataRegistry);
    const entry = inventoryEntries[this.clampStorageInventoryIndex(inventoryEntries)];
    const item = entry ? this.dataRegistry.getItem(entry.itemId) : undefined;
    const result = depositStorageItem(this.state, item, 1);

    this.game.canvas.dataset.lastStorageAction = result.success
      ? `deposit:${result.itemId}:${result.quantity}:${result.storageQuantity}:${result.gold}`
      : `deposit-failed:${result.reason}:${result.itemId}:${result.gold}`;
    this.refreshOpenPanel();
  }

  private withdrawSelectedStorageItem(): void {
    if (!this.state || !this.dataRegistry) {
      return;
    }

    const { storageEntries } = this.getFilteredStoragePanelEntries(this.state, this.dataRegistry);
    const entry = storageEntries[this.clampStorageIndex(storageEntries)];
    const item = entry ? this.dataRegistry.getItem(entry.itemId) : undefined;
    const result = withdrawStorageItem(this.state, item, 1);

    this.game.canvas.dataset.lastStorageAction = result.success
      ? `withdraw:${result.itemId}:${result.quantity}:${result.inventoryQuantity}:${result.gold}`
      : `withdraw-failed:${result.reason}:${result.itemId}:${result.gold}`;
    this.refreshOpenPanel();
  }

  private cycleStorageCategoryFilter(): void {
    const filters: StorageCategoryFilter[] = ["all", "equipment", "consumable", "material"];
    this.storageCategoryFilter = this.getNextValue(filters, this.storageCategoryFilter);
    this.resetStorageSelections();
    this.renderPanel();
  }

  private cycleStorageRarityFilter(): void {
    const filters: Array<ItemRarity | "all"> = ["all", "Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"];
    this.storageRarityFilter = this.getNextValue(filters, this.storageRarityFilter);
    this.resetStorageSelections();
    this.renderPanel();
  }

  private cycleStorageClassFilter(): void {
    const filters: StorageClassFilter[] = ["all", "current"];
    this.storageClassFilter = this.getNextValue(filters, this.storageClassFilter);
    this.resetStorageSelections();
    this.renderPanel();
  }

  private cycleStorageLevelFilter(): void {
    const filters: StorageLevelFilter[] = ["all", "usable"];
    this.storageLevelFilter = this.getNextValue(filters, this.storageLevelFilter);
    this.resetStorageSelections();
    this.renderPanel();
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
    this.renderPanel();
  }

  private clearStorageSearch(): void {
    this.storageSearchText = "";
    this.storageCategoryFilter = "all";
    this.storageRarityFilter = "all";
    this.storageClassFilter = "all";
    this.storageLevelFilter = "all";
    this.resetStorageSelections();
    this.renderPanel();
  }

  private changeStorageInventoryPage(delta: number, entryCount: number): void {
    this.storageInventoryPage = this.clampStoragePage(this.storageInventoryPage + delta, entryCount);
    this.selectedStorageInventoryIndex = Math.min(this.selectedStorageInventoryIndex, Math.max(0, entryCount - 1));
    this.renderPanel();
  }

  private changeStoragePage(delta: number, entryCount: number): void {
    this.storagePage = this.clampStoragePage(this.storagePage + delta, entryCount);
    this.selectedStorageIndex = Math.min(this.selectedStorageIndex, Math.max(0, entryCount - 1));
    this.renderPanel();
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

  private clampStorageInventoryIndex(entries: StorageListEntry[]): number {
    this.selectedStorageInventoryIndex = Phaser.Math.Clamp(
      this.selectedStorageInventoryIndex,
      0,
      Math.max(0, entries.length - 1),
    );
    return this.selectedStorageInventoryIndex;
  }

  private clampStorageIndex(entries: StorageListEntry[]): number {
    this.selectedStorageIndex = Phaser.Math.Clamp(
      this.selectedStorageIndex,
      0,
      Math.max(0, entries.length - 1),
    );
    return this.selectedStorageIndex;
  }

  private clampStoragePage(page: number, entryCount: number): number {
    const maxPage = Math.max(0, Math.ceil(entryCount / this.getStoragePageSize()) - 1);
    return Phaser.Math.Clamp(page, 0, maxPage);
  }

  private getStoragePageSize(): number {
    return 6;
  }

  private resetStorageSelections(): void {
    this.selectedStorageInventoryIndex = 0;
    this.selectedStorageIndex = 0;
    this.storageInventoryPage = 0;
    this.storagePage = 0;
  }

  private syncStorageDataset(
    state: GameState,
    dataRegistry: DataRegistry,
    inventoryEntries: StorageListEntry[],
    storageEntries: StorageListEntry[],
    selectedInventoryItem: ItemDefinition | null,
    selectedStorageItem: ItemDefinition | null,
  ): void {
    this.game.canvas.dataset.shopPanel = "hidden";
    this.game.canvas.dataset.appraiserPanel = "hidden";
    this.game.canvas.dataset.storagePanel = "visible";
    this.game.canvas.dataset.activeStorageNpc = this.activeStorageNpcId;
    this.game.canvas.dataset.storageFilterCategory = this.storageCategoryFilter;
    this.game.canvas.dataset.storageFilterRarity = this.storageRarityFilter;
    this.game.canvas.dataset.storageFilterClass = this.storageClassFilter;
    this.game.canvas.dataset.storageFilterLevel = this.storageLevelFilter;
    this.game.canvas.dataset.storageSearch = this.storageSearchText;
    this.game.canvas.dataset.storageSort = `${this.storageSortMode}:${this.storageSortDirection}`;
    this.game.canvas.dataset.storageInventoryItemCount = String(inventoryEntries.length);
    this.game.canvas.dataset.storageItemCount = String(storageEntries.length);
    this.game.canvas.dataset.storageStackCount = String(state.storage.items.length);
    this.game.canvas.dataset.storageEquipmentInstanceCount = String(state.storage.equipmentInstances.length);
    this.game.canvas.dataset.storageVisibleInventoryItems = inventoryEntries.map((entry) => entry.itemId).join("|");
    this.game.canvas.dataset.storageVisibleItems = storageEntries.map((entry) => entry.itemId).join("|");
    this.game.canvas.dataset.storageInventoryPage = String(this.storageInventoryPage);
    this.game.canvas.dataset.storagePage = String(this.storagePage);
    this.game.canvas.dataset.selectedStorageInventoryItem = selectedInventoryItem?.id ?? "";
    this.game.canvas.dataset.selectedStorageInventoryItemName = selectedInventoryItem ? getVisibleItemName(state.inventory, selectedInventoryItem) : "";
    this.game.canvas.dataset.selectedStorageItem = selectedStorageItem?.id ?? "";
    this.game.canvas.dataset.selectedStorageItemName = selectedStorageItem ? getVisibleItemName(state.inventory, selectedStorageItem) : "";
    this.game.canvas.dataset.storageButtons = "Deposit|Withdraw|Close";
    this.game.canvas.dataset.inventoryGold = String(state.inventory.gold);
    this.game.canvas.dataset.playerGold = String(state.inventory.gold);
    this.game.canvas.dataset.storageClassFilteredItems = inventoryEntries
      .concat(storageEntries)
      .filter((entry) => {
        const item = dataRegistry.getItem(entry.itemId);
        return (item.allowedClassIds ?? []).includes(state.character.archetype);
      })
      .map((entry) => entry.itemId)
      .join("|");
  }

  private syncCraftingDataset(
    state: GameState,
    dataRegistry: DataRegistry,
    recipes: RecipeDefinition[],
    selectedRecipe: RecipeDefinition | null,
    outputItem: ItemDefinition | null,
    craftFailure: ReturnType<typeof canCraftRecipe>,
  ): void {
    this.game.canvas.dataset.shopPanel = "hidden";
    this.game.canvas.dataset.appraiserPanel = "hidden";
    this.game.canvas.dataset.storagePanel = "hidden";
    this.game.canvas.dataset.craftingPanel = "visible";
    this.game.canvas.dataset.activeCraftingNpc = this.activeCraftingNpcId;
    this.game.canvas.dataset.craftingRecipeCount = String(recipes.length);
    this.game.canvas.dataset.visibleRecipes = recipes.map((recipe) => recipe.id).join("|");
    this.game.canvas.dataset.lockedRecipes = recipes
      .filter((recipe) => !this.isCraftingRecipeUnlocked(state, recipe))
      .map((recipe) => recipe.id)
      .join("|");
    this.game.canvas.dataset.unlockedRecipes = state.crafting.unlockedRecipeIds.join("|");
    this.game.canvas.dataset.recipeUnlockNotifications = state.crafting.unlockNotifications.join("|");
    this.game.canvas.dataset.selectedRecipe = selectedRecipe?.id ?? "";
    this.game.canvas.dataset.selectedRecipeName = selectedRecipe?.name ?? "";
    this.game.canvas.dataset.selectedRecipeOutput = outputItem?.id ?? "";
    this.game.canvas.dataset.selectedRecipeOutputName = outputItem?.name ?? "";
    this.game.canvas.dataset.selectedRecipeCanCraft = String(Boolean(selectedRecipe && !craftFailure));
    this.game.canvas.dataset.selectedRecipeBlockReason = craftFailure?.reason ?? "";
    this.game.canvas.dataset.selectedRecipeMissingMaterials = selectedRecipe
      ? getRecipeMaterialStatus(state.inventory, selectedRecipe)
        .filter((material) => material.missing > 0)
        .map((material) => `${material.itemId}:${material.missing}`)
        .join("|")
      : "";
    this.game.canvas.dataset.craftingButtons = "Craft|Close";
    this.game.canvas.dataset.inventoryGold = String(state.inventory.gold);
    this.game.canvas.dataset.playerGold = String(state.inventory.gold);
  }

  private syncRefinementDataset(
    state: GameState,
    entries: InventoryPanelEntry[],
    selectedItem: ItemDefinition | null,
    preview: RefinementPreview,
  ): void {
    this.game.canvas.dataset.shopPanel = "hidden";
    this.game.canvas.dataset.appraiserPanel = "hidden";
    this.game.canvas.dataset.storagePanel = "hidden";
    this.game.canvas.dataset.craftingPanel = "hidden";
    this.game.canvas.dataset.refinementPanel = "visible";
    this.game.canvas.dataset.activeRefinementNpc = this.activeRefinementNpcId;
    this.game.canvas.dataset.refinableItems = entries.map((entry) => entry.itemId).join("|");
    this.game.canvas.dataset.selectedRefinementItem = selectedItem?.id ?? "";
    this.game.canvas.dataset.selectedRefinementItemName = selectedItem ? getRefinedItemName(state.inventory, selectedItem) : "";
    this.game.canvas.dataset.selectedRefinementLevel = selectedItem ? String(getRefineLevel(state.inventory, selectedItem.id)) : "";
    this.game.canvas.dataset.selectedRefinementTargetLevel = selectedItem ? String(preview.targetLevel) : "";
    this.game.canvas.dataset.selectedRefinementCost = selectedItem ? String(preview.goldCost) : "";
    this.game.canvas.dataset.selectedRefinementMaterials = preview.materials
      .map((material) => `${material.itemId}:${material.owned}/${material.required}`)
      .join("|");
    this.game.canvas.dataset.selectedRefinementSuccessChance = selectedItem ? String(preview.successChance) : "";
    this.game.canvas.dataset.selectedRefinementFailureResult = selectedItem ? preview.failureResult : "";
    this.game.canvas.dataset.selectedRefinementCanRefine = String(Boolean(selectedItem && preview.canRefine));
    this.game.canvas.dataset.selectedRefinementBlockReason = selectedItem ? preview.blockReason : "no-item";
    this.game.canvas.dataset.refinementButtons = "Refine|Close";
    this.game.canvas.dataset.inventoryGold = String(state.inventory.gold);
    this.game.canvas.dataset.playerGold = String(state.inventory.gold);
  }

  private getNextValue<T>(values: T[], current: T): T {
    const index = values.indexOf(current);
    return values[(index + 1) % values.length];
  }

  private removeSelectedEquipment(): void {
    if (!this.state) {
      return;
    }

    if (removeEquipment(this.state, this.selectedEquipmentSlot)) {
      this.game.canvas.dataset.lastEquipmentAction = `remove:${this.selectedEquipmentSlot}`;
    }
  }

  private getActiveShop(dataRegistry: DataRegistry): ShopDefinition {
    const shop = this.activeShopId ? dataRegistry.getShop(this.activeShopId) : dataRegistry.getShops()[0];

    if (!shop) {
      throw new Error("No shop data is available.");
    }

    return shop;
  }

  private getCraftingContext(state: GameState, dataRegistry: DataRegistry): { regionId?: string; npcId?: string } {
    return {
      regionId: dataRegistry.getMap(state.currentMapId).regionId,
      npcId: this.activeCraftingNpcId || undefined,
    };
  }

  private getDefaultCraftingNpcId(): string {
    if (!this.state || !this.dataRegistry) {
      return "";
    }

    const regionId = this.dataRegistry.getMap(this.state.currentMapId).regionId;
    const crafterByRegion: Record<string, string> = {
      crownfield: "nima-threadwell",
      mossvale: "nima-threadwell",
      "blueharbor-coast": "nima-threadwell",
      "amber-dunes": "amber-sun-crafter",
      "ironroot-highlands": "ironroot-forgemaster",
      "moonveil-marsh": "moonveil-relic-mender",
      "starfall-tower": "moonveil-relic-mender",
    };

    return crafterByRegion[regionId] ?? "";
  }

  private isCraftingRecipeUnlocked(state: GameState, recipe: RecipeDefinition): boolean {
    return recipe.unlockCondition.type === "default" || state.crafting.unlockedRecipeIds.includes(recipe.id);
  }

  private getRecipeUnlockText(recipe: RecipeDefinition): string {
    const condition = recipe.unlockCondition;

    if (condition.type === "default") {
      return "Known by default";
    }

    if (condition.type === "npc") {
      return `Unlocked by ${condition.npcId}`;
    }

    if (condition.type === "bossDrop") {
      return `Boss drop ${condition.bossId}`;
    }

    if (condition.type === "quest") {
      return `Quest ${condition.questId}`;
    }

    if (condition.type === "huntingBoard") {
      return `Board ${condition.boardId}`;
    }

    if (condition.type === "exploration") {
      return `Explore ${condition.regionId}`;
    }

    return `Bestiary ${condition.enemyId} x${condition.defeatCount}`;
  }

  private syncShopDataset(
    shop: ShopDefinition,
    selectedStockItem: ItemDefinition | null,
    selectedInventoryItem: ItemDefinition | null,
    gold: number,
  ): void {
    this.game.canvas.dataset.shopPanel = "visible";
    this.game.canvas.dataset.appraiserPanel = "hidden";
    this.game.canvas.dataset.activeShop = shop.id;
    this.game.canvas.dataset.activeShopName = shop.name;
    this.game.canvas.dataset.activeShopRegion = shop.regionId;
    this.game.canvas.dataset.shopStock = shop.stock.map((stock) => stock.itemId).join("|");
    this.game.canvas.dataset.shopStockPrices = shop.stock
      .map((stock) => getShopBuyPrice(this.dataRegistry!.getItem(stock.itemId), stock))
      .join("|");
    this.game.canvas.dataset.selectedShopItem = selectedStockItem?.id ?? "";
    this.game.canvas.dataset.selectedShopItemName = selectedStockItem?.name ?? "";
    this.game.canvas.dataset.selectedShopSellItem = selectedInventoryItem?.id ?? "";
    this.game.canvas.dataset.selectedShopSellValue = selectedInventoryItem ? String(getMarketSellValue(selectedInventoryItem)) : "";
    this.game.canvas.dataset.inventoryGold = String(gold);
    this.game.canvas.dataset.playerGold = String(gold);
  }

  private syncAppraiserDataset(
    shop: ShopDefinition,
    item: ItemDefinition | null,
    gold: number,
    appraisalCost: number,
    improvedSellValue: number,
  ): void {
    this.game.canvas.dataset.shopPanel = "hidden";
    this.game.canvas.dataset.appraiserPanel = "visible";
    this.game.canvas.dataset.activeShop = shop.id;
    this.game.canvas.dataset.activeShopName = shop.name;
    this.game.canvas.dataset.activeShopRegion = shop.regionId;
    this.game.canvas.dataset.appraiserIdentifyCost = item ? String(appraisalCost) : "";
    this.game.canvas.dataset.appraiserImprovedSellValue = item ? String(improvedSellValue) : "";
    this.game.canvas.dataset.selectedAppraiserItem = item?.id ?? "";
    this.game.canvas.dataset.selectedAppraiserItemName = item ? getVisibleItemName(this.state!.inventory, item) : "";
    this.game.canvas.dataset.selectedAppraiserItemKnown = item ? String(isItemAppraised(this.state!.inventory, item)) : "";
    this.game.canvas.dataset.selectedAppraiserItemDescription = item ? getVisibleItemDescription(this.state!.inventory, item) : "";
    this.game.canvas.dataset.appraisedItems = this.state?.inventory.appraisedItemIds.join("|") ?? "";
    this.game.canvas.dataset.inventoryGold = String(gold);
    this.game.canvas.dataset.playerGold = String(gold);
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

  private createBossFrame(): void {
    const centerX = Number(this.scale.width || 800) / 2;

    this.bossFrame = this.add.rectangle(centerX, 86, 430, 54, 0x1f1115, 0.88)
      .setStrokeStyle(2, 0xf43f5e, 0.95)
      .setScrollFactor(0)
      .setDepth(hudDepth)
      .setVisible(false);
    this.bossNameText = this.add.text(centerX - 204, 64, "", {
      color: "#fecdd3",
      fontFamily: "Arial, sans-serif",
      fontSize: "15px",
    })
      .setScrollFactor(0)
      .setDepth(hudDepth + 1)
      .setVisible(false);
    this.bossPhaseText = this.add.text(centerX + 134, 64, "", {
      color: "#fde68a",
      fontFamily: "Arial, sans-serif",
      fontSize: "13px",
    })
      .setScrollFactor(0)
      .setDepth(hudDepth + 1)
      .setVisible(false);
    this.bossHpBarBackground = this.add.rectangle(centerX - 204, 94, 408, 10, 0x111827, 0.95)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(hudDepth + 1)
      .setVisible(false);
    this.bossHpBarFill = this.add.rectangle(centerX - 204, 94, 1, 8, 0xf43f5e, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(hudDepth + 2)
      .setVisible(false);
    this.bossHpText = this.add.text(centerX - 20, 100, "", {
      color: "#f8fafc",
      fontFamily: "Arial, sans-serif",
      fontSize: "12px",
    })
      .setScrollFactor(0)
      .setDepth(hudDepth + 2)
      .setVisible(false);
    this.clearBossFrame();
  }

  private createMapLabel(mapId: string, dataRegistry: DataRegistry): void {
    const map = dataRegistry.getMap(mapId);

    this.mapNameText = this.add.text(348, 18, this.getMapLabel(map, dataRegistry), {
      color: "#f8fafc",
      fontFamily: "Arial, sans-serif",
      fontSize: "18px",
    })
      .setScrollFactor(0)
      .setDepth(hudDepth);
    this.updateMapMetadata(mapId, dataRegistry);
  }

  private updateMapMetadata(mapId: string, dataRegistry: DataRegistry): void {
    const map = dataRegistry.getMap(mapId);
    const region = dataRegistry.getRegion(map.regionId);

    this.mapNameText?.setText(this.getMapLabel(map, dataRegistry));
    this.game.canvas.dataset.currentMap = map.id;
    this.game.canvas.dataset.currentMapName = map.name;
    this.game.canvas.dataset.currentRegion = region.id;
    this.game.canvas.dataset.currentRegionName = region.name;
    this.game.canvas.dataset.currentRegionLevelRange = `${region.levelRange.min}-${region.levelRange.max}`;
    this.game.canvas.dataset.currentMapLevelRange = `${map.levelRange.min}-${map.levelRange.max}`;
    this.game.canvas.dataset.currentMapType = map.type;
    this.game.canvas.dataset.currentMapMusicKey = map.musicKey;
    this.game.canvas.dataset.currentMapRecommendedElements = map.recommendedElements.join("|");
    this.game.canvas.dataset.currentMapDropHighlights = map.dropHighlights.join("|");
    this.game.canvas.dataset.regionProgression = dataRegistry.getRegions()
      .map((entry) => `${entry.id}:${entry.levelRange.min}-${entry.levelRange.max}`)
      .join("|");
  }

  private getMapLabel(map: ReturnType<DataRegistry["getMap"]>, dataRegistry: DataRegistry): string {
    const region = dataRegistry.getRegion(map.regionId);
    return `${map.name} | ${region.name} Lv ${map.levelRange.min}-${map.levelRange.max}`;
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

  private setBossFrame(name: string, hp: number, maxHp: number, phase: number): void {
    const width = Math.max(0, Math.round(408 * (hp / maxHp)));

    this.bossFrame?.setVisible(true);
    this.bossNameText?.setText(name).setVisible(true);
    this.bossPhaseText?.setText(`Phase ${phase}`).setVisible(true);
    this.bossHpBarBackground?.setVisible(true);
    this.bossHpBarFill?.setDisplaySize(width, 8).setVisible(true);
    this.bossHpText?.setText(`HP ${hp}/${maxHp}`).setVisible(true);
    this.game.canvas.dataset.bossUi = "visible";
    this.game.canvas.dataset.bossUiName = name;
    this.game.canvas.dataset.bossUiHp = `${hp}/${maxHp}`;
    this.game.canvas.dataset.bossUiPhase = String(phase);
    this.game.canvas.dataset.bossUiBarWidth = String(width);
  }

  private clearBossFrame(): void {
    this.bossFrame?.setVisible(false);
    this.bossNameText?.setVisible(false);
    this.bossPhaseText?.setVisible(false);
    this.bossHpBarBackground?.setVisible(false);
    this.bossHpBarFill?.setVisible(false);
    this.bossHpText?.setVisible(false);
    this.game.canvas.dataset.bossUi = "hidden";
    this.game.canvas.dataset.bossUiName = "";
    this.game.canvas.dataset.bossUiHp = "";
    this.game.canvas.dataset.bossUiPhase = "";
    this.game.canvas.dataset.bossUiBarWidth = "0";
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
    this.game.canvas.dataset.consumableCooldowns = getConsumableCooldownSummary(state);
    this.game.canvas.dataset.autoPotionSettings = getAutoPotionSettingsSummary(state);
    this.game.canvas.dataset.playerStatusEffectIcons = this.getPlayerStatusIcons(state, dataRegistry);
    this.syncSupportDataset(state, dataRegistry);
    this.syncAdvancedClassDataset(state, dataRegistry);
    this.game.canvas.dataset.inventoryItem = firstInventoryItem?.id ?? "";
    this.game.canvas.dataset.inventoryItemName = firstInventoryItem?.name ?? "";
    this.game.canvas.dataset.inventoryGold = String(state.inventory.gold);
    this.game.canvas.dataset.inventoryStackCount = String(state.inventory.items.length);
    this.game.canvas.dataset.equipmentInstanceCount = String(state.inventory.equipmentInstances.length);
    this.game.canvas.dataset.storageStackCount = String(state.storage.items.length);
    this.game.canvas.dataset.storageEquipmentInstanceCount = String(state.storage.equipmentInstances.length);
    this.game.canvas.dataset.skill = firstSkill?.id ?? "";
    this.game.canvas.dataset.skillName = firstSkill?.name ?? "";
    this.syncSkillDataset(state, dataRegistry);
    this.syncEquipmentDataset(state, dataRegistry);
    this.syncBaseStatsDataset(state, dataRegistry);
    this.syncDerivedStatsDataset(state, dataRegistry);
  }

  private syncSupportDataset(state: GameState, dataRegistry: DataRegistry): void {
    const support = state.support.equippedSupportId ? dataRegistry.getSupport(state.support.equippedSupportId) : null;
    const supportItem = state.equipment.supportCharm ? dataRegistry.getItem(state.equipment.supportCharm) : null;

    this.game.canvas.dataset.supportSummary = getSupportSummary(state);
    this.game.canvas.dataset.supportCompanion = support?.id ?? "";
    this.game.canvas.dataset.supportCompanionName = support?.name ?? "";
    this.game.canvas.dataset.supportCharmItem = supportItem?.id ?? "";
    this.game.canvas.dataset.supportLevel = support ? String(state.support.levels[support.id] ?? 1) : "";
    this.game.canvas.dataset.supportAffinity = support ? String(state.support.affinity[support.id] ?? 0) : "";
    this.game.canvas.dataset.supportAutoPickupFilter = state.support.autoPickupFilter;
    this.game.canvas.dataset.supportEffects = support
      ? [
        ...Object.entries(support.effects.derivedStats ?? {}).map(([stat, value]) => `${stat}:${value}`),
        ...Object.entries(support.effects.raceDamage ?? {}).map(([race, value]) => `${race}:${value}`),
      ].join("|")
      : "";
    this.game.canvas.dataset.supportActions = support
      ? support.actions.map((action) => `${action.id}:${action.trigger}:${action.cooldownMs}`).join("|")
      : "";
  }

  private syncSkillDataset(state: GameState, dataRegistry: DataRegistry): void {
    const classSkills = this.getVisibleSkillTreeSkills(state, dataRegistry);

    this.game.canvas.dataset.learnedSkills = state.character.skills.learned
      .map((entry) => `${entry.id}:${entry.level}`)
      .join("|");
    this.game.canvas.dataset.classSkills = classSkills.map((skill) => skill.id).join("|");
    this.game.canvas.dataset.lockedSkills = classSkills
      .filter((skill) => !this.isSkillUnlocked(state, skill))
      .map((skill) => skill.id)
      .join("|");
    this.game.canvas.dataset.activeBuffs = state.character.statBuffs
      .filter((modifier) => modifier.sourceSkillId)
      .map((modifier) => modifier.sourceSkillId)
      .join("|");
    this.game.canvas.dataset.hotbarAssignments = state.character.hotbar
      .map((entry) => `${entry.slot}:${entry.type}:${entry.id}`)
      .join("|");
  }

  private syncAdvancedClassDataset(state: GameState, dataRegistry: DataRegistry): void {
    const baseClass = dataRegistry.getClass(state.character.archetype);
    const advancedClass = state.character.advancedClass;

    this.game.canvas.dataset.advancedClassUnlockLevel = String(advancedClassUnlockLevel);
    this.game.canvas.dataset.advancedClassEligible = String(state.playerProfile.level >= advancedClassUnlockLevel);
    this.game.canvas.dataset.advancedClassService = isAdvancedClassServiceAvailable(state) ? "available" : "unavailable";
    this.game.canvas.dataset.advancedClassOptions = baseClass.advancedClassOptions.join("|");
    this.game.canvas.dataset.playerAdvancedClass = advancedClass?.id ?? "";
    this.game.canvas.dataset.playerAdvancedClassName = advancedClass?.name ?? "";
    this.game.canvas.dataset.advancedSkillTree = advancedClass ? `${advancedClass.id}:unlocked` : "locked";
  }

  private syncEquipmentDataset(state: GameState, dataRegistry: DataRegistry): void {
    const slotSummary = equipmentSlots
      .map((slot) => `${slot}:${state.equipment[slot] ?? "empty"}`)
      .join("|");
    const stats = getEquipmentStats(state.equipment, (id) => dataRegistry.getItem(id));
    const equippedSigil = state.equipment.sigil ? dataRegistry.getItem(state.equipment.sigil) : null;
    const derivedStats = calculateDerivedStats(
      state,
      dataRegistry.getClass(state.character.archetype),
      (id) => dataRegistry.getItem(id),
      (id) => dataRegistry.getStatusEffect(id),
      (id) => dataRegistry.getSupport(id),
    );

    this.game.canvas.dataset.equipmentSlots = slotSummary;
    this.game.canvas.dataset.equipmentWeapon = state.equipment.weapon ?? "";
    this.game.canvas.dataset.equipmentSupportCharm = state.equipment.supportCharm ?? "";
    this.game.canvas.dataset.equipmentAttackBonus = String(stats.attack);
    this.game.canvas.dataset.equipmentDefenseBonus = String(stats.defense);
    this.game.canvas.dataset.equipmentMagicAttackBonus = String(stats.magicAttack);
    this.game.canvas.dataset.equipmentMagicDefenseBonus = String(stats.magicDefense);
    this.game.canvas.dataset.equipmentBonusSummary = this.getEquipmentBonusText(stats);
    this.game.canvas.dataset.equipmentSigilName = equippedSigil?.name ?? "";
    this.game.canvas.dataset.equipmentSigilEffectSummary = equippedSigil ? this.getItemModifierText(equippedSigil) : "";
    this.game.canvas.dataset.playerAttackStat = String(derivedStats.physicalAttack);
    this.syncSupportDataset(state, dataRegistry);
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

  private refreshCombatText(state: GameState, dataRegistry: DataRegistry): void {
    const derivedStats = calculateDerivedStats(
      state,
      dataRegistry.getClass(state.character.archetype),
      (id) => dataRegistry.getItem(id),
      (id) => dataRegistry.getStatusEffect(id),
      (id) => dataRegistry.getSupport(id),
    );
    this.attackText?.setText(`Attack ${derivedStats.physicalAttack}`);
    this.game.canvas.dataset.playerAttackStat = String(derivedStats.physicalAttack);
  }

  private increaseStat(stat: BaseStatKey): void {
    if (!this.state || !this.dataRegistry) {
      return;
    }

    const increased = allocateStatPoint(
      this.state,
      this.dataRegistry.getClass(this.state.character.archetype),
      stat,
      (id) => this.dataRegistry!.getItem(id),
    );
    this.game.canvas.dataset.lastStatAllocation = increased ? `increase:${stat}` : `failed:${stat}`;
  }

  private confirmStats(): void {
    this.game.canvas.dataset.lastStatConfirmation = "confirmed";
    this.closePanel();
  }

  private requestStatReset(): void {
    if (!this.state || !this.dataRegistry) {
      return;
    }

    this.game.canvas.dataset.statResetPrompt = `confirm:${statResetCost}`;
    const reset = resetAllocatedStats(
      this.state,
      this.dataRegistry.getClass(this.state.character.archetype),
      (id) => this.dataRegistry!.getItem(id),
    );

    if (!reset) {
      const reason = this.state.inventory.gold < statResetCost ? "insufficient-gold" : "no-allocated-stats";
      eventBus.emit("statResetFailed", {
        reason,
        cost: statResetCost,
        gold: this.state.inventory.gold,
      });
    }
  }

  private cycleAutoPotion(kind: "hp" | "sp"): void {
    if (!this.state) {
      return;
    }

    const threshold = cycleAutoPotionThreshold(this.state, kind);
    this.game.canvas.dataset.lastAutoPotionSetting = `${kind}:${threshold}`;
    this.game.canvas.dataset.autoPotionSettings = getAutoPotionSettingsSummary(this.state);
    this.refreshOpenPanel();
  }

  private cycleSupportFilter(): void {
    if (!this.state || !this.dataRegistry) {
      return;
    }

    const support = this.state.support.equippedSupportId
      ? this.dataRegistry.getSupport(this.state.support.equippedSupportId)
      : null;
    const filter = cycleSupportAutoPickupFilter(this.state, support);

    this.game.canvas.dataset.lastSupportFilter = filter;
    this.syncSupportDataset(this.state, this.dataRegistry);
    this.refreshOpenPanel();
  }

  private levelSelectedSkill(): void {
    if (!this.state || !this.dataRegistry) {
      return;
    }

    const skill = this.getVisibleSkillTreeSkills(this.state, this.dataRegistry)[this.selectedSkillIndex];
    const allocated = skill ? allocateSkillPoint(this.state, skill) : false;
    this.game.canvas.dataset.lastSkillAllocation = allocated && skill
      ? `${skill.id}:${getLearnedSkillLevel(this.state, skill.id)}`
      : "failed";
    this.syncSkillDataset(this.state, this.dataRegistry);
    this.refreshOpenPanel();
  }

  private assignSelectedSkillToHotbar(slot: number): void {
    if (!this.state || !this.dataRegistry) {
      return;
    }

    const skill = this.getVisibleSkillTreeSkills(this.state, this.dataRegistry)[this.selectedSkillIndex];

    if (!skill || getLearnedSkillLevel(this.state, skill.id) <= 0) {
      this.game.canvas.dataset.lastHotbarAssignment = "failed";
      return;
    }

    assignHotbarAction(this.state, slot, { type: "skill", id: skill.id });
    this.game.canvas.dataset.lastHotbarAssignment = `${slot}:skill:${skill.id}`;
  }

  private assignPotionToHotbar(slot: number): void {
    if (!this.state) {
      return;
    }

    assignHotbarAction(this.state, slot, { type: "item", id: "minor-health-potion" });
    this.game.canvas.dataset.lastHotbarAssignment = `${slot}:item:minor-health-potion`;
  }

  private syncVitalsDataset(state: GameState): void {
    this.game.canvas.dataset.playerHp = `${state.character.stats.hp}/${state.character.stats.maxHp}`;
    this.game.canvas.dataset.playerSp = `${state.character.stats.sp}/${state.character.stats.maxSp}`;
    this.game.canvas.dataset.playerStatPoints = String(state.playerProfile.statPoints);
  }

  private syncBaseStatsDataset(state: GameState, dataRegistry: DataRegistry): void {
    const totalStats = getTotalBaseStats(
      state,
      (id) => dataRegistry.getStatusEffect(id),
      (id) => dataRegistry.getSupport(id),
    );
    this.game.canvas.dataset.playerBaseStats = baseStatKeys
      .map((key) => `${key}:${totalStats[key]}`)
      .join("|");
    this.game.canvas.dataset.playerAllocatedStats = baseStatKeys
      .map((key) => `${key}:${state.character.allocatedStats[key]}`)
      .join("|");
  }

  private syncDerivedStatsDataset(state: GameState, dataRegistry: DataRegistry): void {
    const stats = calculateDerivedStats(
      state,
      dataRegistry.getClass(state.character.archetype),
      (id) => dataRegistry.getItem(id),
      (id) => dataRegistry.getStatusEffect(id),
      (id) => dataRegistry.getSupport(id),
    );
    this.game.canvas.dataset.playerDerivedStats = [
      `maxHp:${stats.maxHp}`,
      `maxSp:${stats.maxSp}`,
      `physicalAttack:${stats.physicalAttack}`,
      `rangedAttack:${stats.rangedAttack}`,
      `magicAttack:${stats.magicAttack}`,
      `defense:${stats.defense}`,
      `magicDefense:${stats.magicDefense}`,
      `hit:${stats.hit}`,
      `dodge:${stats.dodge}`,
      `crit:${stats.crit}`,
      `attackSpeed:${stats.attackSpeed}`,
      `castSpeed:${stats.castSpeed}`,
      `cooldownReduction:${stats.cooldownReduction}`,
      `moveSpeed:${stats.moveSpeed}`,
      `weightLimit:${stats.weightLimit}`,
      `dropChance:${stats.dropChance}`,
      `elementDamage:${JSON.stringify(stats.elementDamage)}`,
      `raceDamage:${JSON.stringify(stats.raceDamage)}`,
      `resistances:${JSON.stringify(stats.resistances)}`,
    ].join("|");
  }

  private createAdvancedClassNotification(state: GameState): void {
    this.advancedClassNotificationText = this.add.text(348, 48, "Advanced class service available", {
      color: "#fef3c7",
      fontFamily: "Arial, sans-serif",
      fontSize: "15px",
      backgroundColor: "#78350f",
      padding: { x: 10, y: 6 },
    })
      .setScrollFactor(0)
      .setDepth(hudDepth + 2)
      .setVisible(false);

    if (isAdvancedClassServiceAvailable(state)) {
      this.showAdvancedClassNotification();
    } else {
      this.game.canvas.dataset.advancedClassNotification = "hidden";
    }
  }

  private showAdvancedClassNotification(): void {
    this.advancedClassNotificationText?.setVisible(true);
    this.game.canvas.dataset.advancedClassNotification = "visible";
  }

  private hideAdvancedClassNotification(): void {
    this.advancedClassNotificationText?.setVisible(false);
    this.game.canvas.dataset.advancedClassNotification = "hidden";
  }

  private getVisibleSkillTreeSkills(state: GameState, dataRegistry: DataRegistry): SkillDefinition[] {
    return getUnlockedSkillTreeIds(state).flatMap((classId) => dataRegistry.getSkillsByClass(classId));
  }

  private syncSelectedInventoryDataset(item: ItemDefinition | null, quantity: number | null, source: string | null): void {
    this.game.canvas.dataset.selectedInventoryItem = item?.id ?? "";
    this.game.canvas.dataset.selectedInventoryItemName = item && this.state && isItemRefinable(item) ? getRefinedItemName(this.state.inventory, item) : item && this.state ? getVisibleItemName(this.state.inventory, item) : item?.name ?? "";
    this.game.canvas.dataset.selectedInventoryItemRefineLevel = item && this.state && isItemRefinable(item) ? String(getRefineLevel(this.state.inventory, item.id)) : "";
    this.game.canvas.dataset.selectedInventoryItemQuantity = quantity ? String(quantity) : "";
    this.game.canvas.dataset.selectedInventoryItemRarity = item ? getItemRarity(item) : "";
    this.game.canvas.dataset.selectedInventoryItemDescription = item && this.state ? getVisibleItemDescription(this.state.inventory, item) : item?.description ?? "";
    this.game.canvas.dataset.selectedInventoryItemSource = source ?? "";
  }

  private getSkillEffectText(skill: SkillDefinition): string {
    const effects: string[] = [];

    if (skill.damageMultiplier > 0) {
      const scaling = skill.scalingStat === "none" ? "flat" : baseStatLabels[skill.scalingStat];
      effects.push(`Damage ${skill.damageMultiplier}x ${scaling}`);
    }

    effects.push(...this.getSkillModifierText("Passive", skill.passiveModifiers));

    if (skill.buff) {
      effects.push(`Buff ${skill.buff.duration}ms`);
      effects.push(...this.getSkillModifierText("Buff", skill.buff));
    }

    if (skill.statusEffects.length > 0) {
      effects.push(`Status ${skill.statusEffects.join(", ")}`);
    }

    if (skill.area > 0) {
      effects.push(`Area ${skill.area}`);
    }

    return effects.length > 0 ? effects.join("; ") : "Utility effect";
  }

  private getSkillModifierText(
    label: string,
    modifier?: SkillDefinition["passiveModifiers"] | NonNullable<SkillDefinition["buff"]>,
  ): string[] {
    const effects: string[] = [];

    for (const [stat, value] of Object.entries(modifier?.baseStats ?? {})) {
      if (typeof value === "number") {
        effects.push(`${label} ${baseStatLabels[stat as BaseStatKey] ?? stat} ${this.formatSigned(value)}`);
      }
    }

    for (const [stat, value] of Object.entries(modifier?.derivedStats ?? {})) {
      if (typeof value === "number") {
        effects.push(`${label} ${stat} ${this.formatSigned(value)}`);
      }
    }

    return effects;
  }

  private getItemRequirementText(item: ItemDefinition): string {
    const requirements = [
      (item.level ?? 1) > 1 ? `Lv ${item.level ?? 1}` : "",
      item.allowedClassIds && item.allowedClassIds.length > 0 ? item.allowedClassIds.join("/") : "",
      item.twoHanded === true ? "two-handed" : "",
    ].filter((entry) => entry.length > 0);

    return requirements.length > 0 ? requirements.join(", ") : "None";
  }

  private getItemModifierText(item: ItemDefinition): string {
    const effects: string[] = [];

    const modifiers = item.statModifiers ?? {};

    for (const [stat, value] of Object.entries(modifiers.baseStats ?? {})) {
      if (typeof value === "number") {
        effects.push(`${baseStatLabels[stat as BaseStatKey] ?? stat} ${this.formatSigned(value)}`);
      }
    }

    for (const [stat, value] of Object.entries(modifiers.derivedStats ?? {})) {
      if (typeof value === "number") {
        effects.push(`${stat} ${this.formatSigned(value)}`);
      }
    }

    for (const [element, value] of Object.entries(modifiers.elementDamage ?? {})) {
      effects.push(`${element} damage ${this.formatSigned(value)}`);
    }

    for (const [race, value] of Object.entries(modifiers.raceDamage ?? {})) {
      effects.push(`${race} damage ${this.formatSigned(value)}`);
    }

    for (const [resist, value] of Object.entries(modifiers.resistances ?? {})) {
      effects.push(`${resist} resist ${this.formatSigned(value)}`);
    }

    return effects.length > 0 ? effects.join(", ") : "None";
  }

  private getEquipmentBonusText(stats: ReturnType<typeof getEquipmentStats>): string {
    const bonuses = [
      stats.attack ? `ATK +${stats.attack}` : "",
      stats.magicAttack ? `MATK +${stats.magicAttack}` : "",
      stats.defense ? `DEF +${stats.defense}` : "",
      stats.magicDefense ? `MDEF +${stats.magicDefense}` : "",
      stats.hp ? `HP +${stats.hp}` : "",
      stats.sp ? `SP +${stats.sp}` : "",
      stats.crit ? `Crit +${stats.crit}` : "",
      stats.attackSpeed ? `ASPD +${stats.attackSpeed}` : "",
      stats.castSpeed ? `Cast +${stats.castSpeed}` : "",
      stats.cooldownReduction ? `CDR +${stats.cooldownReduction}` : "",
      stats.moveSpeed ? `Move +${stats.moveSpeed}` : "",
      stats.dropChance ? `Drop +${stats.dropChance}` : "",
      ...Object.entries(stats.elementDamage).map(([element, value]) => `${element} +${value}`),
      ...Object.entries(stats.raceDamage).map(([race, value]) => `${race} +${value}`),
      ...Object.entries(stats.resistances).map(([resist, value]) => `${resist} resist +${value}`),
    ].filter((entry) => entry.length > 0);

    return bonuses.length > 0 ? bonuses.join(" ") : "None";
  }

  private formatSigned(value: number): string {
    return value > 0 ? `+${value}` : String(value);
  }

  private clampSelectedSkillIndex(skills: SkillDefinition[]): number {
    if (skills.length === 0) {
      this.selectedSkillIndex = 0;
      return 0;
    }

    this.selectedSkillIndex = Phaser.Math.Clamp(this.selectedSkillIndex, 0, skills.length - 1);
    return this.selectedSkillIndex;
  }

  private clampSelectedCraftingIndex(recipes: RecipeDefinition[]): number {
    if (recipes.length === 0) {
      this.selectedCraftingIndex = 0;
      return 0;
    }

    this.selectedCraftingIndex = Phaser.Math.Clamp(this.selectedCraftingIndex, 0, recipes.length - 1);
    return this.selectedCraftingIndex;
  }

  private clampSelectedRefinementIndex(items: InventoryPanelEntry[]): number {
    if (items.length === 0) {
      this.selectedRefinementIndex = 0;
      return 0;
    }

    this.selectedRefinementIndex = Phaser.Math.Clamp(this.selectedRefinementIndex, 0, items.length - 1);
    return this.selectedRefinementIndex;
  }

  private isSkillUnlocked(state: GameState, skill: SkillDefinition): boolean {
    return state.playerProfile.level >= skill.requiredLevel
      && getLearnedSkillLevel(state, skill.id) >= skill.requiredSkillLevel;
  }

  private getSkillRequirementText(state: GameState, skill: SkillDefinition): string {
    const requirements = [
      `Lv ${skill.requiredLevel}`,
      skill.requiredSkillLevel > 0 ? `Skill Lv ${skill.requiredSkillLevel}` : "",
    ].filter((entry) => entry.length > 0);
    const status = this.isSkillUnlocked(state, skill) ? "Unlocked" : "Locked";

    return `${status}: ${requirements.join(", ")}`;
  }

  private getInventoryWeight(state: GameState): number {
    const stackWeight = state.inventory.items.reduce((total, item) => total + item.quantity, 0);
    return stackWeight + state.inventory.equipmentInstances.length;
  }

  private getWeightLimit(state: GameState, dataRegistry: DataRegistry): number {
    return calculateDerivedStats(
      state,
      dataRegistry.getClass(state.character.archetype),
      (id) => dataRegistry.getItem(id),
      (id) => dataRegistry.getStatusEffect(id),
      (id) => dataRegistry.getSupport(id),
    ).weightLimit;
  }

  private clampSelectedInventoryIndex(items: InventoryPanelEntry[]): number {
    if (items.length === 0) {
      this.selectedInventoryIndex = 0;
      return 0;
    }

    this.selectedInventoryIndex = Phaser.Math.Clamp(this.selectedInventoryIndex, 0, items.length - 1);
    return this.selectedInventoryIndex;
  }

  private clampSelectedShopIndex(stock: ShopDefinition["stock"]): number {
    if (stock.length === 0) {
      this.selectedShopIndex = 0;
      return 0;
    }

    this.selectedShopIndex = Phaser.Math.Clamp(this.selectedShopIndex, 0, stock.length - 1);
    return this.selectedShopIndex;
  }

  private clampSelectedMarketInventoryIndex(items: InventoryPanelEntry[]): number {
    if (items.length === 0) {
      this.selectedMarketInventoryIndex = 0;
      return 0;
    }

    this.selectedMarketInventoryIndex = Phaser.Math.Clamp(this.selectedMarketInventoryIndex, 0, items.length - 1);
    return this.selectedMarketInventoryIndex;
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

  private getRarityColor(item: ItemDefinition): string {
    const rarity = getItemRarity(item);

    const colors = {
      Common: "#cbd5e1",
      Uncommon: "#86efac",
      Rare: "#93c5fd",
      Epic: "#c4b5fd",
      Legendary: "#fde68a",
      Mythic: "#f9a8d4",
    };

    return colors[rarity];
  }

  private formatDelta(value: number): string {
    return value >= 0 ? `+${value}` : String(value);
  }

  private truncateText(text: string, maxLength: number): string {
    return text.length <= maxLength ? text : `${text.slice(0, Math.max(0, maxLength - 1))}.`;
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
