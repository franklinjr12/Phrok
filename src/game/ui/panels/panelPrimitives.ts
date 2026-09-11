import Phaser from "phaser";
import { panelDepth } from "../uiTheme";

export type PanelObject = Phaser.GameObjects.GameObject;

export interface PanelPrimitiveContext {
  scene: Phaser.Scene;
  stateScale: number;
  objects: PanelObject[];
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
  const rectangle = context.scene.add.rectangle(x, y, width, height, color, alpha)
    .setScrollFactor(0)
    .setDepth(panelDepth)
    .setScale(context.stateScale);
  context.objects.push(rectangle);
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
    color,
    fontFamily: "Arial, sans-serif",
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
  const button = addPanelRectangle(context, x, y, width, height, 0x263241, 0.96)
    .setOrigin(0)
    .setStrokeStyle(1, 0xfacc15, 0.9)
    .setInteractive({ useHandCursor: true });
  button.on("pointerdown", callback);
  addPanelText(context, x + 14, y + 9, label, 13, "#f8fafc");
  return button;
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
