import type { DropTableDefinition, MonsterDefinition, RegionDefinition } from "../types/dataDefinitions";
import type { BestiaryMonsterState, GameState } from "../types/gameState";
import { eventBus } from "./eventBus";

export const bestiaryMilestones = [1, 5, 15, 30, 50, 100] as const;
export const bestiaryFamilyBonus = 2;

export type BestiaryMilestone = typeof bestiaryMilestones[number];

export function recordMonsterKill(
  state: GameState,
  monster: MonsterDefinition,
  dropTable: DropTableDefinition,
  now = new Date().toISOString(),
): BestiaryMonsterState {
  const entry = getOrCreateBestiaryEntry(state, monster.id, now);
  entry.kills += 1;

  addUnique(state.bestiary.discoveredEnemyIds, monster.id);
  addUnique(state.bestiary.defeatedEnemyIds, monster.id);
  unlockDropKnowledge(entry, dropTable);

  for (const milestone of bestiaryMilestones) {
    if (entry.kills >= milestone && !entry.unlockedMilestones.includes(milestone)) {
      entry.unlockedMilestones.push(milestone);
      addUnique(state.bestiary.milestoneNotifications, `${monster.id}:${milestone}`);
      if (milestone === 100) {
        state.bestiary.familyDamageBonuses[getMonsterFamily(monster)] = bestiaryFamilyBonus;
      }
      eventBus.emit("bestiaryMilestoneUnlocked", {
        monsterId: monster.id,
        milestone,
        family: getMonsterFamily(monster),
      });
    }
  }

  entry.unlockedMilestones.sort((left, right) => left - right);
  return entry;
}

export function getBestiaryEntry(state: GameState, monsterId: string): BestiaryMonsterState | null {
  return state.bestiary.entries[monsterId] ?? null;
}

export function getOrCreateBestiaryEntry(
  state: GameState,
  monsterId: string,
  now = new Date().toISOString(),
): BestiaryMonsterState {
  const existing = state.bestiary.entries[monsterId];

  if (existing) {
    return existing;
  }

  const entry: BestiaryMonsterState = {
    monsterId,
    kills: 0,
    firstDiscoveredAt: now,
    discoveredDropIds: [],
    unlockedMilestones: [],
  };
  state.bestiary.entries[monsterId] = entry;
  return entry;
}

export function getBestiaryFamilyDamageBonuses(state: GameState): Record<string, number> {
  return { ...state.bestiary.familyDamageBonuses };
}

export function getMonsterFamily(monster: MonsterDefinition): string {
  if (monster.family) {
    return monster.family;
  }

  const id = monster.id;
  if (id.includes("jelly") || id.includes("slime")) return "slime";
  if (id.includes("hopper") || id.includes("pup") || id.includes("rat") || id.includes("crab") || id.includes("vulture")) return "beast";
  if (id.includes("thief") || id.includes("captain") || id.includes("raider") || id.includes("corsair")) return "humanoid";
  if (id.includes("sprite") || id.includes("thorn") || id.includes("root") || id.includes("reed") || id.includes("kelp")) return "plant";
  if (id.includes("wisp") || id.includes("haunt") || id.includes("knight") || id.includes("wraith") || id.includes("revenant") || id.includes("spirit")) return "undead";
  if (id.includes("ore") || id.includes("construct") || id.includes("automaton") || id.includes("guardian")) return "construct";
  if (id.includes("rune") || id.includes("astral") || id.includes("star") || id.includes("observer") || id.includes("astrologer")) return "arcane";
  if (id.includes("scorpion")) return "insect";
  return monster.boss ? "boss" : "wild";
}

export function getMonsterElement(monster: MonsterDefinition, region?: RegionDefinition): string {
  if (monster.element) {
    return monster.element;
  }

  const id = monster.id;
  if (id.includes("moss") || id.includes("thorn") || id.includes("root") || id.includes("grove")) return "earth";
  if (id.includes("tide") || id.includes("foam") || id.includes("reef") || id.includes("drowned") || id.includes("kelp")) return "water";
  if (id.includes("dune") || id.includes("sun") || id.includes("glass")) return "fire";
  if (id.includes("fen") || id.includes("reed") || id.includes("bell") || id.includes("crypt") || id.includes("grave") || id.includes("rotting")) return "dark";
  if (id.includes("rune") || id.includes("astral") || id.includes("star") || id.includes("observer") || id.includes("astrologer")) return "arcane";
  if (region?.id === "blueharbor-coast") return "water";
  if (region?.id === "moonveil-marsh") return "dark";
  return "neutral";
}

export function getMonsterCombatTip(monster: MonsterDefinition): string {
  if (monster.combatTip) {
    return monster.combatTip;
  }

  if (monster.boss) return "Save burst skills for phase changes.";
  if (monster.elite) return "Keep HP high before trading hits.";
  if (monster.behavior === "caster") return "Close distance and interrupt casts when possible.";
  if (monster.behavior === "assist") return "Pull away from nearby allies before attacking.";
  if (monster.behavior === "aggressive") return "Watch aggro range and reset with distance.";
  return "Basic attacks are enough if gear is current.";
}

export function hasBestiaryMilestone(entry: BestiaryMonsterState | null, milestone: BestiaryMilestone): boolean {
  return Boolean(entry && entry.kills >= milestone);
}

export function getVisibleBestiaryDropIds(
  entry: BestiaryMonsterState | null,
  dropTable: DropTableDefinition,
): string[] {
  return getBestiaryDropRows(entry, dropTable)
    .filter((row) => row.itemId !== null)
    .map((row) => row.itemId!);
}

export interface BestiaryDropRow {
  itemId: string | null;
  hidden: boolean;
  rare: boolean;
}

export function getBestiaryDropRows(
  entry: BestiaryMonsterState | null,
  dropTable: DropTableDefinition,
): BestiaryDropRow[] {
  if (!entry || entry.kills < 1) {
    return [];
  }

  const drops = dropTable.entries.filter((drop) => drop.type !== "gold" && drop.itemId);
  const discovered = new Set(entry.discoveredDropIds);
  const showCommon = entry.kills >= 15;
  const showRare = entry.kills >= 30;

  return drops.map((drop) => {
    const rare = drop.chance < 0.2;
    const known = discovered.has(drop.itemId!);
    if (known) {
      return { itemId: drop.itemId!, hidden: false, rare };
    }
    if (!rare && showCommon) {
      return { itemId: drop.itemId!, hidden: false, rare };
    }
    if (rare && showRare) {
      return { itemId: drop.itemId!, hidden: false, rare };
    }
    if (rare) {
      return { itemId: null, hidden: true, rare: true };
    }
    return null;
  }).filter((row): row is BestiaryDropRow => row !== null)
    .filter((row, index, rows) => (
      row.hidden
        ? rows.findIndex((entryRow) => entryRow.hidden && entryRow.rare === row.rare) === index
        : true
    ));
}

export function revealBestiaryDrops(entry: BestiaryMonsterState, itemIds: string[]): string[] {
  const revealed: string[] = [];
  for (const itemId of itemIds) {
    if (!entry.discoveredDropIds.includes(itemId)) {
      entry.discoveredDropIds.push(itemId);
      revealed.push(itemId);
    }
  }
  return revealed;
}

function unlockDropKnowledge(entry: BestiaryMonsterState, dropTable: DropTableDefinition): void {
  const dropIds = getVisibleBestiaryDropIds(entry, dropTable);

  for (const dropId of dropIds) {
    addUnique(entry.discoveredDropIds, dropId);
  }
}

function addUnique(values: string[], value: string): void {
  if (!values.includes(value)) {
    values.push(value);
  }
}
