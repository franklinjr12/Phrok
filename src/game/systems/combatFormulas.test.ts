import { describe, expect, test, vi } from "vitest";
import { resolveAttack, type CombatStats } from "./combatFormulas";

const attacker: CombatStats = {
  attack: 6,
  defense: 4,
  hitChance: 0.9,
  dodgeChance: 0.05,
  criticalChance: 0.2,
  criticalDamage: 1.5,
};

const defender: CombatStats = {
  attack: 2,
  defense: 1,
  hitChance: 0.8,
  dodgeChance: 0.05,
  criticalChance: 0.05,
  criticalDamage: 1.25,
};

describe("resolveAttack", () => {
  test("uses attacker, weapon, and defender stats for physical damage", () => {
    const result = resolveAttack({
      attacker,
      defender,
      attackKind: "physical",
      weaponAttack: 2,
      random: () => 0,
    });

    expect(result.hit).toBe(true);
    expect(result.critical).toBe(true);
    expect(result.finalDamage).toBe(10);
    expect(result.baseDamage).toBe(7);
  });

  test("can miss when dodge beats the hit roll", () => {
    const result = resolveAttack({
      attacker,
      defender,
      attackKind: "ranged",
      weaponAttack: 2,
      random: () => 0.95,
    });

    expect(result.hit).toBe(false);
    expect(result.finalDamage).toBe(0);
  });

  test("supports magic attacks and debug logging", () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => undefined);

    const result = resolveAttack({
      attacker,
      defender,
      attackKind: "magic",
      weaponAttack: 2,
      random: () => 0.5,
      debug: true,
    });

    expect(result.hit).toBe(true);
    expect(result.critical).toBe(false);
    expect(result.finalDamage).toBe(8);
    expect(debugSpy).toHaveBeenCalledWith("combat-formula", result);

    debugSpy.mockRestore();
  });
});
