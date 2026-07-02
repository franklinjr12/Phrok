import Phaser from "phaser";
import { RegistryKeys } from "../../constants/registryKeys";
import { SceneKeys } from "../../constants/sceneKeys";
import type { DataRegistry } from "../../data/dataRegistry";
import { audioManager } from "../../systems/audioManager";
import { applySettingsPatch, cycleDifficulty, cycleUiScale, getSettingsSummary } from "../../systems/settings";
import {
  readSaveSlots,
  saveDataToGameState,
} from "../../systems/autosave";
import type { SaveData } from "../../types/saveData";
import type { GameState } from "../../types/gameState";
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
  private settingsObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super(SceneKeys.MainMenu);
  }

  create(): void {
    const { width, height } = this.scale;
    const layout = createMainMenuLayout(width, height);
    const canvas = this.game.canvas;
    this.saveSlots = readSaveSlots();
    this.dataRegistry = this.registry.get(RegistryKeys.DataRegistry) as DataRegistry;
    const state = this.registry.get(RegistryKeys.GameState) as GameState;
    audioManager.initialize(state, canvas);

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
    canvas.dataset.settingsMenu = "hidden";
    this.syncSettingsDataset(state);
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
      audioManager.playSfx("ui-click");
      this.game.canvas.dataset.pressedButton = label;
      button.setAlpha(0.82);
    });

    button.on("pointerup", () => {
      delete this.game.canvas.dataset.pressedButton;
      button.setAlpha(1);

      if (this.settingsObjects.length > 0 && slot !== null) {
        return;
      }

      if (slot !== null) {
        this.selectSaveSlot(slot);
      } else {
        this.toggleSettingsMenu();
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

  private toggleSettingsMenu(): void {
    if (this.settingsObjects.length > 0) {
      this.clearSettingsObjects();
      this.game.canvas.dataset.settingsMenu = "hidden";
      return;
    }

    const state = this.registry.get(RegistryKeys.GameState) as GameState;
    this.game.canvas.dataset.settingsMenu = "visible";
    this.renderSettingsMenu(state);
  }

  private renderSettingsMenu(state: GameState): void {
    this.clearSettingsObjects();
    this.addSettingsRectangle(158, 82, 484, 430, 0x101820, 0.97)
      .setOrigin(0)
      .setStrokeStyle(2, 0xd6b45f, 0.9);
    this.addSettingsText(188, 108, "Settings", 28, "#f8fafc");
    this.addSettingsText(188, 150, getSettingsSummary(state.settings), 13, "#cbd5e1");
    this.addSettingsButton(188, 190, 130, 34, `Music ${Math.round(state.settings.musicVolume * 100)}%`, () => {
      applySettingsPatch(state, { musicVolume: state.settings.musicVolume >= 1 ? 0 : state.settings.musicVolume + 0.1 });
      audioManager.adjustMusicVolume(0);
      this.renderSettingsMenu(state);
    });
    this.addSettingsButton(330, 190, 130, 34, `SFX ${Math.round(state.settings.sfxVolume * 100)}%`, () => {
      applySettingsPatch(state, { sfxVolume: state.settings.sfxVolume >= 1 ? 0 : state.settings.sfxVolume + 0.1 });
      audioManager.adjustSfxVolume(0);
      this.renderSettingsMenu(state);
    });
    this.addSettingsButton(472, 190, 130, 34, `UI ${Math.round(state.settings.uiScale * 100)}%`, () => {
      cycleUiScale(state);
      this.renderSettingsMenu(state);
    });
    this.addSettingsButton(188, 242, 130, 34, `Damage ${state.settings.damageNumbersEnabled ? "On" : "Off"}`, () => {
      applySettingsPatch(state, { damageNumbersEnabled: !state.settings.damageNumbersEnabled });
      this.renderSettingsMenu(state);
    });
    this.addSettingsButton(330, 242, 130, 34, `Shake ${state.settings.screenShakeEnabled ? "On" : "Off"}`, () => {
      applySettingsPatch(state, { screenShakeEnabled: !state.settings.screenShakeEnabled });
      this.renderSettingsMenu(state);
    });
    this.addSettingsButton(472, 242, 130, 34, `Flash ${Math.round(state.settings.flashIntensity * 100)}%`, () => {
      applySettingsPatch(state, { flashIntensity: state.settings.flashIntensity >= 1 ? 0 : state.settings.flashIntensity + 0.25 });
      this.renderSettingsMenu(state);
    });
    this.addSettingsButton(188, 294, 130, 34, `Potion ${state.settings.autoPotionEnabled ? "On" : "Off"}`, () => {
      applySettingsPatch(state, { autoPotionEnabled: !state.settings.autoPotionEnabled });
      this.renderSettingsMenu(state);
    });
    this.addSettingsButton(330, 294, 130, 34, state.settings.difficulty, () => {
      cycleDifficulty(state);
      this.renderSettingsMenu(state);
    });
    this.addSettingsButton(472, 294, 130, 34, `Text ${state.settings.textSpeed.toFixed(2)}x`, () => {
      applySettingsPatch(state, { textSpeed: state.settings.textSpeed >= 2 ? 0.5 : state.settings.textSpeed + 0.25 });
      this.renderSettingsMenu(state);
    });
    this.addSettingsButton(472, 444, 130, 34, "Close", () => this.toggleSettingsMenu());
    this.syncSettingsDataset(state);
  }

  private addSettingsButton(x: number, y: number, width: number, height: number, label: string, callback: () => void): void {
    const button = this.addSettingsRectangle(x, y, width, height, 0x263241, 0.96)
      .setOrigin(0)
      .setStrokeStyle(1, 0xfacc15, 0.9)
      .setInteractive({ useHandCursor: true });
    button.on("pointerdown", callback);
    this.addSettingsText(x + 12, y + 9, label, 13, "#f8fafc");
  }

  private addSettingsRectangle(x: number, y: number, width: number, height: number, color: number, alpha: number): Phaser.GameObjects.Rectangle {
    const rectangle = this.add.rectangle(x, y, width, height, color, alpha).setDepth(30);
    this.settingsObjects.push(rectangle);
    return rectangle;
  }

  private addSettingsText(x: number, y: number, text: string, fontSize: number, color: string): Phaser.GameObjects.Text {
    const object = this.add.text(x, y, text, {
      color,
      fontFamily: "Arial, sans-serif",
      fontSize: `${fontSize}px`,
    }).setDepth(31);
    this.settingsObjects.push(object);
    return object;
  }

  private clearSettingsObjects(): void {
    for (const object of this.settingsObjects) {
      object.destroy();
    }

    this.settingsObjects = [];
  }

  private syncSettingsDataset(state: GameState): void {
    this.game.canvas.dataset.settingsSummary = getSettingsSummary(state.settings);
    this.game.canvas.dataset.settingsDifficulty = state.settings.difficulty;
    this.game.canvas.dataset.settingsUiScale = String(state.settings.uiScale);
    this.game.canvas.dataset.settingsButtons = "Music|SFX|UI|Damage|Shake|Flash|Potion|Difficulty|Text|Close";
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
