import { readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const dataDir = join(root, "public", "assets", "data");
const mapsDir = join(root, "public", "assets", "maps");
const mapWidth = 25;
const mapHeight = 19;
const tileWidth = 32;
const tileHeight = 32;
const totalTiles = mapWidth * mapHeight;

const placeholderMaps = [
  {
    id: "mossvale-rootcellar",
    name: "Mossvale Rootcellar",
    description: "A quiet mossy cellar staging room below the grove, kept as a safe placeholder for future Rootcellar content.",
    regionId: "mossvale",
    levelRange: { min: 16, max: 22 },
    type: "dungeon",
    portals: [
      { id: "rootcellar-grove-return", name: "Grove Return", targetMapId: "mossvale-hub", targetSpawnName: "RootcellarReturn" },
    ],
    spawnGroups: [],
    monsterIds: [],
    npcIds: [],
    musicKey: "music-green-chapel-dungeon",
    recommendedElements: ["fire", "neutral"],
    dropHighlights: ["moss-fiber", "verdant-core"],
  },
  {
    id: "amber-dunes-sandvault",
    name: "Amber Sandvault",
    description: "A sealed sandstone vault antechamber beside the oasis, reserved as a safe placeholder for future Sandvault content.",
    regionId: "amber-dunes",
    levelRange: { min: 40, max: 48 },
    type: "dungeon",
    portals: [
      { id: "sandvault-oasis-return", name: "Oasis Return", targetMapId: "amber-dunes-hub", targetSpawnName: "SandvaultReturn" },
    ],
    spawnGroups: [],
    monsterIds: [],
    npcIds: [],
    musicKey: "music-buried-sun-dungeon",
    recommendedElements: ["water", "holy"],
    dropHighlights: ["sun-glass", "buried-sun-shard"],
  },
  {
    id: "ironroot-deepmine",
    name: "Ironroot Deepmine",
    description: "A reinforced lift landing beneath Ironroot Camp, kept safe while deeper mine routes are expanded.",
    regionId: "ironroot-highlands",
    levelRange: { min: 42, max: 52 },
    type: "dungeon",
    portals: [
      { id: "deepmine-camp-return", name: "Camp Lift Return", targetMapId: "ironroot-hub", targetSpawnName: "DeepmineReturn" },
    ],
    spawnGroups: [],
    monsterIds: [],
    npcIds: [],
    musicKey: "music-ironroot-mine-dungeon",
    recommendedElements: ["water", "lightning"],
    dropHighlights: ["ironroot-ore", "deep-ore-cluster"],
  },
  {
    id: "moonveil-bogsanctum",
    name: "Moonveil Bogsanctum",
    description: "A warded marsh sanctum threshold beyond Fenwatch, safe for travel while future Bogsanctum encounters are built.",
    regionId: "moonveil-marsh",
    levelRange: { min: 58, max: 68 },
    type: "dungeon",
    portals: [
      { id: "bogsanctum-fenwatch-return", name: "Fenwatch Return", targetMapId: "moonveil-hub", targetSpawnName: "BogsanctumReturn" },
    ],
    spawnGroups: [],
    monsterIds: [],
    npcIds: [],
    musicKey: "music-cursed-bell-dungeon",
    recommendedElements: ["holy", "fire"],
    dropHighlights: ["bog-ichor", "moonlit-reed"],
  },
];

const portalSlots = {
  east: { x: 736, y: 256, width: 64, height: 96, spawn: { x: 704, y: 304 } },
  west: { x: 0, y: 256, width: 64, height: 96, spawn: { x: 80, y: 304 } },
  north: { x: 352, y: 0, width: 96, height: 64, spawn: { x: 400, y: 96 } },
  south: { x: 352, y: 544, width: 96, height: 64, spawn: { x: 400, y: 496 } },
};

const overflowPortalSlots = [
  { x: 736, y: 256, width: 64, height: 96, spawn: { x: 704, y: 304 } },
  { x: 0, y: 256, width: 64, height: 96, spawn: { x: 80, y: 304 } },
  { x: 352, y: 0, width: 96, height: 64, spawn: { x: 400, y: 96 } },
  { x: 352, y: 544, width: 96, height: 64, spawn: { x: 400, y: 496 } },
];

const crownfieldTownNpcSlots = [
  { x: 304, y: 240 },
  { x: 400, y: 240 },
  { x: 496, y: 336 },
  { x: 592, y: 336 },
  { x: 240, y: 432 },
  { x: 336, y: 432 },
  { x: 640, y: 240 },
  { x: 560, y: 464 },
  { x: 400, y: 432 },
];

const hubNpcSlots = [
  { x: 256, y: 224 },
  { x: 544, y: 224 },
  { x: 256, y: 432 },
  { x: 400, y: 432 },
  { x: 544, y: 432 },
];

const fieldNpcSlots = [
  { x: 240, y: 240 },
  { x: 560, y: 240 },
  { x: 400, y: 432 },
];

const monsterSlots = [
  { x: 528, y: 256, width: 128, height: 96 },
  { x: 128, y: 96, width: 128, height: 96 },
  { x: 544, y: 416, width: 128, height: 96 },
  { x: 288, y: 352, width: 128, height: 96 },
  { x: 96, y: 416, width: 128, height: 96 },
  { x: 576, y: 96, width: 128, height: 96 },
];

main();

function main() {
  const mapsPath = join(dataDir, "maps.json");
  const regionsPath = join(dataDir, "regions.json");
  const npcsPath = join(dataDir, "npcs.json");
  const maps = upsertPlaceholderMaps(readJson(mapsPath));
  const regions = updateRegions(readJson(regionsPath), maps);
  const npcs = readJson(npcsPath);
  const incomingSpawns = getIncomingSpawns(maps);

  for (const map of maps) {
    map.tilemapKey = `map-${map.id}`;
  }

  writeJson(mapsPath, maps);
  writeJson(regionsPath, regions);

  const existingMaps = readExistingMaps();
  const npcById = new Map(npcs.map((npc) => [npc.id, npc]));

  for (const map of maps) {
    const existing = existingMaps.get(map.id) ?? existingMaps.get(legacyAssetId(map.id));
    const asset = normalizeAsset(existing ?? createBaseMap(map), map);

    asset.layers = [
      getTileLayer(asset, "Ground") ?? tileLayer(1, "Ground", createGroundData(map)),
      getTileLayer(asset, "Decoration") ?? tileLayer(2, "Decoration", createDecorationData(map)),
      getTileLayer(asset, "Collision") ?? tileLayer(3, "Collision", createCollisionData(map)),
      objectLayer(4, buildObjects(map, maps, incomingSpawns.get(map.id) ?? ["PlayerSpawn"], npcById)),
    ];
    asset.nextlayerid = 5;
    asset.nextobjectid = getNextObjectId(asset);
    writeJson(join(mapsDir, `${map.id}.json`), asset);
  }

  const oldRoadPath = join(mapsDir, "old-road-west.json");
  try {
    rmSync(oldRoadPath);
  } catch {
    // Already gone.
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function upsertPlaceholderMaps(maps) {
  const byId = new Map(maps.map((map) => [map.id, map]));

  for (const placeholder of placeholderMaps) {
    byId.set(placeholder.id, {
      ...placeholder,
      tilemapKey: `map-${placeholder.id}`,
    });
  }

  return maps
    .map((map) => byId.get(map.id))
    .concat(placeholderMaps.filter((map) => !maps.some((entry) => entry.id === map.id)).map((map) => byId.get(map.id)));
}

function updateRegions(regions, maps) {
  const mapsByRegion = new Map();

  for (const map of maps) {
    const entries = mapsByRegion.get(map.regionId) ?? [];
    entries.push(map.id);
    mapsByRegion.set(map.regionId, entries);
  }

  return regions.map((region) => ({
    ...region,
    mapIds: unique([...(region.mapIds ?? []), ...(mapsByRegion.get(region.id) ?? [])]),
  }));
}

function getIncomingSpawns(maps) {
  const incoming = new Map(maps.map((map) => [map.id, ["PlayerSpawn"]]));

  for (const map of maps) {
    for (const portal of map.portals) {
      const spawns = incoming.get(portal.targetMapId) ?? ["PlayerSpawn"];
      spawns.push(portal.targetSpawnName);
      incoming.set(portal.targetMapId, spawns);
    }
  }

  return new Map([...incoming].map(([mapId, spawns]) => [mapId, unique(spawns)]));
}

function readExistingMaps() {
  const existing = new Map();

  for (const fileName of readdirSync(mapsDir).filter((file) => file.endsWith(".json"))) {
    existing.set(fileName.replace(/\.json$/u, ""), readJson(join(mapsDir, fileName)));
  }

  return existing;
}

function legacyAssetId(mapId) {
  return mapId === "crownfield-old-road" ? "old-road-west" : mapId;
}

function normalizeAsset(asset, map) {
  return {
    compressionlevel: asset.compressionlevel ?? -1,
    height: mapHeight,
    infinite: false,
    layers: asset.layers ?? [],
    nextlayerid: 5,
    nextobjectid: asset.nextobjectid ?? 1,
    orientation: "orthogonal",
    renderorder: "right-down",
    tiledversion: "1.11.2",
    tileheight: tileHeight,
    tilesets: asset.tilesets?.length ? asset.tilesets : tilesets(),
    tilewidth: tileWidth,
    type: "map",
    version: "1.10",
    width: mapWidth,
  };
}

function createBaseMap(map) {
  return {
    compressionlevel: -1,
    height: mapHeight,
    infinite: false,
    layers: [
      tileLayer(1, "Ground", createGroundData(map)),
      tileLayer(2, "Decoration", createDecorationData(map)),
      tileLayer(3, "Collision", createCollisionData(map)),
      objectLayer(4, []),
    ],
    nextlayerid: 5,
    nextobjectid: 1,
    orientation: "orthogonal",
    renderorder: "right-down",
    tiledversion: "1.11.2",
    tileheight: tileHeight,
    tilesets: tilesets(),
    tilewidth: tileWidth,
    type: "map",
    version: "1.10",
    width: mapWidth,
  };
}

function getTileLayer(asset, name) {
  const layer = asset.layers?.find((entry) => entry.type === "tilelayer" && entry.name === name);

  if (!layer || layer.width !== mapWidth || layer.height !== mapHeight || !Array.isArray(layer.data)) {
    return null;
  }

  return { ...layer, id: name === "Ground" ? 1 : name === "Decoration" ? 2 : 3 };
}

function tileLayer(id, name, data) {
  return {
    data,
    height: mapHeight,
    id,
    name,
    opacity: name === "Collision" ? 0.42 : 1,
    type: "tilelayer",
    visible: true,
    width: mapWidth,
    x: 0,
    y: 0,
  };
}

function objectLayer(id, objects) {
  return {
    draworder: "topdown",
    id,
    name: "Objects",
    objects,
    opacity: 1,
    type: "objectgroup",
    visible: true,
    x: 0,
    y: 0,
  };
}

function tilesets() {
  return [{
    columns: 2,
    firstgid: 1,
    image: "../tiles/prototype-tiles.png",
    imageheight: 32,
    imagewidth: 64,
    margin: 0,
    name: "prototype-tiles",
    spacing: 0,
    tilecount: 2,
    tileheight: 32,
    tilewidth: 32,
  }];
}

function createGroundData(map) {
  return Array.from({ length: totalTiles }, (_, index) => {
    const x = index % mapWidth;
    const y = Math.floor(index / mapWidth);
    const isPath = x === 12 || y === 9 || (x > 4 && x < 20 && y > 5 && y < 14);

    return isPath || map.type === "town" || map.type === "coast" || map.type === "highlands" || map.type === "marsh" ? 1 : 2;
  });
}

function createDecorationData(map) {
  return Array.from({ length: totalTiles }, (_, index) => {
    const x = index % mapWidth;
    const y = Math.floor(index / mapWidth);
    const offset = seededNumber(map.id);

    return (x * 13 + y * 7 + offset) % 29 === 0 ? 2 : 0;
  });
}

function createCollisionData(map) {
  return Array.from({ length: totalTiles }, (_, index) => {
    const x = index % mapWidth;
    const y = Math.floor(index / mapWidth);
    const isBorder = x === 0 || y === 0 || x === mapWidth - 1 || y === mapHeight - 1;
    const isPortalGap = (y >= 7 && y <= 11 && (x === 0 || x === mapWidth - 1))
      || (x >= 11 && x <= 13 && (y === 0 || y === mapHeight - 1));

    return isBorder && !isPortalGap ? 2 : 0;
  });
}

function buildObjects(map, maps, incomingSpawns, npcById) {
  let id = 1;
  const objects = [];
  const incomingBySpawn = new Map();

  for (const sourceMap of maps) {
    for (const [index, portal] of sourceMap.portals.entries()) {
      if (portal.targetMapId === map.id) {
        incomingBySpawn.set(portal.targetSpawnName, oppositeSlot(portalSlotFor(sourceMap, portal, index)));
      }
    }
  }

  for (const spawnName of incomingSpawns) {
    const slot = spawnName === "PlayerSpawn"
      ? defaultPlayerSpawn(map)
      : incomingBySpawn.get(spawnName) ?? { x: 400, y: 304 };
    objects.push(pointObject(id++, "spawn", spawnName, slot.x, slot.y, []));
  }

  if (map.monsterIds.length === 0 && map.spawnGroups.length === 0) {
    objects.push(rectObject(id++, "safeZone", "TownSafeZone", 96, 96, 608, 384, []));
  } else {
    objects.push(rectObject(id++, "safeZone", "EntranceSafeZone", 32, 224, 160, 160, []));
  }

  for (const object of fixedStarterMeadowObjects(map)) {
    objects.push({ ...object, id: id++ });
  }

  for (const [index, portal] of map.portals.entries()) {
    const slot = portalSlotFor(map, portal, index);
    objects.push(rectObject(id++, "portal", pascal(portal.id), slot.x, slot.y, slot.width, slot.height, [
      property("targetMapId", "string", portal.targetMapId),
      property("targetSpawnName", "string", portal.targetSpawnName),
    ]));
  }

  const npcIds = map.npcIds.filter((npcId) => npcId !== "advanced-class-mentor");
  for (const [index, npcId] of npcIds.entries()) {
    const npc = npcById.get(npcId);
    const slot = npcSlotFor(map, index);
    objects.push(pointObject(id++, "npc", npc?.name ?? title(npcId), slot.x, slot.y, [
      property("npcId", "string", npcId),
    ]));
  }

  if (map.id === "crownfield-meadows") {
    return objects;
  }

  const zones = map.spawnGroups.flatMap((group) => group.monsterIds.map((monsterId) => ({
    id: group.id,
    monsterId,
    maxCount: Math.max(1, Math.ceil(group.maxCount / Math.max(1, group.monsterIds.length))),
  })));

  for (const [index, zone] of zones.entries()) {
    const slot = monsterSlots[index % monsterSlots.length];
    objects.push(rectObject(id++, "monsterSpawn", pascal(`${zone.id}-${zone.monsterId}`), slot.x, slot.y, slot.width, slot.height, [
      property("monsterId", "string", zone.monsterId),
      property("maxCount", "int", zone.maxCount),
      property("respawnMs", "int", 15000),
    ]));
  }

  return objects;
}

function fixedStarterMeadowObjects(map) {
  if (map.id !== "crownfield-meadows") {
    return [];
  }

  return [
    rectObject(0, "monsterSpawn", "JellyGrove", 528, 300, 32, 96, [
      property("monsterId", "string", "green-jelly"),
    ]),
    rectObject(0, "gathering", "Meadow Herbs", 480, 340, 24, 20, []),
    rectObject(0, "treasure", "Old Field Cache", 584, 340, 24, 20, []),
  ];
}

function npcSlotFor(map, index) {
  if (map.id === "crownfield-town") {
    return crownfieldTownNpcSlots[index % crownfieldTownNpcSlots.length];
  }

  if (map.monsterIds.length === 0 && map.npcIds.length > 1) {
    return hubNpcSlots[index % hubNpcSlots.length];
  }

  return fieldNpcSlots[index % fieldNpcSlots.length];
}

function defaultPlayerSpawn(map) {
  if (map.id === "crownfield-town") {
    return { x: 240, y: 304 };
  }

  return { x: 400, y: 304 };
}

function portalSlotFor(map, portal, index) {
  const value = `${map.id} ${portal.id} ${portal.name} ${portal.targetMapId}`.toLowerCase();

  if (value.includes("return") || value.includes("back") || value.includes("ferry") || value.includes("south-road") || value.includes("caravan-west") || value.includes("lift-down")) {
    return portalSlots.west;
  }

  if (value.includes("old-road-west")) {
    return portalSlots.east;
  }

  if (value.includes("door") || value.includes("ruins") || value.includes("cave") || value.includes("tomb") || value.includes("mine") || value.includes("crypt") || value.includes("tower") || value.includes("observatory") || value.includes("rootcellar") || value.includes("sandvault") || value.includes("bogsanctum")) {
    return portalSlots.north;
  }

  if (value.includes("east-gate") || value.includes("edge-path") || value.includes("trail") || value.includes("beach-road") || value.includes("dune-trail") || value.includes("highlands-path") || value.includes("marsh-walk") || value.includes("sewer-approach") || value.includes("road-east") || value.includes("walk")) {
    return portalSlots.east;
  }

  return overflowPortalSlots[index % overflowPortalSlots.length];
}

function oppositeSlot(slot) {
  if (slot.x <= 0) {
    return { x: 704, y: 304 };
  }

  if (slot.x >= 700) {
    return { x: 80, y: 304 };
  }

  if (slot.y <= 0) {
    return { x: 400, y: 496 };
  }

  return { x: 400, y: 96 };
}

function pointObject(id, type, name, x, y, properties) {
  return {
    height: 32,
    id,
    name,
    point: true,
    properties,
    rotation: 0,
    type,
    visible: true,
    width: 32,
    x,
    y,
  };
}

function rectObject(id, type, name, x, y, width, height, properties) {
  return {
    height,
    id,
    name,
    properties,
    rotation: 0,
    type,
    visible: true,
    width,
    x,
    y,
  };
}

function property(name, type, value) {
  return { name, type, value };
}

function getNextObjectId(asset) {
  return Math.max(
    1,
    ...asset.layers
      .filter((layer) => layer.type === "objectgroup")
      .flatMap((layer) => layer.objects.map((object) => object.id + 1)),
  );
}

function seededNumber(value) {
  return [...value].reduce((total, character) => total + character.charCodeAt(0), 0);
}

function pascal(value) {
  return value
    .split(/[^a-z0-9]+/iu)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("");
}

function title(value) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function unique(values) {
  return Array.from(new Set(values));
}
