import { describe, expect, it } from "vitest";
import { decideEnemyAiIntent, getEffectiveEnemyRespawnMs, parseSpawnZones, pickSpawnPoint } from "./enemySpawning";

describe("enemy spawning", () => {
  it("reads monster ID, max count, respawn, and bounds from Tiled objects", () => {
    const zones = parseSpawnZones([
      {
        name: "JellyGrove",
        type: "monsterSpawn",
        x: 528,
        y: 300,
        width: 128,
        height: 96,
        properties: [
          { name: "monsterId", value: "green-jelly" },
          { name: "maxCount", value: 3 },
          { name: "respawnMs", value: 4500 },
        ],
      },
    ], []);

    expect(zones).toEqual([
      {
        id: "JellyGrove",
        name: "JellyGrove",
        monsterId: "green-jelly",
        maxCount: 3,
        respawnMs: 4500,
        bounds: { x: 528, y: 300, width: 128, height: 96 },
      },
    ]);
  });

  it("spawns inside zone bounds", () => {
    expect(pickSpawnPoint({
      id: "zone",
      name: "Zone",
      monsterId: "green-jelly",
      maxCount: 1,
      respawnMs: 1000,
      bounds: { x: 10, y: 20, width: 100, height: 50 },
    }, () => 0.5)).toEqual({ x: 60, y: 45 });
  });

  it("ignores generic Tiled scratch spawns in release maps", () => {
    const zones = parseSpawnZones([
      {
        name: "JellyGrove",
        type: "monsterSpawn",
        properties: [{ name: "monsterId", value: "green-jelly" }],
      },
      {
        name: "Spawn11 Copy",
        type: "monsterSpawn",
        properties: [{ name: "monsterId", value: "green-jelly" }],
      },
    ], []);

    expect(zones.map((zone) => zone.name)).toEqual(["JellyGrove"]);
  });

  it("slows elite and boss respawns compared with normal monsters", () => {
    expect(getEffectiveEnemyRespawnMs(4000, { elite: false, boss: false })).toBe(4000);
    expect(getEffectiveEnemyRespawnMs(4000, { elite: true, boss: false })).toBe(10000);
    expect(getEffectiveEnemyRespawnMs(4000, { elite: false, boss: true })).toBe(16000);
  });
});

describe("enemy AI intent", () => {
  const baseState = {
    mode: "idle" as const,
    home: { x: 0, y: 0 },
    position: { x: 0, y: 0 },
    playerPosition: { x: 40, y: 0 },
    damagedByPlayer: false,
    assistedByAlly: false,
    allyInCombat: false,
    elapsedInCombatMs: 0,
    aggroRange: 80,
    attackRange: 50,
    leashDistance: 200,
    leashTimeoutMs: 6000,
    assistRadius: 120,
    castRange: 120,
    silenced: false,
  };

  it("keeps passive enemies idle until damaged", () => {
    expect(decideEnemyAiIntent({ ...baseState, behavior: "passive" })).toBe("idle");
    expect(decideEnemyAiIntent({ ...baseState, behavior: "passive", damagedByPlayer: true })).toBe("attack");
  });

  it("keeps returning enemies moving home before idling again", () => {
    expect(decideEnemyAiIntent({
      ...baseState,
      behavior: "passive",
      mode: "returning",
      position: { x: 40, y: 0 },
      playerPosition: { x: 40, y: 0 },
    })).toBe("return");
    expect(decideEnemyAiIntent({
      ...baseState,
      behavior: "passive",
      mode: "returning",
      position: { x: 4, y: 0 },
      playerPosition: { x: 40, y: 0 },
    })).toBe("idle");
  });

  it("aggroes aggressive, assist, and caster enemies according to their rules", () => {
    expect(decideEnemyAiIntent({ ...baseState, behavior: "aggressive", playerPosition: { x: 120, y: 0 } })).toBe("idle");
    expect(decideEnemyAiIntent({ ...baseState, behavior: "aggressive" })).toBe("attack");
    expect(decideEnemyAiIntent({ ...baseState, behavior: "assist", playerPosition: { x: 160, y: 0 }, allyInCombat: true })).toBe("chase");
    expect(decideEnemyAiIntent({ ...baseState, behavior: "assist", playerPosition: { x: 160, y: 0 }, assistedByAlly: true })).toBe("chase");
    expect(decideEnemyAiIntent({ ...baseState, behavior: "caster" })).toBe("cast");
    expect(decideEnemyAiIntent({ ...baseState, behavior: "caster", silenced: true })).toBe("attack");
  });

  it("keeps aggressive enemies chasing after initial detection until they leash", () => {
    expect(decideEnemyAiIntent({
      ...baseState,
      behavior: "aggressive",
      mode: "chasing",
      playerPosition: { x: 140, y: 0 },
    })).toBe("chase");
    expect(decideEnemyAiIntent({
      ...baseState,
      behavior: "aggressive",
      mode: "attacking",
      playerPosition: { x: 140, y: 0 },
    })).toBe("chase");
  });

  it("returns enemies home after leash distance or timeout", () => {
    expect(decideEnemyAiIntent({
      ...baseState,
      behavior: "aggressive",
      position: { x: 240, y: 0 },
      playerPosition: { x: 260, y: 0 },
    })).toBe("return");
    expect(decideEnemyAiIntent({
      ...baseState,
      behavior: "aggressive",
      elapsedInCombatMs: 7000,
    })).toBe("return");
  });
});
