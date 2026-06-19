export interface MainMenuButtonLayout {
  label: string;
  x: number;
  y: number;
  slot: number | null;
}

export interface MainMenuLayout {
  centerX: number;
  centerY: number;
  buttons: MainMenuButtonLayout[];
}

const buttonDefinitions = [
  { label: "Slot 1: New Game", yOffset: -96, slot: 1 },
  { label: "Slot 2: New Game", yOffset: -20, slot: 2 },
  { label: "Slot 3: New Game", yOffset: 56, slot: 3 },
  { label: "Options", yOffset: 132, slot: null },
] as const;

export function createMainMenuLayout(width: number, height: number): MainMenuLayout {
  const centerX = width / 2;
  const centerY = height / 2;

  return {
    centerX,
    centerY,
    buttons: buttonDefinitions.map(({ label, yOffset, slot }) => ({
      label,
      x: centerX,
      y: centerY + yOffset,
      slot,
    })),
  };
}
