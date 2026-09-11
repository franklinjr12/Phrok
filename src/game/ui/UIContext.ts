import type Phaser from "phaser";
import type { DataRegistry } from "../data/dataRegistry";
import type { GameState } from "../types/gameState";

/** Shared resources available to UI runtime modules. */
export interface UIContext {
  scene: Phaser.Scene;
  state: GameState;
  data: DataRegistry;
  canvas: HTMLCanvasElement;
}
