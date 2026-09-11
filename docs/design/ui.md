# UI

# 35. User Interface

## 35.1 Main HUD

Main HUD should show:

* HP bar
* SP bar
* Level
* XP bar
* Current target
* Skill hotbar
* Potion slots
* Buff/debuff icons
* Minimap
* Gold indicator
* Weight indicator

## 35.2 Important Screens

| Screen     | Purpose                         |
| ---------- | ------------------------------- |
| Character  | Stats and derived stats         |
| Skills     | Skill tree and skill assignment |
| Inventory  | Items, materials, consumables   |
| Equipment  | Gear management                 |
| Crafting   | Recipes and materials           |
| Refinement | Upgrade gear                    |
| Map        | Region map and discovered zones |
| Bestiary   | Monster data                    |
| Quest Log  | Campaign and optional quests    |
| Support    | Companion configuration         |
| Storage    | Town storage                    |

## 35.3 Equipment Comparison

When hovering gear, show:

* Current item
* New item
* Stat differences
* Damage change estimate
* Defense change estimate
* Lost effects
* Gained effects
* Required class/level
* Refinement level

Example:

```text
Iron Sword +3
Attack: 42
STR +2

Compared to Bronze Sword +2:
Attack: +11
STR: +2
Attack Speed: -3%
Estimated DPS: +8.5%
```

---

# 44. Accessibility and Options

## 44.1 Gameplay Options

| Option                       | Purpose                    |
| ---------------------------- | -------------------------- |
| Difficulty presets           | Story, Normal, Veteran     |
| Auto-potion threshold        | Helps casual play          |
| Click indicator              | Shows movement target      |
| Hold-to-show loot            | Helps visibility           |
| Text speed                   | Dialogue comfort           |
| UI scale                     | Readability                |
| Damage numbers toggle        | Clarity or reduced clutter |
| Screen shake toggle          | Comfort                    |
| Colorblind-friendly elements | Status readability         |

## 44.2 Difficulty Presets

| Difficulty | Description                                     |
| ---------- | ----------------------------------------------- |
| Story      | Easier combat, better drops, lower penalties    |
| Normal     | Intended experience                             |
| Veteran    | Stronger mobs, lower drop pity, harsher economy |

Difficulty should not lock content.

---
