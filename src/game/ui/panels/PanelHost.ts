import type { UIPanel, PanelContext, PanelId } from "./panelTypes";

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
};

export interface PanelHostOptions {
  context: PanelContext;
  clearObjects(): void;
  addBackdrop(): void;
  resetDatasets(): void;
}

/** Owns modal panel lifecycle and delegates feature behavior to registered panels. */
export class PanelHost {
  private activeId: PanelId | null = null;

  constructor(private readonly options: PanelHostOptions, private readonly panels: ReadonlyMap<PanelId, UIPanel>) {}

  get activePanel(): PanelId | null {
    return this.activeId;
  }

  open(id: PanelId, payload?: unknown): void {
    if (this.activeId !== null) this.panels.get(this.activeId)?.close?.();
    this.activeId = id;
    this.options.context.debug.setActivePanel(id);
    this.options.context.debug.setGameplayInputBlocked(true);
    this.options.resetDatasets();
    this.options.clearObjects();
    this.options.addBackdrop();
    this.options.context.debug.set(panelDatasetKeys[id], "visible");
    const panel = this.panels.get(id);
    panel?.open?.(payload);
    panel?.render();
  }

  close(): void {
    if (this.activeId !== null) this.panels.get(this.activeId)?.close?.();
    this.activeId = null;
    this.options.clearObjects();
    this.options.context.debug.setActivePanel(null);
    this.options.context.debug.setGameplayInputBlocked(false);
    this.options.context.debug.set("itemComparison", "hidden");
    this.options.resetDatasets();
  }

  refresh(): void {
    if (this.activeId === null) return;
    this.options.clearObjects();
    this.options.addBackdrop();
    this.options.context.debug.set(panelDatasetKeys[this.activeId], "visible");
    this.panels.get(this.activeId)?.refresh?.();
    this.panels.get(this.activeId)?.render();
  }

  handleKey(event: KeyboardEvent): boolean {
    return this.activeId !== null ? this.panels.get(this.activeId)?.handleKey?.(event) ?? false : false;
  }

  destroy(): void {
    for (const panel of this.panels.values()) panel.destroy();
    this.activeId = null;
  }
}
