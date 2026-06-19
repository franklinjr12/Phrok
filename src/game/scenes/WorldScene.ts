import Phaser from "phaser";
import { RegistryKeys } from "../constants/registryKeys";
import { SceneKeys } from "../constants/sceneKeys";
import { PlayerEntity } from "../entities/PlayerEntity";
import {
  findPath,
  isWorldPointWalkable,
  type GridCollisionMap,
} from "../map/tilemapPathfinding";
import { eventBus } from "../systems/eventBus";
import type { DataRegistry } from "../data/dataRegistry";
import type { GameState } from "../types/gameState";

const prototypeMapKey = "map-crownfield-meadows";
const prototypeTilesKey = "prototype-tiles";
const tiledLayerNames = {
  ground: "Ground",
  decoration: "Decoration",
  collision: "Collision",
  objects: "Objects",
} as const;

type PrototypeTilemapLayer = Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer;

export class WorldScene extends Phaser.Scene {
  private player?: PlayerEntity;
  private clickMarker?: Phaser.GameObjects.Arc;
  private collisionMap?: GridCollisionMap;
  private isCameraFollowingPlayer = false;

  constructor() {
    super(SceneKeys.World);
  }

  create(): void {
    const state = this.registry.get(RegistryKeys.GameState) as GameState;
    const dataRegistry = this.registry.get(RegistryKeys.DataRegistry) as DataRegistry;
    const map = dataRegistry.getMap(state.currentMapId);
    const firstMonster = map.monsterIds[0] ? dataRegistry.getMonster(map.monsterIds[0]) : null;

    const tilemap = this.make.tilemap({ key: prototypeMapKey });
    const tileset = tilemap.addTilesetImage(prototypeTilesKey, prototypeTilesKey);

    if (!tileset) {
      throw new Error("Prototype tileset failed to load.");
    }

    const groundLayer = tilemap.createLayer(tiledLayerNames.ground, tileset, 0, 0);
    const decorationLayer = tilemap.createLayer(tiledLayerNames.decoration, tileset, 0, 0);
    const collisionLayer = tilemap.createLayer(tiledLayerNames.collision, tileset, 0, 0);
    const spawnPoint = this.getSpawnPoint(tilemap);
    this.collisionMap = this.createCollisionMap(tilemap, collisionLayer);

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

    this.player = new PlayerEntity(this, state.character, spawnPoint);
    if (collisionLayer) {
      this.physics.add.collider(this.player.sprite, collisionLayer);
    }

    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
    this.isCameraFollowingPlayer = true;
    this.cameras.main.centerOn(this.player.sprite.x, this.player.sprite.y);

    this.input.on("pointerdown", this.handlePointerDown, this);

    this.game.canvas.dataset.scene = "world";
    this.game.canvas.dataset.currentMap = state.currentMapId;
    this.game.canvas.dataset.currentMapName = map.name;
    this.game.canvas.dataset.characterArchetype = state.character.archetype;
    this.game.canvas.dataset.spawnedMonster = firstMonster?.id ?? "";
    this.game.canvas.dataset.spawnedMonsterName = firstMonster?.name ?? "";
    this.game.canvas.dataset.tilemapKey = prototypeMapKey;
    this.game.canvas.dataset.tilemapLayers = [
      tiledLayerNames.ground,
      tiledLayerNames.decoration,
      tiledLayerNames.collision,
      tiledLayerNames.objects,
    ].join("|");
    this.game.canvas.dataset.tilemapSize = `${tilemap.width}x${tilemap.height}`;
    this.game.canvas.dataset.spawnPoint = `${spawnPoint.x},${spawnPoint.y}`;
    this.game.canvas.dataset.collisionLayerEnabled = String(Boolean(collisionLayer));
    this.game.canvas.dataset.playerCharacterId = this.player.character.id;
    this.game.canvas.dataset.playerHasCollisionBody = String(Boolean(this.player.sprite.body));
    this.game.canvas.dataset.wasdMovement = "disabled";
    this.game.canvas.dataset.movementMarker = "hidden";
    this.syncPlayerDataset();

    this.scene.launch(SceneKeys.UI);
    eventBus.emit("mapChanged", { mapId: state.currentMapId });
  }

  update(_time: number, delta: number): void {
    this.player?.update(delta);
    this.syncPlayerDataset();
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.player || pointer.button !== 0) {
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

  private syncPlayerDataset(): void {
    if (!this.player) {
      return;
    }

    const { x, y } = this.player.position;
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

  private getSpawnPoint(tilemap: Phaser.Tilemaps.Tilemap): Phaser.Math.Vector2 {
    const objectLayer = tilemap.getObjectLayer(tiledLayerNames.objects);
    const spawnObject = objectLayer?.objects.find((object) => object.name === "PlayerSpawn");

    return new Phaser.Math.Vector2(spawnObject?.x ?? tilemap.widthInPixels / 2, spawnObject?.y ?? tilemap.heightInPixels / 2);
  }
}
