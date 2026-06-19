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
});

function createRegistry(): DataRegistry {
  return {
    getItem: (id: string) => ({
      id,
      name: id,
      description: "",
      type: "material",
      value: 0,
    }),
  } as DataRegistry;
}

function createRandom(values: number[]): () => number {
  let index = 0;
  return () => values[index++] ?? 0;
}
