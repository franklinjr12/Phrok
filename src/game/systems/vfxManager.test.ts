import { describe, expect, it } from "vitest";
import {
  getCombatFeedbackDefinitionIds,
  getCombatTextDefinitionId,
  getLootBeamDefinitionId,
} from "./vfxRouting";

describe("vfx routing", () => {
  it("routes hit choreography through reusable data definitions", () => {
    expect(getCombatFeedbackDefinitionIds(false)).toEqual({
      anticipation: "attack-anticipation",
      movement: "attack-motion",
      impact: "impact-emphasis",
      hit: "weapon-hit",
    });
    expect(getCombatFeedbackDefinitionIds(true).hit).toBe("critical-hit");
  });

  it("routes combat text variants to configured VFX definitions", () => {
    expect(getCombatTextDefinitionId("damage")).toBe("damage-number");
    expect(getCombatTextDefinitionId("critical")).toBe("critical-number");
    expect(getCombatTextDefinitionId("miss")).toBe("miss");
    expect(getCombatTextDefinitionId("healing")).toBe("healing-number");
  });

  it("only creates loot beams for rare and better drops", () => {
    expect(getLootBeamDefinitionId("Common")).toBeNull();
    expect(getLootBeamDefinitionId("Uncommon")).toBeNull();
    expect(getLootBeamDefinitionId("Rare")).toBe("rare-loot-beam");
    expect(getLootBeamDefinitionId("Epic")).toBe("rare-loot-beam");
    expect(getLootBeamDefinitionId("Legendary")).toBe("legendary-loot-beam");
    expect(getLootBeamDefinitionId("Mythic")).toBe("legendary-loot-beam");
  });
});
