import Phaser from "phaser";
import { panelDepth, uiTheme } from "../uiTheme";

/**
 * The single screen-space tooltip renderer used by the HUD and every panel.
 * Callers provide already-localized gameplay facts; this class owns placement,
 * styling, viewport clamping and lifecycle.
 */
export class SharedTooltip {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];

  constructor(private readonly scene: Phaser.Scene, private readonly getScale: () => number) {}

  show(lines: readonly string[], x: number, y: number): { x: number; y: number; width: number; height: number } {
    this.clear();
    const scale = Math.max(0.75, this.getScale());
    const viewportWidth = Number(this.scene.scale.width || 800);
    const viewportHeight = Number(this.scene.scale.height || 600);
    const width = Math.min(238 * scale, Math.max(120, viewportWidth - 16));
    const height = Math.min(
      Math.max(52 * scale, 22 * scale + lines.length * 18 * scale),
      Math.max(52 * scale, viewportHeight - 16),
    );
    const clampedX = Phaser.Math.Clamp(x, 8, Math.max(8, viewportWidth - width - 8));
    const clampedY = Phaser.Math.Clamp(y, 8, Math.max(8, viewportHeight - height - 8));
    const box = this.scene.add.rectangle(clampedX, clampedY, width, height, uiTheme.tooltip.fill, 0.97)
      .setOrigin(0)
      .setStrokeStyle(1, uiTheme.tooltip.border, 0.95)
      .setScrollFactor(0)
      .setDepth(panelDepth + 20);
    const text = this.scene.add.text(clampedX + uiTheme.tooltip.padding * scale, clampedY + 10 * scale, lines.join("\n"), {
      color: uiTheme.text.onDark,
      fontFamily: uiTheme.fonts.body,
      fontSize: `${Math.round(12 * scale)}px`,
      lineSpacing: Math.round(4 * scale),
      wordWrap: { width: Math.max(80, width - 24 * scale) },
    }).setScrollFactor(0).setDepth(panelDepth + 21);
    this.objects.push(box, text);
    return { x: Math.round(clampedX), y: Math.round(clampedY), width: Math.round(width), height: Math.round(height) };
  }

  clear(): void {
    for (const object of this.objects) object.destroy();
    this.objects.length = 0;
  }
}
