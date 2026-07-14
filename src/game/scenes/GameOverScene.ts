import Phaser from "phaser";
import { RegistryKeys } from "../constants/registryKeys";
import { SceneKeys } from "../constants/sceneKeys";
import { autosaveSlot, writeAutosave, writeSaveSlot } from "../systems/autosave";
import { eventBus } from "../systems/eventBus";
import type { GameState } from "../types/gameState";

type GameOverSceneData = {
  deathSource?: string;
  respawnMapId?: string;
  respawnMapName?: string;
};

export class GameOverScene extends Phaser.Scene {
  private gameOverData?: Required<GameOverSceneData>;

  constructor() {
    super(SceneKeys.GameOver);
  }

  init(data: GameOverSceneData): void {
    this.gameOverData = {
      deathSource: data.deathSource ?? "unknown",
      respawnMapId: data.respawnMapId ?? "crownfield-town",
      respawnMapName: data.respawnMapName ?? "Crownfield",
    };
  }

  create(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const panelWidth = Math.min(420, width - 64);
    const panelHeight = 220;
    const panelX = width / 2;
    const panelY = height / 2;

    this.add.rectangle(width / 2, height / 2, width, height, 0x020617, 0.5)
      .setScrollFactor(0)
      .setDepth(250);
    this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x111827, 0.96)
      .setStrokeStyle(2, 0xf87171, 0.95)
      .setScrollFactor(0)
      .setDepth(251);
    this.add.text(panelX, panelY - 72, "You died.", {
      color: "#fecaca",
      fontFamily: "Arial, sans-serif",
      fontSize: "28px",
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(252);
    this.add.text(panelX, panelY - 24, `Respawn at ${this.gameOverData?.respawnMapName ?? "Crownfield"}`, {
      color: "#f8fafc",
      fontFamily: "Arial, sans-serif",
      fontSize: "16px",
    })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(252);
    this.add.text(panelX - 62, panelY + 46, "Respawn", {
      backgroundColor: "#047857",
      color: "#f8fafc",
      fixedWidth: 124,
      fixedHeight: 34,
      fontFamily: "Arial, sans-serif",
      fontSize: "16px",
      padding: { x: 24, y: 8 },
    })
      .setScrollFactor(0)
      .setDepth(252)
      .setInteractive({ useHandCursor: true })
      .on(Phaser.Input.Events.POINTER_DOWN, () => this.respawn());

    this.game.canvas.dataset.gameOver = "visible";
    this.game.canvas.dataset.gameplayInputBlocked = "true";
    this.game.canvas.dataset.respawnTargetMap = this.gameOverData?.respawnMapId ?? "crownfield-town";
    this.game.canvas.dataset.respawnTargetName = this.gameOverData?.respawnMapName ?? "Crownfield";
    this.game.canvas.dataset.lastDeathSource = this.gameOverData?.deathSource ?? "unknown";

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.canvas.dataset.gameOver = "hidden";
    });
  }

  private respawn(): void {
    const state = this.registry.get(RegistryKeys.GameState) as GameState;
    const respawnMapId = this.gameOverData?.respawnMapId ?? "crownfield-town";

    state.currentMapId = respawnMapId;
    state.position = { x: 240, y: 304 };
    state.character.stats.hp = state.character.stats.maxHp;
    state.character.statusEffects = [];
    state.challengeDungeons.activeRun = null;
    state.challengeDungeons.activeClassTrialId = null;
    this.game.canvas.dataset.playerCombatState = "alive";
    this.game.canvas.dataset.gameplayInputBlocked = "false";
    this.game.canvas.dataset.autoAttack = "stopped";
    this.game.canvas.dataset.playerStatusEffects = "";
    this.game.canvas.dataset.playerHp = `${state.character.stats.hp}/${state.character.stats.maxHp}`;
    eventBus.emit("playerHealthChanged", {
      hp: state.character.stats.hp,
      maxHp: state.character.stats.maxHp,
    });

    const saveData = state.currentSaveSlot
      ? writeSaveSlot(state.currentSaveSlot, state)
      : writeAutosave(state);
    const savedSlot = state.currentSaveSlot ?? autosaveSlot;
    this.game.canvas.dataset.lastAutosaveSlot = String(savedSlot);
    this.game.canvas.dataset.lastAutosaveMap = saveData.gameState.currentMapId;
    eventBus.emit("saveCompleted", { saveSlot: savedSlot });

    this.scene.stop(SceneKeys.Dialogue);
    this.scene.stop(SceneKeys.World);
    this.scene.launch(SceneKeys.World, {
      spawnName: "PlayerSpawn",
      lastAutosaveMap: saveData.gameState.currentMapId,
      lastAutosaveSlot: String(savedSlot),
      lastTransition: `respawn:${respawnMapId}:PlayerSpawn`,
    });
    this.scene.bringToTop(SceneKeys.UI);
    this.scene.stop();
  }
}
