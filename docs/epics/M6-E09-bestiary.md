## Epic M6-E09 — Bestiary

### M6-E09-T001 — Implement bestiary data tracking

**Priority:** P1
**Dependencies:** M1-E04-T001

Track per-monster:

* Kills.
* First discovered.
* Drops discovered.
* Element discovered.
* Behavior discovered.
* Family discovered.

**Acceptance Criteria**

* Killing monster updates bestiary.
* Bestiary state saves and loads.
* Unknown monsters show partial info.
* Discovered monsters show more info.

---

### M6-E09-T002 — Implement bestiary UI

**Priority:** P1
**Dependencies:** M6-E09-T001

Create bestiary screen.

**Acceptance Criteria**

* Bestiary opens with hotkey B.
* Monsters are grouped by family/region.
* Monster details unlock by kill milestones.
* Drop info unlocks gradually.
* UI supports search/filter.

---

### M6-E09-T003 — Implement bestiary milestones

**Priority:** P2
**Dependencies:** M6-E09-T002

Milestones:

* 1 kill: name, sprite, level.
* 5 kills: element, family, behavior.
* 15 kills: common drops.
* 30 kills: rare drops.
* 50 kills: combat tips.
* 100 kills: small permanent bonus vs family.

**Acceptance Criteria**

* Milestones unlock correctly.
* Player receives notification.
* Permanent bonus applies correctly.
* Milestone state saves and loads.

---
