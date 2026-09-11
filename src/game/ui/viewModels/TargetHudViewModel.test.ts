import { describe, expect, it } from "vitest";
import { TargetHudViewModel } from "./TargetHudViewModel";

describe("TargetHudViewModel", () => {
  it("clamps target and boss bar widths to their presentation bounds", () => {
    const model = new TargetHudViewModel();

    model.setTarget("wolf", "Wolf", 150, 100);
    expect(model.targetSnapshot).toMatchObject({ enemyId: "wolf", hpBarWidth: 126, boss: false });

    model.setBoss("Ancient Wolf", -10, 0, 2);
    expect(model.bossSnapshot).toMatchObject({ name: "Ancient Wolf", hpBarWidth: 0, phase: 2, boss: true });
  });

  it("keeps target and boss lifecycle independent", () => {
    const model = new TargetHudViewModel();
    model.setTarget("wolf", "Wolf", 50, 100);
    model.setBoss("Ancient Wolf", 50, 100, 1);

    model.clearBoss();

    expect(model.targetSnapshot?.enemyId).toBe("wolf");
    expect(model.bossSnapshot).toBeNull();
  });
});
