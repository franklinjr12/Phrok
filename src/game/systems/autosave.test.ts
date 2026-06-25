import { describe, expect, it } from "vitest";
import { createNewGameState } from "../data/gameState";
import {
  autosaveStorageKey,
  createSaveData,
  deserializeSaveData,
  getSaveSlotStorageKey,
  readSaveSlot,
  serializeSaveData,
  writeAutosave,
  writeSaveSlot,
} from "./autosave";

describe("autosave", () => {
  it("creates a versioned save snapshot without sharing state references", () => {
    const state = createNewGameState();
    const saveData = createSaveData(state, "2026-06-19T12:00:00.000Z");

    state.currentMapId = "crownfield-meadows";

    expect(saveData).toMatchObject({
      version: 1,
      savedAt: "2026-06-19T12:00:00.000Z",
      currentMapId: "crownfield-town",
      position: { x: 240, y: 304 },
      skills: ["power-slash"],
      character: {
        skills: {
          learned: [{ id: "power-slash", level: 1 }],
        },
        advancedClass: null,
        hotbar: [
          { slot: 1, type: "skill", id: "power-slash" },
          { slot: 2, type: "item", id: "minor-health-potion" },
        ],
      },
      stats: {
        hp: 73,
        maxHp: 73,
      },
      gold: 0,
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
      currentMapId: "crownfield-meadows",
      gameState: {
        currentMapId: "crownfield-meadows",
      },
    });
  });

  it("serializes and deserializes save data with defaults for optional fields", () => {
    const saveData = deserializeSaveData(JSON.stringify({
      version: 1,
      savedAt: "2026-06-19T12:00:00.000Z",
      currentMapId: "crownfield-meadows",
      character: {
        id: "player",
        archetype: "mage",
        advancedClass: {
          id: "elementalist",
          name: "Elementalist",
          baseClassId: "mage",
          unlockedAtLevel: 40,
        },
        stats: {
          hp: 22,
          maxHp: 22,
          sp: 18,
          maxSp: 18,
        },
        skillIds: ["fire-bolt"],
        skills: {
          learned: [{ id: "fire-bolt", level: 2 }],
          cooldowns: { "fire-bolt": 123 },
          activeToggleIds: [],
        },
        hotbar: [{ slot: 1, type: "skill", id: "fire-bolt" }],
      },
      inventory: {
        items: [{ id: "apprentice-staff", quantity: 1 }],
        gold: 42,
      },
      equipment: {
        weapon: "apprentice-staff",
      },
    }));

    expect(JSON.parse(serializeSaveData(saveData))).toMatchObject({
      version: 1,
      currentMapId: "crownfield-meadows",
      position: { x: 240, y: 304 },
      gold: 42,
      bestiary: {
        discoveredEnemyIds: [],
      },
      settings: {
        musicVolume: 0.8,
      },
      gameState: {
        currentMapId: "crownfield-meadows",
        playerProfile: {
          gold: 42,
        },
        inventory: {
          gold: 42,
        },
        character: {
          skills: {
            learned: [{ id: "fire-bolt", level: 2 }],
            cooldowns: { "fire-bolt": 123 },
          },
          consumables: {
            cooldowns: {},
            autoPotion: {
              hpThresholdPercent: 0,
              spThresholdPercent: 0,
            },
          },
          advancedClass: {
            id: "elementalist",
            name: "Elementalist",
            baseClassId: "mage",
            unlockedAtLevel: 40,
          },
          hotbar: [{ slot: 1, type: "skill", id: "fire-bolt" }],
        },
      },
    });
  });

  it("writes and reads manual save slots", () => {
    const state = createNewGameState();
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    } as Storage;

    state.playerProfile.name = "Lyra";
    state.playerProfile.level = 3;
    state.playerProfile.xp = 225;
    state.character.consumables.cooldowns["minor-health-potion"] = 12345;
    state.character.consumables.autoPotion.hpThresholdPercent = 50;
    state.character.consumables.autoPotion.spThresholdPercent = 25;
    state.inventory.items.push({ id: "jelly-gel", quantity: 2 });
    state.inventory.appraisedItemIds.push("jelly-gel");
    state.position = { x: 512, y: 300 };
    writeSaveSlot(2, state, storage);

    expect(JSON.parse(values.get(getSaveSlotStorageKey(2)) ?? "{}")).toMatchObject({
      currentSaveSlot: 2,
      position: { x: 512, y: 300 },
      gameState: {
        currentSaveSlot: 2,
        playerProfile: {
          name: "Lyra",
          level: 3,
          xp: 225,
        },
        inventory: {
          items: [
            { id: "training-sword", quantity: 1 },
            { id: "jelly-gel", quantity: 2 },
          ],
          appraisedItemIds: ["jelly-gel"],
        },
        character: {
          consumables: {
            cooldowns: { "minor-health-potion": 12345 },
            autoPotion: {
              hpThresholdPercent: 50,
              spThresholdPercent: 25,
            },
          },
        },
      },
    });
    const restored = readSaveSlot(2, storage)?.gameState;
    expect(restored?.playerProfile.name).toBe("Lyra");
    expect(restored?.character.consumables).toMatchObject({
      cooldowns: { "minor-health-potion": 12345 },
      autoPotion: {
        hpThresholdPercent: 50,
        spThresholdPercent: 25,
      },
    });
    expect(restored?.inventory.appraisedItemIds).toEqual(["jelly-gel"]);
  });
});
