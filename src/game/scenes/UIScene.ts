import Phaser from "phaser";
import { RegistryKeys } from "../constants/registryKeys";
import { eventBus } from "../systems/eventBus";
import type { DataRegistry } from "../data/dataRegistry";
import type { GameState } from "../types/gameState";

export class UIScene extends Phaser.Scene {
  private unsubscribeHealth?: () => void;
  private unsubscribeSp?: () => void;
  private unsubscribeXp?: () => void;

  constructor() {
    super("UIScene");
  }

  create(): void {
    const state = this.registry.get(RegistryKeys.GameState) as GameState;
    const dataRegistry = this.registry.get(RegistryKeys.DataRegistry) as DataRegistry;

    this.game.canvas.dataset.uiScene = "running";
    this.syncPlayerStats(state, dataRegistry);

    this.unsubscribeHealth = eventBus.on("playerHealthChanged", ({ hp, maxHp }) => {
      this.game.canvas.dataset.playerHp = `${hp}/${maxHp}`;
    });

    this.unsubscribeSp = eventBus.on("playerSpChanged", ({ sp, maxSp }) => {
      this.game.canvas.dataset.playerSp = `${sp}/${maxSp}`;
    });

    this.unsubscribeXp = eventBus.on("xpGained", ({ totalXp }) => {
      this.game.canvas.dataset.playerXp = String(totalXp);
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeHealth?.();
      this.unsubscribeSp?.();
      this.unsubscribeXp?.();
    });
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
