import { describe, expect, it } from "vitest";
import { createNewGameState } from "../data/gameState";
import {
  acceptHuntingContract,
  getRegionalHuntingContracts,
  recordHuntingBoardKill,
  refreshHuntingBoard,
  turnInHuntingContract,
  unlockBossContractForMonster,
} from "./huntingBoard";
import type { DataRegistry } from "../data/dataRegistry";
import type { DropTableDefinition, ItemDefinition, MonsterDefinition, RegionDefinition, XpTableDefinition } from "../types/dataDefinitions";

describe("hunting board", () => {
  it("lists regional normal, elite, and locked boss contracts", () => {
    const state = createNewGameState();
    const dataRegistry = createTestRegistry();

    const contracts = getRegionalHuntingContracts(state, dataRegistry, "crownfield");

    expect(contracts.map((contract) => contract.rank)).toEqual(["normal", "normal", "elite", "boss"]);
    expect(contracts[0]).toMatchObject({
      regionId: "crownfield",
      targetMonsterId: "green-jelly",
      targetCount: 3,
      locked: false,
    });
    expect(contracts.at(-1)).toMatchObject({
      targetMonsterId: "sewer-glutton",
      locked: true,
      lockReason: "Defeat region boss once",
    });
  });

  it("accepts, tracks kills, turns in rewards, and blocks same-cycle repeat", () => {
    const state = createNewGameState();
    const dataRegistry = createTestRegistry();
    const contract = getRegionalHuntingContracts(state, dataRegistry, "crownfield")[0];

    expect(acceptHuntingContract(state, contract)).toBe(true);
    expect(acceptHuntingContract(state, contract)).toBe(false);
    expect(recordHuntingBoardKill(state, dataRegistry, "green-jelly")).toEqual([`${contract.id}:1/3`]);
    recordHuntingBoardKill(state, dataRegistry, "green-jelly");
    recordHuntingBoardKill(state, dataRegistry, "green-jelly");

    expect(turnInHuntingContract(state, dataRegistry, contract.id)).toBe(true);
    expect(state.huntingBoard.completedContractIds).toContain(contract.id);
    expect(state.inventory.gold).toBe(contract.rewardGold);
    expect(state.playerProfile.xp).toBe(contract.rewardXp);
    expect(state.inventory.items.some((item) => item.id === "jelly-gel")).toBe(true);
    expect(acceptHuntingContract(state, contract)).toBe(false);
  });

  it("refreshes by gameplay reason only when no active contract blocks it", () => {
    const state = createNewGameState();
    const dataRegistry = createTestRegistry();
    const contract = getRegionalHuntingContracts(state, dataRegistry, "crownfield")[0];

    acceptHuntingContract(state, contract);
    expect(refreshHuntingBoard(state, "map-clear")).toBe(false);
    state.huntingBoard.activeContractIds = [];

    expect(refreshHuntingBoard(state, "map-clear")).toBe(true);
    expect(state.huntingBoard.refreshCount).toBe(1);
    expect(state.huntingBoard.lastRefreshReason).toBe("map-clear");
  });

  it("unlocks boss contracts after matching boss kill", () => {
    const state = createNewGameState();
    const dataRegistry = createTestRegistry();

    expect(unlockBossContractForMonster(state, dataRegistry, "sewer-glutton")).toBe("crownfield");
    expect(getRegionalHuntingContracts(state, dataRegistry, "crownfield").at(-1)?.locked).toBe(false);
  });
});

function createTestRegistry(): DataRegistry {
  const items: Record<string, ItemDefinition> = {
    "jelly-gel": createItem("jelly-gel"),
    "hopper-leg": createItem("hopper-leg"),
    "road-token": createItem("road-token"),
    "glutton-gland": createItem("glutton-gland"),
  };
  const monsters: Record<string, MonsterDefinition> = {
    "green-jelly": createMonster("green-jelly", "Green Jelly", 1, "green-jelly-drops"),
    "field-hopper": createMonster("field-hopper", "Field Hopper", 3, "field-hopper-drops"),
    "old-road-bruiser": createMonster("old-road-bruiser", "Old Road Bruiser", 10, "old-road-bruiser-drops", true),
    "sewer-glutton": createMonster("sewer-glutton", "Sewer Glutton", 15, "sewer-glutton-drops", false, true),
  };
  const regions: Record<string, RegionDefinition> = {
    crownfield: {
      id: "crownfield",
      name: "Crownfield",
      levelRange: { min: 1, max: 10 },
      description: "",
      mapIds: [],
      dungeonIds: [],
      monsterIds: ["green-jelly", "field-hopper"],
      bossIds: ["old-road-bruiser", "sewer-glutton"],
    },
  };
  const dropTables: Record<string, DropTableDefinition> = {
    "green-jelly-drops": createDropTable("green-jelly-drops", "jelly-gel"),
    "field-hopper-drops": createDropTable("field-hopper-drops", "hopper-leg"),
    "old-road-bruiser-drops": createDropTable("old-road-bruiser-drops", "road-token"),
    "sewer-glutton-drops": createDropTable("sewer-glutton-drops", "glutton-gland"),
  };
  const xpTable: XpTableDefinition = { id: "standard", levels: { 2: 100, 3: 250 } };

  return {
    getRegion: (id: string) => regions[id],
    getRegions: () => Object.values(regions),
    getMonster: (id: string) => monsters[id],
    getDropTable: (id: string) => dropTables[id],
    getItem: (id: string) => items[id],
    getXpTable: () => xpTable,
  } as unknown as DataRegistry;
}

function createItem(id: string): ItemDefinition {
  return {
    id,
    name: id,
    description: "",
    type: "material",
    value: 1,
  };
}

function createMonster(
  id: string,
  name: string,
  level: number,
  dropTableId: string,
  elite = false,
  boss = false,
): MonsterDefinition {
  return {
    id,
    name,
    level,
    hp: 10,
    attack: 1,
    defense: 0,
    xpReward: level * 5,
    dropTableId,
    behavior: "passive",
    aggroRange: 100,
    attackRange: 50,
    leashDistance: 200,
    leashTimeoutMs: 5000,
    assistRadius: 100,
    castRange: 100,
    castCooldownMs: 1000,
    respawnMs: 1000,
    elite,
    boss,
  };
}

function createDropTable(id: string, itemId: string): DropTableDefinition {
  return {
    id,
    entries: [{ itemId, chance: 1, minQuantity: 1, maxQuantity: 1 }],
  };
}
