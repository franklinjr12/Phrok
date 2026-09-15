import type Phaser from "phaser";
import { panelDepth } from "../uiTheme";
import type { UIPanel, PanelContext, PanelId, WindowDescriptor } from "./panelTypes";

const panelDatasetKeys: Record<PanelId, string> = {
  inventory: "inventoryPanel",
  equipment: "equipmentPanel",
  character: "characterPanel",
  skills: "skillPanel",
  bestiary: "bestiaryPanel",
  crafting: "craftingPanel",
  refinement: "refinementPanel",
  shop: "shopPanel",
  appraiser: "appraiserPanel",
  storage: "storagePanel",
  huntingBoard: "huntingBoardPanel",
  questLog: "questLogPanel",
  worldMap: "worldMapPanel",
  settings: "settingsPanel",
  rewardChoice: "rewardChoicePanel",
  milestone: "milestonePanel",
};

export interface PanelHostOptions {
  context: PanelContext;
  addBackdrop(): void;
  onWindowsChanged?(topmost: PanelId | null): void;
  onInputOwnerChanged?(owner: "world" | "ordinary-window" | "modal"): void;
}

type WindowState = {
  descriptor: WindowDescriptor;
  objects: Phaser.GameObjects.GameObject[];
  payload?: unknown;
  x: number;
  y: number;
};

const ordinaryWindow: WindowDescriptor = {
  modal: false,
  draggable: true,
  closable: true,
  blocksGameplay: false,
  fixed: false,
};

const modalPanelIds = new Set<PanelId>(["shop", "appraiser", "storage", "crafting", "refinement", "rewardChoice", "milestone"]);

/** Owns independent panel windows, their display objects, focus, drag and lifecycle. */
export class PanelHost {
  private readonly windows = new Map<PanelId, WindowState>();
  private readonly positions = new Map<PanelId, { x: number; y: number }>();
  private zOrder: PanelId[] = [];

  constructor(private readonly options: PanelHostOptions, private readonly panels: ReadonlyMap<PanelId, UIPanel>) {}

  get activePanel(): PanelId | null {
    return this.zOrder.at(-1) ?? null;
  }

  get openPanels(): readonly PanelId[] { return this.zOrder; }

  get hasOpenWindows(): boolean { return this.zOrder.length > 0; }

  isOpen(id: PanelId): boolean { return this.windows.has(id); }

  /** True when a screen-space pointer is over any open window, including its header. */
  capturesPointer(pointer: Phaser.Input.Pointer): boolean {
    return this.zOrder.some((id) => this.windows.get(id)?.objects.some((object) => {
      const bounds = (object as Phaser.GameObjects.GameObject & { getBounds?: () => Phaser.Geom.Rectangle }).getBounds?.();
      return bounds?.contains(pointer.x, pointer.y) ?? false;
    }));
  }

  open(id: PanelId, payload?: unknown): void {
    const panel = this.panels.get(id);
    if (!panel) return;
    if (this.windows.has(id)) { this.bringToFront(id); return; }
    const descriptor = {
      ...ordinaryWindow,
      ...(modalPanelIds.has(id) ? { modal: true, blocksGameplay: true } : {}),
      ...panel.window,
    };
    if (!descriptor.modal && this.zOrder.some((windowId) => this.windows.get(windowId)?.descriptor.modal)) return;
    if (descriptor.modal) this.closeModals();
    const position = this.positions.get(id) ?? { x: this.zOrder.length * 24, y: this.zOrder.length * 20 };
    const state: WindowState = { descriptor, objects: [], payload, ...position };
    this.windows.set(id, state);
    this.zOrder.push(id);
    panel?.open?.(payload);
    this.renderWindow(id, true);
    this.syncState();
  }

  close(id: PanelId | null = this.activePanel): void {
    if (!id || !this.windows.has(id)) return;
    this.options.context.clearComparison();
    this.options.context.clearTooltip();
    this.panels.get(id)?.close?.();
    this.destroyWindowObjects(id);
    this.windows.delete(id);
    this.zOrder = this.zOrder.filter((windowId) => windowId !== id);
    this.options.context.debug.set(panelDatasetKeys[id], "hidden");
    this.options.context.debug.set("itemComparison", "hidden");
    this.syncState();
  }

  refresh(id?: PanelId): void {
    const targets = id ? [id] : [...this.zOrder];
    for (const windowId of targets) {
      if (!this.windows.has(windowId)) continue;
      this.panels.get(windowId)?.refresh?.();
      this.renderWindow(windowId, false);
    }
    this.syncState();
  }

  handleKey(event: KeyboardEvent): boolean {
    const id = this.activePanel;
    return id !== null ? this.panels.get(id)?.handleKey?.(event) ?? false : false;
  }

  closeTopmostClosable(): boolean {
    const id = [...this.zOrder].reverse().find((candidate) => {
      const descriptor = this.windows.get(candidate)?.descriptor;
      return descriptor?.closable && !descriptor.modal;
    });
    if (!id) return false;
    this.close(id);
    return true;
  }

  bringToFront(id: PanelId): void {
    if (!this.windows.has(id)) return;
    this.zOrder = this.zOrder.filter((windowId) => windowId !== id);
    this.zOrder.push(id);
    this.applyDepths();
    this.syncState();
  }

  destroy(): void {
    for (const id of [...this.zOrder]) this.destroyWindowObjects(id);
    for (const panel of this.panels.values()) panel.destroy();
    this.windows.clear();
    this.zOrder = [];
  }

  private renderWindow(id: PanelId, firstRender: boolean): void {
    const state = this.windows.get(id);
    const panel = this.panels.get(id);
    if (!state || !panel) return;
    this.destroyWindowObjects(id);
    const sharedObjects = this.options.context.objects;
    const start = sharedObjects.length;
    if (state.descriptor.modal) this.options.addBackdrop();
    panel.render();
    state.objects = sharedObjects.slice(start);
    if (state.x || state.y) this.moveObjects(state.objects, state.x, state.y);
    this.installWindowInteractions(id, firstRender);
    this.applyDepths();
  }

  private installWindowInteractions(id: PanelId, firstRender: boolean): void {
    const state = this.windows.get(id);
    if (!state) return;
    const frame = state.objects.find((object) => object.getData?.("windowFrame")) as Phaser.GameObjects.Rectangle | undefined;
    if (!frame) return;
    frame.setInteractive();
    frame.on("pointerdown", () => this.bringToFront(id));
    for (const object of state.objects) {
      const interactive = object as Phaser.GameObjects.GameObject & { input?: unknown; on(event: string, listener: () => void): unknown };
      if (interactive !== frame && interactive.input) interactive.on("pointerdown", () => this.bringToFront(id));
    }
    if (state.descriptor.fixed || !state.descriptor.draggable) return;
    const header = state.objects.find((object) => object !== frame && object.type === "Rectangle" && Math.abs((object as Phaser.GameObjects.Rectangle).y - frame.y) < 1);
    if (!header) return;
    const draggable = header as Phaser.GameObjects.Rectangle;
    draggable.setInteractive({ useHandCursor: true });
    draggable.on("pointerdown", () => this.bringToFront(id));
    this.options.context.scene.input.setDraggable(draggable);
    draggable.on("dragstart", () => this.bringToFront(id));
    draggable.on("drag", (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      const dx = dragX - draggable.x;
      const dy = dragY - draggable.y;
      this.moveObjects(state.objects, dx, dy);
      state.x += dx;
      state.y += dy;
    });
    draggable.on("dragend", () => this.clampWindow(id));
    if (firstRender) this.clampWindow(id);
  }

  private clampWindow(id: PanelId): void {
    const state = this.windows.get(id);
    const frame = state?.objects.find((object) => object.getData?.("windowFrame")) as Phaser.GameObjects.Rectangle | undefined;
    if (!state || !frame) return;
    const width = frame.displayWidth;
    const height = frame.displayHeight;
    const left = frame.x - frame.displayOriginX;
    const top = frame.y - frame.displayOriginY;
    const viewportWidth = this.options.context.scene.scale.width;
    const viewportHeight = this.options.context.scene.scale.height;
    const dx = Math.min(Math.max(0, left), Math.max(0, viewportWidth - width)) - left;
    const dy = Math.min(Math.max(0, top), Math.max(0, viewportHeight - height)) - top;
    this.moveObjects(state.objects, dx, dy);
    state.x += dx;
    state.y += dy;
    this.positions.set(id, { x: state.x, y: state.y });
  }

  private moveObjects(objects: Phaser.GameObjects.GameObject[], dx: number, dy: number): void {
    for (const object of objects) {
      const positioned = object as Phaser.GameObjects.GameObject & { x?: number; y?: number };
      if (typeof positioned.x === "number") positioned.x += dx;
      if (typeof positioned.y === "number") positioned.y += dy;
    }
  }

  private applyDepths(): void {
    this.zOrder.forEach((id, index) => {
      for (const object of this.windows.get(id)?.objects ?? []) {
        const layered = object as Phaser.GameObjects.GameObject & { depth?: number; setDepth(depth: number): unknown };
        const savedDepth = object.getData?.("panelBaseDepth") as number | undefined;
        const baseDepth = savedDepth ?? layered.depth ?? panelDepth;
        if (savedDepth === undefined) object.setData?.("panelBaseDepth", baseDepth);
        layered.setDepth(panelDepth + index * 10 + Math.max(-1, Math.min(5, baseDepth - panelDepth)));
      }
    });
  }

  private destroyWindowObjects(id: PanelId): void {
    const state = this.windows.get(id);
    if (!state) return;
    const owned = new Set(state.objects);
    for (const object of owned) object.destroy();
    const shared = this.options.context.objects;
    const remaining = shared.filter((object) => !owned.has(object));
    shared.splice(0, shared.length, ...remaining);
    state.objects = [];
  }

  private closeModals(): void {
    for (const id of [...this.zOrder]) if (this.windows.get(id)?.descriptor.modal) this.close(id);
  }

  private syncState(): void {
    for (const id of this.zOrder) this.options.context.debug.set(panelDatasetKeys[id], "visible");
    const topmost = this.activePanel;
    this.options.context.debug.setActivePanel(topmost);
    const blocked = this.zOrder.some((id) => this.windows.get(id)?.descriptor.blocksGameplay);
    this.options.context.debug.setGameplayInputBlocked(blocked);
    const viewportWidth = this.options.context.scene.scale.width;
    const viewportHeight = this.options.context.scene.scale.height;
    this.options.context.debug.setWindowLayoutSnapshot(this.zOrder.flatMap((id) => {
      const frame = this.windows.get(id)?.objects.find((object) => object.getData?.("windowFrame")) as
        | (Phaser.GameObjects.Rectangle & { getBounds?: () => Phaser.Geom.Rectangle })
        | undefined;
      const bounds = frame?.getBounds?.();
      if (!bounds) return [];
      return [{
        id,
        x: Math.round(bounds.x),
        y: Math.round(bounds.y),
        width: Math.round(bounds.width),
        height: Math.round(bounds.height),
        overflow: bounds.x < 0 || bounds.y < 0
          || bounds.right > viewportWidth || bounds.bottom > viewportHeight,
      }];
    }));
    this.options.onWindowsChanged?.(topmost);
    this.options.onInputOwnerChanged?.(blocked ? "modal" : topmost ? "ordinary-window" : "world");
  }
}
