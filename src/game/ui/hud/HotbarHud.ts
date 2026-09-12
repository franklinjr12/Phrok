import Phaser from "phaser";
import type { UIContext } from "../UIContext";
import type { UIDebugAdapter } from "../debug/UIDebugAdapter";
import { assignHotbarAction, clearHotbarAction, getHotbarAction, getLearnedSkillLevel, hotbarSlotCount, moveHotbarAction } from "../../systems/skills";
import { getVisibleItemDescription } from "../../systems/market";
import { getConsumableCooldownSummary } from "../../systems/consumables";
import { hudDepth, uiTheme } from "../uiTheme";
import type { PanelId } from "../panels/panelTypes";

export interface HotbarHudContext extends UIContext {
  debug: UIDebugAdapter;
  showTooltip(lines: string[], x: number, y: number): void;
  clearTooltip(): void;
  activateSlot(slot: number): void;
  openPanel(panel: PanelId): void;
}

type HotbarVisual = {
  frame: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Text;
  art: Phaser.GameObjects.Graphics;
  number: Phaser.GameObjects.Text;
  quantity: Phaser.GameObjects.Text;
  cooldown: Phaser.GameObjects.Rectangle;
  cooldownText: Phaser.GameObjects.Text;
};

/** The single primary hotbar implementation. It owns presentation and delegates assignment/use to game systems. */
export class HotbarHud {
  private readonly visuals: HotbarVisual[] = [];
  private readonly navigationObjects: Phaser.GameObjects.GameObject[] = [];
  private clearZone?: Phaser.GameObjects.Rectangle;
  private readonly handleDropBound = (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dropZone: Phaser.GameObjects.GameObject) => this.handleDrop(pointer, gameObject, dropZone);

  constructor(private readonly context: HotbarHudContext) {}

  create(): void {
    const width = Number(this.context.scene.scale.width || 800);
    const height = Number(this.context.scene.scale.height || 600);
    const scale = this.context.state.settings.uiScale ?? 1;
    const x = Math.max(210, width / 2 - 140);
    const y = Math.max(540, height - 58);

    const backing = this.context.scene.add.rectangle(x - 26, y - 25, hotbarSlotCount * 42 + 77, 50, uiTheme.colors.background, 0.96)
      .setOrigin(0).setScrollFactor(0).setDepth(hudDepth - 1).setStrokeStyle(1, uiTheme.colors.accent);
    this.navigationObjects.push(backing);
    for (let index = 0; index < hotbarSlotCount; index += 1) {
      const slot = this.context.scene.add.rectangle(x + index * 42, y, 36, 36, uiTheme.colors.header, 0.98)
        .setStrokeStyle(2, uiTheme.colors.border, 0.95).setScrollFactor(0).setDepth(hudDepth)
        .setInteractive({ useHandCursor: true, dropZone: true });
      slot.setData("hotbarSlot", index + 1);
      this.context.scene.input.setDraggable(slot, true);
      slot.on("pointerdown", () => this.context.activateSlot(index + 1));
      slot.on("pointerover", () => this.showTooltip(index + 1, slot.x + 22, y - 76));
      slot.on("pointerout", () => this.context.clearTooltip());

      const number = this.context.scene.add.text(slot.x - 15, slot.y - 18, String(index + 1), {
        color: uiTheme.text.onDark, fontFamily: uiTheme.fonts.body, fontSize: `${Math.round(11 * scale)}px`,
      }).setScrollFactor(0).setDepth(hudDepth + 3);
      const icon = this.context.scene.add.text(slot.x, slot.y - 1, "", {
        color: uiTheme.text.onDark, fontFamily: uiTheme.fonts.heading, fontStyle: "bold", fontSize: `${Math.round(13 * scale)}px`,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(hudDepth + 1);
      const quantity = this.context.scene.add.text(slot.x + 15, slot.y + 12, "", {
        color: "#f9e7a8", fontFamily: uiTheme.fonts.body, fontSize: `${Math.round(10 * scale)}px`,
      }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(hudDepth + 3);
      const cooldown = this.context.scene.add.rectangle(slot.x, slot.y + 1, 32, 0, uiTheme.colors.shadow, 0.72)
        .setOrigin(0.5, 1).setScrollFactor(0).setDepth(hudDepth + 2).setVisible(false);
      const cooldownText = this.context.scene.add.text(slot.x, slot.y + 1, "", {
        color: uiTheme.text.onDark, fontFamily: uiTheme.fonts.body, fontSize: `${Math.round(9 * scale)}px`, stroke: "#0a1712", strokeThickness: 2,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(hudDepth + 4).setVisible(false);
      const art = this.context.scene.add.graphics().setPosition(slot.x, slot.y).setScrollFactor(0).setDepth(hudDepth + 1);
      this.visuals.push({ frame: slot, icon, art, number, quantity, cooldown, cooldownText });
    }

    this.clearZone = this.context.scene.add.rectangle(x + hotbarSlotCount * 42 + 24, y, 42, 36, uiTheme.colors.negative, 0.28)
      .setStrokeStyle(1, uiTheme.colors.negative, 0.9).setScrollFactor(0).setDepth(hudDepth)
      .setInteractive({ useHandCursor: true, dropZone: true });
    this.clearZone.setData("hotbarClearZone", true);
    const clearLabel = this.context.scene.add.text(this.clearZone.x, this.clearZone.y, "×", {
      color: uiTheme.text.onDark, fontFamily: uiTheme.fonts.heading, fontSize: "20px",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(hudDepth + 1);
    this.navigationObjects.push(this.clearZone, clearLabel);
    this.clearZone.on("pointerover", () => this.context.showTooltip(["Remove action", "Drop a hotbar action here"], this.clearZone!.x, this.clearZone!.y - 42));
    this.clearZone.on("pointerout", () => this.context.clearTooltip());

    this.createBottomNavigation(width, height);
    this.context.scene.input.on("drop", this.handleDropBound, this);
    this.context.debug.set("hotbarSlots", Array.from({ length: hotbarSlotCount }, (_, index) => String(index + 1)).join("|"));
    this.context.debug.set("hotbarVisible", true);
    this.context.debug.set("bottomNavigationButtons", "Character|Inventory|Equipment|Skills|Quests|World|System");
    this.sync();
  }

  update(): void {
    this.syncCooldowns();
  }

  sync(): void {
    const rendered: string[] = [];
    for (let index = 0; index < hotbarSlotCount; index += 1) {
      const assignment = getHotbarAction(this.context.state, index + 1);
      const visual = this.visuals[index];
      if (!visual) continue;
      const disabled = this.isDisabled(assignment);
      const iconLabel = assignment ? this.getIconLabel(assignment.type, assignment.id) : "";
      visual.frame.setStrokeStyle(2, assignment ? (assignment.type === "skill" ? uiTheme.colors.sp : uiTheme.colors.hp) : uiTheme.colors.border, 0.95);
      visual.frame.setFillStyle(disabled ? uiTheme.colors.disabled : uiTheme.colors.header, disabled ? 0.55 : 0.98);
      visual.icon.setText(iconLabel).setVisible(Boolean(assignment?.type === "skill" && assignment.id !== "power-slash"));
      const artKey = assignment ? `${assignment.type}:${assignment.id}:${disabled}` : "empty";
      if (visual.art.getData("assignment") !== artKey) {
        const art = visual.art.clear().setAlpha(disabled ? 0.4 : 1).setData("assignment", artKey);
        if (assignment?.type === "item") {
          art.fillStyle(0x88a9aa).fillRoundedRect(-7, -5, 14, 17, 3);
          art.fillStyle(0xa63829).fillRect(-5, 1, 10, 9);
          art.fillStyle(0xc2b68f).fillRect(-3, -10, 6, 7);
          art.fillStyle(0x795233).fillRect(-4, -12, 8, 3);
          art.fillStyle(0xf1dba4).fillRect(-4, 1, 2, 5);
        } else if (assignment?.id === "power-slash") {
          art.lineStyle(7, 0x30291f).lineBetween(-9, 10, 10, -10);
          art.lineStyle(4, 0xb5c4c5).lineBetween(-4, 5, 10, -10);
          art.lineStyle(1, 0xf1e8c8).lineBetween(-3, 4, 10, -10);
          art.lineStyle(3, 0xc39c50).lineBetween(-8, 0, 1, 9);
          art.lineStyle(3, 0x8c5a35).lineBetween(-9, 10, -5, 6);
        }
      }
      visual.quantity.setText(assignment?.type === "item" ? String(this.getQuantity(assignment.id)) : assignment?.type === "skill" ? `Lv${getLearnedSkillLevel(this.context.state, assignment.id)}` : "");
      rendered.push(`${index + 1}:${iconLabel}`);
    }
    this.context.debug.set("hotbarRenderedLabels", rendered.join("|"));
    this.context.debug.set("hotbarAssignments", this.context.state.character.hotbar.map((entry) => `${entry.slot}:${entry.type}:${entry.id}`).join("|"));
    this.context.debug.set("hotbarIconLabels", this.context.state.character.hotbar.map((entry) => `${entry.slot}:${this.getIconLabel(entry.type, entry.id)}`).join("|"));
    this.context.debug.set("hotbarCooldowns", getConsumableCooldownSummary(this.context.state));
    this.syncCooldowns();
  }

  capturesPointer(x: number, y: number): boolean {
    return this.visuals.some(({ frame }) => frame.getBounds().contains(x, y))
      || Boolean(this.clearZone?.getBounds().contains(x, y))
      || this.navigationObjects.some((object) => object instanceof Phaser.GameObjects.Rectangle && object.getBounds().contains(x, y));
  }

  destroy(): void {
    this.context.scene.input.off("drop", this.handleDropBound, this);
    for (const visual of this.visuals) Object.values(visual).forEach((object) => object.destroy());
    for (const object of this.navigationObjects) object.destroy();
    this.visuals.length = 0;
    this.navigationObjects.length = 0;
    this.clearZone = undefined;
  }

  private createBottomNavigation(width: number, height: number): void {
    const navigation: Array<[string, PanelId]> = [["Character", "character"], ["Inventory", "inventory"], ["Equipment", "equipment"], ["Skills", "skills"], ["Quests", "questLog"], ["World", "worldMap"], ["System", "settings"]];
    const buttonWidth = Math.min(76, Math.max(54, (width - 28) / navigation.length - 3));
    const y = height - 22;
    navigation.forEach(([label, panel], index) => {
      const button = this.context.scene.add.rectangle(14 + buttonWidth / 2 + index * (buttonWidth + 3), y, buttonWidth, 24, uiTheme.colors.header, 0.96)
        .setStrokeStyle(1, uiTheme.colors.accent, 0.85).setScrollFactor(0).setDepth(hudDepth).setInteractive({ useHandCursor: true });
      button.on("pointerdown", () => this.context.openPanel(panel));
      button.on("pointerover", () => button.setFillStyle(uiTheme.colors.hover));
      button.on("pointerout", () => button.setFillStyle(uiTheme.colors.header));
      const text = this.context.scene.add.text(button.x, button.y, label, { color: uiTheme.text.onDark, fontFamily: uiTheme.fonts.body, fontSize: "10px" })
        .setOrigin(0.5).setScrollFactor(0).setDepth(hudDepth + 1);
      this.navigationObjects.push(button, text);
    });
  }

  private handleDrop(pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dropZone: Phaser.GameObjects.GameObject): void {
    const sourceAction = gameObject.getData("hotbarAction") as { type: "skill" | "item"; id: string } | undefined;
    const sourceSlot = Number(gameObject.getData("hotbarSlot")) || null;
    if (dropZone.getData("hotbarClearZone")) {
      if (sourceSlot) clearHotbarAction(this.context.state, sourceSlot);
      return;
    }
    const targetSlot = Number(dropZone.getData("hotbarSlot")) || null;
    if (!targetSlot) return;
    if (sourceSlot) moveHotbarAction(this.context.state, sourceSlot, targetSlot);
    else if (sourceAction) assignHotbarAction(this.context.state, targetSlot, sourceAction);
    void pointer;
  }

  private syncCooldowns(): void {
    const now = Date.now();
    this.visuals.forEach((visual, index) => {
      const cooldown = this.getCooldown(getHotbarAction(this.context.state, index + 1), now);
      const active = Boolean(cooldown && cooldown.remaining > 0);
      visual.cooldown.setVisible(active);
      visual.cooldownText.setVisible(active);
      if (active && cooldown) {
        visual.cooldown.setDisplaySize(32, Math.max(2, 32 * Math.min(1, cooldown.remaining / cooldown.duration)));
        visual.cooldownText.setText(cooldown.remaining >= 1000 ? `${(cooldown.remaining / 1000).toFixed(1)}s` : `${Math.ceil(cooldown.remaining)}`);
      }
    });
  }

  private getCooldown(assignment: { type: "skill" | "item"; id: string } | null, now: number): { remaining: number; duration: number } | null {
    if (!assignment) return null;
    if (assignment.type === "skill") {
      const skill = this.context.data.getSkill(assignment.id);
      const readyAt = this.context.state.character.skills.cooldowns[assignment.id] ?? 0;
      return readyAt > now ? { remaining: readyAt - now, duration: Math.max(1, skill.cooldown) } : null;
    }
    const item = this.context.data.getItem(assignment.id);
    const readyAt = this.context.state.character.consumables.cooldowns[assignment.id] ?? 0;
    return readyAt > now ? { remaining: readyAt - now, duration: Math.max(1, item.consumableEffect?.cooldownMs ?? 1) } : null;
  }

  private isDisabled(assignment: { type: "skill" | "item"; id: string } | null): boolean {
    if (!assignment) return false;
    return assignment.type === "skill" ? getLearnedSkillLevel(this.context.state, assignment.id) <= 0 : this.getQuantity(assignment.id) <= 0;
  }

  private getQuantity(itemId: string): number { return this.context.state.inventory.items.find((entry) => entry.id === itemId)?.quantity ?? 0; }

  private getIconLabel(type: "skill" | "item", id: string): string {
    if (type === "item" && this.context.data.getItem(id).type === "consumable") return "POT";
    const icon = type === "skill" ? this.context.data.getSkill(id).icon : this.context.data.getItem(id).icon;
    return icon ? this.iconCode(icon) : id.split("-").map((part) => part[0]?.toUpperCase() ?? "").join("").slice(0, 3);
  }

  private iconCode(icon: string): string { return icon.replace(/^icon-/, "").split("-").map((part) => part[0]?.toUpperCase() ?? "").join("").slice(0, 3); }

  private showTooltip(slot: number, x: number, y: number): void {
    const assignment = getHotbarAction(this.context.state, slot);
    if (!assignment) { this.context.showTooltip([`Slot ${slot}`, "Empty", "Drag an action here"], x, y); return; }
    if (assignment.type === "skill") {
      const skill = this.context.data.getSkill(assignment.id);
      this.context.showTooltip([`Slot ${slot}: ${skill.name}`, `Level ${getLearnedSkillLevel(this.context.state, assignment.id)}/${skill.maxSkillLevel}`, `${skill.type} · ${skill.targetingMode}`, `SP ${skill.spCost} · CD ${skill.cooldown}ms`], x, y);
      return;
    }
    const item = this.context.data.getItem(assignment.id);
    this.context.showTooltip([`Slot ${slot}: ${item.name}`, `Quantity ${this.getQuantity(item.id)}`, item.type, getVisibleItemDescription(this.context.state.inventory, item)], x, y);
  }
}
