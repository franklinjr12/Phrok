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
