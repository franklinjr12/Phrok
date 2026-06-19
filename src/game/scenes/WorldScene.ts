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
import { getEquipmentStats } from "../systems/equipment";
import type { DataRegistry } from "../data/dataRegistry";
import type { DialogueSceneData } from "./DialogueScene";
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
const enemyAttackRange = 70;
const playerAttackCooldownMs = 850;
const enemyAttackCooldownMs = 1250;

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

export class WorldScene extends Phaser.Scene {
  private player?: PlayerEntity;
  private enemy?: EnemyEntity;
  private clickMarker?: Phaser.GameObjects.Arc;
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
  private playerAttackTimerMs = playerAttackCooldownMs;
  private enemyAttackTimerMs = 0;
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
    this.pendingNpcInteraction = undefined;
    this.isDialogueOpen = false;
    const map = dataRegistry.getMap(state.currentMapId);
    const firstMonster = map.monsterIds[0] ? dataRegistry.getMonster(map.monsterIds[0]) : null;
    const tilemapKey = mapKeysById[state.currentMapId] ?? mapKeysById["crownfield-town"];

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

    this.player = new PlayerEntity(this, state.character, spawnPoint);
    this.playerCombatStats = this.createPlayerCombatStats(state, dataRegistry);
    this.weaponAttack = this.getEquippedWeaponAttack(state, dataRegistry);
    if (collisionLayer) {
      this.physics.add.collider(this.player.sprite, collisionLayer);
    }

    if (firstMonster) {
      this.enemy = new EnemyEntity(this, firstMonster, this.getEnemySpawnPoint(spawnPoint, tilemap));
      if (collisionLayer) {
        this.physics.add.collider(this.enemy.sprite, collisionLayer);
      }
    }

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
      this.weaponAttack = this.getEquippedWeaponAttack(state, dataRegistry);
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeDialogueClosed?.();
      this.unsubscribeEquipmentChanged?.();
      this.input.off("pointerdown", this.handlePointerDown, this);
    });

    this.game.canvas.dataset.scene = "world";
    this.game.canvas.dataset.currentMap = state.currentMapId;
    this.game.canvas.dataset.currentMapName = map.name;
    this.game.canvas.dataset.characterArchetype = state.character.archetype;
    this.game.canvas.dataset.spawnedMonster = firstMonster?.id ?? "";
    this.game.canvas.dataset.spawnedMonsterName = firstMonster?.name ?? "";
    this.game.canvas.dataset.enemySelected = "false";
    this.game.canvas.dataset.enemyCombatState = this.enemy?.behaviorMode ?? "";
    this.game.canvas.dataset.enemyHp = this.enemy ? `${this.enemy.hp}/${this.enemy.maxHp}` : "";
    this.game.canvas.dataset.enemyPosition = this.enemy
      ? `${this.enemy.sprite.x},${this.enemy.sprite.y}`
      : "";
    this.game.canvas.dataset.targetFrame = "hidden";
    this.game.canvas.dataset.autoAttack = "idle";
    this.game.canvas.dataset.playerCombatState = "alive";
    this.game.canvas.dataset.lastCombatFormula = "";
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
    this.game.canvas.dataset.npcCount = String(map.npcIds.length);
    this.game.canvas.dataset.npcEntityCount = String(this.npcs.length);
    this.game.canvas.dataset.npcNames = this.npcs.map((npc) => npc.name).join("|");
    this.game.canvas.dataset.npcServiceTypes = this.npcs.map((npc) => npc.serviceType).join("|");
    this.game.canvas.dataset.dialogueState = "closed";
    this.game.canvas.dataset.dialogueBlockingMovement = "false";
    this.game.canvas.dataset.pendingNpcInteraction = "";
    this.game.canvas.dataset.portalCount = String(this.portals.length);
    this.game.canvas.dataset.safeZone = firstMonster ? "field-entrance" : "town";
    this.game.canvas.dataset.gatheringSpotCount = String(this.countObjectsByType(tilemap, "gathering"));
    this.game.canvas.dataset.monsterSpawnZoneCount = String(this.countObjectsByType(tilemap, "monsterSpawn"));
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
    this.persistTransitionSpawn();
    this.syncEnemyDataset();

    this.scene.launch(SceneKeys.UI);
    eventBus.emit("mapChanged", { mapId: state.currentMapId });
  }

  update(_time: number, delta: number): void {
    this.player?.update(delta);
    this.updateNpcInteraction();
    this.updateCombat(delta);
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

    if (this.enemy?.isAlive && this.enemy.sprite.getBounds().contains(pointer.worldX, pointer.worldY)) {
      this.pendingNpcInteraction = undefined;
      this.selectEnemy(this.enemy);
      this.moveIntoAttackRange(this.enemy);
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
    this.enemyAttackTimerMs = enemyAttackCooldownMs;
    this.game.canvas.dataset.enemySelected = "true";
    this.game.canvas.dataset.autoAttack = "moving-to-range";
    eventBus.emit("enemyTargetChanged", {
      enemyId: enemy.id,
      name: enemy.name,
      hp: enemy.hp,
      maxHp: enemy.maxHp,
    });
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

    const dialogue = dataRegistry.getDialogue(npc.dialogueId);
    const sceneData: DialogueSceneData = {
      npcId: npc.id,
      npcName: npc.name,
      dialogueId: dialogue.id,
      serviceType: npc.serviceType,
      lines: dialogue.lines,
      choices: dialogue.choices,
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

    if (distanceToTarget > playerAttackRange) {
      enemy.behaviorMode = "chasing";
      this.game.canvas.dataset.autoAttack = "moving-to-range";

      if (!player.destination && player.path.length === 0) {
        this.moveIntoAttackRange(enemy);
      }

      return;
    }

    player.clearDestination();
    enemy.behaviorMode = "attacking";
    this.game.canvas.dataset.autoAttack = "attacking";
    this.playerAttackTimerMs += deltaMs;
    this.enemyAttackTimerMs += deltaMs;

    if (enemy.isAlive && distanceToTarget <= enemyAttackRange && this.enemyAttackTimerMs >= enemyAttackCooldownMs) {
      this.enemyAttackTimerMs = 0;
      this.enemyAttack(enemy);
    }

    if (enemy.isAlive && this.playerAttackTimerMs >= playerAttackCooldownMs) {
      this.playerAttackTimerMs = 0;
      this.playerAttack(enemy);
    }
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

    enemy.takeDamage(result.finalDamage);
    this.syncCombatFormulaDataset(result.finalDamage, result.hit, result.critical);
    eventBus.emit("enemyHealthChanged", {
      enemyId: enemy.id,
      name: enemy.name,
      hp: enemy.hp,
      maxHp: enemy.maxHp,
    });

    if (!enemy.isAlive) {
      this.game.canvas.dataset.autoAttack = "stopped";
      this.game.canvas.dataset.enemySelected = "false";
      this.rewardEnemyKill(enemy);
      eventBus.emit("enemyTargetChanged", {
        enemyId: null,
        name: "",
        hp: 0,
        maxHp: 0,
      });
      this.attackTarget = undefined;
    }
  }

  private rewardEnemyKill(enemy: EnemyEntity): void {
    const state = this.state;
    const dataRegistry = this.dataRegistry;

    if (!state || !dataRegistry) {
      return;
    }

    const monster = dataRegistry.getMonster(enemy.id);
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

    const dropTable = dataRegistry.getDropTable(monster.dropTableId);
    const drops = generateLootDrops(dropTable, dataRegistry);
    drops.forEach((drop, index) => this.spawnLootDrop(drop, enemy.sprite.x + index * 28, enemy.sprite.y + 18));
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
  }

  private syncEnemyDataset(): void {
    if (!this.enemy) {
      return;
    }

    this.game.canvas.dataset.enemyHp = `${this.enemy.hp}/${this.enemy.maxHp}`;
    this.game.canvas.dataset.enemyCombatState = this.enemy.behaviorMode;
    this.game.canvas.dataset.enemySelected = String(this.enemy.targetingState.selected);
    this.game.canvas.dataset.enemyAlive = String(this.enemy.isAlive);
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
    const saveData = this.state.currentSaveSlot
      ? writeSaveSlot(this.state.currentSaveSlot, this.state)
      : writeAutosave(this.state);
    const savedSlot = this.state.currentSaveSlot ?? autosaveSlot;
    this.game.canvas.dataset.lastTransition = `${portal.name}:${portal.targetMapId}:${portal.targetSpawnName}`;
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
    const playerClass = dataRegistry.getClass(state.character.archetype);

    return {
      attack: playerClass.baseStats.attack,
      defense: playerClass.baseStats.defense,
      hitChance: 0.9,
      dodgeChance: 0.08,
      criticalChance: 0.15,
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
