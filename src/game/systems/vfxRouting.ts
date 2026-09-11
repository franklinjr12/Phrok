import type { ItemRarity } from "../types/dataDefinitions";

export type CombatTextKind = "damage" | "critical" | "miss" | "healing";

export interface CombatFeedbackDefinitionIds {
  anticipation: string;
  movement: string;
  impact: string;
  hit: string;
}

export function getCombatFeedbackDefinitionIds(critical: boolean): CombatFeedbackDefinitionIds {
  return {
    anticipation: "attack-anticipation",
    movement: "attack-motion",
    impact: "impact-emphasis",
    hit: critical ? "critical-hit" : "weapon-hit",
  };
}

export function getCombatTextDefinitionId(kind: CombatTextKind): string {
  return kind === "critical"
    ? "critical-number"
    : kind === "healing"
      ? "healing-number"
      : kind === "miss"
        ? "miss"
        : "damage-number";
}

export function getLootBeamDefinitionId(rarity: ItemRarity): string | null {
  if (rarity !== "Rare" && rarity !== "Epic" && rarity !== "Legendary" && rarity !== "Mythic") {
    return null;
  }

  return rarity === "Legendary" || rarity === "Mythic"
    ? "legendary-loot-beam"
    : "rare-loot-beam";
}
