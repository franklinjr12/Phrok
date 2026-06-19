import Phaser from "phaser";
import { RegistryKeys } from "../constants/registryKeys";
import { eventBus } from "../systems/eventBus";
import type { DataRegistry } from "../data/dataRegistry";
import type { GameState } from "../types/gameState";

export class UIScene extends Phaser.Scene {
  private unsubscribeHealth?: () => void;
  private unsubscribeSp?: () => void;
  private unsubscribeXp?: () => void;
  private unsubscribeLevelUp?: () => void;
  private unsubscribeInventory?: () => void;
  private unsubscribeLootDropped?: () => void;
  private unsubscribeLootPickedUp?: () => void;
  private unsubscribeEnemyHealth?: () => void;
  private unsubscribeEnemyTarget?: () => void;
  private xpBarFill?: Phaser.GameObjects.Rectangle;
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
    this.createPlayerBars(state);
    this.syncXpBar(state, dataRegistry);
    this.createTargetFrame();

    this.unsubscribeHealth = eventBus.on("playerHealthChanged", ({ hp, maxHp }) => {
      this.game.canvas.dataset.playerHp = `${hp}/${maxHp}`;
    });

    this.unsubscribeSp = eventBus.on("playerSpChanged", ({ sp, maxSp }) => {
      this.game.canvas.dataset.playerSp = `${sp}/${maxSp}`;
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
      this.syncXpBar(state, dataRegistry);
    });

    this.unsubscribeInventory = eventBus.on("inventoryChanged", ({ inventory }) => {
      const firstInventoryItem = inventory.items[0] ? dataRegistry.getItem(inventory.items[0].id) : null;

      this.game.canvas.dataset.inventoryItem = firstInventoryItem?.id ?? "";
      this.game.canvas.dataset.inventoryItemName = firstInventoryItem?.name ?? "";
      this.game.canvas.dataset.inventoryStackCount = String(inventory.items.length);
      this.game.canvas.dataset.equipmentInstanceCount = String(inventory.equipmentInstances.length);
      this.game.canvas.dataset.inventoryGold = String(inventory.gold);
      this.game.canvas.dataset.playerGold = String(inventory.gold);
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

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeHealth?.();
      this.unsubscribeSp?.();
      this.unsubscribeXp?.();
      this.unsubscribeLevelUp?.();
      this.unsubscribeInventory?.();
      this.unsubscribeLootDropped?.();
      this.unsubscribeLootPickedUp?.();
      this.unsubscribeEnemyHealth?.();
      this.unsubscribeEnemyTarget?.();
    });
  }

  private createPlayerBars(state: GameState): void {
    this.add.rectangle(20, 64, 180, 8, 0x111827, 0.8)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(100);
    this.xpBarFill = this.add.rectangle(20, 64, 1, 6, 0xfacc15, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(101);
    this.game.canvas.dataset.xpBar = "visible";
    this.game.canvas.dataset.xpBarWidth = "0";
    this.xpBarFill.displayWidth = state.playerProfile.xp > 0 ? 1 : 0;
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
    const firstInventoryItem = state.inventory.items[0] ? dataRegistry.getItem(state.inventory.items[0].id) : null;
    const firstSkill = playerClass.startingSkillIds[0] ? dataRegistry.getSkill(playerClass.startingSkillIds[0]) : null;

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

    this.game.canvas.dataset.playerXpNext = String(nextLevelXp ?? "");
    this.game.canvas.dataset.xpBarWidth = String(width);
  }
}
