import Phaser from "phaser";
import { eventBus } from "../../../systems/eventBus";
import { audioManager } from "../../../systems/audioManager";
import { applySettingsPatch, adjustFlashIntensity, adjustTextSpeed, cycleDifficulty, cycleUiScale, difficultyPresets, getSettingsSummary } from "../../../systems/settings";
import type { GameState } from "../../../types/gameState";
import { uiTheme } from "../../uiTheme";
import type { PanelContext, UIPanel } from "../../panels/panelTypes";
import { addPanelButton as addPanelButtonPrimitive, addPanelRectangle as addPanelRectanglePrimitive, addPanelText as addPanelTextPrimitive } from "../../panels/panelPrimitives";
const { panelDepth, hudDepth, panelFill, panelStroke } = uiTheme;
export class SettingsPanel implements UIPanel {
 readonly id = "settings" as const;
 private returnToTitlePending = false;
 constructor(private readonly context: PanelContext) {}
 open(): void { this.returnToTitlePending = false; }
 close(): void { this.returnToTitlePending = false; }
 
 render(): void { this.renderSettingsPanel(this.context.state); }
 destroy(): void {}
 
private renderSettingsPanel(state: GameState): void {
    const settings = state.settings;
    const preset = difficultyPresets[settings.difficulty];

    this.addPanelRectangle(58, 46, 684, 514, panelFill, 0.97)
      .setOrigin(0)
      .setStrokeStyle(2, panelStroke, 0.9);
    this.addPanelText(86, 72, "System / Rest", 24, uiTheme.text.primary);
    this.addPanelText(86, 108, `Music ${Math.round(settings.musicVolume * 100)}%  ·  SFX ${Math.round(settings.sfxVolume * 100)}%  ·  UI ${Math.round(settings.uiScale * 100)}%  ·  VFX ${settings.visualEffectsIntensity}  ·  ${settings.difficulty}`, 10, uiTheme.text.accent, 560);
    this.addPanelButton(86, 128, 104, 30, "Save", () => this.context.saveGame());
    this.addPanelButton(198, 128, 112, 30, "Controls", () => this.context.showTooltip(["Controls", "WASD / click: move", "1-8: use hotbar", "I C P K: character windows", "Esc: close / system"], 320, 150));
    this.addPanelButton(318, 128, 150, 30, "Return to Title", () => { this.returnToTitlePending = true; this.context.rerender(); });
    this.addPanelText(86, 160, "Audio", 15, uiTheme.text.muted);
    this.addPanelButton(86, 172, 116, 30, `Music ${Math.round(settings.musicVolume * 100)}%`, () => this.changeMusicVolume());
    this.addPanelButton(214, 172, 116, 30, `SFX ${Math.round(settings.sfxVolume * 100)}%`, () => this.changeSfxVolume());
    this.addPanelButton(342, 172, 116, 30, `M ${settings.musicMuted ? "Off" : "On"}`, () => this.toggleMusicSetting());
    this.addPanelButton(470, 172, 116, 30, `S ${settings.sfxMuted ? "Off" : "On"}`, () => this.toggleSfxSetting());

    this.addPanelText(86, 224, "Accessibility", 15, uiTheme.text.muted);
    this.addPanelButton(86, 252, 124, 30, `UI ${Math.round(settings.uiScale * 100)}%`, () => this.changeUiScale());
    this.addPanelButton(222, 252, 148, 30, `Damage ${settings.damageNumbersEnabled ? "On" : "Off"}`, () => this.toggleDamageNumberSetting());
    this.addPanelButton(382, 252, 124, 30, `Shake ${settings.screenShakeEnabled ? "On" : "Off"}`, () => this.toggleScreenShakeSetting());
    this.addPanelButton(518, 252, 124, 30, `Flash ${Math.round(settings.flashIntensity * 100)}%`, () => this.changeFlashIntensity());
    this.addPanelButton(518, 296, 124, 30, `VFX ${settings.visualEffectsIntensity === "full" ? "Full" : "Reduced"}`, () => this.toggleVfxIntensity());
    this.addPanelText(86, 326, "Rarity labels, status icons, element labels, and warning text stay visible.", 13, uiTheme.text.secondary);

    this.addPanelText(86, 342, "Gameplay", 15, uiTheme.text.muted);
    this.addPanelButton(86, 370, 148, 30, `Potion ${settings.autoPotionEnabled ? "On" : "Off"}`, () => this.toggleAutoPotionSetting());
    this.addPanelButton(246, 370, 148, 30, settings.difficulty, () => this.changeDifficulty());
    this.addPanelButton(406, 370, 148, 30, `Text ${settings.textSpeed.toFixed(2)}x`, () => this.changeTextSpeed());
    this.addPanelText(
      86,
      414,
      `Difficulty ${settings.difficulty}: enemy HP x${preset.enemyHpMultiplier} damage x${preset.enemyDamageMultiplier} mitigation x${preset.playerMitigationMultiplier}`,
      13,
      uiTheme.text.positive,
      560,
    );
    this.addPanelButton(510, 506, 92, 30, "Close", () => this.context.closePanel());
    if (this.returnToTitlePending) this.renderReturnToTitleConfirmation();
    this.syncSettingsDataset(state);
  }

private addPanelRectangle(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    alpha: number,
  ): Phaser.GameObjects.Rectangle {
    return addPanelRectanglePrimitive(this.context, x, y, width, height, color, alpha);
  }

private addPanelText(x: number, y: number, text: string, fontSize: number, color: string, wrapWidth?: number): Phaser.GameObjects.Text {
    return addPanelTextPrimitive(this.context, x, y, text, fontSize, color, wrapWidth);
  }

private addPanelButton(x: number, y: number, width: number, height: number, label: string, callback: () => void): void {
    addPanelButtonPrimitive(this.context, x, y, width, height, label, callback);
  }

private changeMusicVolume(): void {
    if (!this.context.state) {
      return;
    }

    applySettingsPatch(this.context.state, { musicVolume: this.context.state.settings.musicVolume >= 1 ? 0 : this.context.state.settings.musicVolume + 0.1 });
    audioManager.adjustMusicVolume(0);
  }

private changeSfxVolume(): void {
    if (!this.context.state) {
      return;
    }

    applySettingsPatch(this.context.state, { sfxVolume: this.context.state.settings.sfxVolume >= 1 ? 0 : this.context.state.settings.sfxVolume + 0.1 });
    audioManager.adjustSfxVolume(0);
  }

private toggleMusicSetting(): void {
    if (!this.context.state) {
      return;
    }

    audioManager.toggleMusicMute();
    eventBus.emit("settingsChanged", { settings: this.context.state.settings });
  }

private toggleSfxSetting(): void {
    if (!this.context.state) {
      return;
    }

    audioManager.toggleSfxMute();
    eventBus.emit("settingsChanged", { settings: this.context.state.settings });
  }

private changeUiScale(): void {
    if (this.context.state) {
      cycleUiScale(this.context.state);
    }
  }

private toggleDamageNumberSetting(): void {
    if (this.context.state) {
      applySettingsPatch(this.context.state, { damageNumbersEnabled: !this.context.state.settings.damageNumbersEnabled });
    }
  }

private toggleScreenShakeSetting(): void {
    if (this.context.state) {
      applySettingsPatch(this.context.state, { screenShakeEnabled: !this.context.state.settings.screenShakeEnabled });
    }
  }

private changeFlashIntensity(): void {
    if (this.context.state) {
      adjustFlashIntensity(this.context.state, this.context.state.settings.flashIntensity >= 1 ? -1 : 0.25);
    }
  }

  private toggleAutoPotionSetting(): void {
    if (this.context.state) {
      applySettingsPatch(this.context.state, { autoPotionEnabled: !this.context.state.settings.autoPotionEnabled });
    }
  }

private toggleVfxIntensity(): void {
    if (this.context.state) {
      applySettingsPatch(this.context.state, { visualEffectsIntensity: this.context.state.settings.visualEffectsIntensity === "full" ? "reduced" : "full" });
    }
  }

private changeDifficulty(): void {
    if (this.context.state) {
      cycleDifficulty(this.context.state);
    }
  }

private changeTextSpeed(): void {
    if (this.context.state) {
      adjustTextSpeed(this.context.state, this.context.state.settings.textSpeed >= 2 ? -1.5 : 0.25);
    }
  }

private syncSettingsDataset(state: GameState): void {
    const settings = state.settings;

    this.context.debug?.set("settingsPanel", this.id === "settings" ? "visible" : "hidden");
    this.context.debug?.set("settingsSummary", getSettingsSummary(settings));
    this.context.debug?.set("settingsDifficulty", settings.difficulty);
    this.context.debug?.set("settingsUiScale", String(settings.uiScale));
    this.context.debug?.set("settingsMusicVolume", settings.musicVolume.toFixed(1));
    this.context.debug?.set("settingsSfxVolume", settings.sfxVolume.toFixed(1));
    this.context.debug?.set("settingsMusicMuted", String(settings.musicMuted));
    this.context.debug?.set("settingsSfxMuted", String(settings.sfxMuted));
    this.context.debug?.set("settingsVfxIntensity", settings.visualEffectsIntensity);
    this.context.debug?.set("settingsDamageNumbers", String(settings.damageNumbersEnabled));
    this.context.debug?.set("settingsScreenShake", String(settings.screenShakeEnabled));
    this.context.debug?.set("settingsFlashIntensity", settings.flashIntensity.toFixed(2));
    this.context.debug?.set("settingsAutoPotion", String(settings.autoPotionEnabled));
    this.context.debug?.set("settingsTextSpeed", settings.textSpeed.toFixed(2));
    this.context.debug?.set("settingsButtons", "Save|Controls|Return to Title|Music|SFX|MusicMute|SfxMute|UI|Damage|Shake|Flash|VFX|Potion|Difficulty|Text|Close");
    this.context.debug?.set("settingsReturnToTitleConfirmation", this.returnToTitlePending ? "visible" : "hidden");
    this.context.debug?.set("rarityReadableMode", "color+label");
    this.context.debug?.set("elementReadableMode", "label+icon");
    this.context.debug?.set("warningReadableMode", "shape+text");
    this.context.debug?.set("uiContrast", "acceptable");
  }

  private renderReturnToTitleConfirmation(): void {
    this.addPanelRectangle(190, 190, 390, 170, uiTheme.colors.background, 0.99).setOrigin(0).setStrokeStyle(2, uiTheme.colors.accent, 1);
    this.addPanelText(220, 218, "Return to title?", 20, uiTheme.text.primary);
    this.addPanelText(220, 252, "Your adventure will be saved before leaving.", 13, uiTheme.text.onDark, 300);
    this.addPanelButton(220, 304, 120, 30, "Save & Leave", () => this.context.requestReturnToTitle());
    this.addPanelButton(356, 304, 120, 30, "Cancel", () => { this.returnToTitlePending = false; this.context.rerender(); });
  }
}
