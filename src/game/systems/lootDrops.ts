import type { DataRegistry } from "../data/dataRegistry";
import type { DropTableDefinition } from "../types/dataDefinitions";
import { getItemRarity } from "./equipment";

export type LootDrop =
  | { kind: "item"; itemId: string; quantity: number }
  | { kind: "gold"; quantity: number };

export type RandomSource = () => number;
export type LootQuality = "normal" | "elite" | "boss";

export interface GenerateLootDropOptions {
  quality?: LootQuality;
}

export function generateLootDrops(
  dropTable: DropTableDefinition,
  dataRegistry: DataRegistry,
  random: RandomSource = Math.random,
  options: GenerateLootDropOptions = {},
): LootDrop[] {
  const drops: LootDrop[] = [];
  const quality = options.quality ?? "normal";

  for (const entry of dropTable.entries) {
    if (random() > getQualityChance(entry.chance, quality)) {
      continue;
    }

    const quantity = rollQualityQuantity(entry.minQuantity, entry.maxQuantity, quality, random);

    if (entry.type === "gold") {
      drops.push({ kind: "gold", quantity });
      continue;
    }

    const itemId = entry.itemId ?? pickRarityItemId(entry.rarity, dataRegistry, random);

    if (!itemId) {
      continue;
    }

    dataRegistry.getItem(itemId);
    drops.push({ kind: "item", itemId, quantity });
  }

  return drops;
}

function pickRarityItemId(
  rarity: DropTableDefinition["entries"][number]["rarity"],
  dataRegistry: DataRegistry,
  random: RandomSource,
): string | null {
  if (!rarity) {
    return null;
  }

  const items = dataRegistry.getItems().filter((item) => getItemRarity(item) === rarity);

  if (items.length === 0) {
    return null;
  }

  return items[Math.floor(random() * items.length)].id;
}

function getQualityChance(baseChance: number, quality: LootQuality): number {
  const bonus = quality === "boss" ? 0.35 : quality === "elite" ? 0.2 : 0;

  return Math.min(1, Math.max(0, baseChance + bonus));
}

function rollQualityQuantity(
  minQuantity: number,
  maxQuantity: number,
  quality: LootQuality,
  random: RandomSource,
): number {
  const quantity = rollQuantity(minQuantity, maxQuantity, random);
  const multiplier = quality === "boss" ? 3 : quality === "elite" ? 2 : 1;

  return Math.max(1, Math.ceil(quantity * multiplier));
}

function rollQuantity(minQuantity: number, maxQuantity: number, random: RandomSource): number {
  const min = Math.max(1, Math.floor(minQuantity));
  const max = Math.max(min, Math.floor(maxQuantity));

  return min + Math.floor(random() * (max - min + 1));
}
