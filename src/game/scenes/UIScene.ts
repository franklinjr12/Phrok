import Phaser from "phaser";
import { RegistryKeys } from "../constants/registryKeys";
import { eventBus } from "../systems/eventBus";
import type { DataRegistry } from "../data/dataRegistry";
import type { GameState } from "../types/gameState";

export class UIScene extends Phaser.Scene {
  private unsubscribeHealth?: () => void;
  private unsubscribeSp?: () => void;
  private unsubscribeXp?: () => void;
  private unsubscribeEnemyHealth?: () => void;
  private unsubscribeEnemyTarget?: () => void;
  private targetFrame?: Phaser.GameObjects.Rectangle;
  private targetNameText?: Phaser.GameObjects.Text;
  private targetHpText?: Phaser.GameObjects.Text;

  constructor() {
    super("UIScene");
  }

  create(): void {
    const state = this.registry.get(RegistryKeys.GameState) as GameState;
    const dataRegistry = this.registry.get(RegistryKeys.DataRegistry) as DataRegistry;

    this.game.canvas.dataset.uiScene = "running";
    this.syncPlayerStats(state, dataRegistry);
    this.createTargetFrame();

    this.unsubscribeHealth = eventBus.on("playerHealthChanged", ({ hp, maxHp }) => {
      this.game.canvas.dataset.playerHp = `${hp}/${maxHp}`;
    });

    this.unsubscribeSp = eventBus.on("playerSpChanged", ({ sp, maxSp }) => {
      this.game.canvas.dataset.playerSp = `${sp}/${maxSp}`;
    });

    this.unsubscribeXp = eventBus.on("xpGained", ({ totalXp }) => {
      this.game.canvas.dataset.playerXp = String(totalXp);
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

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeHealth?.();
      this.unsubscribeSp?.();
      this.unsubscribeXp?.();
      this.unsubscribeEnemyHealth?.();
      this.unsubscribeEnemyTarget?.();
    });
  }

  private createTargetFrame(): void {
    this.targetFrame = this.add.rectangle(400, 44, 250, 48, 0x111827, 0.78)
      .setStrokeStyle(2, 0xfacc15, 0.95)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false);
    this.targetNameText = this.add.text(292, 28, "", {
      color: "#f8fafc",
      fontFamily: "Arial, sans-serif",
      fontSize: "16px",
    })
      .setScrollFactor(0)
      .setDepth(101)
      .setVisible(false);
    this.targetHpText = this.add.text(292, 48, "", {
      color: "#bbf7d0",
      fontFamily: "Arial, sans-serif",
      fontSize: "13px",
    })
      .setScrollFactor(0)
      .setDepth(101)
      .setVisible(false);
    this.clearTargetFrame();
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
    const firstInventoryItem = state.inventory[0] ? dataRegistry.getItem(state.inventory[0].id) : null;
    const firstSkill = playerClass.startingSkillIds[0] ? dataRegistry.getSkill(playerClass.startingSkillIds[0]) : null;

    this.game.canvas.dataset.playerHp = `${state.character.stats.hp}/${state.character.stats.maxHp}`;
    this.game.canvas.dataset.playerSp = `${state.character.stats.sp}/${state.character.stats.maxSp}`;
    this.game.canvas.dataset.playerXp = String(state.playerProfile.xp);
    this.game.canvas.dataset.playerLevel = String(state.playerProfile.level);
    this.game.canvas.dataset.playerGold = String(state.playerProfile.gold);
    this.game.canvas.dataset.playerClass = playerClass.id;
    this.game.canvas.dataset.inventoryItem = firstInventoryItem?.id ?? "";
    this.game.canvas.dataset.inventoryItemName = firstInventoryItem?.name ?? "";
    this.game.canvas.dataset.skill = firstSkill?.id ?? "";
    this.game.canvas.dataset.skillName = firstSkill?.name ?? "";
  }
}
