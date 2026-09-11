## Epic M6-E03 — NPC Market

### M6-E03-T001 — Implement shop service

**Priority:** P0
**Dependencies:** M2-E03-T003, M6-E01-T001

Create shop UI for buying and selling.

**Acceptance Criteria**

* NPC opens shop.
* Player can buy items.
* Player can sell items.
* Gold updates.
* Inventory updates.
* Shop stock comes from JSON.

---

### M6-E03-T002 — Implement region-specific shops

**Priority:** P1
**Dependencies:** M6-E03-T001

Create different shop inventories by town/region.

**Acceptance Criteria**

* Crownfield sells beginner items.
* Mossvale sells forest supplies.
* Blueharbor sells water/sea items.
* Amber Dunes sells desert supplies.
* Ironroot sells refinement materials.
* Moonveil sells late-game supplies.

---

### M6-E03-T003 — Implement appraiser service

**Priority:** P2
**Dependencies:** M6-E03-T001

Allow special NPC to identify or improve sell value of rare items.

**Acceptance Criteria**

* Appraiser can reveal unknown item details if used.
* Appraiser can sell selected items at improved rate.
* Appraiser cost is balanced.
* Appraiser UI is clear.

---
