import Phaser from "phaser";
import { acceptHuntingContract, getHuntingBoardSummary, getRegionalHuntingContracts, refreshHuntingBoard, turnInHuntingContract, type HuntingContractDefinition } from "../../../systems/huntingBoard";
import type { DataRegistry } from "../../../data/dataRegistry";
import type { GameState } from "../../../types/gameState";
import { uiTheme } from "../../uiTheme";
import type { PanelContext, UIPanel } from "../../panels/panelTypes";
import { addPanelButton as addPanelButtonPrimitive, addPanelRectangle as addPanelRectanglePrimitive, addPanelText as addPanelTextPrimitive } from "../../panels/panelPrimitives";
const { panelDepth, hudDepth, panelFill, panelStroke } = uiTheme;
export class HuntingBoardPanel implements UIPanel {
 readonly id = "huntingBoard" as const;
 constructor(private readonly context: PanelContext) {}
 open(payload?: unknown): void { const values = (payload ?? {}) as Record<string, unknown>; if (typeof values.selectedHuntingContractIndex === "number") this.selectedHuntingContractIndex = values.selectedHuntingContractIndex as number; }
 render(): void { this.renderHuntingBoardPanel(this.context.state, this.context.data); }
 destroy(): void {}
 
private renderHuntingBoardPanel(state: GameState, dataRegistry: DataRegistry): void {
    const map = dataRegistry.getMap(state.currentMapId);
    const region = dataRegistry.getRegion(map.regionId);
    const contracts = getRegionalHuntingContracts(state, dataRegistry, region.id);
    const selectedContract = contracts[this.clampSelectedHuntingContractIndex(contracts)] ?? null;

    this.addPanelRectangle(64, 54, 672, 500, panelFill, 0.96)
      .setOrigin(0)
      .setStrokeStyle(2, panelStroke, 0.9);
    this.addPanelText(92, 78, "Hunting Board", 23, uiTheme.text.primary);
    this.addPanelText(92, 112, `${region.name}   Refresh ${state.huntingBoard.refreshCount} ${state.huntingBoard.lastRefreshReason}`, 14, uiTheme.text.accent);
    this.addPanelText(92, 146, "Contracts", 14, uiTheme.text.muted);

    contracts.slice(0, 9).forEach((contract, index) => {
      const y = 174 + index * 30;
      const status = this.getHuntingContractStatus(state, contract);
      const row = this.addPanelRectangle(92, y - 6, 360, 28, index === this.selectedHuntingContractIndex ? uiTheme.colors.selected : uiTheme.colors.inset, 0.94)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true });
      row.on("pointerdown", () => {
        this.selectedHuntingContractIndex = index;
        this.context.rerender();
      });
      this.addPanelText(104, y, this.truncateText(contract.name, 28), 13, contract.locked ? uiTheme.text.muted : uiTheme.text.primary);
      this.addPanelText(326, y, contract.rank, 12, contract.rank === "boss" ? uiTheme.text.negative : contract.rank === "elite" ? uiTheme.text.accent : uiTheme.text.secondary);
      this.addPanelText(386, y, status, 12, this.getHuntingStatusColor(status));
    });

    this.addPanelRectangle(482, 146, 220, 286, uiTheme.colors.inset, 0.95)
      .setOrigin(0)
      .setStrokeStyle(1, uiTheme.colors.border, 0.9);

    if (selectedContract) {
      const target = dataRegistry.getMonster(selectedContract.targetMonsterId);
      const progress = state.huntingBoard.progress[selectedContract.id] ?? 0;
      const rewardItems = selectedContract.rewardItems
        .map((entry) => `${dataRegistry.getItem(entry.itemId).name} x${entry.quantity}`)
        .join(", ");
      const status = this.getHuntingContractStatus(state, selectedContract);

      this.addPanelText(502, 168, this.truncateText(selectedContract.name, 22), 16, uiTheme.text.primary);
      this.addPanelText(502, 198, `${target.name} ${progress}/${selectedContract.targetCount}`, 13, uiTheme.text.secondary);
      this.addPanelText(502, 224, `Lv ${selectedContract.recommendedLevel}   ${selectedContract.rank}`, 12, uiTheme.text.info);
      this.addPanelText(502, 250, `XP ${selectedContract.rewardXp}   Gold ${selectedContract.rewardGold}`, 12, uiTheme.text.accent);
      this.addPanelText(502, 276, this.wrapText(`Items ${rewardItems || "None"}`, 24), 12, uiTheme.text.secondary);
      this.addPanelText(502, 342, status === "locked" ? selectedContract.lockReason : `Status ${status}`, 13, this.getHuntingStatusColor(status));
      this.addPanelText(502, 372, this.wrapText("Refresh uses map clear, boss kill, or rest. Active contracts block refresh.", 24), 12, uiTheme.text.muted);
    } else {
      this.addPanelText(502, 184, "No contracts", 15, uiTheme.text.muted);
    }

    this.addPanelButton(482, 450, 92, 34, "Accept", () => this.acceptSelectedHuntingContract());
    this.addPanelButton(584, 450, 92, 34, "Turn In", () => this.turnInSelectedHuntingContract());
    this.addPanelButton(482, 496, 92, 30, "Rest", () => this.restRefreshHuntingBoard());
    this.addPanelButton(606, 496, 92, 30, "Close", () => this.context.closePanel());
    this.syncHuntingBoardDataset(state, dataRegistry, selectedContract);
  }

private clampSelectedHuntingContractIndex(contracts: HuntingContractDefinition[]): number {
    if (contracts.length === 0) {
      this.selectedHuntingContractIndex = 0;
      return 0;
    }

    this.selectedHuntingContractIndex = Phaser.Math.Clamp(this.selectedHuntingContractIndex, 0, contracts.length - 1);
    return this.selectedHuntingContractIndex;
  }

private selectedHuntingContractIndex = 0;

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

private getHuntingContractStatus(state: GameState, contract: HuntingContractDefinition): string {
    if (contract.locked) {
      return "locked";
    }

    if (state.huntingBoard.completedContractIds.includes(contract.id)) {
      return "completed";
    }

    if (state.huntingBoard.activeContractIds.includes(contract.id)) {
      const progress = state.huntingBoard.progress[contract.id] ?? 0;
      return progress >= contract.targetCount ? "ready" : "active";
    }

    return "available";
  }

private truncateText(text: string, maxLength: number): string {
    return text.length <= maxLength ? text : `${text.slice(0, Math.max(0, maxLength - 1))}.`;
  }

private getHuntingStatusColor(status: string): string {
    if (status === "locked") {
      return uiTheme.text.muted;
    }

    if (status === "ready" || status === "completed") {
      return uiTheme.text.positive;
    }

    if (status === "active") {
      return uiTheme.text.info;
    }

    return uiTheme.text.accent;
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

private acceptSelectedHuntingContract(): void {
    if (!this.context.state || !this.context.data) {
      return;
    }

    const contract = this.getSelectedHuntingContract(this.context.state, this.context.data);
    const accepted = contract ? acceptHuntingContract(this.context.state, contract) : false;

    this.context.debug?.set("lastHuntingBoardAction", accepted && contract ? `accept:${contract.id}` : "accept-failed");
    this.syncHuntingBoardDataset(this.context.state, this.context.data, contract);
    this.context.rerender();
  }

private getSelectedHuntingContract(
    state: GameState,
    dataRegistry: DataRegistry,
  ): HuntingContractDefinition | null {
    const regionId = dataRegistry.getMap(state.currentMapId).regionId;
    const contracts = getRegionalHuntingContracts(state, dataRegistry, regionId);

    return contracts[this.clampSelectedHuntingContractIndex(contracts)] ?? null;
  }

private syncHuntingBoardDataset(
    state: GameState,
    dataRegistry: DataRegistry,
    selectedContract = this.getSelectedHuntingContract(state, dataRegistry),
  ): void {
    const regionId = dataRegistry.getMap(state.currentMapId).regionId;
    const contracts = getRegionalHuntingContracts(state, dataRegistry, regionId);

    this.context.debug?.set("huntingBoardPanel", this.id === "huntingBoard" ? "visible" : "hidden");
    this.context.debug?.set("huntingBoardRegion", regionId);
    this.context.debug?.set("huntingBoardContractCount", String(contracts.length));
    this.context.debug?.set("huntingBoardContracts", getHuntingBoardSummary(state, dataRegistry, regionId));
    this.context.debug?.set("huntingBoardActiveContracts", state.huntingBoard.activeContractIds.join("|"));
    this.context.debug?.set("huntingBoardCompletedContracts", state.huntingBoard.completedContractIds.join("|"));
    this.context.debug?.set("huntingBoardRefreshCount", String(state.huntingBoard.refreshCount));
    this.context.debug?.set("huntingBoardLastRefresh", state.huntingBoard.lastRefreshReason);
    this.context.debug?.set("huntingBoardButtons", "Accept|Turn In|Rest|Close");
    this.context.debug?.set("selectedHuntingContract", selectedContract?.id ?? "");
    this.context.debug?.set("selectedHuntingContractName", selectedContract?.name ?? "");
    this.context.debug?.set("selectedHuntingContractStatus", selectedContract ? this.getHuntingContractStatus(state, selectedContract) : "");
    this.context.debug?.set("selectedHuntingContractProgress", selectedContract
? `${state.huntingBoard.progress[selectedContract.id] ?? 0}/${selectedContract.targetCount}`
: "");
    this.context.debug?.set("selectedHuntingContractReward", selectedContract
? `xp:${selectedContract.rewardXp}|gold:${selectedContract.rewardGold}|items:${selectedContract.rewardItems.map((entry) => `${entry.itemId}:${entry.quantity}`).join(",")}`
: "");
  }

private turnInSelectedHuntingContract(): void {
    if (!this.context.state || !this.context.data) {
      return;
    }

    const contract = this.getSelectedHuntingContract(this.context.state, this.context.data);
    const turnedIn = contract ? turnInHuntingContract(this.context.state, this.context.data, contract.id) : false;

    this.context.debug?.set("lastHuntingBoardAction", turnedIn && contract ? `turn-in:${contract.id}` : "turn-in-failed");
    this.syncHuntingBoardDataset(this.context.state, this.context.data, contract);
    this.context.rerender();
  }

private restRefreshHuntingBoard(): void {
    if (!this.context.state || !this.context.data) {
      return;
    }

    const refreshed = refreshHuntingBoard(this.context.state, "rest");

    this.context.debug?.set("lastHuntingBoardAction", refreshed ? "refresh:rest" : "refresh-failed:active-contract");
    this.syncHuntingBoardDataset(this.context.state, this.context.data);
    this.context.rerender();
  }
}
