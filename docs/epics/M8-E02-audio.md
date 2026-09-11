## Epic M8-E02 — Audio

### M8-E02-T001 — Implement audio manager

**Priority:** P1
**Dependencies:** M0-E01-T004

Support:

* Music.
* SFX.
* UI sounds.
* Volume settings.
* Mute settings.

**Acceptance Criteria**

* Music plays per map.
* SFX plays for combat.
* UI sounds play for menus.
* Volume settings work.
* Settings save and load.

---

### M8-E02-T002 — Add placeholder music and SFX

**Priority:** P1
**Dependencies:** M8-E02-T001

Add placeholder sounds for:

* Click.
* Attack.
* Hit.
* Skill cast.
* Pickup.
* Gold.
* Level up.
* Equip.
* Refine success.
* Refine failure.
* Boss spawn.
* Rare drop.

**Acceptance Criteria**

* Major gameplay actions have sound.
* Sounds can be replaced later.
* No missing sound errors occur.
* Audio does not become overwhelming.

---

### M8-E02-T003 — Add final audio pass

**Priority:** P3
**Dependencies:** M8-E02-T002

Replace placeholder audio with final assets.

**Acceptance Criteria**

* Each region has music.
* Bosses have boss music.
* Major skills have distinct SFX.
* UI has consistent audio language.
* Audio mix is comfortable.

---
