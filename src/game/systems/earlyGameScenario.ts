import { addInventoryItem } from "./inventory";
import { awardXp, getLevelXpThreshold } from "./progression";
import { allocateSkillPoint, createInitialHotbar, createInitialSkillState } from "./skills";
import { calculateDerivedStats, createClassBaseStats, createEmptyBaseStats, syncCharacterVitalsToDerivedStats } from "./stats";
import { debugForceRareFlag } from "./rareVariants";
import type { DataRegistry } from "../data/dataRegistry";
import type { ClassDefinition } from "../types/dataDefinitions";
import type { BaseStats, GameState } from "../types/gameState";

export const earlyGameMaps = [
  "crownfield-town",
  "crownfield-meadows",
  "crownfield-old-road",
  "training-sewers-entrance",
  "training-sewers",
  "mossvale-hub",
  "mossvale-edge",
  "deep-mossvale",
  "green-chapel-road",
  "green-chapel-ruins",
] as const;

export const earlyGameElites = ["old-road-bruiser", "chapel-rootguard"] as const;
export const earlyGameBosses = ["sewer-glutton", "thorn-priest"] as const;
export const earlyGameRareVariantId = "silvermane-stalker";

export interface EarlyGameScenario {
  classId?: string;
  level?: number;
  mapId?: string;
  position?: { x: number; y: number };
  statPoints?: number;
  allocatedStats?: Partial<BaseStats>;
  skillPoints?: number;
  itemIds?: string[];
  spawnMonsterIds?: string[];
  forceRareVariantId?: string;
  defeatedBossIds?: string[];
  learnAvailableSkills?: boolean;
}

export function applyEarlyGameScenario(
  state: GameState,
  dataRegistry: DataRegistry,
  scenario: EarlyGameScenario,
): GameState {
  if (scenario.classId) {
    applyClass(state, dataRegistry.getClass(scenario.classId), dataRegistry);
  }
  if (typeof scenario.level === "number") {
    setCharacterLevel(state, dataRegistry, scenario.level);
  }
  if (scenario.mapId) {
    state.currentMapId = scenario.mapId;
  }
  if (scenario.position) {
    state.position = { ...scenario.position };
  }
  if (scenario.statPoints !== undefined) {
    state.playerProfile.statPoints = scenario.statPoints;
  }
  if (scenario.allocatedStats) {
    state.character.allocatedStats = {
      ...state.character.allocatedStats,
      ...scenario.allocatedStats,
    };
    syncCharacterVitalsToDerivedStats(
      state,
      calculateDerivedStats(state, dataRegistry.getClass(state.character.archetype), (id) => dataRegistry.getItem(id)),
    );
  }
  if (typeof scenario.skillPoints === "number") {
    state.playerProfile.skillPoints = scenario.skillPoints;
  }
  if (scenario.learnAvailableSkills) {
    learnAvailableSkills(state, dataRegistry);
  }
  for (const itemId of scenario.itemIds ?? []) {
    addInventoryItem(state.inventory, dataRegistry.getItem(itemId), 1, false);
  }
  for (const bossId of scenario.defeatedBossIds ?? []) {
    if (!state.bossEncounters.defeatedBossIds.includes(bossId)) {
      state.bossEncounters.defeatedBossIds.push(bossId);
    }
    state.worldFlags[`boss:${bossId}:defeated`] = true;
  }
  if (scenario.forceRareVariantId) {
    state.worldFlags[debugForceRareFlag(scenario.forceRareVariantId)] = true;
  }
  if (scenario.spawnMonsterIds) {
    state.worldFlags["debug:spawn-monsters"] = scenario.spawnMonsterIds.join("|");
  }
  return state;
}

function applyClass(state: GameState, playerClass: ClassDefinition, dataRegistry: DataRegistry): void {
  state.character.archetype = playerClass.id;
  state.character.baseStats = createClassBaseStats(playerClass);
  state.character.allocatedStats = createEmptyBaseStats();
  state.character.skillIds = [...playerClass.startingSkillIds];
  state.character.skills = createInitialSkillState(playerClass.startingSkillIds);
  state.character.hotbar = createInitialHotbar(playerClass.startingSkillIds);
  state.equipment.weapon = playerClass.startingWeaponId;
  syncCharacterVitalsToDerivedStats(
    state,
    calculateDerivedStats(state, playerClass, (id) => dataRegistry.getItem(id)),
  );
}

function setCharacterLevel(state: GameState, dataRegistry: DataRegistry, level: number): void {
  const xpTable = dataRegistry.getXpTable("standard");
  const threshold = getLevelXpThreshold(xpTable, Math.max(1, Math.min(99, level)));
  if (threshold != null && state.playerProfile.xp < threshold) {
    awardXp(state, xpTable, threshold - state.playerProfile.xp);
  }
}

function learnAvailableSkills(state: GameState, dataRegistry: DataRegistry): void {
  const skills = dataRegistry.getSkillsByClass(state.character.archetype)
    .filter((skill) => skill.requiredLevel <= state.playerProfile.level);
  state.playerProfile.skillPoints = Math.max(state.playerProfile.skillPoints, skills.length);
  for (const skill of skills) {
    allocateSkillPoint(state, skill);
  }
}

export function readPendingEarlyGameScenario(): EarlyGameScenario | null {
  if (typeof sessionStorage === "undefined") {
    return null;
  }
  const raw = sessionStorage.getItem("phrok-early-game-debug");
  if (!raw) {
    return null;
  }
  sessionStorage.removeItem("phrok-early-game-debug");
  try {
    return JSON.parse(raw) as EarlyGameScenario;
  } catch {
    return null;
  }
}
