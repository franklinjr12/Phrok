import Phaser from "phaser";
import { RegistryKeys } from "../../constants/registryKeys";
import { SceneKeys } from "../../constants/sceneKeys";
import type { DataRegistry } from "../../data/dataRegistry";
import { audioManager } from "../../systems/audioManager";
import { applySettingsPatch, cycleDifficulty, cycleUiScale, getReadableSettingsSummary, getSettingsSummary } from "../../systems/settings";
import {
  deleteSaveSlot,
  readSaveSlots,
  saveDataToGameState,
} from "../../systems/autosave";
import type { SaveData } from "../../types/saveData";
import type { GameState } from "../../types/gameState";
import { createMainMenuLayout, type MainMenuAction } from "./mainMenuLayout";
import { enterScene, isSceneTransitioning, transitionToScene } from "../sceneTransition";
import { uiTheme } from "../../ui/uiTheme";

const buttonStyle: Phaser.Types.GameObjects.Text.TextStyle = {
  align: "center",
  backgroundColor: "#18332f",
  color: "#f9f1d0",
  fixedWidth: 300,
  fontFamily: "Trebuchet MS, Arial, sans-serif",
  fontSize: "20px",
  padding: {
    x: 16,
    y: 9,
  },
  shadow: {
    blur: 2,
    color: "#061311",
    fill: true,
    offsetX: 1,
    offsetY: 2,
  },
};

const buttonHoverStyle: Phaser.Types.GameObjects.Text.TextStyle = {
  backgroundColor: "#315a4e",
  color: "#ffffff",
};

const slotButtonStyle: Phaser.Types.GameObjects.Text.TextStyle = {
  ...buttonStyle,
  backgroundColor: "#102622",
  fixedWidth: 330,
  fontSize: "12px",
};

const titleStyle: Phaser.Types.GameObjects.Text.TextStyle = {
  color: "#f9f1d0",
  fontFamily: "Georgia, Times New Roman, serif",
  fontSize: "60px",
  fontStyle: "bold",
  shadow: {
    blur: 4,
    color: "#061311",
    fill: true,
    offsetX: 2,
    offsetY: 3,
  },
};

const smallTextStyle: Phaser.Types.GameObjects.Text.TextStyle = {
  color: "#b6c7b5",
  fontFamily: "Trebuchet MS, Arial, sans-serif",
  fontSize: "14px",
};

interface MenuButtonVisual {
  action: MainMenuAction;
  accent: Phaser.GameObjects.Rectangle;
  background: Phaser.GameObjects.Rectangle;
  button: Phaser.GameObjects.Text;
  label: string;
}

export class MainMenuScene extends Phaser.Scene {
  private saveSlots: Array<SaveData | null> = [];
  private dataRegistry?: DataRegistry;
  private settingsObjects: Phaser.GameObjects.GameObject[] = [];
  private creditsObjects: Phaser.GameObjects.GameObject[] = [];
  private saveSlotObjects: Phaser.GameObjects.GameObject[] = [];
  private saveActionObjects: Phaser.GameObjects.GameObject[] = [];
  private deleteConfirmationObjects: Phaser.GameObjects.GameObject[] = [];
  private menuButtonVisuals: MenuButtonVisual[] = [];
  private selectedMenuIndex = 0;
  private selectedSaveSlot: number | null = null;
  private pendingDeleteSlot: number | null = null;

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
    this.menuButtonVisuals = [];
    this.selectedMenuIndex = 0;
    this.selectedSaveSlot = null;
    this.pendingDeleteSlot = null;

    this.cameras.main.setBackgroundColor("#0d1418");
    this.drawFinalMenuBackdrop(width, height, layout);
    this.drawMenuPanels(width, height, layout);

    for (const button of layout.buttons) {
      this.createMenuButton(button.x, button.y, button.label, button.action);
    }

    this.refreshSaveSlotObjects(layout);

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
    canvas.dataset.saveSlotSummary = `${this.saveSlots.filter(Boolean).length} of 3 slots occupied`;
    canvas.dataset.saveDeleteConfirmation = "hidden";
    canvas.dataset.saveDeleteStatus = "idle";
    canvas.dataset.saveActionButtons = "Select a slot";
    this.syncSaveSlotDataset();
    this.syncSettingsDataset(state);
    this.installKeyboardNavigation();
    this.refreshMenuButtonStates();
    enterScene(this, "main-menu");
  }

  private drawFinalMenuBackdrop(width: number, height: number, layout: ReturnType<typeof createMainMenuLayout>): void {
    this.add.rectangle(width / 2, height / 2, width, height, 0x071b19, 1).setDepth(-20);
    this.add.rectangle(width / 2, height * 0.38, width, height * 0.76, 0x16453d, 0.42).setDepth(-19);
    this.add.rectangle(width / 2, height * 0.82, width, height * 0.36, 0x061311, 0.74).setDepth(-18);

    const ambientOrb = this.add.circle(width * 0.78, layout.compact ? 170 : 188, layout.compact ? 92 : 126, 0xb6a04b, 0.12)
      .setDepth(-17);
    this.add.circle(width * 0.78, layout.compact ? 170 : 188, layout.compact ? 66 : 92, 0x315a4e, 0.18)
      .setDepth(-16);
    this.add.circle(width * 0.78, layout.compact ? 170 : 188, layout.compact ? 48 : 68, 0xf9e7a8, 0.12)
      .setDepth(-15);
    this.tweens.add({
      targets: ambientOrb,
      alpha: { from: 0.08, to: 0.18 },
      duration: 3200,
      ease: "Sine.inOut",
      repeat: -1,
      yoyo: true,
    });

    const horizon = this.add.graphics().setDepth(-14);
    horizon.fillStyle(0x0b2723, 0.92);
    horizon.fillRect(0, height - 132, width, 84);
    horizon.fillStyle(0x123a32, 0.86);
    horizon.fillTriangle(0, height - 108, width * 0.25, height - 174, width * 0.5, height - 108);
    horizon.fillTriangle(width * 0.34, height - 108, width * 0.64, height - 184, width * 0.93, height - 108);
    horizon.fillStyle(0x071b19, 0.95);
    horizon.fillRect(0, height - 48, width, 48);

    const stars = [
      [0.08, 0.22, 2], [0.18, 0.12, 1], [0.32, 0.2, 1], [0.59, 0.13, 2],
      [0.9, 0.26, 1], [0.69, 0.32, 1], [0.47, 0.09, 1],
    ] as const;
    for (const [x, y, radius] of stars) {
      this.add.circle(width * x, height * y, radius, 0xf9e7a8, 0.62).setDepth(-13);
    }

    this.add.text(width / 2, layout.compact ? 56 : 58, "PROK", {
      ...titleStyle,
      fontSize: layout.compact ? "50px" : titleStyle.fontSize,
    }).setOrigin(0.5);
    const titleGlow = this.add.text(width / 2, layout.compact ? 56 : 58, "PROK", {
      ...titleStyle,
      color: "#d6b45f",
      fontSize: layout.compact ? "50px" : titleStyle.fontSize,
    }).setOrigin(0.5).setAlpha(0.16).setDepth(-1);
    this.tweens.add({
      targets: titleGlow,
      alpha: { from: 0.08, to: 0.24 },
      duration: 2400,
      ease: "Sine.inOut",
      repeat: -1,
      yoyo: true,
    });
    this.add.rectangle(width / 2, layout.compact ? 99 : 101, layout.compact ? 150 : 208, 1, 0xd6b45f, 0.75)
      .setDepth(-1);
    this.add.text(width / 2, layout.compact ? 117 : 119, "A SMALL RPG ABOUT BIG ADVENTURES", {
      ...smallTextStyle,
      color: "#e8dcae",
      fontSize: layout.compact ? "11px" : "12px",
    }).setOrigin(0.5);
    this.add.text(layout.saveTitleX, layout.saveTitleY - 18, "YOUR JOURNEY", {
      ...smallTextStyle,
      color: "#f9e7a8",
      fontSize: "15px",
      fontStyle: "bold",
    }).setOrigin(0.5);
  }

  private drawMenuPanels(width: number, height: number, layout: ReturnType<typeof createMainMenuLayout>): void {
    const actionX = layout.centerX > 0 && !layout.compact ? layout.buttons[0].x : layout.centerX;
    const actionWidth = layout.compact ? Math.min(width - 28, 420) : 330;
    const actionTop = layout.compact ? layout.buttons[0].y - 34 : 176;
    const actionHeight = layout.compact ? 322 : 316;
    this.addPanel(actionX, actionTop + actionHeight / 2, actionWidth, actionHeight, "ADVENTURE");

    const saveX = layout.compact ? layout.centerX : layout.saveSlots[0].x;
    const saveWidth = layout.compact ? Math.min(width - 28, 420) : 350;
    const saveTop = layout.compact ? layout.saveTitleY - 30 : 174;
    const saveHeight = layout.compact ? 248 : 264;
    this.addPanel(saveX, saveTop + saveHeight / 2, saveWidth, saveHeight, "SAVE SLOTS");
    this.add.text(saveX, saveTop + 34, `${this.saveSlots.filter(Boolean).length} OF 3 SLOTS OCCUPIED`, {
      ...smallTextStyle,
      color: "#9bb4a2",
      fontSize: "11px",
    }).setOrigin(0.5).setDepth(2);

    this.add.text(actionX, actionTop - 17, "Choose your next step", {
      ...smallTextStyle,
      color: "#9bb4a2",
      fontSize: "11px",
    }).setOrigin(0.5).setDepth(2);
  }

  private addPanel(x: number, y: number, width: number, height: number, label: string): void {
    this.add.rectangle(x, y, width, height, 0x0c211e, 0.9)
      .setStrokeStyle(1, 0x5f765c, 0.78)
      .setDepth(0);
    this.add.rectangle(x, y - height / 2, width - 34, 2, 0xd6b45f, 0.72).setDepth(1);
    this.add.text(x, y - height / 2 + 12, label, {
      color: "#d6b45f",
      fontFamily: "Trebuchet MS, Arial, sans-serif",
      fontSize: "11px",
      fontStyle: "bold",
      letterSpacing: 2,
    }).setOrigin(0.5, 0).setDepth(2);
  }

  private createMenuButton(x: number, y: number, label: string, action: MainMenuAction): Phaser.GameObjects.Text {
    const isPrimary = action === "new-game";
    const background = this.add.rectangle(x, y, 300, 42, isPrimary ? 0x765b27 : 0x18332f, 0.98)
      .setStrokeStyle(1, isPrimary ? 0xe1c56e : 0x5f765c, 0.95)
      .setDepth(3);
    const accent = this.add.rectangle(x - 146, y, 4, 28, isPrimary ? 0xf9e7a8 : 0xd6b45f, 0.9).setDepth(4);
    const button = this.add
      .text(x, y, label, buttonStyle)
      .setOrigin(0.5)
      .setDepth(5)
      .setInteractive({ useHandCursor: true });
    this.menuButtonVisuals.push({ action, accent, background, button, label });

    button.on("pointerover", () => {
      this.game.canvas.dataset.activeButton = label;
      this.selectedMenuIndex = this.menuButtonVisuals.findIndex((entry) => entry.button === button);
      this.setMenuButtonHover(this.menuButtonVisuals[this.selectedMenuIndex], true);
    });

    button.on("pointerout", () => {
      delete this.game.canvas.dataset.activeButton;
      this.setMenuButtonHover(this.menuButtonVisuals.find((entry) => entry.button === button), false);
    });

    button.on("pointerdown", () => {
      audioManager.playSfx("ui-click");
      this.game.canvas.dataset.pressedButton = label;
      button.setAlpha(0.82);
    });

    button.on("pointerup", () => {
      delete this.game.canvas.dataset.pressedButton;
      button.setAlpha(1);

      if (this.creditsObjects.length > 0 || isSceneTransitioning(this)) {
        return;
      }

      this.handleMenuAction(action);
    });

    return button;
  }

  private setMenuButtonHover(entry: MenuButtonVisual | undefined, hovered: boolean): void {
    if (!entry) {
      return;
    }

    const isPrimary = entry.action === "new-game";
    entry.button.setStyle(hovered ? buttonHoverStyle : buttonStyle);
    entry.background.setFillStyle(hovered ? (isPrimary ? 0xb68f36 : 0x315a4e) : (isPrimary ? 0x765b27 : 0x18332f), 0.98);
    entry.background.setStrokeStyle(1, hovered ? 0xf9e7a8 : (isPrimary ? 0xe1c56e : 0x5f765c), 0.95);
    entry.accent.setFillStyle(hovered ? 0xffffff : (isPrimary ? 0xf9e7a8 : 0xd6b45f), hovered ? 1 : 0.9);
  }

  private refreshMenuButtonStates(): void {
    this.menuButtonVisuals.forEach((entry, index) => this.setMenuButtonHover(entry, index === this.selectedMenuIndex));
  }

  private installKeyboardNavigation(): void {
    this.input.keyboard?.off("keydown", this.handleKeyDown, this);
    this.input.keyboard?.on("keydown", this.handleKeyDown, this);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (isSceneTransitioning(this)) {
      return;
    }

    if (this.pendingDeleteSlot !== null) {
      if (event.key === "Escape") {
        event.preventDefault();
        this.cancelDeleteConfirmation();
      } else if (event.key === "Enter") {
        event.preventDefault();
        this.confirmDeleteSave();
      }
      return;
    }

    if (this.creditsObjects.length > 0) {
      if (event.key === "Escape") {
        this.clearCreditsObjects();
        this.game.canvas.dataset.creditsScreen = "hidden";
      }
      return;
    }

    if (this.settingsObjects.length > 0) {
      if (event.key === "Escape") {
        this.toggleSettingsMenu();
      }
      return;
    }

    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      this.selectedMenuIndex = (this.selectedMenuIndex + this.menuButtonVisuals.length - 1) % this.menuButtonVisuals.length;
      this.game.canvas.dataset.activeButton = this.menuButtonVisuals[this.selectedMenuIndex]?.label;
      this.refreshMenuButtonStates();
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      this.selectedMenuIndex = (this.selectedMenuIndex + 1) % this.menuButtonVisuals.length;
      this.game.canvas.dataset.activeButton = this.menuButtonVisuals[this.selectedMenuIndex]?.label;
      this.refreshMenuButtonStates();
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const selected = this.menuButtonVisuals[this.selectedMenuIndex];
      if (selected) {
        audioManager.playSfx("ui-click");
        this.handleMenuAction(selected.action);
      }
    }
  }

  private refreshSaveSlotObjects(layout: ReturnType<typeof createMainMenuLayout>): void {
    this.clearSaveSlotObjects();

    for (const saveSlot of layout.saveSlots) {
      this.createSaveSlotButton(saveSlot.x, saveSlot.y, saveSlot.slot);
    }

    this.createSaveActionButtons(layout);
  }

  private clearSaveSlotObjects(): void {
    for (const object of [...this.saveSlotObjects, ...this.saveActionObjects]) {
      object.destroy();
    }

    this.saveSlotObjects = [];
    this.saveActionObjects = [];
  }

  private createSaveSlotButton(x: number, y: number, slot: number): void {
    const saveData = this.saveSlots[slot - 1];
    const selected = this.selectedSaveSlot === slot;
    const slotBackground = this.add.rectangle(x, y, 330, 54, selected ? 0x315a4e : (saveData ? 0x18332f : 0x102622), 0.98)
      .setStrokeStyle(selected ? 2 : 1, selected ? 0xf9e7a8 : (saveData ? 0x8b9b67 : 0x3e594d), 0.95)
      .setDepth(3);
    this.saveSlotObjects.push(slotBackground);
    const button = this.add
      .text(x, y, this.getDetailedSlotLabel(slot, saveData), {
        ...slotButtonStyle,
        color: saveData ? "#f9f1d0" : "#9bb4a2",
        lineSpacing: 1,
        padding: { x: 12, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(5)
      .setInteractive({ useHandCursor: true });
    this.saveSlotObjects.push(button);

    button.on("pointerover", () => {
      this.game.canvas.dataset.activeButton = `Slot ${slot}`;
      slotBackground.setFillStyle(0x315a4e, 0.98);
      slotBackground.setStrokeStyle(1, 0xf9e7a8, 1);
      button.setStyle({ ...slotButtonStyle, backgroundColor: "#315a4e", color: "#ffffff" });
    });

    button.on("pointerout", () => {
      delete this.game.canvas.dataset.activeButton;
      slotBackground.setFillStyle(selected ? 0x315a4e : (saveData ? 0x18332f : 0x102622), 0.98);
      slotBackground.setStrokeStyle(selected ? 2 : 1, selected ? 0xf9e7a8 : (saveData ? 0x8b9b67 : 0x3e594d), 0.9);
      button.setStyle({
        ...slotButtonStyle,
        backgroundColor: selected ? "#315a4e" : (saveData ? "#18332f" : "#102622"),
        color: saveData ? "#f9f1d0" : "#9bb4a2",
        lineSpacing: 1,
        padding: { x: 12, y: 3 },
      });
    });

    button.on("pointerdown", () => {
      audioManager.playSfx("ui-click");
      this.game.canvas.dataset.pressedButton = `Slot ${slot}`;
      button.setAlpha(0.82);
    });

    button.on("pointerup", () => {
      delete this.game.canvas.dataset.pressedButton;
      button.setAlpha(1);

      if (
        this.settingsObjects.length > 0
        || this.creditsObjects.length > 0
        || this.pendingDeleteSlot !== null
        || isSceneTransitioning(this)
      ) {
        return;
      }

      this.selectSaveSlot(slot);
    });

  }

  private getVisualSlotLabel(slot: number, saveData: SaveData | null): string {
    if (!saveData || !this.dataRegistry) {
      return `SLOT ${slot}\nEMPTY  ·  Start a new adventure`;
    }

    const playerProfile = saveData.gameState.playerProfile;
    const className = this.dataRegistry.getClass(saveData.character.archetype).name;
    const mapName = this.dataRegistry.getMap(saveData.currentMapId).name;

    return `SLOT ${slot}  ·  ${playerProfile.name}\n${className}  ·  Lv ${playerProfile.level}  ·  ${mapName}`;
  }

  private getDetailedSlotLabel(slot: number, saveData: SaveData | null): string {
    if (!saveData || !this.dataRegistry) {
      return `SLOT ${slot}\nEMPTY  ·  New character available`;
    }

    const playerProfile = saveData.gameState.playerProfile;
    const className = this.dataRegistry.getClass(saveData.character.archetype).name;
    const mapName = this.dataRegistry.getMap(saveData.currentMapId).name;

    return `SLOT ${slot}  ·  ${playerProfile.name}\n${className}  ·  Lv ${playerProfile.level}  ·  ${mapName}\nSaved ${this.formatSaveDate(saveData.savedAt)}`;
  }

  private formatSaveDate(savedAt: string): string {
    const timestamp = Date.parse(savedAt);
    if (!Number.isFinite(timestamp)) {
      return "date unavailable";
    }

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(timestamp));
  }

  private createSaveActionButtons(layout: ReturnType<typeof createMainMenuLayout>): void {
    const x = layout.compact ? layout.centerX : layout.saveSlots[0].x;
    const y = layout.compact ? layout.saveSlots[2].y + 46 : layout.saveSlots[2].y + 48;
    const selectedSave = this.selectedSaveSlot === null ? null : this.saveSlots[this.selectedSaveSlot - 1];

    if (selectedSave) {
      this.addSaveActionButton(x - 80, y, 146, "Load Selected", () => this.loadSelectedSave());
      this.addSaveActionButton(x + 80, y, 146, "Delete Selected", () => this.requestDeleteSelectedSave(), true);
      this.game.canvas.dataset.saveActionButtons = "Load Selected|Delete Selected";
      return;
    }

    if (this.selectedSaveSlot !== null) {
      this.addSaveActionButton(x, y, layout.compact ? 220 : 190, "New Character", () => this.startNewCharacterInSelectedSlot());
      this.game.canvas.dataset.saveActionButtons = "New Character";
      return;
    }

    const hint = this.add.text(x, y, "Select a slot to manage saves", {
      ...smallTextStyle,
      fontSize: "12px",
      color: "#7f9a8b",
    }).setOrigin(0.5).setDepth(4);
    this.saveActionObjects.push(hint);
    this.game.canvas.dataset.saveActionButtons = "Select a slot";
  }

  private addSaveActionButton(
    x: number,
    y: number,
    width: number,
    label: string,
    callback: () => void,
    destructive = false,
  ): void {
    const background = this.add.rectangle(x, y, width, 30, destructive ? 0x4b2525 : 0x315a4e, 0.98)
      .setStrokeStyle(1, destructive ? 0xb86565 : 0xd6b45f, 0.95)
      .setDepth(4)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      ...smallTextStyle,
      color: "#f9f1d0",
      fontSize: "12px",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(5);
    text.setInteractive({ useHandCursor: true });
    this.saveActionObjects.push(background, text);

    const setHover = (hovered: boolean) => {
      background.setFillStyle(hovered ? (destructive ? 0x713737 : 0x4d806d) : (destructive ? 0x4b2525 : 0x315a4e), 0.98);
      background.setStrokeStyle(1, hovered ? 0xffffff : (destructive ? 0xb86565 : 0xd6b45f), 0.95);
    };
    background.on("pointerover", () => setHover(true));
    background.on("pointerout", () => setHover(false));
    text.on("pointerover", () => setHover(true));
    text.on("pointerout", () => setHover(false));
    background.on("pointerup", callback);
    text.on("pointerup", callback);
  }

  private handleMenuAction(action: MainMenuAction): void {
    if (isSceneTransitioning(this)) {
      return;
    }

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
    const emptySlotIndex = this.saveSlots.findIndex((saveData) => !saveData);
    if (emptySlotIndex < 0) {
      this.game.canvas.dataset.newGameState = "unavailable";
      this.game.canvas.dataset.loadMenuStatus = "all-slots-full";
      return;
    }

    const slot = emptySlotIndex + 1;

    this.game.canvas.dataset.newGameSlot = String(slot);
    this.registry.set(RegistryKeys.PendingSaveSlot, slot);
    transitionToScene(this, SceneKeys.CharacterCreation);
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
    this.selectedSaveSlot = slot;
    this.game.canvas.dataset.selectedSaveSlot = String(slot);
    this.game.canvas.dataset.loadMenuStatus = this.saveSlots[slot - 1] ? "slot-selected" : "empty-slot-selected";
    this.game.canvas.dataset.saveDeleteStatus = "idle";
    this.refreshSaveSlotObjects(createMainMenuLayout(this.scale.width, this.scale.height));
  }

  private loadSelectedSave(): void {
    const saveData = this.selectedSaveSlot === null ? null : this.saveSlots[this.selectedSaveSlot - 1];
    if (!saveData) {
      return;
    }

    this.game.canvas.dataset.lastSaveAction = "load-selected";
    this.loadSave(saveData);
  }

  private startNewCharacterInSelectedSlot(): void {
    if (this.selectedSaveSlot === null || this.saveSlots[this.selectedSaveSlot - 1]) {
      return;
    }

    this.game.canvas.dataset.newGameSlot = String(this.selectedSaveSlot);
    this.registry.set(RegistryKeys.PendingSaveSlot, this.selectedSaveSlot);
    transitionToScene(this, SceneKeys.CharacterCreation);
  }

  private requestDeleteSelectedSave(): void {
    if (this.selectedSaveSlot === null || !this.saveSlots[this.selectedSaveSlot - 1]) {
      return;
    }

    this.showDeleteConfirmation(this.selectedSaveSlot);
  }

  private showDeleteConfirmation(slot: number): void {
    this.clearDeleteConfirmation();
    this.pendingDeleteSlot = slot;
    this.game.canvas.dataset.saveDeleteConfirmation = "visible";
    this.game.canvas.dataset.saveDeleteSlot = String(slot);
    this.game.canvas.dataset.saveDeleteStatus = "pending";

    const { width, height } = this.scale;
    const panelWidth = Math.min(430, width - 36);
    const panelHeight = 190;
    const top = (height - panelHeight) / 2;
    const saveData = this.saveSlots[slot - 1];
    const name = saveData?.gameState.playerProfile.name ?? "this adventure";

    const backdrop = this.add.rectangle(width / 2, height / 2, width, height, 0x020807, 0.78)
      .setDepth(50)
      .setInteractive();
    const panel = this.add.rectangle(width / 2, height / 2, panelWidth, panelHeight, 0x101820, 1)
      .setStrokeStyle(2, 0xb86565, 0.95)
      .setDepth(51);
    const title = this.add.text(width / 2, top + 34, "Delete save?", {
      ...titleStyle,
      color: "#f5c2c2",
      fontSize: "26px",
    }).setOrigin(0.5).setDepth(52);
    const message = this.add.text(width / 2, top + 78, `Delete Slot ${slot} — ${name}?\nThis cannot be undone.`, {
      ...smallTextStyle,
      color: "#e5e7eb",
      align: "center",
      lineSpacing: 6,
    }).setOrigin(0.5).setDepth(52);

    this.deleteConfirmationObjects.push(backdrop, panel, title, message);
    this.addDeleteConfirmationButton(width / 2 - 86, top + 148, "Cancel", () => this.cancelDeleteConfirmation());
    this.addDeleteConfirmationButton(width / 2 + 86, top + 148, "Delete", () => this.confirmDeleteSave(), true);
  }

  private addDeleteConfirmationButton(x: number, y: number, label: string, callback: () => void, destructive = false): void {
    const button = this.add.rectangle(x, y, 140, 34, destructive ? 0x713737 : 0x315a4e, 0.98)
      .setStrokeStyle(1, destructive ? 0xe5a1a1 : 0xd6b45f, 0.95)
      .setDepth(52)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      ...smallTextStyle,
      color: "#ffffff",
      fontSize: "13px",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(53).setInteractive({ useHandCursor: true });
    this.deleteConfirmationObjects.push(button, text);
    button.on("pointerup", callback);
    text.on("pointerup", callback);
  }

  private cancelDeleteConfirmation(): void {
    this.game.canvas.dataset.saveDeleteStatus = "cancelled";
    this.clearDeleteConfirmation();
  }

  private confirmDeleteSave(): void {
    const slot = this.pendingDeleteSlot;
    if (slot === null) {
      return;
    }

    deleteSaveSlot(slot);
    this.saveSlots = readSaveSlots();
    this.selectedSaveSlot = null;
    this.game.canvas.dataset.lastSaveAction = "delete-confirmed";
    this.game.canvas.dataset.saveDeleteStatus = "deleted";
    this.game.canvas.dataset.saveSlotSummary = `${this.saveSlots.filter(Boolean).length} of 3 slots occupied`;
    this.clearDeleteConfirmation();
    this.syncSaveSlotDataset();
    this.refreshSaveSlotObjects(createMainMenuLayout(this.scale.width, this.scale.height));
  }

  private clearDeleteConfirmation(): void {
    for (const object of this.deleteConfirmationObjects) {
      object.destroy();
    }

    this.deleteConfirmationObjects = [];
    this.pendingDeleteSlot = null;
    this.game.canvas.dataset.saveDeleteConfirmation = "hidden";
  }

  private loadSave(saveData: SaveData): void {
    if (isSceneTransitioning(this)) {
      return;
    }

    this.registry.set(RegistryKeys.GameState, saveDataToGameState(saveData));
    transitionToScene(this, SceneKeys.World, { useSavedPosition: true });
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

    const { width, height } = this.scale;
    const panelWidth = Math.min(620, width - 32);
    const panelHeight = Math.min(460, height - 56);
    const left = width / 2 - panelWidth / 2;
    const top = height / 2 - panelHeight / 2;

    const overlay = this.add.rectangle(width / 2, height / 2, panelWidth, panelHeight, uiTheme.colors.paper, 0.98)
      .setStrokeStyle(2, uiTheme.colors.accent, 0.9)
      .setDepth(40)
      .setInteractive();
    this.creditsObjects.push(overlay);

    this.addCreditsText(width / 2, top + 48, "Credits", 32, uiTheme.text.primary, 0.5, panelWidth - 68);
    this.addCreditsText(left + 34, top + 100, "Contributors", 16, uiTheme.text.accent, 0, panelWidth - 68);
    this.addCreditsText(left + 34, top + 132, "Prok contributors - game design, code, data, maps, and testing.", 14, uiTheme.text.secondary, 0, panelWidth - 68);
    this.addCreditsText(left + 34, top + 186, "Tools and Licenses", 16, uiTheme.text.accent, 0, panelWidth - 68);
    this.addCreditsText(left + 34, top + 218, "Phaser 4.1.0 - MIT License\nVite, TypeScript, Vitest, Playwright - MIT License", 14, uiTheme.text.secondary, 0, panelWidth - 68);
    this.addCreditsText(left + 34, top + 290, "Assets", 16, uiTheme.text.accent, 0, panelWidth - 68);
    this.addCreditsText(left + 34, top + 322, "Original in-project pixel art and procedural audio placeholders. No third-party music or SFX assets are bundled.", 14, uiTheme.text.secondary, 0, panelWidth - 68);

    const closeButton = this.add.text(width / 2, top + panelHeight - 44, "Close", buttonStyle)
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
    wrapWidth = 552,
  ): void {
    const object = this.add.text(x, y, text, {
      color,
      fixedWidth: originX === 0 ? wrapWidth : undefined,
      fontFamily: "Arial, sans-serif",
      fontSize: `${fontSize}px`,
      lineSpacing: 8,
      wordWrap: originX === 0 ? { width: wrapWidth } : undefined,
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
    const { width, height } = this.scale;
    const compact = width < 620;
    const panelWidth = compact ? Math.min(width - 28, 420) : 484;
    const panelHeight = compact ? Math.min(height - 54, 556) : 430;
    const left = compact ? (width - panelWidth) / 2 : 158;
    const top = compact ? 28 : 82;
    const buttonWidth = compact ? panelWidth - 60 : 130;
    this.addSettingsRectangle(left, top, panelWidth, panelHeight, uiTheme.colors.paper, 0.98)
      .setOrigin(0)
      .setStrokeStyle(2, uiTheme.colors.accent, 0.9);
    this.addSettingsText(left + 30, top + 26, "Settings", 28, uiTheme.text.primary);
    this.addSettingsText(left + 30, top + 68, getReadableSettingsSummary(state.settings), 13, uiTheme.text.secondary, panelWidth - 60);

    if (compact) {
      const labels = [
        [`Music ${Math.round(state.settings.musicVolume * 100)}%`, () => {
          applySettingsPatch(state, { musicVolume: state.settings.musicVolume >= 1 ? 0 : state.settings.musicVolume + 0.1 });
          audioManager.adjustMusicVolume(0);
          this.renderSettingsMenu(state);
        }],
        [`SFX ${Math.round(state.settings.sfxVolume * 100)}%`, () => {
          applySettingsPatch(state, { sfxVolume: state.settings.sfxVolume >= 1 ? 0 : state.settings.sfxVolume + 0.1 });
          audioManager.adjustSfxVolume(0);
          this.renderSettingsMenu(state);
        }],
        [`UI ${Math.round(state.settings.uiScale * 100)}%`, () => {
          cycleUiScale(state);
          this.renderSettingsMenu(state);
        }],
        [`Damage ${state.settings.damageNumbersEnabled ? "On" : "Off"}`, () => {
          applySettingsPatch(state, { damageNumbersEnabled: !state.settings.damageNumbersEnabled });
          this.renderSettingsMenu(state);
        }],
        [`Shake ${state.settings.screenShakeEnabled ? "On" : "Off"}`, () => {
          applySettingsPatch(state, { screenShakeEnabled: !state.settings.screenShakeEnabled });
          this.renderSettingsMenu(state);
        }],
        [`Flash ${Math.round(state.settings.flashIntensity * 100)}%`, () => {
          applySettingsPatch(state, { flashIntensity: state.settings.flashIntensity >= 1 ? 0 : state.settings.flashIntensity + 0.25 });
          this.renderSettingsMenu(state);
        }],
        [`Potion ${state.settings.autoPotionEnabled ? "On" : "Off"}`, () => {
          applySettingsPatch(state, { autoPotionEnabled: !state.settings.autoPotionEnabled });
          this.renderSettingsMenu(state);
        }],
        [state.settings.difficulty, () => {
          cycleDifficulty(state);
          this.renderSettingsMenu(state);
        }],
        [`Text ${state.settings.textSpeed.toFixed(2)}x`, () => {
          applySettingsPatch(state, { textSpeed: state.settings.textSpeed >= 2 ? 0.5 : state.settings.textSpeed + 0.25 });
          this.renderSettingsMenu(state);
        }],
        [`Music ${state.settings.musicMuted ? "Off" : "On"}`, () => {
          audioManager.toggleMusicMute();
          this.renderSettingsMenu(state);
        }],
        [`SFX ${state.settings.sfxMuted ? "Off" : "On"}`, () => {
          audioManager.toggleSfxMute();
          this.renderSettingsMenu(state);
        }],
        [`VFX ${state.settings.visualEffectsIntensity === "full" ? "Full" : "Reduced"}`, () => {
          applySettingsPatch(state, { visualEffectsIntensity: state.settings.visualEffectsIntensity === "full" ? "reduced" : "full" });
          this.renderSettingsMenu(state);
        }],
      ] as Array<[string, () => void]>;

      labels.forEach(([label, callback], index) => {
        this.addSettingsButton(left + 30, top + 132 + index * 32, buttonWidth, 28, label, callback);
      });
      this.addSettingsButton(left + panelWidth - 160, top + panelHeight - 40, 130, 28, "Close", () => this.toggleSettingsMenu());
      this.syncSettingsDataset(state);
      return;
    }

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
    this.addSettingsButton(188, 346, 130, 34, `Music ${state.settings.musicMuted ? "Off" : "On"}`, () => {
      audioManager.toggleMusicMute();
      this.renderSettingsMenu(state);
    });
    this.addSettingsButton(330, 346, 130, 34, `SFX ${state.settings.sfxMuted ? "Off" : "On"}`, () => {
      audioManager.toggleSfxMute();
      this.renderSettingsMenu(state);
    });
    this.addSettingsButton(472, 346, 130, 34, `VFX ${state.settings.visualEffectsIntensity === "full" ? "Full" : "Reduced"}`, () => {
      applySettingsPatch(state, { visualEffectsIntensity: state.settings.visualEffectsIntensity === "full" ? "reduced" : "full" });
      this.renderSettingsMenu(state);
    });
    this.addSettingsButton(472, 444, 130, 34, "Close", () => this.toggleSettingsMenu());
    this.syncSettingsDataset(state);
  }

  private addSettingsButton(x: number, y: number, width: number, height: number, label: string, callback: () => void): void {
    const button = this.addSettingsRectangle(x, y, width, height, 0x263241, 0.96)
      .setOrigin(0)
      .setStrokeStyle(1, uiTheme.colors.accent, 0.9)
      .setInteractive({ useHandCursor: true });
    button.on("pointerdown", callback);
    this.addSettingsText(x + 12, y + 9, label, 13, uiTheme.text.onDark);
  }

  private addSettingsRectangle(x: number, y: number, width: number, height: number, color: number, alpha: number): Phaser.GameObjects.Rectangle {
    const rectangle = this.add.rectangle(x, y, width, height, color, alpha).setDepth(30);
    this.settingsObjects.push(rectangle);
    return rectangle;
  }

  private addSettingsText(x: number, y: number, text: string, fontSize: number, color: string, wrapWidth?: number): Phaser.GameObjects.Text {
    const object = this.add.text(x, y, text, {
      color,
      fontFamily: "Arial, sans-serif",
      fontSize: `${fontSize}px`,
      lineSpacing: 4,
      wordWrap: wrapWidth ? { width: wrapWidth } : undefined,
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
    this.game.canvas.dataset.settingsMusicMuted = String(state.settings.musicMuted);
    this.game.canvas.dataset.settingsSfxMuted = String(state.settings.sfxMuted);
    this.game.canvas.dataset.settingsVfxIntensity = state.settings.visualEffectsIntensity;
    this.game.canvas.dataset.settingsButtons = "Music|SFX|UI|Damage|Shake|Flash|Potion|Difficulty|Text|MusicMute|SfxMute|VFX|Close";
  }

  private syncSaveSlotDataset(): void {
    const canvas = this.game.canvas;
    canvas.dataset.saveSlotButtons = this.saveSlots
      .map((saveData, index) => this.getButtonLabel(index + 1, saveData))
      .join("|");
    canvas.dataset.saveSlots = this.saveSlots
      .map((saveData, index) => this.getSlotDatasetValue(index + 1, saveData))
      .join("|");
    canvas.dataset.saveSlotDetails = this.saveSlots
      .map((saveData, index) => this.getSlotDetailsDatasetValue(index + 1, saveData))
      .join("|");
    canvas.dataset.saveSlotSummary = `${this.saveSlots.filter(Boolean).length} of 3 slots occupied`;
    canvas.dataset.continueState = this.getContinueSaveData() ? "available" : "unavailable";
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

  private getSlotDetailsDatasetValue(slot: number, saveData: SaveData | null): string {
    if (!saveData || !this.dataRegistry) {
      return `${slot}:empty:New character available`;
    }

    const playerProfile = saveData.gameState.playerProfile;
    const className = this.dataRegistry.getClass(saveData.character.archetype).name;
    const mapName = this.dataRegistry.getMap(saveData.currentMapId).name;

    return [
      slot,
      "occupied",
      playerProfile.name,
      className,
      `Lv ${playerProfile.level}`,
      mapName,
      this.formatSaveDate(saveData.savedAt),
    ].join(":");
  }
}
