import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type {
  DropTableDefinition,
  ItemDefinition,
  MapDefinition,
  MonsterDefinition,
  RegionDefinition,
} from "../types/dataDefinitions";

const dataPath = join(process.cwd(), "public", "assets", "data");

function readDataFile<T>(fileName: string): T[] {
  return JSON.parse(readFileSync(join(dataPath, fileName), "utf8")) as T[];
}

describe("field map content", () => {
  const maps = readDataFile<MapDefinition>("maps.json");
  const monsters = readDataFile<MonsterDefinition>("monsters.json");
  const items = readDataFile<ItemDefinition>("items.json");
  const dropTables = readDataFile<DropTableDefinition>("drop-tables.json");
  const regions = readDataFile<RegionDefinition>("regions.json");

  it("creates the Crownfield field set with beginner loops, drops, and an elite", () => {
    const fieldSet = expectFieldSet("crownfield", [
      "crownfield-meadows",
      "crownfield-old-road",
      "training-sewers-entrance",
    ], { min: 1, max: 10 });
    const monsterIds = unique(fieldSet.flatMap((map) => map.monsterIds));
    const setMonsters = monsterIds.map((monsterId) => findById(monsters, monsterId));
    const dropHighlights = unique(fieldSet.flatMap((map) => map.dropHighlights));

    expect(monsterIds.length).toBeGreaterThanOrEqual(5);
    expect(setMonsters.some((monster) => monster.elite)).toBe(true);
    expect(fieldSet[0].spawnGroups.every((group) => group.maxCount <= 3)).toBe(true);
    expect(dropHighlights).toEqual(expect.arrayContaining([
      "jelly-gel",
      "hopper-leg",
      "soft-hide",
      "minor-health-potion",
    ]));
    expect(fieldSet[2].portals).toContainEqual(expect.objectContaining({
      targetMapId: "training-sewers",
    }));
  });

  it("creates Mossvale fields with assist plant and beast monsters plus Archer and Thief drops", () => {
    const fieldSet = expectFieldSet("mossvale", [
      "mossvale-edge",
      "deep-mossvale",
      "green-chapel-road",
    ], { min: 10, max: 30 });
    const setMonsters = getSetMonsters(fieldSet);

    expect(setMonsters.some((monster) => monster.behavior === "assist")).toBe(true);
    expect(setMonsters.map((monster) => monster.id)).toEqual(expect.arrayContaining([
      "thorn-runner",
      "grove-stalker",
    ]));
    expect(unique(fieldSet.flatMap((map) => map.dropHighlights))).toEqual(expect.arrayContaining([
      "mosswood-bowgrip",
      "shadowleaf-wraps",
    ]));
    expect(findById(maps, "green-chapel-road").portals).toContainEqual(expect.objectContaining({
      targetMapId: "green-chapel-ruins",
    }));
  });

  it("creates Blueharbor fields with aquatic monsters, water pressure, and Mage or Archer drops", () => {
    const fieldSet = expectFieldSet("blueharbor-coast", [
      "blueharbor-beach",
      "tide-flats",
      "sea-cave-entrance",
    ], { min: 20, max: 35 });
    const setMonsters = getSetMonsters(fieldSet);

    expect(setMonsters.map((monster) => monster.id)).toEqual(expect.arrayContaining([
      "tide-crab",
      "reef-strider",
      "foam-wisp",
    ]));
    expect(setMonsters.some((monster) => monster.behavior === "caster")).toBe(true);
    expect(unique(fieldSet.flatMap((map) => map.dropHighlights))).toEqual(expect.arrayContaining([
      "waterlogged-rune",
      "storm-feather",
    ]));
    expect(findById(maps, "sea-cave-entrance").portals).toContainEqual(expect.objectContaining({
      targetMapId: "tide-cave",
    }));
  });

  it("creates Amber Dunes fields with poison, ambushes, desert materials, and an elite bandit", () => {
    const fieldSet = expectFieldSet("amber-dunes", [
      "amber-dunes-field",
      "bandit-pass",
      "buried-sun-approach",
    ], { min: 35, max: 50 });
    const setMonsters = getSetMonsters(fieldSet);

    expect(setMonsters.map((monster) => monster.id)).toEqual(expect.arrayContaining([
      "dune-scorpion",
      "sand-ambusher",
      "red-sash-captain",
    ]));
    expect(findById(monsters, "red-sash-captain").elite).toBe(true);
    expect(unique(fieldSet.flatMap((map) => map.dropHighlights))).toEqual(expect.arrayContaining([
      "venom-sack",
      "sun-glass",
      "buried-sun-shard",
    ]));
    expect(findById(maps, "buried-sun-approach").portals).toContainEqual(expect.objectContaining({
      targetMapId: "buried-sun-tomb",
    }));
  });

  it("creates Ironroot fields with construct and goblin families plus refinement loot", () => {
    const fieldSet = expectFieldSet("ironroot-highlands", [
      "ironroot-highlands-field",
      "old-quarry",
      "mine-road",
    ], { min: 35, max: 55 });

    expect(getSetMonsters(fieldSet).map((monster) => monster.id)).toEqual(expect.arrayContaining([
      "goblin-sapper",
      "quarry-construct",
      "mine-road-overseer",
    ]));
    expect(unique(fieldSet.flatMap((map) => map.dropHighlights))).toEqual(expect.arrayContaining([
      "ironroot-ore",
      "refined-nickel",
      "quarry-gear",
    ]));
    expect(findById(maps, "mine-road").portals).toContainEqual(expect.objectContaining({
      targetMapId: "ironroot-mine",
    }));
  });

  it("creates Moonveil fields with undead and dark enemies, curse and poison themes, and late materials", () => {
    const fieldSet = expectFieldSet("moonveil-marsh", [
      "moonveil-marsh-field",
      "cursed-bell-road",
      "rotting-fen",
    ], { min: 50, max: 70 });

    expect(getSetMonsters(fieldSet).map((monster) => monster.id)).toEqual(expect.arrayContaining([
      "bell-haunt",
      "rotting-knight",
      "black-reed-stalker",
    ]));
    expect(unique(fieldSet.flatMap((map) => map.dropHighlights))).toEqual(expect.arrayContaining([
      "curse-bell-clapper",
      "black-reed-oil",
      "grave-silk",
    ]));
    expect(findById(maps, "rotting-fen").portals).toContainEqual(expect.objectContaining({
      targetMapId: "cursed-bell-crypt",
    }));
  });

  it("creates Starfall exterior maps with endgame entrances, rare materials, constructs, and elites", () => {
    const fieldSet = expectFieldSet("starfall-tower", [
      "starfall-approach",
      "rune-archive-exterior",
      "fallen-observatory-approach",
    ], { min: 65, max: 99 });
    const setMonsters = getSetMonsters(fieldSet);

    expect(setMonsters.map((monster) => monster.id)).toEqual(expect.arrayContaining([
      "rune-archivist",
      "astral-construct",
      "fallen-observer",
    ]));
    expect(setMonsters.some((monster) => monster.elite)).toBe(true);
    expect(unique(fieldSet.flatMap((map) => map.dropHighlights))).toEqual(expect.arrayContaining([
      "star-iron",
      "rune-glass",
      "observatory-lens",
    ]));
    expect(findById(maps, "fallen-observatory-approach").portals).toContainEqual(expect.objectContaining({
      targetMapId: "fallen-observatory",
    }));
  });

  it("keeps map drops backed by item and drop table data", () => {
    const itemIds = new Set(items.map((item) => item.id));
    const dropTableIds = new Set(dropTables.map((table) => table.id));

    for (const map of maps.filter((entry) => entry.type === "field")) {
      for (const itemId of map.dropHighlights) {
        expect(itemIds.has(itemId), `${map.id} highlights missing item ${itemId}`).toBe(true);
      }

      for (const monsterId of map.monsterIds) {
        const monster = findById(monsters, monsterId);
        expect(dropTableIds.has(monster.dropTableId), `${monsterId} missing drop table`).toBe(true);
      }
    }
  });

  function expectFieldSet(
    regionId: string,
    mapIds: string[],
    levelRange: { min: number; max: number },
  ): MapDefinition[] {
    const region = findById(regions, regionId);
    const fieldSet = mapIds.map((mapId) => findById(maps, mapId));

    expect(region.levelRange).toEqual(levelRange);
    expect(region.mapIds).toEqual(expect.arrayContaining(mapIds));
    expect(Math.min(...fieldSet.map((map) => map.levelRange.min))).toBe(levelRange.min);
    expect(Math.max(...fieldSet.map((map) => map.levelRange.max))).toBe(levelRange.max);

    for (const map of fieldSet) {
      expect(map.regionId).toBe(regionId);
      expect(map.type).toBe("field");
      expect(map.spawnGroups.length).toBeGreaterThanOrEqual(2);
      expect(map.monsterIds.length).toBeGreaterThanOrEqual(2);
      expect(map.dropHighlights.length).toBeGreaterThanOrEqual(2);
    }

    return fieldSet;
  }

  function getSetMonsters(fieldSet: MapDefinition[]): MonsterDefinition[] {
    return unique(fieldSet.flatMap((map) => map.monsterIds))
      .map((monsterId) => findById(monsters, monsterId));
  }
});

function findById<T extends { id: string }>(entries: T[], id: string): T {
  const entry = entries.find((candidate) => candidate.id === id);

  if (!entry) {
    throw new Error(`Missing content entry "${id}".`);
  }

  return entry;
}

function unique(entries: string[]): string[] {
  return Array.from(new Set(entries));
}
