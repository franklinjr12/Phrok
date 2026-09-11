import Phaser from "phaser";
import { RegistryKeys } from "../constants/registryKeys";
import { SceneKeys } from "../constants/sceneKeys";
import { EnemyEntity } from "../entities/EnemyEntity";
import { NpcEntity } from "../entities/NpcEntity";
import { PlayerEntity } from "../entities/PlayerEntity";
import type { Vector2Like } from "../entities/playerMovement";
import {
  findPath,
  isWorldPointWalkable,
  type GridCollisionMap,
} from "../map/tilemapPathfinding";
import { resolveAttack, type CombatStats } from "../systems/combatFormulas";
import { eventBus } from "../systems/eventBus";
import { addGold, addInventoryItem } from "../systems/inventory";
import { generateLootDrops, type LootDrop } from "../systems/lootDrops";
import { awardXp, getLevelXpThreshold } from "../systems/progression";
import {
  getHuntingBoardSummary,
  recordHuntingBoardKill,
  refreshHuntingBoard,
  unlockBossContractForMonster,
} from "../systems/huntingBoard";
import { getQuestLogSummary, updateQuestObjectives } from "../systems/quests";
import { autosaveSlot, writeAutosave, writeSaveSlot } from "../systems/autosave";
import { audioManager } from "../systems/audioManager";
import { recordMonsterKill } from "../systems/bestiary";
import {
  beginBossArenaEncounter,
  completeBossEncounter,
  recordBossPhase,
  resetActiveBossEncounter,
  resolveBossPhase,
  updateMvpRespawnTimers,
} from "../systems/bossEncounters";
import { getAdvancedClassOptionsForBase, isAdvancedClassServiceAvailable } from "../systems/advancedClasses";
import {
  getAutoPotionSettingsSummary,
  getConsumableCooldownSummary,
  removeNonPersistentConsumableStatusEffects,
  updateAutoPotion,
} from "../systems/consumables";
import {
  beginChallengeDungeon,
  challengeDungeonModifiers,
  classTrials,
  completeChallengeDungeon,
  completeClassTrial,
  formatChallengeDifficultyDisplay,
  formatChallengeModifierDisplay,
  getChallengeDungeonModifier,
  getClassTrial,
  isChallengeDungeonAvailable,
  startClassTrial,
} from "../systems/challengeDungeons";
import { getEquipmentStats, getItemRarity } from "../systems/equipment";
import {
  decideEnemyAiIntent,
  getEffectiveEnemyRespawnMs,
  parseSpawnZones,
  pickSpawnPoint,
  type SpawnPointLike,
  type SpawnZoneDefinition,
} from "../systems/enemySpawning";
import { applyPassiveSkills, expireSkillBuffs, useHotbarSlot as useHotbarSlotAction, type SkillExecutionTarget } from "../systems/skills";
import { VfxManager } from "../systems/vfxManager";
import {
  applyStatusEffect,
  emitStatusEffectsChanged,
  getStatusSummary,
  hasControlEffect,
  updateStatusEffects,
} from "../systems/statusEffects";
import {
  getSupportSummary,
  grantSupportAffinity,
  shouldSupportAutoPickup,
  syncEquippedSupportFromEquipment,
  updateSupportCompanion,
} from "../systems/supports";
import { calculateDerivedStats, getSpentStatPoints, resetAllocatedStats } from "../systems/stats";
import { difficultyPresets, getSettingsSummary } from "../systems/settings";
import type { DataRegistry } from "../data/dataRegistry";
import type { DialogueSceneData } from "./DialogueScene";
import type { MapDefinition, MonsterDefinition, RegionDefinition } from "../types/dataDefinitions";
import type { GameState } from "../types/gameState";
import { WorldDebugAdapter } from "../world/debug/WorldDebugAdapter";
import type { DroppedLootObject, EnemyRuntime, PortalObject, SpawnZoneRuntime, WorldSceneData } from "../world/worldTypes";

const mapKeysById: Record<string, string> = {
  "crownfield-town": "map-crownfield-town",
  "crownfield-meadows": "map-crownfield-meadows",
};
const prototypeTilesKey = "prototype-tiles";
const tiledLayerNames = {
  ground: "Ground",
  decoration: "Decoration",
  collision: "Collision",
  objects: "Objects",
} as const;
const playerAttackRange = 62;
const playerAttackCooldownMs = 850;
const portalInteractionRadius = 72;
const enemyAttackCooldownMs = 1250;
const enemyCastWindupMs = 700;
const playerAttackKnockbackDistance = 18;
const meleeLungeDistance = 12;
const meleeLungeOutMs = 55;
const meleeLungeBackMs = 80;
const bossRewardGold = 25;
const monsterSpawnMinimumDistance = 44;
const monsterSpawnPlacementAttempts = 32;
const fallbackRespawnTownId = "crownfield-town";

type PrototypeTilemapLayer = Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer;
export class WorldScene extends Phaser.Scene {
  private player?: PlayerEntity;
  private enemy?: EnemyEntity;
  private enemies: EnemyEntity[] = [];
  private enemyRuntimes: EnemyRuntime[] = [];
  private spawnZones: SpawnZoneRuntime[] = [];
  private clickMarker?: Phaser.GameObjects.Arc;
  private assistDebugGraphics?: Phaser.GameObjects.Graphics;
  private assistDebugVisible = false;
  private collisionMap?: GridCollisionMap;
  private state?: GameState;
  private dataRegistry?: DataRegistry;
  private worldDebug?: WorldDebugAdapter;
  private playerCombatStats?: CombatStats;
  private weaponAttack = 0;
  private attackTarget?: EnemyEntity;
  private droppedLoot: DroppedLootObject[] = [];
  private portals: PortalObject[] = [];
  private npcs: NpcEntity[] = [];
  private pendingNpcInteraction?: NpcEntity;
  private pendingPortalInteraction?: PortalObject;
  private unsubscribeDialogueClosed?: () => void;
  private unsubscribeEquipmentChanged?: () => void;
  private unsubscribeStatsChanged?: () => void;
  private unsubscribeStatResetRequested?: () => void;
  private unsubscribeHotbarActionRequested?: () => void;
  private unsubscribeConsumableUsed?: () => void;
  private unsubscribeSupportChanged?: () => void;
  private unsubscribeLevelUp?: () => void;
  private unsubscribeSettingsChanged?: () => void;
  private vfxManager?: VfxManager;
  private meleeLungeTweens = new WeakMap<
    Phaser.Physics.Arcade.Sprite,
    { tween: Phaser.Tweens.Tween; originX: number; originY: number }
  >();
  private playerAttackTimerMs = playerAttackCooldownMs;
  private isCameraFollowingPlayer = false;
  private isTransitioning = false;
  private isDialogueOpen = false;
  private lastVolumeHotkeyAt: Record<string, number> = {};
  private spawnName = "PlayerSpawn";
  private lastAutosaveMap = "";
  private lastAutosaveSlot = "";
  private lastTransition = "";
  private useSavedPosition = false;

  constructor() {
    super(SceneKeys.World);
  }

  init(data: WorldSceneData): void {
    this.spawnName = data.spawnName ?? "PlayerSpawn";
    this.lastAutosaveMap = data.lastAutosaveMap ?? "";
    this.lastAutosaveSlot = data.lastAutosaveSlot ?? "";
    this.lastTransition = data.lastTransition ?? "";
    this.useSavedPosition = data.useSavedPosition ?? false;
  }

  create(): void {
    const state = this.registry.get(RegistryKeys.GameState) as GameState;
    const dataRegistry = this.registry.get(RegistryKeys.DataRegistry) as DataRegistry;
    this.state = state;
    this.dataRegistry = dataRegistry;
    this.worldDebug = new WorldDebugAdapter(this.game.canvas);
    this.droppedLoot = [];
    this.portals = [];
    this.npcs = [];
    this.enemies = [];
    this.enemyRuntimes = [];
    this.spawnZones = [];
    this.enemy = undefined;
    this.attackTarget = undefined;
    state.settings.damageNumbersEnabled = state.settings.damageNumbersEnabled !== false;
    state.settings.visualEffectsIntensity = state.settings.visualEffectsIntensity ?? "full";
    this.vfxManager = new VfxManager(this, dataRegistry.getVfxDefinitions(), this.game.canvas, {
      damageNumbersEnabled: state.settings.damageNumbersEnabled,
      intensity: state.settings.visualEffectsIntensity,
    });
    this.assistDebugGraphics = undefined;
    this.assistDebugVisible = false;
    this.pendingNpcInteraction = undefined;
    this.pendingPortalInteraction = undefined;
    this.isDialogueOpen = false;
    const map = dataRegistry.getMap(state.currentMapId);
    const region = dataRegistry.getRegion(map.regionId);
    this.recordVisitedSafeHub(map);
    const tilemapKey = map.tilemapKey || mapKeysById[state.currentMapId] || mapKeysById["crownfield-town"];

    const tilemap = this.make.tilemap({ key: tilemapKey });
    const tileset = tilemap.addTilesetImage(prototypeTilesKey, prototypeTilesKey);

    if (!tileset) {
      throw new Error("Prototype tileset failed to load.");
    }

    const groundLayer = tilemap.createLayer(tiledLayerNames.ground, tileset, 0, 0);
    const decorationLayer = tilemap.createLayer(tiledLayerNames.decoration, tileset, 0, 0);
    const collisionLayer = tilemap.createLayer(tiledLayerNames.collision, tileset, 0, 0);
    const spawnPoint = this.useSavedPosition
      ? new Phaser.Math.Vector2(state.position.x, state.position.y)
      : this.getSpawnPoint(tilemap, this.spawnName);
    this.collisionMap = this.createCollisionMap(tilemap, collisionLayer);
    this.portals = this.createPortals(tilemap);
    this.isTransitioning = false;

    this.cameras.main.setBackgroundColor("#162019");
    this.physics.world.setBounds(0, 0, tilemap.widthInPixels, tilemap.heightInPixels);
    this.cameras.main.setBounds(0, 0, tilemap.widthInPixels, tilemap.heightInPixels);

    groundLayer?.setDepth(0);
    decorationLayer?.setDepth(5);
    collisionLayer?.setDepth(6);
    collisionLayer?.setCollisionByExclusion([-1]);

    this.add.text(spawnPoint.x, spawnPoint.y - 122, map.name, {
      color: "#f4f7fb",
      fontFamily: "Arial, sans-serif",
      fontSize: "24px",
    }).setOrigin(0.5);
    this.createObjectMarkers(tilemap);
    this.createAdvancedClassNpcIfAvailable();

    this.player = new PlayerEntity(this, state.character, spawnPoint);
    syncEquippedSupportFromEquipment(state, (id) => dataRegistry.getItem(id));
    applyPassiveSkills(state, dataRegistry.getSkills());
    this.playerCombatStats = this.createPlayerCombatStats(state, dataRegistry);
    this.weaponAttack = this.getEquippedWeaponAttack(state, dataRegistry);
    if (collisionLayer) {
      this.physics.add.collider(this.player.sprite, collisionLayer);
    }

    this.spawnZones = this.createSpawnZones(tilemap, this.getMapSpawnMonsterIds(map));
    this.spawnInitialEnemies(collisionLayer);

    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
    this.isCameraFollowingPlayer = true;
    this.cameras.main.centerOn(this.player.sprite.x, this.player.sprite.y);

    this.input.on("pointerdown", this.handlePointerDown, this);
    this.unsubscribeDialogueClosed = eventBus.on("dialogueClosed", () => {
      this.isDialogueOpen = false;
      this.pendingNpcInteraction = undefined;
      this.worldDebug?.set("dialogueBlockingMovement", "false");
    });
    this.unsubscribeEquipmentChanged = eventBus.on("equipmentChanged", () => {
      syncEquippedSupportFromEquipment(state, (id) => dataRegistry.getItem(id));
      this.weaponAttack = this.getEquippedWeaponAttack(state, dataRegistry);
      this.playerCombatStats = this.createPlayerCombatStats(state, dataRegistry);
      this.syncSupportDataset();
    });
    this.unsubscribeStatsChanged = eventBus.on("statsChanged", () => {
      this.playerCombatStats = this.createPlayerCombatStats(state, dataRegistry);
    });
    this.unsubscribeStatResetRequested = eventBus.on("statResetRequested", ({ cost }) => {
      if (state.inventory.gold < cost) {
        eventBus.emit("statResetFailed", { reason: "insufficient-gold", cost, gold: state.inventory.gold });
        return;
      }

      if (getSpentStatPoints(state) === 0) {
        eventBus.emit("statResetFailed", { reason: "no-allocated-stats", cost, gold: state.inventory.gold });
        return;
      }

      resetAllocatedStats(state, dataRegistry.getClass(state.character.archetype), (id) => dataRegistry.getItem(id), cost);
    });
    this.unsubscribeHotbarActionRequested = eventBus.on("hotbarActionRequested", ({ slot }) => {
      this.useHotbarSlot(slot);
    });
    this.unsubscribeConsumableUsed = eventBus.on("consumableUsed", (result) => {
      if (!result.success || !this.player) {
        return;
      }

      this.vfxManager?.spawn("item-use", this.player.sprite.x, this.player.sprite.y + 8);
      if (result.restoredHp > 0) {
        this.vfxManager?.spawnCombatText("healing", result.restoredHp, this.player.sprite.x, this.player.sprite.y - 34);
      }
      if (result.restoredSp > 0) {
        this.vfxManager?.spawn("skill-cast", this.player.sprite.x, this.player.sprite.y + 8);
      }
    });
    this.unsubscribeSupportChanged = eventBus.on("supportChanged", ({ actionId }) => {
      if (!actionId || !this.player) {
        return;
      }

      this.vfxManager?.spawn("support-action", this.player.sprite.x, this.player.sprite.y + 8);
    });
    this.unsubscribeLevelUp = eventBus.on("levelUp", () => {
      if (!this.player) {
        return;
      }

      this.vfxManager?.spawn("level-up-burst", this.player.sprite.x, this.player.sprite.y - 8);
    });
    this.unsubscribeSettingsChanged = eventBus.on("settingsChanged", ({ settings }) => {
      this.vfxManager?.setOptions({
        damageNumbersEnabled: settings.damageNumbersEnabled,
        intensity: settings.visualEffectsIntensity,
      });
      this.worldDebug?.set("settingsSummary", getSettingsSummary(settings));
      this.worldDebug?.set("settingsDifficulty", settings.difficulty);
      this.worldDebug?.set("settingsUiScale", String(settings.uiScale));
      this.worldDebug?.set("damageNumbersEnabled", String(settings.damageNumbersEnabled));
      this.worldDebug?.set("vfxIntensity", settings.visualEffectsIntensity);
      this.worldDebug?.set("screenShakeEnabled", String(settings.screenShakeEnabled));
      this.worldDebug?.set("flashIntensity", settings.flashIntensity.toFixed(2));
    });
    audioManager.initialize(state, this.game.canvas);
    this.input.keyboard?.on("keydown-F9", this.toggleAssistDebugOverlay, this);
    this.input.keyboard?.on("keydown-V", this.handleChallengeDungeonStart, this);
    this.input.keyboard?.on("keydown-T", this.handleClassTrialAction, this);
    this.input.keyboard?.on("keydown-OPEN_BRACKET", this.decreaseMusicVolume, this);
    this.input.keyboard?.on("keydown-CLOSED_BRACKET", this.increaseMusicVolume, this);
    this.input.keyboard?.on("keydown-MINUS", this.decreaseSfxVolume, this);
    this.input.keyboard?.on("keydown-PLUS", this.increaseSfxVolume, this);
    this.input.keyboard?.on("keydown-N", this.toggleMusicMute, this);
    this.input.keyboard?.on("keydown-J", this.toggleSfxMute, this);
    this.input.keyboard?.on("keydown-Y", this.toggleDamageNumbers, this);
    window.addEventListener("keydown", this.handleWorldKeydown, true);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeDialogueClosed?.();
      this.unsubscribeEquipmentChanged?.();
      this.unsubscribeStatsChanged?.();
      this.unsubscribeStatResetRequested?.();
      this.unsubscribeHotbarActionRequested?.();
      this.unsubscribeConsumableUsed?.();
      this.unsubscribeSupportChanged?.();
      this.unsubscribeLevelUp?.();
      this.unsubscribeSettingsChanged?.();
      this.vfxManager?.destroyAll();
      this.input.keyboard?.off("keydown-F9", this.toggleAssistDebugOverlay, this);
      this.input.keyboard?.off("keydown-V", this.handleChallengeDungeonStart, this);
      this.input.keyboard?.off("keydown-T", this.handleClassTrialAction, this);
      this.input.keyboard?.off("keydown-OPEN_BRACKET", this.decreaseMusicVolume, this);
      this.input.keyboard?.off("keydown-CLOSED_BRACKET", this.increaseMusicVolume, this);
      this.input.keyboard?.off("keydown-MINUS", this.decreaseSfxVolume, this);
      this.input.keyboard?.off("keydown-PLUS", this.increaseSfxVolume, this);
      this.input.keyboard?.off("keydown-N", this.toggleMusicMute, this);
      this.input.keyboard?.off("keydown-J", this.toggleSfxMute, this);
      this.input.keyboard?.off("keydown-Y", this.toggleDamageNumbers, this);
      window.removeEventListener("keydown", this.handleWorldKeydown, true);
      this.input.off("pointerdown", this.handlePointerDown, this);
    });

    const primaryEnemy = this.enemies.find((enemy) => enemy.isAlive) ?? this.enemies[0];
    this.worldDebug?.set("scene", "world");
    this.worldDebug?.set("currentMap", state.currentMapId);
    this.worldDebug?.set("currentMapName", map.name);
    this.syncMapMetadataDataset(map, region);
    this.worldDebug?.set("characterArchetype", state.character.archetype);
    this.worldDebug?.set("spawnedMonster", primaryEnemy?.id ?? "");
    this.worldDebug?.set("spawnedMonsterName", primaryEnemy?.name ?? "");
    this.worldDebug?.set("enemySelected", "false");
    this.worldDebug?.set("enemyCombatState", primaryEnemy?.behaviorMode ?? "");
    this.worldDebug?.set("enemyHp", primaryEnemy ? `${primaryEnemy.hp}/${primaryEnemy.maxHp}` : "");
    this.worldDebug?.set("enemyPosition", primaryEnemy
? `${primaryEnemy.sprite.x},${primaryEnemy.sprite.y}`
: "");
    this.worldDebug?.set("enemyTextureKey", primaryEnemy?.textureKey ?? "");
    this.worldDebug?.set("targetFrame", "hidden");
    this.worldDebug?.set("autoAttack", "idle");
    this.worldDebug?.set("playerCombatState", "alive");
    this.worldDebug?.set("gameOver", "hidden");
    this.worldDebug?.set("respawnTargetMap", this.getRespawnTownId());
    this.worldDebug?.set("respawnTargetName", this.getRespawnTownName());
    this.worldDebug?.set("lastDeathSource", "");
    this.worldDebug?.set("lastCombatFormula", "");
    this.worldDebug?.set("lastSkillUse", "");
    this.worldDebug?.set("skillCooldowns", "");
    this.worldDebug?.set("consumableCooldowns", getConsumableCooldownSummary(state));
    this.worldDebug?.set("autoPotionSettings", getAutoPotionSettingsSummary(state));
    this.worldDebug?.set("lastAutoPotionUse", "");
    this.worldDebug?.set("lastSupportAction", "");
    this.worldDebug?.set("supportSummary", getSupportSummary(state));
    this.worldDebug?.set("lastXpGain", "");
    this.worldDebug?.set("lastLevelUp", "");
    this.worldDebug?.set("lastLootDrop", "");
    this.worldDebug?.set("lastLootPickup", "");
    this.worldDebug?.set("pendingLootCount", "0");
    this.worldDebug?.set("inventoryGold", String(state.inventory.gold));
    this.worldDebug?.set("inventoryStackCount", String(state.inventory.items.length));
    this.worldDebug?.set("equipmentInstanceCount", String(state.inventory.equipmentInstances.length));
    this.worldDebug?.set("playerXpNext", String(getLevelXpThreshold(dataRegistry.getXpTable("standard"), state.playerProfile.level + 1) ?? ""));
    this.worldDebug?.set("tilemapKey", tilemapKey);
    this.worldDebug?.set("tilemapLayers", [
tiledLayerNames.ground,
tiledLayerNames.decoration,
tiledLayerNames.collision,
tiledLayerNames.objects,
].join("|"));
    this.worldDebug?.set("tilemapSize", `${tilemap.width}x${tilemap.height}`);
    this.worldDebug?.set("spawnPoint", `${spawnPoint.x},${spawnPoint.y}`);
    this.worldDebug?.set("spawnName", this.spawnName);
    this.worldDebug?.set("currentSaveSlot", String(state.currentSaveSlot ?? ""));
    this.worldDebug?.set("npcCount", String(this.npcs.length));
    this.worldDebug?.set("npcEntityCount", String(this.npcs.length));
    this.worldDebug?.set("npcNames", this.npcs.map((npc) => npc.name).join("|"));
    this.worldDebug?.set("npcServiceTypes", this.npcs.map((npc) => npc.serviceType).join("|"));
    this.worldDebug?.set("dialogueState", "closed");
    this.worldDebug?.set("dialogueBlockingMovement", "false");
    this.worldDebug?.set("pendingNpcInteraction", "");
    this.worldDebug?.set("pendingPortalInteraction", "");
    this.worldDebug?.set("portalCount", String(this.portals.length));
    this.worldDebug?.set("safeZone", primaryEnemy ? "field-entrance" : "town");
    this.worldDebug?.set("gatheringSpotCount", String(this.countObjectsByType(tilemap, "gathering")));
    this.worldDebug?.set("monsterSpawnZoneCount", String(this.spawnZones.length));
    this.worldDebug?.set("monsterSpawnZones", this.spawnZones.map((zone) => `${zone.name}:${zone.monsterId}:${zone.maxCount}`).join("|"));
    this.worldDebug?.set("enemyEntityCount", String(this.enemies.length));
    this.worldDebug?.set("enemyAliveCount", String(this.enemies.filter((enemy) => enemy.isAlive).length));
    this.worldDebug?.set("enemyBehavior", primaryEnemy?.behavior ?? "");
    this.worldDebug?.set("enemyTraits", primaryEnemy ? this.getEnemyTraitDataset(primaryEnemy) : "");
    this.worldDebug?.set("enemyVisualMarker", primaryEnemy ? this.getEnemyVisualMarkerDataset(primaryEnemy) : "none");
    this.worldDebug?.set("enemyRespawnMs", primaryEnemy ? String(primaryEnemy.respawnMs) : "");
    this.worldDebug?.set("enemyDamage", primaryEnemy ? String(primaryEnemy.stats.attack) : "");
    this.worldDebug?.set("settingsSummary", getSettingsSummary(state.settings));
    this.worldDebug?.set("settingsDifficulty", state.settings.difficulty);
    this.worldDebug?.set("settingsUiScale", String(state.settings.uiScale));
    this.worldDebug?.set("screenShakeEnabled", String(state.settings.screenShakeEnabled));
    this.worldDebug?.set("flashIntensity", state.settings.flashIntensity.toFixed(2));
    this.worldDebug?.set("enemyAggroRange", primaryEnemy ? String(primaryEnemy.aggroRange) : "");
    this.worldDebug?.set("enemyLeashDistance", primaryEnemy ? String(primaryEnemy.leashDistance) : "");
    this.worldDebug?.set("enemyAssistRadius", primaryEnemy ? String(primaryEnemy.assistRadius) : "");
    this.worldDebug?.set("enemyCastRange", primaryEnemy ? String(primaryEnemy.castRange) : "");
    this.worldDebug?.set("enemyCastCooldown", primaryEnemy ? String(primaryEnemy.castCooldownMs) : "");
    this.worldDebug?.set("enemyCastCooldownRemaining", "0");
    this.worldDebug?.set("enemyCastTelegraph", "hidden");
    this.worldDebug?.set("enemySilenced", "false");
    this.worldDebug?.set("enemyAssistedCount", "0");
    this.worldDebug?.set("debugAssistRadius", "hidden");
    this.worldDebug?.set("bossUi", "hidden");
    this.worldDebug?.set("bossProtocol", primaryEnemy?.bossProtocolEnabled ? "enabled" : "disabled");
    this.worldDebug?.set("bossPhase", primaryEnemy?.bossProtocolEnabled ? String(primaryEnemy.bossPhase) : "");
    this.worldDebug?.set("bossHp", primaryEnemy?.bossProtocolEnabled ? `${primaryEnemy.hp}/${primaryEnemy.maxHp}` : "");
    this.worldDebug?.set("bossControlResistance", primaryEnemy?.bossProtocolEnabled ? String(primaryEnemy.getControlDurationMultiplier()) : "");
    this.worldDebug?.set("bossKnockbackResistance", primaryEnemy?.bossProtocolEnabled ? String(primaryEnemy.getKnockbackDistance(100)) : "");
    this.worldDebug?.set("lastBossControlResist", "");
    this.worldDebug?.set("lastBossKnockbackResist", "");
    this.worldDebug?.set("lastBossStealthDetection", "");
    this.worldDebug?.set("lastBossPhase", "");
    this.worldDebug?.set("lastBossReward", "");
    this.worldDebug?.set("bestiaryKills", this.getBestiaryKillDataset());
    this.worldDebug?.set("lastBestiaryUpdate", "");
    this.worldDebug?.set("lastBestiaryMilestone", "");
    this.worldDebug?.set("huntingBoardSummary", getHuntingBoardSummary(state, dataRegistry, region.id));
    this.worldDebug?.set("questLogSummary", getQuestLogSummary(state, dataRegistry.getQuests()));
    this.worldDebug?.set("huntingBoardRefreshCount", String(state.huntingBoard.refreshCount));
    this.worldDebug?.set("huntingBoardLastRefresh", state.huntingBoard.lastRefreshReason);
    this.worldDebug?.set("lastHuntingBoardProgress", "");
    this.worldDebug?.set("lastHuntingBoardUnlock", "");
    this.worldDebug?.set("treasureSpotCount", String(this.countObjectsByType(tilemap, "treasure")));
    this.worldDebug?.set("lastAutosaveSlot", this.lastAutosaveSlot);
    this.worldDebug?.set("lastAutosaveMap", this.lastAutosaveMap);
    this.worldDebug?.set("lastTransition", this.lastTransition);
    this.worldDebug?.set("collisionLayerEnabled", String(Boolean(collisionLayer)));
    this.worldDebug?.set("playerCharacterId", this.player.character.id);
    this.worldDebug?.set("playerHasCollisionBody", String(Boolean(this.player.sprite.body)));
    this.worldDebug?.set("wasdMovement", "disabled");
    this.worldDebug?.set("movementMarker", "hidden");
    this.syncPlayerDataset();
    this.syncSupportDataset();
    this.persistTransitionSpawn();
    this.syncEnemyDataset();

    this.scene.launch(SceneKeys.UI);
    eventBus.emit("mapChanged", { mapId: state.currentMapId, musicKey: map.musicKey });
    this.recordQuestEvent("visitMap", state.currentMapId);
  }

  update(_time: number, delta: number): void {
    if (this.state) {
      expireSkillBuffs(this.state);
      this.updateAutoPotion();
      this.updateSupportCompanion();
      this.updatePlayerStatusEffects();
    }
    this.player?.update(delta);
    this.updatePlayerAttackCooldown(delta);
    this.updateNpcInteraction();
    this.updateEnemyAi(delta);
    this.updateCombat(delta);
    this.renderAssistDebugOverlay();
    this.updateSpawnZones(delta);
    this.updateEnemyStatusEffects();
    this.updateMapTransitions();
    this.syncPlayerDataset();
    this.syncEnemyDataset();
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (
      !this.player
      || pointer.button !== 0
      || this.isDialogueOpen
      || this.game.canvas.dataset.gameplayInputBlocked === "true"
    ) {
      return;
    }

    if (this.collectClickedLoot(pointer.worldX, pointer.worldY)) {
      return;
    }

    const clickedNpc = this.npcs.find((npc) => npc.containsPoint(pointer.worldX, pointer.worldY));

    if (clickedNpc) {
      this.pendingPortalInteraction = undefined;
      this.worldDebug?.set("pendingPortalInteraction", "");
      this.interactWithNpc(clickedNpc);
      return;
    }

    const clickedEnemy = this.enemies.find((enemy) => (
      enemy.isAlive && enemy.sprite.getBounds().contains(pointer.worldX, pointer.worldY)
    ));

    if (clickedEnemy) {
      this.pendingNpcInteraction = undefined;
      this.pendingPortalInteraction = undefined;
      this.worldDebug?.set("pendingPortalInteraction", "");
      this.selectEnemy(clickedEnemy);
      this.moveIntoAttackRange(clickedEnemy);
      return;
    }

    const clickedPortal = this.portals.find((portal) => portal.bounds.contains(pointer.worldX, pointer.worldY));

    if (clickedPortal) {
      this.interactWithPortal(clickedPortal);
      return;
    }

    const destination = {
      x: pointer.worldX,
      y: pointer.worldY,
    };

    if (!this.isWalkable(destination.x, destination.y)) {
      this.worldDebug?.set("lastMovementClickValid", "false");
      return;
    }

    if (!this.collisionMap) {
      this.worldDebug?.set("lastMovementClickValid", "false");
      return;
    }

    const path = findPath(this.collisionMap, this.player.position, destination);

    if (path.length === 0) {
      this.worldDebug?.set("lastMovementClickValid", "false");
      return;
    }

    this.player.setPath(path);
    this.pendingNpcInteraction = undefined;
    this.pendingPortalInteraction = undefined;
    this.worldDebug?.set("pendingNpcInteraction", "");
    this.worldDebug?.set("pendingPortalInteraction", "");
    this.clearTarget();
    this.showClickMarker(destination.x, destination.y);
    this.worldDebug?.set("lastMovementClickValid", "true");
    this.worldDebug?.set("lastPathLength", String(path.length));
    this.syncPlayerDataset();
  }

  private isWalkable(x: number, y: number): boolean {
    return Boolean(this.collisionMap && isWorldPointWalkable(this.collisionMap, { x, y }));
  }

  private showClickMarker(x: number, y: number): void {
    this.clickMarker?.destroy();
    this.clickMarker = this.add.circle(x, y, 18, 0xfacc15, 0.22)
      .setStrokeStyle(2, 0xfef08a, 0.85)
      .setDepth(10);
    this.worldDebug?.set("movementMarker", "visible");

    this.tweens.add({
      targets: this.clickMarker,
      alpha: 0,
      scale: 1.7,
      duration: 450,
      ease: "Sine.easeOut",
      onComplete: () => {
        this.clickMarker?.destroy();
        this.clickMarker = undefined;
        this.worldDebug?.set("movementMarker", "hidden");
      },
    });
  }

  private updatePlayerAttackCooldown(deltaMs: number): void {
    this.playerAttackTimerMs = Math.min(playerAttackCooldownMs, this.playerAttackTimerMs + deltaMs);
  }

  private selectEnemy(enemy: EnemyEntity): void {
    this.attackTarget = enemy;
    enemy.setSelected(true, this.player?.character.id ?? null);
    enemy.behaviorMode = "chasing";
    this.worldDebug?.set("enemySelected", "true");
    this.worldDebug?.set("autoAttack", "moving-to-range");
    eventBus.emit("enemyTargetChanged", {
      enemyId: enemy.id,
      name: enemy.name,
      hp: enemy.hp,
      maxHp: enemy.maxHp,
      boss: enemy.bossProtocolEnabled,
      phase: enemy.bossPhase,
    });
    this.syncBossProtocolDataset(enemy);
  }

  private clearTarget(): void {
    this.attackTarget?.setSelected(false, null);
    this.attackTarget = undefined;
    this.worldDebug?.set("enemySelected", "false");
    this.worldDebug?.set("autoAttack", "idle");
    eventBus.emit("enemyTargetChanged", {
      enemyId: null,
      name: "",
      hp: 0,
      maxHp: 0,
    });
    this.worldDebug?.set("bossUi", "hidden");
  }

  private interactWithNpc(npc: NpcEntity): void {
    this.clearTarget();
    this.pendingPortalInteraction = undefined;
    this.worldDebug?.set("pendingPortalInteraction", "");
    this.pendingNpcInteraction = npc;
    this.worldDebug?.set("pendingNpcInteraction", npc.id);
    this.worldDebug?.set("lastClickedNpc", npc.id);
    this.worldDebug?.set("lastClickedNpcName", npc.name);
    this.worldDebug?.set("lastClickedNpcServiceType", npc.serviceType);

    if (this.isPlayerInNpcRange(npc)) {
      this.openNpcDialogue(npc);
      return;
    }

    this.moveIntoNpcRange(npc);
  }

  private updateNpcInteraction(): void {
    const npc = this.pendingNpcInteraction;

    if (!npc || this.isDialogueOpen) {
      return;
    }

    if (this.isPlayerInNpcRange(npc)) {
      this.openNpcDialogue(npc);
    }
  }

  private isPlayerInNpcRange(npc: NpcEntity): boolean {
    if (!this.player) {
      return false;
    }

    return Phaser.Math.Distance.Between(
      this.player.sprite.x,
      this.player.sprite.y,
      npc.position.x,
      npc.position.y,
    ) <= npc.interactionRadius;
  }

  private moveIntoNpcRange(npc: NpcEntity): void {
    if (!this.player || !this.collisionMap) {
      return;
    }

    const path = findPath(this.collisionMap, this.player.position, npc.position);

    if (path.length === 0) {
      this.worldDebug?.set("lastMovementClickValid", "false");
      return;
    }

    this.player.setPath(path);
    this.showClickMarker(npc.position.x, npc.position.y);
    this.worldDebug?.set("lastMovementClickValid", "true");
    this.worldDebug?.set("lastPathLength", String(path.length));
  }

  private interactWithPortal(portal: PortalObject): void {
    this.clearTarget();
    this.pendingNpcInteraction = undefined;
    this.pendingPortalInteraction = portal;
    this.worldDebug?.set("pendingNpcInteraction", "");
    this.worldDebug?.set("pendingPortalInteraction", portal.name);

    if (this.isPlayerInsidePortal(portal) || this.isPlayerInPortalInteractionRange(portal)) {
      this.transitionThroughPortal(portal);
      return;
    }

    this.moveIntoPortalRange(portal);
  }

  private isPlayerInsidePortal(portal: PortalObject): boolean {
    return Boolean(this.player && portal.bounds.contains(this.player.sprite.x, this.player.sprite.y));
  }

  private isPlayerInPortalInteractionRange(portal: PortalObject): boolean {
    if (!this.player) {
      return false;
    }

    return Phaser.Math.Distance.Between(
      this.player.sprite.x,
      this.player.sprite.y,
      portal.bounds.centerX,
      portal.bounds.centerY,
    ) <= portalInteractionRadius;
  }

  private moveIntoPortalRange(portal: PortalObject): void {
    if (!this.player || !this.collisionMap) {
      return;
    }

    const route = this.findPortalApproachRoute(portal);

    if (!route) {
      this.worldDebug?.set("lastMovementClickValid", "false");
      return;
    }

    this.player.setPath(route.path);
    this.showClickMarker(route.destination.x, route.destination.y);
    this.worldDebug?.set("lastMovementClickValid", "true");
    this.worldDebug?.set("lastPathLength", String(route.path.length));
  }

  private findPortalApproachRoute(portal: PortalObject): { destination: Phaser.Math.Vector2; path: Vector2Like[] } | null {
    if (!this.player || !this.collisionMap) {
      return null;
    }

    const bounds = portal.bounds;
    const candidates = [
      new Phaser.Math.Vector2(bounds.centerX, bounds.centerY),
      new Phaser.Math.Vector2(bounds.left - 32, bounds.centerY),
      new Phaser.Math.Vector2(bounds.right + 32, bounds.centerY),
      new Phaser.Math.Vector2(bounds.centerX, bounds.top - 32),
      new Phaser.Math.Vector2(bounds.centerX, bounds.bottom + 32),
      new Phaser.Math.Vector2(bounds.left - 32, bounds.top - 32),
      new Phaser.Math.Vector2(bounds.left - 32, bounds.bottom + 32),
      new Phaser.Math.Vector2(bounds.right + 32, bounds.top - 32),
      new Phaser.Math.Vector2(bounds.right + 32, bounds.bottom + 32),
    ].filter((point) => this.isWalkable(point.x, point.y));

    return candidates
      .map((destination) => ({
        destination,
        path: findPath(this.collisionMap!, this.player!.position, destination),
      }))
      .filter((route) => route.path.length > 0)
      .sort((a, b) => a.path.length - b.path.length)[0] ?? null;
  }

  private openNpcDialogue(npc: NpcEntity): void {
    const dataRegistry = this.dataRegistry;

    if (!dataRegistry || !npc.dialogueId) {
      return;
    }

    this.recordQuestEvent("talkToNpc", npc.id);

    const shop = dataRegistry.getShopByNpcId(npc.id);
    if (shop && (npc.serviceType === "merchant" || npc.serviceType === "appraiser")) {
      this.pendingNpcInteraction = undefined;
      this.player?.clearDestination();
      this.worldDebug?.set("pendingNpcInteraction", "");
      this.worldDebug?.set("lastOpenedShop", shop.id);
      this.worldDebug?.set("lastOpenedShopNpc", npc.id);
      eventBus.emit("shopOpened", { shopId: shop.id, npcId: npc.id });
      return;
    }

    if (npc.serviceType === "storage") {
      this.pendingNpcInteraction = undefined;
      this.player?.clearDestination();
      this.worldDebug?.set("pendingNpcInteraction", "");
      this.worldDebug?.set("lastOpenedStorageNpc", npc.id);
      eventBus.emit("storageOpened", { npcId: npc.id });
      return;
    }

    if (npc.serviceType === "crafter") {
      this.pendingNpcInteraction = undefined;
      this.player?.clearDestination();
      this.worldDebug?.set("pendingNpcInteraction", "");
      this.worldDebug?.set("lastOpenedCraftingNpc", npc.id);
      eventBus.emit("craftingOpened", { npcId: npc.id });
      return;
    }

    if (npc.serviceType === "refiner") {
      this.pendingNpcInteraction = undefined;
      this.player?.clearDestination();
      this.worldDebug?.set("pendingNpcInteraction", "");
      this.worldDebug?.set("lastOpenedRefinementNpc", npc.id);
      eventBus.emit("refinementOpened", { npcId: npc.id });
      return;
    }

    const dialogue = dataRegistry.getDialogue(npc.dialogueId);
    const advancedClassOptions = npc.serviceType === "advanced-class" && this.state
      ? getAdvancedClassOptionsForBase(dataRegistry.getClass(this.state.character.archetype))
      : undefined;
    const choices = advancedClassOptions
      ? advancedClassOptions.map((option) => ({
        id: `choose-advanced-class:${option.name}`,
        label: option.name,
        disabled: !isAdvancedClassServiceAvailable(this.state!),
      }))
      : dialogue.choices;
    const sceneData: DialogueSceneData = {
      npcId: npc.id,
      npcName: npc.name,
      dialogueId: dialogue.id,
      serviceType: npc.serviceType,
      lines: dialogue.lines,
      choices,
      advancedClassOptions,
    };

    this.pendingNpcInteraction = undefined;
    this.player?.clearDestination();
    this.isDialogueOpen = true;
    this.worldDebug?.set("pendingNpcInteraction", "");
    this.worldDebug?.set("dialogueBlockingMovement", "true");
    this.scene.launch(SceneKeys.Dialogue, sceneData);
    this.scene.bringToTop(SceneKeys.Dialogue);
  }

  private updateCombat(deltaMs: number): void {
    const state = this.state;
    const player = this.player;
    const enemy = this.attackTarget;

    if (!state || !player || !enemy || !enemy.isAlive || state.character.stats.hp <= 0 || this.isDialogueOpen) {
      return;
    }

    const distanceToTarget = Phaser.Math.Distance.Between(
      player.sprite.x,
      player.sprite.y,
      enemy.sprite.x,
      enemy.sprite.y,
    );

    const runtime = this.getEnemyRuntime(enemy);
    const enemyCanAttack = this.canEnemyAttackPlayer(enemy, runtime);

    if (distanceToTarget > playerAttackRange) {
      if (enemy.behavior !== "caster") {
        enemy.behaviorMode = enemyCanAttack ? "chasing" : "idle";
      }
      this.worldDebug?.set("autoAttack", "moving-to-range");

      if (!player.destination && player.path.length === 0) {
        this.moveIntoAttackRange(enemy);
      }

      return;
    }

    player.clearDestination();
    if (enemy.behavior !== "caster") {
      enemy.behaviorMode = enemyCanAttack ? "attacking" : "idle";
    }
    this.worldDebug?.set("autoAttack", "attacking");

    if (runtime) {
      runtime.attackTimerMs += deltaMs;
    }

    if (
      enemyCanAttack
      && enemy.behavior !== "caster"
      && enemy.isAlive
      && distanceToTarget <= enemy.attackRange
      && (!runtime || runtime.attackTimerMs >= enemyAttackCooldownMs)
    ) {
      if (runtime) {
        runtime.attackTimerMs = 0;
      }
      if (!this.hasEnemyControl(enemy, "stun") && !this.hasEnemyControl(enemy, "freeze")) {
        this.enemyAttack(enemy);
      }
    }

    if (enemy.isAlive && this.playerAttackTimerMs >= playerAttackCooldownMs) {
      this.playerAttackTimerMs = 0;
      this.playerAttack(enemy);
    }
  }

  private canEnemyAttackPlayer(enemy: EnemyEntity, runtime?: EnemyRuntime): boolean {
    return enemy.behavior !== "passive" || Boolean(runtime?.damagedByPlayer);
  }

  private playerAttack(enemy: EnemyEntity): void {
    if (!this.playerCombatStats) {
      return;
    }

    audioManager.playSfx("attack");
    const result = resolveAttack({
      attacker: this.playerCombatStats,
      defender: this.createEnemyCombatStats(enemy),
      attackKind: "physical",
      weaponAttack: this.weaponAttack,
      debug: import.meta.env.DEV,
    });

    if (this.player) {
      this.playMeleeLunge(this.player.sprite, enemy.sprite, `player:${enemy.id}`);
    }
    this.damageEnemy(enemy, result.finalDamage);
    this.spawnHitVfx(enemy, result.finalDamage, result.hit, result.critical);
    this.syncCombatFormulaDataset(result.finalDamage, result.hit, result.critical);
    eventBus.emit("enemyHealthChanged", {
      enemyId: enemy.id,
      name: enemy.name,
      hp: enemy.hp,
      maxHp: enemy.maxHp,
      boss: enemy.bossProtocolEnabled,
      phase: enemy.bossPhase,
    });

    if (!enemy.isAlive) {
      this.worldDebug?.set("autoAttack", "stopped");
      this.worldDebug?.set("enemySelected", "false");
      this.handleEnemyDefeated(enemy);
      eventBus.emit("enemyTargetChanged", {
        enemyId: null,
        name: "",
        hp: 0,
        maxHp: 0,
      });
      this.attackTarget = undefined;
    }
  }

  private useHotbarSlot(slot: number): void {
    if (!this.state || !this.dataRegistry || this.isDialogueOpen) {
      return;
    }

    const target = this.createSkillTarget();
    const result = useHotbarSlotAction(
      this.state,
      slot,
      (id) => this.dataRegistry!.getSkill(id),
      (id) => this.dataRegistry!.getItem(id),
      target,
      (id) => this.dataRegistry!.getStatusEffect(id),
    );

    if (!result) {
      this.worldDebug?.set("lastSkillUse", `${slot}:item`);
      this.worldDebug?.set("consumableCooldowns", getConsumableCooldownSummary(this.state));
      this.worldDebug?.set("playerHp", `${this.state.character.stats.hp}/${this.state.character.stats.maxHp}`);
      this.worldDebug?.set("playerSp", `${this.state.character.stats.sp}/${this.state.character.stats.maxSp}`);
      this.syncPlayerDataset();
      return;
    }

    this.worldDebug?.set("lastSkillUse", result.success
? `${slot}:${result.skillId}:success:${result.damage}:${result.affectedTargetIds.join(",")}`
: `${slot}:${result.skillId}:failed:${result.reason}`);
    if (result.success) {
      eventBus.emit("skillUsed", { skillId: result.skillId, actorId: this.state.character.id });
      this.spawnSkillVfx(result.damage);
    }
    this.worldDebug?.set("skillCooldowns", Object.entries(this.state.character.skills.cooldowns)
.map(([skillId, readyAt]) => `${skillId}:${readyAt}`)
.join("|"));
    this.worldDebug?.set("playerSp", `${this.state.character.stats.sp}/${this.state.character.stats.maxSp}`);

    if (this.attackTarget) {
      this.syncEnemyDataset();
      eventBus.emit("enemyHealthChanged", {
        enemyId: this.attackTarget.id,
        name: this.attackTarget.name,
        hp: this.attackTarget.hp,
        maxHp: this.attackTarget.maxHp,
        boss: this.attackTarget.bossProtocolEnabled,
        phase: this.attackTarget.bossPhase,
      });

      if (!this.attackTarget.isAlive) {
        const defeated = this.attackTarget;
        this.worldDebug?.set("autoAttack", "stopped");
        this.worldDebug?.set("enemySelected", "false");
        this.handleEnemyDefeated(defeated);
        eventBus.emit("enemyTargetChanged", {
          enemyId: null,
          name: "",
          hp: 0,
          maxHp: 0,
        });
        this.attackTarget = undefined;
      }
    }

    this.playerCombatStats = this.createPlayerCombatStats(this.state, this.dataRegistry);
  }

  private decreaseMusicVolume(): void {
    if (this.consumeVolumeHotkey("music-down")) {
      audioManager.adjustMusicVolume(-0.1);
    }
  }

  private increaseMusicVolume(): void {
    if (this.consumeVolumeHotkey("music-up")) {
      audioManager.adjustMusicVolume(0.1);
    }
  }

  private decreaseSfxVolume(): void {
    if (this.consumeVolumeHotkey("sfx-down")) {
      audioManager.adjustSfxVolume(-0.1);
    }
  }

  private increaseSfxVolume(): void {
    if (this.consumeVolumeHotkey("sfx-up")) {
      audioManager.adjustSfxVolume(0.1);
    }
  }

  private consumeVolumeHotkey(key: string): boolean {
    const now = this.time.now;
    const last = this.lastVolumeHotkeyAt[key] ?? -Infinity;
    this.lastVolumeHotkeyAt[key] = now;

    return now - last > 120;
  }

  private toggleMusicMute(): void {
    audioManager.toggleMusicMute();
  }

  private toggleSfxMute(): void {
    audioManager.toggleSfxMute();
  }

  private toggleDamageNumbers(): void {
    if (!this.state) {
      return;
    }

    this.state.settings.damageNumbersEnabled = !this.state.settings.damageNumbersEnabled;
    this.syncVfxSettings();
  }

  private toggleVfxIntensity(): void {
    if (!this.state) {
      return;
    }

    this.state.settings.visualEffectsIntensity = this.state.settings.visualEffectsIntensity === "reduced" ? "full" : "reduced";
    this.syncVfxSettings();
  }

  private handleWorldKeydown = (event: KeyboardEvent): void => {
    if (event.code === "KeyU") {
      this.toggleVfxIntensity();
    }
  };

  private syncVfxSettings(): void {
    if (!this.state) {
      return;
    }

    this.vfxManager?.setOptions({
      damageNumbersEnabled: this.state.settings.damageNumbersEnabled,
      intensity: this.state.settings.visualEffectsIntensity,
    });
    this.worldDebug?.set("damageNumbersEnabled", String(this.state.settings.damageNumbersEnabled));
    this.worldDebug?.set("vfxIntensity", this.state.settings.visualEffectsIntensity);
  }

  private createSkillTarget(): SkillExecutionTarget | undefined {
    if (!this.player || !this.attackTarget || !this.attackTarget.isAlive) {
      return undefined;
    }

    const enemy = this.attackTarget;

    return {
      kind: "enemy",
      id: enemy.id,
      distance: Phaser.Math.Distance.Between(
        this.player.sprite.x,
        this.player.sprite.y,
        enemy.sprite.x,
        enemy.sprite.y,
      ),
      hp: enemy.hp,
      applyDamage: (damage: number) => this.damageEnemy(enemy, damage),
      applyStatusEffect: (effectId: string) => {
        const applied = this.applyStatusEffectToEnemy(enemy, effectId);
        const runtime = this.getEnemyRuntime(enemy);
        if (runtime) {
          runtime.damagedByPlayer = true;
        }
        this.worldDebug?.set("lastSkillStatusEffect", `${enemy.id}:${effectId}:${applied ? "applied" : "resisted"}`);
        this.syncEnemyDataset();
      },
    };
  }

  private updateAutoPotion(): void {
    if (!this.state || !this.dataRegistry) {
      return;
    }

    const result = updateAutoPotion(
      this.state,
      (id) => this.dataRegistry!.getItem(id),
      (id) => this.dataRegistry!.getStatusEffect(id),
    );

    if (!result) {
      return;
    }

    this.worldDebug?.set("lastAutoPotionUse", result.success
? `${result.itemId}:success:hp:${result.restoredHp}:sp:${result.restoredSp}`
: `${result.itemId}:failed:${result.reason}`);
    this.worldDebug?.set("consumableCooldowns", getConsumableCooldownSummary(this.state));
    this.worldDebug?.set("playerHp", `${this.state.character.stats.hp}/${this.state.character.stats.maxHp}`);
    this.worldDebug?.set("playerSp", `${this.state.character.stats.sp}/${this.state.character.stats.maxSp}`);
  }

  private updateSupportCompanion(): void {
    if (!this.state || !this.dataRegistry) {
      return;
    }

    const support = this.state.support.equippedSupportId
      ? this.dataRegistry.getSupport(this.state.support.equippedSupportId)
      : null;
    const result = updateSupportCompanion(
      this.state,
      support,
      (id) => this.dataRegistry!.getItem(id),
      (id) => this.dataRegistry!.getStatusEffect(id),
    );

    if (!result) {
      return;
    }

    this.worldDebug?.set("lastSupportAction", result.success
? `${result.supportId}:${result.actionId}:success:hp:${result.restoredHp}:cleanse:${result.cleansedStatusIds.join(",")}:status:${result.appliedStatusEffectIds.join(",")}`
: `${result.supportId}:${result.actionId}:failed`);
    if (result.success && result.restoredHp > 0 && this.player) {
      this.vfxManager?.spawnCombatText("healing", result.restoredHp, this.player.sprite.x, this.player.sprite.y - 34);
    }
    this.worldDebug?.set("playerHp", `${this.state.character.stats.hp}/${this.state.character.stats.maxHp}`);
    this.worldDebug?.set("playerStatusEffects", getStatusSummary(
this.state.character.statusEffects,
(id) => this.dataRegistry!.getStatusEffect(id),
));
    this.syncSupportDataset();
    this.playerCombatStats = this.createPlayerCombatStats(this.state, this.dataRegistry);
  }

  private updatePlayerStatusEffects(): void {
    if (!this.state || !this.dataRegistry || this.state.character.statusEffects.length === 0) {
      return;
    }

    const result = updateStatusEffects(
      this.state.character.statusEffects,
      (id) => this.dataRegistry!.getStatusEffect(id),
    );

    if (result.damage > 0) {
      this.state.character.stats.hp = Math.max(0, this.state.character.stats.hp - result.damage);
      this.vfxManager?.spawnCombatText("damage", result.damage, this.player?.sprite.x ?? 0, (this.player?.sprite.y ?? 0) - 34);
      this.vfxManager?.spawn("status-tick", this.player?.sprite.x ?? 0, this.player?.sprite.y ?? 0);
      eventBus.emit("playerHealthChanged", {
        hp: this.state.character.stats.hp,
        maxHp: this.state.character.stats.maxHp,
      });
      if (this.state.character.stats.hp === 0) {
        this.handlePlayerDeath("status-effect");
      }
    }

    if (result.damage > 0 || result.expiredIds.length > 0 || result.tickedIds.length > 0) {
      emitStatusEffectsChanged("player", this.state.character.id, this.state.character.statusEffects);
      this.worldDebug?.set("playerStatusEffects", getStatusSummary(
this.state.character.statusEffects,
(id) => this.dataRegistry!.getStatusEffect(id),
));
      this.worldDebug?.set("lastStatusTick", `player:${result.damage}:${result.tickedIds.join(",")}:${result.expiredIds.join(",")}`);
      this.playerCombatStats = this.createPlayerCombatStats(this.state, this.dataRegistry);
    }
  }

  private updateEnemyStatusEffects(): void {
    if (!this.dataRegistry) {
      return;
    }

    for (const enemy of this.enemies) {
      if (enemy.statusEffects.length === 0) {
        continue;
      }

      const result = updateStatusEffects(
        enemy.statusEffects,
        (id) => this.dataRegistry!.getStatusEffect(id),
      );

      if (result.damage > 0) {
        this.damageEnemy(enemy, result.damage, false);
        this.vfxManager?.spawnCombatText("damage", result.damage, enemy.sprite.x, enemy.sprite.y - 38);
        this.vfxManager?.spawn("status-tick", enemy.sprite.x, enemy.sprite.y);
        eventBus.emit("enemyHealthChanged", {
          enemyId: enemy.id,
          name: enemy.name,
          hp: enemy.hp,
          maxHp: enemy.maxHp,
          boss: enemy.bossProtocolEnabled,
          phase: enemy.bossPhase,
        });
      }

      if (result.damage > 0 || result.expiredIds.length > 0 || result.tickedIds.length > 0) {
        emitStatusEffectsChanged("enemy", enemy.id, enemy.statusEffects);
        this.syncEnemyDataset();
        this.worldDebug?.set("lastStatusTick", `enemy:${result.damage}:${result.tickedIds.join(",")}:${result.expiredIds.join(",")}`);
      }

      if (!enemy.isAlive && this.attackTarget === enemy) {
        this.worldDebug?.set("autoAttack", "stopped");
        this.worldDebug?.set("enemySelected", "false");
        this.handleEnemyDefeated(enemy);
        eventBus.emit("enemyTargetChanged", {
          enemyId: null,
          name: "",
          hp: 0,
          maxHp: 0,
        });
        this.attackTarget = undefined;
      }
    }
  }

  private hasEnemyControl(
    enemy: EnemyEntity,
    controlEffect: "freeze" | "stun" | "silence" | "blind" | "slow",
  ): boolean {
    if (enemy.bossProtocolEnabled) {
      this.worldDebug?.set("lastBossControlResist", `${enemy.id}:${controlEffect}`);
      return false;
    }

    return Boolean(this.dataRegistry && hasControlEffect(
      enemy.statusEffects,
      (id) => this.dataRegistry!.getStatusEffect(id),
      controlEffect,
    ));
  }

  private damageEnemy(enemy: EnemyEntity, amount: number, fromPlayer = true): void {
    if (fromPlayer) {
      const runtime = this.getEnemyRuntime(enemy);
      if (runtime) {
        runtime.damagedByPlayer = true;
        runtime.assistedByAlly = false;
        runtime.elapsedInCombatMs = 0;
      }
      this.callNearbyAssist(enemy);
    }

    const previousPhase = enemy.bossPhase;
    enemy.takeDamage(amount);
    this.applyPlayerKnockback(enemy, fromPlayer ? playerAttackKnockbackDistance : 0);
    this.handleBossPhaseChange(enemy, previousPhase);
  }

  private applyStatusEffectToEnemy(enemy: EnemyEntity, effectId: string): boolean {
    if (!this.dataRegistry || !this.state) {
      return false;
    }

    const definition = this.dataRegistry.getStatusEffect(effectId);

    if (enemy.bossProtocolEnabled && definition.type === "control") {
      this.worldDebug?.set("lastBossControlResist", `${enemy.id}:${definition.controlEffect ?? effectId}`);
      emitStatusEffectsChanged("enemy", enemy.id, enemy.statusEffects);
      return false;
    }

    applyStatusEffect(enemy.statusEffects, definition, this.state.character.id);
    emitStatusEffectsChanged("enemy", enemy.id, enemy.statusEffects);
    return true;
  }

  private applyPlayerKnockback(enemy: EnemyEntity, distance: number): void {
    if (!this.player || !enemy.isAlive || !enemy.bossProtocolEnabled || distance <= 0) {
      return;
    }

    const resistedDistance = enemy.getKnockbackDistance(distance);
    this.worldDebug?.set("lastBossKnockbackResist", `${enemy.id}:${distance}->${resistedDistance.toFixed(1)}`);

    if (resistedDistance < 4) {
      return;
    }

    const body = enemy.sprite.body as Phaser.Physics.Arcade.Body | null;
    const direction = new Phaser.Math.Vector2(enemy.sprite.x - this.player.sprite.x, enemy.sprite.y - this.player.sprite.y);

    if (direction.length() <= 1) {
      direction.set(1, 0);
    }

    direction.normalize();
    body?.reset(enemy.sprite.x + direction.x * resistedDistance, enemy.sprite.y + direction.y * resistedDistance);
  }

  private handleBossPhaseChange(enemy: EnemyEntity, previousPhase: number): void {
    if (!enemy.bossProtocolEnabled || !this.state || !this.dataRegistry) {
      return;
    }

    this.syncBossProtocolDataset(enemy);

    if (enemy.bossPhase !== previousPhase) {
      this.worldDebug?.set("lastBossPhase", `${enemy.id}:${previousPhase}->${enemy.bossPhase}`);
    }

    const monster = this.dataRegistry.getMonster(enemy.id);
    const phase = resolveBossPhase(monster, enemy.hp, enemy.maxHp);
    const phaseChange = recordBossPhase(this.state, enemy.id, phase);

    if (phase) {
      this.worldDebug?.set("bossPhaseData", [
phase.id,
phase.behavior,
phase.dialogueId ?? "",
phase.vfxKey ?? "",
phase.attackIds.join(","),
].join(":"));
    }

    if (phaseChange) {
      this.worldDebug?.set("lastBossPhaseData", phaseChange);
    }
  }

  private handleEnemyDefeated(enemy: EnemyEntity): void {
    const runtime = this.getEnemyRuntime(enemy);

    if (runtime) {
      runtime.damagedByPlayer = false;
      runtime.assistedByAlly = false;
      runtime.elapsedInCombatMs = 0;
    }

    this.rewardEnemyKill(enemy);

    if (enemy.boss) {
      this.worldDebug?.set("bossUi", "hidden");
    }
  }

  private callNearbyAssist(source: EnemyEntity): void {
    const sourceRuntime = this.getEnemyRuntime(source);

    for (const runtime of this.enemyRuntimes) {
      if (
        runtime.enemy === source
        || !runtime.enemy.isAlive
        || runtime.enemy.behavior !== "assist"
        || !sourceRuntime
        || runtime.zoneId !== sourceRuntime.zoneId
      ) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(
        source.sprite.x,
        source.sprite.y,
        runtime.enemy.sprite.x,
        runtime.enemy.sprite.y,
      );

      if (distance <= runtime.enemy.assistRadius) {
        runtime.assistedByAlly = true;
        runtime.elapsedInCombatMs = 0;
        this.worldDebug?.set("lastAssistCall", `${source.id}:${runtime.enemy.id}`);
      }
    }

    this.syncAssistDataset();
  }

  private rewardEnemyKill(enemy: EnemyEntity): void {
    const state = this.state;
    const dataRegistry = this.dataRegistry;

    if (!state || !dataRegistry) {
      return;
    }

    const monster = dataRegistry.getMonster(enemy.id);
    const dropTable = dataRegistry.getDropTable(monster.dropTableId);
    const bestiaryEntry = recordMonsterKill(state, monster, dropTable);
    this.worldDebug?.set("bestiaryKills", this.getBestiaryKillDataset());
    this.worldDebug?.set("lastBestiaryUpdate", `${monster.id}:${bestiaryEntry.kills}`);
    const xpResult = awardXp(state, dataRegistry.getXpTable("standard"), monster.xpReward);
    this.worldDebug?.set("lastXpGain", String(xpResult.amount));
    this.worldDebug?.set("playerXp", String(xpResult.totalXp));
    this.worldDebug?.set("playerXpNext", String(xpResult.nextLevelXp ?? ""));
    this.worldDebug?.set("playerLevel", String(state.playerProfile.level));
    this.worldDebug?.set("playerStatPoints", String(state.playerProfile.statPoints));
    this.worldDebug?.set("playerSkillPoints", String(state.playerProfile.skillPoints));
    this.worldDebug?.set("playerHp", `${state.character.stats.hp}/${state.character.stats.maxHp}`);
    this.worldDebug?.set("playerSp", `${state.character.stats.sp}/${state.character.stats.maxSp}`);

    if (xpResult.levelsGained.length > 0) {
      this.worldDebug?.set("lastLevelUp", String(xpResult.levelsGained.at(-1)));
      this.recordQuestEvent("reachLevel", String(state.playerProfile.level), state.playerProfile.level);
    }

    this.recordQuestEvent("killMonster", enemy.id);
    eventBus.emit("enemyKilled", { enemyId: enemy.id });
    const huntingProgress = recordHuntingBoardKill(state, dataRegistry, enemy.id);
    this.worldDebug?.set("lastHuntingBoardProgress", huntingProgress.join("|"));
    this.syncHuntingBoardDataset();

    if (enemy.boss) {
      const unlockedRegionId = unlockBossContractForMonster(state, dataRegistry, enemy.id);
      this.worldDebug?.set("lastHuntingBoardUnlock", unlockedRegionId ? `${unlockedRegionId}:boss` : "");
    }

    const drops = generateLootDrops(dropTable, dataRegistry, Math.random, {
      quality: enemy.boss ? "boss" : enemy.elite ? "elite" : "normal",
    });
    this.applySupportMaterialFinder(drops, dropTable.entries);
    if (enemy.bossProtocolEnabled) {
      drops.push({ kind: "gold", quantity: bossRewardGold });
      this.worldDebug?.set("lastBossReward", `${enemy.id}:gold:${bossRewardGold}`);
    }
    const bossRewards = enemy.boss ? completeBossEncounter(state, monster, dataRegistry) : [];
    if (bossRewards.length > 0) {
      this.worldDebug?.set("lastMvpReward", `${enemy.id}:${bossRewards.join(",")}`);
    }
    this.completeActiveChallengeForBoss(enemy.id);
    this.syncBossEncounterDataset();
    const support = state.support.equippedSupportId ? dataRegistry.getSupport(state.support.equippedSupportId) : null;
    grantSupportAffinity(state, support, Math.max(1, Math.ceil(monster.xpReward / 2)));
    this.syncSupportDataset();
    drops.forEach((drop, index) => this.spawnLootDrop(drop, enemy.sprite.x + index * 28, enemy.sprite.y + 18));

    if (enemy.boss && refreshHuntingBoard(state, "boss-kill")) {
      this.syncHuntingBoardDataset();
    } else if (this.enemies.every((entry) => !entry.isAlive) && refreshHuntingBoard(state, "map-clear")) {
      this.syncHuntingBoardDataset();
    }
  }

  private syncHuntingBoardDataset(): void {
    if (!this.state || !this.dataRegistry) {
      return;
    }

    const map = this.dataRegistry.getMap(this.state.currentMapId);
    this.worldDebug?.set("huntingBoardSummary", getHuntingBoardSummary(this.state, this.dataRegistry, map.regionId));
    this.worldDebug?.set("huntingBoardRefreshCount", String(this.state.huntingBoard.refreshCount));
    this.worldDebug?.set("huntingBoardLastRefresh", this.state.huntingBoard.lastRefreshReason);
  }

  private recordQuestEvent(type: Parameters<typeof updateQuestObjectives>[2]["type"], targetId: string, amount?: number): void {
    if (!this.state || !this.dataRegistry) {
      return;
    }

    const progress = updateQuestObjectives(this.state, this.dataRegistry, { type, targetId, amount } as Parameters<typeof updateQuestObjectives>[2]);
    this.worldDebug?.set("lastQuestProgress", progress.join("|"));
  }

  private getBestiaryKillDataset(): string {
    if (!this.state) {
      return "";
    }

    return Object.values(this.state.bestiary.entries)
      .sort((left, right) => left.monsterId.localeCompare(right.monsterId))
      .map((entry) => `${entry.monsterId}:${entry.kills}`)
      .join("|");
  }

  private applySupportMaterialFinder(
    drops: LootDrop[],
    entries: Array<{ itemId?: string; type?: "item" | "gold" }>,
  ): void {
    if (!this.state || !this.dataRegistry || !this.state.support.equippedSupportId) {
      return;
    }

    const support = this.dataRegistry.getSupport(this.state.support.equippedSupportId);
    const finder = support.effects.materialFinder;

    if (!finder || Math.random() > finder.chanceBonus) {
      return;
    }

    const materialEntry = entries.find((entry) => (
      entry.itemId && this.dataRegistry!.getItem(entry.itemId).type === finder.itemType
    ));

    if (!materialEntry?.itemId || drops.some((drop) => drop.kind === "item" && drop.itemId === materialEntry.itemId)) {
      return;
    }

    drops.push({ kind: "item", itemId: materialEntry.itemId, quantity: 1 });
    this.state.support.cooldowns["material-ping"] = Date.now() + 9000;
    this.worldDebug?.set("lastSupportAction", `${support.id}:material-ping:success:${materialEntry.itemId}`);
  }

  private spawnLootDrop(drop: LootDrop, x: number, y: number): void {
    const id = `loot-${Date.now()}-${this.droppedLoot.length}`;
    const markerColor = drop.kind === "gold" ? 0xfacc15 : 0x38bdf8;
    const marker = this.add.rectangle(x, y, 22, 18, markerColor, 0.9)
      .setStrokeStyle(2, 0xf8fafc, 0.9)
      .setDepth(16);
    const label = this.add.text(x, y - 24, this.getLootLabel(drop), {
      color: "#f8fafc",
      fontFamily: "Arial, sans-serif",
      fontSize: "12px",
    })
      .setOrigin(0.5)
      .setDepth(17);

    if (drop.kind === "item") {
      const rarity = getItemRarity(this.dataRegistry!.getItem(drop.itemId));
      this.vfxManager?.spawnLootBeam(rarity, x, y);
    }

    this.droppedLoot.push({ id, drop, marker, label });
    this.worldDebug?.set("lastLootDrop", this.getLootDatasetValue(drop));
    this.worldDebug?.set("pendingLootCount", String(this.droppedLoot.length));
    this.worldDebug?.set("lootPosition", `${Math.round(x)},${Math.round(y)}`);
    eventBus.emit("lootDropped", this.getLootEventPayload(drop));

    if (this.trySupportAutoPickup(this.droppedLoot[this.droppedLoot.length - 1])) {
      this.worldDebug?.set("lastSupportAction", `auto-pickup:${this.getLootDatasetValue(drop)}`);
    }
  }

  private collectClickedLoot(x: number, y: number): boolean {
    const loot = this.droppedLoot.find((entry) => entry.marker.getBounds().contains(x, y));

    if (!loot || !this.state || !this.dataRegistry) {
      return false;
    }

    if (loot.drop.kind === "gold") {
      addGold(this.state.inventory, loot.drop.quantity);
      this.state.playerProfile.gold = this.state.inventory.gold;
    } else {
      addInventoryItem(this.state.inventory, this.dataRegistry.getItem(loot.drop.itemId), loot.drop.quantity);
      this.recordQuestEvent("collectItem", loot.drop.itemId, loot.drop.quantity);
    }

    loot.marker.destroy();
    loot.label.destroy();
    this.droppedLoot = this.droppedLoot.filter((entry) => entry !== loot);
    this.worldDebug?.set("lastLootPickup", this.getLootDatasetValue(loot.drop));
    this.worldDebug?.set("pendingLootCount", String(this.droppedLoot.length));
    this.worldDebug?.set("inventoryGold", String(this.state.inventory.gold));
    this.worldDebug?.set("playerGold", String(this.state.playerProfile.gold));
    this.worldDebug?.set("inventoryStackCount", String(this.state.inventory.items.length));
    this.worldDebug?.set("equipmentInstanceCount", String(this.state.inventory.equipmentInstances.length));
    eventBus.emit("lootPickedUp", this.getLootEventPayload(loot.drop));

    return true;
  }

  private trySupportAutoPickup(loot: DroppedLootObject): boolean {
    if (!this.state || !this.dataRegistry) {
      return false;
    }

    const support = this.state.support.equippedSupportId
      ? this.dataRegistry.getSupport(this.state.support.equippedSupportId)
      : null;

    if (!shouldSupportAutoPickup(this.state, support, loot.drop, (id) => this.dataRegistry!.getItem(id))) {
      return false;
    }

    if (loot.drop.kind === "gold") {
      addGold(this.state.inventory, loot.drop.quantity);
      this.state.playerProfile.gold = this.state.inventory.gold;
    } else {
      addInventoryItem(this.state.inventory, this.dataRegistry.getItem(loot.drop.itemId), loot.drop.quantity);
      this.recordQuestEvent("collectItem", loot.drop.itemId, loot.drop.quantity);
    }

    loot.marker.destroy();
    loot.label.destroy();
    this.droppedLoot = this.droppedLoot.filter((entry) => entry !== loot);
    this.worldDebug?.set("lastLootPickup", this.getLootDatasetValue(loot.drop));
    this.worldDebug?.set("pendingLootCount", String(this.droppedLoot.length));
    eventBus.emit("lootPickedUp", this.getLootEventPayload(loot.drop));
    return true;
  }

  private getLootLabel(drop: LootDrop): string {
    if (drop.kind === "gold") {
      return `${drop.quantity} gold`;
    }

    return this.dataRegistry?.getItem(drop.itemId).name ?? drop.itemId;
  }

  private getLootDatasetValue(drop: LootDrop): string {
    return drop.kind === "gold" ? `gold:${drop.quantity}` : `${drop.itemId}:${drop.quantity}`;
  }

  private getLootEventPayload(drop: LootDrop): { kind: "item" | "gold"; itemId?: string; quantity: number } {
    return drop.kind === "gold"
      ? { kind: "gold", quantity: drop.quantity }
      : { kind: "item", itemId: drop.itemId, quantity: drop.quantity };
  }

  private enemyAttack(enemy: EnemyEntity): void {
    const state = this.state;

    if (!state || !this.playerCombatStats) {
      return;
    }

    const result = resolveAttack({
      attacker: this.createEnemyCombatStats(enemy),
      defender: this.playerCombatStats,
      attackKind: "physical",
      weaponAttack: 0,
      debug: import.meta.env.DEV,
    });
    const difficulty = difficultyPresets[state.settings.difficulty];
    const finalDamage = result.hit
      ? Math.max(1, Math.floor(result.finalDamage * difficulty.playerMitigationMultiplier))
      : 0;

    if (this.player && enemy.behavior !== "caster") {
      this.playMeleeLunge(enemy.sprite, this.player.sprite, `${enemy.id}:player`);
    }
    state.character.stats.hp = Math.max(0, state.character.stats.hp - finalDamage);
    this.vfxManager?.spawnCombatText(
      result.hit ? "damage" : "miss",
      finalDamage,
      this.player?.sprite.x ?? enemy.sprite.x,
      (this.player?.sprite.y ?? enemy.sprite.y) - 34,
    );
    eventBus.emit("playerHealthChanged", {
      hp: state.character.stats.hp,
      maxHp: state.character.stats.maxHp,
    });

    if (state.character.stats.hp === 0) {
      this.handlePlayerDeath(enemy.id);
    }
  }

  private handlePlayerDeath(source: string): void {
    if (!this.state || this.game.canvas.dataset.playerCombatState === "dead") {
      return;
    }

    this.worldDebug?.set("playerCombatState", "dead");
    this.worldDebug?.set("autoAttack", "stopped");
    this.worldDebug?.set("enemySelected", "false");
    this.worldDebug?.set("gameplayInputBlocked", "true");
    this.worldDebug?.set("lastDeathSource", source);
    this.worldDebug?.set("respawnTargetMap", this.getRespawnTownId());
    this.worldDebug?.set("respawnTargetName", this.getRespawnTownName());
    this.player?.clearDestination();
    this.attackTarget = undefined;

    for (const runtime of this.enemyRuntimes) {
      runtime.damagedByPlayer = false;
      runtime.assistedByAlly = false;
      runtime.castWindupMs = null;
      runtime.enemy.setCastProgress(null);
      runtime.enemy.behaviorMode = runtime.enemy.isAlive ? "idle" : "dead";
    }

    const resetBossId = resetActiveBossEncounter(this.state);
    this.state.challengeDungeons.activeRun = null;
    this.state.challengeDungeons.activeClassTrialId = null;
    this.worldDebug?.set("lastBossReset", resetBossId ?? "");
    this.worldDebug?.set("challengeDungeonActive", "");
    this.worldDebug?.set("challengeDungeonModifier", "");
    this.worldDebug?.set("challengeDungeonDifficulty", "");
    this.worldDebug?.set("challengeDungeonRewards", "");
    this.syncBossEncounterDataset();
    this.scene.launch(SceneKeys.GameOver, {
      deathSource: source,
      respawnMapId: this.getRespawnTownId(),
      respawnMapName: this.getRespawnTownName(),
    });
    this.scene.bringToTop(SceneKeys.GameOver);
  }

  private recordVisitedSafeHub(map: MapDefinition): void {
    if (!this.state || !this.isSafeHub(map)) {
      return;
    }

    this.state.worldFlags.lastVisitedTownId = map.id;
    this.state.worldFlags.lastVisitedTownName = map.name;
  }

  private isSafeHub(map: MapDefinition): boolean {
    return map.monsterIds.length === 0 && map.spawnGroups.length === 0;
  }

  private getRespawnTownId(): string {
    const mapId = this.state?.worldFlags.lastVisitedTownId;

    return typeof mapId === "string" && mapId.length > 0 ? mapId : fallbackRespawnTownId;
  }

  private getRespawnTownName(): string {
    const mapName = this.state?.worldFlags.lastVisitedTownName;

    if (typeof mapName === "string" && mapName.length > 0) {
      return mapName;
    }

    return this.dataRegistry?.getMap(fallbackRespawnTownId).name ?? "Crownfield";
  }

  private moveIntoAttackRange(enemy: EnemyEntity): void {
    if (!this.player || !this.collisionMap) {
      return;
    }

    const path = findPath(this.collisionMap, this.player.position, enemy.position);

    if (path.length > 0) {
      this.player.setPath(path);
      this.worldDebug?.set("lastMovementClickValid", "true");
      this.worldDebug?.set("lastPathLength", String(path.length));
    }
  }

  private updateEnemyAi(deltaMs: number): void {
    if (!this.player || !this.state || this.state.character.stats.hp <= 0 || this.isDialogueOpen) {
      return;
    }

    for (const runtime of this.enemyRuntimes) {
      const enemy = runtime.enemy;

      if (!enemy.isAlive) {
        enemy.behaviorMode = "dead";
        runtime.damagedByPlayer = false;
        runtime.assistedByAlly = false;
        runtime.castWindupMs = null;
        enemy.setCastProgress(null);
        continue;
      }

      enemy.updateVisuals();

      if (this.attackTarget === enemy && enemy.behavior !== "caster") {
        this.stopEnemy(enemy);
        continue;
      }

      const inCombat = runtime.damagedByPlayer
        || runtime.assistedByAlly
        || this.attackTarget === enemy
        || enemy.behaviorMode === "chasing"
        || enemy.behaviorMode === "attacking"
        || enemy.behaviorMode === "casting";
      runtime.elapsedInCombatMs = inCombat ? runtime.elapsedInCombatMs + deltaMs : 0;
      runtime.castTimerMs += deltaMs;

      const allyInCombat = this.enemyRuntimes.some((allyRuntime) => (
        allyRuntime !== runtime
        && allyRuntime.zoneId === runtime.zoneId
        && allyRuntime.damagedByPlayer
        && Phaser.Math.Distance.Between(
          allyRuntime.enemy.sprite.x,
          allyRuntime.enemy.sprite.y,
          enemy.sprite.x,
          enemy.sprite.y,
        ) <= enemy.assistRadius
      ));
      const playerIsStealthed = this.hasPlayerStealth();
      const distanceToPlayer = Phaser.Math.Distance.Between(
        enemy.sprite.x,
        enemy.sprite.y,
        this.player.sprite.x,
        this.player.sprite.y,
      );
      const bossDetectedStealth = playerIsStealthed && enemy.detectsStealth(distanceToPlayer, enemy.aggroRange);
      const aggroRange = playerIsStealthed && !bossDetectedStealth ? 0 : enemy.aggroRange;

      if (bossDetectedStealth) {
        this.worldDebug?.set("lastBossStealthDetection", `${enemy.id}:${Math.round(distanceToPlayer)}`);
      }

      const intent = decideEnemyAiIntent({
        behavior: enemy.behavior,
        mode: enemy.behaviorMode,
        home: runtime.home,
        position: enemy.position,
        playerPosition: this.player.position,
        damagedByPlayer: runtime.damagedByPlayer || this.attackTarget === enemy,
        assistedByAlly: runtime.assistedByAlly,
        allyInCombat,
        elapsedInCombatMs: runtime.elapsedInCombatMs,
        aggroRange,
        attackRange: enemy.attackRange,
        leashDistance: enemy.leashDistance,
        leashTimeoutMs: enemy.leashTimeoutMs,
        assistRadius: enemy.assistRadius,
        castRange: enemy.castRange,
        silenced: this.hasEnemyControl(enemy, "silence"),
      });

      this.applyEnemyAiIntent(runtime, intent, deltaMs);
    }
  }

  private applyEnemyAiIntent(runtime: EnemyRuntime, intent: "idle" | "chase" | "attack" | "cast" | "return", deltaMs: number): void {
    const enemy = runtime.enemy;

    if (!this.player) {
      return;
    }

    if (intent === "idle") {
      enemy.behaviorMode = "idle";
      runtime.damagedByPlayer = false;
      runtime.assistedByAlly = false;
      runtime.castWindupMs = null;
      enemy.setCastProgress(null);
      this.stopEnemy(enemy);
      return;
    }

    if (intent === "return") {
      enemy.behaviorMode = "returning";
      runtime.damagedByPlayer = false;
      runtime.assistedByAlly = false;
      runtime.castWindupMs = null;
      enemy.setCastProgress(null);
      this.moveEnemyToward(enemy, runtime.home, 54);
      this.worldDebug?.set("lastEnemyLeash", enemy.id);
      return;
    }

    if (intent === "cast") {
      const distanceToPlayer = Phaser.Math.Distance.Between(
        enemy.sprite.x,
        enemy.sprite.y,
        this.player.sprite.x,
        this.player.sprite.y,
      );
      const retreatDistance = this.getCasterRetreatDistance(enemy);

      if (distanceToPlayer < retreatDistance && this.moveEnemyAwayFrom(enemy, this.player.position, 58)) {
        enemy.behaviorMode = "chasing";
        runtime.castWindupMs = null;
        enemy.setCastProgress(null);
        this.worldDebug?.set("lastEnemyKeepDistance", `${enemy.id}:${Math.round(distanceToPlayer)}<${Math.round(retreatDistance)}`);
        return;
      }

      this.stopEnemy(enemy);

      if (runtime.castTimerMs < enemy.castCooldownMs) {
        enemy.behaviorMode = "attacking";
        runtime.castWindupMs = null;
        enemy.setCastProgress(null);
        return;
      }

      enemy.behaviorMode = "casting";
      runtime.castWindupMs = (runtime.castWindupMs ?? 0) + deltaMs;
      enemy.setCastProgress(runtime.castWindupMs / enemyCastWindupMs);
      this.worldDebug?.set("lastEnemyCastStart", enemy.id);

      if (runtime.castWindupMs >= enemyCastWindupMs) {
        runtime.castTimerMs = 0;
        runtime.castWindupMs = null;
        enemy.setCastProgress(null);
        this.enemyAttack(enemy);
        this.worldDebug?.set("lastEnemyCast", enemy.id);
      }
      return;
    }

    if (intent === "attack") {
      enemy.behaviorMode = "attacking";
      this.stopEnemy(enemy);
      runtime.castWindupMs = null;
      enemy.setCastProgress(null);
      runtime.attackTimerMs += deltaMs;

      if (enemy !== this.attackTarget && runtime.attackTimerMs >= enemyAttackCooldownMs) {
        runtime.attackTimerMs = 0;
        this.enemyAttack(enemy);
      }
      return;
    }

    enemy.behaviorMode = "chasing";
    runtime.castWindupMs = null;
    enemy.setCastProgress(null);
    this.moveEnemyToward(enemy, this.player.position, 62);
  }

  private getCasterRetreatDistance(enemy: EnemyEntity): number {
    return Math.min(enemy.castRange - 16, Math.max(enemy.attackRange + 26, enemy.castRange * 0.58));
  }

  private moveEnemyAwayFrom(enemy: EnemyEntity, threat: { x: number; y: number }, speed: number): boolean {
    const body = enemy.sprite.body as Phaser.Physics.Arcade.Body | null;

    if (!body) {
      return false;
    }

    const direction = new Phaser.Math.Vector2(enemy.sprite.x - threat.x, enemy.sprite.y - threat.y);

    if (direction.length() <= 1) {
      direction.set(1, 0);
    }

    direction.normalize();
    const nextX = enemy.sprite.x + direction.x * 16;
    const nextY = enemy.sprite.y + direction.y * 16;

    if (!this.isWalkable(nextX, nextY)) {
      body.setVelocity(0, 0);
      return false;
    }

    body.setVelocity(direction.x * speed, direction.y * speed);
    return true;
  }

  private moveEnemyToward(enemy: EnemyEntity, target: { x: number; y: number }, speed: number): void {
    const body = enemy.sprite.body as Phaser.Physics.Arcade.Body | null;

    if (!body) {
      return;
    }

    const direction = new Phaser.Math.Vector2(target.x - enemy.sprite.x, target.y - enemy.sprite.y);

    if (direction.length() <= 6) {
      body.setVelocity(0, 0);
      return;
    }

    direction.normalize();
    body.setVelocity(direction.x * speed, direction.y * speed);
  }

  private stopEnemy(enemy: EnemyEntity): void {
    const body = enemy.sprite.body as Phaser.Physics.Arcade.Body | null;
    body?.setVelocity(0, 0);
  }

  private updateSpawnZones(deltaMs: number): void {
    if (!this.dataRegistry || !this.state) {
      return;
    }

    const readyMvpIds = updateMvpRespawnTimers(
      this.state,
      this.dataRegistry.getMonsters().filter((monster) => Boolean(monster.mvp)),
      deltaMs,
    );
    if (readyMvpIds.length > 0) {
      this.worldDebug?.set("lastMvpRespawnReady", readyMvpIds.join("|"));
    }

    for (const zone of this.spawnZones) {
      const aliveCount = this.enemyRuntimes.filter((runtime) => runtime.zoneId === zone.id && runtime.enemy.isAlive).length;

      if (aliveCount >= zone.maxCount) {
        zone.respawnTimerMs = 0;
        continue;
      }

      zone.respawnTimerMs += deltaMs;
      const monster = this.dataRegistry.getMonster(zone.monsterId);
      if (monster.mvp && (this.state.bossEncounters.mvpRespawnTimers[monster.id] ?? 0) > 0) {
        continue;
      }
      const respawnMs = getEffectiveEnemyRespawnMs(zone.respawnMs, monster);

      if (zone.respawnTimerMs >= respawnMs) {
        zone.respawnTimerMs = 0;
        this.spawnEnemyFromZone(zone, null);
        this.worldDebug?.set("lastEnemyRespawn", zone.id);
      }
    }
  }

  private getEnemyRuntime(enemy: EnemyEntity): EnemyRuntime | undefined {
    return this.enemyRuntimes.find((runtime) => runtime.enemy === enemy);
  }

  private syncPlayerDataset(): void {
    if (!this.player) {
      return;
    }

    const { x, y } = this.player.position;
    if (this.state) {
      this.state.position = { x, y };
    }
    this.worldDebug?.set("playerX", x.toFixed(1));
    this.worldDebug?.set("playerY", y.toFixed(1));
    this.worldDebug?.set("playerDirection", this.player.direction);
    this.worldDebug?.set("playerMotionState", this.player.motionState);
    this.worldDebug?.set("playerAnimationState", this.player.animationState);
    this.worldDebug?.set("playerDestination", this.player.destination
? `${this.player.destination.x.toFixed(1)},${this.player.destination.y.toFixed(1)}`
: "");
    this.worldDebug?.set("playerPathRemaining", String(this.player.path.length));
    this.worldDebug?.set("cameraFollowingPlayer", String(this.isCameraFollowingPlayer));
    this.worldDebug?.set("playerStatusEffects", this.dataRegistry && this.state
? getStatusSummary(this.state.character.statusEffects, (id) => this.dataRegistry!.getStatusEffect(id))
: "");
    if (this.state) {
      this.worldDebug?.set("consumableCooldowns", getConsumableCooldownSummary(this.state));
      this.worldDebug?.set("autoPotionSettings", getAutoPotionSettingsSummary(this.state));
      this.worldDebug?.set("supportSummary", getSupportSummary(this.state));
    }
  }

  private syncSupportDataset(): void {
    if (!this.state || !this.dataRegistry) {
      return;
    }

    const support = this.state.support.equippedSupportId
      ? this.dataRegistry.getSupport(this.state.support.equippedSupportId)
      : null;

    this.worldDebug?.set("supportSummary", getSupportSummary(this.state));
    this.worldDebug?.set("supportCompanion", support?.id ?? "");
    this.worldDebug?.set("supportCompanionName", support?.name ?? "");
    this.worldDebug?.set("supportLevel", support ? String(this.state.support.levels[support.id] ?? 1) : "");
    this.worldDebug?.set("supportAffinity", support ? String(this.state.support.affinity[support.id] ?? 0) : "");
    this.worldDebug?.set("supportAutoPickupFilter", this.state.support.autoPickupFilter);
  }

  private syncEnemyDataset(): void {
    this.refreshPrimaryEnemy();
    const aliveEnemies = this.enemies.filter((enemy) => enemy.isAlive);
    this.worldDebug?.set("enemyEntityCount", String(this.enemies.length));
    this.worldDebug?.set("enemyAliveCount", String(aliveEnemies.length));
    this.worldDebug?.set("enemyPositions", aliveEnemies
.map((enemy) => `${enemy.sprite.x.toFixed(1)},${enemy.sprite.y.toFixed(1)}`)
.join("|"));
    this.worldDebug?.set("enemySpawnMinimumDistance", String(monsterSpawnMinimumDistance));

    if (!this.enemy) {
      this.worldDebug?.set("enemyHp", "");
      this.worldDebug?.set("enemyCombatState", "");
      this.worldDebug?.set("enemySelected", "false");
      this.worldDebug?.set("enemyAlive", "false");
      this.worldDebug?.set("enemyCastRange", "");
      this.worldDebug?.set("enemyCastCooldown", "");
      this.worldDebug?.set("enemyCastCooldownRemaining", "0");
      this.worldDebug?.set("enemyCastTelegraph", "hidden");
      this.worldDebug?.set("enemySilenced", "false");
      this.worldDebug?.set("enemyVisualMarker", "none");
      this.worldDebug?.set("enemyTextureKey", "");
      this.worldDebug?.set("enemyRespawnMs", "");
      this.worldDebug?.set("enemyDamage", "");
      this.worldDebug?.set("bossProtocol", "disabled");
      this.worldDebug?.set("bossPhase", "");
      this.worldDebug?.set("bossHp", "");
      this.syncBossEncounterDataset();
      this.syncAssistDataset();
      return;
    }

    this.worldDebug?.set("enemyHp", `${this.enemy.hp}/${this.enemy.maxHp}`);
    this.worldDebug?.set("enemyCombatState", this.enemy.behaviorMode);
    this.worldDebug?.set("enemySelected", String(this.enemy.targetingState.selected));
    this.worldDebug?.set("enemyAlive", String(this.enemy.isAlive));
    this.worldDebug?.set("enemyPosition", `${this.enemy.sprite.x.toFixed(1)},${this.enemy.sprite.y.toFixed(1)}`);
    this.worldDebug?.set("enemyTextureKey", this.enemy.textureKey);
    this.worldDebug?.set("enemyBehavior", this.enemy.behavior);
    this.worldDebug?.set("enemyTraits", this.getEnemyTraitDataset(this.enemy));
    this.worldDebug?.set("enemyVisualMarker", this.getEnemyVisualMarkerDataset(this.enemy));
    this.worldDebug?.set("enemyRespawnMs", String(this.enemy.respawnMs));
    this.worldDebug?.set("enemyDamage", String(this.enemy.stats.attack));
    this.worldDebug?.set("enemyAggroRange", String(this.enemy.aggroRange));
    this.worldDebug?.set("enemyLeashDistance", String(this.enemy.leashDistance));
    this.worldDebug?.set("enemyAssistRadius", String(this.enemy.assistRadius));
    this.worldDebug?.set("enemyCastRange", String(this.enemy.castRange));
    this.worldDebug?.set("enemyCastCooldown", String(this.enemy.castCooldownMs));
    this.worldDebug?.set("enemyStatusEffects", this.dataRegistry
? getStatusSummary(this.enemy.statusEffects, (id) => this.dataRegistry!.getStatusEffect(id))
: "");
    this.syncBossProtocolDataset(this.enemy);
    this.syncBossEncounterDataset();
    this.syncCasterDataset(this.enemy);
    this.syncAssistDataset();
  }

  private syncBossProtocolDataset(enemy: EnemyEntity): void {
    if (!enemy.bossProtocolEnabled) {
      this.worldDebug?.set("bossProtocol", "disabled");
      this.worldDebug?.set("bossPhase", "");
      this.worldDebug?.set("bossHp", "");
      this.worldDebug?.set("bossControlResistance", "");
      this.worldDebug?.set("bossKnockbackResistance", "");
      return;
    }

    this.worldDebug?.set("bossProtocol", "enabled");
    this.worldDebug?.set("bossUi", enemy.isAlive && enemy.targetingState.selected ? "visible" : "hidden");
    this.worldDebug?.set("bossPhase", String(enemy.bossPhase));
    this.worldDebug?.set("bossHp", `${enemy.hp}/${enemy.maxHp}`);
    this.worldDebug?.set("bossControlResistance", String(enemy.getControlDurationMultiplier()));
    this.worldDebug?.set("bossKnockbackResistance", String(enemy.getKnockbackDistance(100)));
  }

  private hasPlayerStealth(): boolean {
    if (!this.state || !this.dataRegistry) {
      return false;
    }

    return this.state.character.statusEffects.some((effect) => {
      const definition = this.dataRegistry!.getStatusEffect(effect.id);
      return effect.id === "stealth" || definition.name.toLowerCase().includes("stealth");
    });
  }

  private syncCasterDataset(enemy: EnemyEntity): void {
    const runtime = this.getEnemyRuntime(enemy);
    const cooldownRemaining = runtime
      ? Math.max(0, Math.ceil(enemy.castCooldownMs - runtime.castTimerMs))
      : 0;
    const castProgress = runtime?.castWindupMs === null || runtime?.castWindupMs === undefined
      ? 0
      : Phaser.Math.Clamp(runtime.castWindupMs / enemyCastWindupMs, 0, 1);

    this.worldDebug?.set("enemyCastCooldownRemaining", String(cooldownRemaining));
    this.worldDebug?.set("enemyCastTelegraph", runtime?.castWindupMs === null || runtime?.castWindupMs === undefined
? "hidden"
: `visible:${castProgress.toFixed(2)}`);
    this.worldDebug?.set("enemySilenced", String(this.hasEnemyControl(enemy, "silence")));
  }

  private syncAssistDataset(): void {
    const assistedEnemies = this.enemyRuntimes.filter((runtime) => runtime.enemy.isAlive && runtime.assistedByAlly);

    this.worldDebug?.set("enemyAssistedCount", String(assistedEnemies.length));
    this.worldDebug?.set("enemyAssistedIds", assistedEnemies.map((runtime) => runtime.enemy.id).join("|"));
  }

  private toggleAssistDebugOverlay(): void {
    this.assistDebugVisible = !this.assistDebugVisible;
    this.worldDebug?.set("debugAssistRadius", this.assistDebugVisible
? `visible:${this.getDebugAssistRadiusCount()}`
: "hidden");
    this.renderAssistDebugOverlay();
  }

  private renderAssistDebugOverlay(): void {
    if (!this.assistDebugVisible) {
      this.assistDebugGraphics?.clear();
      return;
    }

    const graphics = this.assistDebugGraphics ?? this.add.graphics().setDepth(12);
    this.assistDebugGraphics = graphics;
    graphics.clear();
    graphics.lineStyle(2, 0x38bdf8, 0.85);
    graphics.fillStyle(0x38bdf8, 0.08);

    for (const runtime of this.enemyRuntimes) {
      if (!runtime.enemy.isAlive || runtime.enemy.behavior !== "assist") {
        continue;
      }

      graphics.fillCircle(runtime.enemy.sprite.x, runtime.enemy.sprite.y, runtime.enemy.assistRadius);
      graphics.strokeCircle(runtime.enemy.sprite.x, runtime.enemy.sprite.y, runtime.enemy.assistRadius);
    }

    this.worldDebug?.set("debugAssistRadius", `visible:${this.getDebugAssistRadiusCount()}`);
  }

  private getDebugAssistRadiusCount(): number {
    return this.enemyRuntimes.filter((runtime) => runtime.enemy.isAlive && runtime.enemy.behavior === "assist").length;
  }

  private getEnemyTraitDataset(enemy: EnemyEntity): string {
    return [
      enemy.elite ? "elite" : "",
      enemy.boss ? "boss" : "",
      enemy.behavior === "caster" ? "caster" : "",
    ].filter((entry) => entry.length > 0).join("|");
  }

  private getEnemyVisualMarkerDataset(enemy: EnemyEntity): string {
    return enemy.boss ? "boss-label" : enemy.elite ? "elite-label" : "none";
  }

  private playMeleeLunge(
    attackerSprite: Phaser.Physics.Arcade.Sprite,
    targetSprite: Phaser.Physics.Arcade.Sprite,
    label: string,
  ): void {
    const activeLunge = this.meleeLungeTweens.get(attackerSprite);

    if (activeLunge) {
      activeLunge.tween.stop();
      this.resetMeleeLungeSprite(attackerSprite, activeLunge.originX, activeLunge.originY);
    }

    const originX = attackerSprite.x;
    const originY = attackerSprite.y;
    const direction = new Phaser.Math.Vector2(targetSprite.x - originX, targetSprite.y - originY);

    if (direction.length() <= 1) {
      direction.set(1, 0);
    }

    direction.normalize();
    const deltaX = direction.x * meleeLungeDistance;
    const deltaY = direction.y * meleeLungeDistance;
    const targetX = originX + deltaX;
    const targetY = originY + deltaY;

    if (label.startsWith("player:")) {
      this.worldDebug?.set("lastMeleeLunge", `${label}:${deltaX.toFixed(1)},${deltaY.toFixed(1)}`);
    } else {
      this.worldDebug?.set("lastEnemyMeleeLunge", `${label}:${deltaX.toFixed(1)},${deltaY.toFixed(1)}`);
    }

    const lungeOut = this.tweens.add({
      targets: attackerSprite,
      x: targetX,
      y: targetY,
      duration: meleeLungeOutMs,
      ease: "Sine.easeOut",
      onUpdate: () => this.syncLungingSprite(attackerSprite),
      onComplete: () => {
        const lungeBack = this.tweens.add({
          targets: attackerSprite,
          x: originX,
          y: originY,
          duration: meleeLungeBackMs,
          ease: "Sine.easeIn",
          onUpdate: () => this.syncLungingSprite(attackerSprite),
          onComplete: () => {
            this.resetMeleeLungeSprite(attackerSprite, originX, originY);
            this.meleeLungeTweens.delete(attackerSprite);
          },
        });

        this.meleeLungeTweens.set(attackerSprite, { tween: lungeBack, originX, originY });
      },
    });

    this.meleeLungeTweens.set(attackerSprite, { tween: lungeOut, originX, originY });
  }

  private resetMeleeLungeSprite(sprite: Phaser.Physics.Arcade.Sprite, x: number, y: number): void {
    const body = sprite.body as Phaser.Physics.Arcade.Body | null;

    body?.reset(x, y);
    sprite.setPosition(x, y);
    this.syncLungingSprite(sprite);
  }

  private syncLungingSprite(sprite: Phaser.Physics.Arcade.Sprite): void {
    const body = sprite.body as Phaser.Physics.Arcade.Body | null;

    body?.reset(sprite.x, sprite.y);
    this.enemies.find((enemy) => enemy.sprite === sprite)?.updateVisuals();
  }

  private spawnHitVfx(enemy: EnemyEntity, damage: number, hit: boolean, critical: boolean): void {
    if (!hit) {
      this.vfxManager?.spawnCombatText("miss", 0, enemy.sprite.x, enemy.sprite.y - 38);
      return;
    }

    const hitVfxId = critical ? "critical-hit" : "weapon-hit";
    this.vfxManager?.spawn(hitVfxId, enemy.sprite.x, enemy.sprite.y);
    this.vfxManager?.spawnCombatText(critical ? "critical" : "damage", damage, enemy.sprite.x, enemy.sprite.y - 38);
    this.worldDebug?.set("lastHitVfx", hitVfxId);
    this.worldDebug?.set("lastHitReaction", `${enemy.id}:${critical ? "critical" : "hit"}:${damage}`);

    if (enemy.isAlive) {
      this.tweens.add({
        targets: enemy.sprite,
        scaleX: 1.08,
        scaleY: 0.92,
        yoyo: true,
        duration: 70,
        ease: "Sine.easeOut",
      });
    }
  }

  private spawnSkillVfx(damage: number): void {
    const target = this.attackTarget;

    if (this.player) {
      this.vfxManager?.spawn("skill-cast", this.player.sprite.x, this.player.sprite.y + 8);
      this.worldDebug?.set("lastPlayerAnimation", `cast:${this.player.direction}`);
    }

    if (target?.isAlive || target?.hp === 0) {
      this.vfxManager?.spawn("skill-impact", target.sprite.x, target.sprite.y);
      if (damage > 0) {
        this.vfxManager?.spawnCombatText("damage", damage, target.sprite.x, target.sprite.y - 38);
      }
    }
  }

  private syncCombatFormulaDataset(damage: number, hit: boolean, critical: boolean): void {
    this.worldDebug?.set("lastCombatFormula", [
"kind=physical",
`weapon=${this.weaponAttack}`,
`hit=${hit}`,
`crit=${critical}`,
`damage=${damage}`,
].join("|"));
  }

  private updateMapTransitions(): void {
    if (!this.player || !this.state || this.isTransitioning) {
      return;
    }

    const portal = this.portals.find((entry) => (
      entry.bounds.contains(this.player!.sprite.x, this.player!.sprite.y)
      || (this.pendingPortalInteraction === entry && this.isPlayerInPortalInteractionRange(entry))
    ));

    if (!portal) {
      return;
    }

    this.transitionThroughPortal(portal);
  }

  private transitionThroughPortal(portal: PortalObject): void {
    if (!this.player || !this.state || this.isTransitioning) {
      return;
    }

    this.isTransitioning = true;
    this.player.clearDestination();
    this.state.currentMapId = portal.targetMapId;
    this.state.position = { x: this.player.sprite.x, y: this.player.sprite.y };
    const removedStatusIds = removeNonPersistentConsumableStatusEffects(this.state);
    const saveData = this.state.currentSaveSlot
      ? writeSaveSlot(this.state.currentSaveSlot, this.state)
      : writeAutosave(this.state);
    const savedSlot = this.state.currentSaveSlot ?? autosaveSlot;
    this.worldDebug?.set("lastTransition", `${portal.name}:${portal.targetMapId}:${portal.targetSpawnName}`);
    this.worldDebug?.set("lastTransitionExpiredBuffs", removedStatusIds.join(","));
    this.worldDebug?.set("lastAutosaveSlot", String(savedSlot));
    this.worldDebug?.set("lastAutosaveMap", saveData.gameState.currentMapId);
    eventBus.emit("saveCompleted", { saveSlot: savedSlot });
    this.scene.restart({
      spawnName: portal.targetSpawnName,
      lastAutosaveMap: saveData.gameState.currentMapId,
      lastAutosaveSlot: String(savedSlot),
      lastTransition: `${portal.name}:${portal.targetMapId}:${portal.targetSpawnName}`,
    });
  }

  private persistTransitionSpawn(): void {
    if (!this.state || this.lastTransition.length === 0) {
      return;
    }

    const saveData = this.state.currentSaveSlot
      ? writeSaveSlot(this.state.currentSaveSlot, this.state)
      : writeAutosave(this.state);
    const savedSlot = this.state.currentSaveSlot ?? autosaveSlot;

    this.worldDebug?.set("lastAutosaveSlot", String(savedSlot));
    this.worldDebug?.set("lastAutosaveMap", saveData.currentMapId);
    eventBus.emit("saveCompleted", { saveSlot: savedSlot });
  }

  private createPlayerCombatStats(state: GameState, dataRegistry: DataRegistry): CombatStats {
    const derivedStats = calculateDerivedStats(
      state,
      dataRegistry.getClass(state.character.archetype),
      (id) => dataRegistry.getItem(id),
      (id) => dataRegistry.getStatusEffect(id),
      (id) => dataRegistry.getSupport(id),
    );

    return {
      attack: derivedStats.physicalAttack,
      defense: derivedStats.defense,
      hitChance: derivedStats.hit / 100,
      dodgeChance: derivedStats.dodge / 100,
      criticalChance: derivedStats.crit / 100,
      criticalDamage: 1.5,
    };
  }

  private createEnemyCombatStats(enemy: EnemyEntity): CombatStats {
    return {
      attack: enemy.stats.attack,
      defense: enemy.stats.defense,
      hitChance: 0.82,
      dodgeChance: 0.04,
      criticalChance: 0.05,
      criticalDamage: 1.25,
    };
  }

  private getEquippedWeaponAttack(state: GameState, dataRegistry: DataRegistry): number {
    return getEquipmentStats(state.equipment, (id) => dataRegistry.getItem(id)).attack;
  }

  private createCollisionMap(
    tilemap: Phaser.Tilemaps.Tilemap,
    collisionLayer: PrototypeTilemapLayer | null,
  ): GridCollisionMap {
    const blocked: boolean[][] = [];

    for (let y = 0; y < tilemap.height; y += 1) {
      const row: boolean[] = [];

      for (let x = 0; x < tilemap.width; x += 1) {
        const tile = collisionLayer?.getTileAt(x, y);
        row.push(Boolean(tile && tile.index > 0));
      }

      blocked.push(row);
    }

    return {
      width: tilemap.width,
      height: tilemap.height,
      tileWidth: tilemap.tileWidth,
      tileHeight: tilemap.tileHeight,
      blocked,
    };
  }

  private getSpawnPoint(tilemap: Phaser.Tilemaps.Tilemap, spawnName: string): Phaser.Math.Vector2 {
    const objectLayer = tilemap.getObjectLayer(tiledLayerNames.objects);
    const spawnObject = objectLayer?.objects.find((object) => object.name === spawnName)
      ?? objectLayer?.objects.find((object) => object.name === "PlayerSpawn");

    return new Phaser.Math.Vector2(spawnObject?.x ?? tilemap.widthInPixels / 2, spawnObject?.y ?? tilemap.heightInPixels / 2);
  }

  private createPortals(tilemap: Phaser.Tilemaps.Tilemap): PortalObject[] {
    const objectLayer = tilemap.getObjectLayer(tiledLayerNames.objects);

    return objectLayer?.objects
      .filter((object) => object.type === "portal")
      .map((object) => ({
        name: object.name,
        bounds: new Phaser.Geom.Rectangle(
          object.x ?? 0,
          object.y ?? 0,
          object.width ?? tilemap.tileWidth,
          object.height ?? tilemap.tileHeight,
        ),
        targetMapId: this.getObjectStringProperty(object, "targetMapId"),
        targetSpawnName: this.getObjectStringProperty(object, "targetSpawnName", "PlayerSpawn"),
      }))
      .filter((portal) => portal.targetMapId.length > 0) ?? [];
  }

  private createSpawnZones(tilemap: Phaser.Tilemaps.Tilemap, mapMonsterIds: string[]): SpawnZoneRuntime[] {
    const objectLayer = tilemap.getObjectLayer(tiledLayerNames.objects);

    return parseSpawnZones(objectLayer?.objects ?? [], mapMonsterIds)
      .map((zone) => ({
        ...zone,
        respawnTimerMs: 0,
      }));
  }

  private getMapSpawnMonsterIds(map: MapDefinition): string[] {
    const spawnMonsterIds = map.spawnGroups.flatMap((spawnGroup) => spawnGroup.monsterIds);
    return spawnMonsterIds.length > 0 ? spawnMonsterIds : map.monsterIds;
  }

  private handleChallengeDungeonStart(): void {
    if (!this.state || !this.dataRegistry) {
      return;
    }

    const dungeon = this.dataRegistry.getDungeonByMapId(this.state.currentMapId);
    const result = dungeon ? beginChallengeDungeon(this.state, dungeon) : null;
    this.worldDebug?.set("lastChallengeDungeonStart", result
? `${result.dungeonId}:${result.modifier.id}`
: "unavailable");

    if (result) {
      this.worldDebug?.set("challengeDungeonActive", `${result.dungeonId}:${result.modifier.id}`);
      this.worldDebug?.set("challengeDungeonModifier", result.modifierDisplay);
      this.worldDebug?.set("challengeDungeonDifficulty", result.difficultyDisplay);
      this.worldDebug?.set("challengeDungeonRewards", result.rewardDisplay);
    }
  }

  private handleClassTrialAction(): void {
    if (!this.state || !this.dataRegistry) {
      return;
    }

    if (this.state.challengeDungeons.activeClassTrialId) {
      const trial = completeClassTrial(this.state, this.dataRegistry);
      this.worldDebug?.set("lastClassTrialCompletion", trial ? `${trial.id}:${trial.rewardItemId}` : "");
      this.syncClassTrialDataset();
      return;
    }

    const result = startClassTrial(this.state);
    this.worldDebug?.set("lastClassTrialStart", result.success
? `${result.trial.id}:${result.replay ? "replay" : "first"}`
: `failed:${result.reason}`);
    this.syncClassTrialDataset();
  }

  private completeActiveChallengeForBoss(bossId: string): void {
    if (!this.state || !this.dataRegistry || !this.state.challengeDungeons.activeRun) {
      return;
    }

    const dungeon = this.dataRegistry.getDungeon(this.state.challengeDungeons.activeRun.dungeonId);

    if (dungeon.bossId !== bossId) {
      return;
    }

    const result = completeChallengeDungeon(this.state, this.dataRegistry);
    this.worldDebug?.set("lastChallengeDungeonCompletion", result
? `${result.dungeonId}:${result.modifierId}:gold:${result.gold}:rewards:${result.rewards.map((reward) => `${reward.itemId}x${reward.quantity}`).join(",")}`
: "");
    this.worldDebug?.set("challengeDungeonActive", "");
    this.worldDebug?.set("challengeDungeonModifier", "");
    this.worldDebug?.set("challengeDungeonDifficulty", "");
    this.worldDebug?.set("challengeDungeonRewards", "");
  }

  private getChallengeScaledMonster(monster: MonsterDefinition): MonsterDefinition {
    const activeRun = this.state?.challengeDungeons.activeRun;
    const difficulty = this.state ? difficultyPresets[this.state.settings.difficulty] : difficultyPresets.Normal;
    const baseMonster = {
      ...monster,
      hp: Math.ceil(monster.hp * difficulty.enemyHpMultiplier),
      attack: Math.ceil(monster.attack * difficulty.enemyDamageMultiplier),
    };

    if (!activeRun) {
      return baseMonster;
    }

    return {
      ...baseMonster,
      hp: Math.ceil(baseMonster.hp * activeRun.enemyHpMultiplier),
      attack: Math.ceil(baseMonster.attack * activeRun.enemyDamageMultiplier),
    };
  }

  private syncClassTrialDataset(): void {
    if (!this.state) {
      return;
    }

    const activeTrial = this.state.challengeDungeons.activeClassTrialId
      ? classTrials.find((trial) => trial.id === this.state!.challengeDungeons.activeClassTrialId)
      : undefined;
    const availableTrial = this.state.character.advancedClass
      ? getClassTrial(this.state.character.advancedClass.id)
      : undefined;

    this.worldDebug?.set("classTrialOptions", classTrials.map((trial) => trial.advancedClassId).join("|"));
    this.worldDebug?.set("currentClassTrial", availableTrial?.id ?? "");
    this.worldDebug?.set("currentClassTrialLesson", availableTrial?.lesson ?? "");
    this.worldDebug?.set("currentClassTrialReward", availableTrial
? `${availableTrial.rewardKind}:${availableTrial.rewardItemId}`
: "");
    this.worldDebug?.set("activeClassTrial", activeTrial?.id ?? "");
    this.worldDebug?.set("completedClassTrials", this.state.challengeDungeons.completedClassTrialIds.join("|"));
  }

  private syncMapMetadataDataset(map: MapDefinition, region: RegionDefinition): void {
    this.worldDebug?.set("currentRegion", region.id);
    this.worldDebug?.set("currentRegionName", region.name);
    this.worldDebug?.set("currentRegionLevelRange", `${region.levelRange.min}-${region.levelRange.max}`);
    this.worldDebug?.set("currentRegionDescription", region.description);
    this.worldDebug?.set("regionProgression", this.dataRegistry
? this.dataRegistry.getRegions()
.map((entry) => `${entry.id}:${entry.levelRange.min}-${entry.levelRange.max}`)
.join("|")
: "");
    this.worldDebug?.set("currentMapDescription", map.description);
    this.worldDebug?.set("currentMapLevelRange", `${map.levelRange.min}-${map.levelRange.max}`);
    this.worldDebug?.set("currentMapType", map.type);
    this.worldDebug?.set("currentMapMusicKey", map.musicKey);
    this.worldDebug?.set("currentMapRecommendedElements", map.recommendedElements.join("|"));
    this.worldDebug?.set("currentMapDropHighlights", map.dropHighlights.join("|"));
    this.worldDebug?.set("currentMapPortals", map.portals
.map((portal) => `${portal.id}:${portal.targetMapId}:${portal.targetSpawnName}`)
.join("|"));
    this.worldDebug?.set("currentMapSpawnGroups", map.spawnGroups
.map((spawnGroup) => `${spawnGroup.id}:${spawnGroup.monsterIds.join(",")}:${spawnGroup.maxCount}`)
.join("|"));
    this.worldDebug?.set("currentMapNpcs", map.npcIds.join("|"));
    this.worldDebug?.set("currentMapMonsters", map.monsterIds.join("|"));
    const dungeon = this.dataRegistry?.getDungeonByMapId(map.id);

    this.worldDebug?.set("currentDungeon", dungeon?.id ?? "");
    this.worldDebug?.set("currentDungeonBoss", dungeon?.bossId ?? "");
    this.worldDebug?.set("currentDungeonRooms", dungeon
? dungeon.roomPlan.map((room) => `${room.id}:${room.encounterRole}`).join("|")
: "");
    this.worldDebug?.set("currentDungeonHazards", dungeon
? dungeon.hazards.map((hazard) => `${hazard.id}:${hazard.effect}`).join("|")
: "");
    this.worldDebug?.set("currentDungeonRewards", dungeon?.rewardItemIds.join("|") ?? "");
    this.worldDebug?.set("currentDungeonRareMaterials", dungeon?.rareMaterialIds.join("|") ?? "");
    this.worldDebug?.set("currentDungeonReplayable", dungeon ? String(dungeon.replayable) : "false");
    this.worldDebug?.set("currentDungeonShortcut", dungeon?.shortcutUnlockId ?? "");
    this.worldDebug?.set("currentDungeonBossMechanics", dungeon?.bossMechanics.join("|") ?? "");
    this.worldDebug?.set("challengeDungeonAvailable", String(isChallengeDungeonAvailable(this.state!, dungeon)));
    this.worldDebug?.set("challengeDungeonModifiers", challengeDungeonModifiers
.map((modifier) => `${modifier.id}:${modifier.name}:${modifier.rewardMultiplier}`)
.join("|"));
    this.worldDebug?.set("challengeDungeonActive", this.state?.challengeDungeons.activeRun
? `${this.state.challengeDungeons.activeRun.dungeonId}:${this.state.challengeDungeons.activeRun.modifierId}`
: "");
    this.worldDebug?.set("challengeDungeonModifier", this.state?.challengeDungeons.activeRun
? formatChallengeModifierDisplay(getChallengeDungeonModifier(this.state.challengeDungeons.activeRun.modifierId))
: "");
    this.worldDebug?.set("challengeDungeonDifficulty", this.state?.challengeDungeons.activeRun
? formatChallengeDifficultyDisplay(getChallengeDungeonModifier(this.state.challengeDungeons.activeRun.modifierId))
: "");
    this.worldDebug?.set("challengeDungeonRewards", this.state?.challengeDungeons.activeRun
? `x${this.state.challengeDungeons.activeRun.rewardMultiplier.toFixed(2)}`
: "");
    this.syncClassTrialDataset();
  }

  private spawnInitialEnemies(collisionLayer: PrototypeTilemapLayer | null): void {
    for (const zone of this.spawnZones) {
      const monster = this.dataRegistry?.getMonster(zone.monsterId);
      if (monster?.mvp && this.state && (this.state.bossEncounters.mvpRespawnTimers[monster.id] ?? 0) > 0) {
        continue;
      }

      for (let count = 0; count < zone.maxCount; count += 1) {
        this.spawnEnemyFromZone(zone, collisionLayer);
      }
    }

    this.refreshPrimaryEnemy();
    this.beginCurrentMapBossArena();
  }

  private spawnEnemyFromZone(zone: SpawnZoneRuntime, collisionLayer: PrototypeTilemapLayer | null): void {
    if (!this.dataRegistry) {
      return;
    }

    const monster = this.getChallengeScaledMonster(this.dataRegistry.getMonster(zone.monsterId));
    const respawnMs = getEffectiveEnemyRespawnMs(zone.respawnMs, monster);
    const spawnPoint = this.getWalkableSpawnPoint(zone);
    const enemy = new EnemyEntity(this, {
      ...monster,
      respawnMs,
    }, spawnPoint);

    if (collisionLayer) {
      this.physics.add.collider(enemy.sprite, collisionLayer);
    }

    this.enemies.push(enemy);
    this.enemyRuntimes.push({
      enemy,
      zoneId: zone.id,
      home: spawnPoint.clone(),
      damagedByPlayer: false,
      assistedByAlly: false,
      elapsedInCombatMs: 0,
      attackTimerMs: enemyAttackCooldownMs,
      castTimerMs: enemy.castCooldownMs,
      castWindupMs: null,
    });
    this.refreshPrimaryEnemy();
  }

  private beginCurrentMapBossArena(): void {
    if (!this.state || !this.dataRegistry) {
      return;
    }

    const map = this.dataRegistry.getMap(this.state.currentMapId);
    const dungeonBossId = this.dataRegistry.getDungeonByMapId(map.id)?.bossId;
    const boss = dungeonBossId
      ? this.dataRegistry.getMonster(dungeonBossId)
      : this.enemies.find((enemy) => enemy.boss)?.id
        ? this.dataRegistry.getMonster(this.enemies.find((enemy) => enemy.boss)!.id)
        : null;

    if (!boss) {
      this.syncBossEncounterDataset();
      return;
    }

    const result = beginBossArenaEncounter(this.state, boss, map.id);
    this.worldDebug?.set("bossArenaFlow", result ? `${result.bossId}:${result.arenaMapId}:locked:${result.locked}` : "");
    this.syncBossEncounterDataset();
  }

  private syncBossEncounterDataset(): void {
    if (!this.state) {
      return;
    }

    const bossState = this.state.bossEncounters;
    this.worldDebug?.set("activeBossEncounter", bossState.activeBossId ?? "");
    this.worldDebug?.set("activeBossArena", bossState.activeArenaMapId ?? "");
    this.worldDebug?.set("defeatedBosses", bossState.defeatedBossIds.join("|"));
    this.worldDebug?.set("bossArenaExitUnlocked", bossState.victoryExitUnlockedBossIds.join("|"));
    this.worldDebug?.set("mvpRespawnTimers", Object.entries(bossState.mvpRespawnTimers)
.map(([bossId, remaining]) => `${bossId}:${Math.ceil(remaining)}`)
.join("|"));
  }

  private getWalkableSpawnPoint(zone: SpawnZoneRuntime): Phaser.Math.Vector2 {
    const occupiedPoints = this.enemies
      .filter((enemy) => enemy.isAlive)
      .map((enemy) => enemy.position);
    const spawnPoint = pickSpawnPoint(zone, {
      occupiedPoints,
      minimumDistance: monsterSpawnMinimumDistance,
      maxAttempts: monsterSpawnPlacementAttempts,
      isAllowed: (point: SpawnPointLike) => this.isWalkable(point.x, point.y),
    });

    return new Phaser.Math.Vector2(spawnPoint.x, spawnPoint.y);
  }

  private refreshPrimaryEnemy(): void {
    this.enemy = this.enemies.find((enemy) => enemy.isAlive) ?? this.enemies[0];
  }

  private createObjectMarkers(tilemap: Phaser.Tilemaps.Tilemap): void {
    const objectLayer = tilemap.getObjectLayer(tiledLayerNames.objects);

    for (const object of objectLayer?.objects ?? []) {
      if (object.type === "npc") {
        this.createNpcEntity(object);
      } else if (object.type === "portal") {
        this.createPortalMarker(object);
      } else if (object.type === "gathering" || object.type === "treasure") {
        this.createSpotMarker(object);
      }
    }
  }

  private createNpcEntity(object: Phaser.Types.Tilemaps.TiledObject): void {
    const x = object.x ?? 0;
    const y = object.y ?? 0;
    const npcId = this.getObjectStringProperty(object, "npcId");

    if (!npcId || !this.dataRegistry) {
      return;
    }

    this.npcs.push(new NpcEntity(this, this.dataRegistry.getNpc(npcId), { x, y }));
  }

  private createAdvancedClassNpcIfAvailable(): void {
    if (!this.state || !this.dataRegistry || this.state.currentMapId !== "crownfield-town") {
      return;
    }

    if (!isAdvancedClassServiceAvailable(this.state)) {
      return;
    }

    this.npcs.push(new NpcEntity(
      this,
      this.dataRegistry.getNpc("advanced-class-mentor"),
      { x: 304, y: 336 },
    ));
  }

  private createPortalMarker(object: Phaser.Types.Tilemaps.TiledObject): void {
    const x = (object.x ?? 0) + (object.width ?? 32) / 2;
    const y = (object.y ?? 0) + (object.height ?? 32) / 2;

    this.add.rectangle(x, y, object.width ?? 32, object.height ?? 32, 0x38bdf8, 0.28)
      .setStrokeStyle(2, 0xbae6fd, 0.8)
      .setDepth(12);
  }

  private createSpotMarker(object: Phaser.Types.Tilemaps.TiledObject): void {
    const x = object.x ?? 0;
    const y = object.y ?? 0;
    const color = object.type === "treasure" ? 0xfacc15 : 0x22c55e;

    this.add.rectangle(x, y, 24, 20, color, 0.85)
      .setStrokeStyle(2, 0xf8fafc, 0.75)
      .setDepth(14);
  }

  private countObjectsByType(tilemap: Phaser.Tilemaps.Tilemap, type: string): number {
    return tilemap.getObjectLayer(tiledLayerNames.objects)?.objects
      .filter((object) => object.type === type).length ?? 0;
  }

  private getObjectStringProperty(
    object: Phaser.Types.Tilemaps.TiledObject,
    propertyName: string,
    fallback = "",
  ): string {
    const property = object.properties?.find((entry: { name?: string }) => entry.name === propertyName);
    return typeof property?.value === "string" ? property.value : fallback;
  }

  private getEnemySpawnPoint(spawnPoint: Phaser.Math.Vector2, tilemap: Phaser.Tilemaps.Tilemap): Phaser.Math.Vector2 {
    const objectLayer = tilemap.getObjectLayer(tiledLayerNames.objects);
    const spawnObject = objectLayer?.objects.find((object) => object.type === "monsterSpawn");

    if (spawnObject) {
      return new Phaser.Math.Vector2(spawnObject.x ?? spawnPoint.x, spawnObject.y ?? spawnPoint.y);
    }

    const candidates = [
      new Phaser.Math.Vector2(spawnPoint.x + 128, spawnPoint.y),
      new Phaser.Math.Vector2(spawnPoint.x + 96, spawnPoint.y + 64),
      new Phaser.Math.Vector2(spawnPoint.x - 128, spawnPoint.y),
    ];

    return candidates.find((candidate) => (
      candidate.x > 0
      && candidate.y > 0
      && candidate.x < tilemap.widthInPixels
      && candidate.y < tilemap.heightInPixels
      && this.isWalkable(candidate.x, candidate.y)
    )) ?? new Phaser.Math.Vector2(tilemap.widthInPixels / 2, tilemap.heightInPixels / 2);
  }
}
