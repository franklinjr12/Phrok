import Phaser from "phaser";
import { RegistryKeys } from "../constants/registryKeys";
import { eventBus } from "../systems/eventBus";
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

    this.game.canvas.dataset.uiScene = "running";
    this.syncPlayerStats(state);

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

  private syncPlayerStats(state: GameState): void {
    this.game.canvas.dataset.playerHp = `${state.character.stats.hp}/${state.character.stats.maxHp}`;
    this.game.canvas.dataset.playerSp = `${state.character.stats.sp}/${state.character.stats.maxSp}`;
    this.game.canvas.dataset.playerXp = String(state.playerProfile.xp);
    this.game.canvas.dataset.playerLevel = String(state.playerProfile.level);
    this.game.canvas.dataset.playerGold = String(state.playerProfile.gold);
  }
}
