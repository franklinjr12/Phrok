import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { DialogueDefinition, MapDefinition, NpcDefinition, RegionDefinition } from "../types/dataDefinitions";

const dataPath = join(process.cwd(), "public", "assets", "data");

function readDataFile<T>(fileName: string): T[] {
  return JSON.parse(readFileSync(join(dataPath, fileName), "utf8")) as T[];
}

describe("town content", () => {
  const maps = readDataFile<MapDefinition>("maps.json");
  const npcs = readDataFile<NpcDefinition>("npcs.json");
  const dialogues = readDataFile<DialogueDefinition>("dialogues.json");
  const regions = readDataFile<RegionDefinition>("regions.json");

  it("finalizes Crownfield with core service NPCs and meadow exits", () => {
    const crownfield = findById(maps, "crownfield-town");

    expect(crownfield.type).toBe("town");
    expect(crownfield.npcIds).toEqual(expect.arrayContaining([
      "maela-hearth",
      "borin-lockbar",
      "tessa-vale",
      "orun-brightslag",
      "nima-threadwell",
      "sella-greenward",
      "joric-wayfare",
      "perrin-slate",
      "advanced-class-mentor",
    ]));
    expect(crownfield.portals).toContainEqual(expect.objectContaining({
      targetMapId: "crownfield-meadows",
      targetSpawnName: "TownGateSpawn",
    }));
  });

  it("defines region hubs with expected services and local connections", () => {
    expectHub("mossvale", "mossvale-hub", ["inn", "merchant", "hunter-board", "travel"], [
      "crownfield-town",
      "mossvale-thicket",
      "mossvale-rootcellar",
    ]);
    expectHub("amber-dunes", "amber-dunes-hub", ["inn", "refiner", "crafter", "travel"], [
      "mossvale-hub",
      "amber-dunes-trail",
      "amber-dunes-sandvault",
    ]);
    expectHub("blueharbor-coast", "blueharbor-hub", ["inn", "merchant", "merchant", "travel"], [
      "amber-dunes-hub",
      "blueharbor-beach",
      "blueharbor-tidecaves",
    ]);
    expectHub("ironroot-highlands", "ironroot-hub", ["crafter", "refiner", "merchant", "travel"], [
      "blueharbor-hub",
      "ironroot-high-trail",
      "ironroot-deepmine",
    ]);
    expectHub("moonveil-marsh", "moonveil-hub", ["inn", "advanced-hunter-board", "crafter", "travel"], [
      "ironroot-hub",
      "moonveil-poison-fen",
      "moonveil-bogsanctum",
    ]);
  });

  function expectHub(
    regionId: string,
    mapId: string,
    serviceTypes: string[],
    targetMapIds: string[],
  ): void {
    const region = findById(regions, regionId);
    const map = findById(maps, mapId);
    const mapNpcs = map.npcIds.map((npcId) => findById(npcs, npcId));

    expect(region.mapIds).toContain(mapId);
    expect(map.type).toMatch(/town|coast|highlands|marsh/);
    expect(map.tilemapKey).toBe(`map-${mapId}`);
    expect(map.spawnGroups).toEqual([]);
    expect(map.monsterIds).toEqual([]);
    expect(map.description.length).toBeGreaterThan(60);
    expect(map.portals.map((portal) => portal.targetMapId)).toEqual(targetMapIds);
    expect(mapNpcs.map((npc) => npc.serviceType).sort()).toEqual(serviceTypes.sort());

    for (const npc of mapNpcs) {
      const dialogue = findById(dialogues, npc.dialogueId);
      expect(npc.mapId).toBe(mapId);
      expect(dialogue.lines.length).toBeGreaterThanOrEqual(2);
      expect(dialogue.choices.length).toBe(1);
    }
  }
});

function findById<T extends { id: string }>(entries: T[], id: string): T {
  const entry = entries.find((candidate) => candidate.id === id);

  if (!entry) {
    throw new Error(`Missing content entry "${id}".`);
  }

  return entry;
}
