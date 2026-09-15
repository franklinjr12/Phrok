import { isDemoBlockedRegion } from "../../../systems/demoMode";
import type { DataRegistry } from "../../../data/dataRegistry";
import type { GameState } from "../../../types/gameState";
import { uiTheme } from "../../uiTheme";
import type { PanelContext, UIPanel } from "../../panels/panelTypes";
import { addPanelButton as addPanelButtonPrimitive, addPanelRectangle as addPanelRectanglePrimitive, addPanelText as addPanelTextPrimitive } from "../../panels/panelPrimitives";
const { panelDepth, hudDepth, panelFill, panelStroke } = uiTheme;
export class WorldMapPanel implements UIPanel {
 readonly id = "worldMap" as const;
 constructor(private readonly context: PanelContext) {}
 
 render(): void { this.renderWorldMapPanel(this.context.state, this.context.data); }
 destroy(): void {}
 
private renderWorldMapPanel(state: GameState, dataRegistry: DataRegistry): void {
    const currentMap = dataRegistry.getMap(state.currentMapId);
    const currentRegion = dataRegistry.getRegion(currentMap.regionId);
    const maps = dataRegistry.getMaps();
    const discoveredMaps = this.getDiscoveredMaps(state, dataRegistry);
    const fastTravelMaps = maps.filter((map) => map.type === "town" && discoveredMaps.some((entry) => entry.id === map.id));

    this.addPanelRectangle(58, 46, 684, 514, panelFill, 0.97)
      .setOrigin(0)
      .setStrokeStyle(2, panelStroke, 0.9);
    this.addPanelText(86, 72, "World Map", 24, uiTheme.text.primary);
    this.addPanelText(86, 108, `${currentRegion.name} | Current ${currentMap.name}`, 14, uiTheme.text.accent);

    dataRegistry.getRegions().slice(0, 7).forEach((region, index) => {
      const x = 96 + (index % 4) * 150;
      const y = 152 + Math.floor(index / 4) * 126;
      const isCurrent = region.id === currentRegion.id;
      const regionMaps = maps.filter((map) => map.regionId === region.id);
      const discoveredCount = regionMaps.filter((map) => discoveredMaps.some((entry) => entry.id === map.id)).length;
      const blocked = isDemoBlockedRegion(region.id);
      const box = this.addPanelRectangle(x, y, 128, 88, isCurrent ? uiTheme.colors.selected : uiTheme.colors.inset, 0.95)
        .setOrigin(0)
        .setStrokeStyle(2, isCurrent ? uiTheme.colors.accent : blocked ? 0x64748b : uiTheme.colors.border, 0.9)
        .setInteractive({ useHandCursor: true });
      box.on("pointerover", () => this.context.showTooltip(
        [region.name, region.description, `Lv ${region.levelRange.min}-${region.levelRange.max}`, blocked ? "Available beyond the demo" : `${discoveredCount}/${regionMaps.length} maps`, ...regionMaps.slice(0, 3).map((map) => `${map.name} · ${map.type}`)],
        x + 14,
        y - 74,
      ));
      box.on("pointerout", () => this.context.clearTooltip());
      this.addPanelText(x + 12, y + 12, this.truncateText(region.name, 14), 14, uiTheme.text.primary);
      this.addPanelText(x + 12, y + 38, `Lv ${region.levelRange.min}-${region.levelRange.max}`, 12, uiTheme.text.info);
      this.addPanelText(x + 12, y + 62, blocked ? "Beyond demo" : isCurrent ? "Current" : discoveredCount === 0 ? "Uncharted" : `Maps ${discoveredCount}`, 12, isCurrent ? uiTheme.text.accent : uiTheme.text.secondary);
    });

    this.addPanelRectangle(86, 420, 400, 92, uiTheme.colors.inset, 0.95)
      .setOrigin(0)
      .setStrokeStyle(1, uiTheme.colors.border, 0.9);
    this.addPanelText(104, 438, "Discovered", 14, uiTheme.text.muted);
    this.addPanelText(104, 464, this.wrapText(discoveredMaps.map((map) => `${map.name} · ${map.type} · Lv ${map.levelRange.min}-${map.levelRange.max} · ${this.getTravelLabel(map, state, discoveredMaps)}`).join(" | "), 48), 11, uiTheme.text.primary);
    this.addPanelText(514, 438, "Fast Travel", 14, uiTheme.text.muted);
    this.addPanelText(514, 464, this.wrapText(fastTravelMaps.map((map) => map.name).join(" | ") || "None unlocked", 22), 12, uiTheme.text.positive);
    const currentMonsters = currentMap.monsterIds.map((id) => dataRegistry.getMonster(id).name).slice(0, 3);
    this.addPanelText(514, 500, this.wrapText(`Current ${currentMap.type} · Monsters ${currentMonsters.join(", ") || "None"}`, 28), 10, uiTheme.text.secondary);
    this.addPanelButton(606, 514, 92, 28, "Close", () => this.context.closePanel());

    this.context.debug?.set("worldMapPanel", "visible");
    this.context.debug?.set("worldMapRegions", dataRegistry.getRegions().map((region) => `${region.id}:${region.levelRange.min}-${region.levelRange.max}`).join("|"));
    this.context.debug?.set("worldMapCurrentLocation", currentMap.id);
    this.context.debug?.set("worldMapDiscoveredMaps", discoveredMaps.map((map) => map.id).join("|"));
    this.context.debug?.set("worldMapFastTravel", fastTravelMaps.map((map) => map.id).join("|"));
    this.context.debug?.set("worldMapEntries", discoveredMaps.map((map) => `${map.id}:${map.name}:${map.regionId}:${map.type}:${map.levelRange.min}-${map.levelRange.max}:${this.getTravelLabel(map, state, discoveredMaps)}`).join("|"));
    this.context.debug?.set("worldMapCurrentType", currentMap.type);
    this.context.debug?.set("worldMapCurrentMonsters", currentMonsters.join("|"));
    this.context.debug?.set("worldMapButtons", "Close");
    this.context.debug?.set("worldMapDemoBlocked", dataRegistry.getRegions().filter((region) => isDemoBlockedRegion(region.id)).map((region) => region.id).join("|"));
  }

  private getDiscoveredMaps(state: GameState, dataRegistry: DataRegistry): ReturnType<DataRegistry["getMap"]>[] {
    const currentMap = dataRegistry.getMap(state.currentMapId);
    const currentRegion = dataRegistry.getRegion(currentMap.regionId);
    const maps = dataRegistry.getMaps()
      .filter((map) => map.regionId === currentRegion.id || state.worldFlags[`map:${map.id}:discovered`]);

    return maps.length > 0 ? maps : [currentMap];
  }

private getTravelLabel(map: ReturnType<DataRegistry["getMap"]>, state: GameState, discoveredMaps: ReturnType<DataRegistry["getMap"]>[]): string {
    if (map.id === state.currentMapId) return "Current";
    if (map.type === "town" && discoveredMaps.some((entry) => entry.id === map.id)) return "Fast travel";
    const linked = discoveredMaps.some((entry) => entry.portals.some((portal) => portal.targetMapId === map.id));
    return linked ? "Available via portal" : "Unavailable";
  }

private addPanelRectangle(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    alpha: number,
  ): Phaser.GameObjects.Rectangle {
    return addPanelRectanglePrimitive(this.context, x, y, width, height, color, alpha);
  }

private addPanelText(x: number, y: number, text: string, fontSize: number, color: string, wrapWidth?: number): Phaser.GameObjects.Text {
    return addPanelTextPrimitive(this.context, x, y, text, fontSize, color, wrapWidth);
  }

private truncateText(text: string, maxLength: number): string {
    return text.length <= maxLength ? text : `${text.slice(0, Math.max(0, maxLength - 1))}.`;
  }

private wrapText(text: string, lineLength: number): string {
    const words = text.split(" ");
    const lines: string[] = [];
    let line = "";

    for (const word of words) {
      const next = line ? `${line} ${word}` : word;

      if (next.length > lineLength) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }

    if (line) {
      lines.push(line);
    }

    return lines.join("\n");
  }

private addPanelButton(x: number, y: number, width: number, height: number, label: string, callback: () => void): void {
    addPanelButtonPrimitive(this.context, x, y, width, height, label, callback);
  }
}
