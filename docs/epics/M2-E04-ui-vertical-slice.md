## Epic M2-E04 — UI Vertical Slice

### M2-E04-T001 — Create HUD

**Priority:** P0
**Dependencies:** M1-E04-T002

HUD should show:

* HP.
* SP.
* Level.
* XP bar.
* Gold.
* Weight.
* Current target.
* Hotbar.

**Acceptance Criteria**

* HUD appears during WorldScene.
* HP updates when damaged.
* XP updates when XP is gained.
* Target panel updates when enemy is selected.
* HUD remains readable at 1080p.

---

### M2-E04-T002 — Create inventory screen

**Priority:** P0
**Dependencies:** M1-E04-T004

Inventory should support:

* Item list/grid.
* Item name.
* Item icon placeholder.
* Quantity.
* Rarity.
* Description.
* Use/drop buttons.

**Acceptance Criteria**

* Inventory opens with hotkey I.
* Inventory displays picked-up items.
* Stack counts update.
* Player can close inventory.
* Inventory pauses or blocks gameplay input while open.

---

### M2-E04-T003 — Create equipment screen

**Priority:** P0
**Dependencies:** M2-E04-T002

Equipment screen should show:

* Weapon.
* Offhand.
* Head.
* Body.
* Cloak.
* Boots.
* Accessory 1.
* Accessory 2.
* Sigil.
* Support charm.

**Acceptance Criteria**

* Equipment screen opens with hotkey C or P.
* Current gear appears by slot.
* Empty slots are visible.
* Equipping weapon changes attack stats.
* Removing gear updates stats.

---

### M2-E04-T004 — Add item comparison panel

**Priority:** P1
**Dependencies:** M2-E04-T003

Show comparison between current gear and hovered gear.

**Acceptance Criteria**

* Current and new item are shown side by side.
* Stat increases are visible.
* Stat decreases are visible.
* Requirements are shown.
* Special effects are shown.

---
