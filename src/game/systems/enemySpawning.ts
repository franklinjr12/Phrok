import type { MonsterDefinition } from "../types/dataDefinitions";

export type EnemyBehavior = MonsterDefinition["behavior"];

export interface TiledPropertyLike {
  name?: string;
  value?: unknown;
}

export interface TiledObjectLike {
  name?: string;
  type?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  properties?: TiledPropertyLike[];
}

export interface SpawnZoneDefinition {
  id: string;
  name: string;
  monsterId: string;
  maxCount: number;
  respawnMs: number;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface EnemyAiState {
  behavior: EnemyBehavior;
  mode: "idle" | "chasing" | "attacking" | "casting" | "returning" | "dead";
  home: { x: number; y: number };
  position: { x: number; y: number };
  playerPosition: { x: number; y: number };
  damagedByPlayer: boolean;
  allyInCombat: boolean;
  elapsedInCombatMs: number;
  aggroRange: number;
  attackRange: number;
  leashDistance: number;
  leashTimeoutMs: number;
  assistRadius: number;
  castRange: number;
  silenced: boolean;
}

export type EnemyAiIntent = "idle" | "chase" | "attack" | "cast" | "return";

export function parseSpawnZones(
  objects: TiledObjectLike[],
  mapMonsterIds: string[],
  defaultRespawnMs = 8000,
): SpawnZoneDefinition[] {
  return objects
    .filter((object) => object.type === "monsterSpawn")
    .map((object, index) => {
      const monsterId = getStringProperty(object, "monsterId", mapMonsterIds[0] ?? "");

      return {
        id: object.name || `monster-spawn-${index + 1}`,
        name: object.name || `Monster Spawn ${index + 1}`,
        monsterId,
        maxCount: Math.max(1, getNumberProperty(object, "maxCount", 1)),
        respawnMs: Math.max(1000, getNumberProperty(object, "respawnMs", defaultRespawnMs)),
        bounds: {
          x: object.x ?? 0,
          y: object.y ?? 0,
          width: object.width ?? 32,
          height: object.height ?? 32,
        },
      };
    })
    .filter((zone) => zone.monsterId.length > 0);
}

export function pickSpawnPoint(
  zone: SpawnZoneDefinition,
  random: () => number = Math.random,
): { x: number; y: number } {
  return {
    x: zone.bounds.x + random() * zone.bounds.width,
    y: zone.bounds.y + random() * zone.bounds.height,
  };
}

export function decideEnemyAiIntent(state: EnemyAiState): EnemyAiIntent {
  if (state.mode === "dead") {
    return "idle";
  }

  const distanceToPlayer = distance(state.position, state.playerPosition);
  const distanceFromHome = distance(state.position, state.home);
  const leashed = distanceFromHome > state.leashDistance || state.elapsedInCombatMs > state.leashTimeoutMs;
  const hasAggro = state.damagedByPlayer
    || ((state.behavior === "aggressive" || state.behavior === "caster") && distanceToPlayer <= state.aggroRange)
    || (state.behavior === "assist" && (distanceToPlayer <= state.aggroRange || state.allyInCombat));

  if (!hasAggro) {
    return "idle";
  }

  if (leashed) {
    return "return";
  }

  if (state.behavior === "caster" && !state.silenced && distanceToPlayer <= state.castRange) {
    return "cast";
  }

  if (distanceToPlayer <= state.attackRange) {
    return "attack";
  }

  return "chase";
}

function getStringProperty(object: TiledObjectLike, name: string, fallback: string): string {
  const value = object.properties?.find((property) => property.name === name)?.value;
  return typeof value === "string" ? value : fallback;
}

function getNumberProperty(object: TiledObjectLike, name: string, fallback: number): number {
  const value = object.properties?.find((property) => property.name === name)?.value;
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
