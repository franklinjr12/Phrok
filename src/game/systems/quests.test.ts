import { describe, expect, it } from "vitest";
import { createNewGameState } from "../data/gameState";
import type { DataRegistry } from "../data/dataRegistry";
import type { QuestDefinition } from "../types/dataDefinitions";
import { acceptQuest, completeQuest, getQuestLogSummary, updateQuestObjectives } from "./quests";

const quest: QuestDefinition = {
  id: "act-test",
  name: "Act Test",
  type: "main",
  description: "Test quest",
  objectives: [
    {
      id: "visit",
      type: "visitMap",
      description: "Visit map",
      targetId: "crownfield-meadows",
      targetCount: 1,
      regionHint: "Crownfield",
      mapId: "crownfield-meadows",
    },
    {
      id: "kill",
      type: "killMonster",
      description: "Defeat jelly",
      targetId: "green-jelly",
      targetCount: 2,
      regionHint: "Jelly Grove",
      mapId: "crownfield-meadows",
    },
  ],
  rewards: {
    xp: 100,
    gold: 25,
    items: [{ itemId: "jelly-gel", quantity: 2 }],
    unlockFlags: ["act-test-reward"],
  },
  requiredLevel: 1,
  requiredFlags: [],
  unlockFlags: ["act-test-complete"],
  npcStart: "maela-hearth",
  npcTurnIn: "maela-hearth",
  mapMarkers: [{ mapId: "crownfield-meadows", label: "Jellies", x: 10, y: 20 }],
  rewardItemIds: ["jelly-gel"],
};

describe("quests", () => {
  it("accepts, updates, completes, and grants rewards", () => {
    const state = createNewGameState();
    const registry = createRegistry(quest);

    expect(acceptQuest(state, quest, "2026-06-28T00:00:00.000Z")).toMatchObject({ questId: "act-test" });
    expect(state.quests.activeQuestIds).toEqual(["act-test"]);

    expect(updateQuestObjectives(state, registry, { type: "visitMap", targetId: "crownfield-meadows" })).toEqual([
      "act-test:visit:1/1",
    ]);
    expect(updateQuestObjectives(state, registry, { type: "killMonster", targetId: "green-jelly" })).toEqual([
      "act-test:kill:1/2",
    ]);
    expect(completeQuest(state, registry, quest.id, "2026-06-28T00:05:00.000Z")).toBe(false);

    updateQuestObjectives(state, registry, { type: "killMonster", targetId: "green-jelly" });
    expect(completeQuest(state, registry, quest.id, "2026-06-28T00:05:00.000Z")).toBe(true);

    expect(state.quests.completedQuestIds).toEqual(["act-test"]);
    expect(state.inventory.gold).toBe(25);
    expect(state.inventory.items).toContainEqual({ id: "jelly-gel", quantity: 2 });
    expect(state.worldFlags["act-test-complete"]).toBe(true);
    expect(state.worldFlags["act-test-reward"]).toBe(true);
    expect(getQuestLogSummary(state, [quest])).toContain("act-test:completed");
  });
});

function createRegistry(testQuest: QuestDefinition): DataRegistry {
  return {
    getQuest: () => testQuest,
    getItem: (id: string) => ({
      id,
      name: id,
      description: "",
      type: "material",
      value: 0,
    }),
    getXpTable: () => ({ id: "standard", levels: { "1": 0, "2": 100 } }),
  } as unknown as DataRegistry;
}
