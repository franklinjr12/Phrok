## Epic M8-E04 — Accessibility and Settings

### M8-E04-T001 — Implement settings menu

**Priority:** P1
**Dependencies:** M8-E02-T001

Settings should include:

* Music volume.
* SFX volume.
* UI scale.
* Damage numbers.
* Screen shake.
* Flash intensity.
* Auto-potion.
* Difficulty.
* Text speed.

**Acceptance Criteria**

* Settings menu opens from main menu and pause menu.
* Settings apply immediately.
* Settings save and load.
* Defaults are sensible.

---

### M8-E04-T002 — Implement UI scaling

**Priority:** P1
**Dependencies:** M8-E04-T001

Support UI scale from 100% to 200%.

**Acceptance Criteria**

* HUD scales correctly.
* Menus scale correctly.
* Tooltips scale correctly.
* Text remains readable.
* UI does not overflow severely.

---

### M8-E04-T003 — Implement difficulty presets

**Priority:** P1
**Dependencies:** M3-E04-T007

Presets:

* Story.
* Normal.
* Veteran.

**Acceptance Criteria**

* Difficulty affects enemy damage/HP or player mitigation.
* Difficulty affects potion generosity or death penalty.
* Difficulty can be changed outside combat.
* No content is locked behind difficulty.

---

### M8-E04-T004 — Add colorblind/readability support

**Priority:** P2
**Dependencies:** M8-E04-T001

Add readable alternatives for color-coded information.

**Acceptance Criteria**

* Rarity is not only communicated through color.
* Status effects have icons.
* Element info uses labels/icons.
* Important warnings have shape/text cues.
* UI contrast is acceptable.

---

# 14. M9 — Balance, QA, and Release Candidate
