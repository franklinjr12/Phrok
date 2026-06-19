import Phaser from "phaser";
import { SceneKeys } from "../constants/sceneKeys";

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.GameOver);
  }
}
