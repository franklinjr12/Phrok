## Epic M2-E03 — NPC Interaction

### M2-E03-T001 — Add NPC entity

**Priority:** P0
**Dependencies:** M2-E02-T001

Create NPC entity with:

* Sprite.
* Name.
* Interaction radius.
* Dialogue ID.
* Service type.

**Acceptance Criteria**

* NPC appears in town.
* Clicking NPC moves player into interaction range.
* Dialogue opens when in range.
* NPC can trigger service menus later.

---

### M2-E03-T002 — Create dialogue system

**Priority:** P0
**Dependencies:** M2-E03-T001

Implement basic dialogue box.

**Acceptance Criteria**

* Dialogue shows NPC name.
* Dialogue shows text.
* Dialogue supports next/close.
* Dialogue blocks movement while open.
* Dialogue can include choice buttons.

---

### M2-E03-T003 — Add first town NPC services as placeholders

**Priority:** P1
**Dependencies:** M2-E03-T002

Create placeholder NPCs:

* Innkeeper.
* Storage Keeper.
* General Merchant.
* Refiner.
* Crafter.
* Healer.
* Travel Agent.
* Hunter Board Clerk.

**Acceptance Criteria**

* Each NPC has unique dialogue.
* Each NPC can be clicked.
* Service buttons can be disabled until systems exist.
* NPC names are original and IP-safe.

---
