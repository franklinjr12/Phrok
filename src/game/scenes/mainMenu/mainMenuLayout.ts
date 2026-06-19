export interface MainMenuButtonLayout {
  label: string;
  x: number;
  y: number;
}

export interface MainMenuLayout {
  centerX: number;
  centerY: number;
  buttons: MainMenuButtonLayout[];
}

const buttonDefinitions = [
  { label: "Start Game", yOffset: -42 },
  { label: "Options", yOffset: 42 },
] as const;

export function createMainMenuLayout(width: number, height: number): MainMenuLayout {
  const centerX = width / 2;
  const centerY = height / 2;

  return {
    centerX,
    centerY,
    buttons: buttonDefinitions.map(({ label, yOffset }) => ({
      label,
      x: centerX,
      y: centerY + yOffset,
    })),
  };
}
