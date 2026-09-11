## Epic M3-E04 — Enemy AI and Spawning

### M3-E04-T001 — Implement spawn zones

**Priority:** P0
**Dependencies:** M1-E03-T001

Use Tiled object layers to define spawn zones.

**Acceptance Criteria**

* Spawn zones are read from map data.
* Spawn zones have monster IDs.
* Spawn zones have max count.
* Spawn zones respawn monsters over time.
* Monsters spawn inside zone bounds.

---

### M3-E04-T002 — Implement passive enemy behavior

**Priority:** P0
**Dependencies:** M3-E04-T001

Passive monsters only attack when attacked.

**Acceptance Criteria**

* Passive monsters ignore nearby player.
* Passive monsters retaliate when damaged.
* Passive monsters return to idle after combat ends.

---

### M3-E04-T003 — Implement aggressive enemy behavior

**Priority:** P0
**Dependencies:** M3-E04-T001

Aggressive monsters attack when player enters aggro range.

**Acceptance Criteria**

* Enemy detects player.
* Enemy chases player.
* Enemy attacks when in range.
* Enemy gives up after leash distance or timeout.

---

### M3-E04-T004 — Implement assist enemy behavior

**Priority:** P1
**Dependencies:** M3-E04-T003

Assist monsters help nearby allied monsters.

**Acceptance Criteria**

* Nearby allies respond when one is attacked.
* Assist radius is configurable.
* Assist behavior does not pull the entire map.
* Debug overlay can show assist radius.

---

### M3-E04-T005 — Implement caster enemy behavior

**Priority:** P1
**Dependencies:** M3-E04-T003

Caster enemies use ranged or magical skills.

**Acceptance Criteria**

* Caster keeps distance when possible.
* Caster uses skill cooldowns.
* Caster can be silenced.
* Cast bar or telegraph appears.

---

### M3-E04-T006 — Implement elite enemy behavior

**Priority:** P1
**Dependencies:** M3-E04-T003

Elite enemies have stronger stats and unique traits.

**Acceptance Criteria**

* Elite enemy has visual marker.
* Elite has higher HP/damage.
* Elite can drop better loot.
* Elite respawns slower than normal monsters.

---

### M3-E04-T007 — Implement boss protocol

**Priority:** P1
**Dependencies:** M3-E04-T006

Boss protocol should include:

* Knockback resistance.
* Control resistance.
* Detection of stealth.
* Larger leash area.
* Special HP bar.
* Phase support.

**Acceptance Criteria**

* Boss enemies use boss protocol flag.
* Bosses cannot be trivialized by basic crowd control.
* Boss UI appears.
* Boss death triggers special rewards.

---

# 9. M4 — Class Alpha
