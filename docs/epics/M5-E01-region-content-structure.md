## Epic M5-E01 — Region Content Structure

### M5-E01-T001 — Create world region data

**Priority:** P0
**Dependencies:** M0-E02-T002

Create region definitions for:

* Crownfield.
* Mossvale.
* Amber Dunes.
* Blueharbor Coast.
* Ironroot Highlands.
* Moonveil Marsh.
* Starfall Tower.

**Acceptance Criteria**

* Each region has ID, name, level range, description, maps, dungeons, monsters, bosses.
* Region data is used by map UI.
* Region progression is visible in the world map.

---

### M5-E01-T002 — Add map metadata system

**Priority:** P0
**Dependencies:** M5-E01-T001

Each map should define:

* ID.
* Name.
* Region.
* Level range.
* Type.
* Portals.
* Spawn groups.
* NPCs.
* Music key.
* Recommended elements.
* Drop highlights.

**Acceptance Criteria**

* Map UI can display metadata.
* Loading a map uses metadata.
* Spawn system reads metadata.
* Music system can read map music key.

---
