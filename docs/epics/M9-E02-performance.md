## Epic M9-E02 — Performance

### M9-E02-T001 — Add performance debug overlay

**Priority:** P1
**Dependencies:** M0-E01-T004

Show:

* FPS.
* Entity count.
* Active enemies.
* Active projectiles.
* Active VFX.
* Memory estimate.
* Current map ID.

**Acceptance Criteria**

* Overlay can be toggled.
* Overlay does not affect normal gameplay.
* Values update in real time.

---

### M9-E02-T002 — Optimize pathfinding

**Priority:** P1
**Dependencies:** M1-E02-T004

Improve pathfinding performance.

**Acceptance Criteria**

* Pathfinding works on large maps.
* Repeated clicks do not freeze game.
* Enemy pathfinding is throttled.
* Long paths are handled safely.

---

### M9-E02-T003 — Optimize entity updates

**Priority:** P1
**Dependencies:** M3-E04-T007

Optimize active entities.

**Acceptance Criteria**

* Off-screen entities can be simplified.
* Spawn zones do not overpopulate.
* Dead entities are cleaned up.
* Large fights maintain target FPS.

---

### M9-E02-T004 — Optimize UI rendering

**Priority:** P2
**Dependencies:** M8-E01-T001

Improve UI performance.

**Acceptance Criteria**

* Inventory with many items remains responsive.
* Tooltips do not cause stutter.
* Damage numbers are pooled.
* UI updates are event-driven.

---
