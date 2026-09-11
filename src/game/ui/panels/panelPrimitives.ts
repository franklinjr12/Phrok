import Phaser from "phaser";
import { panelDepth, uiTheme } from "../uiTheme";

export type PanelObject = Phaser.GameObjects.GameObject;

export interface PanelPrimitiveContext {
  readonly scene: Phaser.Scene;
  readonly stateScale: number;
  readonly objects: PanelObject[];
}

export function addPanelRectangle(
  context: PanelPrimitiveContext,
  x: number,
  y: number,
  width: number,
  height: number,
  color: number,
  alpha: number,
): Phaser.GameObjects.Rectangle {
  if (color === uiTheme.panelFill) {
    const shadow = context.scene.add.rectangle(x + uiTheme.shadow.offset, y + uiTheme.shadow.offset, width, height, uiTheme.colors.shadow, uiTheme.shadow.alpha)
      .setOrigin(0).setScrollFactor(0).setDepth(panelDepth - 1).setScale(context.stateScale);
    context.objects.push(shadow);
  }
  const rectangle = context.scene.add.rectangle(x, y, width, height, color, alpha)
    .setScrollFactor(0)
    .setDepth(panelDepth)
    .setScale(context.stateScale);
  context.objects.push(rectangle);
  if (color === uiTheme.panelFill) {
    rectangle.setData("windowFrame", true);
    const header = context.scene.add.rectangle(x, y, width, uiTheme.spacing.header, uiTheme.colors.header)
      .setOrigin(0).setScrollFactor(0).setDepth(panelDepth).setScale(context.stateScale);
    context.objects.push(header);
  }
  return rectangle;
}

export function addPanelText(
  context: PanelPrimitiveContext,
  x: number,
  y: number,
  text: string,
  fontSize: number,
  color: string,
  wrapWidth?: number,
): Phaser.GameObjects.Text {
  const object = context.scene.add.text(x, y, text, {
    color: fontSize >= 22 ? uiTheme.text.onDark : color,
    fontFamily: fontSize >= 18 ? uiTheme.fonts.heading : uiTheme.fonts.body,
    fontSize: `${Math.round(fontSize * context.stateScale)}px`,
    lineSpacing: 4,
    wordWrap: wrapWidth ? { width: wrapWidth } : undefined,
  })
    .setScrollFactor(0)
    .setDepth(panelDepth + 1);
  context.objects.push(object);
  return object;
}

export function addPanelButton(
  context: PanelPrimitiveContext,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  callback: () => void,
): Phaser.GameObjects.Rectangle {
  const button = addPanelRectangle(context, x, y, width, height, uiTheme.colors.header, 0.98)
    .setOrigin(0)
    .setStrokeStyle(uiTheme.borderWidth, uiTheme.colors.accent, 0.9)
    .setInteractive({ useHandCursor: true });
  button.on("pointerdown", callback);
  button.on("pointerover", () => button.setFillStyle(uiTheme.colors.hover));
  button.on("pointerout", () => button.setFillStyle(uiTheme.colors.header));
  addPanelText(context, x + 10, y + 8, label, 12, uiTheme.text.onDark);
  return button;
}

export function addSectionHeading(context: PanelPrimitiveContext, x: number, y: number, label: string): Phaser.GameObjects.Text {
  return addPanelText(context, x, y, label, 18, uiTheme.text.primary);
}

export function addDivider(context: PanelPrimitiveContext, x: number, y: number, width: number): Phaser.GameObjects.Rectangle {
  return addPanelRectangle(context, x, y, width, 1, uiTheme.colors.border, 0.7).setOrigin(0);
}

export function addProgressBar(context: PanelPrimitiveContext, x: number, y: number, width: number, height: number, fraction: number, color: number): Phaser.GameObjects.Rectangle {
  addPanelRectangle(context, x, y, width, height, uiTheme.colors.background, 0.8).setOrigin(0);
  return addPanelRectangle(context, x, y, width * Math.max(0, Math.min(1, fraction)), height, color, 1).setOrigin(0);
}

export function addBadge(context: PanelPrimitiveContext, x: number, y: number, label: string, width = 120): void {
  addPanelRectangle(context, x, y, width, 26, uiTheme.colors.inset, 1).setOrigin(0).setStrokeStyle(1, uiTheme.colors.border);
  addPanelText(context, x + 8, y + 5, label, 12, uiTheme.text.accent);
}

export function addStatRow(context: PanelPrimitiveContext, x: number, y: number, label: string, value: string, width: number): void {
  addPanelText(context, x, y, label, 13, uiTheme.text.secondary);
  addPanelText(context, x + width, y, value, 13, uiTheme.text.primary).setOrigin(1, 0);
  addDivider(context, x, y + 25, width);
}

export function truncateText(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, Math.max(0, maxLength - 1))}.`;
}

export function wrapText(value: string, lineLength: number): string {
  const lines: string[] = [];
  let line = "";
  for (const word of value.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > lineLength) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.join("\n");
}

export function clampWrappedText(value: string, lineLength: number, maxLines: number): string {
  const lines = wrapText(value, lineLength).split("\n");
  if (lines.length <= maxLines) return lines.join("\n");
  const visible = lines.slice(0, maxLines);
  visible[maxLines - 1] = truncateText(visible[maxLines - 1] ?? "", Math.max(4, lineLength - 2));
  return visible.join("\n");
}
