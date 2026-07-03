import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { MapDefinition } from "../types/dataDefinitions";

interface TiledProperty {
  name: string;
  value: string | number | boolean;
}

interface TiledObject {
  name: string;
  type: string;
  properties?: TiledProperty[];
}

interface TiledObjectLayer {
  name: string;
  objects: TiledObject[];
  type: "objectgroup";
}

interface TiledMap {
  layers: Array<TiledObjectLayer | { name: string; type: string }>;
}

const dataPath = join(process.cwd(), "public", "assets", "data");
const mapAssetPath = join(process.cwd(), "public", "assets", "maps");

function readDataFile<T>(fileName: string): T[] {
  return JSON.parse(readFileSync(join(dataPath, fileName), "utf8")) as T[];
}

function readMapAsset(mapId: string): TiledMap {
  return JSON.parse(readFileSync(join(mapAssetPath, `${mapId}.json`), "utf8")) as TiledMap;
}

describe("map assets", () => {
  const maps = readDataFile<MapDefinition>("maps.json");
  const mapIds = new Set(maps.map((map) => map.id));
  const incomingSpawns = new Map<string, Set<string>>();

  for (const map of maps) {
    incomingSpawns.set(map.id, new Set(["PlayerSpawn"]));
  }

  for (const map of maps) {
    for (const portal of map.portals) {
      incomingSpawns.get(portal.targetMapId)?.add(portal.targetSpawnName);
    }
  }

  it("uses one tilemap asset per map definition", () => {
    for (const map of maps) {
      expect(map.tilemapKey, map.id).toBe(`map-${map.id}`);
      expect(existsSync(join(mapAssetPath, `${map.id}.json`)), map.id).toBe(true);
    }
  });

  it("keeps portals pointed at defined maps and matching Tiled objects", () => {
    for (const map of maps) {
      const asset = readMapAsset(map.id);
      const objects = getObjects(asset);
      const portalObjects = objects.filter((object) => object.type === "portal");

      expect(portalObjects.length, map.id).toBe(map.portals.length);

      for (const portal of map.portals) {
        expect(mapIds.has(portal.targetMapId), `${map.id}:${portal.id}`).toBe(true);
        expect(portalObjects).toContainEqual(expect.objectContaining({
          properties: expect.arrayContaining([
            expect.objectContaining({ name: "targetMapId", value: portal.targetMapId }),
            expect.objectContaining({ name: "targetSpawnName", value: portal.targetSpawnName }),
          ]),
        }));
      }
    }
  });

  it("defines every incoming portal spawn in the target asset", () => {
    for (const map of maps) {
      const spawnObjects = getObjects(readMapAsset(map.id)).filter((object) => object.type === "spawn");
      const spawnNames = new Set(spawnObjects.map((object) => object.name));

      for (const spawnName of incomingSpawns.get(map.id) ?? []) {
        expect(spawnNames.has(spawnName), `${map.id}:${spawnName}`).toBe(true);
      }
    }
  });
});

function getObjects(asset: TiledMap): TiledObject[] {
  const layer = asset.layers.find((entry): entry is TiledObjectLayer => entry.type === "objectgroup" && entry.name === "Objects");

  return layer?.objects ?? [];
}
