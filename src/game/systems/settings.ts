import type { GameState, SettingsState } from "../types/gameState";
import { clampVolume } from "./audioManager";
import { eventBus } from "./eventBus";

export const difficultyPresets = {
  Story: {
    enemyHpMultiplier: 0.75,
    enemyDamageMultiplier: 0.7,
    playerMitigationMultiplier: 0.85,
    potionGenerosityMultiplier: 1.35,
  },
  Normal: {
    enemyHpMultiplier: 1,
    enemyDamageMultiplier: 1,
    playerMitigationMultiplier: 1,
    potionGenerosityMultiplier: 1,
  },
  Veteran: {
    enemyHpMultiplier: 1.25,
    enemyDamageMultiplier: 1.2,
    playerMitigationMultiplier: 1.1,
    potionGenerosityMultiplier: 0.85,
  },
} as const satisfies Record<SettingsState["difficulty"], {
  enemyHpMultiplier: number;
  enemyDamageMultiplier: number;
  playerMitigationMultiplier: number;
  potionGenerosityMultiplier: number;
}>;

const uiScaleStep = 0.25;
const textSpeedStep = 0.25;
const flashStep = 0.25;

export function createDefaultSettings(): SettingsState {
  return {
    musicVolume: 0.8,
    sfxVolume: 0.8,
    musicMuted: false,
    sfxMuted: false,
    textSpeed: 1,
    damageNumbersEnabled: true,
    visualEffectsIntensity: "full",
    uiScale: 1,
    screenShakeEnabled: true,
    flashIntensity: 1,
    autoPotionEnabled: true,
    difficulty: "Normal",
  };
}

export function applySettingsPatch(state: GameState, patch: Partial<SettingsState>): void {
  state.settings = normalizeSettings({
    ...state.settings,
    ...patch,
  }, createDefaultSettings());
  eventBus.emit("settingsChanged", { settings: state.settings });
}

export function cycleDifficulty(state: GameState): SettingsState["difficulty"] {
  const order: SettingsState["difficulty"][] = ["Story", "Normal", "Veteran"];
  const index = order.indexOf(state.settings.difficulty);
  const difficulty = order[(index + 1) % order.length] ?? "Normal";
  applySettingsPatch(state, { difficulty });
  return difficulty;
}

export function cycleUiScale(state: GameState): number {
  const next = state.settings.uiScale >= 2 ? 1 : state.settings.uiScale + uiScaleStep;
  applySettingsPatch(state, { uiScale: next });
  return next;
}

export function adjustTextSpeed(state: GameState, delta: number): number {
  const textSpeed = clampStep(state.settings.textSpeed + delta, 0.5, 2, textSpeedStep);
  applySettingsPatch(state, { textSpeed });
  return textSpeed;
}

export function adjustFlashIntensity(state: GameState, delta: number): number {
  const flashIntensity = clampStep(state.settings.flashIntensity + delta, 0, 1, flashStep);
  applySettingsPatch(state, { flashIntensity });
  return flashIntensity;
}

export function normalizeSettings(rawSettings: unknown, fallback: SettingsState = createDefaultSettings()): SettingsState {
  const source = isRecord(rawSettings) ? rawSettings : {};
  const difficulty = source.difficulty === "Story" || source.difficulty === "Veteran" || source.difficulty === "Normal"
    ? source.difficulty
    : fallback.difficulty;

  return {
    musicVolume: clampVolume(numberValue(source.musicVolume, fallback.musicVolume)),
    sfxVolume: clampVolume(numberValue(source.sfxVolume, fallback.sfxVolume)),
    musicMuted: typeof source.musicMuted === "boolean" ? source.musicMuted : fallback.musicMuted,
    sfxMuted: typeof source.sfxMuted === "boolean" ? source.sfxMuted : fallback.sfxMuted,
    textSpeed: clampStep(numberValue(source.textSpeed, fallback.textSpeed), 0.5, 2, textSpeedStep),
    damageNumbersEnabled: typeof source.damageNumbersEnabled === "boolean"
      ? source.damageNumbersEnabled
      : fallback.damageNumbersEnabled,
    visualEffectsIntensity: source.visualEffectsIntensity === "reduced" ? "reduced" : fallback.visualEffectsIntensity,
    uiScale: clampStep(numberValue(source.uiScale, fallback.uiScale), 1, 2, uiScaleStep),
    screenShakeEnabled: typeof source.screenShakeEnabled === "boolean" ? source.screenShakeEnabled : fallback.screenShakeEnabled,
    flashIntensity: clampStep(numberValue(source.flashIntensity, fallback.flashIntensity), 0, 1, flashStep),
    autoPotionEnabled: typeof source.autoPotionEnabled === "boolean" ? source.autoPotionEnabled : fallback.autoPotionEnabled,
    difficulty,
  };
}

export function getSettingsSummary(settings: SettingsState): string {
  return [
    `music:${settings.musicVolume.toFixed(1)}`,
    `sfx:${settings.sfxVolume.toFixed(1)}`,
    `ui:${Math.round(settings.uiScale * 100)}`,
    `damage:${settings.damageNumbersEnabled}`,
    `shake:${settings.screenShakeEnabled}`,
    `flash:${settings.flashIntensity.toFixed(2)}`,
    `autoPotion:${settings.autoPotionEnabled}`,
    `difficulty:${settings.difficulty}`,
    `text:${settings.textSpeed.toFixed(2)}`,
  ].join("|");
}

export function getReadableSettingsSummary(settings: SettingsState): string {
  return [
    `Music ${Math.round(settings.musicVolume * 100)}%${settings.musicMuted ? " muted" : ""}`,
    `SFX ${Math.round(settings.sfxVolume * 100)}%${settings.sfxMuted ? " muted" : ""}`,
    `UI ${Math.round(settings.uiScale * 100)}%`,
    `Damage ${settings.damageNumbersEnabled ? "on" : "off"}`,
    `Shake ${settings.screenShakeEnabled ? "on" : "off"}`,
    `Flash ${Math.round(settings.flashIntensity * 100)}%`,
    `Auto-potion ${settings.autoPotionEnabled ? "on" : "off"}`,
    `Difficulty ${settings.difficulty}`,
    `Text ${settings.textSpeed.toFixed(2)}x`,
  ].join("  |  ");
}

function clampStep(value: number, min: number, max: number, step: number): number {
  const stepped = Math.round(value / step) * step;
  return Math.max(min, Math.min(max, Number(stepped.toFixed(2))));
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
