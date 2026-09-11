## Epic M7-E01 — Campaign Progression

### M7-E01-T001 — Implement quest data model

**Priority:** P1
**Dependencies:** M0-E02-T002

Quest data should include:

* ID.
* Name.
* Type.
* Description.
* Objectives.
* Rewards.
* Required level.
* Required flags.
* Unlock flags.
* NPC start.
* NPC turn-in.
* Map markers.

**Acceptance Criteria**

* Quest JSON loads.
* Quest can be accepted.
* Quest objectives can update.
* Quest can be completed.
* Rewards are granted.
* Quest state saves and loads.

---

### M7-E01-T002 — Implement quest log UI

**Priority:** P1
**Dependencies:** M7-E01-T001

Create quest log screen.

**Acceptance Criteria**

* Quest log opens with hotkey L.
* Active quests are visible.
* Completed quests are visible.
* Objectives show progress.
* Map/region hints appear.

---

### M7-E01-T003 — Create Act 1 campaign quests

**Priority:** P1
**Dependencies:** M7-E01-T002

Act 1: levels 1–15, Crownfield.

**Acceptance Criteria**

* Introduces movement.
* Introduces combat.
* Introduces loot.
* Introduces NPC services.
* Leads player to Old Sewers.
* Ends with first dungeon boss.

---

### M7-E01-T004 — Create Act 2 campaign quests

**Priority:** P2
**Dependencies:** M7-E01-T003

Act 2: levels 15–30, Mossvale and Blueharbor.

**Acceptance Criteria**

* Introduces elemental awareness.
* Introduces crafting.
* Introduces hunting board.
* Leads to Green Chapel and Tide Cave.
* Unlocks next regions.

---

### M7-E01-T005 — Create Act 3 campaign quests

**Priority:** P2
**Dependencies:** M7-E01-T004

Act 3: levels 30–45, Amber Dunes and Ironroot.

**Acceptance Criteria**

* Introduces refinement.
* Introduces stronger elites.
* Leads to advanced class unlock near level 40.
* Introduces boss farming.
* Unlocks Moonveil.

---

### M7-E01-T006 — Create Act 4 campaign quests

**Priority:** P2
**Dependencies:** M7-E01-T005

Act 4: levels 45–65, Moonveil Marsh.

**Acceptance Criteria**

* Introduces curse/undead-heavy content.
* Tests advanced class identity.
* Unlocks late-game crafting.
* Leads to Bell Wraith.
* Unlocks Starfall Tower.

---

### M7-E01-T007 — Create Act 5 campaign quests

**Priority:** P2
**Dependencies:** M7-E01-T006

Act 5: levels 65–80, Starfall Tower.

**Acceptance Criteria**

* Introduces arcane endgame enemies.
* Resolves main campaign.
* Unlocks replayable final boss.
* Unlocks endgame systems.
* Campaign ending does not end the save.

---
