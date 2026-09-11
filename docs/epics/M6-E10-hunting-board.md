## Epic M6-E10 — Hunting Board

### M6-E10-T001 — Implement hunting board system

**Priority:** P1
**Dependencies:** M6-E09-T001

Create repeatable hunting contracts.

**Acceptance Criteria**

* Board lists available contracts.
* Player can accept contract.
* Kill progress is tracked.
* Player can turn in contract.
* Rewards are granted.

---

### M6-E10-T002 — Add regional hunting contracts

**Priority:** P1
**Dependencies:** M6-E10-T001

Create contracts per region.

**Acceptance Criteria**

* Each region has level-appropriate hunts.
* Contracts reward XP/gold/materials.
* Elite hunts exist.
* Boss contracts can be unlocked.

---

### M6-E10-T003 — Add daily-style repeatable structure without real-time dependency

**Priority:** P2
**Dependencies:** M6-E10-T002

Use in-game refresh rules instead of real-world timers.

**Acceptance Criteria**

* Contracts refresh after map clears, boss kills, or rest.
* No online clock is required.
* Player cannot infinitely exploit one contract.
* Refresh logic is clear.

---

# 12. M7 — Campaign and Endgame Beta
