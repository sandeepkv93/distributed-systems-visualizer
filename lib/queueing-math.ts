export interface MMcInput {
  arrivalRateRps: number;
  serviceTimeMs: number;
  servers: number;
}

export interface MMcMetrics {
  arrivalRateRps: number;
  serviceRatePerServer: number;
  totalCapacityRps: number;
  utilization: number;
  stable: boolean;
  erlangC: number;
  meanQueueWaitMs: number;
  meanResponseMs: number;
  p99ResponseMs: number;
  littleConcurrency: number;
  queueLength: number;
}

export interface UtilizationPoint {
  rho: number;
  meanResponseMs: number;
  singleServerResponseMs: number;
}

export interface FanOutResult {
  fanOut: number;
  unhedgedTailProbPct: number;
  hedgedTailProbPct: number;
  reductionFactor: number;
  expectedHedgeOverheadPct: number;
  curve: Array<{
    k: number;
    unhedgedPct: number;
    hedgedPct: number;
  }>;
}

export interface RetryTick {
  tick: number;
  capacityRps: number;
  naiveEffectiveLoadRps: number;
  naiveQueueDepth: number;
  jitteredEffectiveLoadRps: number;
  jitteredQueueDepth: number;
  inBrownout: boolean;
}

export interface RetryStormResult {
  ticks: RetryTick[];
  naiveMetastableCollapsed: boolean;
  jitteredRecovered: boolean;
  peakNaiveQueue: number;
  peakJitteredQueue: number;
}

export type QueueingPresetId =
  | 'healthy-pool'
  | 'hockey-stick'
  | 'microservice-fanout'
  | 'metastable-storm';

export interface QueueingPreset {
  id: QueueingPresetId;
  name: string;
  tagline: string;
  arrivalRateRps: number;
  serviceTimeMs: number;
  servers: number;
  fanOut: number;
  singleTailPct: number;
  retryMultiplier: number;
}

export const QUEUEING_PRESETS: readonly QueueingPreset[] = [
  {
    id: 'healthy-pool',
    name: 'Healthy Multi-Server Pool',
    tagline: '60% utilization across 4 workers with modest fan-out',
    arrivalRateRps: 240,
    serviceTimeMs: 10,
    servers: 4,
    fanOut: 10,
    singleTailPct: 1,
    retryMultiplier: 2,
  },
  {
    id: 'hockey-stick',
    name: 'M/M/1 Utilization Cliff (92%)',
    tagline: 'Single server near saturation enters exponential wait explosion',
    arrivalRateRps: 92,
    serviceTimeMs: 10,
    servers: 1,
    fanOut: 12,
    singleTailPct: 1,
    retryMultiplier: 3,
  },
  {
    id: 'microservice-fanout',
    name: 'Tail-at-Scale Fan-Out (k=60)',
    tagline: '1% leaf tail becomes 45% parent p99 failure without hedged requests',
    arrivalRateRps: 280,
    serviceTimeMs: 10,
    servers: 4,
    fanOut: 60,
    singleTailPct: 1,
    retryMultiplier: 2,
  },
  {
    id: 'metastable-storm',
    name: 'Metastable Retry Collapse',
    tagline: 'High baseline load + aggressive retries lock cluster in post-brownout meltdown',
    arrivalRateRps: 330,
    serviceTimeMs: 10,
    servers: 4,
    fanOut: 30,
    singleTailPct: 2,
    retryMultiplier: 3,
  },
];

function factorial(n: number): number {
  let acc = 1;
  for (let i = 2; i <= n; i++) acc *= i;
  return acc;
}

export function computeErlangC(servers: number, offeredLoadA: number): number {
  const c = Math.max(1, Math.floor(servers));
  const rho = offeredLoadA / c;
  if (rho >= 1) return 1;
  if (offeredLoadA <= 0) return 0;

  let sum = 0;
  for (let k = 0; k < c; k++) {
    sum += Math.pow(offeredLoadA, k) / factorial(k);
  }
  const top = (Math.pow(offeredLoadA, c) / factorial(c)) * (1 / (1 - rho));
  return top / (sum + top);
}

export function computeMMcMetrics(input: MMcInput): MMcMetrics {
  const c = Math.max(1, Math.min(16, Math.floor(input.servers)));
  const serviceTimeMs = Math.max(1, input.serviceTimeMs);
  const arrivalRateRps = Math.max(0, input.arrivalRateRps);

  const serviceRatePerServer = 1000 / serviceTimeMs;
  const totalCapacityRps = c * serviceRatePerServer;
  const utilization = arrivalRateRps / totalCapacityRps;

  if (utilization >= 1) {
    return {
      arrivalRateRps,
      serviceRatePerServer,
      totalCapacityRps,
      utilization,
      stable: false,
      erlangC: 1,
      meanQueueWaitMs: Number.POSITIVE_INFINITY,
      meanResponseMs: Number.POSITIVE_INFINITY,
      p99ResponseMs: Number.POSITIVE_INFINITY,
      littleConcurrency: Number.POSITIVE_INFINITY,
      queueLength: Number.POSITIVE_INFINITY,
    };
  }

  const offeredLoadA = arrivalRateRps / serviceRatePerServer;
  const erlangC = computeErlangC(c, offeredLoadA);
  const meanQueueWaitMs = (erlangC / (totalCapacityRps - arrivalRateRps)) * 1000;
  const meanResponseMs = meanQueueWaitMs + serviceTimeMs;

  // Tail approximation: exponential wait tail conditioned on queueing + exponential service
  const waitP99Ms =
    erlangC > 0.01
      ? Math.max(0, (Math.log(100 * erlangC) / (totalCapacityRps - arrivalRateRps)) * 1000)
      : 0;
  const p99ResponseMs = serviceTimeMs * Math.log(100) + waitP99Ms;

  const littleConcurrency = arrivalRateRps * (meanResponseMs / 1000);
  const queueLength = arrivalRateRps * (meanQueueWaitMs / 1000);

  return {
    arrivalRateRps,
    serviceRatePerServer,
    totalCapacityRps,
    utilization,
    stable: true,
    erlangC,
    meanQueueWaitMs,
    meanResponseMs,
    p99ResponseMs,
    littleConcurrency,
    queueLength,
  };
}

export function buildUtilizationCurve(
  serviceTimeMs: number,
  servers: number
): UtilizationPoint[] {
  const c = Math.max(1, Math.min(16, Math.floor(servers)));
  const rhos = [
    0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.72, 0.78, 0.84, 0.88, 0.91, 0.94, 0.96,
  ];
  const mu = 1000 / Math.max(1, serviceTimeMs);

  return rhos.map((rho) => {
    const multi = computeMMcMetrics({
      arrivalRateRps: rho * c * mu,
      serviceTimeMs,
      servers: c,
    });
    const single = computeMMcMetrics({
      arrivalRateRps: rho * mu,
      serviceTimeMs,
      servers: 1,
    });
    return {
      rho,
      meanResponseMs: multi.meanResponseMs,
      singleServerResponseMs: single.meanResponseMs,
    };
  });
}

export function computeFanOutTail(
  fanOut: number,
  singleTailPct: number
): FanOutResult {
  const k = Math.max(1, Math.min(100, Math.round(fanOut)));
  const p = Math.max(0.001, Math.min(0.25, singleTailPct / 100));

  const unhedgedProb = 1 - Math.pow(1 - p, k);
  // Hedged request fired at p95 latency: tail occurs only if both primary and backup hit tail (~p^2)
  const hedgedProb = 1 - Math.pow(1 - p * p, k);
  const reductionFactor = hedgedProb > 0 ? unhedgedProb / hedgedProb : 1;

  const sampleKs = [1, 5, 10, 20, 30, 45, 60, 80, 100];
  const curve = sampleKs.map((n) => ({
    k: n,
    unhedgedPct: (1 - Math.pow(1 - p, n)) * 100,
    hedgedPct: (1 - Math.pow(1 - p * p, n)) * 100,
  }));

  return {
    fanOut: k,
    unhedgedTailProbPct: unhedgedProb * 100,
    hedgedTailProbPct: hedgedProb * 100,
    reductionFactor,
    expectedHedgeOverheadPct: 5,
    curve,
  };
}

export function simulateRetryStorm(
  baselineLoadPct: number,
  retryMultiplier: number
): RetryStormResult {
  const capacityNormal = 100;
  const baseLoad = Math.max(20, Math.min(95, baselineLoadPct));
  const retries = Math.max(1, Math.min(5, retryMultiplier));

  const ticks: RetryTick[] = [];
  let naiveQueue = 0;
  let jitteredQueue = 0;
  let naiveRetryBacklog = 0;
  let jitteredRetryPool = 0;

  for (let tick = 0; tick < 16; tick++) {
    const inBrownout = tick >= 3 && tick <= 6;
    const capacity = inBrownout ? 55 : capacityNormal;

    // Naive: every timed-out/dropped unit retries aggressively on the next tick without cap
    const naiveDemand = baseLoad + naiveRetryBacklog;
    const naiveOverflow = Math.max(0, naiveDemand + naiveQueue - capacity);
    naiveQueue = Math.min(600, naiveOverflow);
    const naiveTimedOut = Math.max(0, naiveDemand - capacity) + (naiveQueue > 40 ? naiveQueue * 0.3 : 0);
    naiveRetryBacklog = Math.min(400, naiveTimedOut * (0.45 * retries));

    // Jittered + 10% retry budget + load shedding
    const retryBudget = baseLoad * 0.12;
    const jitteredRetriesThisTick = Math.min(retryBudget, jitteredRetryPool * 0.35);
    jitteredRetryPool = Math.max(0, jitteredRetryPool - jitteredRetriesThisTick);

    const jitteredDemand = baseLoad + jitteredRetriesThisTick;
    const jitteredOverflow = Math.max(0, jitteredDemand + jitteredQueue - capacity);
    // Shed excess beyond small bounded queue to prevent metastable saturation
    jitteredQueue = Math.min(28, jitteredOverflow * 0.65);
    if (jitteredOverflow > 0) {
      jitteredRetryPool = Math.min(50, jitteredRetryPool + Math.min(jitteredOverflow, 18) * 0.5);
    }

    ticks.push({
      tick,
      capacityRps: capacity,
      naiveEffectiveLoadRps: Math.round(naiveDemand),
      naiveQueueDepth: Math.round(naiveQueue),
      jitteredEffectiveLoadRps: Math.round(jitteredDemand),
      jitteredQueueDepth: Math.round(jitteredQueue),
      inBrownout,
    });
  }

  const finalTick = ticks[ticks.length - 1];
  return {
    ticks,
    naiveMetastableCollapsed: finalTick.naiveQueueDepth >= 60,
    jitteredRecovered: finalTick.jitteredQueueDepth <= 5,
    peakNaiveQueue: Math.max(...ticks.map((t) => t.naiveQueueDepth)),
    peakJitteredQueue: Math.max(...ticks.map((t) => t.jitteredQueueDepth)),
  };
}
