export type AttackKind = "physical" | "ranged" | "magic";

export interface CombatStats {
  attack: number;
  defense: number;
  hitChance: number;
  dodgeChance: number;
  criticalChance: number;
  criticalDamage: number;
}

export interface AttackFormulaInput {
  attacker: CombatStats;
  defender: CombatStats;
  attackKind: AttackKind;
  weaponAttack: number;
  skillPower?: number;
  random?: () => number;
  debug?: boolean;
}

export interface AttackFormulaResult {
  attackKind: AttackKind;
  hit: boolean;
  critical: boolean;
  baseDamage: number;
  finalDamage: number;
  hitChance: number;
  criticalChance: number;
}

const attackKindMultipliers: Record<AttackKind, number> = {
  physical: 1,
  ranged: 0.9,
  magic: 1.1,
};

export function resolveAttack(input: AttackFormulaInput): AttackFormulaResult {
  const random = input.random ?? Math.random;
  const hitChance = clamp(input.attacker.hitChance - input.defender.dodgeChance, 0.05, 0.98);
  const criticalChance = clamp(input.attacker.criticalChance, 0, 0.75);
  const hit = random() <= hitChance;
  const critical = hit && random() <= criticalChance;
  const rawPower = (
    input.attacker.attack
    + input.weaponAttack
    + (input.skillPower ?? 0)
  ) * attackKindMultipliers[input.attackKind];
  const mitigatedPower = rawPower - input.defender.defense * 0.65;
  const baseDamage = Math.max(1, Math.floor(mitigatedPower));
  const finalDamage = hit
    ? Math.max(1, Math.floor(baseDamage * (critical ? input.attacker.criticalDamage : 1)))
    : 0;

  const result: AttackFormulaResult = {
    attackKind: input.attackKind,
    hit,
    critical,
    baseDamage,
    finalDamage,
    hitChance,
    criticalChance,
  };

  if (input.debug) {
    console.debug("combat-formula", result);
  }

  return result;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
