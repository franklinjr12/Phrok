import type { ClassDefinition } from "../types/dataDefinitions";
import type { GameState } from "../types/gameState";

export const advancedClassUnlockLevel = 40;

export interface AdvancedClassDefinition {
  id: string;
  name: string;
  baseClassId: string;
  description: string;
  playstyle: string;
  previewSkillNames: string[];
}

export type AdvancedClassChoiceResult =
  | { success: true; id: string; name: string }
  | { success: false; reason: "level-too-low" | "already-chosen" | "invalid-choice" };

export const advancedClassDefinitions: AdvancedClassDefinition[] = [
  {
    id: "knight",
    name: "Knight",
    baseClassId: "swordsman",
    description: "An aggressive heavy-weapon fighter who turns momentum into crushing melee burst.",
    playstyle: "Charge into danger, cleave clustered foes, and create short two-handed burst windows.",
    previewSkillNames: ["Charge Thrust", "Whirlwind Blade", "Knight’s Oath"],
  },
  {
    id: "guardian",
    name: "Guardian",
    baseClassId: "swordsman",
    description: "A shield-bearing holy defender who survives pressure through mitigation and sustain.",
    playstyle: "Guard safely, punish attackers with counters, and lean on holy tools against undead threats.",
    previewSkillNames: ["Shield Bash", "Radiant Guard", "Guardian’s Vow"],
  },
  {
    id: "wizard",
    name: "Wizard",
    baseClassId: "mage",
    description: "A destructive caster who amplifies fire, frost, and lightning into wide battlefield pressure.",
    playstyle: "Plan long casts around enemy groups, spend heavy SP, and win with high-impact spell rotations.",
    previewSkillNames: ["Meteor Rain", "Blizzard Field", "Archwizard’s Seal"],
  },
  {
    id: "sage",
    name: "Sage",
    baseClassId: "mage",
    description: "A tactical scholar who controls elements, counters casters, and supports hybrid play.",
    playstyle: "Prepare magic fields and rune traps, break enemy spells, and convert mana into flexible advantages.",
    previewSkillNames: ["Spell Break", "Rune Trap", "Sage’s Equation"],
  },
  {
    id: "hunter",
    name: "Hunter",
    baseClassId: "archer",
    description: "A wilderness hunter who combines traps, survival instincts, and mobile bow pressure.",
    playstyle: "Kite through prepared ground, punish pursuit, and keep fights at your preferred range.",
    previewSkillNames: ["Falcon Companion", "Snare Trap", "Apex Hunter"],
  },
  {
    id: "minstrel",
    name: "Minstrel",
    baseClassId: "archer",
    description: "A solo performer who chains songs, ranged shots, buffs, and disruptive verses.",
    playstyle: "Keep rhythm flowing, weaken enemies from range, and sustain yourself without relying on allies.",
    previewSkillNames: ["Battle Song", "Rhythm Flow", "Final Refrain"],
  },
  {
    id: "assassin",
    name: "Assassin",
    baseClassId: "thief",
    description: "A lethal ambusher who stacks poison, critical strikes, and execution damage.",
    playstyle: "Strike first, exploit vulnerable targets, and finish fights before enemies can stabilize.",
    previewSkillNames: ["Venom Stack", "Execution", "Assassin’s Mark"],
  },
  {
    id: "rogue",
    name: "Rogue",
    baseClassId: "thief",
    description: "A flexible opportunist who farms efficiently while mixing dagger control and bow tricks.",
    playstyle: "Debuff priority targets, swap between melee and ranged options, and turn luck into profit.",
    previewSkillNames: ["Mug", "Copy Technique", "Rogue’s Fortune"],
  },
];

export function isAdvancedClassEligible(state: GameState): boolean {
  return state.playerProfile.level >= advancedClassUnlockLevel;
}

export function isAdvancedClassServiceAvailable(state: GameState): boolean {
  return isAdvancedClassEligible(state) && !state.character.advancedClass;
}

export function chooseAdvancedClass(
  state: GameState,
  baseClass: ClassDefinition,
  specializationName: string,
): AdvancedClassChoiceResult {
  if (!isAdvancedClassEligible(state)) {
    return { success: false, reason: "level-too-low" };
  }

  if (state.character.advancedClass) {
    return { success: false, reason: "already-chosen" };
  }

  const selectedDefinition = getAdvancedClassDefinitionForBase(baseClass, specializationName);

  if (!selectedDefinition) {
    return { success: false, reason: "invalid-choice" };
  }

  state.character.advancedClass = {
    id: selectedDefinition.id,
    name: selectedDefinition.name,
    baseClassId: baseClass.id,
    unlockedAtLevel: state.playerProfile.level,
  };
  state.worldFlags[`advanced-class:${selectedDefinition.id}`] = true;
  state.worldFlags["advanced-skill-tree-unlocked"] = true;

  return { success: true, id: selectedDefinition.id, name: selectedDefinition.name };
}

export function getUnlockedSkillTreeIds(state: GameState): string[] {
  return [
    state.character.archetype,
    state.character.advancedClass?.id ?? "",
  ].filter((id) => id.length > 0);
}

export function getAdvancedClassOptionsForBase(baseClass: ClassDefinition): AdvancedClassDefinition[] {
  return baseClass.advancedClassOptions
    .map((option) => getAdvancedClassDefinitionForBase(baseClass, option))
    .filter((definition): definition is AdvancedClassDefinition => Boolean(definition));
}

export function getAdvancedClassDefinitionForBase(
  baseClass: ClassDefinition,
  specializationName: string,
): AdvancedClassDefinition | undefined {
  const id = toAdvancedClassId(specializationName);

  return advancedClassDefinitions.find((definition) => (
    definition.id === id
    && definition.baseClassId === baseClass.id
    && baseClass.advancedClassOptions.includes(definition.name)
  ));
}

export function toAdvancedClassId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
