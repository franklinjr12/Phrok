export type WorldDebugValue = string | number | boolean | null | undefined;

/** Semantic boundary for world canvas diagnostics; dataset keys remain backward-compatible. */
export class WorldDebugAdapter {
  constructor(private readonly canvas: HTMLCanvasElement) {}

  set(key: string, value: WorldDebugValue): void {
    this.canvas.dataset[key] = value === null || value === undefined ? "" : String(value);
  }

  setPlayerSnapshot(snapshot: Record<string, WorldDebugValue>): void {
    for (const [key, value] of Object.entries(snapshot)) this.set(key, value);
  }

  setEnemySnapshot(snapshot: Record<string, WorldDebugValue>): void {
    for (const [key, value] of Object.entries(snapshot)) this.set(key, value);
  }

  setBossSnapshot(snapshot: Record<string, WorldDebugValue>): void {
    for (const [key, value] of Object.entries(snapshot)) this.set(key, value);
  }

  setMovementResult(snapshot: Record<string, WorldDebugValue>): void {
    for (const [key, value] of Object.entries(snapshot)) this.set(key, value);
  }
}
