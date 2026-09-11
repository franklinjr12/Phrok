## Epic M3-E02 — Skill System

### M3-E02-T001 — Implement skill data model

**Priority:** P0
**Dependencies:** M0-E02-T002

Skill data should include:

* ID.
* Name.
* Class.
* Description.
* Type.
* Targeting mode.
* Required level.
* Required skill level.
* Max skill level.
* SP cost.
* Cooldown.
* Cast time.
* Recovery time.
* Range.
* Area.
* Element.
* Scaling stat.
* Damage multiplier.
* Status effects.
* Animation key.
* Icon.

**Acceptance Criteria**

* Skill JSON loads.
* Skill definitions can be queried by class.
* Missing fields use defaults where appropriate.
* Skill system can execute basic active skills.

---

### M3-E02-T002 — Implement skill point allocation

**Priority:** P0
**Dependencies:** M3-E02-T001

Allow player to spend skill points.

**Acceptance Criteria**

* Skill screen opens with hotkey K.
* Skills are grouped by class.
* Player can level unlocked skills.
* Locked skills show requirements.
* Skill points decrease when spent.
* Skill data saves and loads.

---

### M3-E02-T003 — Implement hotbar assignment

**Priority:** P0
**Dependencies:** M3-E02-T002

Allow active skills and consumables to be assigned to hotbar slots.

**Acceptance Criteria**

* Hotbar supports slots 1–8.
* Player can assign skills.
* Player can assign potions.
* Pressing slot key uses assigned action.
* Hotbar state saves and loads.

---

### M3-E02-T004 — Implement target-based skills

**Priority:** P0
**Dependencies:** M3-E02-T003

Support skills requiring selected enemy target.

**Acceptance Criteria**

* Skill fails gracefully if no target exists.
* Skill checks range.
* Player moves into range if configured.
* Skill applies damage/effects.
* Cooldown and SP cost apply.

---

### M3-E02-T005 — Implement self-buff skills

**Priority:** P0
**Dependencies:** M3-E02-T003

Support skills that apply buffs to the player.

**Acceptance Criteria**

* Buff applies to player.
* Buff icon appears.
* Buff modifies stats.
* Buff expires after duration.
* Buff state is removed correctly.

---

### M3-E02-T006 — Implement ground-targeted skills

**Priority:** P1
**Dependencies:** M3-E02-T003

Support AoE skills targeting a ground position.

**Acceptance Criteria**

* Skill enters targeting mode.
* Valid area preview appears.
* Left-click confirms target.
* Skill affects enemies in area.
* Invalid targets are rejected.

---

### M3-E02-T007 — Implement passive skills

**Priority:** P0
**Dependencies:** M3-E02-T002

Support passive stat and behavior modifiers.

**Acceptance Criteria**

* Passive skills apply automatically.
* Passive effects update derived stats.
* Passive effects save/load.
* Passive effects are visible in skill tooltips.

---

### M3-E02-T008 — Implement toggle skills

**Priority:** P2
**Dependencies:** M3-E02-T003

Support skills that can be turned on/off.

**Acceptance Criteria**

* Toggle skill changes state.
* Active toggle drains SP or reserves a cost if configured.
* Toggle effects apply while active.
* Toggle deactivates when resources are insufficient.

---
