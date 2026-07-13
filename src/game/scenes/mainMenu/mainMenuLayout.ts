export interface MainMenuButtonLayout {
  action: MainMenuAction;
  label: string;
  x: number;
  y: number;
}

export interface MainMenuSaveSlotLayout {
  slot: number;
  x: number;
  y: number;
}

export interface MainMenuLayout {
  centerX: number;
  centerY: number;
  buttons: MainMenuButtonLayout[];
  compact: boolean;
  saveSlots: MainMenuSaveSlotLayout[];
  saveTitleX: number;
  saveTitleY: number;
}

export type MainMenuAction = "new-game" | "continue" | "load-game" | "settings" | "credits" | "quit";

const buttonDefinitions: Array<{ action: MainMenuAction; label: string; yOffset: number }> = [
  { action: "new-game", label: "New Game", yOffset: -96 },
  { action: "continue", label: "Continue", yOffset: -46 },
  { action: "load-game", label: "Load Game", yOffset: 4 },
  { action: "settings", label: "Settings", yOffset: 54 },
  { action: "credits", label: "Credits", yOffset: 104 },
  { action: "quit", label: "Quit", yOffset: 154 },
] as const;

export function createMainMenuLayout(width: number, height: number): MainMenuLayout {
  const centerX = width / 2;
  const centerY = height / 2;
  const compact = width < 620;

  if (compact) {
    const buttonStartY = Math.max(250, Math.min(height - 440, Math.round(height * 0.36)));
    const saveStartY = buttonStartY + buttonDefinitions.length * 50 + 30;

    return {
      centerX,
      centerY,
      compact,
      buttons: buttonDefinitions.map(({ action, label }, index) => ({
        action,
        label,
        x: centerX,
        y: buttonStartY + index * 50,
      })),
      saveSlots: [1, 2, 3].map((slot, index) => ({
        slot,
        x: centerX,
        y: saveStartY + index * 54,
      })),
      saveTitleX: centerX,
      saveTitleY: saveStartY - 48,
    };
  }

  const actionX = Math.max(170, centerX - 130);
  const saveSlotX = Math.min(width - 170, centerX + 200);

  return {
    centerX,
    centerY,
    compact,
    buttons: buttonDefinitions.map(({ action, label, yOffset }) => ({
      action,
      label,
      x: actionX,
      y: centerY + yOffset,
    })),
    saveSlots: [1, 2, 3].map((slot, index) => ({
      slot,
      x: saveSlotX,
      y: centerY - 50 + index * 58,
    })),
    saveTitleX: saveSlotX,
    saveTitleY: 186,
  };
}
