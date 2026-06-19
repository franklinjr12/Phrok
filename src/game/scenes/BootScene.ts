import Phaser from "phaser";
import { SceneKeys } from "../constants/sceneKeys";

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  create(): void {
    this.game.canvas.dataset.scene = "boot";
    this.scene.start(SceneKeys.Preload);
  }
}
