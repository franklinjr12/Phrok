import Phaser from "phaser";
import { SceneKeys } from "../constants/sceneKeys";

export class DialogueScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Dialogue);
  }
}
