import Phaser from "phaser";
import { RegistryKeys } from "../constants/registryKeys";
import { SceneKeys } from "../constants/sceneKeys";
import { eventBus } from "../systems/eventBus";
import type { GameState } from "../types/gameState";

export class WorldScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.World);
  }

  create(): void {
    const state = this.registry.get(RegistryKeys.GameState) as GameState;

    this.cameras.main.setBackgroundColor("#162019");
    this.add.text(this.scale.width / 2, this.scale.height / 2, state.currentMapId, {
      color: "#f4f7fb",
      fontFamily: "Arial, sans-serif",
      fontSize: "24px",
    }).setOrigin(0.5);

    this.game.canvas.dataset.scene = "world";
    this.game.canvas.dataset.currentMap = state.currentMapId;
    this.game.canvas.dataset.characterArchetype = state.character.archetype;

    this.scene.launch(SceneKeys.UI);
    eventBus.emit("mapChanged", { mapId: state.currentMapId });
  }
}
