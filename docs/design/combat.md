# Combat

# 19. Combat System

## 19.1 Combat Style

Combat is real-time, point-and-click, with hotkey skills.

The player clicks to move and attack while using keyboard hotkeys for skills.

The combat should not be too twitch-heavy. It should reward:

* Preparation
* Positioning
* Build choices
* Element matching
* Gear upgrades
* Skill timing
* Knowing monster behavior

## 19.2 Auto-Attack

When the player clicks an enemy:

1. Character moves into attack range.
2. Character attacks automatically.
3. Character continues attacking until:

   * Enemy dies
   * Player clicks elsewhere
   * Player uses a skill
   * Enemy moves out of range
   * Player is interrupted

## 19.3 Skill Combat

Skills consume SP and may have cooldowns.

Skill properties:

| Property      | Description                    |
| ------------- | ------------------------------ |
| SP Cost       | Resource cost                  |
| Cooldown      | Time before reuse              |
| Cast Time     | Delay before activation        |
| Recovery Time | Short lockout after skill      |
| Range         | Melee, ranged, ground-targeted |
| Element       | Damage type                    |
| Scaling       | STR, INT, DEX, etc.            |
| Status        | Poison, stun, slow, burn, etc. |

## 19.4 Damage Types

| Type            | Used By                           |
| --------------- | --------------------------------- |
| Physical Melee  | Swordsman, Thief                  |
| Physical Ranged | Archer, Rogue                     |
| Magical         | Mage, Wizard, Sage                |
| Poison          | Thief, Assassin, swamp monsters   |
| Holy            | Guardian, shrine effects          |
| Dark            | Undead, demons, corrupted enemies |
| Neutral         | Most basic attacks                |

## 19.5 Elements

Elements should matter but not become overwhelming.

Suggested elements:

| Element   | Strong Against                  | Weak Against       |
| --------- | ------------------------------- | ------------------ |
| Fire      | Plant, insect, ice              | Water              |
| Water     | Fire, desert mobs               | Lightning          |
| Lightning | Water, machines                 | Earth              |
| Earth     | Lightning, flying-light enemies | Fire               |
| Holy      | Undead, demon                   | Dark               |
| Dark      | Holy enemies                    | Holy               |
| Poison    | Living organic enemies          | Undead, machines   |
| Neutral   | No strong advantage             | No strong weakness |

Elemental advantage should feel meaningful.

Suggested multipliers:

| Matchup          | Multiplier |
| ---------------- | ---------: |
| Strong           |       1.5× |
| Normal           |       1.0× |
| Weak             |       0.7× |
| Immune/Resistant |       0.3× |

---

# 20. Core Combat Formulas

These formulas should be simple enough for implementation and balancing.

## 20.1 Physical Damage

```text
PhysicalAttack = WeaponAttack + STR * 1.4 + DEX * 0.4 + Level * 0.3

PhysicalDamage =
max(1, PhysicalAttack * SkillMultiplier * ElementMultiplier - EnemyDefense)
```

## 20.2 Ranged Damage

```text
RangedAttack = WeaponAttack + DEX * 1.4 + STR * 0.2 + Level * 0.3

RangedDamage =
max(1, RangedAttack * SkillMultiplier * ElementMultiplier - EnemyDefense)
```

## 20.3 Magic Damage

```text
MagicAttack = WeaponMagic + INT * 1.6 + DEX * 0.2 + Level * 0.3

MagicDamage =
max(1, MagicAttack * SkillMultiplier * ElementMultiplier - EnemyMagicDefense)
```

## 20.4 Hit Chance

```text
Hit = 150 + Level + DEX * 1.5 + LUK * 0.3
Dodge = 100 + Level + AGI * 1.6 + LUK * 0.2

HitChance = clamp(60%, 95%, 80% + (Hit - EnemyDodge) / 100)
```

## 20.5 Critical Chance

```text
CritChance = 5% + LUK * 0.25% + GearCritBonus
```

## 20.6 Critical Damage

```text
CriticalDamage = FinalPhysicalDamage * 1.5
```

Some skills and gear can increase this.

---

# 21. Status Effects

Status effects should be readable and useful.

| Status      | Effect                                            |
| ----------- | ------------------------------------------------- |
| Poison      | Damage over time, reduced healing                 |
| Burn        | Damage over time, stronger against plants/insects |
| Freeze      | Cannot move briefly, takes more physical damage   |
| Slow        | Reduced movement and attack speed                 |
| Stun        | Cannot act briefly                                |
| Blind       | Reduced accuracy                                  |
| Curse       | Reduced movement and LUK                          |
| Silence     | Cannot cast spells                                |
| Bleed       | Physical damage over time                         |
| Armor Break | Reduced defense                                   |
| Marked      | Takes increased damage from source                |
| Shielded    | Absorbs incoming damage                           |
| Blessed     | Increased stats temporarily                       |

Status effects should have visible icons near the HP/SP UI.

---

# 22. Monsters

## 22.1 Monster Design Goals

Every monster should have:

* Name
* Level
* HP
* Damage
* Defense
* Element
* Race/family
* Behavior
* Drops
* Spawn region
* At least one readable combat trait

## 22.2 Monster Families

| Family    | Common Traits                                  |
| --------- | ---------------------------------------------- |
| Slime     | Weak, beginner-friendly, material drops        |
| Beast     | Fast, physical, pack behavior                  |
| Plant     | Weak to fire, often stationary or poison-based |
| Insect    | Swarm behavior, armor materials                |
| Undead    | Weak to holy/fire, curse effects               |
| Demon     | High damage, dark skills                       |
| Construct | High defense, weak to lightning                |
| Aquatic   | Water element, slows, ranged attacks           |
| Reptile   | Poison and ambush behavior                     |
| Bandit    | Humanoid, uses weapons and tactics             |
| Spirit    | Magic damage, low physical defense             |
| Boss      | Unique mechanics                               |

## 22.3 Monster Behavior Types

| Behavior   | Description                             |
| ---------- | --------------------------------------- |
| Passive    | Does not attack unless attacked         |
| Aggressive | Attacks player on sight                 |
| Assist     | Nearby same-family mobs help each other |
| Coward     | Runs away at low HP                     |
| Caster     | Uses ranged skills                      |
| Charger    | Rushes toward player                    |
| Looter     | Moves toward dropped items or resources |
| Patrol     | Walks along a path                      |
| Ambusher   | Hidden until player approaches          |
| Elite      | Stronger version with special modifier  |
| Boss       | Special mechanics and resistances       |

---

# 23. Example Monster Roster

## 23.1 Early Game

| Monster      | Level | Region            | Element | Behavior   | Key Drops                 |
| ------------ | ----: | ----------------- | ------- | ---------- | ------------------------- |
| Green Jelly  |     1 | Crownfield        | Neutral | Passive    | Jelly Core, Soft Fluid    |
| Field Hopper |     3 | Crownfield        | Earth   | Passive    | Insect Wing               |
| Training Rat |     4 | Crownfield Sewers | Neutral | Aggressive | Rat Tail, Old Cloth       |
| Road Thief   |     6 | Crownfield Roads  | Neutral | Aggressive | Copper Coin, Torn Bandana |
| Wild Pup     |     8 | Crownfield        | Neutral | Assist     | Fur, Small Fang           |
| Sewer Spore  |    10 | Sewers            | Poison  | Stationary | Spore Cap, Toxin Dust     |

## 23.2 Midgame

| Monster       | Level | Region      | Element | Behavior   | Key Drops             |
| ------------- | ----: | ----------- | ------- | ---------- | --------------------- |
| Moss Wolf     |    16 | Mossvale    | Neutral | Assist     | Wolf Fur, Sharp Fang  |
| Vine Crawler  |    18 | Mossvale    | Earth   | Ambusher   | Vine Fiber            |
| Sand Viper    |    24 | Amber Dunes | Poison  | Aggressive | Venom Sac             |
| Dune Bandit   |    28 | Amber Dunes | Neutral | Patrol     | Curved Dagger         |
| Bronze Beetle |    32 | Ironroot    | Earth   | Assist     | Bronze Shell          |
| Cave Goblin   |    36 | Ironroot    | Neutral | Aggressive | Goblin Ear, Crude Ore |

## 23.3 Late Game

| Monster        | Level | Region         | Element   | Behavior   | Key Drops     |
| -------------- | ----: | -------------- | --------- | ---------- | ------------- |
| Marsh Wraith   |    48 | Moonveil       | Dark      | Caster     | Ectoplasm     |
| Rotting Knight |    52 | Moonveil       | Undead    | Aggressive | Rusted Plate  |
| Star Construct |    62 | Starfall Tower | Lightning | Caster     | Arcane Core   |
| Fallen Scholar |    68 | Starfall Tower | Dark      | Caster     | Torn Grimoire |
| Abyss Hound    |    74 | Starfall Tower | Dark      | Charger    | Demon Fang    |
| Rune Sentinel  |    80 | Starfall Tower | Neutral   | Elite      | Rune Alloy    |

---

# 24. MVP Boss System

## 24.1 MVP Philosophy

MVPs are powerful map bosses inspired by classic MMO boss hunting, but adapted for single-player.

They should be:

* Farmable
* Difficult
* Mechanically distinct
* Rewarding
* Not locked behind real-time waiting
* Important for rare gear and materials

## 24.2 MVP Access

Each MVP can be encountered in two ways:

1. **World Spawn**

   * Appears in its map after conditions are met
   * Respawn timer is short enough for solo play

2. **Summoning Ritual**

   * Player spends materials to summon the MVP
   * Allows deterministic farming

## 24.3 Recommended Spawn Rules

| Boss Type     | Respawn                       |
| ------------- | ----------------------------- |
| Field Elite   | 3–5 minutes                   |
| Miniboss      | 8–12 minutes                  |
| Regional MVP  | 20–30 minutes                 |
| Endgame MVP   | Summon-based or 30–45 minutes |
| Campaign Boss | Replayable after story clear  |

## 24.4 MVP Rewards

MVPs drop:

* Rare crafting materials
* Unique weapons
* Unique armor
* Sigils
* Cosmetic items
* Boss trophies
* Skill augment items
* High-value sell items

## 24.5 Example MVPs

| MVP                | Level | Region         | Theme             | Main Reward             |
| ------------------ | ----: | -------------- | ----------------- | ----------------------- |
| King Slime Verdant |    15 | Crownfield     | Beginner MVP      | Slime Crown, Jelly Core |
| Thorn Matriarch    |    30 | Mossvale       | Plant queen       | Thorn Bow, Vine Heart   |
| Sunken Corsair     |    38 | Blueharbor     | Pirate ghost      | Ghost Saber             |
| Brass Burrower     |    45 | Ironroot       | Giant beetle      | Brass Shell Plate       |
| Dune Tyrant        |    50 | Amber Dunes    | Desert beast      | Tyrant Fang             |
| Bell Wraith        |    60 | Moonveil       | Undead caster     | Wraith Bell             |
| Rune Chimera       |    75 | Starfall Tower | Elemental boss    | Chimera Core            |
| Fallen Star Saint  |    90 | Starfall Tower | Final endgame MVP | Star Saint Sigil        |

---
