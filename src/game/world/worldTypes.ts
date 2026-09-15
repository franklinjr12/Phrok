import type Phaser from "phaser";
import type { EnemyEntity } from "../entities/EnemyEntity";
import type { LootDrop } from "../systems/lootDrops";
import type { SpawnZoneDefinition } from "../systems/enemySpawning";

export type WorldSceneData = {
  spawnName?: string;
  lastAutosaveMap?: string;
  lastAutosaveSlot?: string;
  lastTransition?: string;
  useSavedPosition?: boolean;
};

export type PortalObject = {
  name: string;
  bounds: Phaser.Geom.Rectangle;
  targetMapId: string;
  targetSpawnName: string;
};

export type DroppedLootObject = {
  id: string;
  drop: LootDrop;
  marker: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  sourceMonsterId?: string;
};

export type WorldHazardObject = {
  name: string;
  effect: string;
  bounds: Phaser.Geom.Rectangle;
  lastTickAt: number;
};

export type WorldTreasureObject = {
  name: string;
  itemId: string;
  bounds: Phaser.Geom.Rectangle;
  claimed: boolean;
};

export type SpawnZoneRuntime = SpawnZoneDefinition & {
  respawnTimerMs: number;
};

export type EnemyRuntime = {
  enemy: EnemyEntity;
  zoneId: string;
  home: Phaser.Math.Vector2;
  damagedByPlayer: boolean;
  assistedByAlly: boolean;
  elapsedInCombatMs: number;
  attackTimerMs: number;
  castTimerMs: number;
  castWindupMs: number | null;
};
