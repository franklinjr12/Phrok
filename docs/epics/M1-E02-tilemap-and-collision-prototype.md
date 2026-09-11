## Epic M1-E02 — Tilemap and Collision Prototype

### M1-E02-T001 — Load a Tiled map in Phaser

**Priority:** P0
**Dependencies:** M0-E02-T004

Load a simple Tiled JSON map with:

* Ground layer.
* Decoration layer.
* Collision layer.
* Object layer.
* Spawn point.

**Acceptance Criteria**

* Map renders in WorldScene.
* Player spawns at map spawn point.
* Camera follows the player.
* Map layers appear in correct order.

---

### M1-E02-T002 — Implement collision from Tiled layer

**Priority:** P0
**Dependencies:** M1-E02-T001

Prevent player from walking through blocked tiles.

**Acceptance Criteria**

* Collision layer blocks movement.
* Player cannot move through walls, water, trees, or blocked objects.
* Collision works with click movement.
* Player does not get stuck on tile corners.

---

### M1-E02-T003 — Add walkable tile detection

**Priority:** P0
**Dependencies:** M1-E02-T002

Create a helper that checks whether a clicked tile is walkable.

**Acceptance Criteria**

* Invalid click destinations are rejected.
* Valid destinations are accepted.
* The click marker only appears for valid movement.
* Enemy/NPC clicks can still be handled separately.

---

### M1-E02-T004 — Implement simple A* pathfinding

**Priority:** P0
**Dependencies:** M1-E02-T003

Implement grid-based pathfinding for click movement.

**Acceptance Criteria**

* Player can path around obstacles.
* Path updates when the player clicks a new point.
* Pathfinding uses map collision data.
* Performance is acceptable on prototype map size.

---
