import Phaser from "phaser";
import { RegistryKeys } from "../../constants/registryKeys";
import { SceneKeys } from "../../constants/sceneKeys";
import type { DataRegistry } from "../../data/dataRegistry";
import {
  readSaveSlots,
  saveDataToGameState,
} from "../../systems/autosave";
import type { SaveData } from "../../types/saveData";
import { createMainMenuLayout } from "./mainMenuLayout";

const buttonStyle: Phaser.Types.GameObjects.Text.TextStyle = {
  align: "center",
  backgroundColor: "#263241",
  color: "#f4f7fb",
  fixedWidth: 420,
  fontFamily: "Arial, sans-serif",
  fontSize: "24px",
  padding: {
    x: 20,
    y: 14
  }
};

const buttonHoverStyle: Phaser.Types.GameObjects.Text.TextStyle = {
  backgroundColor: "#3a526d",
  color: "#ffffff"
};

export class MainMenuScene extends Phaser.Scene {
  private saveSlots: Array<SaveData | null> = [];
  private dataRegistry?: DataRegistry;

  constructor() {
    super(SceneKeys.MainMenu);
  }

  create(): void {
    const { width, height } = this.scale;
    const layout = createMainMenuLayout(width, height);
    const canvas = this.game.canvas;
    this.saveSlots = readSaveSlots();
    this.dataRegistry = this.registry.get(RegistryKeys.DataRegistry) as DataRegistry;

    this.cameras.main.setBackgroundColor("#101318");

    for (const button of layout.buttons) {
      this.createMenuButton(button.x, button.y, this.getButtonLabel(button.slot, button.label), button.slot);
    }

    canvas.dataset.scene = "main-menu";
    canvas.dataset.menuButtons = layout.buttons.map((button) => this.getButtonLabel(button.slot, button.label)).join("|");
    canvas.dataset.saveSlotCount = "3";
    canvas.dataset.saveSlots = this.saveSlots
      .map((saveData, index) => this.getSlotDatasetValue(index + 1, saveData))
      .join("|");
  }

  private createMenuButton(x: number, y: number, label: string, slot: number | null): Phaser.GameObjects.Text {
    const button = this.add
      .text(x, y, label, buttonStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    button.on("pointerover", () => {
      this.game.canvas.dataset.activeButton = label;
      button.setStyle(buttonHoverStyle);
    });

    button.on("pointerout", () => {
      delete this.game.canvas.dataset.activeButton;
      button.setStyle(buttonStyle);
    });

    button.on("pointerdown", () => {
      this.game.canvas.dataset.pressedButton = label;
      button.setAlpha(0.82);
    });

    button.on("pointerup", () => {
      delete this.game.canvas.dataset.pressedButton;
      button.setAlpha(1);

      if (slot !== null) {
        this.selectSaveSlot(slot);
      }
    });

    return button;
  }

  private selectSaveSlot(slot: number): void {
    const saveData = this.saveSlots[slot - 1];
    this.game.canvas.dataset.selectedSaveSlot = String(slot);

    if (saveData) {
      this.registry.set(RegistryKeys.GameState, saveDataToGameState(saveData));
      this.scene.start(SceneKeys.World, { useSavedPosition: true });
      return;
    }

    this.registry.set(RegistryKeys.PendingSaveSlot, slot);
    this.scene.start(SceneKeys.CharacterCreation);
  }

  private getButtonLabel(slot: number | null, fallback: string): string {
    if (slot === null) {
      return fallback;
    }

    const saveData = this.saveSlots[slot - 1];

    if (!saveData || !this.dataRegistry) {
      return `Slot ${slot}: New Game`;
    }

    const playerProfile = saveData.gameState.playerProfile;
    const className = this.dataRegistry.getClass(saveData.character.archetype).name;
    const mapName = this.dataRegistry.getMap(saveData.currentMapId).name;

    return `Slot ${slot}: ${playerProfile.name} - ${className} Lv ${playerProfile.level} - ${mapName}`;
  }

  private getSlotDatasetValue(slot: number, saveData: SaveData | null): string {
    if (!saveData || !this.dataRegistry) {
      return `${slot}:empty:New Game`;
    }

    const playerProfile = saveData.gameState.playerProfile;
    const className = this.dataRegistry.getClass(saveData.character.archetype).name;
    const mapName = this.dataRegistry.getMap(saveData.currentMapId).name;

    return [
      slot,
      "used",
      playerProfile.name,
      className,
      `Lv ${playerProfile.level}`,
      mapName,
    ].join(":");
  }
}
