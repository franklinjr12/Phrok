import { describe, expect, it } from "vitest";
import {
  findPath,
  isTileWalkable,
  isWorldPointWalkable,
  tileToWorldCenter,
  worldToTile,
  type GridCollisionMap,
} from "./tilemapPathfinding";

const testMap: GridCollisionMap = {
  width: 5,
  height: 5,
  tileWidth: 10,
  tileHeight: 10,
  blocked: [
    [false, false, false, false, false],
    [false, true, true, true, false],
    [false, false, false, true, false],
    [false, true, false, false, false],
    [false, false, false, false, false],
  ],
};

describe("tilemap pathfinding", () => {
  it("converts between world points and tile coordinates", () => {
    expect(worldToTile(testMap, { x: 24, y: 31 })).toEqual({ x: 2, y: 3 });
    expect(tileToWorldCenter(testMap, { x: 2, y: 3 })).toEqual({ x: 25, y: 35 });
  });

  it("checks tile and world walkability against collision data", () => {
    expect(isTileWalkable(testMap, { x: 0, y: 0 })).toBe(true);
    expect(isTileWalkable(testMap, { x: 1, y: 1 })).toBe(false);
    expect(isTileWalkable(testMap, { x: -1, y: 0 })).toBe(false);
    expect(isWorldPointWalkable(testMap, { x: 12, y: 12 })).toBe(false);
    expect(isWorldPointWalkable(testMap, { x: 4, y: 4 })).toBe(true);
  });

  it("finds a path around blocked tiles", () => {
    const path = findPath(testMap, { x: 5, y: 5 }, { x: 45, y: 15 });

    expect(path[0]).toEqual({ x: 5, y: 5 });
    expect(path.at(-1)).toEqual({ x: 45, y: 15 });
    expect(path).not.toContainEqual({ x: 15, y: 15 });
    expect(path.length).toBeGreaterThan(5);
  });

  it("rejects blocked destinations", () => {
    expect(findPath(testMap, { x: 5, y: 5 }, { x: 15, y: 15 })).toEqual([]);
  });
});
