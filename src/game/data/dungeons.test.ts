import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type {
  DropTableDefinition,
  DungeonDefinition,
  ItemDefinition,
  MapDefinition,
  MonsterDefinition,
  RegionDefinition,
} from "../types/dataDefinitions";

const dataPath = join(process.cwd(), "public", "assets", "data");

function readDataFile<T>(fileName: string): T[] {
  return JSON.parse(readFileSync(join(dataPath, fileName), "utf8")) as T[];
}

describe("dungeon content", () => {
  const dungeons = readDataFile<DungeonDefinition>("dungeons.json");
  const maps = readDataFile<MapDefinition>("maps.json");
  const monsters = readDataFile<MonsterDefinition>("monsters.json");
  const items = readDataFile<ItemDefinition>("items.json");
  const dropTables = readDataFile<DropTableDefinition>("drop-tables.json");
  const regions = readDataFile<RegionDefinition>("regions.json");

  const expectedDungeons = [
    { id: "old-sewers", mapId: "training-sewers", bossId: "sewer-glutton", range: { min: 5, max: 15 } },
    { id: "green-chapel-ruins", mapId: "green-chapel-ruins", bossId: "thorn-priest", range: { min: 15, max: 25 } },
    { id: "tide-cave", mapId: "tide-cave", bossId: "sunken-corsair", range: { min: 25, max: 38 } },
    { id: "ironroot-mine", mapId: "ironroot-mine", bossId: "brass-burrower", range: { min: 35, max: 50 } },
    { id: "buried-sun-tomb", mapId: "buried-sun-tomb", bossId: "dune-tyrant", range: { min: 40, max: 55 } },
    { id: "cursed-bell-crypt", mapId: "cursed-bell-crypt", bossId: "bell-wraith", range: { min: 55, max: 70 } },
    { id: "starfall-tower", mapId: "starfall-astral-spire", bossId: "rune-chimera", range: { min: 70, max: 90 } },
    { id: "fallen-observatory", mapId: "fallen-observatory", bossId: "fallen-star-saint", range: { min: 85, max: 99 } },
  ];

  it("implements exactly the M5-E04 dungeon set with maps, ranges, replay loops, and bosses", () => {
    expect(dungeons.map((dungeon) => dungeon.id)).toEqual(expectedDungeons.map((dungeon) => dungeon.id));

    for (const expected of expectedDungeons) {
      const dungeon = findById(dungeons, expected.id);
      const map = findById(maps, expected.mapId);
      const boss = findById(monsters, expected.bossId);

      expect(dungeon.mapId).toBe(expected.mapId);
      expect(dungeon.levelRange).toEqual(expected.range);
      expect(dungeon.bossId).toBe(expected.bossId);
      expect(dungeon.replayable).toBe(true);
      expect(dungeon.roomPlan.length).toBeGreaterThanOrEqual(5);
      expect(dungeon.roomPlan.some((room) => room.encounterRole === "boss")).toBe(true);
      expect(map.levelRange).toEqual(expected.range);
      expect(["dungeon", "tower"]).toContain(map.type);
      expect(map.monsterIds).toContain(expected.bossId);
      expect(map.spawnGroups.reduce((sum, group) => sum + group.maxCount, 0)).toBeGreaterThan(5);
      expect(boss.boss).toBe(true);
    }
  });

  it("covers the requested themes, hazards, rewards, shortcuts, and boss mechanics", () => {
    expect(findById(dungeons, "old-sewers")).toMatchObject({
      enemyThemes: expect.arrayContaining(["sewer"]),
      rewardItemIds: expect.arrayContaining(["rusted-buckler", "sewer-moss"]),
      rareMaterialIds: expect.arrayContaining(["glutton-gland"]),
    });
    expect(findById(dungeons, "green-chapel-ruins")).toMatchObject({
      enemyThemes: expect.arrayContaining(["plant", "spirit"]),
      shortcutUnlockId: "nave-shortcut",
      rewardItemIds: expect.arrayContaining(["chapel-prayer-bead"]),
    });
    expect(findById(dungeons, "tide-cave")).toMatchObject({
      enemyThemes: expect.arrayContaining(["aquatic", "pirate"]),
      rareMaterialIds: expect.arrayContaining(["abyssal-coral"]),
    });
    expect(findById(dungeons, "ironroot-mine")).toMatchObject({
      enemyThemes: expect.arrayContaining(["construct"]),
      rareMaterialIds: expect.arrayContaining(["brass-burrower-plate"]),
      bossMechanics: expect.arrayContaining(["burrow vanish", "linear charge"]),
    });
    expect(findById(dungeons, "buried-sun-tomb")).toMatchObject({
      enemyThemes: expect.arrayContaining(["undead", "reptile"]),
      rareMaterialIds: expect.arrayContaining(["sun-sigil-fragment"]),
    });
    expect(findById(dungeons, "cursed-bell-crypt")).toMatchObject({
      enemyThemes: expect.arrayContaining(["undead", "curse"]),
      rewardItemIds: expect.arrayContaining(["hallowed-bell-charm"]),
      bossMechanics: expect.arrayContaining(["bell toll telegraph"]),
    });
    expect(findById(dungeons, "starfall-tower")).toMatchObject({
      enemyThemes: expect.arrayContaining(["arcane", "elemental"]),
      rewardItemIds: expect.arrayContaining(["starbound-mantle"]),
      unlocksMapId: "fallen-observatory",
    });
    expect(findById(dungeons, "fallen-observatory")).toMatchObject({
      rareMaterialIds: expect.arrayContaining(["mythic-meteor-core"]),
      mechanics: expect.arrayContaining(["late-game farming", "endgame build checks", "post-campaign replay loop"]),
    });

    for (const dungeon of dungeons) {
      expect(dungeon.hazards.length, `${dungeon.id} hazard count`).toBeGreaterThanOrEqual(2);
      expect(dungeon.bossMechanics.length, `${dungeon.id} boss mechanics`).toBeGreaterThanOrEqual(2);
      expect(dungeon.rewardItemIds.length + dungeon.rareMaterialIds.length, `${dungeon.id} rewards`).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps dungeon references backed by region, monster, item, and drop table data", () => {
    const itemIds = new Set(items.map((item) => item.id));
    const dropTableIds = new Set(dropTables.map((table) => table.id));

    for (const dungeon of dungeons) {
      const map = findById(maps, dungeon.mapId);
      const region = findById(regions, map.regionId);

      expect(region.dungeonIds).toContain(dungeon.id);

      for (const itemId of [...dungeon.rewardItemIds, ...dungeon.rareMaterialIds, ...map.dropHighlights]) {
        expect(itemIds.has(itemId), `${dungeon.id} missing item ${itemId}`).toBe(true);
      }

      for (const monsterId of map.monsterIds) {
        const monster = findById(monsters, monsterId);
        expect(dropTableIds.has(monster.dropTableId), `${monsterId} missing drop table`).toBe(true);
      }
    }
  });
});

function findById<T extends { id: string }>(entries: T[], id: string): T {
  const entry = entries.find((candidate) => candidate.id === id);

  if (!entry) {
    throw new Error(`Missing content entry "${id}".`);
  }

  return entry;
}
