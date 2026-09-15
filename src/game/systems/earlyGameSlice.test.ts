import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createNewGameState } from "../data/gameState";
import type { DataRegistry } from "../data/dataRegistry";
import type { ClassDefinition, ItemDefinition, MonsterDefinition, RareVariantDefinition, RewardChoiceDefinition, SkillDefinition, XpTableDefinition } from "../types/dataDefinitions";
import { buildEarlyGameBalanceReport, findEarlyGameStatOutliers } from "./earlyGameBalance";
import { applyEarlyGameScenario } from "./earlyGameScenario";
import { completeEarlyGameMilestone, shouldTriggerEarlyGameMilestone } from "./earlyGameProgression";
import { isDemoBlockedMap, isDemoModeEnabled } from "./demoMode";
import { dismissHint, getActiveHint } from "./contextualHints";
import { rollRareSpawn, recordRareVariantKill } from "./rareVariants";
import { claimRewardChoice, getRewardChoiceOptions, queueRewardChoice } from "./rewardChoices";
import { resolveItemEffects } from "./itemEffects";
import { getSkillsUnlockedAtLevel } from "./skills";

const skills = JSON.parse(readFileSync(new URL("../../../public/assets/data/skills.json", import.meta.url), "utf8")) as SkillDefinition[];
const monsters = JSON.parse(readFileSync(new URL("../../../public/assets/data/monsters.json", import.meta.url), "utf8")) as MonsterDefinition[];
const xpTables = JSON.parse(readFileSync(new URL("../../../public/assets/data/xp-tables.json", import.meta.url), "utf8")) as XpTableDefinition[];
const classes = JSON.parse(readFileSync(new URL("../../../public/assets/data/classes.json", import.meta.url), "utf8")) as ClassDefinition[];
const items = JSON.parse(readFileSync(new URL("../../../public/assets/data/items.json", import.meta.url), "utf8")) as ItemDefinition[];
const rareVariants = JSON.parse(readFileSync(new URL("../../../public/assets/data/rare-variants.json", import.meta.url), "utf8")) as RareVariantDefinition[];
const rewardChoices = JSON.parse(readFileSync(new URL("../../../public/assets/data/reward-choices.json", import.meta.url), "utf8")) as RewardChoiceDefinition[];

describe("early game vertical slice", () => {
  it("rephases base-class skills across levels 1-17", () => {
    const expected = [1, 3, 5, 7, 9, 11, 14, 17];
    for (const classId of ["swordsman", "mage", "archer", "thief"]) {
      const levels = skills.filter((skill) => skill.classId === classId).map((skill) => skill.requiredLevel).sort((a, b) => a - b);
      expect(levels).toEqual(expected);
      expect(getSkillsUnlockedAtLevel(skills, classId, 1)).toHaveLength(1);
    }
    expect(classes.find((entry) => entry.id === "archer")?.startingSkillIds).toEqual(["double-shot"]);
  });

  it("keeps early normal monsters within a playable stat band", () => {
    const outliers = findEarlyGameStatOutliers(monsters);
    expect(outliers.map((monster) => monster.id)).toEqual([]);
    const report = buildEarlyGameBalanceReport(xpTables[0], monsters, 12, 70);
    expect(report.levels[0]?.estimatedKills).toBeGreaterThan(0);
    expect(report.levels[19]?.xpToNext).toBeGreaterThan(0);
  });

  it("rolls rare variants once and records first kills", () => {
    const state = createNewGameState();
    const variant = rareVariants[0];
    expect(rollRareSpawn(state, variant, () => 0.99).spawned).toBe(false);
    expect(rollRareSpawn(state, variant, () => 0, true).spawned).toBe(true);
    expect(rollRareSpawn(state, variant, () => 0).spawned).toBe(false);
    recordRareVariantKill(state, variant.id);
    expect(state.worldFlags[`rare-first-kill:${variant.id}`]).toBe(true);
  });

  it("grants one-time class reward choices and cracked sigils", () => {
    const state = createNewGameState();
    const dataRegistry = createSliceRegistry();
    const glutton = rewardChoices.find((choice) => choice.sourceId === "sewer-glutton")!;
    const options = getRewardChoiceOptions(glutton, "swordsman");
    expect(options).toHaveLength(3);
    expect(queueRewardChoice(state, glutton)).toBe(true);
    expect(claimRewardChoice(state, dataRegistry, glutton, options[0].id)?.itemId).toBe(options[0].itemId);
    expect(queueRewardChoice(state, glutton)).toBe(false);
    expect(state.inventory.equipmentInstances.some((entry) => entry.itemId === options[0].itemId) || state.inventory.items.some((entry) => entry.id === options[0].itemId)).toBe(true);
  });

  it("gates demo travel without deleting later regions", () => {
    expect(isDemoModeEnabled({ VITE_DEMO_MODE: "true" } as ImportMetaEnv)).toBe(true);
    expect(isDemoBlockedMap(
      { id: "blueharbor-beach", regionId: "blueharbor-coast" } as never,
      () => ({ id: "blueharbor-coast" } as never),
      { VITE_DEMO_MODE: "true" } as ImportMetaEnv,
    )).toBe(true);
    expect(isDemoBlockedMap(
      { id: "mossvale-edge", regionId: "mossvale" } as never,
      () => ({ id: "mossvale" } as never),
      { VITE_DEMO_MODE: "true" } as ImportMetaEnv,
    )).toBe(false);
  });

  it("triggers the level-20 milestone after Thorn Priest", () => {
    const state = createNewGameState();
    state.playerProfile.level = 18;
    state.bossEncounters.defeatedBossIds.push("thorn-priest");
    expect(shouldTriggerEarlyGameMilestone(state)).toBe(true);
    expect(completeEarlyGameMilestone(state)).toBe(true);
    expect(completeEarlyGameMilestone(state)).toBe(false);
  });

  it("applies debug scenarios and contextual hints", () => {
    const state = createNewGameState();
    const dataRegistry = createSliceRegistry();
    applyEarlyGameScenario(state, dataRegistry, {
      classId: "mage",
      level: 12,
      mapId: "training-sewers",
      allocatedStats: { int: 8 },
      spawnMonsterIds: ["sewer-glutton"],
    });
    expect(state.character.archetype).toBe("mage");
    expect(state.currentMapId).toBe("training-sewers");
    expect(state.character.allocatedStats.int).toBe(8);
    expect(getActiveHint(state, {})?.id).toBe("move");
    dismissHint(state, "move");
    expect(getActiveHint(state, {})?.id).toBe("attack");
  });

  it("resolves cracked sigil effects from equipped effect IDs", () => {
    const state = createNewGameState();
    state.equipment.sigil = "cracked-sigil-momentum";
    const result = resolveItemEffects(state, (id) => items.find((item) => item.id === id)!, {
      movedSinceAttack: true,
      critical: false,
      elementMatchup: "normal",
      dodged: false,
      attackElement: "neutral",
    });
    expect(result.damageMultiplier).toBeGreaterThan(1);
  });
});

function createSliceRegistry(): DataRegistry {
  const itemMap = Object.fromEntries(items.map((item) => [item.id, item]));
  const classMap = Object.fromEntries(classes.map((entry) => [entry.id, entry]));
  return {
    getClass: (id: string) => classMap[id],
    getItem: (id: string) => itemMap[id],
    getSkillsByClass: (classId: string) => skills.filter((skill) => skill.classId === classId),
    getXpTable: () => xpTables[0],
    getRewardChoices: () => rewardChoices,
  } as unknown as DataRegistry;
}
