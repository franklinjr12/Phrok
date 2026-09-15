import Phaser from "phaser";
import { getBestiaryDropRows, getBestiaryEntry, getMonsterCombatTip, getMonsterElement, getMonsterFamily, getVisibleBestiaryDropIds, hasBestiaryMilestone } from "../../../systems/bestiary";
import type { DataRegistry } from "../../../data/dataRegistry";
import type { MonsterDefinition } from "../../../types/dataDefinitions";
import type { GameState } from "../../../types/gameState";
import { uiTheme } from "../../uiTheme";
import type { PanelContext, UIPanel } from "../../panels/panelTypes";
import { addPanelButton as addPanelButtonPrimitive, addPanelRectangle as addPanelRectanglePrimitive, addPanelText as addPanelTextPrimitive } from "../../panels/panelPrimitives";
const { panelDepth, hudDepth, panelFill, panelStroke } = uiTheme;
export class BestiaryPanel implements UIPanel {
 readonly id = "bestiary" as const;
 constructor(private readonly context: PanelContext) {}
 open(payload?: unknown): void { const values = (payload ?? {}) as Record<string, unknown>; if (typeof values.selectedBestiaryIndex === "number") this.selectedBestiaryIndex = values.selectedBestiaryIndex as number; }
 render(): void { this.renderBestiaryPanel(this.context.state, this.context.data); }
 destroy(): void {}
 handleKey(event: KeyboardEvent): boolean { return this.handleBestiarySearchKey(event); }
private renderBestiaryPanel(state: GameState, dataRegistry: DataRegistry): void {
    const entries = this.getVisibleBestiaryEntries(state, dataRegistry);
    const selectedEntry = entries[this.clampSelectedBestiaryIndex(entries)] ?? null;
    const selectedMonster = selectedEntry ? selectedEntry.monster : null;
    const selectedState = selectedMonster ? getBestiaryEntry(state, selectedMonster.id) : null;
    const selectedRegion = selectedMonster ? this.getMonsterRegion(selectedMonster, dataRegistry) : undefined;
    const selectedDropTable = selectedMonster ? dataRegistry.getDropTable(selectedMonster.dropTableId) : null;
    const selectedDropIds = selectedDropTable ? getVisibleBestiaryDropIds(selectedState, selectedDropTable) : [];

    this.addPanelRectangle(70, 60, 660, 470, panelFill, 0.95)
      .setOrigin(0)
      .setStrokeStyle(2, panelStroke, 0.92);
    this.addPanelText(96, 84, "Bestiary", 24, uiTheme.text.primary);
    this.addPanelText(96, 120, `Search ${this.bestiarySearchText || "-"}   Known ${state.bestiary.discoveredEnemyIds.length}/${dataRegistry.getMonsters().length}`, 15, uiTheme.text.accent);
    this.addPanelText(96, 148, "Monster", 13, uiTheme.text.muted);
    this.addPanelText(292, 148, "Family", 13, uiTheme.text.muted);
    this.addPanelText(376, 148, "Kills", 13, uiTheme.text.muted);

    this.context.debug?.set("bestiaryPanel", "visible");
    this.context.debug?.set("bestiarySearch", this.bestiarySearchText);
    this.context.debug?.set("bestiaryEntryCount", String(entries.length));
    this.context.debug?.set("bestiaryGroups", entries
.map((entry) => `${entry.region.id}/${getMonsterFamily(entry.monster)}`)
.filter((group, index, groups) => groups.indexOf(group) === index)
.join("|"));

    entries.slice(0, 9).forEach((entry, index) => {
      const monsterState = getBestiaryEntry(state, entry.monster.id);
      const kills = monsterState?.kills ?? 0;
      const known = hasBestiaryMilestone(monsterState, 1);
      const familyKnown = hasBestiaryMilestone(monsterState, 5);
      const y = 176 + index * 34;
      const row = this.addPanelRectangle(96, y, 330, 28, index === this.selectedBestiaryIndex ? uiTheme.colors.selected : uiTheme.colors.inset, 0.94)
        .setOrigin(0)
        .setStrokeStyle(1, index === this.selectedBestiaryIndex ? uiTheme.colors.accent : uiTheme.colors.border, 0.9)
        .setInteractive({ useHandCursor: true });
      row.on("pointerdown", () => {
        this.selectedBestiaryIndex = index;
        this.context.rerender();
      });
      row.on("pointerover", () => this.context.showTooltip([
        known ? entry.monster.name : "Unknown monster",
        familyKnown ? `${getMonsterFamily(entry.monster)} ${getMonsterElement(entry.monster, entry.region)}` : "Traits locked",
        `Kills ${kills}`,
      ], 438, y - 8));
      row.on("pointerout", () => this.context.clearTooltip());
      this.addPanelText(110, y + 5, known ? entry.monster.name : "Unknown monster", 13, known ? uiTheme.text.primary : uiTheme.text.muted);
      this.addPanelText(292, y + 5, familyKnown ? getMonsterFamily(entry.monster) : "???", 12, familyKnown ? uiTheme.text.secondary : "#64748b");
      this.addPanelText(376, y + 5, String(kills), 12, uiTheme.text.accent);
    });

    if (selectedMonster && selectedDropTable) {
      const kills = selectedState?.kills ?? 0;
      const element = getMonsterElement(selectedMonster, selectedRegion);
      const family = getMonsterFamily(selectedMonster);
      const name = hasBestiaryMilestone(selectedState, 1) ? selectedMonster.name : "Unknown monster";
      const levelText = hasBestiaryMilestone(selectedState, 1) ? `Lv ${selectedMonster.level}` : "Lv ?";
      const familyText = hasBestiaryMilestone(selectedState, 5) ? `${family} / ${element} / ${selectedMonster.behavior}` : "???";
      const dropsText = selectedDropTable
        ? this.getBestiaryDropText(selectedState, selectedDropTable, dataRegistry)
        : "Undiscovered";
      const tipText = hasBestiaryMilestone(selectedState, 30) ? getMonsterCombatTip(selectedMonster) : "???";
      const bonusText = hasBestiaryMilestone(selectedState, 100)
        ? `+${state.bestiary.familyDamageBonuses[family] ?? 0} vs ${family}`
        : "Locked";

      this.addPanelRectangle(456, 158, 230, 292, uiTheme.colors.inset, 0.95)
        .setOrigin(0)
        .setStrokeStyle(1, uiTheme.colors.border, 0.86);
      this.addPanelText(476, 178, name, 17, uiTheme.text.primary);
      this.addPanelText(476, 208, `${levelText}   Kills ${kills}`, 13, uiTheme.text.secondary);
      this.addPanelText(476, 236, `Region ${selectedRegion?.name ?? "Unknown"}`, 12, uiTheme.text.info);
      this.addPanelText(476, 262, `Traits ${familyText}`, 12, uiTheme.text.accent);
      this.addPanelText(476, 296, this.wrapText(`Drops ${dropsText}`, 25), 12, uiTheme.text.secondary);
      this.addPanelText(476, 356, this.wrapText(`Tip ${tipText}`, 25), 12, uiTheme.text.positive);
      this.addPanelText(476, 412, `Bonus ${bonusText}`, 12, "#fef3c7");

      this.context.debug?.set("selectedBestiaryMonster", selectedMonster.id);
      this.context.debug?.set("selectedBestiaryMonsterName", name);
      this.context.debug?.set("selectedBestiaryKills", String(kills));
      this.context.debug?.set("selectedBestiaryLevel", hasBestiaryMilestone(selectedState, 1) ? String(selectedMonster.level) : "");
      this.context.debug?.set("selectedBestiaryElement", hasBestiaryMilestone(selectedState, 5) ? element : "");
      this.context.debug?.set("selectedBestiaryFamily", hasBestiaryMilestone(selectedState, 5) ? family : "");
      this.context.debug?.set("selectedBestiaryBehavior", hasBestiaryMilestone(selectedState, 5) ? selectedMonster.behavior : "");
      this.context.debug?.set("selectedBestiaryDrops", selectedDropTable ? this.getBestiaryDropDebug(selectedState, selectedDropTable) : "");
      this.context.debug?.set("selectedBestiaryTip", hasBestiaryMilestone(selectedState, 30) ? getMonsterCombatTip(selectedMonster) : "");
      this.context.debug?.set("selectedBestiaryBonus", hasBestiaryMilestone(selectedState, 100) ? `${family}:${state.bestiary.familyDamageBonuses[family] ?? 0}` : "");
      this.context.debug?.set("selectedBestiaryMilestones", selectedState?.unlockedMilestones.join("|") ?? "");
    }

    this.addPanelButton(628, 476, 86, 28, "Close", () => this.context.closePanel());
    this.context.debug?.set("bestiaryButtons", "Close");
    this.syncBestiaryDataset(state, dataRegistry);
  }

  private getBestiaryDropText(
    entry: ReturnType<typeof getBestiaryEntry>,
    dropTable: Parameters<typeof getBestiaryDropRows>[1],
    dataRegistry: DataRegistry,
  ): string {
    const rows = getBestiaryDropRows(entry, dropTable);
    if (rows.length === 0) {
      return "Undiscovered";
    }
    return rows.map((row) => row.hidden ? "Rare Drop: ???" : dataRegistry.getItem(row.itemId!).name).join(", ");
  }

  private getBestiaryDropDebug(
    entry: ReturnType<typeof getBestiaryEntry>,
    dropTable: Parameters<typeof getBestiaryDropRows>[1],
  ): string {
    return getBestiaryDropRows(entry, dropTable)
      .map((row) => row.hidden ? "???" : row.itemId)
      .join("|");
  }

private getVisibleBestiaryEntries(
    state: GameState,
    dataRegistry: DataRegistry,
  ): Array<{ monster: MonsterDefinition; region: ReturnType<DataRegistry["getRegion"]> }> {
    const query = this.bestiarySearchText.trim().toLowerCase();

    return dataRegistry.getMonsters()
      .map((monster) => ({
        monster,
        region: this.getMonsterRegion(monster, dataRegistry) ?? dataRegistry.getRegions()[0],
      }))
      .filter((entry) => {
        if (!query) {
          return true;
        }

        const bestiaryEntry = getBestiaryEntry(state, entry.monster.id);
        const searchable = [
          entry.monster.id,
          hasBestiaryMilestone(bestiaryEntry, 1) ? entry.monster.name : "",
          hasBestiaryMilestone(bestiaryEntry, 5) ? getMonsterFamily(entry.monster) : "",
          entry.region.name,
        ].join(" ").toLowerCase();

        return searchable.includes(query);
      })
      .sort((left, right) => {
        const regionCompare = left.region.name.localeCompare(right.region.name);
        if (regionCompare !== 0) {
          return regionCompare;
        }

        const familyCompare = getMonsterFamily(left.monster).localeCompare(getMonsterFamily(right.monster));
        return familyCompare !== 0 ? familyCompare : left.monster.level - right.monster.level;
      });
  }

private bestiarySearchText = "";

private getMonsterRegion(monster: MonsterDefinition, dataRegistry: DataRegistry): ReturnType<DataRegistry["getRegion"]> | undefined {
    return dataRegistry.getRegions().find((region) => (
      region.monsterIds.includes(monster.id) || region.bossIds.includes(monster.id)
    ));
  }

private clampSelectedBestiaryIndex(entries: unknown[]): number {
    if (entries.length === 0) {
      this.selectedBestiaryIndex = 0;
      return 0;
    }

    this.selectedBestiaryIndex = Phaser.Math.Clamp(this.selectedBestiaryIndex, 0, Math.min(entries.length - 1, 8));
    return this.selectedBestiaryIndex;
  }

private selectedBestiaryIndex = 0;

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

private syncBestiaryDataset(state: GameState, dataRegistry: DataRegistry): void {
    this.context.debug?.set("bestiaryKills", Object.values(state.bestiary.entries)
.sort((left, right) => left.monsterId.localeCompare(right.monsterId))
.map((entry) => `${entry.monsterId}:${entry.kills}`)
.join("|"));
    this.context.debug?.set("bestiaryDiscovered", state.bestiary.discoveredEnemyIds.join("|"));
    this.context.debug?.set("bestiaryDefeated", state.bestiary.defeatedEnemyIds.join("|"));
    this.context.debug?.set("bestiaryMilestoneNotifications", state.bestiary.milestoneNotifications.join("|"));
    this.context.debug?.set("bestiaryFamilyBonuses", Object.entries(state.bestiary.familyDamageBonuses)
.map(([family, bonus]) => `${family}:${bonus}`)
.join("|"));
    this.context.debug?.set("bestiaryTotalMonsters", String(dataRegistry.getMonsters().length));
  }

private handleBestiarySearchKey(event: KeyboardEvent): boolean {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return false;
    }

    if (event.code === "KeyB" && this.bestiarySearchText.length === 0) {
      event.preventDefault();
      return true;
    }

    if (event.key === "Backspace") {
      this.bestiarySearchText = this.bestiarySearchText.slice(0, -1);
    } else if (event.key === "Delete") {
      this.bestiarySearchText = "";
    } else if (event.key.length === 1) {
      this.bestiarySearchText = `${this.bestiarySearchText}${event.key}`.slice(0, 24);
    } else {
      return false;
    }

    event.preventDefault();
    this.selectedBestiaryIndex = 0;
    this.context.debug?.set("bestiarySearch", this.bestiarySearchText);
    this.context.rerender();
    return true;
  }
}
