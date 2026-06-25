import { describe, expect, it } from "vitest";
import { generateLootDrops } from "./lootDrops";
import type { DataRegistry } from "../data/dataRegistry";

describe("generateLootDrops", () => {
  it("creates item and gold drops from a drop table using injected randomness", () => {
    const drops = generateLootDrops({
      id: "green-jelly-drops",
      entries: [
        { type: "item", itemId: "jelly-gel", chance: 1, minQuantity: 1, maxQuantity: 2 },
        { type: "gold", chance: 1, minQuantity: 3, maxQuantity: 5 },
      ],
    }, createRegistry(), createRandom([0, 0.9, 0, 0.5]));

    expect(drops).toEqual([
      { kind: "item", itemId: "jelly-gel", quantity: 2 },
      { kind: "gold", quantity: 4 },
    ]);
  });

  it("improves elite drop chances and quantities", () => {
    const dropTable = {
      id: "elite-jelly-drops",
      entries: [
        { type: "item" as const, itemId: "jelly-gel", chance: 0.7, minQuantity: 1, maxQuantity: 1 },
        { type: "gold" as const, chance: 0.1, minQuantity: 2, maxQuantity: 3 },
      ],
    };

    expect(generateLootDrops(dropTable, createRegistry(), createRandom([0.85, 0.25]))).toEqual([]);
    expect(generateLootDrops(dropTable, createRegistry(), createRandom([0.85, 0, 0.25, 0.9]), {
      quality: "elite",
    })).toEqual([
      { kind: "item", itemId: "jelly-gel", quantity: 2 },
      { kind: "gold", quantity: 6 },
    ]);
  });

  it("can resolve item drops by rarity", () => {
    const drops = generateLootDrops({
      id: "rare-cache",
      entries: [
        { type: "item", rarity: "Rare", chance: 1, minQuantity: 1, maxQuantity: 1 },
      ],
    }, createRegistry(), createRandom([0, 0.75]));

    expect(drops).toEqual([
      { kind: "item", itemId: "rare-lens", quantity: 1 },
    ]);
  });
});

function createRegistry(): DataRegistry {
  return {
    getItem: (id: string) => ({
      id,
      name: id,
      description: "",
      type: "material",
      rarity: id === "rare-lens" ? "Rare" : "Common",
      value: 0,
    }),
    getItems: () => [
      {
        id: "jelly-gel",
        name: "Jelly Gel",
        description: "",
        type: "material",
        rarity: "Common",
        value: 0,
      },
      {
        id: "rare-lens",
        name: "Rare Lens",
        description: "",
        type: "material",
        rarity: "Rare",
        value: 0,
      },
    ],
  } as DataRegistry;
}

function createRandom(values: number[]): () => number {
  let index = 0;
  return () => values[index++] ?? 0;
}
