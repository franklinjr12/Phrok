import Phaser from "phaser";

export const sceneTransitionDurationMs = 320;

export type SceneTransitionState = "idle" | "fading-out" | "fading-in";

type TransitionScene = Phaser.Scene & {
  input: Phaser.Input.InputPlugin;
};

type SceneStartOptions = {
  restart?: boolean;
};

/**
 * Shared presentation boundary for scene changes. The canvas dataset is used
 * as the short-lived cross-scene state because the outgoing scene is shut down
 * before the destination scene is created.
 */
export function isSceneTransitioning(scene: Phaser.Scene): boolean {
  const state = scene.game.canvas.dataset.transitionState as SceneTransitionState | undefined;
  return state !== undefined && state !== "idle";
}

export function isSceneFadeBlockingInput(scene: Phaser.Scene): boolean {
  return scene.game.canvas.dataset.transitionState === "fading-out";
}

export function enterScene(scene: TransitionScene, sceneName: string): void {
  const canvas = scene.game.canvas;
  canvas.dataset.scene = `${sceneName}-loading`;
  canvas.dataset.transitionState = "fading-in";
  canvas.dataset.transitionPhase = "fade-in";
  canvas.dataset.transitionTarget = sceneName;
  canvas.dataset.transitionInput = "blocked";
  scene.input.enabled = false;

  let completed = false;
  const complete = () => {
    if (completed) {
      return;
    }
    completed = true;
    canvas.dataset.scene = sceneName;
    canvas.dataset.transitionState = "idle";
    canvas.dataset.transitionPhase = "complete";
    canvas.dataset.transitionInput = "ready";
    scene.input.enabled = true;
  };

  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, complete);
  const timeoutId = window.setTimeout(complete, sceneTransitionDurationMs + 120);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.clearTimeout(timeoutId));
  scene.cameras.main.fadeIn(sceneTransitionDurationMs, 0, 0, 0);
}

export function transitionToScene(
  scene: TransitionScene,
  targetScene: string,
  data?: object,
  options: SceneStartOptions = {},
): boolean {
  const canvas = scene.game.canvas;

  if (isSceneTransitioning(scene)) {
    return false;
  }

  const transitionCount = Number(canvas.dataset.transitionCount ?? "0") + 1;
  canvas.dataset.transitionCount = String(transitionCount);
  canvas.dataset.transitionState = "fading-out";
  canvas.dataset.transitionPhase = "fade-out";
  canvas.dataset.transitionTarget = targetScene;
  canvas.dataset.transitionInput = "blocked";
  canvas.dataset.lastTransitionTarget = targetScene;
  scene.input.enabled = false;

  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    if (options.restart) {
      scene.scene.restart(data);
      return;
    }

    scene.scene.start(targetScene, data);
  });
  scene.cameras.main.fadeOut(sceneTransitionDurationMs, 0, 0, 0);
  return true;
}
