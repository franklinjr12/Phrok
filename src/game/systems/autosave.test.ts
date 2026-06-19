import { describe, expect, it } from "vitest";
import { createNewGameState } from "../data/gameState";
import { autosaveStorageKey, createSaveData, writeAutosave } from "./autosave";

describe("autosave", () => {
  it("creates a versioned save snapshot without sharing state references", () => {
    const state = createNewGameState();
    const saveData = createSaveData(state, "2026-06-19T12:00:00.000Z");

    state.currentMapId = "crownfield-meadows";

    expect(saveData).toMatchObject({
      version: 1,
      savedAt: "2026-06-19T12:00:00.000Z",
      gameState: {
        currentMapId: "crownfield-town",
      },
    });
  });

  it("writes autosave data to storage", () => {
    const state = createNewGameState();
    const values = new Map<string, string>();
    const storage = {
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    } as Storage;

    state.currentMapId = "crownfield-meadows";
    writeAutosave(state, storage);

    expect(JSON.parse(values.get(autosaveStorageKey) ?? "{}")).toMatchObject({
      version: 1,
      gameState: {
        currentMapId: "crownfield-meadows",
      },
    });
  });
});
