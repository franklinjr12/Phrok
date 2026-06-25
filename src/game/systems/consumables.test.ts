import { describe, expect, it } from "vitest";
import { createNewGameState } from "../data/gameState";
import type { ItemDefinition, StatusEffectDefinition } from "../types/dataDefinitions";
import {
  cycleAutoPotionThreshold,
  removeNonPersistentConsumableStatusEffects,
  updateAutoPotion,
  useConsumableItem,
} from "./consumables";
import { updateStatusEffects } from "./statusEffects";

const healthPotion: ItemDefinition = {
  id: "minor-health-potion",
  name: "Minor Health Potion",
  description: "",
  type: "consumable",
  value: 6,
  consumableEffect: {
    restoreHp: 35,
    cooldownMs: 8000,
    statusEffectIds: [],
    persistThroughMapTransition: false,
  },
};

const spiritPotion: ItemDefinition = {
  id: "minor-spirit-potion",
  name: "Minor Spirit Potion",
  description: "",
  type: "consumable",
  value: 6,
  consumableEffect: {
    restoreSp: 18,
    cooldownMs: 8000,
    statusEffectIds: [],
    persistThroughMapTransition: false,
  },
};

const guardTonic: ItemDefinition = {
  id: "guard-tonic",
  name: "Guard Tonic",
  description: "",
  type: "consumable",
  value: 10,
  consumableEffect: {
    cooldownMs: 12000,
    statusEffectIds: ["consumable-guarded"],
    persistThroughMapTransition: false,
  },
};

const fleetTonic: ItemDefinition = {
  id: "fleet-tonic",
  name: "Fleet Tonic",
  description: "",
  type: "consumable",
  value: 10,
  consumableEffect: {
    cooldownMs: 12000,
    statusEffectIds: ["consumable-fleet"],
    persistThroughMapTransition: true,
  },
};

const guarded: StatusEffectDefinition = {
  id: "consumable-guarded",
  name: "Guard Tonic",
  description: "Defense up.",
  type: "buff",
  duration: 5000,
  tickInterval: 1000,
  stackBehavior: "refresh",
  maxStacks: 1,
  statModifiers: { derivedStats: { defense: 6 } },
  visualIcon: "icon-consumable-guard",
  dispelRules: { dispellable: true, categories: ["boon"] },
};

const fleet: StatusEffectDefinition = {
  ...guarded,
  id: "consumable-fleet",
  name: "Fleet Tonic",
  duration: 10000,
  visualIcon: "icon-consumable-fleet",
};

const items = new Map([
  [healthPotion.id, healthPotion],
  [spiritPotion.id, spiritPotion],
  [guardTonic.id, guardTonic],
  [fleetTonic.id, fleetTonic],
]);
const effects = new Map([
  [guarded.id, guarded],
  [fleet.id, fleet],
]);

describe("consumables", () => {
  it("restores HP and SP from inventory without exceeding caps and starts cooldowns", () => {
    const state = createNewGameState();
    state.inventory.items.push({ id: healthPotion.id, quantity: 2 }, { id: spiritPotion.id, quantity: 1 });
    state.character.stats.hp = 50;
    state.character.stats.sp = 10;

    const hpResult = useConsumableItem(state, healthPotion, getEffect, 1000);
    expect(hpResult).toMatchObject({
      success: true,
      restoredHp: 23,
      cooldownReadyAt: 9000,
    });
    expect(state.character.stats.hp).toBe(state.character.stats.maxHp);
    expect(state.inventory.items.find((item) => item.id === healthPotion.id)?.quantity).toBe(1);

    const cooldownResult = useConsumableItem(state, healthPotion, getEffect, 2000);
    expect(cooldownResult).toMatchObject({ success: false, reason: "cooldown" });
    expect(state.inventory.items.find((item) => item.id === healthPotion.id)?.quantity).toBe(1);

    const spResult = useConsumableItem(state, spiritPotion, getEffect, 1000);
    expect(spResult).toMatchObject({
      success: true,
      restoredSp: 14,
    });
    expect(state.character.stats.sp).toBe(state.character.stats.maxSp);
  });

  it("applies consumable buffs with icon metadata and expires them", () => {
    const state = createNewGameState();
    state.inventory.items.push({ id: guardTonic.id, quantity: 1 });

    const result = useConsumableItem(state, guardTonic, getEffect, 1000);
    expect(result).toMatchObject({
      success: true,
      appliedStatusEffectIds: ["consumable-guarded"],
    });
    expect(state.character.statusEffects).toMatchObject([
      {
        id: "consumable-guarded",
        sourceId: "guard-tonic",
        sourceKind: "item",
        persistThroughMapTransition: false,
        expiresAt: 6000,
      },
    ]);
    expect(getEffect(state.character.statusEffects[0].id).visualIcon).toBe("icon-consumable-guard");

    updateStatusEffects(state.character.statusEffects, getEffect, 6000);
    expect(state.character.statusEffects).toEqual([]);
  });

  it("keeps only configured consumable buffs through map transitions", () => {
    const state = createNewGameState();
    state.inventory.items.push({ id: guardTonic.id, quantity: 1 }, { id: fleetTonic.id, quantity: 1 });

    useConsumableItem(state, guardTonic, getEffect, 1000);
    useConsumableItem(state, fleetTonic, getEffect, 1000);

    expect(removeNonPersistentConsumableStatusEffects(state)).toEqual(["consumable-guarded"]);
    expect(state.character.statusEffects.map((effect) => effect.id)).toEqual(["consumable-fleet"]);
  });

  it("uses assigned hotbar potions for auto-potion thresholds and respects cooldowns", () => {
    const state = createNewGameState();
    state.inventory.items.push({ id: healthPotion.id, quantity: 2 });
    state.character.hotbar = [{ slot: 2, type: "item", id: healthPotion.id }];
    state.character.consumables.autoPotion.hpThresholdPercent = 50;
    state.character.stats.hp = 30;

    const first = updateAutoPotion(state, getItem, getEffect, 1000);
    expect(first).toMatchObject({ success: true, itemId: healthPotion.id, restoredHp: 35, automatic: true });
    expect(state.character.stats.hp).toBe(65);
    expect(state.inventory.items.find((item) => item.id === healthPotion.id)?.quantity).toBe(1);

    state.character.stats.hp = 30;
    const second = updateAutoPotion(state, getItem, getEffect, 2000);
    expect(second).toMatchObject({ success: false, reason: "cooldown" });
    expect(state.inventory.items.find((item) => item.id === healthPotion.id)?.quantity).toBe(1);
  });

  it("cycles auto-potion thresholds for player configuration", () => {
    const state = createNewGameState();

    expect(cycleAutoPotionThreshold(state, "hp")).toBe(25);
    expect(cycleAutoPotionThreshold(state, "hp")).toBe(50);
    expect(cycleAutoPotionThreshold(state, "sp")).toBe(25);
    expect(state.character.consumables.autoPotion).toEqual({
      hpThresholdPercent: 50,
      spThresholdPercent: 25,
    });
  });
});

function getItem(id: string): ItemDefinition {
  const item = items.get(id);

  if (!item) {
    throw new Error(`Missing item ${id}`);
  }

  return item;
}

function getEffect(id: string): StatusEffectDefinition {
  const effect = effects.get(id);

  if (!effect) {
    throw new Error(`Missing effect ${id}`);
  }

  return effect;
}
