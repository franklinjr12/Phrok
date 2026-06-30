import { describe, expect, it } from "vitest";
import { createNewGameState } from "../data/gameState";
import type { DataRegistry } from "../data/dataRegistry";
import type { ItemDefinition, MonsterDefinition } from "../types/dataDefinitions";
import {
  beginBossArenaEncounter,
  completeBossEncounter,
  recordBossPhase,
  resetActiveBossEncounter,
  resolveBossPhase,
  summonMvp,
  updateMvpRespawnTimers,
} from "./bossEncounters";

describe("bossEncounters", () => {
  it("locks arena encounters, resets on death, and unlocks exit after victory", () => {
    const state = createNewGameState();
    const boss = createBoss();

    expect(beginBossArenaEncounter(state, boss, "verdant-arena")).toMatchObject({
      bossId: "king-slime-verdant",
      locked: true,
    });
    expect(state.worldFlags["boss:king-slime-verdant:locked"]).toBe(true);
    expect(resetActiveBossEncounter(state)).toBe("king-slime-verdant");
    expect(state.worldFlags["boss:king-slime-verdant:locked"]).toBe(false);

    beginBossArenaEncounter(state, boss, "verdant-arena");
    const rewards = completeBossEncounter(state, boss, createItemRegistry());

    expect(rewards).toEqual(["verdant-crown-gel"]);
    expect(state.bossEncounters.defeatedBossIds).toContain("king-slime-verdant");
    expect(state.bossEncounters.victoryExitUnlockedBossIds).toContain("king-slime-verdant");
    expect(state.inventory.items).toContainEqual({ id: "verdant-crown-gel", quantity: 1 });
    expect(state.bossEncounters.activeBossId).toBeNull();
  });

  it("resolves JSON-backed boss phases and stores phase boundary state for save/load", () => {
    const state = createNewGameState();
    const boss = createBoss();

    const opening = resolveBossPhase(boss, 800, 1000);
    const pressure = resolveBossPhase(boss, 500, 1000);
    const enrage = resolveBossPhase(boss, 200, 1000);

    expect(opening?.id).toBe("opening");
    expect(pressure?.id).toBe("pressure");
    expect(enrage?.id).toBe("enrage");
    expect(recordBossPhase(state, boss.id, pressure)).toBe("king-slime-verdant:none->pressure");
    expect(recordBossPhase(state, boss.id, pressure)).toBeNull();
    expect(state.bossEncounters.lastPhaseByBossId[boss.id]).toBe("pressure");
  });

  it("summons repeatable MVPs by consuming materials and tracks activity-based respawn", () => {
    const state = createNewGameState();
    const boss = createBoss();
    state.inventory.items = [
      { id: "jelly-gel", quantity: 8 },
      { id: "hopper-leg", quantity: 4 },
    ];

    expect(summonMvp(state, boss)).toMatchObject({
      success: true,
      arenaMapId: "verdant-arena",
      consumedItemIds: ["jelly-gel", "hopper-leg"],
    });
    expect(state.inventory.items).toEqual([]);
    expect(state.bossEncounters.activeBossId).toBe(boss.id);

    state.bossEncounters.mvpRespawnTimers[boss.id] = 1000;
    expect(updateMvpRespawnTimers(state, [boss], 400)).toEqual([]);
    expect(state.bossEncounters.mvpRespawnTimers[boss.id]).toBe(600);
    expect(updateMvpRespawnTimers(state, [boss], 600)).toEqual([boss.id]);
    expect(state.worldFlags[`mvp:${boss.id}:ready`]).toBe(true);
  });
});

function createBoss(): MonsterDefinition {
  return {
    id: "king-slime-verdant",
    name: "King Slime Verdant",
    family: "slime",
    element: "earth",
    level: 12,
    hp: 440,
    attack: 22,
    defense: 16,
    xpReward: 260,
    dropTableId: "king-slime-verdant-drops",
    behavior: "assist",
    aggroRange: 250,
    attackRange: 84,
    leashDistance: 420,
    leashTimeoutMs: 9000,
    assistRadius: 180,
    castRange: 160,
    castCooldownMs: 2200,
    respawnMs: 90000,
    elite: false,
    boss: true,
    bossArena: {
      mapId: "verdant-arena",
      spawnZoneId: "verdant-throne",
      exitPortalId: "meadow-return",
      locksEncounter: true,
      canLeaveAfterVictory: true,
    },
    bossPhases: [
      { id: "opening", hpPercent: 100, behavior: "assist", attackIds: ["split-crown"] },
      { id: "pressure", hpPercent: 66, behavior: "aggressive", vfxKey: "phase-surge", attackIds: ["split-crown", "gel-tide"] },
      { id: "enrage", hpPercent: 33, behavior: "aggressive", dialogueId: "king-slime-enrage", attackIds: ["royal-bounce"] },
    ],
    mvp: {
      regional: true,
      respawnActivityMs: 1000,
      summon: {
        arenaMapId: "verdant-arena",
        requiredMaterials: [
          { itemId: "jelly-gel", quantity: 8 },
          { itemId: "hopper-leg", quantity: 4 },
        ],
        repeatable: true,
      },
      specialRewardItemIds: ["verdant-crown-gel"],
    },
  };
}

function createItemRegistry(): DataRegistry {
  const items: Record<string, ItemDefinition> = {
    "verdant-crown-gel": {
      id: "verdant-crown-gel",
      name: "Verdant Crown Gel",
      description: "",
      type: "material",
      value: 46,
    },
  };

  return {
    getItem: (id: string) => items[id],
  } as DataRegistry;
}
