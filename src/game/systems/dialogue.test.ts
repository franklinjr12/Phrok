import { describe, expect, it } from "vitest";
import type { DialogueDefinition } from "../types/dataDefinitions";
import { getChoiceLabels, getDialogueLine, getNextDialogueLineIndex } from "./dialogue";

const dialogue: DialogueDefinition = {
  id: "test-dialogue",
  lines: ["First line.", "Second line."],
  choices: [{ id: "service", label: "Open service", disabled: true }],
};

describe("dialogue helpers", () => {
  it("reads dialogue lines with clamped indexes", () => {
    expect(getDialogueLine(dialogue, -1)).toBe("First line.");
    expect(getDialogueLine(dialogue, 0)).toBe("First line.");
    expect(getDialogueLine(dialogue, 99)).toBe("Second line.");
  });

  it("advances until the final line", () => {
    expect(getNextDialogueLineIndex(dialogue, 0)).toBe(1);
    expect(getNextDialogueLineIndex(dialogue, 1)).toBeNull();
  });

  it("exposes choice labels for service buttons", () => {
    expect(getChoiceLabels(dialogue)).toEqual(["Open service"]);
  });
});
