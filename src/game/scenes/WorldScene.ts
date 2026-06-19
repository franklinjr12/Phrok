import Phaser from "phaser";
import { RegistryKeys } from "../constants/registryKeys";
import { SceneKeys } from "../constants/sceneKeys";
import { PlayerEntity } from "../entities/PlayerEntity";
import { eventBus } from "../systems/eventBus";
import type { DataRegistry } from "../data/dataRegistry";
import type { GameState } from "../types/gameState";

const worldSize = {
  width: 1600,
  height: 1200,
};

const playerSpawn = {
  x: worldSize.width / 2,
  y: worldSize.height / 2,
};

const blockedTiles = [
  new Phaser.Geom.Rectangle(684, 430, 232, 118),
];

export class WorldScene extends Phaser.Scene {
  private player?: PlayerEntity;
  private clickMarker?: Phaser.GameObjects.Arc;
  private isCameraFollowingPlayer = false;

  constructor() {
    super(SceneKeys.World);
  }

  create(): void {
    const state = this.registry.get(RegistryKeys.GameState) as GameState;
    const dataRegistry = this.registry.get(RegistryKeys.DataRegistry) as DataRegistry;
    const map = dataRegistry.getMap(state.currentMapId);
    const firstMonster = map.monsterIds[0] ? dataRegistry.getMonster(map.monsterIds[0]) : null;

    this.cameras.main.setBackgroundColor("#162019");
    this.physics.world.setBounds(0, 0, worldSize.width, worldSize.height);
    this.cameras.main.setBounds(0, 0, worldSize.width, worldSize.height);

    this.add.rectangle(0, 0, worldSize.width, worldSize.height, 0x1f3b2d).setOrigin(0);
    this.add.grid(0, 0, worldSize.width, worldSize.height, 64, 64, 0x000000, 0, 0xffffff, 0.08).setOrigin(0);
    this.add.rectangle(800, 489, 232, 118, 0x334155, 0.85).setStrokeStyle(2, 0x64748b, 0.9);
    this.add.text(playerSpawn.x, playerSpawn.y - 122, map.name, {
      color: "#f4f7fb",
      fontFamily: "Arial, sans-serif",
      fontSize: "24px",
    }).setOrigin(0.5);

    this.player = new PlayerEntity(this, state.character, playerSpawn);
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

    this.player.setDestination(destination);
    this.showClickMarker(destination.x, destination.y);
    this.game.canvas.dataset.lastMovementClickValid = "true";
    this.syncPlayerDataset();
  }

  private isWalkable(x: number, y: number): boolean {
    const isInsideWorld = x >= 0 && x <= worldSize.width && y >= 0 && y <= worldSize.height;

    return isInsideWorld && !blockedTiles.some((tile) => tile.contains(x, y));
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
    this.game.canvas.dataset.cameraFollowingPlayer = String(this.isCameraFollowingPlayer);
  }
}
