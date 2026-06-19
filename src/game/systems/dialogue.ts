import type { DialogueDefinition } from "../types/dataDefinitions";

export function getDialogueLine(dialogue: DialogueDefinition, lineIndex: number): string {
  return dialogue.lines[Math.max(0, Math.min(lineIndex, dialogue.lines.length - 1))] ?? "";
}

export function getNextDialogueLineIndex(dialogue: DialogueDefinition, lineIndex: number): number | null {
  if (lineIndex >= dialogue.lines.length - 1) {
    return null;
  }

  return lineIndex + 1;
}

export function getChoiceLabels(dialogue: DialogueDefinition): string[] {
  return dialogue.choices.map((choice) => choice.label);
}
