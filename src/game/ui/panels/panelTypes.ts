import type Phaser from "phaser";
import type { UIContext } from "../UIContext";
import type { UIDebugAdapter } from "../debug/UIDebugAdapter";
import type { PanelPrimitiveContext } from "./panelPrimitives";

export type PanelId =
  | "inventory"
  | "equipment"
  | "character"
  | "skills"
  | "bestiary"
  | "crafting"
  | "refinement"
  | "shop"
  | "appraiser"
  | "storage"
  | "huntingBoard"
  | "questLog"
  | "worldMap"
  | "settings";

export interface UIPanel {
  readonly id: PanelId;
  open?(payload?: unknown): void;
  render(): void;
  refresh?(): void;
  handleKey?(event: KeyboardEvent): boolean;
  close?(): void;
  destroy(): void;
}

export interface PanelContext extends UIContext, PanelPrimitiveContext {
  debug: UIDebugAdapter;
  comparisonObjects: Phaser.GameObjects.GameObject[];
  rerender(): void;
  closePanel(): void;
  showTooltip(lines: string[], x: number, y: number): void;
  clearTooltip(): void;
  showComparison(item: import("../../types/dataDefinitions").ItemDefinition): void;
  clearComparison(): void;
  getInventoryWeight(): number;
  getWeightLimit(): number;
  syncSupport(): void;
  syncSkill(): void;
  syncEquipment(): void;
}
