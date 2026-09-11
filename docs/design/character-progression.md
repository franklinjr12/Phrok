# Character progression

# 12. Character Creation

At the start of the game, the player creates a character.

## 12.1 Character Creation Steps

1. Choose name
2. Choose visual appearance
3. Choose class
4. Choose starting stat preset
5. Confirm

## 12.2 Appearance Options

Minimum:

* Body type A/B
* Hair style
* Hair color
* Outfit palette based on class
* Skin tone

Cosmetic scope should stay small for the first full version.

## 12.3 Starting Classes

The playable classes are:

1. **Swordsman**
2. **Mage**
3. **Archer**
4. **Thief**

Removed as playable base classes:

* Merchant
* Acolyte

These are redesigned as NPC support systems, town services, and optional summons.

---

# 13. Class System

## 13.1 Class Philosophy

Each class must be fully viable for solo play.

No class should require a party.

Each class must have:

* A basic attack identity
* At least one single-target damage option
* At least one area option
* At least one defensive or escape option
* At least one sustain or recovery option
* Multiple build paths

## 13.2 Class Progression

The player chooses a base class at character creation.

At level 40, the player unlocks an advanced specialization.

The specialization does not erase the base class. It expands it.

| Base Class | Advanced Option 1 | Advanced Option 2 |
| ---------- | ----------------- | ----------------- |
| Swordsman  | Knight            | Guardian          |
| Mage       | Wizard            | Sage              |
| Archer     | Hunter            | Minstrel          |
| Thief      | Assassin          | Rogue             |

## 13.3 Why These Classes?

Playable classes should focus on direct solo adventuring.

Removed from playable roster:

| Removed Class Type | Reason                                            | New Role                                      |
| ------------------ | ------------------------------------------------- | --------------------------------------------- |
| Merchant           | Too economy-focused for solo play as a core class | NPC shops, crafting, cart traders, refinement |
| Acolyte            | Too support-focused for solo play as a core class | Healing NPCs, support summons, shrine buffs   |

Merchant and Acolyte concepts are still valuable, but they work better as world systems.

---

# 14. Player Attributes

The game uses six core attributes.

| Attribute | Main Effects                                          |
| --------- | ----------------------------------------------------- |
| STR       | Melee damage, carry weight, physical skill scaling    |
| AGI       | Attack speed, dodge, movement recovery                |
| VIT       | Max HP, defense, status resistance                    |
| INT       | Magic damage, max SP, SP recovery                     |
| DEX       | Accuracy, ranged damage, cast speed                   |
| LUK       | Critical chance, rare effect chance, small drop bonus |

## 14.1 Attribute Allocation

Each level grants attribute points.

Suggested progression:

| Level Range | Points Per Level |
| ----------- | ---------------: |
| 1–30        |                3 |
| 31–60       |                4 |
| 61–99       |                5 |

## 14.2 Attribute Cost

Attributes become more expensive as they increase.

| Attribute Value | Cost Per Point |
| --------------: | -------------: |
|            1–20 |              1 |
|           21–40 |              2 |
|           41–60 |              3 |
|           61–80 |              4 |
|           81–99 |              5 |

This creates long-term build commitment.

## 14.3 Derived Stats

| Derived Stat    | Formula Direction                 |
| --------------- | --------------------------------- |
| Max HP          | Level + VIT + class modifier      |
| Max SP          | Level + INT + class modifier      |
| Physical Attack | Weapon attack + STR/DEX scaling   |
| Magic Attack    | Weapon magic attack + INT scaling |
| Hit             | Level + DEX + LUK                 |
| Dodge           | Level + AGI + LUK                 |
| Critical        | LUK + equipment                   |
| Attack Speed    | Weapon type + AGI + DEX           |
| Defense         | Armor + VIT                       |
| Magic Defense   | Gear + INT                        |

---

# 15. Leveling System

There is one character level.

No separate base level and job level.

Maximum level: **99**

Each level grants:

* Attribute points
* Skill point
* Small automatic class stat growth
* Access to higher-level equipment and maps

## 15.1 XP Curve

The XP curve should feel grindy enough to support long play, but not as punishing as an MMO.

Suggested formula:

```text
XP_To_Next_Level = round(50 * Level^2 + 6 * Level^3)
```

Example pacing:

| Level | Expected State                       |
| ----: | ------------------------------------ |
|     1 | Character creation                   |
|     5 | Basic class loop understood          |
|    10 | First gear upgrades                  |
|    20 | First dungeon clears                 |
|    30 | First serious build decisions        |
|    40 | Advanced specialization unlocked     |
|    55 | Midgame boss farming                 |
|    70 | Campaign late game                   |
|    80 | Campaign completion range            |
| 90–99 | Endgame farming and build perfection |

---

# 16. Skill System

## 16.1 Skill Points

The player gains 1 skill point per level.

Skills have level requirements and sometimes skill prerequisites.

Because this is a solo hobby project, skill trees should be meaningful but not overly complex.

## 16.2 Skill Tree Structure

Each class has three branches:

| Branch Type        | Purpose                                |
| ------------------ | -------------------------------------- |
| Core Damage        | Main offensive skills                  |
| Utility / Survival | Movement, defense, sustain             |
| Build Specialty    | Passive modifiers and unique mechanics |

Each base class should have around:

* 8–12 base skills
* 8–12 advanced specialization skills
* 3–5 passives
* 1 capstone per specialization

---

# 17. Playable Classes

---

## 17.1 Swordsman

### Fantasy

A durable melee fighter who wins through weapon mastery, armor, positioning, and physical power.

### Combat Role

* Strong melee damage
* High HP
* Good defense
* Simple but reliable
* Best beginner class

### Main Stats

| Build          | Main Stats |
| -------------- | ---------- |
| Heavy Blade    | STR / VIT  |
| Fast Blade     | STR / AGI  |
| Shield Fighter | VIT / STR  |
| Skill Fighter  | STR / DEX  |

### Starting Weapon

Sword

### Basic Skills

| Skill           | Type    | Description                                      |
| --------------- | ------- | ------------------------------------------------ |
| Power Slash     | Active  | Strong single-target melee hit                   |
| Guard Stance    | Toggle  | Reduces damage but lowers movement speed         |
| Iron Body       | Passive | Increases HP and defense                         |
| Sweeping Cut    | Active  | Hits enemies in a small arc                      |
| Battle Cry      | Active  | Temporarily increases attack                     |
| Endure Pain     | Active  | Reduces stagger and knockback                    |
| Weapon Training | Passive | Increases melee weapon damage                    |
| Counter Blow    | Active  | Brief defensive window followed by counterattack |

---

## 17.2 Swordsman Advanced: Knight

### Fantasy

A mobile heavy warrior focused on aggressive melee damage.

### Specialty

* Two-handed weapons
* Charge attacks
* Cleave damage
* High burst physical damage

### Skills

| Skill            | Type     | Description                                          |
| ---------------- | -------- | ---------------------------------------------------- |
| Two-Hand Mastery | Passive  | Increases two-handed weapon damage                   |
| Charge Thrust    | Active   | Dashes to target and deals damage                    |
| Whirlwind Blade  | Active   | Circular AoE attack                                  |
| Heavy Impact     | Active   | Slow but powerful hit                                |
| Momentum         | Passive  | Consecutive attacks increase damage                  |
| Warpath          | Active   | Temporarily increases movement and attack speed      |
| Armor Breaker    | Active   | Reduces enemy defense                                |
| Knight’s Oath    | Capstone | Greatly improves melee damage after defeating elites |

---

## 17.3 Swordsman Advanced: Guardian

### Fantasy

A defensive fighter who uses shields, holy protection, and counterattacks.

### Specialty

* Shields
* Defense
* Sustain
* Anti-undead and anti-demon combat

### Skills

| Skill          | Type     | Description                               |
| -------------- | -------- | ----------------------------------------- |
| Shield Mastery | Passive  | Improves block and defense                |
| Shield Bash    | Active   | Stuns or interrupts enemies               |
| Radiant Guard  | Active   | Temporarily reduces incoming damage       |
| Retaliation    | Passive  | Chance to counter after blocking          |
| Sacred Edge    | Active   | Adds holy damage to attacks               |
| Last Stand     | Active   | Increases defense at low HP               |
| Barrier Circle | Active   | Creates a protective zone                 |
| Guardian’s Vow | Capstone | Converts some blocked damage into healing |

---

## 17.4 Mage

### Fantasy

A ranged spellcaster who manipulates elements and controls the battlefield.

### Combat Role

* High magic damage
* Low physical durability
* Strong elemental tools
* Area control

### Main Stats

| Build           | Main Stats |
| --------------- | ---------- |
| Elemental Nuker | INT / DEX  |
| Control Mage    | INT / VIT  |
| Fast Caster     | DEX / INT  |
| Crit Spell Mage | INT / LUK  |

### Starting Weapon

Staff

### Basic Skills

| Skill           | Type    | Description                           |
| --------------- | ------- | ------------------------------------- |
| Fire Bolt       | Active  | Single-target fire spell              |
| Frost Bolt      | Active  | Single-target ice spell, slows target |
| Lightning Spark | Active  | Single-target lightning spell         |
| Mana Recovery   | Passive | Improves SP regeneration              |
| Arcane Shield   | Active  | Absorbs damage using SP               |
| Flame Wall      | Active  | Places damaging wall on ground        |
| Frost Ring      | Active  | Small AoE slow                        |
| Spell Focus     | Passive | Improves cast speed and spell damage  |

---

## 17.5 Mage Advanced: Wizard

### Fantasy

A destructive elemental caster with powerful AoE spells.

### Specialty

* Large AoE damage
* Elemental nukes
* Boss burst windows
* High SP usage

### Skills

| Skill             | Type     | Description                           |
| ----------------- | -------- | ------------------------------------- |
| Meteor Rain       | Active   | Delayed fire AoE                      |
| Blizzard Field    | Active   | Ice AoE that slows and may freeze     |
| Thunderstorm      | Active   | Lightning AoE around target area      |
| Elemental Amplify | Active   | Increases next spell damage           |
| Mana Surge        | Passive  | Increases max SP and spell damage     |
| Chain Casting     | Passive  | Chance to reduce next cast time       |
| Arcane Explosion  | Active   | High damage centered on caster        |
| Archwizard’s Seal | Capstone | Alternating elements increases damage |

---

## 17.6 Mage Advanced: Sage

### Fantasy

A tactical spellcaster who manipulates elements, magic rules, and enemy weaknesses.

### Specialty

* Elemental enchantments
* Anti-magic
* Utility
* Hybrid weapon/spell builds

### Skills

| Skill            | Type     | Description                                          |
| ---------------- | -------- | ---------------------------------------------------- |
| Elemental Weapon | Active   | Adds chosen element to weapon attacks                |
| Spell Break      | Active   | Interrupts enemy casting                             |
| Magic Field      | Active   | Creates a zone that modifies elemental damage        |
| Elemental Study  | Passive  | Increases damage against known monster weaknesses    |
| Mana Conversion  | Active   | Converts HP into SP                                  |
| Rune Trap        | Active   | Places a magical trap                                |
| Dispel Hex       | Active   | Removes buffs from enemies or debuffs from self      |
| Sage’s Equation  | Capstone | Exploiting weakness refunds SP and reduces cooldowns |

---

## 17.7 Archer

### Fantasy

A ranged physical class that controls distance, uses arrows, traps, and precision.

### Combat Role

* Strong ranged damage
* Kiting
* Traps
* Good single-target damage
* Fragile if surrounded

### Main Stats

| Build           | Main Stats |
| --------------- | ---------- |
| Sniper          | DEX / AGI  |
| Trap Archer     | DEX / INT  |
| Crit Archer     | DEX / LUK  |
| Survival Archer | DEX / VIT  |

### Starting Weapon

Bow

### Basic Skills

| Skill            | Type    | Description                               |
| ---------------- | ------- | ----------------------------------------- |
| Double Shot      | Active  | Fires two arrows at one target            |
| Arrow Rain       | Active  | Small area arrow attack                   |
| Hawk Eye         | Passive | Increases range and accuracy              |
| Quick Step       | Active  | Short repositioning move away from target |
| Elemental Arrows | Passive | Unlocks elemental arrow usage             |
| Pinning Shot     | Active  | Slows target                              |
| Focus            | Active  | Temporarily increases DEX and crit        |
| Bow Training     | Passive | Increases bow damage                      |

---

## 17.8 Archer Advanced: Hunter

### Fantasy

A wilderness fighter using traps, animal support, and precise shots.

### Specialty

* Traps
* Companion bird
* Map control
* Boss preparation

### Skills

| Skill            | Type     | Description                                          |
| ---------------- | -------- | ---------------------------------------------------- |
| Falcon Companion | Passive  | Summons a bird that sometimes attacks                |
| Snare Trap       | Active   | Roots enemies                                        |
| Blast Trap       | Active   | Explodes after delay                                 |
| Mark Prey        | Active   | Increases damage against one target                  |
| Camouflage       | Active   | Reduces enemy detection range                        |
| Beast Knowledge  | Passive  | More damage against beasts/insects/brutes            |
| Piercing Shot    | Active   | Arrow that passes through enemies                    |
| Apex Hunter      | Capstone | Marked enemies take increased trap and falcon damage |

---

## 17.9 Archer Advanced: Minstrel

### Fantasy

A ranged performer who uses music to empower self, weaken enemies, and fight with rhythm.

### Why Minstrel Instead of Bard/Dancer?

For a solo game, gender-split Bard/Dancer design is unnecessary. This game uses one class: **Minstrel**.

### Specialty

* Self-buffs
* Enemy debuffs
* Ranged attacks
* Rhythm-based skill chaining

### Skills

| Skill            | Type     | Description                                         |
| ---------------- | -------- | --------------------------------------------------- |
| Battle Song      | Active   | Increases attack speed and movement speed           |
| Weakening Verse  | Active   | Reduces enemy defense                               |
| Echo Shot        | Active   | Ranged attack that repeats after delay              |
| Restorative Tune | Active   | Regenerates HP slowly                               |
| Rhythm Flow      | Passive  | Using different skills in sequence improves effects |
| Discord Note     | Active   | Small AoE confusion/slow                            |
| Spirit Chorus    | Active   | Boosts support summon temporarily                   |
| Final Refrain    | Capstone | Every third skill triggers an echo effect           |

---

## 17.10 Thief

### Fantasy

A fast melee fighter who uses daggers, evasion, poison, stealth, and critical hits.

### Combat Role

* High mobility
* High single-target damage
* Evasion
* Poison
* Loot bonuses

### Main Stats

| Build          | Main Stats       |
| -------------- | ---------------- |
| Crit Dagger    | AGI / LUK        |
| Poison Thief   | AGI / INT or DEX |
| Backstabber    | STR / AGI        |
| Evasive Farmer | AGI / DEX / LUK  |

### Starting Weapon

Dagger

### Basic Skills

| Skill          | Type    | Description                                            |
| -------------- | ------- | ------------------------------------------------------ |
| Quick Stab     | Active  | Fast melee attack                                      |
| Backstep       | Active  | Short retreat movement                                 |
| Dodge Training | Passive | Increases dodge                                        |
| Poison Blade   | Active  | Adds poison to next attacks                            |
| Steal Chance   | Passive | Small chance for extra material drop                   |
| Shadow Walk    | Active  | Briefly lowers enemy detection                         |
| Backstab       | Active  | Bonus damage from behind or against distracted enemies |
| Dirty Fighting | Passive | Increases damage against debuffed enemies              |

---

## 17.11 Thief Advanced: Assassin

### Fantasy

A lethal damage dealer focused on poison, critical hits, and burst.

### Specialty

* Daggers or katars
* Critical damage
* Poison stacking
* Boss assassination

### Skills

| Skill           | Type     | Description                                           |
| --------------- | -------- | ----------------------------------------------------- |
| Katar Mastery   | Passive  | Improves katar damage and crit                        |
| Venom Stack     | Passive  | Poison effects stack higher                           |
| Sonic Strike    | Active   | Rapid burst attack                                    |
| Grim Edge       | Active   | Line attack from short range                          |
| Fatal Wound     | Active   | Increases damage over time on target                  |
| Evasion Burst   | Active   | Brief dodge increase                                  |
| Execution       | Active   | Deals bonus damage to low-HP enemies                  |
| Assassin’s Mark | Capstone | Critical hits extend poison and increase burst damage |

---

## 17.12 Thief Advanced: Rogue

### Fantasy

A tricky fighter who steals, disrupts, uses dirty tactics, and can fight with dagger or bow.

### Specialty

* Farming
* Debuffs
* Hybrid weapons
* Control
* Item discovery

### Skills

| Skill           | Type     | Description                                        |
| --------------- | -------- | -------------------------------------------------- |
| Mug             | Active   | Deals damage and increases drop chance from target |
| Trick Shot      | Active   | Ranged attack usable with bow or throwing knife    |
| Smoke Bomb      | Active   | Creates escape cloud                               |
| Disable Armor   | Active   | Reduces enemy defense                              |
| Treasure Sense  | Passive  | Reveals rare gathering nodes and loot containers   |
| Ambush          | Passive  | Bonus damage when attacking first                  |
| Copy Technique  | Active   | Temporarily mimics a basic enemy skill             |
| Rogue’s Fortune | Capstone | Elite and boss kills have improved material drops  |

---

# 18. Support Classes as NPCs and Summons

Merchant and Acolyte-inspired concepts are valuable, but not ideal as playable solo classes.

They become support systems.

---

## 18.1 Merchant Support

Merchant-like systems become town and progression features.

### Merchant NPC Functions

| NPC                 | Function                             |
| ------------------- | ------------------------------------ |
| Cart Trader         | Buys monster drops, sells bulk goods |
| Traveling Merchant  | Appears on maps with temporary deals |
| Market Clerk        | Lets player buy basic materials      |
| Appraiser           | Identifies rare equipment            |
| Contract Broker     | Converts trophies into rewards       |
| Refinement Supplier | Sells ores and catalysts             |

### Merchant Support Summon: Pack Sprite

The player can unlock a support companion inspired by merchant utility.

| Feature            | Effect                                     |
| ------------------ | ------------------------------------------ |
| Extra Carry Weight | Increases inventory capacity               |
| Auto Pickup Filter | Collects selected item types               |
| Emergency Potion   | Occasionally throws potion to player       |
| Trade Sense        | Slightly increases gold from monster drops |
| Material Finder    | Highlights nearby gathering nodes          |

This summon should not replace combat skill. It is a utility support option.

---

## 18.2 Acolyte Support

Acolyte-like systems become healing, shrine, and support mechanics.

### Acolyte NPC Functions

| NPC              | Function                       |
| ---------------- | ------------------------------ |
| Healer           | Restores HP/SP in town         |
| Shrine Keeper    | Grants temporary blessings     |
| Exorcist         | Gives anti-undead contracts    |
| Chapel Archivist | Provides lore and holy recipes |
| Blessing Vendor  | Sells limited buff scrolls     |

### Acolyte Support Summon: Shrine Wisp

The player can unlock a support companion focused on sustain.

| Feature        | Effect                                     |
| -------------- | ------------------------------------------ |
| Minor Heal     | Periodically heals player                  |
| Cleanse        | Removes poison/curse after cooldown        |
| Blessing Aura  | Small stat buff                            |
| Spirit Barrier | Temporary shield at low HP                 |
| Undead Ward    | Bonus resistance against undead/demon mobs |

The support summon must be weaker than a real playable class would be. It supports the player’s chosen class, but does not dominate combat.

---

## 18.3 Support Slot Rules

The player can equip one support companion at a time.

Support companions:

* Level up separately through use
* Have simple skill trees
* Cannot die permanently
* Can be changed in town
* Have cooldown-based support actions
* Do not require micromanagement

Support types:

| Support         | Role                      |
| --------------- | ------------------------- |
| Pack Sprite     | Utility, carry, loot      |
| Shrine Wisp     | Healing, cleanse, defense |
| Battle Peco     | Mobility, charge assist   |
| Arcane Familiar | SP sustain, magic buff    |
| Forest Hawk     | Ranged assist, scouting   |

---
