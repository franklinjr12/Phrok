import { beforeEach, describe, expect, it } from "vitest";
import { createNewGameState } from "../data/gameState";
import { createSaveData, deserializeSaveData, serializeSaveData } from "./autosave";
import { getEquipmentStats } from "./equipment";
import { eventBus } from "./eventBus";
import {
  getRefinedItemName,
  getRefinementPreview,
  refineItem,
} from "./refinement";
import type { ItemDefinition } from "../types/dataDefinitions";

describe("refinement", () => {
  beforeEach(() => {
    eventBus.clear();
  });

  it("previews cost, materials, chance, and rejects non-refinable items", () => {
    const state = createPreparedState();
    const sword = getItem("training-sword");
    const preview = getRefinementPreview(state, sword);

    expect(preview).toMatchObject({
      itemId: "training-sword",
      currentLevel: 0,
      targetLevel: 1,
      goldCost: 20,
      successChance: 1,
      canRefine: true,
    });
    expect(preview.materials).toEqual([
      { itemId: "copper-ore", required: 1, owned: 10, missing: 0 },
    ]);
    expect(getRefinementPreview(state, getItem("jelly-gel"))).toMatchObject({
      canRefine: false,
      blockReason: "not-refinable",
    });
  });

  it("consumes costs, increases level, saves, and improves equipped stats", () => {
    const state = createPreparedState();
    const events: string[] = [];
    eventBus.on("refinementAttempted", ({ itemId, success, previousLevel, nextLevel }) => {
      events.push(`${itemId}:${success}:${previousLevel}->${nextLevel}`);
    });

    const beforeAttack = getEquipmentStats(state.equipment, getItem, state.inventory.refinementLevels).attack;
    const result = refineItem(state, getItem("training-sword"), () => 0.5);
    const afterAttack = getEquipmentStats(state.equipment, getItem, state.inventory.refinementLevels).attack;
    const restored = deserializeSaveData(serializeSaveData(createSaveData(state))).gameState;

    expect(result).toMatchObject({ success: true, previousLevel: 0, nextLevel: 1, consumedGold: 20 });
    expect(state.inventory.items.find((entry) => entry.id === "copper-ore")?.quantity).toBe(9);
    expect(state.inventory.gold).toBe(180);
    expect(afterAttack - beforeAttack).toBe(2);
    expect(getRefinedItemName(state.inventory, getItem("training-sword"))).toBe("Training Sword +1");
    expect(restored.inventory.refinementLevels).toEqual({ "training-sword": 1 });
    expect(events).toEqual(["training-sword:true:0->1"]);
  });

  it("applies configured failure penalties without deleting the item", () => {
    const state = createPreparedState();
    state.inventory.refinementLevels["training-sword"] = 8;

    const result = refineItem(state, getItem("training-sword"), createRandom([0.99, 0.99]));

    expect(result).toMatchObject({
      success: false,
      reason: "failed-roll",
      previousLevel: 8,
      nextLevel: 6,
      consumedGold: 140,
    });
    expect(state.inventory.refinementLevels["training-sword"]).toBe(6);
    expect(state.inventory.items.some((entry) => entry.id === "training-sword")).toBe(true);
    expect(state.equipment.weapon).toBe("training-sword");
  });
});

function createPreparedState() {
  const state = createNewGameState();
  state.inventory.gold = 200;
  state.playerProfile.gold = 200;
  state.inventory.items.push(
    { id: "copper-ore", quantity: 10 },
    { id: "iron-ore", quantity: 10 },
    { id: "silver-ore", quantity: 10 },
    { id: "rune-ore", quantity: 10 },
    { id: "stabilizer", quantity: 10 },
    { id: "boss-catalyst", quantity: 10 },
  );

  return state;
}

function getItem(id: string): ItemDefinition {
  if (id === "training-sword") {
    return {
      id,
      name: "Training Sword",
      description: "",
      type: "weapon",
      value: 10,
    };
  }

  if (id === "jelly-gel") {
    return {
      id,
      name: "Jelly Gel",
      description: "",
      type: "material",
      value: 2,
    };
  }

  return {
    id,
    name: id,
    description: "",
    type: "material",
    value: 0,
  };
}

function createRandom(values: number[]): () => number {
  let index = 0;
  return () => values[index++] ?? 0;
}
