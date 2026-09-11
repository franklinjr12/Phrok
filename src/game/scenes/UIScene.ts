import { SettingsPanel } from "../ui/panels/settings/SettingsPanel";
import { WorldMapPanel } from "../ui/panels/worldMap/WorldMapPanel";
import { QuestLogPanel } from "../ui/panels/questLog/QuestLogPanel";
import { HuntingBoardPanel } from "../ui/panels/huntingBoard/HuntingBoardPanel";
import { StoragePanel } from "../ui/panels/storage/StoragePanel";
import { AppraiserPanel } from "../ui/panels/appraiser/AppraiserPanel";
import { ShopPanel } from "../ui/panels/shop/ShopPanel";
import { RefinementPanel } from "../ui/panels/refinement/RefinementPanel";
import { CraftingPanel } from "../ui/panels/crafting/CraftingPanel";
import { BestiaryPanel } from "../ui/panels/bestiary/BestiaryPanel";
import Phaser from "phaser";
import { RegistryKeys } from "../constants/registryKeys";
import { compareEquipmentItems, equipmentSlots, getEquipmentStats, getItemEquipmentSlot, getItemRarity } from "../systems/equipment";
import { getRefinedItemName, getRefineLevel, isItemRefinable } from "../systems/refinement";
import { baseStatKeys, baseStatLabels, calculateDerivedStats, getTotalBaseStats } from "../systems/stats";
import { writeSaveSlot } from "../systems/autosave";
import { cycleAutoPotionThreshold, getAutoPotionSettingsSummary, getConsumableCooldownSummary } from "../systems/consumables";
import { cycleSupportAutoPickupFilter, getSupportSummary, syncEquippedSupportFromEquipment } from "../systems/supports";
import { unlockRecipesForSource } from "../systems/crafting";
import { eventBus } from "../systems/eventBus";
import { getVisibleItemDescription, getVisibleItemName } from "../systems/market";
import { getLearnedSkillLevel, hotbarSlotCount } from "../systems/skills";
import { advancedClassUnlockLevel, getUnlockedSkillTreeIds, isAdvancedClassServiceAvailable } from "../systems/advancedClasses";
import { getStatusSummary } from "../systems/statusEffects";
import { getHuntingBoardSummary, getRegionalHuntingContracts, type HuntingContractDefinition } from "../systems/huntingBoard";
import { getQuestLogSummary, getQuestObjectiveProgress, getQuestStatus } from "../systems/quests";
import { getSettingsSummary } from "../systems/settings";
import { getInventoryWeight } from "../systems/inventory";
import { TargetHudViewModel, type TargetHudSnapshot } from "../ui/viewModels/TargetHudViewModel";
import type { DataRegistry } from "../data/dataRegistry";
import type { ItemDefinition, QuestDefinition, SkillDefinition } from "../types/dataDefinitions";
import type { ActiveStatusEffect, BaseStatKey, GameState, StatModifier } from "../types/gameState";
import { uiTheme } from "../ui/uiTheme";
import { UIDebugAdapter } from "../ui/debug/UIDebugAdapter";
import { PanelHost } from "../ui/panels/PanelHost";
import type { PanelContext, PanelId, UIPanel } from "../ui/panels/panelTypes";
import { InventoryPanel } from "../ui/panels/inventory/InventoryPanel";
import { EquipmentPanel } from "../ui/panels/equipment/EquipmentPanel";
import { CharacterPanel } from "../ui/panels/character/CharacterPanel";
import { SkillsPanel } from "../ui/panels/skills/SkillsPanel";
import { HotbarHud } from "../ui/hud/HotbarHud";
import { getGameInputOwnership, type GameInputOwnership } from "../ui/input/GameInputOwnership";
import { addPanelRectangle as addPanelRectanglePrimitive, addPanelText as addPanelTextPrimitive } from "../ui/panels/panelPrimitives";
import { isSceneTransitioning, transitionToScene } from "./sceneTransition";
import { SharedTooltip } from "../ui/tooltips/SharedTooltip";
import { SceneKeys } from "../constants/sceneKeys";
type PanelMode = "inventory" | "equipment" | "character" | "skills" | "bestiary" | "crafting" | "refinement" | "shop" | "appraiser" | "storage" | "huntingBoard" | "questLog" | "worldMap" | "settings";
type VisibleGameObject = Phaser.GameObjects.GameObject & {
  setVisible(visible: boolean): VisibleGameObject;
};
type ActiveEffectSummary = {
  id: string;
  icon: string;
  label: string;
  tooltip: string[];
  stackCount?: number;
  remainingMs?: number;
};
const { panelDepth, hudDepth, panelFill, panelStroke } = uiTheme;
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
  private unsubscribeSkillUsed?: () => void;
  private unsubscribeSkillPointsChanged?: () => void;
  private unsubscribeConsumableUsed?: () => void;
  private unsubscribeAutoPotionSettingsChanged?: () => void;
  private unsubscribeHotbarChanged?: () => void;
  private unsubscribeHotbarUsed?: () => void;
  private unsubscribeBestiaryMilestoneUnlocked?: () => void;
  private unsubscribeStatusEffectsChanged?: () => void;
  private unsubscribeSupportChanged?: () => void;
  private unsubscribeCraftingOpened?: () => void;
  private unsubscribeCraftingChanged?: () => void;
  private unsubscribeHuntingBoardChanged?: () => void;
  private unsubscribeQuestChanged?: () => void;
  private unsubscribeRefinementOpened?: () => void;
  private unsubscribeRecipeUnlocked?: () => void;
  private unsubscribeShopOpened?: () => void;
  private unsubscribeStorageOpened?: () => void;
  private unsubscribeStorageChanged?: () => void;
  private unsubscribeSettingsChanged?: () => void;
  private readonly fieldLogEntries: string[] = [];
  private fieldLogText?: Phaser.GameObjects.Text;
  private journeyHintText?: Phaser.GameObjects.Text;
  private noticeText?: Phaser.GameObjects.Text;
  private noticeTween?: Phaser.Tweens.Tween;
  private hpText?: Phaser.GameObjects.Text;
  private spText?: Phaser.GameObjects.Text;
  private levelText?: Phaser.GameObjects.Text;
  private goldText?: Phaser.GameObjects.Text;
  private weightText?: Phaser.GameObjects.Text;
  private xpText?: Phaser.GameObjects.Text;
  private hpBarFill?: Phaser.GameObjects.Rectangle;
  private spBarFill?: Phaser.GameObjects.Rectangle;
  private attackText?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private xpBarFill?: Phaser.GameObjects.Rectangle;
  private targetHpBarFill?: Phaser.GameObjects.Rectangle;
  private targetFrame?: Phaser.GameObjects.Rectangle;
  private targetNameText?: Phaser.GameObjects.Text;
  private targetHpText?: Phaser.GameObjects.Text;
  private targetHpBarBackground?: Phaser.GameObjects.Rectangle;
  private targetMetaText?: Phaser.GameObjects.Text;
  private bossFrame?: Phaser.GameObjects.Rectangle;
  private bossHpBarBackground?: Phaser.GameObjects.Rectangle;
  private bossHpBarFill?: Phaser.GameObjects.Rectangle;
  private bossNameText?: Phaser.GameObjects.Text;
  private bossHpText?: Phaser.GameObjects.Text;
  private bossPhaseText?: Phaser.GameObjects.Text;
  private mapNameText?: Phaser.GameObjects.Text;
  private locationTitleObjects: Phaser.GameObjects.GameObject[] = [];
  private locationTitleTween?: Phaser.Tweens.Tween;
  private advancedClassNotificationText?: Phaser.GameObjects.Text;
  private minimapObjects: VisibleGameObject[] = [];
  private minimapPlayerMarker?: Phaser.GameObjects.Arc;
  private minimapVisible = true;
  private tooltipObjects: Phaser.GameObjects.GameObject[] = [];
  private sharedTooltip?: SharedTooltip;
  private activeEffectObjects: Phaser.GameObjects.GameObject[] = [];
  private activeEffectSummaryKey = "";
  private activePanel: PanelMode | null = null;
  private selectedShopIndex = 0;
  private selectedMarketInventoryIndex = 0;
  private selectedStorageInventoryIndex = 0;
  private selectedStorageIndex = 0;
  private selectedCraftingIndex = 0;
  private selectedRefinementIndex = 0;
  private selectedHuntingContractIndex = 0;
  private selectedQuestIndex = 0;
  private storageInventoryPage = 0;
  private storagePage = 0;
  private activeShopId = "";
  private activeStorageNpcId = "";
  private activeCraftingNpcId = "";
  private activeRefinementNpcId = "";
  private panelObjects: Phaser.GameObjects.GameObject[] = [];
  private comparisonObjects: Phaser.GameObjects.GameObject[] = [];
  private uiDebug?: UIDebugAdapter;
  private panelHost?: PanelHost;
  private hotbarHud?: HotbarHud;
  private inputOwnership?: GameInputOwnership;
  private transitionInputLocked = false;
  private readonly targetHudModel = new TargetHudViewModel();

  constructor() {
    super("UIScene");
  }

  create(): void {
    const state = this.registry.get(RegistryKeys.GameState) as GameState;
    const dataRegistry = this.registry.get(RegistryKeys.DataRegistry) as DataRegistry;
    this.state = state;
    this.dataRegistry = dataRegistry;
    this.uiDebug = new UIDebugAdapter(this.game.canvas);
    this.inputOwnership = getGameInputOwnership(this.registry);
    this.sharedTooltip = new SharedTooltip(this, () => this.state?.settings.uiScale ?? 1);
    this.transitionInputLocked = isSceneTransitioning(this);
    if (this.transitionInputLocked) {
      this.input.enabled = false;
    }
    this.createPanelHost();
    syncEquippedSupportFromEquipment(state, (id) => dataRegistry.getItem(id));

    this.uiDebug?.set("uiScene", "running");
    this.uiDebug?.set("uiPanel", "closed");
    this.uiDebug?.set("gameplayInputBlocked", "false");
    this.syncPlayerStats(state, dataRegistry);
    this.syncHuntingBoardDataset(state, dataRegistry);
    this.syncQuestDataset(state, dataRegistry);
    this.createHud(state, dataRegistry);
    this.createAdvancedClassNotification(state);
    this.createMapLabel(state.currentMapId, dataRegistry);
    this.showLocationTitle(state.currentMapId, dataRegistry);
    this.syncXpBar(state, dataRegistry);
    this.createTargetFrame();
    this.createBossFrame();
    this.createMinimap(state, dataRegistry);
    this.registerKeyboard();
    this.registerEvents(state, dataRegistry);
  }

  private registerKeyboard(): void {
    this.input.keyboard?.on("keydown", this.handleKeyboard, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off("keydown", this.handleKeyboard, this);
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
      this.unsubscribeSkillUsed?.();
      this.unsubscribeSkillPointsChanged?.();
      this.unsubscribeConsumableUsed?.();
      this.unsubscribeAutoPotionSettingsChanged?.();
      this.unsubscribeHotbarChanged?.();
      this.unsubscribeHotbarUsed?.();
      this.unsubscribeBestiaryMilestoneUnlocked?.();
      this.unsubscribeStatusEffectsChanged?.();
      this.unsubscribeSupportChanged?.();
      this.unsubscribeCraftingOpened?.();
      this.unsubscribeCraftingChanged?.();
      this.unsubscribeHuntingBoardChanged?.();
      this.unsubscribeQuestChanged?.();
      this.unsubscribeRefinementOpened?.();
      this.unsubscribeRecipeUnlocked?.();
      this.unsubscribeShopOpened?.();
      this.unsubscribeStorageOpened?.();
      this.unsubscribeStorageChanged?.();
      this.unsubscribeSettingsChanged?.();
      this.clearTooltip();
      this.clearActiveEffectObjects();
      this.clearLocationTitle();
      this.clearMinimap();
      this.panelHost?.destroy();
      this.hotbarHud?.destroy();
      this.panelHost = undefined;
      this.hotbarHud = undefined;
      this.inputOwnership?.setPointerCapture(undefined);
      this.inputOwnership = undefined;
      this.uiDebug = undefined;
    });
  }

  update(): void {
    if (isSceneTransitioning(this)) {
      this.transitionInputLocked = true;
      this.input.enabled = false;
    } else if (this.transitionInputLocked) {
      this.transitionInputLocked = false;
      this.input.enabled = true;
    }

    this.updateMinimapPlayerMarker();
    if (this.state && this.dataRegistry) {
      this.syncActiveEffectTray(this.state, this.dataRegistry);
      this.hotbarHud?.update();
    }
  }

  private createPanelHost(): void {
    if (!this.state || !this.dataRegistry || !this.uiDebug) return;
    const context: PanelContext = {
      scene: this,
      state: this.state,
      data: this.dataRegistry,
      canvas: this.game.canvas,
      get stateScale() { return this.state.settings.uiScale ?? 1; },
      objects: this.panelObjects,
      debug: this.uiDebug,
      rerender: () => this.panelHost?.refresh(),
      closePanel: () => this.closePanel(),
      showTooltip: (lines, x, y) => this.showTooltip(lines, x, y),
      clearTooltip: () => this.clearTooltip(),
      showComparison: (item) => this.showComparison(item),
      clearComparison: () => this.clearComparisonObjects(),
      saveGame: () => this.manualSave(),
      requestReturnToTitle: () => this.requestReturnToTitle(),
    };
    const panels = new Map<PanelId, UIPanel>([
      ["inventory", new InventoryPanel(context)],
      ["equipment", new EquipmentPanel(context)],
      ["character", new CharacterPanel(context)],
      ["skills", new SkillsPanel(context)],
      ["bestiary", new BestiaryPanel(context)],
      ["crafting", new CraftingPanel(context)],
      ["refinement", new RefinementPanel(context)],
      ["shop", new ShopPanel(context)],
      ["appraiser", new AppraiserPanel(context)],
      ["storage", new StoragePanel(context)],
      ["huntingBoard", new HuntingBoardPanel(context)],
      ["questLog", new QuestLogPanel(context)],
      ["worldMap", new WorldMapPanel(context)],
      ["settings", new SettingsPanel(context)],
    ]);
    this.panelHost = new PanelHost({
      context,
      addBackdrop: () => this.addPanelBackdrop(),
      onWindowsChanged: (topmost) => { this.activePanel = topmost; },
      onInputOwnerChanged: (owner) => this.inputOwnership?.setWindowOwner(owner),
    }, panels);
    this.uiDebug.setWindowLayoutSnapshot([]);
    this.inputOwnership?.setPointerCapture((pointer) => (
      this.panelHost?.capturesPointer(pointer) ?? false
    ) || (this.hotbarHud?.capturesPointer(pointer.x, pointer.y) ?? false));
  }

  private registerEvents(state: GameState, dataRegistry: DataRegistry): void {
    this.unsubscribeHealth = eventBus.on("playerHealthChanged", ({ hp, maxHp }) => {
      this.uiDebug?.set("playerHp", `${hp}/${maxHp}`);
      this.hpText?.setText(`HP ${hp}/${maxHp}`);
      this.syncVitalBars();
    });

    this.unsubscribeSp = eventBus.on("playerSpChanged", ({ sp, maxSp }) => {
      this.uiDebug?.set("playerSp", `${sp}/${maxSp}`);
      this.spText?.setText(`SP ${sp}/${maxSp}`);
      this.syncVitalBars();
    });

    this.unsubscribeXp = eventBus.on("xpGained", ({ amount, totalXp }) => {
      this.uiDebug?.set("playerXp", String(totalXp));
      this.syncXpBar(state, dataRegistry);
      this.pushFieldLog(`XP +${amount} · total ${totalXp}`);
      this.showNotice("Experience gained");
    });

    this.unsubscribeLevelUp = eventBus.on("levelUp", ({ level, statPoints, skillPoints, hp, maxHp, sp, maxSp }) => {
      this.uiDebug?.set("playerLevel", String(level));
      this.uiDebug?.set("lastLevelUp", String(level));
      this.uiDebug?.set("playerStatPoints", String(statPoints));
      this.uiDebug?.set("playerSkillPoints", String(skillPoints));
      this.uiDebug?.set("playerHp", `${hp}/${maxHp}`);
      this.uiDebug?.set("playerSp", `${sp}/${maxSp}`);
      this.hpText?.setText(`HP ${hp}/${maxHp}`);
      this.spText?.setText(`SP ${sp}/${maxSp}`);
      this.levelText?.setText(`Lv ${level}`);
      this.syncVitalBars();
      this.syncAdvancedClassDataset(state, dataRegistry);
      if (level >= advancedClassUnlockLevel && !state.character.advancedClass) {
        this.showAdvancedClassNotification();
      }
      this.syncXpBar(state, dataRegistry);
      this.pushFieldLog(`Level ${level} reached`);
      this.showNotice(`Level ${level}`);
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
      const firstInventoryItemId = inventory.items[0]?.id ?? inventory.equipmentInstances[0]?.itemId;
      const firstInventoryItem = firstInventoryItemId ? dataRegistry.getItem(firstInventoryItemId) : null;

      this.uiDebug?.set("inventoryItem", firstInventoryItem?.id ?? "");
      this.uiDebug?.set("inventoryItemName", firstInventoryItem?.name ?? "");
      this.uiDebug?.set("inventoryStackCount", String(inventory.items.length));
      this.uiDebug?.set("equipmentInstanceCount", String(inventory.equipmentInstances.length));
      this.uiDebug?.set("inventoryGold", String(inventory.gold));
      this.uiDebug?.set("playerGold", String(inventory.gold));
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
      this.syncVitalBars();
      this.weightText?.setText(`Weight ${this.getInventoryWeight(state)}/${this.getWeightLimit(state, dataRegistry)}`);
      this.refreshOpenPanel();
    });

    this.unsubscribeStatResetCompleted = eventBus.on("statResetCompleted", ({ cost, refundedPoints, gold }) => {
      this.uiDebug?.set("statResetPrompt", "closed");
      this.uiDebug?.set("lastStatReset", `success:${cost}:${refundedPoints}`);
      this.uiDebug?.set("playerGold", String(gold));
      this.uiDebug?.set("inventoryGold", String(gold));
      this.goldText?.setText(`Gold ${gold}`);
      this.refreshOpenPanel();
    });

    this.unsubscribeStatResetFailed = eventBus.on("statResetFailed", ({ reason, cost, gold }) => {
      this.uiDebug?.set("statResetPrompt", "closed");
      this.uiDebug?.set("lastStatReset", `failed:${reason}:${cost}:${gold}`);
    });

    this.unsubscribeLootDropped = eventBus.on("lootDropped", ({ kind, itemId, quantity }) => {
      this.uiDebug?.set("lastLootDrop", kind === "gold" ? `gold:${quantity}` : `${itemId}:${quantity}`);
      this.pushFieldLog(kind === "gold" ? `Gold found ×${quantity}` : `Loot: ${dataRegistry.getItem(itemId ?? "").name} ×${quantity}`);
    });

    this.unsubscribeLootPickedUp = eventBus.on("lootPickedUp", ({ kind, itemId, quantity }) => {
      this.uiDebug?.set("lastLootPickup", kind === "gold" ? `gold:${quantity}` : `${itemId}:${quantity}`);
      this.pushFieldLog(kind === "gold" ? `Gold collected ×${quantity}` : `Collected: ${dataRegistry.getItem(itemId ?? "").name} ×${quantity}`);
    });

    this.unsubscribeEnemyHealth = eventBus.on("enemyHealthChanged", ({ enemyId, name, hp, maxHp, level, elite, boss, phase, statusIcons }) => {
      if (this.targetHudModel.targetSnapshot?.enemyId === enemyId) {
        this.targetHudModel.setTarget(enemyId, name, hp, maxHp, level, elite, statusIcons);
        this.setTargetFrame(this.targetHudModel.targetSnapshot);
      }

      if (boss) {
        this.targetHudModel.setBoss(name, hp, maxHp, phase ?? 1, level, statusIcons);
        this.setBossFrame(this.targetHudModel.bossSnapshot);
      }
    });

    this.unsubscribeEnemyTarget = eventBus.on("enemyTargetChanged", ({ enemyId, name, hp, maxHp, level, elite, boss, phase, statusIcons }) => {
      if (!enemyId) {
        this.targetHudModel.clearTarget();
        this.targetHudModel.clearBoss();
        this.clearTargetFrame();
        this.clearBossFrame();
        return;
      }

      this.targetHudModel.setTarget(enemyId, name, hp, maxHp, level, elite, statusIcons);
      this.setTargetFrame(this.targetHudModel.targetSnapshot);
      if (boss) {
        this.targetHudModel.setBoss(name, hp, maxHp, phase ?? 1, level, statusIcons);
        this.setBossFrame(this.targetHudModel.bossSnapshot);
      } else {
        this.targetHudModel.clearBoss();
        this.clearBossFrame();
      }
    });

    this.unsubscribeMapChanged = eventBus.on("mapChanged", ({ mapId, musicKey }) => {
      this.updateMapMetadata(mapId, dataRegistry);
      this.refreshMinimap(state, dataRegistry);
      this.uiDebug?.set("currentMapMusicKey", musicKey);
      this.showLocationTitle(mapId, dataRegistry);
      this.pushFieldLog(`Entered ${dataRegistry.getMap(mapId).name}`);
      this.updateJourneyHint(state, dataRegistry);
    });

    this.unsubscribeSaveCompleted = eventBus.on("saveCompleted", ({ saveSlot }) => {
      this.uiDebug?.set("lastAutosaveSlot", String(saveSlot));
      this.pushFieldLog(`Game saved · slot ${saveSlot}`);
      this.showNotice("Game saved");
    });

    this.unsubscribeSkillUsed = eventBus.on("skillUsed", () => {
      this.syncActiveEffectTray(state, dataRegistry);
      this.syncSkillDataset(state, dataRegistry);
    });

    this.unsubscribeSkillPointsChanged = eventBus.on("skillPointsChanged", ({ skillId, skillLevel, skillPoints }) => {
      this.uiDebug?.set("lastSkillAllocation", `${skillId}:${skillLevel}`);
      this.uiDebug?.set("playerSkillPoints", String(skillPoints));
      this.syncSkillDataset(state, dataRegistry);
      this.refreshOpenPanel();
    });

    this.unsubscribeConsumableUsed = eventBus.on("consumableUsed", (result) => {
      this.uiDebug?.set("lastConsumableUse", result.success
? `${result.itemId}:success:hp:${result.restoredHp}:sp:${result.restoredSp}:status:${result.appliedStatusEffectIds.join(",")}`
: `${result.itemId}:failed:${result.reason}`);
      this.uiDebug?.set("lastConsumableAutomatic", String(result.automatic));
      this.uiDebug?.set("consumableCooldowns", getConsumableCooldownSummary(state));
      this.syncVitalsDataset(state);
      this.syncActiveEffectTray(state, dataRegistry);
      this.refreshOpenPanel();
    });

    this.unsubscribeAutoPotionSettingsChanged = eventBus.on("autoPotionSettingsChanged", ({ hpThresholdPercent, spThresholdPercent }) => {
      this.uiDebug?.set("autoPotionSettings", `hp:${hpThresholdPercent}|sp:${spThresholdPercent}`);
      this.refreshOpenPanel();
    });

    this.unsubscribeHotbarChanged = eventBus.on("hotbarChanged", ({ hotbar }) => {
      this.uiDebug?.set("hotbarAssignments", hotbar.map((entry) => `${entry.slot}:${entry.type}:${entry.id}`).join("|"));
      this.uiDebug?.set("hotbarIconLabels", hotbar
.map((entry) => `${entry.slot}:${this.getHotbarIconLabel(entry.type, entry.id)}`)
.join("|"));
      this.hotbarHud?.sync();
      this.refreshOpenPanel();
    });

    this.unsubscribeHotbarUsed = eventBus.on("hotbarUsed", ({ slot, type, id, success }) => {
      this.uiDebug?.set("lastHotbarUse", `${slot}:${type}:${id}:${success ? "success" : "failed"}`);
      this.syncActiveEffectTray(state, dataRegistry);
    });

    this.unsubscribeBestiaryMilestoneUnlocked = eventBus.on("bestiaryMilestoneUnlocked", ({ monsterId, milestone, family }) => {
      this.uiDebug?.set("lastBestiaryMilestone", `${monsterId}:${milestone}:${family}`);
      this.syncBestiaryDataset(state, dataRegistry);
      this.syncDerivedStatsDataset(state, dataRegistry);
      this.refreshOpenPanel();
      this.pushFieldLog(`Bestiary unlock: ${monsterId} milestone ${milestone}`);
      this.showNotice("Bestiary milestone unlocked");
    });

    this.unsubscribeStatusEffectsChanged = eventBus.on("statusEffectsChanged", ({ targetKind, targetId, statuses }) => {
      const summary = getStatusSummary(statuses, (id) => dataRegistry.getStatusEffect(id));

      this.uiDebug?.set("lastStatusChange", `${targetKind}:${targetId}:${summary}`);

      if (targetKind === "player") {
        this.uiDebug?.set("playerStatusEffects", summary);
        this.uiDebug?.set("playerStatusEffectIcons", this.getPlayerStatusIcons(state, dataRegistry));
        this.statusText?.setText(this.getPlayerStatusText(state, dataRegistry));
        this.syncHudStatusIcons(state, dataRegistry);
        this.syncActiveEffectTray(state, dataRegistry);
        this.syncDerivedStatsDataset(state, dataRegistry);
        this.refreshCombatText(state, dataRegistry);
      } else if (this.game.canvas.dataset.targetEnemyId === targetId) {
        this.uiDebug?.set("targetStatusEffects", summary);
        this.uiDebug?.set("targetEnemyStatusIcons", statuses.map((status) => dataRegistry.getStatusEffect(status.id).visualIcon).join("|"));
        const target = this.targetHudModel.targetSnapshot;
        if (target) {
          this.targetHudModel.setTarget(target.enemyId!, target.name, target.hp, target.maxHp, target.level ?? undefined, target.elite, statuses.map((status) => dataRegistry.getStatusEffect(status.id).visualIcon));
          this.setTargetFrame(this.targetHudModel.targetSnapshot);
        }
      }
    });

    this.unsubscribeSupportChanged = eventBus.on("supportChanged", ({ supportId, level, affinity, actionId }) => {
      this.uiDebug?.set("lastSupportChange", `${supportId ?? "none"}:${level}:${affinity}:${actionId ?? ""}`);
      this.syncSupportDataset(state, dataRegistry);
      this.syncDerivedStatsDataset(state, dataRegistry);
      this.weightText?.setText(`Weight ${this.getInventoryWeight(state)}/${this.getWeightLimit(state, dataRegistry)}`);
      this.refreshOpenPanel();
    });

    this.unsubscribeCraftingOpened = eventBus.on("craftingOpened", ({ npcId }) => {
      this.activeCraftingNpcId = npcId ?? "";
      this.selectedCraftingIndex = 0;
      this.uiDebug?.set("activeCraftingNpc", this.activeCraftingNpcId);
      unlockRecipesForSource(state, dataRegistry.getRecipes(), { type: "npc", npcId: this.activeCraftingNpcId });
      this.openPanel("crafting");
    });

    this.unsubscribeCraftingChanged = eventBus.on("craftingChanged", ({ unlockedRecipeIds }) => {
      this.uiDebug?.set("unlockedRecipes", unlockedRecipeIds.join("|"));
      this.refreshOpenPanel();
    });

    this.unsubscribeHuntingBoardChanged = eventBus.on("huntingBoardChanged", () => {
      this.syncHuntingBoardDataset(state, dataRegistry);
      this.refreshOpenPanel();
    });

    this.unsubscribeQuestChanged = eventBus.on("questChanged", ({ questId, reason }) => {
      this.uiDebug?.set("lastQuestAction", `${reason}:${questId}`);
      this.syncQuestDataset(state, dataRegistry);
      this.refreshOpenPanel();
      this.pushFieldLog(`Quest ${reason}: ${dataRegistry.getQuest(questId).name}`);
      this.updateJourneyHint(state, dataRegistry);
      this.showNotice(reason === "completed" ? "Quest complete" : "Quest updated");
    });

    this.unsubscribeRecipeUnlocked = eventBus.on("recipeUnlocked", ({ recipeId, recipeName }) => {
      this.uiDebug?.set("lastRecipeUnlock", `${recipeId}:${recipeName}`);
      this.pushFieldLog(`Recipe unlocked: ${recipeName}`);
      this.showNotice("Recipe unlocked");
    });

    this.unsubscribeRefinementOpened = eventBus.on("refinementOpened", ({ npcId }) => {
      this.activeRefinementNpcId = npcId;
      this.selectedRefinementIndex = 0;
      this.uiDebug?.set("activeRefinementNpc", npcId);
      this.openPanel("refinement");
    });

    this.unsubscribeShopOpened = eventBus.on("shopOpened", ({ shopId, npcId }) => {
      const shop = dataRegistry.getShop(shopId);
      this.activeShopId = shopId;
      this.selectedShopIndex = 0;
      this.selectedMarketInventoryIndex = 0;
      this.uiDebug?.set("activeShopNpc", npcId);
      this.openPanel(shop.serviceType === "appraiser" ? "appraiser" : "shop");
    });

    this.unsubscribeStorageOpened = eventBus.on("storageOpened", ({ npcId }) => {
      this.activeStorageNpcId = npcId;
      this.selectedStorageInventoryIndex = 0;
      this.selectedStorageIndex = 0;
      this.storageInventoryPage = 0;
      this.storagePage = 0;
      this.uiDebug?.set("activeStorageNpc", npcId);
      this.openPanel("storage");
    });

    this.unsubscribeStorageChanged = eventBus.on("storageChanged", ({ storage }) => {
      this.uiDebug?.set("storageStackCount", String(storage.items.length));
      this.uiDebug?.set("storageEquipmentInstanceCount", String(storage.equipmentInstances.length));
      this.refreshOpenPanel();
    });

    this.unsubscribeSettingsChanged = eventBus.on("settingsChanged", ({ settings }) => {
      this.uiDebug?.set("settingsSummary", getSettingsSummary(settings));
      this.uiDebug?.set("settingsDifficulty", settings.difficulty);
      this.uiDebug?.set("settingsUiScale", String(settings.uiScale));
      this.uiDebug?.set("settingsVfxIntensity", settings.visualEffectsIntensity);
      this.refreshOpenPanel();
    });
  }

  private createHud(state: GameState, dataRegistry: DataRegistry): void {
    const panel = this.add.rectangle(12, 12, 326, 124, uiTheme.colors.background, 0.96)
      .setOrigin(0)
      .setStrokeStyle(1, uiTheme.colors.accent, 0.9)
      .setScrollFactor(0)
      .setDepth(hudDepth);
    void panel;
    this.add.rectangle(28, 28, 42, 42, uiTheme.colors.inset, 1)
      .setStrokeStyle(2, uiTheme.colors.accent, 0.95).setScrollFactor(0).setDepth(hudDepth + 1);
    const playerClass = dataRegistry.getClass(state.character.archetype);
    this.add.text(49, 49, playerClass.name.slice(0, 2).toUpperCase(), {
      color: uiTheme.text.accent, fontFamily: uiTheme.fonts.heading, fontStyle: "bold", fontSize: "15px",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(hudDepth + 2);
    this.addHudText(84, 20, state.playerProfile.name, uiTheme.text.onDark, 16);
    this.addHudText(84, 40, `${playerClass.name}${state.character.advancedClass ? ` · ${state.character.advancedClass.name}` : ""}`, uiTheme.text.accent, 11);
    this.levelText = this.addHudText(250, 20, `Lv ${state.playerProfile.level}`, uiTheme.text.onDark, 14);
    this.goldText = this.addHudText(250, 40, `Gold ${state.inventory.gold}`, "#f9e7a8", 11);
    this.hpText = this.addHudText(84, 60, `HP ${state.character.stats.hp}/${state.character.stats.maxHp}`, uiTheme.text.onDark, 11);
    this.spText = this.addHudText(84, 82, `SP ${state.character.stats.sp}/${state.character.stats.maxSp}`, uiTheme.text.onDark, 11);
    this.add.rectangle(154, 64, 82, 7, uiTheme.colors.shadow, 0.95)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(hudDepth);
    this.hpBarFill = this.add.rectangle(154, 64, 1, 5, uiTheme.colors.hp, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(hudDepth + 1);
    this.add.rectangle(154, 86, 82, 7, uiTheme.colors.shadow, 0.95)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(hudDepth);
    this.spBarFill = this.add.rectangle(154, 86, 1, 5, uiTheme.colors.sp, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(hudDepth + 1);
    this.weightText = this.addHudText(250, 62, `W ${this.getInventoryWeight(state)}/${this.getWeightLimit(state, dataRegistry)}`, uiTheme.text.secondary, 10);
    this.attackText = this.addHudText(250, 82, "", uiTheme.text.positive, 10);
    this.addHudText(28, 104, "XP", uiTheme.text.onDark, 10);
    this.add.rectangle(52, 109, 180, 7, uiTheme.colors.shadow, 0.9)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(hudDepth);
    this.xpBarFill = this.add.rectangle(52, 109, 1, 5, uiTheme.colors.xp, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(hudDepth + 1);
    this.xpText = this.addHudText(240, 102, "", "#f9e7a8", 10);
    this.statusText = this.addHudText(250, 102, this.getPlayerStatusText(state, dataRegistry), "#f9a8d4", 9);
    this.hotbarHud = new HotbarHud({
      scene: this,
      state,
      data: dataRegistry,
      canvas: this.game.canvas,
      debug: this.uiDebug!,
      showTooltip: (lines, x, y) => this.showTooltip(lines, x, y),
      clearTooltip: () => this.clearTooltip(),
      activateSlot: (slot) => this.requestHotbarAction(slot),
      openPanel: (panel) => this.openPanel(panel),
    });
    this.hotbarHud.create();
    this.syncVitalBars();
    this.syncHudStatusIcons(state, dataRegistry);
    this.syncActiveEffectTray(state, dataRegistry);
    this.refreshCombatText(state, dataRegistry);
    this.syncEquipmentDataset(state, dataRegistry);
    this.syncBaseStatsDataset(state, dataRegistry);
    this.syncDerivedStatsDataset(state, dataRegistry);
    this.uiDebug?.set("hudVisible", "true");
    this.uiDebug?.set("hotbarVisible", "true");
    this.uiDebug?.set("hudLayout", "final");
    this.uiDebug?.set("hudStyle", "draft-rpg");
    this.uiDebug?.set("playerName", state.playerProfile.name);
    this.uiDebug?.set("playerClassName", playerClass.name);
    this.uiDebug?.set("xpBar", "visible");
    this.uiDebug?.set("xpBarWidth", "0");
    this.uiDebug?.set("playerStatusEffects", getStatusSummary(
state.character.statusEffects,
(id) => dataRegistry.getStatusEffect(id),
));
    this.uiDebug?.set("playerStatusEffectIcons", this.getPlayerStatusIcons(state, dataRegistry));
    this.uiDebug?.set("consumableCooldowns", getConsumableCooldownSummary(state));
    this.uiDebug?.set("autoPotionSettings", getAutoPotionSettingsSummary(state));
    this.syncSettingsDataset(state);
    this.createAmbientHud(state, dataRegistry);
    this.xpBarFill.displayWidth = state.playerProfile.xp > 0 ? 1 : 0;
  }

  private addHudText(x: number, y: number, text: string, color: string, fontSize = 15): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, {
      color,
      fontFamily: "Arial, sans-serif",
      fontSize: `${Math.round(fontSize * (this.state?.settings.uiScale ?? 1))}px`,
    })
      .setScrollFactor(0)
      .setDepth(hudDepth + 1);
  }

  private createAmbientHud(state: GameState, dataRegistry: DataRegistry): void {
    const height = Number(this.scale.height || 600);
    this.fieldLogEntries.length = 0;
    this.journeyHintText = this.add.text(16, height - 170, "", {
      color: uiTheme.text.onDark, fontFamily: uiTheme.fonts.body, fontSize: "11px", lineSpacing: 3,
      backgroundColor: "#142d25", padding: { x: 10, y: 7 },
    }).setScrollFactor(0).setDepth(hudDepth + 2);
    this.fieldLogText = this.add.text(Number(this.scale.width || 800) - 218, height - 166, "", {
      color: uiTheme.text.secondary, fontFamily: uiTheme.fonts.body, fontSize: "10px", lineSpacing: 3,
      backgroundColor: "#142d25", padding: { x: 9, y: 7 }, fixedWidth: 202,
    }).setScrollFactor(0).setDepth(hudDepth + 2);
    this.noticeText = this.add.text(Number(this.scale.width || 800) / 2, height - 170, "", {
      color: uiTheme.text.onDark, fontFamily: uiTheme.fonts.heading, fontStyle: "bold", fontSize: "15px",
      backgroundColor: "#315a4e", padding: { x: 12, y: 7 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(hudDepth + 5).setVisible(false);
    this.uiDebug?.set("fieldLogVisible", "true");
    this.uiDebug?.set("fieldLog", "");
    this.uiDebug?.set("notices", "ready");
    this.updateJourneyHint(state, dataRegistry);
  }

  private pushFieldLog(message: string): void {
    if (!message) return;
    this.fieldLogEntries.unshift(message);
    this.fieldLogEntries.splice(4);
    this.fieldLogText?.setText(this.fieldLogEntries.join("\n"));
    this.uiDebug?.set("fieldLog", this.fieldLogEntries.join("|"));
  }

  private showNotice(message: string): void {
    this.noticeTween?.stop();
    this.noticeText?.setText(message).setVisible(true).setAlpha(1);
    this.uiDebug?.set("lastNotice", message);
    this.noticeTween = this.tweens.add({
      targets: this.noticeText,
      alpha: 0,
      delay: 1500,
      duration: 450,
      onComplete: () => this.noticeText?.setVisible(false),
    });
  }

  private updateJourneyHint(state: GameState, dataRegistry: DataRegistry): void {
    const activeQuestId = state.quests.activeQuestIds[0];
    const quest = activeQuestId ? dataRegistry.getQuest(activeQuestId) : null;
    const progress = quest ? state.quests.activeQuests.find((entry) => entry.questId === quest.id) : null;
    const objective = quest?.objectives.find((entry) => (progress?.objectiveProgress[entry.id] ?? 0) < entry.targetCount);
    const hint = objective?.description || objective?.regionHint || (quest ? quest.name : "Explore the world");
    this.journeyHintText?.setText(`CURRENT OBJECTIVE\n${hint}`);
    this.uiDebug?.set("journeyHint", hint);
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
    if (this.activePanel === "bestiary") {
      return;
    }

    if (this.activePanel === "storage") {
      return;
    }

    if (this.panelHost?.isOpen("inventory")) {
      this.panelHost.close("inventory");
      return;
    }

    this.openPanel("inventory");
  }

  private toggleEquipmentPanel(): void {
    if (this.activePanel === "bestiary") {
      return;
    }

    if (this.activePanel === "storage") {
      return;
    }

    if (this.panelHost?.isOpen("equipment")) {
      this.panelHost.close("equipment");
      return;
    }

    this.openPanel("equipment");
  }

  private toggleCharacterPanel(): void {
    if (this.activePanel === "bestiary") {
      return;
    }

    if (this.activePanel === "storage") {
      return;
    }

    if (this.panelHost?.isOpen("character")) {
      this.panelHost.close("character");
      return;
    }

    this.openPanel("character");
  }

  private toggleSkillPanel(): void {
    if (this.activePanel === "bestiary") {
      return;
    }

    if (this.activePanel === "storage") {
      return;
    }

    if (this.panelHost?.isOpen("skills")) {
      this.panelHost.close("skills");
      return;
    }

    this.openPanel("skills");
  }

  private toggleBestiaryPanel(): void {
    if (this.activePanel === "storage") {
      return;
    }

    if (this.panelHost?.isOpen("bestiary")) {
      this.panelHost.close("bestiary");
      return;
    }

    this.openPanel("bestiary");
  }

  private toggleCraftingPanel(): void {
    if (this.activePanel === "bestiary") {
      return;
    }

    if (this.activePanel === "storage") {
      return;
    }

    if (this.panelHost?.isOpen("crafting")) {
      this.panelHost.close("crafting");
      return;
    }

    this.activeCraftingNpcId = this.getDefaultCraftingNpcId();
    unlockRecipesForSource(this.state!, this.dataRegistry!.getRecipes(), { type: "npc", npcId: this.activeCraftingNpcId });
    this.openPanel("crafting");
  }

  private toggleHuntingBoardPanel(): void {
    if (this.activePanel === "bestiary") {
      return;
    }

    if (this.activePanel === "storage") {
      return;
    }

    if (this.panelHost?.isOpen("huntingBoard")) {
      this.panelHost.close("huntingBoard");
      return;
    }

    this.openPanel("huntingBoard");
  }

  private toggleQuestLogPanel(): void {
    if (this.activePanel === "storage") {
      return;
    }

    if (this.panelHost?.isOpen("questLog")) {
      this.panelHost.close("questLog");
      return;
    }

    this.openPanel("questLog");
  }

  private toggleWorldMapPanel(): void {
    if (this.activePanel === "bestiary") {
      return;
    }

    if (this.activePanel === "storage") {
      return;
    }

    if (this.panelHost?.isOpen("worldMap")) {
      this.panelHost.close("worldMap");
      return;
    }

    this.openPanel("worldMap");
  }

  private toggleSettingsPanel(): void {
    if (this.panelHost?.isOpen("settings")) {
      this.panelHost.close("settings");
      return;
    }

    this.openPanel("settings");
  }

  private toggleMinimap(): void {
    if (this.activePanel === "bestiary" || this.activePanel === "storage") {
      return;
    }

    this.minimapVisible = !this.minimapVisible;

    for (const object of this.minimapObjects) {
      object.setVisible(this.minimapVisible);
    }

    this.uiDebug?.set("minimapVisible", this.minimapVisible ? "true" : "false");
  }

  private openPanel(mode: PanelMode): void {
    if (this.panelHost && this.isExtractedPanel(mode)) {
      this.panelHost.open(mode, { selectedHuntingContractIndex: this.selectedHuntingContractIndex, selectedQuestIndex: this.selectedQuestIndex, activeCraftingNpcId: this.activeCraftingNpcId, selectedCraftingIndex: this.selectedCraftingIndex, activeRefinementNpcId: this.activeRefinementNpcId, selectedRefinementIndex: this.selectedRefinementIndex, activeShopId: this.activeShopId, selectedShopIndex: this.selectedShopIndex, selectedMarketInventoryIndex: this.selectedMarketInventoryIndex, activeStorageNpcId: this.activeStorageNpcId, selectedStorageInventoryIndex: this.selectedStorageInventoryIndex, selectedStorageIndex: this.selectedStorageIndex, storageInventoryPage: this.storageInventoryPage, storagePage: this.storagePage });
      return;
    }
    this.uiDebug?.set("uiPanel", mode);
    this.uiDebug?.set("gameplayInputBlocked", "true");
    this.resetPanelDatasets();
    this.renderPanel();
  }

  private closePanel(): void {
    if (this.panelHost?.activePanel) {
      this.panelHost.close();
      this.activePanel = null;
      return;
    }
    this.activePanel = null;
    this.clearPanelObjects();
    this.uiDebug?.set("uiPanel", "closed");
    this.uiDebug?.set("gameplayInputBlocked", "false");
    this.uiDebug?.set("itemComparison", "hidden");
    this.resetPanelDatasets();
  }

  private handleEscapeKey(): void {
    if (this.panelHost?.closeTopmostClosable()) {
      return;
    }

    if (this.panelHost?.hasOpenWindows) return;

    this.openPanel("settings");
  }

  private resetPanelDatasets(): void {
    const keys = ["inventoryPanel", "equipmentPanel", "characterPanel", "skillPanel", "shopPanel", "appraiserPanel", "storagePanel", "craftingPanel", "refinementPanel", "supportPanel", "bestiaryPanel", "huntingBoardPanel", "questLogPanel", "worldMapPanel", "settingsPanel"];
    for (const key of keys) this.uiDebug?.set(key, "hidden");
  }
  private isExtractedPanel(mode: PanelMode): mode is PanelId { return true; }

  private manualSave(): void {
    if (this.activePanel === "storage") {
      return;
    }

    if (!this.state?.currentSaveSlot) {
      this.uiDebug?.set("lastManualSaveSlot", "");
      this.uiDebug?.set("lastManualSaveStatus", "no-slot");
      return;
    }

    const saveData = writeSaveSlot(this.state.currentSaveSlot, this.state);

    this.uiDebug?.set("lastManualSaveSlot", String(this.state.currentSaveSlot));
    this.uiDebug?.set("lastManualSaveStatus", "saved");
    this.uiDebug?.set("lastManualSaveMap", saveData.currentMapId);
    eventBus.emit("saveCompleted", { saveSlot: this.state.currentSaveSlot });
  }

  private requestHotbarAction(slot: number): void {
    if (!this.inputOwnership?.allowsGameplayKeyboard()) {
      return;
    }

    eventBus.emit("hotbarActionRequested", { slot });
  }
  private handleKeyboard(event: KeyboardEvent): void {
    if (this.isTextEntryEvent(event)) {
      this.inputOwnership?.set("text-entry");
      return;
    }
    if (this.inputOwnership?.current === "text-entry") {
      this.inputOwnership.restoreWindowOwner();
    }
    if (this.panelHost?.handleKey(event)) return;
    if (event.code === "Escape") {
      this.handleEscapeKey();
      return;
    }
    if (this.inputOwnership && !this.inputOwnership.allowsGameplayKeyboard()) return;
    switch (event.code) {
      case "KeyI": this.toggleInventoryPanel(); return;
      case "KeyC": this.toggleCharacterPanel(); return;
      case "KeyK": this.toggleSkillPanel(); return;
      case "KeyB": this.toggleBestiaryPanel(); return;
      case "KeyP": this.toggleEquipmentPanel(); return;
      case "KeyR": this.toggleCraftingPanel(); return;
      case "KeyH": this.toggleHuntingBoardPanel(); return;
      case "KeyL": this.toggleQuestLogPanel(); return;
      case "KeyM": this.toggleMinimap(); return;
      case "KeyO": this.toggleWorldMapPanel(); return;
      case "KeyQ": this.toggleSettingsPanel(); return;
      case "KeyS": this.manualSave(); return;
      default: {
        const slot = Number(event.key);
        if (Number.isInteger(slot) && slot >= 1 && slot <= hotbarSlotCount) this.requestHotbarAction(slot);
      }
    }
  }

  private isTextEntryEvent(event: KeyboardEvent): boolean {
    const target = event.target;
    return target instanceof HTMLInputElement
      || target instanceof HTMLTextAreaElement
      || (target instanceof HTMLElement && target.isContentEditable);
  }

  private refreshOpenPanel(): void {
    if (this.panelHost?.activePanel) {
      this.panelHost.refresh();
      return;
    }
    if (this.activePanel) {
      this.renderPanel();
    }
  }
  private renderPanel(): void { this.panelHost?.refresh(); }

  private renderComparisonFrame(): void {
    this.addPanelRectangle(520, 346, 170, 138, 0x17212b, 0.95)
      .setOrigin(0)
      .setStrokeStyle(1, 0x475569, 0.86);
    this.addPanelText(536, 362, "Comparison", 16, "#f8fafc");
    this.addPanelText(536, 392, "Hover gear to compare.", 13, "#94a3b8");
  }

  private showComparison(item: ItemDefinition): void {
    if (!this.state || !this.dataRegistry || !getItemEquipmentSlot(item, this.state.equipment)) {
      this.uiDebug?.set("itemComparison", "hidden");
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

    this.uiDebug?.set("itemComparison", "visible");
    this.uiDebug?.set("itemComparisonText", comparison);
    this.uiDebug?.set("itemComparisonIncrease", attackDelta > 0 || defenseDelta > 0 ? "visible" : "none");
    this.uiDebug?.set("itemComparisonDecrease", attackDelta < 0 || defenseDelta < 0 ? "visible" : "none");

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

  private syncSettingsDataset(state: GameState): void {
    const settings = state.settings;

    this.uiDebug?.set("settingsPanel", this.activePanel === "settings" ? "visible" : "hidden");
    this.uiDebug?.set("settingsSummary", getSettingsSummary(settings));
    this.uiDebug?.set("settingsDifficulty", settings.difficulty);
    this.uiDebug?.set("settingsUiScale", String(settings.uiScale));
    this.uiDebug?.set("settingsMusicVolume", settings.musicVolume.toFixed(1));
    this.uiDebug?.set("settingsSfxVolume", settings.sfxVolume.toFixed(1));
    this.uiDebug?.set("settingsMusicMuted", String(settings.musicMuted));
    this.uiDebug?.set("settingsSfxMuted", String(settings.sfxMuted));
    this.uiDebug?.set("settingsVfxIntensity", settings.visualEffectsIntensity);
    this.uiDebug?.set("settingsDamageNumbers", String(settings.damageNumbersEnabled));
    this.uiDebug?.set("settingsScreenShake", String(settings.screenShakeEnabled));
    this.uiDebug?.set("settingsFlashIntensity", settings.flashIntensity.toFixed(2));
    this.uiDebug?.set("settingsAutoPotion", String(settings.autoPotionEnabled));
    this.uiDebug?.set("settingsTextSpeed", settings.textSpeed.toFixed(2));
    this.uiDebug?.set("settingsButtons", "Music|SFX|MusicMute|SfxMute|UI|Damage|Shake|Flash|Potion|Difficulty|Text|Close");
    this.uiDebug?.set("rarityReadableMode", "color+label");
    this.uiDebug?.set("elementReadableMode", "label+icon");
    this.uiDebug?.set("warningReadableMode", "shape+text");
    this.uiDebug?.set("uiContrast", "acceptable");
  }

  private addPanelBackdrop(): void {
    const { width, height } = this.scale;
    const backdrop = this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.62)
      .setScrollFactor(0)
      .setDepth(panelDepth - 1)
      .setInteractive();
    this.panelObjects.push(backdrop);
  }

  private addPanelRectangle(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    alpha: number,
  ): Phaser.GameObjects.Rectangle {
    return addPanelRectanglePrimitive({ scene: this, stateScale: this.state?.settings.uiScale ?? 1, objects: this.panelObjects }, x, y, width, height, color, alpha);
  }

  private addPanelText(x: number, y: number, text: string, fontSize: number, color: string, wrapWidth?: number): Phaser.GameObjects.Text {
    return addPanelTextPrimitive({ scene: this, stateScale: this.state?.settings.uiScale ?? 1, objects: this.panelObjects }, x, y, text, fontSize, color, wrapWidth);
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

    this.panelObjects.length = 0;
    this.comparisonObjects.length = 0;
  }

  private clearComparisonObjects(): void {
    const comparisonObjects = new Set(this.comparisonObjects);

    for (const object of comparisonObjects) {
      object.destroy();
    }

    const remaining = this.panelObjects.filter((object) => !comparisonObjects.has(object));
    this.panelObjects.splice(0, this.panelObjects.length, ...remaining);
    this.comparisonObjects.length = 0;
  }

  private createMinimap(state: GameState, dataRegistry: DataRegistry): void {
    this.refreshMinimap(state, dataRegistry);
    this.uiDebug?.set("minimapVisible", "true");
  }

  private refreshMinimap(state: GameState, dataRegistry: DataRegistry): void {
    this.clearMinimap();
    const map = dataRegistry.getMap(state.currentMapId);
    const region = dataRegistry.getRegion(map.regionId);
    const x = Number(this.scale.width || 800) - 172;
    const y = 20;

    const frame = this.add.rectangle(x, y, 152, 104, uiTheme.colors.background, 0.96)
      .setOrigin(0)
      .setStrokeStyle(1, uiTheme.colors.accent, 0.9)
      .setScrollFactor(0)
      .setDepth(hudDepth)
      .setVisible(this.minimapVisible)
      .setInteractive({ useHandCursor: true });
    frame.on("pointerover", () => this.showTooltip([map.name, region.name, `Lv ${map.levelRange.min}-${map.levelRange.max}`], x - 18, y + 110));
    frame.on("pointerout", () => this.clearTooltip());
    this.minimapObjects.push(frame);

    this.addMinimapText(x + 12, y + 10, this.truncateText(map.name, 18), uiTheme.text.onDark);
    const shape = this.add.rectangle(x + 16, y + 34, 120, 52, uiTheme.colors.inset, 0.95)
      .setOrigin(0)
      .setStrokeStyle(1, uiTheme.colors.border, 0.9)
      .setScrollFactor(0)
      .setDepth(hudDepth + 1)
      .setVisible(this.minimapVisible);
    this.minimapObjects.push(shape);

    map.portals.slice(0, 4).forEach((portal, index) => {
      const marker = this.add.circle(x + 34 + index * 26, y + 78, 4, 0x38bdf8, 1)
        .setScrollFactor(0)
        .setDepth(hudDepth + 2)
        .setVisible(this.minimapVisible)
        .setInteractive({ useHandCursor: true });
      marker.on("pointerover", () => this.showTooltip(["Portal", portal.name, portal.targetMapId], x - 12, y + 110));
      marker.on("pointerout", () => this.clearTooltip());
      this.minimapObjects.push(marker);
    });

    map.npcIds.slice(0, 4).forEach((npcId, index) => {
      const npc = dataRegistry.getNpc(npcId);
      const marker = this.add.circle(x + 32 + index * 24, y + 48, 3, 0xfacc15, 1)
        .setScrollFactor(0)
        .setDepth(hudDepth + 2)
        .setVisible(this.minimapVisible)
        .setInteractive({ useHandCursor: true });
      marker.on("pointerover", () => this.showTooltip(["NPC", npc.name, npc.serviceType], x - 12, y + 110));
      marker.on("pointerout", () => this.clearTooltip());
      this.minimapObjects.push(marker);
    });

    this.addQuestMarkersToMinimap(state, x, y);
    this.minimapPlayerMarker = this.add.circle(x + 76, y + 60, 5, 0x22c55e, 1)
      .setStrokeStyle(1, 0xf8fafc, 0.9)
      .setScrollFactor(0)
      .setDepth(hudDepth + 3)
      .setVisible(this.minimapVisible);
    this.minimapObjects.push(this.minimapPlayerMarker);
    this.updateMinimapPlayerMarker();

    this.uiDebug?.set("minimapShape", `${map.type}:${map.portals.length}:${map.npcIds.length}`);
    this.uiDebug?.set("minimapMarkers", [
"player",
...map.npcIds.map((id) => `npc:${id}`),
...map.portals.map((portal) => `portal:${portal.targetMapId}`),
...this.getQuestMapMarkers(state).map((marker) => `quest:${marker.label || marker.mapId}`),
].join("|"));
  }

  private addMinimapText(x: number, y: number, text: string, color: string): void {
    const object = this.add.text(x, y, text, {
      color,
      fontFamily: "Arial, sans-serif",
      fontSize: "11px",
    })
      .setScrollFactor(0)
      .setDepth(hudDepth + 2)
      .setVisible(this.minimapVisible);
    this.minimapObjects.push(object);
  }

  private addQuestMarkersToMinimap(state: GameState, x: number, y: number): void {
    const markers = this.getQuestMapMarkers(state).filter((marker) => marker.mapId === state.currentMapId);

    markers.slice(0, 3).forEach((marker, index) => {
      const object = this.add.star(x + 110 + index * 10, y + 48, 5, 3, 6, 0xf97316, 1)
        .setScrollFactor(0)
        .setDepth(hudDepth + 2)
        .setVisible(this.minimapVisible)
        .setInteractive({ useHandCursor: true });
      object.on("pointerover", () => this.showTooltip(["Quest", marker.label || marker.mapId, `${marker.x},${marker.y}`], x - 12, y + 110));
      object.on("pointerout", () => this.clearTooltip());
      this.minimapObjects.push(object);
    });
  }

  private clearMinimap(): void {
    for (const object of this.minimapObjects) {
      object.destroy();
    }

    this.minimapObjects = [];
    this.minimapPlayerMarker = undefined;
  }

  private updateMinimapPlayerMarker(): void {
    if (!this.minimapPlayerMarker || !this.state) {
      return;
    }

    const x = Number(this.scale.width || 800) - 172;
    const y = 20;
    const playerX = Number(this.game.canvas.dataset.playerX ?? this.state.position.x);
    const playerY = Number(this.game.canvas.dataset.playerY ?? this.state.position.y);
    const markerX = x + 16 + Phaser.Math.Clamp(playerX / 1024, 0, 1) * 120;
    const markerY = y + 34 + Phaser.Math.Clamp(playerY / 768, 0, 1) * 52;

    this.minimapPlayerMarker.setPosition(markerX, markerY);
    this.uiDebug?.set("minimapPlayer", `${Math.round(markerX)},${Math.round(markerY)}`);
  }

  private syncVitalBars(): void {
    if (!this.state) {
      return;
    }

    const hpWidth = Math.round(88 * (this.state.character.stats.hp / this.state.character.stats.maxHp));
    const spWidth = Math.round(88 * (this.state.character.stats.sp / this.state.character.stats.maxSp));
    this.hpBarFill?.setDisplaySize(Math.max(0, hpWidth), 6);
    this.spBarFill?.setDisplaySize(Math.max(0, spWidth), 6);
    this.uiDebug?.set("hpBarWidth", String(hpWidth));
    this.uiDebug?.set("spBarWidth", String(spWidth));
  }

  private syncHudStatusIcons(state: GameState, dataRegistry: DataRegistry): void {
    this.uiDebug?.set("hudStatusIcons", state.character.statusEffects
.map((effect) => `${dataRegistry.getStatusEffect(effect.id).visualIcon}:${effect.stacks}`)
.join("|"));
  }

  private syncActiveEffectTray(state: GameState, dataRegistry: DataRegistry): void {
    const effects = this.getActiveEffectSummaries(state, dataRegistry);
    const nextKey = effects
      .map((effect) => `${effect.id}:${effect.label}:${effect.stackCount ?? 1}:${Math.ceil((effect.remainingMs ?? 0) / 1000)}:${effect.tooltip.join("/")}`)
      .join("|");

    this.uiDebug?.set("activeEffectIcons", effects.map((effect) => effect.id).join("|"));
    this.uiDebug?.set("activeEffectVisualIcons", effects.map((effect) => effect.icon).join("|"));
    this.uiDebug?.set("activeEffectLabels", effects.map((effect) => effect.label).join("|"));
    this.uiDebug?.set("activeEffectTimers", effects.map((effect) => effect.remainingMs === undefined ? "toggle" : this.formatEffectTime(effect.remainingMs)).join("|"));
    this.uiDebug?.set("activeEffectTooltips", effects.map((effect) => effect.tooltip.join("/")).join("|"));
    this.uiDebug?.set("activeEffectCount", String(effects.length));

    if (nextKey === this.activeEffectSummaryKey) {
      return;
    }

    this.activeEffectSummaryKey = nextKey;
    this.clearActiveEffectObjects();
    this.renderActiveEffectTray(effects);
  }

  private getActiveEffectSummaries(state: GameState, dataRegistry: DataRegistry): ActiveEffectSummary[] {
    return [
      ...state.character.statBuffs
        .filter((modifier) => modifier.id.startsWith("skill-toggle-") || modifier.id.startsWith("skill-buff-"))
        .map((modifier) => this.createSkillEffectSummary(modifier, dataRegistry))
        .filter((effect): effect is ActiveEffectSummary => Boolean(effect)),
      ...state.character.statusEffects.map((effect) => this.createStatusEffectSummary(effect, dataRegistry)),
    ];
  }

  private createSkillEffectSummary(modifier: StatModifier, dataRegistry: DataRegistry): ActiveEffectSummary | null {
    const skillId = modifier.sourceSkillId;

    if (!skillId) {
      return null;
    }

    const skill = dataRegistry.getSkill(skillId);
    const remaining = modifier.expiresAt ? Math.max(0, modifier.expiresAt - Date.now()) : null;
    const stateText = remaining === null
      ? "Active toggle"
      : `Remaining ${Math.ceil(remaining / 1000)}s`;

    return {
      id: skill.id,
      icon: skill.icon,
      label: this.getIconLabel(skill.icon),
      remainingMs: remaining === null ? undefined : remaining,
      tooltip: [skill.name, `Effect: ${this.getSkillEffectText(skill)}`, `Duration: ${stateText}`, `Modifier: ${this.getModifierSummary(modifier)}`],
    };
  }

  private createStatusEffectSummary(effect: ActiveStatusEffect, dataRegistry: DataRegistry): ActiveEffectSummary {
    const status = dataRegistry.getStatusEffect(effect.id);
    const remaining = Math.max(0, effect.expiresAt - Date.now());

    const modifierText = this.getModifierSummary(status.statModifiers);
    return {
      id: status.id,
      icon: status.visualIcon,
      label: this.getIconLabel(status.visualIcon),
      stackCount: effect.stacks,
      remainingMs: remaining,
      tooltip: [status.name, `Effect: ${status.description}`, `Duration: ${Math.ceil(remaining / 1000)}s`, `Modifier: ${modifierText}`],
    };
  }

  private getModifierSummary(modifier: { baseStats?: Partial<Record<string, number>>; derivedStats?: Partial<Record<string, number>> }): string {
    const values = [
      ...Object.entries(modifier?.baseStats ?? {}).flatMap(([key, value]) => typeof value === "number" ? `${baseStatLabels[key as BaseStatKey] ?? key} ${value > 0 ? "+" : ""}${value}` : []),
      ...Object.entries(modifier?.derivedStats ?? {}).flatMap(([key, value]) => typeof value === "number" ? `${key} ${value > 0 ? "+" : ""}${value}` : []),
    ];
    return values.length > 0 ? values.join(", ") : "None";
  }

  private getIconLabel(icon: string): string {
    return icon.replace(/^icon-/, "").split("-").map((part) => part[0]?.toUpperCase() ?? "").join("").slice(0, 3) || "FX";
  }

  private formatEffectTime(remainingMs: number): string {
    if (remainingMs <= 0) return "0s";
    return remainingMs >= 10000 ? `${Math.ceil(remainingMs / 1000)}s` : `${(remainingMs / 1000).toFixed(1)}s`;
  }

  private renderActiveEffectTray(effects: ActiveEffectSummary[]): void {
    const width = Number(this.scale.width || 800);
    const startX = Phaser.Math.Clamp(width - 52, 340, width - 44);
    const startY = 120;

    effects.forEach((effect, index) => {
      const y = startY + index * 42;
      const box = this.add.rectangle(startX, y, 34, 34, 0x111827, 0.94)
        .setStrokeStyle(2, 0xfacc15, 0.92)
        .setScrollFactor(0)
        .setDepth(hudDepth + 6)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(startX, y - 2, effect.label, {
        color: "#f8fafc",
        fontFamily: "Arial, sans-serif",
        fontSize: "10px",
      })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(hudDepth + 7);

      box.on("pointerover", () => this.showTooltip(effect.tooltip, startX - 260, y - 24));
      box.on("pointerout", () => this.clearTooltip());
      this.activeEffectObjects.push(box, label);

      const timer = this.add.text(startX, y + 24, effect.remainingMs === undefined ? "∞" : this.formatEffectTime(effect.remainingMs), {
        color: "#fef3c7",
        fontFamily: uiTheme.fonts.body,
        fontSize: "9px",
        stroke: "#0a1712",
        strokeThickness: 2,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(hudDepth + 8);
      this.activeEffectObjects.push(timer);

      if (effect.stackCount && effect.stackCount > 1) {
        const stackLabel = this.add.text(startX + 9, y + 8, String(effect.stackCount), {
          color: "#fde68a",
          fontFamily: "Arial, sans-serif",
          fontSize: "10px",
        })
          .setOrigin(0.5)
          .setScrollFactor(0)
          .setDepth(hudDepth + 8);
        this.activeEffectObjects.push(stackLabel);
      }
    });
  }

  private clearActiveEffectObjects(): void {
    for (const object of this.activeEffectObjects) {
      object.destroy();
    }

    this.activeEffectObjects = [];
  }

  private showTooltip(lines: string[], x: number, y: number): void {
    this.clearTooltip();
    const bounds = this.sharedTooltip?.show(lines, x, y);
    if (!bounds) return;
    this.tooltipObjects = [];
    this.uiDebug?.set("tooltip", "visible");
    this.uiDebug?.set("tooltipText", lines.join("|"));
    this.uiDebug?.set("tooltipBounds", `${bounds.x},${bounds.y},${bounds.width},${bounds.height}`);
  }

  private clearTooltip(): void {
    for (const object of this.tooltipObjects) {
      object.destroy();
    }

    this.tooltipObjects = [];
    this.sharedTooltip?.clear();
    this.uiDebug?.set("tooltip", "hidden");
    this.uiDebug?.set("tooltipText", "");
    this.uiDebug?.set("tooltipBounds", "");
  }

  private requestReturnToTitle(): void {
    if (!this.state) return;
    this.manualSave();
    this.scene.stop(SceneKeys.Dialogue);
    this.scene.stop(SceneKeys.World);
    transitionToScene(this, SceneKeys.MainMenu);
  }

  private getHotbarIconLabel(type: "skill" | "item", id: string): string {
    if (type === "item") {
      return "POT";
    }

    return id.split("-").map((part) => part[0]?.toUpperCase() ?? "").join("").slice(0, 3);
  }

  private getQuestMapMarkers(state: GameState): QuestDefinition["mapMarkers"] {
    if (!this.dataRegistry) {
      return [];
    }

    return state.quests.activeQuestIds
      .flatMap((questId) => this.dataRegistry!.getQuest(questId).mapMarkers);
  }

  private createTargetFrame(): void {
    this.targetFrame = this.add.rectangle(400, 48, 280, 62, uiTheme.colors.background, 0.96)
      .setStrokeStyle(2, uiTheme.colors.accent, 0.95)
      .setScrollFactor(0)
      .setDepth(hudDepth)
      .setVisible(false);
    this.targetNameText = this.add.text(264, 25, "", {
      color: uiTheme.text.onDark, fontFamily: uiTheme.fonts.heading, fontSize: "15px",
    })
      .setScrollFactor(0)
      .setDepth(hudDepth + 1)
      .setVisible(false);
    this.targetMetaText = this.add.text(264, 45, "", {
      color: uiTheme.text.accent, fontFamily: uiTheme.fonts.body, fontSize: "10px",
    })
      .setScrollFactor(0).setDepth(hudDepth + 1).setVisible(false);
    this.targetHpText = this.add.text(264, 62, "", {
      color: uiTheme.text.positive, fontFamily: uiTheme.fonts.body, fontSize: "11px",
    })
      .setScrollFactor(0)
      .setDepth(hudDepth + 1)
      .setVisible(false);
    this.targetHpBarBackground = this.add.rectangle(390, 76, 146, 7, uiTheme.colors.shadow, 0.95)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(hudDepth + 1)
      .setVisible(false);
    this.targetHpBarFill = this.add.rectangle(390, 76, 1, 5, uiTheme.colors.hp, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(hudDepth + 2)
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

  private showLocationTitle(mapId: string, dataRegistry: DataRegistry): void {
    this.clearLocationTitle();

    const map = dataRegistry.getMap(mapId);
    const region = dataRegistry.getRegion(map.regionId);
    const centerX = this.scale.width / 2;
    const titleY = 132;
    const panelWidth = Math.min(360, this.scale.width - 48);
    const panel = this.add.rectangle(centerX, titleY, panelWidth, 62, uiTheme.colors.background, 0.94)
      .setStrokeStyle(1, uiTheme.colors.accent, 0.85)
      .setScrollFactor(0)
      .setDepth(hudDepth + 3);
    const regionText = this.add.text(centerX, titleY - 17, region.name.toUpperCase(), {
      color: uiTheme.text.accent,
      fontFamily: uiTheme.fonts.body,
      fontSize: "10px",
      letterSpacing: 2,
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(hudDepth + 4);
    const mapText = this.add.text(centerX, titleY + 9, map.name, {
      color: uiTheme.text.onDark,
      fontFamily: uiTheme.fonts.heading,
      fontStyle: "bold",
      fontSize: "22px",
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(hudDepth + 4);

    this.locationTitleObjects = [panel, regionText, mapText];
    this.game.canvas.dataset.locationTitle = `${region.name}|${map.name}`;
    this.game.canvas.dataset.locationTitleState = "visible";
    this.locationTitleTween = this.tweens.add({
      targets: this.locationTitleObjects,
      alpha: { from: 0, to: 1 },
      duration: 180,
      hold: 820,
      yoyo: true,
      ease: "Sine.inOut",
      onComplete: () => {
        this.game.canvas.dataset.locationTitleState = "hidden";
        this.clearLocationTitle();
      },
    });
  }

  private clearLocationTitle(): void {
    this.locationTitleTween?.stop();
    this.locationTitleTween = undefined;
    for (const object of this.locationTitleObjects) {
      object.destroy();
    }
    this.locationTitleObjects = [];
  }

  private updateMapMetadata(mapId: string, dataRegistry: DataRegistry): void {
    const map = dataRegistry.getMap(mapId);
    const region = dataRegistry.getRegion(map.regionId);

    this.mapNameText?.setText(this.getMapLabel(map, dataRegistry));
    this.uiDebug?.set("currentMap", map.id);
    this.uiDebug?.set("currentMapName", map.name);
    this.uiDebug?.set("currentRegion", region.id);
    this.uiDebug?.set("currentRegionName", region.name);
    this.uiDebug?.set("currentRegionLevelRange", `${region.levelRange.min}-${region.levelRange.max}`);
    this.uiDebug?.set("currentMapLevelRange", `${map.levelRange.min}-${map.levelRange.max}`);
    this.uiDebug?.set("currentMapType", map.type);
    this.uiDebug?.set("currentMapMusicKey", map.musicKey);
    this.uiDebug?.set("currentMapRecommendedElements", map.recommendedElements.join("|"));
    this.uiDebug?.set("currentMapDropHighlights", map.dropHighlights.join("|"));
    this.uiDebug?.set("regionProgression", dataRegistry.getRegions()
.map((entry) => `${entry.id}:${entry.levelRange.min}-${entry.levelRange.max}`)
.join("|"));
  }

  private getMapLabel(map: ReturnType<DataRegistry["getMap"]>, dataRegistry: DataRegistry): string {
    const region = dataRegistry.getRegion(map.regionId);
    return `${map.name} | ${region.name} Lv ${map.levelRange.min}-${map.levelRange.max}`;
  }

  private setTargetFrame(snapshot: TargetHudSnapshot | null): void {
    if (!snapshot || !snapshot.enemyId) {
      this.clearTargetFrame();
      return;
    }
    const { enemyId, name, hp, maxHp, hpBarWidth: hpWidth, level, elite, boss, statusIcons } = snapshot;
    this.targetFrame?.setVisible(true);
    this.targetNameText?.setText(name).setVisible(true);
    this.targetMetaText?.setText(`${boss ? "BOSS" : elite ? "ELITE" : "TARGET"}${level === null ? "" : ` · Lv ${level}`}${statusIcons.length ? ` · ${statusIcons.join(" ")}` : ""}`).setVisible(true);
    this.targetHpText?.setText(`HP ${hp}/${maxHp}`).setVisible(true);
    this.targetHpBarBackground?.setVisible(true);
    this.targetHpBarFill?.setDisplaySize(Math.max(0, hpWidth), 6).setVisible(true);
    this.uiDebug?.set("targetFrame", "visible");
    this.uiDebug?.set("targetEnemyId", enemyId);
    this.uiDebug?.set("targetEnemyName", name);
    this.uiDebug?.set("targetEnemyHp", `${hp}/${maxHp}`);
    this.uiDebug?.set("targetEnemyHpBarWidth", String(hpWidth));
    this.uiDebug?.set("targetEnemyHpPercent", `${Math.round((hp / Math.max(1, maxHp)) * 100)}%`);
    this.uiDebug?.set("targetEnemyLevel", level === null ? "" : String(level));
    this.uiDebug?.set("targetEnemyElite", String(elite));
    this.uiDebug?.set("targetEnemyBoss", String(boss));
    this.uiDebug?.set("targetEnemyStatusEffects", this.game.canvas.dataset.targetEnemyStatusEffects ?? "");
    this.uiDebug?.set("targetEnemyStatusIcons", statusIcons.join("|"));
  }

  private clearTargetFrame(): void {
    this.targetFrame?.setVisible(false);
    this.targetNameText?.setVisible(false);
    this.targetMetaText?.setVisible(false);
    this.targetHpText?.setVisible(false);
    this.targetHpBarBackground?.setVisible(false);
    this.targetHpBarFill?.setVisible(false);
    this.uiDebug?.set("targetFrame", "hidden");
    this.uiDebug?.set("targetEnemyId", "");
    this.uiDebug?.set("targetEnemyName", "");
    this.uiDebug?.set("targetEnemyHp", "");
    this.uiDebug?.set("targetEnemyHpPercent", "");
    this.uiDebug?.set("targetEnemyLevel", "");
    this.uiDebug?.set("targetEnemyElite", "");
    this.uiDebug?.set("targetEnemyBoss", "");
    this.uiDebug?.set("targetEnemyHpBarWidth", "");
    this.uiDebug?.set("targetEnemyStatusEffects", "");
    this.uiDebug?.set("targetEnemyStatusIcons", "");
  }

  private setBossFrame(snapshot: TargetHudSnapshot | null): void {
    if (!snapshot) {
      this.clearBossFrame();
      return;
    }
    const { name, hp, maxHp, phase, hpBarWidth: width } = snapshot;

    this.bossFrame?.setVisible(true);
    this.bossNameText?.setText(name).setVisible(true);
    this.bossPhaseText?.setText(`Phase ${phase}`).setVisible(true);
    this.bossHpBarBackground?.setVisible(true);
    this.bossHpBarFill?.setDisplaySize(width, 8).setVisible(true);
    this.bossHpText?.setText(`HP ${hp}/${maxHp}`).setVisible(true);
    this.uiDebug?.set("bossUi", "visible");
    this.uiDebug?.set("bossUiName", name);
    this.uiDebug?.set("bossUiHp", `${hp}/${maxHp}`);
    this.uiDebug?.set("bossUiPhase", String(phase));
    this.uiDebug?.set("bossUiBarWidth", String(width));
  }

  private clearBossFrame(): void {
    this.bossFrame?.setVisible(false);
    this.bossNameText?.setVisible(false);
    this.bossPhaseText?.setVisible(false);
    this.bossHpBarBackground?.setVisible(false);
    this.bossHpBarFill?.setVisible(false);
    this.bossHpText?.setVisible(false);
    this.uiDebug?.set("bossUi", "hidden");
    this.uiDebug?.set("bossUiName", "");
    this.uiDebug?.set("bossUiHp", "");
    this.uiDebug?.set("bossUiPhase", "");
    this.uiDebug?.set("bossUiBarWidth", "0");
  }

  private syncPlayerStats(state: GameState, dataRegistry: DataRegistry): void {
    const playerClass = dataRegistry.getClass(state.character.archetype);
    const firstInventoryItemId = state.inventory.items[0]?.id ?? state.inventory.equipmentInstances[0]?.itemId;
    const firstInventoryItem = firstInventoryItemId ? dataRegistry.getItem(firstInventoryItemId) : null;
    const firstSkillId = state.character.skillIds[0] ?? playerClass.startingSkillIds[0];
    const firstSkill = firstSkillId ? dataRegistry.getSkill(firstSkillId) : null;

    this.uiDebug?.set("playerHp", `${state.character.stats.hp}/${state.character.stats.maxHp}`);
    this.uiDebug?.set("playerSp", `${state.character.stats.sp}/${state.character.stats.maxSp}`);
    this.uiDebug?.set("playerXp", String(state.playerProfile.xp));
    this.uiDebug?.set("playerXpNext", String(dataRegistry.getXpTable("standard").levels[String(state.playerProfile.level + 1)] ?? ""));
    this.uiDebug?.set("playerLevel", String(state.playerProfile.level));
    this.uiDebug?.set("playerGold", String(state.playerProfile.gold));
    this.uiDebug?.set("playerStatPoints", String(state.playerProfile.statPoints));
    this.uiDebug?.set("playerSkillPoints", String(state.playerProfile.skillPoints));
    this.uiDebug?.set("playerClass", playerClass.id);
    this.uiDebug?.set("consumableCooldowns", getConsumableCooldownSummary(state));
    this.uiDebug?.set("autoPotionSettings", getAutoPotionSettingsSummary(state));
    this.uiDebug?.set("playerStatusEffectIcons", this.getPlayerStatusIcons(state, dataRegistry));
    this.syncSupportDataset(state, dataRegistry);
    this.syncAdvancedClassDataset(state, dataRegistry);
    this.uiDebug?.set("inventoryItem", firstInventoryItem?.id ?? "");
    this.uiDebug?.set("inventoryItemName", firstInventoryItem?.name ?? "");
    this.uiDebug?.set("inventoryGold", String(state.inventory.gold));
    this.uiDebug?.set("inventoryStackCount", String(state.inventory.items.length));
    this.uiDebug?.set("equipmentInstanceCount", String(state.inventory.equipmentInstances.length));
    this.uiDebug?.set("storageStackCount", String(state.storage.items.length));
    this.uiDebug?.set("storageEquipmentInstanceCount", String(state.storage.equipmentInstances.length));
    this.uiDebug?.set("skill", firstSkill?.id ?? "");
    this.uiDebug?.set("skillName", firstSkill?.name ?? "");
    this.syncSkillDataset(state, dataRegistry);
    this.syncBestiaryDataset(state, dataRegistry);
    this.syncEquipmentDataset(state, dataRegistry);
    this.syncBaseStatsDataset(state, dataRegistry);
    this.syncDerivedStatsDataset(state, dataRegistry);
  }

  private syncSupportDataset(state: GameState, dataRegistry: DataRegistry): void {
    const support = state.support.equippedSupportId ? dataRegistry.getSupport(state.support.equippedSupportId) : null;
    const supportItem = state.equipment.supportCharm ? dataRegistry.getItem(state.equipment.supportCharm) : null;

    this.uiDebug?.set("supportSummary", getSupportSummary(state));
    this.uiDebug?.set("supportCompanion", support?.id ?? "");
    this.uiDebug?.set("supportCompanionName", support?.name ?? "");
    this.uiDebug?.set("supportCharmItem", supportItem?.id ?? "");
    this.uiDebug?.set("supportLevel", support ? String(state.support.levels[support.id] ?? 1) : "");
    this.uiDebug?.set("supportAffinity", support ? String(state.support.affinity[support.id] ?? 0) : "");
    this.uiDebug?.set("supportAutoPickupFilter", state.support.autoPickupFilter);
    this.uiDebug?.set("supportEffects", support
? [
...Object.entries(support.effects.derivedStats ?? {}).map(([stat, value]) => `${stat}:${value}`),
...Object.entries(support.effects.raceDamage ?? {}).map(([race, value]) => `${race}:${value}`),
].join("|")
: "");
    this.uiDebug?.set("supportActions", support
? support.actions.map((action) => `${action.id}:${action.trigger}:${action.cooldownMs}`).join("|")
: "");
  }

  private syncSkillDataset(state: GameState, dataRegistry: DataRegistry): void {
    const classSkills = this.getVisibleSkillTreeSkills(state, dataRegistry);

    this.uiDebug?.set("learnedSkills", state.character.skills.learned
.map((entry) => `${entry.id}:${entry.level}`)
.join("|"));
    this.uiDebug?.set("classSkills", classSkills.map((skill) => skill.id).join("|"));
    this.uiDebug?.set("lockedSkills", classSkills
.filter((skill) => !this.isSkillUnlocked(state, skill))
.map((skill) => skill.id)
.join("|"));
    this.uiDebug?.set("activeBuffs", state.character.statBuffs
.filter((modifier) => modifier.sourceSkillId)
.map((modifier) => modifier.sourceSkillId)
.join("|"));
    this.syncActiveEffectTray(state, dataRegistry);
    this.uiDebug?.set("hotbarAssignments", state.character.hotbar
.map((entry) => `${entry.slot}:${entry.type}:${entry.id}`)
.join("|"));
  }

  private syncBestiaryDataset(state: GameState, dataRegistry: DataRegistry): void {
    this.uiDebug?.set("bestiaryKills", Object.values(state.bestiary.entries)
.sort((left, right) => left.monsterId.localeCompare(right.monsterId))
.map((entry) => `${entry.monsterId}:${entry.kills}`)
.join("|"));
    this.uiDebug?.set("bestiaryDiscovered", state.bestiary.discoveredEnemyIds.join("|"));
    this.uiDebug?.set("bestiaryDefeated", state.bestiary.defeatedEnemyIds.join("|"));
    this.uiDebug?.set("bestiaryMilestoneNotifications", state.bestiary.milestoneNotifications.join("|"));
    this.uiDebug?.set("bestiaryFamilyBonuses", Object.entries(state.bestiary.familyDamageBonuses)
.map(([family, bonus]) => `${family}:${bonus}`)
.join("|"));
    this.uiDebug?.set("bestiaryTotalMonsters", String(dataRegistry.getMonsters().length));
  }

  private syncAdvancedClassDataset(state: GameState, dataRegistry: DataRegistry): void {
    const baseClass = dataRegistry.getClass(state.character.archetype);
    const advancedClass = state.character.advancedClass;

    this.uiDebug?.set("advancedClassUnlockLevel", String(advancedClassUnlockLevel));
    this.uiDebug?.set("advancedClassEligible", String(state.playerProfile.level >= advancedClassUnlockLevel));
    this.uiDebug?.set("advancedClassService", isAdvancedClassServiceAvailable(state) ? "available" : "unavailable");
    this.uiDebug?.set("advancedClassOptions", baseClass.advancedClassOptions.join("|"));
    this.uiDebug?.set("playerAdvancedClass", advancedClass?.id ?? "");
    this.uiDebug?.set("playerAdvancedClassName", advancedClass?.name ?? "");
    this.uiDebug?.set("advancedSkillTree", advancedClass ? `${advancedClass.id}:unlocked` : "locked");
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

    this.uiDebug?.set("equipmentSlots", slotSummary);
    this.uiDebug?.set("equipmentWeapon", state.equipment.weapon ?? "");
    this.uiDebug?.set("equipmentSupportCharm", state.equipment.supportCharm ?? "");
    this.uiDebug?.set("equipmentAttackBonus", String(stats.attack));
    this.uiDebug?.set("equipmentDefenseBonus", String(stats.defense));
    this.uiDebug?.set("equipmentMagicAttackBonus", String(stats.magicAttack));
    this.uiDebug?.set("equipmentMagicDefenseBonus", String(stats.magicDefense));
    this.uiDebug?.set("equipmentBonusSummary", this.getEquipmentBonusText(stats));
    this.uiDebug?.set("equipmentSigilName", equippedSigil?.name ?? "");
    this.uiDebug?.set("equipmentSigilEffectSummary", equippedSigil ? this.getItemModifierText(equippedSigil) : "");
    this.uiDebug?.set("playerAttackStat", String(derivedStats.physicalAttack));
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
    this.uiDebug?.set("playerXpNext", String(nextLevelXp ?? ""));
    this.uiDebug?.set("xpBarWidth", String(width));
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
    this.uiDebug?.set("playerAttackStat", String(derivedStats.physicalAttack));
  }

  private cycleAutoPotion(kind: "hp" | "sp"): void {
    if (!this.state) {
      return;
    }

    const threshold = cycleAutoPotionThreshold(this.state, kind);
    this.uiDebug?.set("lastAutoPotionSetting", `${kind}:${threshold}`);
    this.uiDebug?.set("autoPotionSettings", getAutoPotionSettingsSummary(this.state));
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

    this.uiDebug?.set("lastSupportFilter", filter);
    this.syncSupportDataset(this.state, this.dataRegistry);
    this.refreshOpenPanel();
  }

  private syncVitalsDataset(state: GameState): void {
    this.uiDebug?.set("playerHp", `${state.character.stats.hp}/${state.character.stats.maxHp}`);
    this.uiDebug?.set("playerSp", `${state.character.stats.sp}/${state.character.stats.maxSp}`);
    this.uiDebug?.set("playerStatPoints", String(state.playerProfile.statPoints));
    this.hpText?.setText(`HP ${state.character.stats.hp}/${state.character.stats.maxHp}`);
    this.spText?.setText(`SP ${state.character.stats.sp}/${state.character.stats.maxSp}`);
    this.syncVitalBars();
  }

  private syncHuntingBoardDataset(
    state: GameState,
    dataRegistry: DataRegistry,
    selectedContract = this.getSelectedHuntingContract(state, dataRegistry),
  ): void {
    const regionId = dataRegistry.getMap(state.currentMapId).regionId;
    const contracts = getRegionalHuntingContracts(state, dataRegistry, regionId);

    this.uiDebug?.set("huntingBoardPanel", this.activePanel === "huntingBoard" ? "visible" : "hidden");
    this.uiDebug?.set("huntingBoardRegion", regionId);
    this.uiDebug?.set("huntingBoardContractCount", String(contracts.length));
    this.uiDebug?.set("huntingBoardContracts", getHuntingBoardSummary(state, dataRegistry, regionId));
    this.uiDebug?.set("huntingBoardActiveContracts", state.huntingBoard.activeContractIds.join("|"));
    this.uiDebug?.set("huntingBoardCompletedContracts", state.huntingBoard.completedContractIds.join("|"));
    this.uiDebug?.set("huntingBoardRefreshCount", String(state.huntingBoard.refreshCount));
    this.uiDebug?.set("huntingBoardLastRefresh", state.huntingBoard.lastRefreshReason);
    this.uiDebug?.set("huntingBoardButtons", "Accept|Turn In|Rest|Close");
    this.uiDebug?.set("selectedHuntingContract", selectedContract?.id ?? "");
    this.uiDebug?.set("selectedHuntingContractName", selectedContract?.name ?? "");
    this.uiDebug?.set("selectedHuntingContractStatus", selectedContract ? this.getHuntingContractStatus(state, selectedContract) : "");
    this.uiDebug?.set("selectedHuntingContractProgress", selectedContract
? `${state.huntingBoard.progress[selectedContract.id] ?? 0}/${selectedContract.targetCount}`
: "");
    this.uiDebug?.set("selectedHuntingContractReward", selectedContract
? `xp:${selectedContract.rewardXp}|gold:${selectedContract.rewardGold}|items:${selectedContract.rewardItems.map((entry) => `${entry.itemId}:${entry.quantity}`).join(",")}`
: "");
  }

  private syncQuestDataset(
    state: GameState,
    dataRegistry: DataRegistry,
    selectedQuest = dataRegistry.getQuests()[this.clampSelectedQuestIndex(dataRegistry.getQuests())] ?? null,
  ): void {
    const quests = dataRegistry.getQuests();
    const selectedProgress = selectedQuest
      ? state.quests.activeQuests.find((entry) => entry.questId === selectedQuest.id) ?? null
      : null;

    this.uiDebug?.set("questLogPanel", this.activePanel === "questLog" ? "visible" : "hidden");
    this.uiDebug?.set("questCount", String(quests.length));
    this.uiDebug?.set("questLogSummary", getQuestLogSummary(state, quests));
    this.uiDebug?.set("activeQuests", state.quests.activeQuestIds.join("|"));
    this.uiDebug?.set("completedQuests", state.quests.completedQuestIds.join("|"));
    this.uiDebug?.set("questLogButtons", "Accept|Complete|Close");
    this.uiDebug?.set("selectedQuest", selectedQuest?.id ?? "");
    this.uiDebug?.set("selectedQuestName", selectedQuest?.name ?? "");
    this.uiDebug?.set("selectedQuestStatus", selectedQuest ? getQuestStatus(state, selectedQuest) : "");
    this.uiDebug?.set("selectedQuestObjectives", selectedQuest
? getQuestObjectiveProgress(selectedQuest, selectedProgress)
: "");
    this.uiDebug?.set("selectedQuestHints", selectedQuest
? selectedQuest.objectives.map((objective) => objective.regionHint || objective.mapId).filter((hint) => hint.length > 0).join("|")
: "");
  }

  private syncBaseStatsDataset(state: GameState, dataRegistry: DataRegistry): void {
    const totalStats = getTotalBaseStats(
      state,
      (id) => dataRegistry.getStatusEffect(id),
      (id) => dataRegistry.getSupport(id),
    );
    this.uiDebug?.set("playerBaseStats", baseStatKeys
.map((key) => `${key}:${totalStats[key]}`)
.join("|"));
    this.uiDebug?.set("playerAllocatedStats", baseStatKeys
.map((key) => `${key}:${state.character.allocatedStats[key]}`)
.join("|"));
  }

  private syncDerivedStatsDataset(state: GameState, dataRegistry: DataRegistry): void {
    const stats = calculateDerivedStats(
      state,
      dataRegistry.getClass(state.character.archetype),
      (id) => dataRegistry.getItem(id),
      (id) => dataRegistry.getStatusEffect(id),
      (id) => dataRegistry.getSupport(id),
    );
    this.uiDebug?.set("playerDerivedStats", [
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
].join("|"));
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
      this.uiDebug?.set("advancedClassNotification", "hidden");
    }
  }

  private showAdvancedClassNotification(): void {
    this.advancedClassNotificationText?.setVisible(true);
    this.uiDebug?.set("advancedClassNotification", "visible");
  }

  private hideAdvancedClassNotification(): void {
    this.advancedClassNotificationText?.setVisible(false);
    this.uiDebug?.set("advancedClassNotification", "hidden");
  }

  private getVisibleSkillTreeSkills(state: GameState, dataRegistry: DataRegistry): SkillDefinition[] {
    return getUnlockedSkillTreeIds(state).flatMap((classId) => dataRegistry.getSkillsByClass(classId));
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

  private clampSelectedHuntingContractIndex(contracts: HuntingContractDefinition[]): number {
    if (contracts.length === 0) {
      this.selectedHuntingContractIndex = 0;
      return 0;
    }

    this.selectedHuntingContractIndex = Phaser.Math.Clamp(this.selectedHuntingContractIndex, 0, contracts.length - 1);
    return this.selectedHuntingContractIndex;
  }

  private clampSelectedQuestIndex(quests: QuestDefinition[]): number {
    if (quests.length === 0) {
      this.selectedQuestIndex = 0;
      return 0;
    }

    this.selectedQuestIndex = Phaser.Math.Clamp(this.selectedQuestIndex, 0, quests.length - 1);
    return this.selectedQuestIndex;
  }

  private getSelectedHuntingContract(
    state: GameState,
    dataRegistry: DataRegistry,
  ): HuntingContractDefinition | null {
    const regionId = dataRegistry.getMap(state.currentMapId).regionId;
    const contracts = getRegionalHuntingContracts(state, dataRegistry, regionId);

    return contracts[this.clampSelectedHuntingContractIndex(contracts)] ?? null;
  }

  private getHuntingContractStatus(state: GameState, contract: HuntingContractDefinition): string {
    if (contract.locked) {
      return "locked";
    }

    if (state.huntingBoard.completedContractIds.includes(contract.id)) {
      return "completed";
    }

    if (state.huntingBoard.activeContractIds.includes(contract.id)) {
      const progress = state.huntingBoard.progress[contract.id] ?? 0;
      return progress >= contract.targetCount ? "ready" : "active";
    }

    return "available";
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
    return getInventoryWeight(state.inventory);
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
