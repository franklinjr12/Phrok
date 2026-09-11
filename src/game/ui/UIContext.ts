import type Phaser from "phaser";
import type { DataRegistry } from "../data/dataRegistry";
import type { GameState } from "../types/gameState";

/** Shared read-only resource boundary available to UI runtime modules. */
export interface UIContext {
  readonly scene: Phaser.Scene;
  readonly state: GameState;
  readonly data: DataRegistry;
  readonly canvas: HTMLCanvasElement;
}
