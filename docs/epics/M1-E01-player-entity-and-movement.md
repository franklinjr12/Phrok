## Epic M1-E01 — Player Entity and Movement

### M1-E01-T001 — Create player entity

**Priority:** P0
**Dependencies:** M0-E01-T002

Create the player entity with:

* Sprite placeholder.
* Position.
* Movement speed.
* Direction.
* Animation state.
* Collision body.
* Character data reference.

**Acceptance Criteria**

* Player appears in WorldScene.
* Player is centered by the camera.
* Player position can be read and updated.
* Player uses placeholder sprite if final art is missing.

---

### M1-E01-T002 — Implement mouse-left-click movement

**Priority:** P0
**Dependencies:** M1-E01-T001

Implement left-click movement to a clicked ground position.

**Acceptance Criteria**

* Left-clicking walkable ground moves the player.
* Player stops when reaching destination.
* New left-click replaces previous destination.
* WASD keys do not move the player.
* Movement feels responsive.

---

### M1-E01-T003 — Add movement click indicator

**Priority:** P1
**Dependencies:** M1-E01-T002

Display a visual marker where the player clicked.

**Acceptance Criteria**

* Marker appears on valid ground clicks.
* Marker fades or disappears after a short time.
* Marker does not appear on blocked tiles.
* Marker does not obstruct gameplay.

---

### M1-E01-T004 — Add directional movement animation states

**Priority:** P1
**Dependencies:** M1-E01-T002

Support animation states:

* Idle down.
* Idle up.
* Idle left.
* Idle right.
* Walk down.
* Walk up.
* Walk left.
* Walk right.

**Acceptance Criteria**

* Placeholder animation states exist.
* Direction updates based on movement vector.
* Player faces last movement direction when idle.

---
