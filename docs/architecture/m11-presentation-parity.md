# M11 presentation baseline

Reference: [DraftRagnarokSinglePlayer](https://github.com/franklinjr12/DraftRagnarokSinglePlayer), commit `d3f95022feb1453b8413cf5fff399c84aa7c09c2`. Inspected `src/ui/interface.ts`, `src/style.css`, `src/game/world.ts`, and README. Baseline recorded before runtime changes. This is a migration inventory, not a completed parity audit.

Draft file abbreviations: **UI** = `src/ui/interface.ts`; **CSS** = `src/style.css`; **World** = `src/game/world.ts`. Phrok scene paths below are relative to `src/game/scenes/`; panel paths to `src/game/ui/panels/`. Tests are under `tests/`.

| Area | Phrok baseline / relevant files | Draft reference | Desired Phrok presentation | Preserve | Existing coverage |
|---|---|---|---|---|---|
| Title | Illustrated menu, separate actions; `mainMenu/MainMenuScene.ts` | UI `title`, centered crest and traveler form; CSS title composition | Deliberate hierarchy and shared theme | All menu actions | `mainMenu.spec.ts`, `appShell.spec.ts` |
| Save selection | Multiple slots and Continue; same scene | UI title offers one Continue and confirmed deletion | Comparable slot cards and explicit destructive confirmation | Multi-slot schema, load and latest-save behavior | `mainMenu.spec.ts` |
| Character creation | Separate rich class/stat flow; `CharacterCreationScene.ts` | UI title name and palette | Clear class cards, real sprite preview and form feedback | Classes, stats, difficulty, starting loadout | `characterCreation.spec.ts` |
| Main HUD | Persistent utility statistics; `UIScene.ts` | UI `mount/update`, compact identity, meters and dock | Compact identity/vitals with secondary statistics in windows | Event-driven exact HP/SP/XP | `worldUi.spec.ts` |
| Character | Extracted `character/CharacterPanel.ts` | UI `character`, points badge, stat rows, derived grid | Prioritized identity, allocation costs and derived values | Domain stat allocation/reset | `worldUi.spec.ts`, stats logic tests |
| Inventory | Extracted `inventory/InventoryPanel.ts` | UI `inventory`, readable rows, drag consumables | Clear list/details/actions and hotbar assignment | Instances, consumables, supports, weight | `worldUi.spec.ts` |
| Equipment | Extracted `equipment/EquipmentPanel.ts` | UI `equipment`, labeled slots and remove actions | Slot layout and comparisons using actual items | Slot restrictions and equipment effects | `worldUi.spec.ts` |
| Skills | Extracted `skills/SkillsPanel.ts` | UI `skillTree`, class sections, prerequisites, assignment | Readable tree states, costs and drag assignment | Existing classes, prerequisites and skill mechanics | `worldUi.spec.ts`, `advancedClass.spec.ts` |
| Bestiary | Search and partial discovery; `UIScene.renderBestiaryPanel` | No dedicated equivalent | Shared RPG window with discovery hierarchy | Knowledge thresholds, milestones and drops | `worldUi.spec.ts`, bestiary logic tests |
| Crafting | Recipe and material selection; `UIScene.renderCraftingPanel` | No dedicated equivalent | Shared recipe/material/result hierarchy | Unlock sources, exact costs and crafting domain | `worldUi.spec.ts`, crafting logic tests |
| Refinement | Preview and action; `UIScene.renderRefinementPanel` | No dedicated equivalent | Clear current/next values and costs | Refinement outcomes and instance state | `townNpcs.spec.ts`, refinement logic tests |
| Shops | Buy/sell details; `UIScene.renderShopPanel` | UI `shop`, inventory rows and prices | Unified merchant list and transaction feedback | JSON stock, prices, restrictions | `townNpcs.spec.ts`, market logic tests |
| Appraisal | Unknown items and improved sell rates; `UIScene.renderAppraiserPanel` | No dedicated equivalent | Shared merchant style without leaking unknown details | Appraisal cost and revelation rules | `townNpcs.spec.ts`, market logic tests |
| Storage | Search/filter/sort/transfer; `UIScene.renderStoragePanel` | No dedicated equivalent | Two readable containers, stable selection | Shared storage and instances | `townNpcs.spec.ts`, storage logic tests |
| Hunting Board | Regional contracts; `UIScene.renderHuntingBoardPanel` | No dedicated equivalent | Contract status/objectives/rewards hierarchy | Refresh, active-contract and reward rules | `worldUi.spec.ts`, hunting-board logic tests |
| Quest Log | Campaign status; `UIScene.renderQuestLogPanel` | UI journey hint only | Readable quest window and existing-objective hint | Quest acceptance/completion/progression | `worldUi.spec.ts`, quest logic tests |
| World map | Region/discovery/fast travel; `UIScene.renderWorldMapPanel` | UI `mapWindow`, biome cards | Region cards with discovery and destination context | Discovery and travel eligibility | `worldUi.spec.ts`, `world.spec.ts` |
| Dialogue | Dedicated blocking scene; `DialogueScene.ts` | UI `dialogue`, portrait and service choices | Portrait/name/text/action hierarchy | Blocking semantics and service events | `townNpcs.spec.ts`, `advancedClass.spec.ts` |
| Settings/system | Title and world settings; `MainMenuScene`, `UIScene.renderSettingsPanel` | UI `system`, sound/save/control guide | One shared visual language and complete preferences | Immediate settings effects and persistence | `mainMenu.spec.ts`, `worldUi.spec.ts`, `vfx.spec.ts` |
| Game over | Respawn popup; `GameOverScene.ts` | World death handling | Controlled death and respawn sequence | Safe hub, restoration and death source | `combat.spec.ts` |
| Hotbar | Extracted `hud/HotbarHud.ts` | UI `update`, nine draggable slots | Existing slot count, icons, cooldown and availability | Assignment and activation domain | `worldUi.spec.ts`, `combat.spec.ts` |
| Target | HUD target frame and world selection | UI target card; World target ring | Immediate readable HP, identity and selection | Target selection and invalidation | `combat.spec.ts` |
| Boss | Dedicated phase frame | No equivalent richer boss protocol | Prominent compact boss state | Phase rules and control resistance | `combat.spec.ts` |
| Minimap | Map-derived markers; `UIScene.refreshMinimap` | UI `drawMinimap` | Shared framing and distinct contextual markers | Map data, player/NPC/portal locations | `worldUi.spec.ts` |
| Active effects/tooltips | Effect tray, hover data; `UIScene` | Native UI titles and cards | Shared clamped tooltip and effect duration/stack display | Actual effect state and settings | `worldUi.spec.ts` |
| Notifications | Individual status messages and unlock banner; `UIScene` | UI `notice/log`, timed notice and four-entry history | Bounded field log and nonblocking notices | Existing gameplay events | `worldUi.spec.ts`, `advancedClass.spec.ts` |
| Combat feedback | `systems/vfxManager.ts`, `WorldScene.ts`, entity reactions | World attack, float, effects | Consistent anticipation/impact/reaction/recovery | Combat formulas/timing and VFX settings | `combat.spec.ts`, `vfx.spec.ts`, VFX logic tests |
| Movement | Click pathfinding, player sprite; `entities/PlayerEntity.ts` | World walking transforms and marker | Transform animation independent of logical movement | Pathfinding, speed, collision and camera anchor | `world.spec.ts`, movement logic tests |
| Monster presentation | Sprite, bars, AI states; `entities/EnemyEntity.ts` | World idle/walk, kill collapse/fade | Varied idle, movement, attack, cast, hurt, death and spawn | AI, reward timing and authoritative art | `combat.spec.ts` |
| Casting | Existing cast telegraphs and skill rules; `WorldScene.ts` | World cursor range and cast buildup | Valid/invalid targeting, buildup/release feedback | Costs, ranges, cooldowns and duration | `combat.spec.ts` |
| Loot | Drops, pickup, rare beams; `WorldScene.ts`, VfxManager | World drop/pickup and UI notices | Spawn/settle/pickup feedback and compact notices | Drop rolls and exact quantities | `vfx.spec.ts`, loot logic tests |
| Level up | Existing event/VFX; `UIScene`, `WorldScene` | World `levelEffect`, burst and summary | Strong burst and point/unlock summary | Exact XP, single event and progression | `advancedClass.spec.ts`, progression logic tests |
| Portals | Nearby interaction and map change; `WorldScene.ts` | World `createPortal`, pulse and destination | Ambient pulse, destination and activation response | Proximity and spawn placement | `world.spec.ts` |
| Transitions | Scene/map entry paths | World teleport effects | Guarded fade-out/change/fade-in/region title | Single scene launch, map state and placement | `characterCreation.spec.ts`, `world.spec.ts` |
| Windows/input | Single `PanelHost`, global block/backdrop | UI `window`, header drag, focus stacking, Escape topmost | Multiple singleton ordinary windows with owned pointer input; explicit exclusive states | Dialogue, targeting and death semantics | `worldUi.spec.ts` currently asserts old blocking behavior |
| Balance desk | Existing debug tooling and adapters | `src/admin.ts`, live rates and commands | Development-only isolated controls using real systems | Ordinary save isolation and production exclusion | Existing debug scenarios; new desk coverage needed |

## Implementation tracking

- T001: baseline complete; no gameplay modification.
- T002–T045: pending implementation and verification. Do not infer completion from a theme change or successful build.

Final classification requires browser inspection of the completed screens and regression evidence. None of the baseline rows asserts final equivalence.
