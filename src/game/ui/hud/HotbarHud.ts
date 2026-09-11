import type { UIContext } from "../UIContext";
import type { UIDebugAdapter } from "../debug/UIDebugAdapter";
import { hotbarSlotCount } from "../../systems/skills";
import { getVisibleItemDescription } from "../../systems/market";
import { hudDepth } from "../uiTheme";

export interface HotbarHudContext extends UIContext {
  debug: UIDebugAdapter;
  showTooltip(lines: string[], x: number, y: number): void;
  clearTooltip(): void;
}

export class HotbarHud {
  private readonly frames: Phaser.GameObjects.Rectangle[] = [];
  private readonly labels: Phaser.GameObjects.Text[] = [];
  private readonly numbers: Phaser.GameObjects.Text[] = [];
  constructor(private readonly context: HotbarHudContext) {}

  create(): void {
    const width = Number(this.context.scene.scale.width || 800); const x = Math.max(210, width / 2 - 140); const y = Math.max(540, Number(this.context.scene.scale.height || 600) - 58);
    for (let index = 0; index < hotbarSlotCount; index += 1) {
      const assignment = this.context.state.character.hotbar.find((entry) => entry.slot === index + 1);
      const slot = this.context.scene.add.rectangle(x + index * 42, y, 36, 36, 0x17212b, 0.94).setStrokeStyle(2, assignment ? (assignment.type === "skill" ? 0x60a5fa : 0xf87171) : 0x64748b, 0.9).setScrollFactor(0).setDepth(hudDepth).setInteractive({ useHandCursor: true });
      slot.on("pointerover", () => this.showTooltip(index + 1, x + index * 42 + 22, y - 70)); slot.on("pointerout", () => this.context.clearTooltip());
      const number = this.context.scene.add.text(x + index * 42 - 12, y - 12, String(index + 1), { color: "#f8fafc", fontFamily: "Arial, sans-serif", fontSize: "12px" }).setScrollFactor(0).setDepth(hudDepth + 1);
      const label = this.context.scene.add.text(x + index * 42 - 12, y + 2, assignment ? this.getIconLabel(assignment.type, assignment.id) : "", { color: assignment?.type === "item" ? "#fecaca" : "#bfdbfe", fontFamily: "Arial, sans-serif", fontSize: "10px" }).setScrollFactor(0).setDepth(hudDepth + 1);
      this.frames.push(slot); this.labels.push(label); this.numbers.push(number);
    }
    this.context.debug.set("hotbarSlots", Array.from({ length: hotbarSlotCount }, (_, index) => String(index + 1)).join("|")); this.context.debug.set("hotbarVisible", true); this.sync();
  }

  sync(): void { const rendered: string[] = []; for (let index = 0; index < hotbarSlotCount; index += 1) { const slotNumber = index + 1; const assignment = this.context.state.character.hotbar.find((entry) => entry.slot === slotNumber); const label = assignment ? this.getIconLabel(assignment.type, assignment.id) : ""; this.frames[index]?.setStrokeStyle(2, assignment ? (assignment.type === "skill" ? 0x60a5fa : 0xf87171) : 0x64748b, 0.9); this.labels[index]?.setText(label).setColor(assignment?.type === "item" ? "#fecaca" : "#bfdbfe"); rendered.push(`${slotNumber}:${label}`); } this.context.debug.set("hotbarRenderedLabels", rendered.join("|")); this.context.debug.set("hotbarAssignments", this.context.state.character.hotbar.map((entry) => `${entry.slot}:${entry.type}:${entry.id}`).join("|")); this.context.debug.set("hotbarIconLabels", this.context.state.character.hotbar.map((entry) => `${entry.slot}:${this.getIconLabel(entry.type, entry.id)}`).join("|")); }
  destroy(): void { for (const object of [...this.frames, ...this.labels, ...this.numbers]) object.destroy(); this.frames.length = 0; this.labels.length = 0; this.numbers.length = 0; }

  private getIconLabel(type: "skill" | "item", id: string): string { return type === "item" ? "POT" : id.split("-").map((part) => part[0]?.toUpperCase() ?? "").join("").slice(0, 3); }
  private showTooltip(slot: number, x: number, y: number): void { const assignment = this.context.state.character.hotbar.find((entry) => entry.slot === slot); if (!assignment) { this.context.showTooltip([`Slot ${slot}`, "Empty"], x, y); return; } if (assignment.type === "skill") { const skill = this.context.data.getSkill(assignment.id); this.context.showTooltip([`Slot ${slot}: ${skill.name}`, `${skill.type} ${skill.targetingMode}`, `SP ${skill.spCost} CD ${skill.cooldown}ms`], x, y); return; } const item = this.context.data.getItem(assignment.id); this.context.showTooltip([`Slot ${slot}: ${item.name}`, item.type, getVisibleItemDescription(this.context.state.inventory, item)], x, y); }
}
