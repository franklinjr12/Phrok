import { beforeEach, describe, expect, it } from "vitest";
import { createNewGameState } from "../data/gameState";
import { eventBus } from "./eventBus";
import { awardXp } from "./progression";

describe("progression", () => {
  beforeEach(() => {
    eventBus.clear();
  });

  it("awards XP and levels up through configured thresholds", () => {
    const state = createNewGameState();
    const levelUps: number[] = [];
    eventBus.on("levelUp", ({ level }) => levelUps.push(level));

    const result = awardXp(state, {
      id: "standard",
      levels: {
        "1": 0,
        "2": 5,
        "3": 12,
      },
    }, 12);

    expect(result.levelsGained).toEqual([2, 3]);
    expect(state.playerProfile.level).toBe(3);
    expect(state.playerProfile.xp).toBe(12);
    expect(state.playerProfile.statPoints).toBe(6);
    expect(state.playerProfile.skillPoints).toBe(2);
    expect(state.character.stats.maxHp).toBe(40);
    expect(state.character.stats.maxSp).toBe(12);
    expect(state.character.stats.hp).toBe(40);
    expect(state.character.stats.sp).toBe(12);
    expect(levelUps).toEqual([2, 3]);
  });
});
