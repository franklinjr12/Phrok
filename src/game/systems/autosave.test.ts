import { describe, expect, it } from "vitest";
import { createNewGameState } from "../data/gameState";
import {
  autosaveStorageKey,
  createSaveData,
  deleteSaveSlot,
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
        support: {
          equippedSupportId: null,
          autoPickupFilter: "none",
        },
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
      storage: {
        items: [{ id: "jelly-gel", quantity: 5 }],
        equipmentInstances: [{ instanceId: "rare-sword-a", itemId: "rare-sword" }],
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
        entries: {},
        familyDamageBonuses: {},
      },
      settings: {
        musicVolume: 0.8,
        musicMuted: false,
      },
      gameState: {
        currentMapId: "crownfield-meadows",
        playerProfile: {
          gold: 42,
        },
        inventory: {
          gold: 42,
        },
        storage: {
          items: [{ id: "jelly-gel", quantity: 5 }],
          equipmentInstances: [{ instanceId: "rare-sword-a", itemId: "rare-sword" }],
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
        support: {
          equippedSupportId: null,
          autoPickupFilter: "none",
        },
      },
    });
  });

  it("normalizes audio mute settings when loading saves", () => {
    const saveData = deserializeSaveData(JSON.stringify({
      version: 1,
      savedAt: "2026-06-20T00:00:00.000Z",
      settings: {
        musicVolume: 0.4,
        sfxVolume: 0.2,
        musicMuted: true,
        sfxMuted: true,
        textSpeed: 1,
      },
      gameState: createNewGameState(),
    }));

    expect(saveData.gameState.settings).toMatchObject({
      musicVolume: 0.4,
      sfxVolume: 0.2,
      musicMuted: true,
      sfxMuted: true,
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
    state.support.equippedSupportId = "pack-sprite";
    state.support.levels["pack-sprite"] = 2;
    state.support.affinity["pack-sprite"] = 12;
    state.support.cooldowns["emergency-potion"] = 9000;
    state.support.autoPickupFilter = "materials";
    state.inventory.items.push({ id: "jelly-gel", quantity: 2 });
    state.bestiary.entries["green-jelly"] = {
      monsterId: "green-jelly",
      kills: 15,
      firstDiscoveredAt: "2026-06-28T00:00:00.000Z",
      discoveredDropIds: ["jelly-gel"],
      unlockedMilestones: [1, 5, 15],
    };
    state.bestiary.discoveredEnemyIds.push("green-jelly");
    state.bestiary.defeatedEnemyIds.push("green-jelly");
    state.bestiary.milestoneNotifications.push("green-jelly:15");
    state.inventory.appraisedItemIds.push("jelly-gel");
    state.storage.items.push({ id: "moonlit-reed", quantity: 3 });
    state.storage.equipmentInstances.push({ instanceId: "rare-sword-a", itemId: "rare-sword" });
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
        bestiary: {
          entries: {
            "green-jelly": {
              kills: 15,
              discoveredDropIds: ["jelly-gel"],
              unlockedMilestones: [1, 5, 15],
            },
          },
          milestoneNotifications: ["green-jelly:15"],
        },
        storage: {
          items: [{ id: "moonlit-reed", quantity: 3 }],
          equipmentInstances: [{ instanceId: "rare-sword-a", itemId: "rare-sword" }],
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
        support: {
          equippedSupportId: "pack-sprite",
          levels: { "pack-sprite": 2 },
          affinity: { "pack-sprite": 12 },
          cooldowns: { "emergency-potion": 9000 },
          autoPickupFilter: "materials",
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
    expect(restored?.bestiary.entries["green-jelly"].kills).toBe(15);
    expect(restored?.bestiary.milestoneNotifications).toEqual(["green-jelly:15"]);
    expect(restored?.storage.items).toEqual([{ id: "moonlit-reed", quantity: 3 }]);
    expect(restored?.storage.equipmentInstances).toEqual([{ instanceId: "rare-sword-a", itemId: "rare-sword" }]);
    expect(restored?.support).toMatchObject({
      equippedSupportId: "pack-sprite",
      levels: { "pack-sprite": 2 },
      affinity: { "pack-sprite": 12 },
      cooldowns: { "emergency-potion": 9000 },
      autoPickupFilter: "materials",
    });
  });

  it("deletes only the requested manual save slot", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
      key: (index: number) => [...values.keys()][index] ?? null,
      get length() { return values.size; },
    } as Storage;
    const state = createNewGameState();

    writeSaveSlot(1, state, storage);
    writeSaveSlot(2, state, storage);
    deleteSaveSlot(1, storage);

    expect(readSaveSlot(1, storage)).toBeNull();
    expect(readSaveSlot(2, storage)).not.toBeNull();
  });
});
