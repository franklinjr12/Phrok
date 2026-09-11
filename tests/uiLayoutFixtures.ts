import type { Page } from "@playwright/test";

export type LayoutSaveOptions = {
  seedKey: string;
  name: string;
  items: Array<{ id: string; quantity: number }>;
  gold?: number;
  mapId?: string;
  position?: { x: number; y: number };
  uiScale?: number;
  activeQuestIds?: string[];
  storageItems?: Array<{ id: string; quantity: number }>;
};

/** Seeds a complete-enough save through the same persistence boundary the game loads. */
export async function seedLayoutSave(page: Page, options: LayoutSaveOptions): Promise<void> {
  await page.addInitScript((seed) => {
    if (sessionStorage.getItem(seed.seedKey) === "true") return;

    const character = {
      id: "player",
      archetype: "swordsman",
      advancedClass: null,
      stats: { hp: 73, maxHp: 73, sp: 24, maxSp: 24 },
      baseStats: { str: 8, agi: 5, vit: 7, int: 3, dex: 5, luk: 4 },
      allocatedStats: { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 },
      statBuffs: [],
      statusEffects: [],
      skillIds: ["power-slash"],
      skills: {
        learned: [{ id: "power-slash", level: 1 }],
        cooldowns: {},
        activeToggleIds: [],
      },
      hotbar: [
        { slot: 1, type: "skill", id: "power-slash" },
        { slot: 2, type: "item", id: "minor-health-potion" },
      ],
      consumables: { cooldowns: {}, autoPotion: { hpThresholdPercent: 0, spThresholdPercent: 0 } },
    };
    const inventory = {
      items: seed.items,
      gold: seed.gold ?? 120,
      equipmentInstances: [],
      appraisedItemIds: [],
    };
    const equipment = {
      weapon: seed.items.some((item) => item.id === "training-sword") ? "training-sword" : null,
      offhand: null,
      head: null,
      body: null,
      cloak: null,
      boots: null,
      accessory1: null,
      accessory2: null,
      sigil: null,
      supportCharm: null,
    };
    const position = seed.position ?? { x: 240, y: 304 };
    const gameState = {
      currentSaveSlot: 1,
      playerProfile: {
        name: seed.name,
        level: 20,
        xp: 0,
        gold: seed.gold ?? 120,
        statPoints: 3,
        skillPoints: 1,
      },
      currentMapId: seed.mapId ?? "crownfield-town",
      position,
      character,
      inventory,
      storage: {
        items: seed.storageItems ?? [],
        equipmentInstances: [],
      },
      equipment,
      quests: {
        activeQuestIds: seed.activeQuestIds ?? [],
        completedQuestIds: [],
      },
      bestiary: { discoveredEnemyIds: [], defeatedEnemyIds: [] },
      worldFlags: {},
      settings: {
        musicVolume: 0.8,
        sfxVolume: 0.8,
        textSpeed: 1,
        uiScale: seed.uiScale ?? 1,
      },
    };

    localStorage.setItem("prok-save-slot-1", JSON.stringify({
      version: 1,
      savedAt: "2026-06-25T00:00:00.000Z",
      currentSaveSlot: 1,
      character,
      currentMapId: gameState.currentMapId,
      position,
      inventory,
      storage: gameState.storage,
      equipment,
      skills: ["power-slash"],
      stats: character.stats,
      gold: inventory.gold,
      bestiary: gameState.bestiary,
      quests: gameState.quests,
      worldFlags: {},
      settings: gameState.settings,
      gameState,
    }));
    sessionStorage.setItem(seed.seedKey, "true");
  }, options);
}
