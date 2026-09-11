## Epic M6-E01 — Item System Expansion

### M6-E01-T001 — Implement item rarity

**Priority:** P0
**Dependencies:** M2-E04-T002

Add rarity tiers:

* Common.
* Uncommon.
* Rare.
* Epic.
* Legendary.
* Mythic.

**Acceptance Criteria**

* Items show rarity color.
* Rarity affects generated stats.
* Rarity affects sell value.
* Drop tables can reference rarity.

---

### M6-E01-T002 — Implement equipment stat modifiers

**Priority:** P0
**Dependencies:** M2-E04-T003

Equipment can modify:

* Attack.
* Magic attack.
* Defense.
* Magic defense.
* HP.
* SP.
* STR.
* AGI.
* VIT.
* INT.
* DEX.
* LUK.
* Crit.
* Attack speed.
* Cast speed.
* Cooldown.
* Element damage.
* Race damage.
* Resistances.
* Drop chance.
* Movement speed.

**Acceptance Criteria**

* Equipping gear updates derived stats.
* Removing gear removes bonuses.
* Multiple items stack correctly.
* UI displays gear bonuses.

---

### M6-E01-T003 — Create full equipment slot system

**Priority:** P0
**Dependencies:** M6-E01-T002

Support slots:

* Weapon.
* Offhand.
* Head.
* Body.
* Cloak.
* Boots.
* Accessory 1.
* Accessory 2.
* Sigil.
* Support Charm.

**Acceptance Criteria**

* All slots are visible.
* Items can only equip into valid slots.
* Weapon restrictions by class work.
* Two accessories can be equipped.
* Offhand rules work with two-handed weapons.

---

### M6-E01-T004 — Create initial 100 item definitions

**Priority:** P1
**Dependencies:** M6-E01-T003

Create initial items:

* 20 weapons.
* 20 armor pieces.
* 20 accessories.
* 20 materials.
* 10 consumables.
* 10 special/sigil/support items.

**Acceptance Criteria**

* Items are original.
* Items cover levels 1–50.
* Items have valid icons/placeholders.
* Items appear in shops, drops, or recipes.
* No item references copied IP.

---

### M6-E01-T005 — Expand to 300+ item definitions

**Priority:** P2
**Dependencies:** M6-E01-T004

Expand item database for full game.

**Acceptance Criteria**

* Items cover levels 1–99.
* All classes have useful gear paths.
* All regions have distinct material drops.
* Bosses have unique loot.
* Endgame has chase items.

---
