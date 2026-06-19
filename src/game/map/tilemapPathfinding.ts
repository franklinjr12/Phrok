import type { Vector2Like } from "../entities/playerMovement";

export interface TileCoordinate {
  x: number;
  y: number;
}

export interface GridCollisionMap {
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  blocked: boolean[][];
}

interface SearchNode extends TileCoordinate {
  costFromStart: number;
  estimatedTotal: number;
  parentKey: string | null;
}

export function worldToTile(map: GridCollisionMap, point: Vector2Like): TileCoordinate {
  return {
    x: Math.floor(point.x / map.tileWidth),
    y: Math.floor(point.y / map.tileHeight),
  };
}

export function tileToWorldCenter(map: GridCollisionMap, tile: TileCoordinate): Vector2Like {
  return {
    x: tile.x * map.tileWidth + map.tileWidth / 2,
    y: tile.y * map.tileHeight + map.tileHeight / 2,
  };
}

export function isTileWalkable(map: GridCollisionMap, tile: TileCoordinate): boolean {
  return tile.x >= 0
    && tile.y >= 0
    && tile.x < map.width
    && tile.y < map.height
    && !map.blocked[tile.y]?.[tile.x];
}

export function isWorldPointWalkable(map: GridCollisionMap, point: Vector2Like): boolean {
  return isTileWalkable(map, worldToTile(map, point));
}

export function findPath(
  map: GridCollisionMap,
  startPoint: Vector2Like,
  endPoint: Vector2Like,
): Vector2Like[] {
  const start = worldToTile(map, startPoint);
  const goal = worldToTile(map, endPoint);

  if (!isTileWalkable(map, start) || !isTileWalkable(map, goal)) {
    return [];
  }

  if (start.x === goal.x && start.y === goal.y) {
    return [tileToWorldCenter(map, goal)];
  }

  const open = new Map<string, SearchNode>();
  const closed = new Set<string>();
  const nodes = new Map<string, SearchNode>();
  const startKey = tileKey(start);

  const startNode: SearchNode = {
    ...start,
    costFromStart: 0,
    estimatedTotal: manhattan(start, goal),
    parentKey: null,
  };

  open.set(startKey, startNode);
  nodes.set(startKey, startNode);

  while (open.size > 0) {
    const current = getLowestCostNode(open);
    const currentKey = tileKey(current);

    if (current.x === goal.x && current.y === goal.y) {
      return reconstructPath(map, nodes, currentKey);
    }

    open.delete(currentKey);
    closed.add(currentKey);

    for (const neighbor of getNeighbors(current)) {
      const neighborKey = tileKey(neighbor);

      if (closed.has(neighborKey) || !isTileWalkable(map, neighbor)) {
        continue;
      }

      const nextCost = current.costFromStart + 1;
      const existing = nodes.get(neighborKey);

      if (existing && nextCost >= existing.costFromStart) {
        continue;
      }

      const nextNode: SearchNode = {
        ...neighbor,
        costFromStart: nextCost,
        estimatedTotal: nextCost + manhattan(neighbor, goal),
        parentKey: currentKey,
      };

      nodes.set(neighborKey, nextNode);
      open.set(neighborKey, nextNode);
    }
  }

  return [];
}

function getLowestCostNode(open: Map<string, SearchNode>): SearchNode {
  let best: SearchNode | null = null;

  for (const node of open.values()) {
    if (!best || node.estimatedTotal < best.estimatedTotal) {
      best = node;
    }
  }

  return best!;
}

function reconstructPath(map: GridCollisionMap, nodes: Map<string, SearchNode>, endKey: string): Vector2Like[] {
  const path: Vector2Like[] = [];
  let currentKey: string | null = endKey;

  while (currentKey) {
    const node = nodes.get(currentKey);

    if (!node) {
      break;
    }

    path.push(tileToWorldCenter(map, node));
    currentKey = node.parentKey;
  }

  return path.reverse();
}

function getNeighbors(tile: TileCoordinate): TileCoordinate[] {
  return [
    { x: tile.x + 1, y: tile.y },
    { x: tile.x - 1, y: tile.y },
    { x: tile.x, y: tile.y + 1 },
    { x: tile.x, y: tile.y - 1 },
  ];
}

function manhattan(a: TileCoordinate, b: TileCoordinate): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function tileKey(tile: TileCoordinate): string {
  return `${tile.x},${tile.y}`;
}
