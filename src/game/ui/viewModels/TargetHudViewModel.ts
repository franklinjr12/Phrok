export interface TargetHudSnapshot {
  enemyId: string | null;
  name: string;
  hp: number;
  maxHp: number;
  hpBarWidth: number;
  boss: boolean;
  elite: boolean;
  level: number | null;
  phase: number;
  statusIcons: string[];
}

/** Event-fed presentation state for target and boss HUDs. It owns formatting math, not combat state. */
export class TargetHudViewModel {
  private target: TargetHudSnapshot | null = null;
  private boss: TargetHudSnapshot | null = null;

  setTarget(enemyId: string, name: string, hp: number, maxHp: number, level?: number, elite = false, statusIcons: string[] = [], barWidth = 126): void {
    this.target = createSnapshot(enemyId, name, hp, maxHp, barWidth, false, 1, level, elite, statusIcons);
  }

  setBoss(name: string, hp: number, maxHp: number, phase: number, level?: number, statusIcons: string[] = [], barWidth = 408): void {
    this.boss = createSnapshot(this.boss?.enemyId ?? null, name, hp, maxHp, barWidth, true, phase, level, false, statusIcons);
  }

  clearTarget(): void { this.target = null; }
  clearBoss(): void { this.boss = null; }
  get targetSnapshot(): TargetHudSnapshot | null { return this.target; }
  get bossSnapshot(): TargetHudSnapshot | null { return this.boss; }
}

function createSnapshot(enemyId: string | null, name: string, hp: number, maxHp: number, barWidth: number, boss: boolean, phase: number, level?: number, elite = false, statusIcons: string[] = []): TargetHudSnapshot {
  const safeMaxHp = Math.max(1, maxHp);
  return {
    enemyId,
    name,
    hp,
    maxHp,
    hpBarWidth: Math.max(0, Math.round(barWidth * Math.max(0, Math.min(1, hp / safeMaxHp)))),
    boss,
    elite,
    level: typeof level === "number" ? level : null,
    phase,
    statusIcons,
  };
}
