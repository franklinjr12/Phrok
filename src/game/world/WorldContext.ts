import type Phaser from "phaser";
import type { DataRegistry } from "../data/dataRegistry";
import type { GameState } from "../types/gameState";

/** Shared world resources. Feature controllers should receive extra runtime dependencies explicitly. */
export interface WorldContext {
  scene: Phaser.Scene;
  state: GameState;
  data: DataRegistry;
  canvas: HTMLCanvasElement;
}
