import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ClassDefinition, MonsterDefinition, NpcDefinition, SupportDefinition } from "../types/dataDefinitions";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const spriteRoot = join(root, "assets", "sprites");
const dataRoot = join(root, "public", "assets", "data");

describe("core visible sprite assets", () => {
  it("has sprites for player classes, monsters, NPCs, and support companions", () => {
    const spriteIds = getSpriteIds();
    const classes = readData<ClassDefinition>("classes.json");
    const monsters = readData<MonsterDefinition>("monsters.json");
    const npcs = readData<NpcDefinition>("npcs.json");
    const supports = readData<SupportDefinition>("supports.json");

    const missing = [
      ...classes.filter((entry) => !hasSprite(spriteIds, "players", entry.id) && !spriteIds.has(entry.id))
        .map((entry) => `players:${entry.id}`),
      ...monsters.filter((entry) => !hasSprite(spriteIds, "monsters", entry.id) && !spriteIds.has(entry.id))
        .map((entry) => `monsters:${entry.id}`),
      ...npcs.filter((entry) => !hasSprite(spriteIds, "npcs", entry.id))
        .map((entry) => `npcs:${entry.id}`),
      ...supports.filter((entry) => !hasSprite(spriteIds, "supports", entry.id) && !spriteIds.has(entry.id))
        .map((entry) => `supports:${entry.id}`),
    ];

    expect(missing).toEqual([]);
  });
});

function readData<T>(fileName: string): T[] {
  return JSON.parse(readFileSync(join(dataRoot, fileName), "utf8")) as T[];
}

function getSpriteIds(): Set<string> {
  const files = readdirSync(spriteRoot, { recursive: true })
    .map((file) => String(file).replace(/\\/g, "/"))
    .filter((file) => file.endsWith(".png"))
    .map((file) => file.replace(/\.png$/i, ""));

  return new Set(files);
}

function hasSprite(spriteIds: Set<string>, folder: string, id: string): boolean {
  return spriteIds.has(`${folder}/${id}`);
}
