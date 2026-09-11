# Epic M11-E01 — Draft-Inspired UX and Game Feel Refactor

## Epic Goal

Refactor Phrok's presentation layer and moment-to-moment game feel using `franklinjr12/DraftRagnarokSinglePlayer` as the primary UX and presentation reference while preserving the substantially richer gameplay systems, content, art, progression and architecture already present in Phrok.

The target can be summarized as:

> **Phrok's content, sprites, systems and gameplay depth + DraftRagnarokSinglePlayer's interface quality, interaction model, animation language and game feel.**

The Draft project should be treated as the reference for:

* Visual hierarchy
* HUD composition
* RPG window presentation
* Window interactions
* Character presentation
* Monster presentation
* Combat responsiveness
* Casting feedback
* Interaction feedback
* Target presentation
* Movement feel
* Menu quality
* Dialogue presentation
* Hotbar UX
* Inventory UX
* Equipment UX
* Character/stat UX
* Skill-tree UX
* World-map UX
* Shop UX
* System-menu UX
* Transitions
* Moment-to-moment polish

However, Draft should **not** replace Phrok's existing gameplay architecture.

Phrok remains authoritative for:

* Player sprites
* Monster sprites
* NPC sprites
* Support sprites
* Maps
* Classes
* Advanced classes
* Skills
* Skill mechanics
* Combat formulas
* Item definitions
* Equipment
* Refinement
* Crafting
* Storage
* Bestiary
* Quests
* Hunting contracts
* Bosses
* Challenge dungeons
* Supports
* Status effects
* Save system
* Progression
* Balance
* Data registry
* Existing EventBus contracts
* Existing gameplay tests

The goal is not to turn Phrok into Draft.

The goal is to make **Phrok feel as polished and readable as Draft while retaining everything that makes Phrok the larger and deeper game.**

---

# Background

The Draft project demonstrates considerably better presentation and usability even though it contains significantly less gameplay content.

Its advantage does not come from having more complex systems.

It comes from presenting simple systems extremely clearly.

The most important improvements to import are architectural and experiential rather than mechanical.

---

# Why Draft Feels Better

## 1. The interface has one coherent visual language

Draft uses a consistent RPG presentation across:

* HUD
* Inventory
* Equipment
* Character
* Skills
* Dialogue
* Maps
* Shops
* System menu
* Target information
* Notifications

The same visual vocabulary appears throughout:

* Warm paper-like surfaces
* Dark green framing
* Gold accents
* Strong serif headings
* Compact readable body information
* Soft shadows
* Clear borders
* Clearly separated sections
* Consistent spacing
* Strong visual hierarchy

Phrok currently exposes significantly more information, but presentation is more utilitarian.

This epic should make Phrok's UI feel like one intentional game interface rather than a collection of functional debug-era screens.

---

## 2. Draft keeps the world visible and alive

One of Draft's strongest interaction decisions is that ordinary RPG windows behave like windows rather than full-screen modal states.

Examples include:

* Inventory
* Character
* Equipment
* Skills

These windows:

* Appear over the world
* Can coexist
* Can overlap
* Can be dragged
* Gain focus when clicked
* Stack using z-order
* Can be independently closed
* Usually do not pause or block the game

This strongly reinforces the feeling that the UI belongs to the world instead of replacing it.

Phrok should adopt this behavior wherever appropriate.

---

## 3. Draft continuously communicates context

Draft keeps relevant information visible around gameplay without overwhelming the player.

Examples include:

* Character identity
* HP/SP
* Base level
* Job level
* Region name
* Target information
* Mini-map
* Hotbar
* Journey hint
* Field log
* Notifications
* Bottom navigation
* Contextual interaction feedback

Phrok already has much of this information internally.

The improvement is primarily presentation and prioritization.

---

## 4. Actions immediately produce visual feedback

Draft consistently acknowledges player actions.

Examples include:

* Click markers
* Selection highlights
* Walking animation
* Attack movement
* Hurt reactions
* Damage flashes
* Projectiles
* Floating damage
* Death animation
* Cast bars
* Spell effects
* Portal pulses
* Level-up bursts
* Map fades

The player rarely performs an action without the game visually acknowledging it.

Phrok already contains a good `VfxManager`, melee lunge behavior, screen shake, flashes and several other presentation systems.

The objective is therefore **not to replace Phrok's VFX architecture**.

The objective is to orchestrate the existing systems more consistently.

---

## 5. Draft creates animation even without complex spritesheets

Draft demonstrates that a static sprite does not need to look static.

Useful techniques include:

* Position bobbing
* Slight scale changes
* Rotation
* Horizontal flipping
* Alpha changes
* Tint flashes
* Squash/stretch
* Short attack displacement
* Hurt recoil
* Death rotation
* Death collapse
* Spawn fades

This is particularly relevant because many Phrok assets are individual sprite images rather than large animation sheets.

The existing Phrok sprites should therefore be preserved and given life through transform-based presentation animation wherever necessary.

---

## 6. Draft prioritizes information better

Draft's screens usually make the most important information immediately recognizable.

For example:

Inventory prioritizes:

1. Item icon
2. Item name
3. Quantity
4. Description
5. Relevant stats
6. Actions

Skills prioritize:

1. Skill identity
2. Learned state
3. Level
4. Requirements
5. Cost
6. Assignment to hotbar

Character information prioritizes:

1. Character identity
2. Progression
3. Available stat points
4. Base stats
5. Derived stats

Phrok's redesign should emphasize **information hierarchy before information density**.

---

# Important Repository Update Incorporated Into This Epic

The current Phrok repository already contains a significant UI/world architecture refactor that should now be treated as the foundation for this epic.

The new architecture introduces or begins introducing:

```text
src/game/ui/
├── UIContext.ts
├── uiTheme.ts
├── debug/
│   └── UIDebugAdapter.ts
├── hud/
│   └── HotbarHud.ts
└── panels/
    ├── PanelHost.ts
    ├── panelPrimitives.ts
    ├── panelTypes.ts
    ├── character/
    │   └── CharacterPanel.ts
    ├── equipment/
    │   └── EquipmentPanel.ts
    ├── inventory/
    │   └── InventoryPanel.ts
    └── skills/
        └── SkillsPanel.ts

src/game/world/
├── WorldContext.ts
├── worldTypes.ts
└── debug/
    └── WorldDebugAdapter.ts
```

The latest update also adds missing Phrok sprite assets including dedicated Moonveil NPC sprites and the pack support sprite.

These changes mean this epic should **continue Phrok's new modular UI direction rather than discard it.**

---

# Architecture Decision

## Previous idea that should no longer be followed

Do **not** perform a wholesale migration from Phaser UI to a DOM/CSS interface solely because Draft uses DOM.

Draft's DOM implementation is useful as a UX reference, but Phrok's newly modularized Phaser UI architecture now provides a good implementation foundation.

---

## Target architecture

Keep Phaser 4 as Phrok's rendering and game framework.

Continue developing the existing modular UI runtime.

```text
Phaser 4 Application
│
├── World Runtime
│   ├── WorldScene
│   ├── PlayerEntity
│   ├── EnemyEntity
│   ├── NPC/runtime entities
│   ├── Combat systems
│   ├── Skill systems
│   ├── Progression systems
│   ├── VfxManager
│   ├── Audio
│   ├── WorldContext
│   └── WorldDebugAdapter
│
├── Shared Domain Systems
│   ├── GameState
│   ├── DataRegistry
│   ├── EventBus
│   ├── Inventory
│   ├── Equipment
│   ├── Stats
│   ├── Skills
│   ├── Crafting
│   ├── Refinement
│   ├── Storage
│   ├── Quests
│   ├── Hunting Board
│   └── Other existing systems
│
└── Modular UI Runtime
    ├── UIScene
    │   └── thin lifecycle/event orchestration
    │
    ├── UIContext
    │
    ├── Window/Panel Host
    │   └── evolved from current PanelHost
    │
    ├── HUD Modules
    │   ├── Character/Vitals
    │   ├── Hotbar
    │   ├── Target
    │   ├── Minimap
    │   ├── Effects
    │   └── Notifications
    │
    ├── Feature UIPanels
    │
    ├── Shared UI primitives
    │
    ├── Shared theme/design tokens
    │
    └── UIDebugAdapter
```

---

# DOM Usage Rule

HTML/DOM controls are allowed selectively when they provide a concrete usability advantage.

Examples:

* Search boxes
* Text entry
* Character-name input
* Possibly advanced accessibility interactions

Do not introduce a second complete UI framework beside the existing Phaser UI.

Do not use React.

Do not migrate all menus to HTML simply because Draft does so.

---

# Engine Rule

Phrok uses Phaser 4.

Draft uses Phaser 3.

Do not:

* Downgrade Phaser
* Replace Phaser 4
* Copy Phaser 3 APIs blindly
* Port world code wholesale

Instead:

> Reproduce Draft's behaviors using Phaser 4-compatible implementations within Phrok's existing architecture.

---

# Preservation Rules

Throughout this epic, preserve Phrok's existing content unless a task explicitly states otherwise.

## Art that must remain authoritative

Preserve existing:

* Player sprites
* Monster sprites
* NPC sprites
* Support sprites
* Item sprites
* Skill icons
* Map art
* Environmental assets

This includes the newly added:

* Moonveil Contract Scribe
* Moonveil Ferry Witch
* Moonveil Relic Mender
* Moonveil Storage Keeper
* Pack support sprite

Do not replace existing Phrok art with Draft art.

Draft may be used as an animation and presentation reference.

---

## Gameplay logic that must remain authoritative

Preserve:

* Combat calculations
* Damage formulas
* Stats
* Skill functionality
* Skill trees
* Skill costs
* Cooldowns
* Cast times
* Targeting rules
* Classes
* Advanced classes
* Equipment effects
* Item behavior
* Consumables
* Auto-potions
* Supports
* Loot
* Bestiary
* Crafting
* Refinement
* Storage
* Shops
* Appraisal
* Hunting Board
* Quests
* Boss logic
* Challenge dungeons
* Save compatibility

Presentation code should consume gameplay state rather than duplicate gameplay rules.

---

# UI State Rule

Do not duplicate game formulas or business rules inside presentation components.

UI modules should primarily:

* Read state
* Render state
* Emit intent
* React to EventBus events

Domain systems remain authoritative.

`UIDebugAdapter` and `WorldDebugAdapter` are diagnostic/test boundaries.

They are **not application state stores**.

---

# Input Ownership Model

Replace the current assumption that opening any panel automatically blocks gameplay.

Introduce explicit categories.

## Ordinary RPG window

Examples:

* Inventory
* Character
* Skills
* Equipment
* Bestiary
* Quest Log

Expected behavior:

* World continues updating
* Keyboard gameplay generally remains possible unless key is consumed by UI
* Clicking inside UI does not click the world
* Multiple windows may coexist
* No full-screen backdrop

---

## Modal window

Examples:

* Irreversible confirmations
* Character advancement confirmation
* Destructive save operations

Expected behavior:

* Blocks world interaction
* Receives exclusive pointer focus
* Escape behavior defined explicitly
* May use backdrop

---

## Dialogue interaction

Dialogue may block movement or interaction when required by the existing gameplay flow.

Preserve existing dialogue semantics unless intentionally redesigned by the corresponding task.

---

## Text-entry mode

When entering text:

* Character movement shortcuts must not trigger
* Hotbar shortcuts must not trigger
* UI receives keyboard input

---

## Ground-targeting / skill-targeting mode

Skill targeting owns relevant world pointer input until:

* Target selected
* Cast cancelled
* Escape pressed

---

## Game-over mode

Exclusive state.

Ordinary UI interactions are disabled until respawn/title action.

---

# Migration Strategy

This must be a gradual refactor.

Do not attempt to redesign the entire game in one Codex prompt.

Each task below is intended to represent approximately **one substantial but manageable Codex/Work prompt**.

For each task:

1. Inspect the relevant Phrok files.
2. Inspect only the matching Draft reference files needed.
3. Preserve Phrok's gameplay implementation.
4. Implement the targeted UX/presentation improvement.
5. Run focused tests.
6. Update tests where presentation structure legitimately changes.
7. Preserve diagnostic contracts where practical.
8. Report what was changed.
9. Report which Draft behavior was adopted.
10. Report which Phrok behavior was explicitly preserved.
11. Report any remaining parity gaps.

---

# Phase 1 — Complete the UI Foundation

## M11-E01-T001 — Establish Draft/Phrok UI parity baseline

### Goal

Create a concrete migration reference before large visual changes begin.

### Work

Inspect both projects and document the equivalent screens and behaviors.

Create a parity matrix covering at minimum:

* Title screen
* Save selection
* Character creation
* Main HUD
* Character
* Inventory
* Equipment
* Skills
* Bestiary
* Crafting
* Refinement
* Shops
* Appraisal
* Storage
* Hunting Board
* Quest Log
* World map
* Dialogue
* Settings/System menu
* Game over
* Hotbar
* Target UI
* Minimap
* Notifications
* Combat feedback
* Movement feedback
* Casting
* Loot
* Level up
* Portals
* Screen transitions

For each, record:

```text
Phrok current behavior
Draft reference behavior
Desired final Phrok behavior
Gameplay logic that must be preserved
Relevant files
Existing automated coverage
```

### Acceptance Criteria

* The parity document exists.
* Every major Draft screen is represented.
* Every Phrok-only screen is represented.
* Existing tests associated with each area are identified.
* No gameplay behavior is modified in this task.

---

## M11-E01-T002 — Stabilize and complete the modular UI foundation

### Goal

Finish the modularization already started in the latest Phrok refactor before major visual redesign work.

### Existing foundation to preserve

Build upon:

* `UIContext`
* `UIDebugAdapter`
* `PanelHost`
* `UIPanel`
* `PanelContext`
* `panelPrimitives`
* `uiTheme`
* `HotbarHud`
* `InventoryPanel`
* `EquipmentPanel`
* `CharacterPanel`
* `SkillsPanel`

Do not create a competing architecture.

### Work

Extract feature-specific UI still implemented directly inside `UIScene`.

Create dedicated `UIPanel` implementations for:

* Bestiary
* Crafting
* Refinement
* Shop
* Appraiser
* Storage
* Hunting Board
* Quest Log
* World Map
* Settings

Retain behavior exactly during extraction.

`UIScene` should increasingly become responsible for:

* Scene lifecycle
* HUD lifecycle
* EventBus subscriptions
* Opening requested windows
* High-level input routing

It should not contain large implementations for individual RPG screens.

### Acceptance Criteria

* Existing Inventory/Equipment/Character/Skills modules remain intact.
* Remaining feature screens have dedicated modules.
* `UIScene` becomes substantially smaller and more orchestration-focused.
* No gameplay mechanics are rewritten.
* Existing EventBus behavior remains compatible.
* Existing datasets remain compatible through `UIDebugAdapter`.
* Existing UI tests pass.

---

## M11-E01-T003 — Expand Phrok's UI design system using Draft as reference

### Goal

Turn the existing `uiTheme` into a real shared RPG presentation system.

### Work

Expand the existing theme rather than introducing a second styling system.

Create semantic tokens for:

* Backgrounds
* Window surfaces
* Header surfaces
* Borders
* Highlight colors
* Gold/accent colors
* HP
* SP
* XP
* Positive values
* Negative values
* Disabled states
* Selection states
* Hover states

Add standardized values for:

* Border thickness
* Panel radius where applicable
* Padding
* Section spacing
* Header height
* Row height
* Icon sizes
* Shadows
* Typography
* Text hierarchy
* Tooltip surfaces

Create reusable primitives for:

* Window frames
* Window headers
* Section headings
* Buttons
* Icon buttons
* Progress bars
* Item rows
* Skill rows/cards
* Stat rows
* Dividers
* Tabs
* Tooltips
* Badges

Use Draft's warm paper / dark green / gold visual hierarchy as inspiration while keeping a distinctly Phrok implementation.

### Acceptance Criteria

* Major UI colors/layout values are no longer duplicated across panels.
* Shared primitives can reproduce Draft-like visual consistency.
* Existing feature panels can migrate incrementally.
* Current UI remains functional.

---

## M11-E01-T004 — Evolve `PanelHost` into a Draft-style multi-window manager

### Goal

Make ordinary RPG windows behave like real overlapping RPG windows.

### Current limitation

The existing `PanelHost` owns only one active panel.

Opening a panel:

* Closes the previous panel
* Creates a backdrop
* Marks gameplay input blocked

This should no longer be the default behavior.

### Work

Refactor the existing host rather than creating a second parallel manager.

Support:

* Multiple simultaneous windows
* Window registry by unique ID
* Independent open/close
* Focus on click
* Z-order
* Bring-to-front
* Draggable headers
* Viewport clamping
* Remembered position during current session
* Singleton windows by default
* Optional modal windows
* Optional fixed windows
* Escape closes the topmost closable ordinary window

Change the `UIPanel` contract if required, but preserve existing feature implementations through migration.

Possible conceptual model:

```ts
interface WindowDescriptor {
  id: PanelId
  modal: boolean
  draggable: boolean
  closable: boolean
  blocksGameplay: boolean
}
```

Do not require this exact interface if another design fits the architecture better.

### Acceptance Criteria

* Inventory + Character can be open simultaneously.
* Equipment + Skills can be open simultaneously.
* Clicking a window focuses it.
* Focused window appears above others.
* Windows can be dragged.
* Windows cannot become permanently unreachable outside viewport.
* Escape closes only the topmost appropriate window.
* Ordinary windows do not create a full-screen dark backdrop.
* Ordinary windows do not automatically block gameplay.
* Modal behavior still exists for screens that genuinely require it.

---

## M11-E01-T005 — Introduce explicit UI/game input ownership

### Goal

Allow UI and gameplay to coexist predictably.

### Work

Replace the current binary assumption:

```text
panel open = gameplay blocked
```

with explicit interaction modes.

Support at minimum:

```text
world
ordinary-window
modal
dialogue
text-entry
skill-targeting
game-over
```

Pointer routing must ensure:

* Clicking inside a window never becomes a world click.
* Dragging windows never causes player movement.
* Hotbar drag/drop never activates world actions.
* Clicking the uncovered game world still works while ordinary windows are open.
* Modal states block interaction as expected.

Keyboard routing must ensure:

* Window shortcuts remain functional.
* Escape respects topmost-window behavior.
* Typing does not activate hotbar/movement shortcuts.
* Skill targeting can be cancelled.
* Dialogue input remains correct.

### Acceptance Criteria

* Player can keep moving/fighting with ordinary windows open.
* UI clicks cannot accidentally move/attack.
* Text fields consume keyboard input.
* Modal states correctly block gameplay.
* Existing gameplay keyboard controls still work outside exclusive UI states.

---

## M11-E01-T006 — Strengthen UI context boundaries and presentation models

### Goal

Prevent modular panels from becoming tightly coupled back to `UIScene`.

### Work

Continue using the existing `UIContext`.

Do not build another generic global UI-state framework.

Where complex presentation requires it, introduce focused view-model helpers such as:

```text
CharacterWindowViewModel
InventoryViewModel
SkillTreeViewModel
TargetHudViewModel
QuestLogViewModel
```

Only create them when they simplify presentation.

Rules:

* Domain calculations remain in systems.
* EventBus remains the update mechanism.
* UI modules should not arbitrarily call private `UIScene` functionality.
* `UIDebugAdapter` remains for diagnostics only.
* `WorldDebugAdapter` remains for diagnostics only.

### Acceptance Criteria

* Panels consume stable interfaces.
* Complex panels do not duplicate gameplay calculations.
* UI modules can refresh from EventBus-driven state updates.
* No new monolithic UI controller is introduced.

---

# Phase 2 — Entry Flow

## M11-E01-T007 — Rebuild the main title screen using Draft's presentation quality

### Goal

Make the initial impression comparable to Draft while preserving Phrok's richer save flow.

### Preserve

* New Game
* Continue
* Load
* Settings
* Credits
* Quit where supported
* Existing save-slot logic

### Adopt from Draft

* Strong title composition
* Decorative RPG hierarchy
* Cleaner information density
* More deliberate spacing
* Improved buttons
* Visual background treatment
* Subtle motion
* Better state transitions

### Acceptance Criteria

* All existing menu functionality remains.
* Title screen appears intentionally designed rather than debug-era.
* Save existence is clearly communicated.
* Keyboard/mouse operation remains reliable.
* Existing menu E2E coverage passes or is migrated.

---

## M11-E01-T008 — Redesign save-slot, Continue and Load UX

### Goal

Present Phrok's multi-slot system with much stronger readability.

### Each slot should display useful information such as

* Character name
* Class
* Level
* Current map
* Playtime if available
* Save date/time if available
* Empty/occupied state

### Actions

* Continue most recent
* Load selected
* Delete selected
* New character in empty slot

Destructive actions require intentional confirmation.

### Acceptance Criteria

* Save logic remains unchanged.
* Slots are easier to visually compare.
* Destructive actions cannot happen accidentally.
* Continue behavior remains compatible.

---

## M11-E01-T009 — Rebuild character creation presentation

### Goal

Combine Draft's clean onboarding with Phrok's richer character configuration.

### Preserve

* Name
* Existing classes
* Class descriptions
* Player sprites
* Starting stats
* Recommended stats
* Starting weapon
* Starting skill
* Difficulty
* Advanced-class information/options currently exposed

### Improve

* Layout
* Class cards
* Character preview
* Stat presentation
* Primary CTA
* Explanation hierarchy
* Selected-state visibility
* Form feedback

Use actual Phrok character sprites.

### Acceptance Criteria

* All current character creation options remain functional.
* Player sprite previews remain Phrok assets.
* Invalid states are clearly communicated.
* Creation flow is visually comparable to Draft's quality.

---

## M11-E01-T010 — Polish title → creation → world transitions

### Goal

Remove abrupt scene changes.

### Add

* Fade-out
* Fade-in
* Controlled timing
* Loading/transition guard
* Prevention of double input
* Optional short map/location title presentation

### Acceptance Criteria

* No visible scene pop.
* No duplicate scene launch.
* Input cannot accidentally carry between screens.

---

## M11-E01-T011 — Migrate Settings and Credits into the shared presentation language

### Goal

Make secondary title screens visually consistent.

### Preserve all settings

Including existing:

* Difficulty
* UI scale
* Screen shake
* Flash intensity
* Damage numbers
* VFX intensity
* Audio options
* Other existing preferences

### Acceptance Criteria

* No setting disappears.
* Setting effects remain immediate where currently supported.
* Settings are visually consistent with the new RPG interface.

---

# Phase 3 — Main HUD

## M11-E01-T012 — Create the Draft-inspired character/vitals HUD

### Goal

Replace the current utility-style stats box with a compact RPG HUD.

### Display

* Character portrait or class sprite crop
* Character name
* Class
* HP
* SP
* Base level
* Base XP
* Job/class progression where supported
* Gold where useful
* Weight indicator where useful

### Principles

Do not expose every possible statistic permanently.

Move secondary values into RPG windows.

### Acceptance Criteria

* HP/SP updates remain event driven.
* XP updates immediately.
* Level-up updates immediately.
* UI scale setting continues to work.
* HUD occupies less visual attention while being more readable.

---

## M11-E01-T013 — Add region presentation, journey hints, field log and notices

### Goal

Provide ambient context similar to Draft.

### Components

#### Region banner

On map transition:

```text
Crownfield
Eastern Farmlands
```

Fade automatically.

#### Journey hint

A compact contextual hint such as:

```text
Current objective
Visit the Guild Registrar
```

Use existing quest/progression state where possible.

Do not create a new quest system.

#### Field log

Compact recent event history:

* Loot
* XP
* Quest updates
* Saves
* Unlocks
* Important combat events

#### Notices

Short-lived floating UI notifications.

### Acceptance Criteria

* These consume existing state/events.
* They do not introduce duplicate progression logic.
* Notifications do not permanently clutter the screen.

---

## M11-E01-T014 — Redesign minimap, target and boss presentation

### Goal

Make combat/location context immediately understandable.

### Minimap

Improve:

* Frame
* Player marker
* NPC markers
* Portal markers
* Important interaction markers where appropriate

Do not replace Phrok's existing map data.

### Target card

Display:

* Name
* HP
* HP %
* Level if available
* Elite/Boss indicator
* Status indicators where relevant

### Boss UI

Preserve:

* Boss name
* HP
* Phase
* Existing boss mechanics

Improve visual prominence without covering excessive screen space.

### Acceptance Criteria

* Existing target synchronization remains correct.
* Switching targets updates immediately.
* Losing target hides ordinary target information.
* Boss state remains synchronized with combat.

---

## M11-E01-T015 — Upgrade the existing `HotbarHud` and add bottom navigation

### Goal

Turn the newly extracted `HotbarHud` into a polished primary interaction surface.

### Preserve

* Current hotbar state
* Existing slot count
* Assignment logic
* Hotkeys
* Skill behavior
* Consumable behavior

### Upgrade slots to show

* Actual skill/item icon
* Keyboard shortcut
* Cooldown overlay
* Quantity for items
* Skill level where useful
* Disabled/unavailable state
* Hover tooltip
* Current targeting/casting feedback

### Add drag/drop

Support:

```text
Skill window → hotbar
Inventory consumable → hotbar
Hotbar slot → hotbar slot
Hotbar slot → remove zone / clear interaction
```

### Bottom navigation

Add compact buttons for common RPG windows:

* Character
* Inventory
* Equipment
* Skills
* Quests
* World
* System

### Important

Enhance the existing `HotbarHud`.

Do not create a second hotbar implementation beside it.

### Acceptance Criteria

* Existing numeric shortcuts still work.
* Mouse activation works.
* Cooldowns visibly animate.
* Drag/drop assignments persist correctly.
* Assignment logic continues using Phrok's skill system.

---

## M11-E01-T016 — Redesign active effects and tooltip UX

### Goal

Make temporary effects understandable without opening debug-like panels.

### Active-effect tray

Display:

* Icon
* Stack count
* Remaining time where applicable

Tooltip should show:

* Name
* Effect
* Duration
* Relevant stat modifier

### Shared tooltips

Use one tooltip presentation system for:

* Items
* Equipment
* Skills
* Stats
* Hotbar
* Effects
* Map markers where appropriate

### Acceptance Criteria

* Existing status-effect logic remains unchanged.
* Tooltips use real gameplay data.
* Tooltips remain inside viewport.

---

# Phase 4 — Core RPG Windows

These four feature modules already exist in the latest Phrok architecture.

They should be **upgraded rather than replaced**.

---

## M11-E01-T017 — Upgrade `CharacterPanel` to Draft-quality character/stat UX

### Goal

Improve character progression readability.

### Preserve

* Current stat allocation
* Stat costs
* Derived stats
* Reset mechanics
* Existing progression rules

### Layout

#### Identity

* Character
* Class
* Level

#### Available points

Clearly visible.

#### Base stats

Each row:

```text
STR       24       [+]
Cost: 3
```

#### Derived stats

Readable secondary area:

* Attack
* Defense
* HP
* SP
* Hit
* Flee
* Other existing derived values

### Acceptance Criteria

* Existing `CharacterPanel` remains the implementation module.
* Stat allocation uses existing systems.
* Stat reset uses existing systems.
* Panel can coexist with other ordinary windows.

---

## M11-E01-T018 — Upgrade `InventoryPanel`

### Goal

Make inventory browsing substantially more readable and tactile.

### Display each entry with

* Icon
* Name
* Quantity
* Rarity
* Refine level if applicable

### Detail presentation

Show:

* Description
* Relevant stats
* Weight
* Value
* Equipment restrictions
* Appraisal state
* Refinement state
* Current comparison if equippable

### Actions where valid

* Use
* Equip
* Unequip
* Drop
* Assign consumable to hotbar

### Preserve

* Existing inventory model
* Equipment instances
* Weight system
* Consumables
* Market visibility/appraisal rules

### Acceptance Criteria

* Existing `InventoryPanel` is evolved rather than replaced.
* All existing inventory functionality remains.
* Dragging consumables to hotbar works.
* Equipment comparison is clearer.

---

## M11-E01-T019 — Upgrade `EquipmentPanel`

### Goal

Make equipped state understandable at a glance.

### Show equipment slots

Use Phrok's real slot model.

For each:

* Slot name
* Item icon
* Item name
* Refine level
* Relevant important stat

Show derived/equipment totals where appropriate.

### Actions

* Unequip
* Hover/inspect
* Compare

### Acceptance Criteria

* Existing `EquipmentPanel` remains the feature module.
* Equipment mechanics remain unchanged.
* Inventory and Equipment windows can be opened side by side.

---

## M11-E01-T020 — Upgrade `SkillsPanel` to Draft-style skill-tree presentation

### Goal

Make progression and skill assignment substantially easier to understand.

### Skill presentation

Each skill should communicate:

* Icon
* Name
* Current level
* Maximum level
* Learned/unlearned
* SP cost
* Cooldown
* Target type
* Prerequisites
* Next-level requirement
* Skill-point cost

Represent tree relationships visually where practical.

### Interactions

* Allocate skill point
* Inspect
* Drag learned skill to hotbar
* Optional explicit hotbar assignment action

### Preserve

Phrok's:

* Skill trees
* Advanced class unlocks
* Prerequisites
* Level limits
* Skill costs
* Skill-point logic

### Acceptance Criteria

* Existing `SkillsPanel` is evolved.
* Invalid skill allocations remain prevented by the existing system.
* Drag-to-hotbar works.
* Skill tree is significantly easier to scan.

---

## M11-E01-T021 — Rebuild World Map as a Draft-inspired World Atlas

### Goal

Make world navigation informative rather than purely spatial.

### Map entries should communicate

* Map name
* Region
* Recommended level range where meaningful
* Monster examples
* Town/field/dungeon type
* Travel availability
* Current location

### Preserve

Phrok's:

* Map IDs
* Portals
* Travel rules
* Existing map progression

### Acceptance Criteria

* No invalid travel is introduced.
* Current location is obvious.
* Locked/unavailable travel is clearly indicated.

---

## M11-E01-T022 — Rebuild Settings into a Draft-style System / Rest window

### Goal

Create a central in-game system menu.

### Include

* Save
* Settings
* Audio
* Controls reference
* Return to title
* Optional developer tools entry when development mode is enabled

### Behavior

Ordinary settings UI may allow gameplay to continue where safe.

Operations like returning to title can invoke a modal confirmation.

### Acceptance Criteria

* All current settings remain.
* Manual save remains.
* Return-to-title behavior is safe.
* No save corruption risk.

---

# Phase 5 — Phrok-Specific Feature Windows

Draft does not contain equivalents for all of Phrok's systems.

These should use the newly established design language.

---

## M11-E01-T023 — Redesign NPC dialogue as compact character interaction windows

### Goal

Bring dialogue presentation to Draft quality while preserving Phrok's richer NPC services.

### Display

* NPC sprite/portrait
* NPC name
* Role/service
* Dialogue text
* Available actions

### Examples

```text
Storage Keeper
──────────────
"Need somewhere safe for your belongings?"

[Open Storage]
[Leave]
```

### Preserve

* Dialogue event lifecycle
* NPC services
* Advanced-class dialogue
* Branching choices currently implemented
* Interaction blocking rules where required

### Acceptance Criteria

* Existing dialogue logic remains.
* NPC Phrok sprites are used.
* Newly added Moonveil sprites are used where applicable.

---

## M11-E01-T024 — Redesign Shop and Appraiser UX

### Shop

Show:

* Item icon
* Name
* Description
* Price
* Quantity
* Player gold
* Buy/Sell state

### Appraiser

Clearly communicate:

* Unappraised item
* Appraisal cost
* Revealed item information
* Success/result state

### Preserve

Existing:

* Market formulas
* Buy/sell values
* Sell-all behavior
* Appraisal logic
* Shop inventories

### Acceptance Criteria

* No pricing formula moves into UI code.
* Existing transactions remain correct.
* Shop interactions feel comparable to Draft's item-store UX.

---

## M11-E01-T025 — Redesign Storage

### Goal

Make Phrok's relatively deep storage system easier to operate.

### Preserve

* Categories
* Rarity filters
* Class filters
* Level filters
* Search
* Sorting
* Pagination
* Deposit
* Withdraw

### Improve

* Clear inventory/storage split
* Search presentation
* Filter controls
* Item rows
* Quantity visibility
* Transfer feedback

### Acceptance Criteria

* Existing storage functionality remains.
* Search/filter behavior remains correct.
* Newly modularized panel architecture is used.

---

## M11-E01-T026 — Redesign Crafting and Refinement

### Crafting

Display:

* Recipe
* Result
* Materials
* Owned/required quantities
* Unlock state
* Craftability
* Craft action

### Refinement

Display:

* Item
* Current refine level
* Cost
* Materials
* Success information currently supported
* Before/after preview
* Confirmation where appropriate

### Preserve

All existing recipe/refinement logic.

### Acceptance Criteria

* UI contains no duplicate crafting formulas.
* Refinement preview comes from existing systems.
* Failure/success feedback is clear.

---

## M11-E01-T027 — Redesign Bestiary

### Goal

Make monster discovery and progression feel like a collectible knowledge system.

### Entry layout

* Monster sprite
* Name
* Family
* Element
* Kill count
* Known drops
* Combat tip
* Milestones
* Unlock state

### Preserve

Existing bestiary visibility and milestone rules.

### Acceptance Criteria

* Unknown information remains hidden according to current rules.
* Existing Phrok monster sprites are used.
* Search/browsing is readable.

---

## M11-E01-T028 — Redesign Hunting Board and Quest Log

### Hunting Board

Show:

* Contract title
* Target monster
* Region
* Progress
* Reward
* Accept
* Turn in
* Refresh state

### Quest Log

Show:

* Active
* Completed
* Available where relevant
* Objective progress
* Rewards
* Location hints

### Preserve

All existing quest/hunting logic.

### Acceptance Criteria

* Event-driven progress remains correct.
* Accept/turn-in behavior remains unchanged.
* Information hierarchy is substantially improved.

---

## M11-E01-T029 — Improve advanced-class selection and irreversible confirmations

### Goal

Make major character decisions feel intentional.

### Advanced class

Display:

* Class name
* Role
* Relevant skills
* Identity/flavor
* Confirmation warning

### Confirmation language

Clearly communicate:

```text
This choice is permanent for this character.
```

Use an actual modal.

### Acceptance Criteria

* Existing advanced-class eligibility remains authoritative.
* Selection cannot occur accidentally.
* Existing progression/save behavior remains unchanged.

---

# Phase 6 — Game Feel and World Presentation

---

## M11-E01-T030 — Create reusable entity presentation controllers

### Goal

Allow animation to affect visuals without corrupting gameplay coordinates.

### Problem

Tweens directly modifying entity position can interfere with:

* Physics
* Pathfinding
* AI
* Selection
* Range calculations

### Solution

Separate logical entity position from presentation transforms where needed.

Possible pattern:

```text
Logical Entity Container
└── Visual Container
    ├── Sprite
    ├── Shadow
    ├── Selection Marker
    └── Presentation Effects
```

Animation can then modify the visual layer.

### Support

* Bob
* Scale
* Rotation
* Recoil
* Lunge
* Hurt
* Death
* Spawn
* Tint flash

### Acceptance Criteria

* Gameplay coordinates remain authoritative.
* Presentation animation does not break collision/pathfinding.
* Controller can be reused by player and monsters.

---

## M11-E01-T031 — Add complete player presentation animation using existing Phrok sprites

### Goal

Replace placeholder animation states with visible movement personality.

### Preserve

Existing player sprites.

Do not require new sprite sheets.

### Implement

#### Idle

Very subtle:

* Bob
* Breathing scale

#### Movement

* Directional orientation using existing state
* Horizontal flip where appropriate
* Step bob
* Small scale rhythm

#### Melee attack

Integrate with existing melee lunge behavior:

```text
anticipation
→ lunge
→ impact
→ recoil
→ neutral
```

#### Ranged attack

* Windup
* Projectile release
* Subtle recoil

#### Cast

* Cast posture
* Cast bar
* Repeated subtle pulse

#### Hurt

* Tint/flash
* Brief recoil
* Optional small squash

#### Death

* Stop normal movement
* Rotate/collapse
* Fade or desaturate where appropriate

### Acceptance Criteria

* Existing sprites remain.
* Logical movement is unaffected.
* Animation never changes combat timing.
* Class-specific mechanics remain unchanged.

---

## M11-E01-T032 — Add complete monster presentation animation

### Goal

Make monsters visibly alive even when using static sprite assets.

### Idle

Per-monster slightly randomized:

* Bob phase
* Bob amplitude
* Pause timing

Avoid synchronized movement.

### Movement

* Direction flip
* Walking bob
* Slight squash/stretch

### Attack

* Anticipation
* Forward impulse
* Impact
* Return

### Cast

* Cast telegraph
* Pulse
* Existing cast bar
* Release effect

### Hurt

* Flash/tint
* Recoil

### Death

Do not instantly hide the enemy.

Sequence:

```text
fatal impact
→ reaction
→ rotation/collapse
→ fade
→ disable/remove
```

### Respawn

* Fade in
* Small scale interpolation

### Acceptance Criteria

* Enemy AI remains unchanged.
* Combat timing remains unchanged.
* Death rewards still occur at correct logical time.
* Existing monster sprites remain authoritative.

---

## M11-E01-T033 — Improve click, path, selection and interaction feedback

### Goal

Ensure world clicks always communicate intent.

### Ground click

Animated marker:

```text
appear
→ pulse
→ fade
```

### Enemy

Clear target/selection indicator.

### NPC

Brief interaction highlight.

### Loot

Hover/interaction state.

### Portal

Destination-oriented interaction feedback.

### Invalid interaction

Provide subtle failure indication where useful.

### Acceptance Criteria

* Markers do not modify gameplay.
* Selected target remains obvious.
* World input remains responsive with ordinary windows open.

---

## M11-E01-T034 — Unify combat feedback around the existing `VfxManager`

### Goal

Improve combat choreography without replacing the current VFX architecture.

### Preserve and enhance

Existing:

* `VfxManager`
* Combat text
* Rings
* Beams
* Particles
* Loot beams
* Reduced/full VFX intensity
* Screen shake setting
* Flash setting
* Damage-number setting

### Standard hit sequence

Create a coherent rhythm:

```text
attack anticipation
→ attack movement/effect
→ impact
→ enemy hit response
→ damage text
→ optional screen feedback
```

### Critical hit

Differentiate using:

* Size
* Motion
* Brief impact emphasis

Do not rely only on different text color.

### Miss

Display clearly but subtly.

### Healing

Use distinct upward feedback.

### SP changes

Only expose where useful.

### Acceptance Criteria

* VFX settings remain respected.
* Reduced mode remains meaningfully reduced.
* VFX manager remains reusable and data driven.
* Combat formulas remain untouched.

---

## M11-E01-T035 — Improve skill targeting and casting UX

### Goal

Make skills feel deliberate and readable.

### Ground-target skill

Display:

* Range indicator
* Target area
* Valid/invalid state
* Cursor feedback

### Cast sequence

```text
target chosen
→ cast begins
→ cast bar
→ visual buildup
→ release
→ effect
→ cooldown
```

### Cancellation

Escape cancels targeting.

Movement interruption/casting behavior remains determined by existing skill logic.

### Acceptance Criteria

* Existing targeting rules remain authoritative.
* Existing SP/cooldown/cast-time behavior remains.
* Visual cast state never changes mechanical cast duration.

---

## M11-E01-T036 — Improve loot and progression feedback

### Loot drop

Use existing loot beams but improve lifecycle:

```text
spawn
→ short emphasis
→ settle
→ pickup-ready
```

### Pickup

Provide compact notice:

```text
+ Red Potion ×2
+ 143 Gold
```

### XP

Keep low-noise normal XP feedback.

### Level up

Use a stronger Draft-inspired sequence:

```text
light burst
→ particles/symbols
→ LEVEL UP
→ level/stat/skill-point summary
```

### Important unlocks

Use distinct notice:

```text
Advanced Class Available
```

### Acceptance Criteria

* Existing progression values remain exact.
* Level-up events fire once.
* Feedback does not interrupt gameplay.

---

## M11-E01-T037 — Improve portals, map entry, camera and transitions

### Portals

Add:

* Ambient pulse
* Readable interaction state
* Destination name where known
* Travel activation feedback

### Camera

Preserve current smooth-follow architecture.

Tune only where it improves perceived control.

Consider:

* Slightly softer follow
* Brief combat shake through existing settings
* Small emphasis on important transitions

### Map change

Sequence:

```text
fade out
→ change map
→ reposition
→ fade in
→ region banner
```

### Acceptance Criteria

* Portal logic remains unchanged.
* No duplicate map transitions.
* Spawn placement remains correct.
* Camera never becomes detached from logical player position.

---

## M11-E01-T038 — Improve player death and respawn presentation

### Goal

Replace abrupt game-over transition with a cohesive sequence.

### Suggested sequence

```text
fatal hit
→ player hurt/death animation
→ short world pause or controlled transition
→ compact death UI
→ respawn action
→ fade out
→ restore state
→ respawn town
→ fade in
```

### Preserve

Existing:

* Respawn map selection
* Death source tracking
* State restoration
* Save behavior

### Acceptance Criteria

* Death cannot trigger multiple game-over sequences.
* Respawn uses existing Phrok rules.
* UI/input states reset correctly.

---

## M11-E01-T039 — Unify audio and UI micro-feedback

### Goal

Pair interaction with restrained sound where assets exist.

Cover:

* Window open
* Window close
* Button
* Inventory use
* Equip
* Unequip
* Purchase
* Sell
* Skill allocation
* Level up
* Portal
* Error/invalid action

Respect:

* Audio settings
* Mute settings

Do not introduce excessive noise.

### Acceptance Criteria

* Audio can always be disabled.
* Rapid repeated UI events do not create uncontrolled overlapping sound.

---

# Phase 7 — Developer and Balance Experience

## M11-E01-T040 — Add Draft-inspired live balance/test desk

### Priority

P2.

Do this after the primary player-facing experience is stable.

### Goal

Provide convenient runtime testing controls similar to Draft's admin/balance interface without contaminating production gameplay code.

### Possible controls

* XP multiplier
* Drop multiplier
* Player movement speed
* Gold rate where applicable
* Spawn adjustments
* Warp/map selection
* Give item
* Level adjustment
* Reset cooldowns
* Heal
* SP restore
* Debug combat toggles

### Rules

* Development-only
* Clearly isolated
* Uses real systems where possible
* Does not duplicate gameplay formulas
* Cannot appear accidentally in production configuration

### Acceptance Criteria

* Testing adjustments take effect immediately where designed.
* Reload behavior is defined.
* Development configuration cannot corrupt ordinary save state unintentionally.

---

# Phase 8 — QA, Regression and Legacy Cleanup

## M11-E01-T041 — Migrate and strengthen UI Playwright coverage

### Goal

Retain Phrok's unusually valuable existing automated browser coverage throughout the presentation refactor.

### Important rule

Diagnostics must flow through:

* `UIDebugAdapter`
* `WorldDebugAdapter`

Do not reintroduce scattered direct:

```ts
canvas.dataset.someValue = ...
```

simply because an old test needs a dataset field.

If the diagnostic contract remains useful, expose it through the appropriate adapter.

### Cover

At minimum:

* Main menu
* Save slots
* Character creation
* HUD
* Inventory
* Equipment
* Character
* Skills
* Bestiary
* Crafting
* Refinement
* Shop
* Storage
* Hunting board
* Quest log
* World map
* Dialogue
* Hotbar
* Combat
* Boss UI
* Settings
* Game over

### Acceptance Criteria

* Existing semantic gameplay checks remain.
* DOM-independent or canvas-independent diagnostics remain stable where possible.
* New window behavior receives coverage.

---

## M11-E01-T042 — Add deterministic UI/layout regression scenarios

### Goal

Make visual regressions easy to identify.

### Add deterministic Playwright states for

* Main menu
* Character creation
* Empty inventory
* Populated inventory
* Character + Inventory simultaneously
* Equipment
* Skill tree
* NPC dialogue
* Shop
* Storage
* Quest log
* Boss combat
* Death screen

Where screenshot testing is practical, use stable seeded state and predictable viewport sizes.

### Acceptance Criteria

* Tests avoid timing-dependent animation frames where possible.
* Windows do not overflow standard viewport targets.
* UI scale variants receive at least basic coverage.

---

## M11-E01-T043 — UI lifecycle and performance pass

### Inspect for

* Leaked EventBus subscriptions
* Leaked Phaser objects
* Duplicate input handlers
* Undestroyed windows
* Repeated object recreation every frame
* Excess tooltip allocations
* Unbounded field-log history
* Animation/tween leaks
* Hidden windows still processing unnecessarily

### Acceptance Criteria

* Repeated open/close does not grow object counts indefinitely.
* Scene shutdown removes listeners.
* Map changes do not duplicate UI handlers.
* Performance remains stable during extended sessions.

---

## M11-E01-T044 — Complete the modular UI migration and remove remaining legacy implementation

### Goal

Finish the transition without forcing removal of `UIScene` simply for architectural purity.

### Desired final responsibility of `UIScene`

`UIScene` may remain as a thin Phaser scene responsible for:

* Lifecycle
* Event subscriptions
* HUD orchestration
* Input integration
* Window-host integration

It should not remain responsible for implementing every feature screen.

### Move feature-specific presentation into

```text
src/game/ui/hud/
src/game/ui/panels/
src/game/ui/windows/
src/game/ui/components/
```

Use whatever organization emerges naturally from the refactor.

### Remove

* Obsolete duplicated panel implementations
* Legacy helpers superseded by shared primitives
* Old single-panel assumptions
* Unused backdrop logic
* Duplicated hotbar rendering
* Direct scattered diagnostic writes
* Transitional migration code no longer required

### Important

Do **not** remove `UIScene` merely because Draft does not use the same architecture.

Remove it only if it genuinely has no useful responsibility remaining.

### Acceptance Criteria

* One authoritative implementation exists for every UI feature.
* No duplicate legacy UI remains.
* `UIScene` is either thin or safely eliminated.
* Full verification passes.

---

## M11-E01-T045 — Final Draft-to-Phrok parity audit

### Goal

Compare the completed Phrok presentation against Draft one final time.

### Review every category

* Title
* Character creation
* HUD
* Character window
* Inventory
* Equipment
* Skills
* Dialogue
* Shops
* Map
* System menu
* Hotbar
* Window behavior
* Player animation
* Monster animation
* Attacks
* Casting
* Damage feedback
* Death
* Loot
* Level up
* Portals
* Transitions
* General information hierarchy

### Classify every area

```text
BETTER THAN DRAFT
EQUIVALENT TO DRAFT
INTENTIONALLY DIFFERENT
STILL BELOW DRAFT
```

Anything classified as `STILL BELOW DRAFT` must include:

* Reason
* Relevant files
* Concrete follow-up proposal

### Acceptance Criteria

The epic is not considered complete while major player-facing areas remain unintentionally below Draft's presentation quality.

---

# Final UX Acceptance Criteria

The epic is complete when all of the following are true.

## Visual presentation

* Phrok uses a cohesive RPG visual language.
* HUD feels intentional and world-focused.
* Major screens share consistent framing and hierarchy.
* Tooltips and controls have common styling.

## Window interaction

* Multiple ordinary RPG windows may coexist.
* Windows can be dragged.
* Clicking brings a window forward.
* Escape closes the topmost appropriate window.
* Ordinary windows do not unnecessarily stop gameplay.
* Modal states still correctly block input.

## Main screens

Draft-quality equivalents exist for:

* Main menu
* Save selection
* Character creation
* Character
* Inventory
* Equipment
* Skills
* Dialogue
* World map
* Shop
* System menu

Phrok-specific systems follow the same design quality.

## Game feel

Player visibly has:

* Idle presentation
* Walk presentation
* Attack presentation
* Cast presentation
* Hurt presentation
* Death presentation

Monsters visibly have:

* Idle presentation
* Movement presentation
* Attack presentation
* Cast presentation where applicable
* Hurt presentation
* Death presentation
* Respawn presentation

## Combat

Combat includes coherent:

```text
input
→ anticipation
→ action
→ impact
→ target reaction
→ numerical/VFX feedback
→ recovery
```

## Skills

Skills provide:

* Target feedback
* Cast feedback
* Cooldown feedback
* Hotbar state
* Skill-tree readability

## Progression

Player receives clear feedback for:

* XP
* Loot
* Level up
* Skill points
* Stat points
* Unlocks
* Quest progression
* Bestiary milestones

## World

The world includes polished:

* Click indicators
* Selection markers
* Portals
* Map transitions
* Region announcements
* Camera behavior

---

# Technical Acceptance Criteria

## Preserve Phaser 4

Do not downgrade the engine.

## Preserve Phrok sprites

Do not replace established character, monster, NPC or support sprites with Draft assets.

## Preserve gameplay logic

No UI task should silently change:

* Damage
* Stats
* XP
* Drops
* Skill behavior
* Cooldowns
* AI
* Progression
* Save format
* Quest rules

## Reuse EventBus

Presentation should react to existing gameplay events wherever practical.

## Reuse and enhance `VfxManager`

Do not introduce a parallel effects architecture.

## Continue the modular UI architecture

Build upon:

* `UIContext`
* `PanelHost`
* `UIPanel`
* `uiTheme`
* `HotbarHud`
* `UIDebugAdapter`
* `WorldDebugAdapter`

Do not throw them away to reproduce Draft's exact implementation.

## Testing

Each task should run focused tests.

Architectural/migration tasks should additionally run the full relevant verification suite.

---

# Recommended Implementation Order

Execute tasks sequentially:

```text
T001

Foundation
T002
T003
T004
T005
T006

Entry flow
T007
T008
T009
T010
T011

HUD
T012
T013
T014
T015
T016

Core RPG windows
T017
T018
T019
T020
T021
T022

Phrok-specific windows
T023
T024
T025
T026
T027
T028
T029

Game feel
T030
T031
T032
T033
T034
T035
T036
T037
T038
T039

Developer tooling
T040

QA and cleanup
T041
T042
T043
T044
T045
```

---

# Dependency Notes

Several tasks intentionally depend on earlier architectural work.

```text
T002 → T004
T003 → all visual redesign tasks
T004 → T017-T029
T005 → T004/T015/T023/T035
T006 → all feature window migrations

T030 → T031/T032
T031/T032 → T034
T034 → T035/T036/T038

T041 should evolve continuously throughout the epic.
T044 happens only after functional parity.
T045 happens last.
```

Do not skip directly into broad panel redesign before completing the modular UI/window foundation.

---

# Implementation Principle for Codex / Work

Every subtask should be treated as an independent implementation prompt.

For each task:

1. Read this epic.
2. Inspect current Phrok code before editing.
3. Inspect the equivalent Draft implementation where one exists.
4. Treat Draft behavior and presentation as reference.
5. Treat Phrok systems and content as authoritative.
6. Reuse the newly modularized Phrok UI architecture.
7. Preserve existing art.
8. Preserve gameplay mechanics.
9. Avoid unnecessary dependencies.
10. Avoid React.
11. Use Phaser 4 APIs.
12. Run focused automated tests.
13. Update tests for legitimate presentation changes.
14. Preserve diagnostic compatibility using the debug adapters.
15. Report:

* Files changed
* Draft behavior adopted
* Existing Phrok behavior preserved
* Tests run
* Remaining parity gaps

Do not opportunistically implement unrelated later tasks during an earlier task.

The purpose of the phased structure is to keep every Codex run focused and reviewable.

---

# Explicit Non-Goals

This epic does **not** include:

* Rebalancing classes
* Rebalancing monsters
* Changing progression curves
* Rewriting combat formulas
* Creating new maps
* Adding new classes
* Replacing Phrok sprites with Draft assets
* Replacing Phaser 4
* Rebuilding the game in React
* Wholesale DOM migration
* Rewriting existing gameplay systems merely because Draft implements them differently
* Simplifying Phrok to Draft's smaller feature scope

---

# Final Product Target

When this epic is complete, a player familiar with the current Phrok should still recognize the same game underneath:

* Same characters
* Same monsters
* Same maps
* Same classes
* Same skills
* Same progression
* Same equipment
* Same systems
* Same content

But the experience of interacting with that game should feel fundamentally upgraded.

The target experience is:

> The depth and content of Phrok presented with the clarity, responsiveness, animation language, window UX and visual polish demonstrated by DraftRagnarokSinglePlayer.

Draft is the presentation benchmark.

Phrok remains the game.
