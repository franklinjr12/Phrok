export type ElementMatchup = "weak" | "normal" | "resist";

const strongAgainst: Record<string, string[]> = {
  fire: ["plant", "insect", "earth", "ice"],
  water: ["fire"],
  lightning: ["water", "construct"],
  earth: ["lightning"],
  holy: ["undead", "demon", "dark"],
  dark: ["holy"],
  poison: ["beast", "plant"],
};

const weakAgainst: Record<string, string[]> = {
  fire: ["water"],
  water: ["lightning"],
  lightning: ["earth"],
  earth: ["fire"],
  holy: ["dark"],
  dark: ["holy"],
  poison: ["undead", "construct"],
};

export function getElementMultiplier(attackElement = "neutral", defenseElement = "neutral"): number {
  return getElementMatchup(attackElement, defenseElement) === "weak"
    ? 1.5
    : getElementMatchup(attackElement, defenseElement) === "resist"
      ? 0.7
      : 1;
}

export function getElementMatchup(attackElement = "neutral", defenseElement = "neutral"): ElementMatchup {
  const attack = attackElement.toLowerCase();
  const defense = defenseElement.toLowerCase();
  if (strongAgainst[attack]?.includes(defense)) {
    return "weak";
  }
  if (weakAgainst[attack]?.includes(defense) || attack === defense && attack !== "neutral") {
    return "resist";
  }
  return "normal";
}
