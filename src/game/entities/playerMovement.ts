export type PlayerDirection = "down" | "up" | "left" | "right";
export type PlayerMotionState = "idle" | "walk";
export type PlayerAnimationState = `${PlayerMotionState}-${PlayerDirection}`;

export interface Vector2Like {
  x: number;
  y: number;
}

export interface MovementStep {
  position: Vector2Like;
  direction: PlayerDirection;
  motionState: PlayerMotionState;
  animationState: PlayerAnimationState;
  reachedDestination: boolean;
}

export const playerAnimationStates: PlayerAnimationState[] = [
  "idle-down",
  "idle-up",
  "idle-left",
  "idle-right",
  "walk-down",
  "walk-up",
  "walk-left",
  "walk-right",
];

export function getDirectionFromVector(x: number, y: number, fallback: PlayerDirection): PlayerDirection {
  if (Math.abs(x) > Math.abs(y)) {
    return x < 0 ? "left" : "right";
  }

  if (Math.abs(y) > 0) {
    return y < 0 ? "up" : "down";
  }

  return fallback;
}

export function getAnimationState(
  motionState: PlayerMotionState,
  direction: PlayerDirection,
): PlayerAnimationState {
  return `${motionState}-${direction}`;
}

export function moveToward(
  current: Vector2Like,
  destination: Vector2Like | null,
  speed: number,
  deltaSeconds: number,
  currentDirection: PlayerDirection,
): MovementStep {
  if (!destination) {
    return {
      position: { ...current },
      direction: currentDirection,
      motionState: "idle",
      animationState: getAnimationState("idle", currentDirection),
      reachedDestination: false,
    };
  }

  const deltaX = destination.x - current.x;
  const deltaY = destination.y - current.y;
  const distance = Math.hypot(deltaX, deltaY);
  const direction = getDirectionFromVector(deltaX, deltaY, currentDirection);
  const travelDistance = speed * deltaSeconds;

  if (distance <= travelDistance || distance <= 1) {
    return {
      position: { ...destination },
      direction,
      motionState: "idle",
      animationState: getAnimationState("idle", direction),
      reachedDestination: true,
    };
  }

  const ratio = travelDistance / distance;

  return {
    position: {
      x: current.x + deltaX * ratio,
      y: current.y + deltaY * ratio,
    },
    direction,
    motionState: "walk",
    animationState: getAnimationState("walk", direction),
    reachedDestination: false,
  };
}
