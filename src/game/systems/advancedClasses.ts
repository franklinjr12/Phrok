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
    description: "A disciplined defender who anchors fights with shields, heavy armor, and punishing counterattacks.",
    playstyle: "Hold the line, absorb pressure, and turn enemy aggression into steady melee control.",
    previewSkillNames: ["Shield Bash", "Iron Oath", "Guardian Charge"],
  },
  {
    id: "blade-dancer",
    name: "Blade Dancer",
    baseClassId: "swordsman",
    description: "A swift duelist who trades some staying power for flowing sword chains and evasive footwork.",
    playstyle: "Weave through danger, chain fast strikes, and reward precise movement with burst windows.",
    previewSkillNames: ["Whirling Cut", "Tempo Step", "Flurry Finale"],
  },
  {
    id: "elementalist",
    name: "Elementalist",
    baseClassId: "mage",
    description: "A destructive caster who amplifies fire, frost, and lightning into wide battlefield pressure.",
    playstyle: "Plan casts around enemy groups, exploit elements, and win with high-impact spell rotations.",
    previewSkillNames: ["Frost Nova", "Chain Lightning", "Meteor Bloom"],
  },
  {
    id: "chronomancer",
    name: "Chronomancer",
    baseClassId: "mage",
    description: "A tactical spellcaster who bends cooldowns, slows enemies, and creates safer casting windows.",
    playstyle: "Control tempo, reposition calmly, and stack smaller advantages into decisive openings.",
    previewSkillNames: ["Time Snare", "Rewind Veil", "Haste Field"],
  },
  {
    id: "ranger",
    name: "Ranger",
    baseClassId: "archer",
    description: "A wilderness hunter who combines traps, survival instincts, and mobile bow pressure.",
    playstyle: "Kite through prepared ground, punish pursuit, and keep fights at your preferred range.",
    previewSkillNames: ["Snare Trap", "Hawk Mark", "Wild Volley"],
  },
  {
    id: "sharpshooter",
    name: "Sharpshooter",
    baseClassId: "archer",
    description: "A precision specialist who lines up lethal shots and rewards patient target selection.",
    playstyle: "Create distance, aim carefully, and delete priority enemies with focused ranged burst.",
    previewSkillNames: ["Piercing Aim", "Deadeye Focus", "Longshot"],
  },
  {
    id: "assassin",
    name: "Assassin",
    baseClassId: "thief",
    description: "A lethal ambusher who stacks poison, critical strikes, and execution damage.",
    playstyle: "Strike first, exploit vulnerable targets, and finish fights before enemies can stabilize.",
    previewSkillNames: ["Venom Edge", "Death Mark", "Silent Execution"],
  },
  {
    id: "trickster",
    name: "Trickster",
    baseClassId: "thief",
    description: "A slippery saboteur who wins through misdirection, debuffs, and opportunistic control.",
    playstyle: "Disrupt enemy plans, reposition often, and convert chaos into clean escape routes.",
    previewSkillNames: ["Smoke Feint", "Loaded Dice", "Shadow Swap"],
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
