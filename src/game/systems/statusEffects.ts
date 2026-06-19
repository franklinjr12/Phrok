import { eventBus } from "./eventBus";
import type { StatusEffectDefinition } from "../types/dataDefinitions";
import type { ActiveStatusEffect, BaseStatKey, DerivedStats, StatModifier } from "../types/gameState";

export type StatusEffectTargetKind = "player" | "enemy";

export interface StatusEffectTickResult {
  damage: number;
  expiredIds: string[];
  tickedIds: string[];
}

export function applyStatusEffect(
  activeEffects: ActiveStatusEffect[],
  definition: StatusEffectDefinition,
  sourceId: string,
  now = Date.now(),
): ActiveStatusEffect[] {
  const existing = activeEffects.find((effect) => effect.id === definition.id);
  const duration = Math.max(0, definition.duration);
  const nextTickAt = now + Math.max(1, definition.tickInterval);

  if (existing) {
    if (definition.stackBehavior === "ignore") {
      return activeEffects;
    }

    if (definition.stackBehavior === "stack") {
      existing.stacks = Math.min(definition.maxStacks, existing.stacks + 1);
    } else {
      existing.stacks = 1;
    }

    existing.sourceId = sourceId;
    existing.appliedAt = now;
    existing.expiresAt = now + duration;
    existing.nextTickAt = nextTickAt;
    return activeEffects;
  }

  activeEffects.push({
    id: definition.id,
    sourceId,
    stacks: 1,
    appliedAt: now,
    expiresAt: now + duration,
    nextTickAt,
  });

  return activeEffects;
}

export function updateStatusEffects(
  activeEffects: ActiveStatusEffect[],
  getDefinition: (id: string) => StatusEffectDefinition,
  now = Date.now(),
): StatusEffectTickResult {
  let damage = 0;
  const tickedIds: string[] = [];
  const expiredIds: string[] = [];

  for (const effect of activeEffects) {
    const definition = getDefinition(effect.id);

    if (definition.damageOverTime && effect.nextTickAt <= now && effect.expiresAt > now) {
      const tickCount = Math.max(1, Math.floor((now - effect.nextTickAt) / Math.max(1, definition.tickInterval)) + 1);
      damage += definition.damageOverTime.amount * effect.stacks * tickCount;
      effect.nextTickAt += Math.max(1, definition.tickInterval) * tickCount;
      tickedIds.push(effect.id);
    }

    if (effect.expiresAt <= now) {
      expiredIds.push(effect.id);
    }
  }

  for (let index = activeEffects.length - 1; index >= 0; index -= 1) {
    if (activeEffects[index].expiresAt <= now) {
      activeEffects.splice(index, 1);
    }
  }

  return { damage, expiredIds, tickedIds };
}

export function getStatusStatModifiers(
  activeEffects: ActiveStatusEffect[],
  getDefinition: (id: string) => StatusEffectDefinition,
): StatModifier[] {
  return activeEffects.map((effect) => {
    const definition = getDefinition(effect.id);

    return {
      id: `status-${effect.id}`,
      sourceStatusEffectId: effect.id,
      expiresAt: effect.expiresAt,
      baseStats: multiplyNumberRecord(definition.statModifiers.baseStats, effect.stacks) as Partial<Record<BaseStatKey, number>>,
      derivedStats: multiplyNumberRecord(definition.statModifiers.derivedStats, effect.stacks) as Partial<DerivedStats>,
    };
  });
}

export function hasControlEffect(
  activeEffects: ActiveStatusEffect[],
  getDefinition: (id: string) => StatusEffectDefinition,
  controlEffect: NonNullable<StatusEffectDefinition["controlEffect"]>,
): boolean {
  return activeEffects.some((effect) => getDefinition(effect.id).controlEffect === controlEffect);
}

export function getStatusSummary(
  activeEffects: ActiveStatusEffect[],
  getDefinition: (id: string) => StatusEffectDefinition,
): string {
  return activeEffects
    .map((effect) => {
      const definition = getDefinition(effect.id);
      return `${effect.id}:${definition.name}:${effect.stacks}:${definition.visualIcon}`;
    })
    .join("|");
}

export function emitStatusEffectsChanged(
  targetKind: StatusEffectTargetKind,
  targetId: string,
  statuses: ActiveStatusEffect[],
): void {
  eventBus.emit("statusEffectsChanged", {
    targetKind,
    targetId,
    statuses: statuses.map((status) => ({ ...status })),
  });
}

function multiplyNumberRecord(source: Record<string, number> | undefined, stacks: number): Record<string, number> | undefined {
  if (!source) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, value * stacks]),
  );
}
