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
import { createMainMenuLayout, type MainMenuAction } from "./mainMenuLayout";

const buttonStyle: Phaser.Types.GameObjects.Text.TextStyle = {
  align: "center",
  backgroundColor: "#22313f",
  color: "#f4f7fb",
  fixedWidth: 300,
  fontFamily: "Arial, sans-serif",
  fontSize: "20px",
  padding: {
    x: 16,
    y: 10,
  },
};

const buttonHoverStyle: Phaser.Types.GameObjects.Text.TextStyle = {
  backgroundColor: "#3b5872",
  color: "#ffffff",
};

const slotButtonStyle: Phaser.Types.GameObjects.Text.TextStyle = {
  ...buttonStyle,
  backgroundColor: "#1f2a36",
  fixedWidth: 330,
  fontSize: "16px",
};

const titleStyle: Phaser.Types.GameObjects.Text.TextStyle = {
  color: "#f8fafc",
  fontFamily: "Arial, sans-serif",
  fontSize: "58px",
};

const smallTextStyle: Phaser.Types.GameObjects.Text.TextStyle = {
  color: "#cbd5e1",
  fontFamily: "Arial, sans-serif",
  fontSize: "14px",
};

export class MainMenuScene extends Phaser.Scene {
  private saveSlots: Array<SaveData | null> = [];
  private dataRegistry?: DataRegistry;
  private settingsObjects: Phaser.GameObjects.GameObject[] = [];
  private creditsObjects: Phaser.GameObjects.GameObject[] = [];

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

    this.cameras.main.setBackgroundColor("#0d1418");
    this.drawFinalMenuBackdrop(width, height);

    for (const button of layout.buttons) {
      this.createMenuButton(button.x, button.y, button.label, button.action);
    }

    for (const saveSlot of layout.saveSlots) {
      this.createSaveSlotButton(saveSlot.x, saveSlot.y, saveSlot.slot);
    }

    canvas.dataset.scene = "main-menu";
    canvas.dataset.menuButtons = layout.buttons.map((button) => button.label).join("|");
    canvas.dataset.saveSlotButtons = this.saveSlots
      .map((saveData, index) => this.getButtonLabel(index + 1, saveData))
      .join("|");
    canvas.dataset.saveSlotCount = "3";
    canvas.dataset.saveSlots = this.saveSlots
      .map((saveData, index) => this.getSlotDatasetValue(index + 1, saveData))
      .join("|");
    canvas.dataset.settingsMenu = "hidden";
    canvas.dataset.creditsScreen = "hidden";
    canvas.dataset.loadMenu = "visible";
    canvas.dataset.continueState = this.getContinueSaveData() ? "available" : "unavailable";
    canvas.dataset.menuQuitState = "idle";
    this.syncSettingsDataset(state);
  }

  private drawFinalMenuBackdrop(width: number, height: number): void {
    this.add.rectangle(width / 2, height / 2, width, height, 0x101820, 1);
    this.add.rectangle(width / 2, height / 2, width, height, 0x203040, 0.32);
    this.add.rectangle(width / 2, height - 74, width, 148, 0x1e293b, 0.7);
    this.add.rectangle(width / 2, height - 148, width, 4, 0xfacc15, 0.8);
    this.add.text(width / 2, 70, "PROK", titleStyle).setOrigin(0.5);
    this.add.text(width / 2, 122, "Release Candidate", {
      ...smallTextStyle,
      color: "#fef3c7",
      fontSize: "16px",
    }).setOrigin(0.5);
    this.add.text(width / 2 + 210, 186, "Save Slots", {
      ...smallTextStyle,
      color: "#f8fafc",
      fontSize: "16px",
    }).setOrigin(0.5);
  }

  private createMenuButton(x: number, y: number, label: string, action: MainMenuAction): Phaser.GameObjects.Text {
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

      if (this.creditsObjects.length > 0) {
        return;
      }

      this.handleMenuAction(action);
    });

    return button;
  }

  private createSaveSlotButton(x: number, y: number, slot: number): Phaser.GameObjects.Text {
    const button = this.add
      .text(x, y, this.getButtonLabel(slot, this.saveSlots[slot - 1]), slotButtonStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    button.on("pointerover", () => {
      this.game.canvas.dataset.activeButton = `Slot ${slot}`;
      button.setStyle(buttonHoverStyle);
    });

    button.on("pointerout", () => {
      delete this.game.canvas.dataset.activeButton;
      button.setStyle(slotButtonStyle);
    });

    button.on("pointerdown", () => {
      audioManager.playSfx("ui-click");
      this.game.canvas.dataset.pressedButton = `Slot ${slot}`;
      button.setAlpha(0.82);
    });

    button.on("pointerup", () => {
      delete this.game.canvas.dataset.pressedButton;
      button.setAlpha(1);

      if (this.settingsObjects.length > 0 || this.creditsObjects.length > 0) {
        return;
      }

      this.selectSaveSlot(slot);
    });

    return button;
  }

  private handleMenuAction(action: MainMenuAction): void {
    this.game.canvas.dataset.lastMenuAction = action;

    if (this.settingsObjects.length > 0 && action !== "settings") {
      return;
    }

    if (action === "new-game") {
      this.startNewGame();
      return;
    }

    if (action === "continue") {
      this.continueLatestSave();
      return;
    }

    if (action === "load-game") {
      this.game.canvas.dataset.loadMenu = "visible";
      this.game.canvas.dataset.loadMenuStatus = this.saveSlots.some(Boolean) ? "choose-slot" : "no-saves";
      return;
    }

    if (action === "settings") {
      this.toggleSettingsMenu();
      return;
    }

    if (action === "credits") {
      this.showCreditsScreen();
      return;
    }

    this.game.canvas.dataset.menuQuitState = "requested";
    this.game.canvas.dataset.menuQuitMessage = "Browser build records quit request.";
  }

  private startNewGame(): void {
    if (this.saveSlots[0]) {
      this.game.canvas.dataset.selectedSaveSlot = "1";
      this.loadSave(this.saveSlots[0]);
      return;
    }

    const emptySlotIndex = this.saveSlots.findIndex((saveData) => !saveData);
    const slot = emptySlotIndex >= 0 ? emptySlotIndex + 1 : 1;

    this.game.canvas.dataset.newGameSlot = String(slot);
    this.registry.set(RegistryKeys.PendingSaveSlot, slot);
    this.scene.start(SceneKeys.CharacterCreation);
  }

  private continueLatestSave(): void {
    const latestSave = this.getContinueSaveData();

    if (!latestSave) {
      this.game.canvas.dataset.continueState = "unavailable";
      this.game.canvas.dataset.loadMenuStatus = "no-saves";
      return;
    }

    this.game.canvas.dataset.continueState = "selected";
    this.loadSave(latestSave);
  }

  private selectSaveSlot(slot: number): void {
    const saveData = this.saveSlots[slot - 1];
    this.game.canvas.dataset.selectedSaveSlot = String(slot);

    if (saveData) {
      this.loadSave(saveData);
      return;
    }

    this.registry.set(RegistryKeys.PendingSaveSlot, slot);
    this.scene.start(SceneKeys.CharacterCreation);
  }

  private loadSave(saveData: SaveData): void {
    this.registry.set(RegistryKeys.GameState, saveDataToGameState(saveData));
    this.scene.start(SceneKeys.World, { useSavedPosition: true });
  }

  private getContinueSaveData(): SaveData | null {
    const saves = this.saveSlots.filter((saveData): saveData is SaveData => Boolean(saveData));

    return saves.sort((left, right) => Date.parse(right.savedAt) - Date.parse(left.savedAt))[0] ?? null;
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

  private showCreditsScreen(): void {
    this.clearCreditsObjects();
    this.game.canvas.dataset.creditsScreen = "visible";
    this.game.canvas.dataset.creditsEntries = [
      "Design and engineering: Prok contributors",
      "Engine: Phaser 4.1.0 (MIT)",
      "Build tools: Vite, TypeScript, Vitest, Playwright",
      "Original art: procedural Prok pixel art generated in-project",
      "Audio: in-project placeholder synthesis, original and IP-safe",
    ].join("|");

    const overlay = this.add.rectangle(400, 300, 620, 460, 0x101820, 0.98)
      .setStrokeStyle(2, 0xd6b45f, 0.9)
      .setDepth(40)
      .setInteractive();
    this.creditsObjects.push(overlay);

    this.addCreditsText(400, 100, "Credits", 32, "#f8fafc", 0.5);
    this.addCreditsText(124, 152, "Contributors", 16, "#fef3c7", 0);
    this.addCreditsText(124, 184, "Prok contributors - game design, code, data, maps, and testing.", 14, "#cbd5e1", 0);
    this.addCreditsText(124, 238, "Tools and Licenses", 16, "#fef3c7", 0);
    this.addCreditsText(124, 270, "Phaser 4.1.0 - MIT License\nVite, TypeScript, Vitest, Playwright - MIT License", 14, "#cbd5e1", 0);
    this.addCreditsText(124, 342, "Assets", 16, "#fef3c7", 0);
    this.addCreditsText(124, 374, "Original in-project pixel art and procedural audio placeholders. No third-party music or SFX assets are bundled.", 14, "#cbd5e1", 0);

    const closeButton = this.add.text(400, 500, "Close", buttonStyle)
      .setOrigin(0.5)
      .setDepth(41)
      .setInteractive({ useHandCursor: true });
    closeButton.on("pointerup", () => {
      this.clearCreditsObjects();
      this.game.canvas.dataset.creditsScreen = "hidden";
    });
    this.creditsObjects.push(closeButton);
  }

  private addCreditsText(
    x: number,
    y: number,
    text: string,
    fontSize: number,
    color: string,
    originX: number,
  ): void {
    const object = this.add.text(x, y, text, {
      color,
      fixedWidth: originX === 0 ? 552 : undefined,
      fontFamily: "Arial, sans-serif",
      fontSize: `${fontSize}px`,
      lineSpacing: 8,
      wordWrap: originX === 0 ? { width: 552 } : undefined,
    })
      .setOrigin(originX, 0.5)
      .setDepth(41);
    this.creditsObjects.push(object);
  }

  private clearCreditsObjects(): void {
    for (const object of this.creditsObjects) {
      object.destroy();
    }

    this.creditsObjects = [];
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

  private getButtonLabel(slot: number, saveData: SaveData | null): string {
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
