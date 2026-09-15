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
  | "settings"
  | "rewardChoice"
  | "milestone";

export interface WindowDescriptor {
  modal: boolean;
  draggable: boolean;
  closable: boolean;
  blocksGameplay: boolean;
  fixed: boolean;
}

export interface UIPanel {
  readonly id: PanelId;
  /** Window behavior overrides. Panels are singleton, ordinary windows by default. */
  readonly window?: Partial<WindowDescriptor>;
  open?(payload?: unknown): void;
  render(): void;
  refresh?(): void;
  handleKey?(event: KeyboardEvent): boolean;
  close?(): void;
  destroy(): void;
}

/** Commands exposed to panels. Implementations belong to the UI host, not a panel. */
export interface PanelActions {
  rerender(): void;
  closePanel(): void;
  showTooltip(lines: string[], x: number, y: number): void;
  clearTooltip(): void;
  showComparison(item: import("../../types/dataDefinitions").ItemDefinition): void;
  clearComparison(): void;
  saveGame(): void;
  requestReturnToTitle(): void;
}

/** Stable boundary shared by all panel implementations. */
export interface PanelContext extends UIContext, PanelPrimitiveContext, PanelActions {
  /** Diagnostics sink; never use it as UI state. */
  debug: UIDebugAdapter;
}
