import { expect, test } from "@playwright/test";
import { enterMeadows, startApp } from "./helpers";

test("world supports target selection and auto-attack combat", async ({ page }) => {
  await startApp(page);

  const canvas = await enterMeadows(page);
  await expect(canvas).toHaveAttribute("data-spawned-monster", "green-jelly");
  await expect(canvas).toHaveAttribute("data-enemy-texture-key", "enemy-green-jelly-placeholder");
  await expect(canvas).toHaveAttribute("data-current-map-name", "Crownfield Meadows");
  await expect(canvas).toHaveAttribute("data-spawn-name", "TownGateSpawn");
  await expect(canvas).toHaveAttribute("data-last-autosave-slot", "1");
  await expect(canvas).toHaveAttribute("data-last-autosave-map", "crownfield-meadows");
  await expect(canvas).toHaveAttribute("data-monster-spawn-zone-count", "1");
  await expect(canvas).toHaveAttribute("data-monster-spawn-zones", "JellyGrove:green-jelly:1");
  await expect(canvas).toHaveAttribute("data-enemy-entity-count", "1");
  await expect(canvas).toHaveAttribute("data-enemy-behavior", "passive");
  await expect(canvas).toHaveAttribute("data-enemy-aggro-range", "150");
  await expect(canvas).toHaveAttribute("data-enemy-leash-distance", "240");
  await expect(canvas).toHaveAttribute("data-gathering-spot-count", "1");
  await expect(canvas).toHaveAttribute("data-treasure-spot-count", "1");
  await expect(canvas).toHaveAttribute("data-enemy-hp", "10/10");
  await expect(canvas).toHaveAttribute("data-target-frame", "hidden");

  await canvas.click({ position: { x: 528, y: 300 } });
  await expect.poll(async () => {
    const selected = await canvas.getAttribute("data-enemy-selected");
    const enemyHp = await canvas.getAttribute("data-enemy-hp");
    return selected === "true" || enemyHp === "0/10" ? "engaged" : "idle";
  }).toBe("engaged");
  await expect(canvas).toHaveAttribute("data-auto-attack", /moving-to-range|attacking|stopped/);

  await expect.poll(async () => await canvas.getAttribute("data-enemy-hp")).not.toBe("10/10");
  await expect.poll(async () => await canvas.getAttribute("data-last-combat-formula")).toContain("weapon=2");
  await expect.poll(async () => await canvas.getAttribute("data-enemy-alive"), { timeout: 6000 }).toBe("false");
  await expect(canvas).toHaveAttribute("data-enemy-hp", "0/10");
  await expect(canvas).toHaveAttribute("data-auto-attack", "stopped");
  await expect(canvas).toHaveAttribute("data-target-frame", "hidden");
  await expect(canvas).toHaveAttribute("data-player-xp", "5");
  await expect(canvas).toHaveAttribute("data-last-xp-gain", "5");
  await expect(canvas).toHaveAttribute("data-player-level", "1");
  await expect(canvas).toHaveAttribute("data-bestiary-kills", "green-jelly:1");
  await expect(canvas).toHaveAttribute("data-bestiary-discovered", "green-jelly");
  await expect(canvas).toHaveAttribute("data-last-bestiary-update", "green-jelly:1");
  await expect(canvas).toHaveAttribute("data-last-bestiary-milestone", "green-jelly:1:slime");
  await expect(canvas).toHaveAttribute("data-xp-bar-width", "9");
  await expect(canvas).toHaveAttribute("data-pending-loot-count", "2");
  await expect(canvas).toHaveAttribute("data-last-loot-drop", /gold:[3-5]/);

  await canvas.click({ position: { x: 528, y: 322 } });
  await expect(canvas).toHaveAttribute("data-pending-loot-count", "1");
  await expect(canvas).toHaveAttribute("data-last-loot-pickup", /jelly-gel:[1-2]/);
  await expect(canvas).toHaveAttribute("data-inventory-stack-count", "2");

  await canvas.click({ position: { x: 556, y: 322 } });
  await expect(canvas).toHaveAttribute("data-pending-loot-count", "0");
  await expect(canvas).toHaveAttribute("data-last-loot-pickup", /gold:[3-5]/);
  await expect.poll(async () => Number(await canvas.getAttribute("data-player-gold"))).toBeGreaterThan(0);
  await expect.poll(async () => Number(await canvas.getAttribute("data-inventory-gold"))).toBeGreaterThan(0);
});

test("enemy uses the matching monster sprite when it is preloaded", async ({ page }) => {
  await routeMeadowsMonster(page, "field-hopper");
  await startApp(page);

  const canvas = await enterMeadows(page);

  await expect(canvas).toHaveAttribute("data-spawned-monster", "field-hopper");
  await expect(canvas).toHaveAttribute("data-spawned-monster-name", "Field Hopper");
  await expect(canvas).toHaveAttribute("data-enemy-texture-key", "enemy-field-hopper");
});

test("enemy falls back to the placeholder when no monster sprite exists", async ({ page }) => {
  await page.route("**/assets/data/monsters.json", async (route) => {
    const response = await route.fetch();
    const monsters = await response.json();

    await route.fulfill({
      response,
      json: [
        ...monsters,
        {
          id: "missing-sprite",
          name: "Missing Sprite",
          level: 1,
          hp: 10,
          attack: 2,
          defense: 1,
          xpReward: 5,
          dropTableId: "green-jelly-drops",
          behavior: "passive",
          aggroRange: 150,
          attackRange: 70,
          leashDistance: 240,
          leashTimeoutMs: 6500,
          assistRadius: 96,
          respawnMs: 15000,
        },
      ],
    });
  });
  await routeMeadowsMonster(page, "missing-sprite");
  await startApp(page);

  const canvas = await enterMeadows(page);

  await expect(canvas).toHaveAttribute("data-spawned-monster", "missing-sprite");
  await expect(canvas).toHaveAttribute("data-enemy-texture-key", "enemy-green-jelly-placeholder");
});

test("hotbar skill key fails without target and executes against selected enemies", async ({ page }) => {
  await startApp(page);

  const canvas = await enterMeadows(page);

  await page.keyboard.press("Digit1");
  await expect(canvas).toHaveAttribute("data-last-skill-use", "1:power-slash:failed:missing-target");
  await expect(canvas).toHaveAttribute("data-last-hotbar-use", "1:skill:power-slash:failed");

  await canvas.click({ position: { x: 528, y: 300 } });
  await expect.poll(async () => {
    const selected = await canvas.getAttribute("data-enemy-selected");
    const enemyHp = await canvas.getAttribute("data-enemy-hp");
    return selected === "true" || enemyHp === "0/10" ? "engaged" : "idle";
  }).toBe("engaged");

  await page.keyboard.press("Digit1");
  await expect.poll(async () => await canvas.getAttribute("data-last-skill-use")).toMatch(/1:power-slash:(success|failed:(out-of-range|cooldown))/);
  await expect(canvas).toHaveAttribute("data-skill-cooldowns", /power-slash:|^$/);
});

async function routeMeadowsMonster(page: Parameters<typeof startApp>[0], monsterId: string) {
  await page.route("**/assets/maps/crownfield-meadows.json", async (route) => {
    const response = await route.fetch();
    const map = await response.json();
    const objectLayer = map.layers.find((layer: { name?: string }) => layer.name === "Objects");
    const monsterSpawn = objectLayer?.objects.find((object: { type?: string }) => object.type === "monsterSpawn");

    if (monsterSpawn) {
      monsterSpawn.properties = [
        ...(monsterSpawn.properties ?? []).filter((property: { name?: string }) => property.name !== "monsterId"),
        { name: "monsterId", type: "string", value: monsterId },
      ];
    }

    await route.fulfill({ response, json: map });
  });
}

test("aggressive enemies detect, chase, and attack without being clicked", async ({ page }) => {
  await page.route("**/assets/data/monsters.json", async (route) => {
    const response = await route.fetch();
    const monsters = await response.json() as Array<Record<string, unknown>>;

    await route.fulfill({
      response,
      json: monsters.map((monster) => monster.id === "green-jelly"
        ? {
          ...monster,
          behavior: "aggressive",
          attack: 5,
          aggroRange: 240,
          leashDistance: 360,
          leashTimeoutMs: 7000,
        }
        : monster),
    });
  });
  await page.route("**/assets/maps/crownfield-meadows.json", async (route) => {
    const response = await route.fetch();
    const map = await response.json() as {
      layers: Array<{
        name?: string;
        objects?: Array<Record<string, unknown>>;
      }>;
    };
    const objectLayer = map.layers.find((layer) => layer.name === "Objects");
    const jellyGrove = objectLayer?.objects?.find((object) => object.name === "JellyGrove");

    if (jellyGrove) {
      jellyGrove.x = 240;
      jellyGrove.y = 304;
      jellyGrove.width = 32;
      jellyGrove.height = 32;
    }

    await route.fulfill({ response, json: map });
  });
  await startApp(page);

  const canvas = await enterMeadows(page);
  await expect(canvas).toHaveAttribute("data-enemy-behavior", "aggressive");
  await expect(canvas).toHaveAttribute("data-enemy-selected", "false");

  const initialPosition = await canvas.getAttribute("data-enemy-position");

  await expect.poll(async () => await canvas.getAttribute("data-enemy-combat-state"), { timeout: 4000 }).toMatch(/chasing|attacking/);
  await expect.poll(async () => await canvas.getAttribute("data-enemy-position")).not.toBe(initialPosition);
  await expect.poll(async () => await canvas.getAttribute("data-player-hp"), { timeout: 6000 }).not.toBe("30/30");
});

test("assist enemies locally join when a nearby ally is attacked", async ({ page }) => {
  await page.route("**/assets/data/monsters.json", async (route) => {
    const response = await route.fetch();
    const monsters = await response.json() as Array<Record<string, unknown>>;

    await route.fulfill({
      response,
      json: monsters.map((monster) => monster.id === "green-jelly"
        ? {
          ...monster,
          behavior: "assist",
          hp: 30,
          attack: 1,
          aggroRange: 0,
          assistRadius: 64,
          leashDistance: 280,
          leashTimeoutMs: 7000,
        }
        : monster),
    });
  });
  await page.route("**/assets/maps/crownfield-meadows.json", async (route) => {
    const response = await route.fetch();
    const map = await response.json() as {
      layers: Array<{
        name?: string;
        objects?: Array<Record<string, unknown>>;
      }>;
    };
    const objectLayer = map.layers.find((layer) => layer.name === "Objects");
    const jellyGrove = objectLayer?.objects?.find((object) => object.name === "JellyGrove");

    if (jellyGrove) {
      jellyGrove.x = 528;
      jellyGrove.y = 300;
      jellyGrove.width = 32;
      jellyGrove.height = 32;
      jellyGrove.properties = [
        { name: "monsterId", type: "string", value: "green-jelly" },
        { name: "maxCount", type: "int", value: 2 },
      ];
    }

    objectLayer?.objects?.push({
      id: 99,
      name: "FarJellyGrove",
      type: "monsterSpawn",
      visible: true,
      x: 704,
      y: 464,
      width: 32,
      height: 32,
      rotation: 0,
      properties: [
        { name: "monsterId", type: "string", value: "green-jelly" },
        { name: "maxCount", type: "int", value: 1 },
      ],
    });

    await route.fulfill({ response, json: map });
  });
  await startApp(page);

  const canvas = await enterMeadows(page);
  await expect(canvas).toHaveAttribute("data-enemy-entity-count", "3");
  await expect(canvas).toHaveAttribute("data-enemy-behavior", "assist");
  await expect(canvas).toHaveAttribute("data-enemy-assist-radius", "64");
  await expect(canvas).toHaveAttribute("data-enemy-assisted-count", "0");

  await page.keyboard.press("F9");
  await expect(canvas).toHaveAttribute("data-debug-assist-radius", "visible:3");

  await canvas.click({ position: { x: 528, y: 300 } });
  await expect.poll(async () => await canvas.getAttribute("data-enemy-assisted-count"), { timeout: 5000 }).toBe("1");
  await expect(canvas).toHaveAttribute("data-last-assist-call", "green-jelly:green-jelly");
});

test("caster enemies keep distance, cast on cooldown, and show telegraphs", async ({ page }) => {
  await page.route("**/assets/data/monsters.json", async (route) => {
    const response = await route.fetch();
    const monsters = await response.json() as Array<Record<string, unknown>>;

    await route.fulfill({
      response,
      json: monsters.map((monster) => monster.id === "green-jelly"
        ? {
          ...monster,
          behavior: "caster",
          hp: 80,
          attack: 1,
          aggroRange: 220,
          attackRange: 44,
          castRange: 170,
          castCooldownMs: 900,
          leashDistance: 360,
          leashTimeoutMs: 7000,
        }
        : monster),
    });
  });
  await page.route("**/assets/maps/crownfield-meadows.json", async (route) => {
    const response = await route.fetch();
    const map = await response.json() as {
      layers: Array<{
        name?: string;
        objects?: Array<Record<string, unknown>>;
      }>;
    };
    const objectLayer = map.layers.find((layer) => layer.name === "Objects");
    const jellyGrove = objectLayer?.objects?.find((object) => object.name === "JellyGrove");

    if (jellyGrove) {
      jellyGrove.x = 132;
      jellyGrove.y = 304;
      jellyGrove.width = 32;
      jellyGrove.height = 32;
    }

    await route.fulfill({ response, json: map });
  });
  await startApp(page);

  const canvas = await enterMeadows(page);
  await expect(canvas).toHaveAttribute("data-enemy-behavior", "caster");
  await expect(canvas).toHaveAttribute("data-enemy-cast-range", "170");
  await expect(canvas).toHaveAttribute("data-enemy-cast-cooldown", "900");

  const initialPosition = await canvas.getAttribute("data-enemy-position");

  await expect.poll(async () => await canvas.getAttribute("data-last-enemy-keep-distance"), { timeout: 4000 }).toMatch(/^green-jelly:/);
  await expect.poll(async () => await canvas.getAttribute("data-enemy-position")).not.toBe(initialPosition);
  await expect.poll(async () => await canvas.getAttribute("data-enemy-cast-telegraph"), { timeout: 5000 }).toMatch(/^visible:/);
  await expect.poll(async () => await canvas.getAttribute("data-last-enemy-cast"), { timeout: 7000 }).toBe("green-jelly");
  await expect.poll(async () => Number(await canvas.getAttribute("data-enemy-cast-cooldown-remaining"))).toBeGreaterThan(0);
});

test("caster enemies can be silenced", async ({ page }) => {
  await page.route("**/assets/data/monsters.json", async (route) => {
    const response = await route.fetch();
    const monsters = await response.json() as Array<Record<string, unknown>>;

    await route.fulfill({
      response,
      json: monsters.map((monster) => monster.id === "green-jelly"
        ? {
          ...monster,
          behavior: "caster",
          hp: 80,
          attack: 1,
          aggroRange: 0,
          attackRange: 44,
          castRange: 70,
          castCooldownMs: 900,
          leashDistance: 360,
          leashTimeoutMs: 7000,
        }
        : monster),
    });
  });
  await page.route("**/assets/data/skills.json", async (route) => {
    const response = await route.fetch();
    const skills = await response.json() as Array<Record<string, unknown>>;

    await route.fulfill({
      response,
      json: skills.map((skill) => skill.id === "power-slash"
        ? {
          ...skill,
          statusEffects: ["silence"],
        }
        : skill),
    });
  });
  await page.route("**/assets/maps/crownfield-meadows.json", async (route) => {
    const response = await route.fetch();
    const map = await response.json() as {
      layers: Array<{
        name?: string;
        objects?: Array<Record<string, unknown>>;
      }>;
    };
    const objectLayer = map.layers.find((layer) => layer.name === "Objects");
    const jellyGrove = objectLayer?.objects?.find((object) => object.name === "JellyGrove");

    if (jellyGrove) {
      jellyGrove.x = 132;
      jellyGrove.y = 304;
      jellyGrove.width = 32;
      jellyGrove.height = 32;
    }

    await route.fulfill({ response, json: map });
  });
  await startApp(page);

  const canvas = await enterMeadows(page);

  await expect(canvas).toHaveAttribute("data-enemy-behavior", "caster");
  await expect.poll(async () => {
    const enemyPosition = (await canvas.getAttribute("data-enemy-position")) ?? "132,304";
    const [enemyX, enemyY] = enemyPosition.split(",").map((value) => Number(value));

    await canvas.click({ position: { x: enemyX, y: enemyY } });
    return await canvas.getAttribute("data-enemy-selected");
  }, { timeout: 4000 }).toBe("true");
  await expect.poll(async () => {
    await page.keyboard.press("Digit1");
    return await canvas.getAttribute("data-enemy-status-effects");
  }, { timeout: 7000 }).toContain("silence:Silence");

  await expect(canvas).toHaveAttribute("data-enemy-silenced", "true");
  await expect(canvas).toHaveAttribute("data-enemy-cast-telegraph", "hidden");
});

test("elite enemies show markers, hit harder, drop better loot, and respawn slower", async ({ page }) => {
  await page.route("**/assets/data/monsters.json", async (route) => {
    const response = await route.fetch();
    const monsters = await response.json() as Array<Record<string, unknown>>;

    await route.fulfill({
      response,
      json: monsters.map((monster) => monster.id === "green-jelly"
        ? {
          ...monster,
          hp: 6,
          attack: 3,
          elite: true,
        }
        : monster),
    });
  });
  await page.route("**/assets/maps/crownfield-meadows.json", async (route) => {
    const response = await route.fetch();
    const map = await response.json() as {
      layers: Array<{
        name?: string;
        objects?: Array<Record<string, unknown>>;
      }>;
    };
    const objectLayer = map.layers.find((layer) => layer.name === "Objects");
    const jellyGrove = objectLayer?.objects?.find((object) => object.name === "JellyGrove");

    if (jellyGrove) {
      jellyGrove.properties = [
        { name: "monsterId", type: "string", value: "green-jelly" },
        { name: "maxCount", type: "int", value: 1 },
        { name: "respawnMs", type: "int", value: 1000 },
      ];
    }

    await route.fulfill({ response, json: map });
  });
  await startApp(page);

  const canvas = await enterMeadows(page);
  await expect(canvas).toHaveAttribute("data-enemy-traits", "elite");
  await expect(canvas).toHaveAttribute("data-enemy-visual-marker", "elite-label");
  await expect(canvas).toHaveAttribute("data-enemy-hp", "11/11");
  await expect(canvas).toHaveAttribute("data-enemy-damage", "5");
  await expect(canvas).toHaveAttribute("data-enemy-respawn-ms", "2500");

  await canvas.click({ position: { x: 528, y: 300 } });
  await expect.poll(async () => await canvas.getAttribute("data-enemy-alive"), { timeout: 6000 }).toBe("false");
  await expect(canvas).toHaveAttribute("data-pending-loot-count", "2");
  await expect(canvas).toHaveAttribute("data-last-loot-drop", /gold:([6-9]|10)/);
});

test("boss enemies use boss protocol, show boss UI, resist control, phase, and drop boss rewards", async ({ page }) => {
  await page.route("**/assets/data/monsters.json", async (route) => {
    const response = await route.fetch();
    const monsters = await response.json() as Array<Record<string, unknown>>;

    await route.fulfill({
      response,
      json: monsters.map((monster) => monster.id === "green-jelly"
        ? {
          ...monster,
          name: "Crowned Jelly",
          hp: 40,
          attack: 1,
          defense: 0,
          behavior: "aggressive",
          boss: true,
          leashDistance: 240,
        }
        : monster),
    });
  });
  await page.route("**/assets/data/skills.json", async (route) => {
    const response = await route.fetch();
    const skills = await response.json() as Array<Record<string, unknown>>;

    await route.fulfill({
      response,
      json: skills.map((skill) => skill.id === "power-slash"
        ? {
          ...skill,
          cooldown: 100,
        }
        : skill),
    });
  });
  await startApp(page);

  const canvas = await enterMeadows(page);
  await expect(canvas).toHaveAttribute("data-enemy-traits", "boss");
  await expect(canvas).toHaveAttribute("data-enemy-visual-marker", "boss-label");
  await expect(canvas).toHaveAttribute("data-boss-protocol", "enabled");
  await expect(canvas).toHaveAttribute("data-enemy-leash-distance", "420");
  await expect(canvas).toHaveAttribute("data-boss-phase", "1");
  await expect(canvas).toHaveAttribute("data-boss-hp", "96/96");

  await canvas.click({ position: { x: 528, y: 300 } });
  await expect(canvas).toHaveAttribute("data-boss-ui", "visible");
  await expect(canvas).toHaveAttribute("data-boss-ui-name", "Crowned Jelly");
  await expect(canvas).toHaveAttribute("data-boss-ui-phase", "1");

  await expect.poll(async () => {
    await page.keyboard.press("Digit1");
    return await canvas.getAttribute("data-last-skill-status-effect");
  }, { timeout: 7000 }).toBe("green-jelly:stun:resisted");
  await expect(canvas).toHaveAttribute("data-enemy-status-effects", /armor-break:Armor Break/);
  await expect(canvas).not.toHaveAttribute("data-enemy-status-effects", /stun:Stun/);
  await expect(canvas).toHaveAttribute("data-last-boss-knockback-resist", "green-jelly:18->1.8");
  await expect.poll(async () => {
    await page.keyboard.press("Digit1");
    return await canvas.getAttribute("data-boss-phase");
  }, { timeout: 7000 }).toBe("2");
  await expect(canvas).toHaveAttribute("data-last-boss-phase", "green-jelly:1->2");

  await expect.poll(async () => {
    await page.keyboard.press("Digit1");
    return await canvas.getAttribute("data-enemy-alive");
  }, { timeout: 7000 }).toBe("false");
  await expect(canvas).toHaveAttribute("data-boss-ui", "hidden");
  await expect(canvas).toHaveAttribute("data-last-boss-reward", "green-jelly:gold:25");
  await expect(canvas).toHaveAttribute("data-pending-loot-count", "3");
  await expect(canvas).toHaveAttribute("data-last-loot-drop", "gold:25");
});
