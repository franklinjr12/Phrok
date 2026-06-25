import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { DialogueDefinition, MapDefinition, NpcDefinition, RegionDefinition, ShopDefinition } from "../types/dataDefinitions";

const dataPath = join(process.cwd(), "public", "assets", "data");

function readDataFile<T>(fileName: string): T[] {
  return JSON.parse(readFileSync(join(dataPath, fileName), "utf8")) as T[];
}

describe("town content", () => {
  const maps = readDataFile<MapDefinition>("maps.json");
  const npcs = readDataFile<NpcDefinition>("npcs.json");
  const dialogues = readDataFile<DialogueDefinition>("dialogues.json");
  const regions = readDataFile<RegionDefinition>("regions.json");
  const shops = readDataFile<ShopDefinition>("shops.json");

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
      "mossvale-edge",
      "mossvale-rootcellar",
    ]);
    expectHub("amber-dunes", "amber-dunes-hub", ["inn", "refiner", "merchant", "travel"], [
      "mossvale-hub",
      "amber-dunes-field",
      "amber-dunes-sandvault",
    ]);
    expectHub("blueharbor-coast", "blueharbor-hub", ["inn", "merchant", "appraiser", "travel"], [
      "amber-dunes-hub",
      "blueharbor-beach",
      "sea-cave-entrance",
    ]);
    expectHub("ironroot-highlands", "ironroot-hub", ["crafter", "refiner", "merchant", "travel"], [
      "blueharbor-hub",
      "ironroot-highlands-field",
      "ironroot-deepmine",
    ]);
    expectHub("moonveil-marsh", "moonveil-hub", ["inn", "advanced-hunter-board", "merchant", "travel"], [
      "ironroot-hub",
      "moonveil-marsh-field",
      "moonveil-bogsanctum",
    ]);
  });

  it("defines region-specific market stock and an appraiser desk", () => {
    expectShop("crownfield-market", "crownfield", ["minor-health-potion", "shortbow"]);
    expectShop("mossvale-provisions", "mossvale", ["moss-fiber", "weapon-mossline-bow-3"]);
    expectShop("blueharbor-fishmarket", "blueharbor-coast", ["tide-shell", "sigil-tide-sigil-3"]);
    expectShop("amber-dunes-supply", "amber-dunes", ["dune-silk", "sun-glass"]);
    expectShop("ironroot-materials", "ironroot-highlands", ["ironroot-ore", "refined-nickel"]);
    expectShop("moonveil-relic-market", "moonveil-marsh", ["moonlit-reed", "support-forager-support-charm-7"]);

    const appraiser = findById(shops, "blueharbor-appraiser");
    expect(appraiser.serviceType).toBe("appraiser");
    expect(appraiser.appraiser).toMatchObject({
      minIdentifyCost: 15,
      improvedSellMultiplier: 1.35,
    });
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

  function expectShop(shopId: string, regionId: string, itemIds: string[]): void {
    const shop = findById(shops, shopId);
    const npc = findById(npcs, shop.npcId);

    expect(shop.regionId).toBe(regionId);
    expect(shop.serviceType).toBe("shop");
    expect(npc.shopId).toBe(shop.id);
    expect(shop.stock.map((stock) => stock.itemId)).toEqual(expect.arrayContaining(itemIds));
    expect(shop.stock.every((stock) => stock.quantity > 0 && stock.priceMultiplier >= 1)).toBe(true);
  }
});

function findById<T extends { id: string }>(entries: T[], id: string): T {
  const entry = entries.find((candidate) => candidate.id === id);

  if (!entry) {
    throw new Error(`Missing content entry "${id}".`);
  }

  return entry;
}
