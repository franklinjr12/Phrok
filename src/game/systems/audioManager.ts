import type { GameState } from "../types/gameState";
import { eventBus } from "./eventBus";

export const placeholderMusicKeys = [
  "music-boss",
  "music-crownfield-town",
  "music-crownfield-meadows",
  "music-crownfield-field",
  "music-mossvale-hub",
  "music-mossvale-field",
  "music-amber-dunes-hub",
  "music-amber-dunes-field",
  "music-blueharbor-hub",
  "music-blueharbor-field",
  "music-ironroot-hub",
  "music-ironroot-field",
  "music-moonveil-hub",
  "music-moonveil-field",
  "music-starfall-field",
  "music-old-sewers-dungeon",
  "music-green-chapel-dungeon",
  "music-tide-cave-dungeon",
  "music-ironroot-mine-dungeon",
  "music-buried-sun-dungeon",
  "music-cursed-bell-dungeon",
  "music-starfall-tower-dungeon",
  "music-fallen-observatory-dungeon",
] as const;

export const placeholderSfxKeys = [
  "ui-click",
  "attack",
  "hit",
  "skill-cast",
  "pickup",
  "gold",
  "level-up",
  "equip",
  "refine-success",
  "refine-failure",
  "boss-spawn",
  "rare-drop",
] as const;

export type PlaceholderSfxKey = (typeof placeholderSfxKeys)[number];

type AudioContextConstructor = new () => AudioContext;

const musicKeySet = new Set<string>(placeholderMusicKeys);
const sfxKeySet = new Set<string>(placeholderSfxKeys);
const volumeStep = 0.1;

class AudioManager {
  private state?: GameState;
  private canvas?: HTMLCanvasElement;
  private audioContext?: AudioContext;
  private musicOscillator?: OscillatorNode;
  private musicGain?: GainNode;
  private ambientMusicKey = "";
  private currentMusicKey = "";
  private unsubscribers: Array<() => void> = [];

  initialize(state: GameState, canvas: HTMLCanvasElement): void {
    this.state = state;
    this.canvas = canvas;
    this.syncDataset();

    if (this.unsubscribers.length === 0) {
      this.registerEvents();
    }
  }

  destroy(): void {
    this.stopMusic();
    for (const unsubscribe of this.unsubscribers) {
      unsubscribe();
    }
    this.unsubscribers = [];
    this.state = undefined;
    this.canvas = undefined;
  }

  playMusic(musicKey: string): void {
    if (!this.state || !this.canvas) {
      return;
    }

    const safeKey = musicKeySet.has(musicKey) ? musicKey : "music-crownfield-field";
    this.currentMusicKey = safeKey;
    this.canvas.dataset.currentMapMusicKey = safeKey;
    this.canvas.dataset.audioMusicKey = safeKey;
    this.canvas.dataset.audioMissingKey = musicKeySet.has(musicKey) ? "" : musicKey;
    this.syncDataset();

    if (this.state.settings.musicMuted || this.state.settings.musicVolume <= 0) {
      this.stopMusic();
      return;
    }

    const context = this.getAudioContext();
    if (!context) {
      return;
    }
    void context.resume();

    this.stopMusic();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = this.getMusicFrequency(safeKey);
    gain.gain.value = this.state.settings.musicVolume * 0.025;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    this.musicOscillator = oscillator;
    this.musicGain = gain;
  }

  playSfx(sfxKey: PlaceholderSfxKey): void {
    if (!this.state || !this.canvas) {
      return;
    }

    if (!sfxKeySet.has(sfxKey)) {
      this.canvas.dataset.audioMissingKey = sfxKey;
      return;
    }

    this.canvas.dataset.lastAudioSfx = sfxKey;
    this.canvas.dataset.audioMissingKey = "";
    this.syncDataset();

    if (this.state.settings.sfxMuted || this.state.settings.sfxVolume <= 0) {
      return;
    }

    const context = this.getAudioContext();
    if (!context) {
      return;
    }
    void context.resume();

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.value = this.getSfxFrequency(sfxKey);
    gain.gain.setValueAtTime(this.state.settings.sfxVolume * 0.08, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.16);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.17);
  }

  adjustMusicVolume(delta: number): void {
    if (!this.state) {
      return;
    }

    this.state.settings.musicVolume = clampVolume(this.state.settings.musicVolume + delta);
    if (this.musicGain) {
      this.musicGain.gain.value = this.state.settings.musicVolume * 0.025;
    }
    this.syncDataset();
  }

  adjustSfxVolume(delta: number): void {
    if (!this.state) {
      return;
    }

    this.state.settings.sfxVolume = clampVolume(this.state.settings.sfxVolume + delta);
    this.syncDataset();
  }

  toggleMusicMute(): void {
    if (!this.state) {
      return;
    }

    this.state.settings.musicMuted = !this.state.settings.musicMuted;
    if (this.currentMusicKey) {
      this.playMusic(this.currentMusicKey);
    }
    this.syncDataset();
  }

  toggleSfxMute(): void {
    if (!this.state) {
      return;
    }

    this.state.settings.sfxMuted = !this.state.settings.sfxMuted;
    this.syncDataset();
  }

  private registerEvents(): void {
    this.unsubscribers = [
      eventBus.on("mapChanged", ({ musicKey }) => {
        this.ambientMusicKey = musicKey;
        this.playMusic(musicKey);
      }),
      eventBus.on("enemyTargetChanged", ({ boss, enemyId }) => {
        if (boss && enemyId) {
          this.playSfx("boss-spawn");
          this.playMusic("music-boss");
          return;
        }

        if (!enemyId && this.ambientMusicKey) {
          this.playMusic(this.ambientMusicKey);
        }
      }),
      eventBus.on("enemyHealthChanged", () => this.playSfx("hit")),
      eventBus.on("enemyKilled", () => this.playSfx("attack")),
      eventBus.on("skillUsed", () => this.playSfx("skill-cast")),
      eventBus.on("lootPickedUp", ({ kind }) => this.playSfx(kind === "gold" ? "gold" : "pickup")),
      eventBus.on("levelUp", () => this.playSfx("level-up")),
      eventBus.on("equipmentChanged", () => this.playSfx("equip")),
      eventBus.on("refinementAttempted", ({ success }) => this.playSfx(success ? "refine-success" : "refine-failure")),
      eventBus.on("dialogueOpened", () => this.playSfx("ui-click")),
      eventBus.on("craftingOpened", () => this.playSfx("ui-click")),
      eventBus.on("shopOpened", () => this.playSfx("ui-click")),
      eventBus.on("storageOpened", () => this.playSfx("ui-click")),
    ];
  }

  private getAudioContext(): AudioContext | undefined {
    if (this.audioContext) {
      return this.audioContext;
    }

    const AudioCtor = window.AudioContext as AudioContextConstructor | undefined;
    if (!AudioCtor) {
      this.canvas!.dataset.audioContext = "unavailable";
      return undefined;
    }

    this.audioContext = new AudioCtor();
    this.canvas!.dataset.audioContext = "ready";
    return this.audioContext;
  }

  private stopMusic(): void {
    this.musicOscillator?.stop();
    this.musicOscillator?.disconnect();
    this.musicGain?.disconnect();
    this.musicOscillator = undefined;
    this.musicGain = undefined;
  }

  private syncDataset(): void {
    if (!this.state || !this.canvas) {
      return;
    }

    this.canvas.dataset.audioMusicVolume = this.state.settings.musicVolume.toFixed(1);
    this.canvas.dataset.audioSfxVolume = this.state.settings.sfxVolume.toFixed(1);
    this.canvas.dataset.audioMusicMuted = String(Boolean(this.state.settings.musicMuted));
    this.canvas.dataset.audioSfxMuted = String(Boolean(this.state.settings.sfxMuted));
    this.canvas.dataset.audioPlaceholderMusicCount = String(placeholderMusicKeys.length);
    this.canvas.dataset.audioPlaceholderSfx = placeholderSfxKeys.join("|");
  }

  private getMusicFrequency(musicKey: string): number {
    return 180 + (Math.abs(hashKey(musicKey)) % 90);
  }

  private getSfxFrequency(sfxKey: string): number {
    return 260 + (Math.abs(hashKey(sfxKey)) % 420);
  }
}

export const audioManager = new AudioManager();

export function clampVolume(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value / volumeStep) * volumeStep));
}

function hashKey(key: string): number {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = ((hash << 5) - hash) + key.charCodeAt(index);
    hash |= 0;
  }
  return hash;
}
