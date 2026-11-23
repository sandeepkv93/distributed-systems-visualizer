export type DropRatePercent = 0 | 25 | 50 | 75;
export type DelayMultiplier = 1 | 2 | 3;

export interface ChaosConfig {
  dropRate: DropRatePercent;
  delayMultiplier: DelayMultiplier;
}

export const DEFAULT_CHAOS_CONFIG: ChaosConfig = {
  dropRate: 0,
  delayMultiplier: 1,
};

export const DROP_RATE_OPTIONS: readonly DropRatePercent[] = [0, 25, 50, 75];
export const DELAY_MULTIPLIER_OPTIONS: readonly DelayMultiplier[] = [1, 2, 3];

export function isChaosActive(config: ChaosConfig): boolean {
  return config.dropRate > 0 || config.delayMultiplier > 1;
}

export function shouldDropPacket(
  dropRate: number,
  rng: () => number = Math.random
): boolean {
  if (!Number.isFinite(dropRate) || dropRate <= 0) return false;
  if (dropRate >= 100) return true;
  return rng() * 100 < dropRate;
}

export function computeDeliveryDelay(
  baseMs: number,
  delayMultiplier: number
): number {
  const safeBase = Math.max(0, baseMs);
  const safeMult = Number.isFinite(delayMultiplier) ? Math.max(1, delayMultiplier) : 1;
  return Math.round(safeBase * safeMult);
}

export function applyChaosToMessages<T extends { status: string }>(
  inFlightMessages: T[],
  dropRate: number,
  rng: () => number = Math.random
): { survivors: T[]; dropped: T[] } {
  const survivors: T[] = [];
  const dropped: T[] = [];

  for (const msg of inFlightMessages) {
    if (shouldDropPacket(dropRate, rng)) {
      msg.status = 'dropped';
      dropped.push(msg);
    } else {
      survivors.push(msg);
    }
  }

  return { survivors, dropped };
}
