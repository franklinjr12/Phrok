import type { ItemRarity } from "../types/dataDefinitions";

export type CombatTextKind = "damage" | "critical" | "miss" | "healing";

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
