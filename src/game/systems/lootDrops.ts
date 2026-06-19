import type { DataRegistry } from "../data/dataRegistry";
import type { DropTableDefinition } from "../types/dataDefinitions";

export type LootDrop =
  | { kind: "item"; itemId: string; quantity: number }
  | { kind: "gold"; quantity: number };

export type RandomSource = () => number;

export function generateLootDrops(
  dropTable: DropTableDefinition,
  dataRegistry: DataRegistry,
  random: RandomSource = Math.random,
): LootDrop[] {
  const drops: LootDrop[] = [];

  for (const entry of dropTable.entries) {
    if (random() > entry.chance) {
      continue;
    }

    const quantity = rollQuantity(entry.minQuantity, entry.maxQuantity, random);

    if (entry.type === "gold") {
      drops.push({ kind: "gold", quantity });
      continue;
    }

    if (!entry.itemId) {
      continue;
    }

    dataRegistry.getItem(entry.itemId);
    drops.push({ kind: "item", itemId: entry.itemId, quantity });
  }

  return drops;
}

function rollQuantity(minQuantity: number, maxQuantity: number, random: RandomSource): number {
  const min = Math.max(1, Math.floor(minQuantity));
  const max = Math.max(min, Math.floor(maxQuantity));

  return min + Math.floor(random() * (max - min + 1));
}
