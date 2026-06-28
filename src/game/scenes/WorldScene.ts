import Phaser from "phaser";
import { RegistryKeys } from "../constants/registryKeys";
import { SceneKeys } from "../constants/sceneKeys";
import { EnemyEntity } from "../entities/EnemyEntity";
import { NpcEntity } from "../entities/NpcEntity";
import { PlayerEntity } from "../entities/PlayerEntity";
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
import { autosaveSlot, writeAutosave, writeSaveSlot } from "../systems/autosave";
import { recordMonsterKill } from "../systems/bestiary";
import { getAdvancedClassOptionsForBase, isAdvancedClassServiceAvailable } from "../systems/advancedClasses";
import {
  getAutoPotionSettingsSummary,
  getConsumableCooldownSummary,
  removeNonPersistentConsumableStatusEffects,
  updateAutoPotion,
} from "../systems/consumables";
import { getEquipmentStats } from "../systems/equipment";
import {
  decideEnemyAiIntent,
  getEffectiveEnemyRespawnMs,
  parseSpawnZones,
  pickSpawnPoint,
  type SpawnZoneDefinition,
} from "../systems/enemySpawning";
import { applyPassiveSkills, expireSkillBuffs, useHotbarSlot as useHotbarSlotAction, type SkillExecutionTarget } from "../systems/skills";
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
import type { DataRegistry } from "../data/dataRegistry";
import type { DialogueSceneData } from "./DialogueScene";
import type { MapDefinition, RegionDefinition } from "../types/dataDefinitions";
import type { GameState } from "../types/gameState";

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
const enemyAttackCooldownMs = 1250;
const enemyCastWindupMs = 700;
const playerAttackKnockbackDistance = 18;
const bossRewardGold = 25;

type PrototypeTilemapLayer = Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer;
type WorldSceneData = {
  spawnName?: string;
  lastAutosaveMap?: string;
  lastAutosaveSlot?: string;
  lastTransition?: string;
  useSavedPosition?: boolean;
};
type PortalObject = {
  name: string;
  bounds: Phaser.Geom.Rectangle;
  targetMapId: string;
  targetSpawnName: string;
};
type DroppedLootObject = {
  id: string;
  drop: LootDrop;
  marker: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
};
type SpawnZoneRuntime = SpawnZoneDefinition & {
  respawnTimerMs: number;
};
type EnemyRuntime = {
  enemy: EnemyEntity;
  zoneId: string;
  home: Phaser.Math.Vector2;
  damagedByPlayer: boolean;
  assistedByAlly: boolean;
  elapsedInCombatMs: number;
  attackTimerMs: number;
  castTimerMs: number;
  castWindupMs: number | null;
};

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
  private playerCombatStats?: CombatStats;
  private weaponAttack = 0;
  private attackTarget?: EnemyEntity;
  private droppedLoot: DroppedLootObject[] = [];
  private portals: PortalObject[] = [];
  private npcs: NpcEntity[] = [];
  private pendingNpcInteraction?: NpcEntity;
  private unsubscribeDialogueClosed?: () => void;
  private unsubscribeEquipmentChanged?: () => void;
  private unsubscribeStatsChanged?: () => void;
  private unsubscribeStatResetRequested?: () => void;
  private unsubscribeHotbarActionRequested?: () => void;
  private playerAttackTimerMs = playerAttackCooldownMs;
  private isCameraFollowingPlayer = false;
  private isTransitioning = false;
  private isDialogueOpen = false;
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
    this.droppedLoot = [];
    this.portals = [];
    this.npcs = [];
    this.enemies = [];
    this.enemyRuntimes = [];
    this.spawnZones = [];
    this.enemy = undefined;
    this.attackTarget = undefined;
    this.assistDebugGraphics = undefined;
    this.assistDebugVisible = false;
    this.pendingNpcInteraction = undefined;
    this.isDialogueOpen = false;
    const map = dataRegistry.getMap(state.currentMapId);
    const region = dataRegistry.getRegion(map.regionId);
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
      this.game.canvas.dataset.dialogueBlockingMovement = "false";
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
    this.input.keyboard?.on("keydown-F9", this.toggleAssistDebugOverlay, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeDialogueClosed?.();
      this.unsubscribeEquipmentChanged?.();
      this.unsubscribeStatsChanged?.();
      this.unsubscribeStatResetRequested?.();
      this.unsubscribeHotbarActionRequested?.();
      this.input.keyboard?.off("keydown-F9", this.toggleAssistDebugOverlay, this);
      this.input.off("pointerdown", this.handlePointerDown, this);
    });

    const primaryEnemy = this.enemies.find((enemy) => enemy.isAlive) ?? this.enemies[0];
    this.game.canvas.dataset.scene = "world";
    this.game.canvas.dataset.currentMap = state.currentMapId;
    this.game.canvas.dataset.currentMapName = map.name;
    this.syncMapMetadataDataset(map, region);
    this.game.canvas.dataset.characterArchetype = state.character.archetype;
    this.game.canvas.dataset.spawnedMonster = primaryEnemy?.id ?? "";
    this.game.canvas.dataset.spawnedMonsterName = primaryEnemy?.name ?? "";
    this.game.canvas.dataset.enemySelected = "false";
    this.game.canvas.dataset.enemyCombatState = primaryEnemy?.behaviorMode ?? "";
    this.game.canvas.dataset.enemyHp = primaryEnemy ? `${primaryEnemy.hp}/${primaryEnemy.maxHp}` : "";
    this.game.canvas.dataset.enemyPosition = primaryEnemy
      ? `${primaryEnemy.sprite.x},${primaryEnemy.sprite.y}`
      : "";
    this.game.canvas.dataset.enemyTextureKey = primaryEnemy?.textureKey ?? "";
    this.game.canvas.dataset.targetFrame = "hidden";
    this.game.canvas.dataset.autoAttack = "idle";
    this.game.canvas.dataset.playerCombatState = "alive";
    this.game.canvas.dataset.lastCombatFormula = "";
    this.game.canvas.dataset.lastSkillUse = "";
    this.game.canvas.dataset.skillCooldowns = "";
    this.game.canvas.dataset.consumableCooldowns = getConsumableCooldownSummary(state);
    this.game.canvas.dataset.autoPotionSettings = getAutoPotionSettingsSummary(state);
    this.game.canvas.dataset.lastAutoPotionUse = "";
    this.game.canvas.dataset.lastSupportAction = "";
    this.game.canvas.dataset.supportSummary = getSupportSummary(state);
    this.game.canvas.dataset.lastXpGain = "";
    this.game.canvas.dataset.lastLevelUp = "";
    this.game.canvas.dataset.lastLootDrop = "";
    this.game.canvas.dataset.lastLootPickup = "";
    this.game.canvas.dataset.pendingLootCount = "0";
    this.game.canvas.dataset.inventoryGold = String(state.inventory.gold);
    this.game.canvas.dataset.inventoryStackCount = String(state.inventory.items.length);
    this.game.canvas.dataset.equipmentInstanceCount = String(state.inventory.equipmentInstances.length);
    this.game.canvas.dataset.playerXpNext = String(getLevelXpThreshold(dataRegistry.getXpTable("standard"), state.playerProfile.level + 1) ?? "");
    this.game.canvas.dataset.tilemapKey = tilemapKey;
    this.game.canvas.dataset.tilemapLayers = [
      tiledLayerNames.ground,
      tiledLayerNames.decoration,
      tiledLayerNames.collision,
      tiledLayerNames.objects,
    ].join("|");
    this.game.canvas.dataset.tilemapSize = `${tilemap.width}x${tilemap.height}`;
    this.game.canvas.dataset.spawnPoint = `${spawnPoint.x},${spawnPoint.y}`;
    this.game.canvas.dataset.spawnName = this.spawnName;
    this.game.canvas.dataset.currentSaveSlot = String(state.currentSaveSlot ?? "");
    this.game.canvas.dataset.npcCount = String(this.npcs.length);
    this.game.canvas.dataset.npcEntityCount = String(this.npcs.length);
    this.game.canvas.dataset.npcNames = this.npcs.map((npc) => npc.name).join("|");
    this.game.canvas.dataset.npcServiceTypes = this.npcs.map((npc) => npc.serviceType).join("|");
    this.game.canvas.dataset.dialogueState = "closed";
    this.game.canvas.dataset.dialogueBlockingMovement = "false";
    this.game.canvas.dataset.pendingNpcInteraction = "";
    this.game.canvas.dataset.portalCount = String(this.portals.length);
    this.game.canvas.dataset.safeZone = primaryEnemy ? "field-entrance" : "town";
    this.game.canvas.dataset.gatheringSpotCount = String(this.countObjectsByType(tilemap, "gathering"));
    this.game.canvas.dataset.monsterSpawnZoneCount = String(this.spawnZones.length);
    this.game.canvas.dataset.monsterSpawnZones = this.spawnZones.map((zone) => `${zone.name}:${zone.monsterId}:${zone.maxCount}`).join("|");
    this.game.canvas.dataset.enemyEntityCount = String(this.enemies.length);
    this.game.canvas.dataset.enemyAliveCount = String(this.enemies.filter((enemy) => enemy.isAlive).length);
    this.game.canvas.dataset.enemyBehavior = primaryEnemy?.behavior ?? "";
    this.game.canvas.dataset.enemyTraits = primaryEnemy ? this.getEnemyTraitDataset(primaryEnemy) : "";
    this.game.canvas.dataset.enemyVisualMarker = primaryEnemy ? this.getEnemyVisualMarkerDataset(primaryEnemy) : "none";
    this.game.canvas.dataset.enemyRespawnMs = primaryEnemy ? String(primaryEnemy.respawnMs) : "";
    this.game.canvas.dataset.enemyDamage = primaryEnemy ? String(primaryEnemy.stats.attack) : "";
    this.game.canvas.dataset.enemyAggroRange = primaryEnemy ? String(primaryEnemy.aggroRange) : "";
    this.game.canvas.dataset.enemyLeashDistance = primaryEnemy ? String(primaryEnemy.leashDistance) : "";
    this.game.canvas.dataset.enemyAssistRadius = primaryEnemy ? String(primaryEnemy.assistRadius) : "";
    this.game.canvas.dataset.enemyCastRange = primaryEnemy ? String(primaryEnemy.castRange) : "";
    this.game.canvas.dataset.enemyCastCooldown = primaryEnemy ? String(primaryEnemy.castCooldownMs) : "";
    this.game.canvas.dataset.enemyCastCooldownRemaining = "0";
    this.game.canvas.dataset.enemyCastTelegraph = "hidden";
    this.game.canvas.dataset.enemySilenced = "false";
    this.game.canvas.dataset.enemyAssistedCount = "0";
    this.game.canvas.dataset.debugAssistRadius = "hidden";
    this.game.canvas.dataset.bossUi = "hidden";
    this.game.canvas.dataset.bossProtocol = primaryEnemy?.bossProtocolEnabled ? "enabled" : "disabled";
    this.game.canvas.dataset.bossPhase = primaryEnemy?.bossProtocolEnabled ? String(primaryEnemy.bossPhase) : "";
    this.game.canvas.dataset.bossHp = primaryEnemy?.bossProtocolEnabled ? `${primaryEnemy.hp}/${primaryEnemy.maxHp}` : "";
    this.game.canvas.dataset.bossControlResistance = primaryEnemy?.bossProtocolEnabled ? String(primaryEnemy.getControlDurationMultiplier()) : "";
    this.game.canvas.dataset.bossKnockbackResistance = primaryEnemy?.bossProtocolEnabled ? String(primaryEnemy.getKnockbackDistance(100)) : "";
    this.game.canvas.dataset.lastBossControlResist = "";
    this.game.canvas.dataset.lastBossKnockbackResist = "";
    this.game.canvas.dataset.lastBossStealthDetection = "";
    this.game.canvas.dataset.lastBossPhase = "";
    this.game.canvas.dataset.lastBossReward = "";
    this.game.canvas.dataset.bestiaryKills = this.getBestiaryKillDataset();
    this.game.canvas.dataset.lastBestiaryUpdate = "";
    this.game.canvas.dataset.lastBestiaryMilestone = "";
    this.game.canvas.dataset.treasureSpotCount = String(this.countObjectsByType(tilemap, "treasure"));
    this.game.canvas.dataset.lastAutosaveSlot = this.lastAutosaveSlot;
    this.game.canvas.dataset.lastAutosaveMap = this.lastAutosaveMap;
    this.game.canvas.dataset.lastTransition = this.lastTransition;
    this.game.canvas.dataset.collisionLayerEnabled = String(Boolean(collisionLayer));
    this.game.canvas.dataset.playerCharacterId = this.player.character.id;
    this.game.canvas.dataset.playerHasCollisionBody = String(Boolean(this.player.sprite.body));
    this.game.canvas.dataset.wasdMovement = "disabled";
    this.game.canvas.dataset.movementMarker = "hidden";
    this.syncPlayerDataset();
    this.syncSupportDataset();
    this.persistTransitionSpawn();
    this.syncEnemyDataset();

    this.scene.launch(SceneKeys.UI);
    eventBus.emit("mapChanged", { mapId: state.currentMapId, musicKey: map.musicKey });
  }

  update(_time: number, delta: number): void {
    if (this.state) {
      expireSkillBuffs(this.state);
      this.updateAutoPotion();
      this.updateSupportCompanion();
      this.updatePlayerStatusEffects();
    }
    this.player?.update(delta);
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
      this.interactWithNpc(clickedNpc);
      return;
    }

    const clickedEnemy = this.enemies.find((enemy) => (
      enemy.isAlive && enemy.sprite.getBounds().contains(pointer.worldX, pointer.worldY)
    ));

    if (clickedEnemy) {
      this.pendingNpcInteraction = undefined;
      this.selectEnemy(clickedEnemy);
      this.moveIntoAttackRange(clickedEnemy);
      return;
    }

    const destination = {
      x: pointer.worldX,
      y: pointer.worldY,
    };

    if (!this.isWalkable(destination.x, destination.y)) {
      this.game.canvas.dataset.lastMovementClickValid = "false";
      return;
    }

    if (!this.collisionMap) {
      this.game.canvas.dataset.lastMovementClickValid = "false";
      return;
    }

    const path = findPath(this.collisionMap, this.player.position, destination);

    if (path.length === 0) {
      this.game.canvas.dataset.lastMovementClickValid = "false";
      return;
    }

    this.player.setPath(path);
    this.pendingNpcInteraction = undefined;
    this.game.canvas.dataset.pendingNpcInteraction = "";
    this.clearTarget();
    this.showClickMarker(destination.x, destination.y);
    this.game.canvas.dataset.lastMovementClickValid = "true";
    this.game.canvas.dataset.lastPathLength = String(path.length);
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
    this.game.canvas.dataset.movementMarker = "visible";

    this.tweens.add({
      targets: this.clickMarker,
      alpha: 0,
      scale: 1.7,
      duration: 450,
      ease: "Sine.easeOut",
      onComplete: () => {
        this.clickMarker?.destroy();
        this.clickMarker = undefined;
        this.game.canvas.dataset.movementMarker = "hidden";
      },
    });
  }

  private selectEnemy(enemy: EnemyEntity): void {
    this.attackTarget = enemy;
    enemy.setSelected(true, this.player?.character.id ?? null);
    enemy.behaviorMode = "chasing";
    this.playerAttackTimerMs = playerAttackCooldownMs;
    this.game.canvas.dataset.enemySelected = "true";
    this.game.canvas.dataset.autoAttack = "moving-to-range";
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
    this.playerAttackTimerMs = playerAttackCooldownMs;
    this.game.canvas.dataset.enemySelected = "false";
    this.game.canvas.dataset.autoAttack = "idle";
    eventBus.emit("enemyTargetChanged", {
      enemyId: null,
      name: "",
      hp: 0,
      maxHp: 0,
    });
    this.game.canvas.dataset.bossUi = "hidden";
  }

  private interactWithNpc(npc: NpcEntity): void {
    this.clearTarget();
    this.pendingNpcInteraction = npc;
    this.game.canvas.dataset.pendingNpcInteraction = npc.id;
    this.game.canvas.dataset.lastClickedNpc = npc.id;
    this.game.canvas.dataset.lastClickedNpcName = npc.name;
    this.game.canvas.dataset.lastClickedNpcServiceType = npc.serviceType;

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
      this.game.canvas.dataset.lastMovementClickValid = "false";
      return;
    }

    this.player.setPath(path);
    this.showClickMarker(npc.position.x, npc.position.y);
    this.game.canvas.dataset.lastMovementClickValid = "true";
    this.game.canvas.dataset.lastPathLength = String(path.length);
  }

  private openNpcDialogue(npc: NpcEntity): void {
    const dataRegistry = this.dataRegistry;

    if (!dataRegistry || !npc.dialogueId) {
      return;
    }

    const shop = dataRegistry.getShopByNpcId(npc.id);
    if (shop && (npc.serviceType === "merchant" || npc.serviceType === "appraiser")) {
      this.pendingNpcInteraction = undefined;
      this.player?.clearDestination();
      this.game.canvas.dataset.pendingNpcInteraction = "";
      this.game.canvas.dataset.lastOpenedShop = shop.id;
      this.game.canvas.dataset.lastOpenedShopNpc = npc.id;
      eventBus.emit("shopOpened", { shopId: shop.id, npcId: npc.id });
      return;
    }

    if (npc.serviceType === "storage") {
      this.pendingNpcInteraction = undefined;
      this.player?.clearDestination();
      this.game.canvas.dataset.pendingNpcInteraction = "";
      this.game.canvas.dataset.lastOpenedStorageNpc = npc.id;
      eventBus.emit("storageOpened", { npcId: npc.id });
      return;
    }

    if (npc.serviceType === "crafter") {
      this.pendingNpcInteraction = undefined;
      this.player?.clearDestination();
      this.game.canvas.dataset.pendingNpcInteraction = "";
      this.game.canvas.dataset.lastOpenedCraftingNpc = npc.id;
      eventBus.emit("craftingOpened", { npcId: npc.id });
      return;
    }

    if (npc.serviceType === "refiner") {
      this.pendingNpcInteraction = undefined;
      this.player?.clearDestination();
      this.game.canvas.dataset.pendingNpcInteraction = "";
      this.game.canvas.dataset.lastOpenedRefinementNpc = npc.id;
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
    this.game.canvas.dataset.pendingNpcInteraction = "";
    this.game.canvas.dataset.dialogueBlockingMovement = "true";
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
      this.game.canvas.dataset.autoAttack = "moving-to-range";

      if (!player.destination && player.path.length === 0) {
        this.moveIntoAttackRange(enemy);
      }

      return;
    }

    player.clearDestination();
    if (enemy.behavior !== "caster") {
      enemy.behaviorMode = enemyCanAttack ? "attacking" : "idle";
    }
    this.game.canvas.dataset.autoAttack = "attacking";
    this.playerAttackTimerMs += deltaMs;

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

    const result = resolveAttack({
      attacker: this.playerCombatStats,
      defender: this.createEnemyCombatStats(enemy),
      attackKind: "physical",
      weaponAttack: this.weaponAttack,
      debug: import.meta.env.DEV,
    });

    this.damageEnemy(enemy, result.finalDamage);
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
      this.game.canvas.dataset.autoAttack = "stopped";
      this.game.canvas.dataset.enemySelected = "false";
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
      this.game.canvas.dataset.lastSkillUse = `${slot}:item`;
      this.game.canvas.dataset.consumableCooldowns = getConsumableCooldownSummary(this.state);
      this.game.canvas.dataset.playerHp = `${this.state.character.stats.hp}/${this.state.character.stats.maxHp}`;
      this.game.canvas.dataset.playerSp = `${this.state.character.stats.sp}/${this.state.character.stats.maxSp}`;
      this.syncPlayerDataset();
      return;
    }

    this.game.canvas.dataset.lastSkillUse = result.success
      ? `${slot}:${result.skillId}:success:${result.damage}:${result.affectedTargetIds.join(",")}`
      : `${slot}:${result.skillId}:failed:${result.reason}`;
    this.game.canvas.dataset.skillCooldowns = Object.entries(this.state.character.skills.cooldowns)
      .map(([skillId, readyAt]) => `${skillId}:${readyAt}`)
      .join("|");
    this.game.canvas.dataset.playerSp = `${this.state.character.stats.sp}/${this.state.character.stats.maxSp}`;

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
        this.game.canvas.dataset.autoAttack = "stopped";
        this.game.canvas.dataset.enemySelected = "false";
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
        this.game.canvas.dataset.lastSkillStatusEffect = `${enemy.id}:${effectId}:${applied ? "applied" : "resisted"}`;
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

    this.game.canvas.dataset.lastAutoPotionUse = result.success
      ? `${result.itemId}:success:hp:${result.restoredHp}:sp:${result.restoredSp}`
      : `${result.itemId}:failed:${result.reason}`;
    this.game.canvas.dataset.consumableCooldowns = getConsumableCooldownSummary(this.state);
    this.game.canvas.dataset.playerHp = `${this.state.character.stats.hp}/${this.state.character.stats.maxHp}`;
    this.game.canvas.dataset.playerSp = `${this.state.character.stats.sp}/${this.state.character.stats.maxSp}`;
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

    this.game.canvas.dataset.lastSupportAction = result.success
      ? `${result.supportId}:${result.actionId}:success:hp:${result.restoredHp}:cleanse:${result.cleansedStatusIds.join(",")}:status:${result.appliedStatusEffectIds.join(",")}`
      : `${result.supportId}:${result.actionId}:failed`;
    this.game.canvas.dataset.playerHp = `${this.state.character.stats.hp}/${this.state.character.stats.maxHp}`;
    this.game.canvas.dataset.playerStatusEffects = getStatusSummary(
      this.state.character.statusEffects,
      (id) => this.dataRegistry!.getStatusEffect(id),
    );
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
      eventBus.emit("playerHealthChanged", {
        hp: this.state.character.stats.hp,
        maxHp: this.state.character.stats.maxHp,
      });
    }

    if (result.damage > 0 || result.expiredIds.length > 0 || result.tickedIds.length > 0) {
      emitStatusEffectsChanged("player", this.state.character.id, this.state.character.statusEffects);
      this.game.canvas.dataset.playerStatusEffects = getStatusSummary(
        this.state.character.statusEffects,
        (id) => this.dataRegistry!.getStatusEffect(id),
      );
      this.game.canvas.dataset.lastStatusTick = `player:${result.damage}:${result.tickedIds.join(",")}:${result.expiredIds.join(",")}`;
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
        this.game.canvas.dataset.lastStatusTick = `enemy:${result.damage}:${result.tickedIds.join(",")}:${result.expiredIds.join(",")}`;
      }

      if (!enemy.isAlive && this.attackTarget === enemy) {
        this.game.canvas.dataset.autoAttack = "stopped";
        this.game.canvas.dataset.enemySelected = "false";
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
      this.game.canvas.dataset.lastBossControlResist = `${enemy.id}:${controlEffect}`;
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
      this.game.canvas.dataset.lastBossControlResist = `${enemy.id}:${definition.controlEffect ?? effectId}`;
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
    this.game.canvas.dataset.lastBossKnockbackResist = `${enemy.id}:${distance}->${resistedDistance.toFixed(1)}`;

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
    if (!enemy.bossProtocolEnabled) {
      return;
    }

    this.syncBossProtocolDataset(enemy);

    if (enemy.bossPhase !== previousPhase) {
      this.game.canvas.dataset.lastBossPhase = `${enemy.id}:${previousPhase}->${enemy.bossPhase}`;
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
      this.game.canvas.dataset.bossUi = "hidden";
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
        this.game.canvas.dataset.lastAssistCall = `${source.id}:${runtime.enemy.id}`;
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
    this.game.canvas.dataset.bestiaryKills = this.getBestiaryKillDataset();
    this.game.canvas.dataset.lastBestiaryUpdate = `${monster.id}:${bestiaryEntry.kills}`;
    const xpResult = awardXp(state, dataRegistry.getXpTable("standard"), monster.xpReward);
    this.game.canvas.dataset.lastXpGain = String(xpResult.amount);
    this.game.canvas.dataset.playerXp = String(xpResult.totalXp);
    this.game.canvas.dataset.playerXpNext = String(xpResult.nextLevelXp ?? "");
    this.game.canvas.dataset.playerLevel = String(state.playerProfile.level);
    this.game.canvas.dataset.playerStatPoints = String(state.playerProfile.statPoints);
    this.game.canvas.dataset.playerSkillPoints = String(state.playerProfile.skillPoints);
    this.game.canvas.dataset.playerHp = `${state.character.stats.hp}/${state.character.stats.maxHp}`;
    this.game.canvas.dataset.playerSp = `${state.character.stats.sp}/${state.character.stats.maxSp}`;

    if (xpResult.levelsGained.length > 0) {
      this.game.canvas.dataset.lastLevelUp = String(xpResult.levelsGained.at(-1));
    }

    eventBus.emit("enemyKilled", { enemyId: enemy.id });

    const drops = generateLootDrops(dropTable, dataRegistry, Math.random, {
      quality: enemy.boss ? "boss" : enemy.elite ? "elite" : "normal",
    });
    this.applySupportMaterialFinder(drops, dropTable.entries);
    if (enemy.bossProtocolEnabled) {
      drops.push({ kind: "gold", quantity: bossRewardGold });
      this.game.canvas.dataset.lastBossReward = `${enemy.id}:gold:${bossRewardGold}`;
    }
    const support = state.support.equippedSupportId ? dataRegistry.getSupport(state.support.equippedSupportId) : null;
    grantSupportAffinity(state, support, Math.max(1, Math.ceil(monster.xpReward / 2)));
    this.syncSupportDataset();
    drops.forEach((drop, index) => this.spawnLootDrop(drop, enemy.sprite.x + index * 28, enemy.sprite.y + 18));
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
    this.game.canvas.dataset.lastSupportAction = `${support.id}:material-ping:success:${materialEntry.itemId}`;
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

    this.droppedLoot.push({ id, drop, marker, label });
    this.game.canvas.dataset.lastLootDrop = this.getLootDatasetValue(drop);
    this.game.canvas.dataset.pendingLootCount = String(this.droppedLoot.length);
    this.game.canvas.dataset.lootPosition = `${Math.round(x)},${Math.round(y)}`;
    eventBus.emit("lootDropped", this.getLootEventPayload(drop));

    if (this.trySupportAutoPickup(this.droppedLoot[this.droppedLoot.length - 1])) {
      this.game.canvas.dataset.lastSupportAction = `auto-pickup:${this.getLootDatasetValue(drop)}`;
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
    }

    loot.marker.destroy();
    loot.label.destroy();
    this.droppedLoot = this.droppedLoot.filter((entry) => entry !== loot);
    this.game.canvas.dataset.lastLootPickup = this.getLootDatasetValue(loot.drop);
    this.game.canvas.dataset.pendingLootCount = String(this.droppedLoot.length);
    this.game.canvas.dataset.inventoryGold = String(this.state.inventory.gold);
    this.game.canvas.dataset.playerGold = String(this.state.playerProfile.gold);
    this.game.canvas.dataset.inventoryStackCount = String(this.state.inventory.items.length);
    this.game.canvas.dataset.equipmentInstanceCount = String(this.state.inventory.equipmentInstances.length);
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
    }

    loot.marker.destroy();
    loot.label.destroy();
    this.droppedLoot = this.droppedLoot.filter((entry) => entry !== loot);
    this.game.canvas.dataset.lastLootPickup = this.getLootDatasetValue(loot.drop);
    this.game.canvas.dataset.pendingLootCount = String(this.droppedLoot.length);
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

    state.character.stats.hp = Math.max(0, state.character.stats.hp - result.finalDamage);
    eventBus.emit("playerHealthChanged", {
      hp: state.character.stats.hp,
      maxHp: state.character.stats.maxHp,
    });

    if (state.character.stats.hp === 0) {
      this.game.canvas.dataset.playerCombatState = "dead";
      this.game.canvas.dataset.autoAttack = "stopped";
      this.player?.clearDestination();
      this.attackTarget = undefined;
    }
  }

  private moveIntoAttackRange(enemy: EnemyEntity): void {
    if (!this.player || !this.collisionMap) {
      return;
    }

    const path = findPath(this.collisionMap, this.player.position, enemy.position);

    if (path.length > 0) {
      this.player.setPath(path);
      this.game.canvas.dataset.lastMovementClickValid = "true";
      this.game.canvas.dataset.lastPathLength = String(path.length);
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
        this.game.canvas.dataset.lastBossStealthDetection = `${enemy.id}:${Math.round(distanceToPlayer)}`;
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
      this.game.canvas.dataset.lastEnemyLeash = enemy.id;
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
        this.game.canvas.dataset.lastEnemyKeepDistance = `${enemy.id}:${Math.round(distanceToPlayer)}<${Math.round(retreatDistance)}`;
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
      this.game.canvas.dataset.lastEnemyCastStart = enemy.id;

      if (runtime.castWindupMs >= enemyCastWindupMs) {
        runtime.castTimerMs = 0;
        runtime.castWindupMs = null;
        enemy.setCastProgress(null);
        this.enemyAttack(enemy);
        this.game.canvas.dataset.lastEnemyCast = enemy.id;
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
    if (!this.dataRegistry) {
      return;
    }

    for (const zone of this.spawnZones) {
      const aliveCount = this.enemyRuntimes.filter((runtime) => runtime.zoneId === zone.id && runtime.enemy.isAlive).length;

      if (aliveCount >= zone.maxCount) {
        zone.respawnTimerMs = 0;
        continue;
      }

      zone.respawnTimerMs += deltaMs;
      const monster = this.dataRegistry.getMonster(zone.monsterId);
      const respawnMs = getEffectiveEnemyRespawnMs(zone.respawnMs, monster);

      if (zone.respawnTimerMs >= respawnMs) {
        zone.respawnTimerMs = 0;
        this.spawnEnemyFromZone(zone, null);
        this.game.canvas.dataset.lastEnemyRespawn = zone.id;
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
    this.game.canvas.dataset.playerX = x.toFixed(1);
    this.game.canvas.dataset.playerY = y.toFixed(1);
    this.game.canvas.dataset.playerDirection = this.player.direction;
    this.game.canvas.dataset.playerMotionState = this.player.motionState;
    this.game.canvas.dataset.playerAnimationState = this.player.animationState;
    this.game.canvas.dataset.playerDestination = this.player.destination
      ? `${this.player.destination.x.toFixed(1)},${this.player.destination.y.toFixed(1)}`
      : "";
    this.game.canvas.dataset.playerPathRemaining = String(this.player.path.length);
    this.game.canvas.dataset.cameraFollowingPlayer = String(this.isCameraFollowingPlayer);
    this.game.canvas.dataset.playerStatusEffects = this.dataRegistry && this.state
      ? getStatusSummary(this.state.character.statusEffects, (id) => this.dataRegistry!.getStatusEffect(id))
      : "";
    if (this.state) {
      this.game.canvas.dataset.consumableCooldowns = getConsumableCooldownSummary(this.state);
      this.game.canvas.dataset.autoPotionSettings = getAutoPotionSettingsSummary(this.state);
      this.game.canvas.dataset.supportSummary = getSupportSummary(this.state);
    }
  }

  private syncSupportDataset(): void {
    if (!this.state || !this.dataRegistry) {
      return;
    }

    const support = this.state.support.equippedSupportId
      ? this.dataRegistry.getSupport(this.state.support.equippedSupportId)
      : null;

    this.game.canvas.dataset.supportSummary = getSupportSummary(this.state);
    this.game.canvas.dataset.supportCompanion = support?.id ?? "";
    this.game.canvas.dataset.supportCompanionName = support?.name ?? "";
    this.game.canvas.dataset.supportLevel = support ? String(this.state.support.levels[support.id] ?? 1) : "";
    this.game.canvas.dataset.supportAffinity = support ? String(this.state.support.affinity[support.id] ?? 0) : "";
    this.game.canvas.dataset.supportAutoPickupFilter = this.state.support.autoPickupFilter;
  }

  private syncEnemyDataset(): void {
    this.refreshPrimaryEnemy();
    this.game.canvas.dataset.enemyEntityCount = String(this.enemies.length);
    this.game.canvas.dataset.enemyAliveCount = String(this.enemies.filter((enemy) => enemy.isAlive).length);

    if (!this.enemy) {
      this.game.canvas.dataset.enemyHp = "";
      this.game.canvas.dataset.enemyCombatState = "";
      this.game.canvas.dataset.enemySelected = "false";
      this.game.canvas.dataset.enemyAlive = "false";
      this.game.canvas.dataset.enemyCastRange = "";
      this.game.canvas.dataset.enemyCastCooldown = "";
      this.game.canvas.dataset.enemyCastCooldownRemaining = "0";
      this.game.canvas.dataset.enemyCastTelegraph = "hidden";
      this.game.canvas.dataset.enemySilenced = "false";
      this.game.canvas.dataset.enemyVisualMarker = "none";
      this.game.canvas.dataset.enemyTextureKey = "";
      this.game.canvas.dataset.enemyRespawnMs = "";
      this.game.canvas.dataset.enemyDamage = "";
      this.game.canvas.dataset.bossProtocol = "disabled";
      this.game.canvas.dataset.bossPhase = "";
      this.game.canvas.dataset.bossHp = "";
      this.syncAssistDataset();
      return;
    }

    this.game.canvas.dataset.enemyHp = `${this.enemy.hp}/${this.enemy.maxHp}`;
    this.game.canvas.dataset.enemyCombatState = this.enemy.behaviorMode;
    this.game.canvas.dataset.enemySelected = String(this.enemy.targetingState.selected);
    this.game.canvas.dataset.enemyAlive = String(this.enemy.isAlive);
    this.game.canvas.dataset.enemyPosition = `${this.enemy.sprite.x.toFixed(1)},${this.enemy.sprite.y.toFixed(1)}`;
    this.game.canvas.dataset.enemyTextureKey = this.enemy.textureKey;
    this.game.canvas.dataset.enemyBehavior = this.enemy.behavior;
    this.game.canvas.dataset.enemyTraits = this.getEnemyTraitDataset(this.enemy);
    this.game.canvas.dataset.enemyVisualMarker = this.getEnemyVisualMarkerDataset(this.enemy);
    this.game.canvas.dataset.enemyRespawnMs = String(this.enemy.respawnMs);
    this.game.canvas.dataset.enemyDamage = String(this.enemy.stats.attack);
    this.game.canvas.dataset.enemyAggroRange = String(this.enemy.aggroRange);
    this.game.canvas.dataset.enemyLeashDistance = String(this.enemy.leashDistance);
    this.game.canvas.dataset.enemyAssistRadius = String(this.enemy.assistRadius);
    this.game.canvas.dataset.enemyCastRange = String(this.enemy.castRange);
    this.game.canvas.dataset.enemyCastCooldown = String(this.enemy.castCooldownMs);
    this.game.canvas.dataset.enemyStatusEffects = this.dataRegistry
      ? getStatusSummary(this.enemy.statusEffects, (id) => this.dataRegistry!.getStatusEffect(id))
      : "";
    this.syncBossProtocolDataset(this.enemy);
    this.syncCasterDataset(this.enemy);
    this.syncAssistDataset();
  }

  private syncBossProtocolDataset(enemy: EnemyEntity): void {
    if (!enemy.bossProtocolEnabled) {
      this.game.canvas.dataset.bossProtocol = "disabled";
      this.game.canvas.dataset.bossPhase = "";
      this.game.canvas.dataset.bossHp = "";
      this.game.canvas.dataset.bossControlResistance = "";
      this.game.canvas.dataset.bossKnockbackResistance = "";
      return;
    }

    this.game.canvas.dataset.bossProtocol = "enabled";
    this.game.canvas.dataset.bossUi = enemy.isAlive && enemy.targetingState.selected ? "visible" : "hidden";
    this.game.canvas.dataset.bossPhase = String(enemy.bossPhase);
    this.game.canvas.dataset.bossHp = `${enemy.hp}/${enemy.maxHp}`;
    this.game.canvas.dataset.bossControlResistance = String(enemy.getControlDurationMultiplier());
    this.game.canvas.dataset.bossKnockbackResistance = String(enemy.getKnockbackDistance(100));
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

    this.game.canvas.dataset.enemyCastCooldownRemaining = String(cooldownRemaining);
    this.game.canvas.dataset.enemyCastTelegraph = runtime?.castWindupMs === null || runtime?.castWindupMs === undefined
      ? "hidden"
      : `visible:${castProgress.toFixed(2)}`;
    this.game.canvas.dataset.enemySilenced = String(this.hasEnemyControl(enemy, "silence"));
  }

  private syncAssistDataset(): void {
    const assistedEnemies = this.enemyRuntimes.filter((runtime) => runtime.enemy.isAlive && runtime.assistedByAlly);

    this.game.canvas.dataset.enemyAssistedCount = String(assistedEnemies.length);
    this.game.canvas.dataset.enemyAssistedIds = assistedEnemies.map((runtime) => runtime.enemy.id).join("|");
  }

  private toggleAssistDebugOverlay(): void {
    this.assistDebugVisible = !this.assistDebugVisible;
    this.game.canvas.dataset.debugAssistRadius = this.assistDebugVisible
      ? `visible:${this.getDebugAssistRadiusCount()}`
      : "hidden";
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

    this.game.canvas.dataset.debugAssistRadius = `visible:${this.getDebugAssistRadiusCount()}`;
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

  private syncCombatFormulaDataset(damage: number, hit: boolean, critical: boolean): void {
    this.game.canvas.dataset.lastCombatFormula = [
      "kind=physical",
      `weapon=${this.weaponAttack}`,
      `hit=${hit}`,
      `crit=${critical}`,
      `damage=${damage}`,
    ].join("|");
  }

  private updateMapTransitions(): void {
    if (!this.player || !this.state || this.isTransitioning) {
      return;
    }

    const portal = this.portals.find((entry) => entry.bounds.contains(this.player!.sprite.x, this.player!.sprite.y));

    if (!portal) {
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
    this.game.canvas.dataset.lastTransition = `${portal.name}:${portal.targetMapId}:${portal.targetSpawnName}`;
    this.game.canvas.dataset.lastTransitionExpiredBuffs = removedStatusIds.join(",");
    this.game.canvas.dataset.lastAutosaveSlot = String(savedSlot);
    this.game.canvas.dataset.lastAutosaveMap = saveData.gameState.currentMapId;
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

    this.game.canvas.dataset.lastAutosaveSlot = String(savedSlot);
    this.game.canvas.dataset.lastAutosaveMap = saveData.currentMapId;
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

  private syncMapMetadataDataset(map: MapDefinition, region: RegionDefinition): void {
    this.game.canvas.dataset.currentRegion = region.id;
    this.game.canvas.dataset.currentRegionName = region.name;
    this.game.canvas.dataset.currentRegionLevelRange = `${region.levelRange.min}-${region.levelRange.max}`;
    this.game.canvas.dataset.currentRegionDescription = region.description;
    this.game.canvas.dataset.regionProgression = this.dataRegistry
      ? this.dataRegistry.getRegions()
        .map((entry) => `${entry.id}:${entry.levelRange.min}-${entry.levelRange.max}`)
        .join("|")
      : "";
    this.game.canvas.dataset.currentMapDescription = map.description;
    this.game.canvas.dataset.currentMapLevelRange = `${map.levelRange.min}-${map.levelRange.max}`;
    this.game.canvas.dataset.currentMapType = map.type;
    this.game.canvas.dataset.currentMapMusicKey = map.musicKey;
    this.game.canvas.dataset.currentMapRecommendedElements = map.recommendedElements.join("|");
    this.game.canvas.dataset.currentMapDropHighlights = map.dropHighlights.join("|");
    this.game.canvas.dataset.currentMapPortals = map.portals
      .map((portal) => `${portal.id}:${portal.targetMapId}:${portal.targetSpawnName}`)
      .join("|");
    this.game.canvas.dataset.currentMapSpawnGroups = map.spawnGroups
      .map((spawnGroup) => `${spawnGroup.id}:${spawnGroup.monsterIds.join(",")}:${spawnGroup.maxCount}`)
      .join("|");
    this.game.canvas.dataset.currentMapNpcs = map.npcIds.join("|");
    this.game.canvas.dataset.currentMapMonsters = map.monsterIds.join("|");
    const dungeon = this.dataRegistry?.getDungeonByMapId(map.id);

    this.game.canvas.dataset.currentDungeon = dungeon?.id ?? "";
    this.game.canvas.dataset.currentDungeonBoss = dungeon?.bossId ?? "";
    this.game.canvas.dataset.currentDungeonRooms = dungeon
      ? dungeon.roomPlan.map((room) => `${room.id}:${room.encounterRole}`).join("|")
      : "";
    this.game.canvas.dataset.currentDungeonHazards = dungeon
      ? dungeon.hazards.map((hazard) => `${hazard.id}:${hazard.effect}`).join("|")
      : "";
    this.game.canvas.dataset.currentDungeonRewards = dungeon?.rewardItemIds.join("|") ?? "";
    this.game.canvas.dataset.currentDungeonRareMaterials = dungeon?.rareMaterialIds.join("|") ?? "";
    this.game.canvas.dataset.currentDungeonReplayable = dungeon ? String(dungeon.replayable) : "false";
    this.game.canvas.dataset.currentDungeonShortcut = dungeon?.shortcutUnlockId ?? "";
    this.game.canvas.dataset.currentDungeonBossMechanics = dungeon?.bossMechanics.join("|") ?? "";
  }

  private spawnInitialEnemies(collisionLayer: PrototypeTilemapLayer | null): void {
    for (const zone of this.spawnZones) {
      for (let count = 0; count < zone.maxCount; count += 1) {
        this.spawnEnemyFromZone(zone, collisionLayer);
      }
    }

    this.refreshPrimaryEnemy();
  }

  private spawnEnemyFromZone(zone: SpawnZoneRuntime, collisionLayer: PrototypeTilemapLayer | null): void {
    if (!this.dataRegistry) {
      return;
    }

    const monster = this.dataRegistry.getMonster(zone.monsterId);
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

  private getWalkableSpawnPoint(zone: SpawnZoneRuntime): Phaser.Math.Vector2 {
    if (this.isWalkable(zone.bounds.x, zone.bounds.y)) {
      return new Phaser.Math.Vector2(zone.bounds.x, zone.bounds.y);
    }

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const point = pickSpawnPoint(zone);

      if (this.isWalkable(point.x, point.y)) {
        return new Phaser.Math.Vector2(point.x, point.y);
      }
    }

    return new Phaser.Math.Vector2(
      zone.bounds.x + zone.bounds.width / 2,
      zone.bounds.y + zone.bounds.height / 2,
    );
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
