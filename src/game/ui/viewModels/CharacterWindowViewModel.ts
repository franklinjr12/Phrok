import type { DataRegistry } from "../../data/dataRegistry";
import { getStatCost, getTotalBaseStats, baseStatKeys, baseStatLabels, previewStatAllocation } from "../../systems/stats";
import type { BaseStatKey, DerivedStats, GameState } from "../../types/gameState";
import { calculateDerivedStats } from "../../systems/stats";

export interface CharacterStatRow {
  key: BaseStatKey;
  label: string;
  total: number;
  cost: number;
  canIncrease: boolean;
  preview: string[];
}

export interface DerivedStatRow {
  label: string;
  value: number | string;
}

/** Read-only presentation data for the character window. */
export class CharacterWindowViewModel {
  readonly name: string;
  readonly classLabel: string;
  readonly level: number;
  readonly statPoints: number;
  readonly baseStats: readonly CharacterStatRow[];
  readonly derivedStats: readonly DerivedStatRow[];
  readonly hpThresholdPercent: number;
  readonly spThresholdPercent: number;
  readonly supportFilter: GameState["support"]["autoPickupFilter"];

  constructor(state: GameState, data: DataRegistry) {
    const totals = getTotalBaseStats(state, (id) => data.getStatusEffect(id), (id) => data.getSupport(id));
    const derived = calculateDerivedStats(
      state,
      data.getClass(state.character.archetype),
      (id) => data.getItem(id),
      (id) => data.getStatusEffect(id),
      (id) => data.getSupport(id),
    );

    this.name = state.playerProfile.name;
    this.classLabel = [data.getClass(state.character.archetype).name, state.character.advancedClass?.name ?? ""].filter(Boolean).join(" / ");
    this.level = state.playerProfile.level;
    this.statPoints = state.playerProfile.statPoints;
    this.baseStats = baseStatKeys.map((key) => {
      const cost = getStatCost(totals[key]);
      const preview = previewStatAllocation(state, data.getClass(state.character.archetype), key, (id) => data.getItem(id), (id) => data.getStatusEffect(id), (id) => data.getSupport(id));
      return {
        key,
        label: baseStatLabels[key],
        total: totals[key],
        cost,
        canIncrease: state.playerProfile.statPoints >= cost,
        preview: preview.map((row) => `${row.label} ${row.delta > 0 ? "+" : ""}${row.delta}`),
      };
    });
    this.derivedStats = [
      ["Max HP", derived.maxHp], ["Max SP", derived.maxSp], ["Physical ATK", derived.physicalAttack],
      ["Ranged ATK", derived.rangedAttack], ["Magic ATK", derived.magicAttack], ["Defense", derived.defense],
      ["Magic DEF", derived.magicDefense], ["Hit", derived.hit], ["Dodge", derived.dodge],
      ["Crit", `${derived.crit}%`], ["Attack Speed", derived.attackSpeed], ["Cast Speed", derived.castSpeed],
      ["Move Speed", derived.moveSpeed], ["Weight Limit", derived.weightLimit],
    ].map(([label, value]) => ({ label: String(label), value: value as number | string }));
    this.hpThresholdPercent = state.character.consumables.autoPotion.hpThresholdPercent;
    this.spThresholdPercent = state.character.consumables.autoPotion.spThresholdPercent;
    this.supportFilter = state.support.autoPickupFilter;
  }
}
