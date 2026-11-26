export type BreakerState = 'CLOSED' | 'OPEN' | 'HALF-OPEN';

export interface ResilienceConfig {
  circuitBreakerEnabled: boolean;
  bulkheadEnabled: boolean;
  adaptiveConcurrencyEnabled: boolean;
  deadlinePropagationEnabled: boolean;
  errorThresholdPct: number;
  bulkheadCapPct: number;
}

export interface ResilienceTick {
  tick: number;
  downstreamDegraded: boolean;
  breakerState: BreakerState;
  downstreamErrorPct: number;
  gatewayWorkersUsedPct: number;
  catalogAvailabilityPct: number;
  downstreamLoadPct: number;
  adaptiveLimit: number;
  zombieWorkPct: number;
}

export interface ResilienceSimulationResult {
  ticks: ResilienceTick[];
  minCatalogAvailabilityPct: number;
  peakGatewayWorkersPct: number;
  breakerTripped: boolean;
  halfOpenProbed: boolean;
  recoveredToClosed: boolean;
  avgZombieWorkPct: number;
  blastRadiusContained: boolean;
  verdict: string;
}

export const DEFAULT_RESILIENCE_CONFIG: ResilienceConfig = {
  circuitBreakerEnabled: true,
  bulkheadEnabled: true,
  adaptiveConcurrencyEnabled: true,
  deadlinePropagationEnabled: true,
  errorThresholdPct: 45,
  bulkheadCapPct: 35,
};

export const RESILIENCE_PATTERNS: ReadonlyArray<{
  id: string;
  name: string;
  mechanism: string;
  failurePrevented: string;
  productionRef: string;
  conceptId: string;
}> = [
  {
    id: 'circuit-breaker',
    name: '3-State Circuit Breaker',
    mechanism: 'Monitors sliding error/timeout rate; transitions CLOSED → OPEN (fail fast) → HALF-OPEN (canary probe) → CLOSED.',
    failurePrevented: 'Stops callers from hammering an already-struggling dependency and exhausting caller threads.',
    productionRef: 'Envoy Outlier Detection · Resilience4j',
    conceptId: 'failure-detectors',
  },
  {
    id: 'bulkhead',
    name: 'Bulkhead Thread / Semaphore Isolation',
    mechanism: 'Partitions gateway concurrency into disjoint per-dependency pools (like ship hull compartments).',
    failurePrevented: 'Prevents one slow downstream endpoint (/checkout) from starving unrelated healthy endpoints (/catalog).',
    productionRef: 'Netflix Hystrix · Envoy Per-Cluster Max Connections',
    conceptId: 'load-balancing',
  },
  {
    id: 'adaptive-concurrency',
    name: 'AIMD / Vegas Adaptive Concurrency',
    mechanism: 'Measures baseline minRTT; multiplicatively cuts concurrency limit when RTT spikes, additively probes upward when healthy.',
    failurePrevented: 'Eliminates static brittle rate-limit tuning and prevents Little’s Law queue explosion.',
    productionRef: 'Netflix Concurrency Limits · Envoy Adaptive Concurrency',
    conceptId: 'load-balancing',
  },
  {
    id: 'deadline-propagation',
    name: 'End-to-End Deadline Propagation',
    mechanism: 'Attaches absolute caller deadline timestamp in RPC metadata; every downstream hop aborts if remaining budget ≤ 0.',
    failurePrevented: 'Eliminates zombie work where deep services execute expensive DB queries whose caller already timed out.',
    productionRef: 'gRPC grpc-timeout · Google Stubby Deadlines',
    conceptId: 'network-partitions',
  },
];

export function simulateResilienceMesh(
  config: ResilienceConfig
): ResilienceSimulationResult {
  const errThreshold = Math.max(15, Math.min(85, config.errorThresholdPct));
  const bulkheadCap = Math.max(15, Math.min(60, config.bulkheadCapPct));

  const ticks: ResilienceTick[] = [];
  let breakerState: BreakerState = 'CLOSED';
  let openCooldown = 0;
  let adaptiveLimit = 100;

  for (let tick = 0; tick < 16; tick++) {
    // Downstream B degrades heavily on ticks 4..10, then recovers at tick 11
    const downstreamDegraded = tick >= 4 && tick <= 10;
    const downstreamErrorPct = downstreamDegraded ? 72 : 1;

    // Breaker state machine
    if (!config.circuitBreakerEnabled) {
      breakerState = 'CLOSED';
    } else if (breakerState === 'CLOSED') {
      if (downstreamErrorPct >= errThreshold) {
        breakerState = 'OPEN';
        openCooldown = 3;
      }
    } else if (breakerState === 'OPEN') {
      openCooldown -= 1;
      if (openCooldown <= 0) {
        breakerState = 'HALF-OPEN';
      }
    } else if (breakerState === 'HALF-OPEN') {
      if (downstreamErrorPct >= errThreshold) {
        breakerState = 'OPEN';
        openCooldown = 3;
      } else {
        breakerState = 'CLOSED';
      }
    }

    // Adaptive concurrency AIMD
    if (config.adaptiveConcurrencyEnabled) {
      if (downstreamDegraded && breakerState === 'CLOSED') {
        adaptiveLimit = Math.max(25, Math.round(adaptiveLimit * 0.65));
      } else if (downstreamDegraded) {
        adaptiveLimit = Math.max(35, Math.round(adaptiveLimit * 0.85));
      } else {
        adaptiveLimit = Math.min(100, adaptiveLimit + 14);
      }
    } else {
      adaptiveLimit = 100;
    }

    // Downstream B effective offered load %
    let downstreamLoadPct = 40;
    if (downstreamDegraded) {
      if (breakerState === 'OPEN') {
        downstreamLoadPct = 0; // fail-fast locally
      } else if (breakerState === 'HALF-OPEN') {
        downstreamLoadPct = 8; // single canary probe
      } else if (config.adaptiveConcurrencyEnabled) {
        downstreamLoadPct = Math.round(adaptiveLimit * 0.65);
      } else {
        downstreamLoadPct = 135; // retries & slow threads pile up
      }
    }

    // Gateway worker consumption & /catalog availability
    const healthyCatalogBaseWorkers = 28;
    let checkoutWorkers = 18;
    if (downstreamDegraded) {
      if (breakerState === 'OPEN') {
        checkoutWorkers = 4; // instant fail-fast frees threads immediately
      } else if (breakerState === 'HALF-OPEN') {
        checkoutWorkers = 10;
      } else {
        // Threads pile up waiting on slow 500ms downstream calls
        const rawPileup = config.adaptiveConcurrencyEnabled ? 48 : 82;
        checkoutWorkers = config.bulkheadEnabled ? Math.min(bulkheadCap, rawPileup) : rawPileup;
      }
    }

    const gatewayWorkersUsedPct = Math.min(100, healthyCatalogBaseWorkers + checkoutWorkers);

    // Without bulkhead or breaker, gateway worker pool hits 100% and starves unrelated /catalog requests!
    let catalogAvailabilityPct = 100;
    if (gatewayWorkersUsedPct >= 95 && !config.bulkheadEnabled) {
      catalogAvailabilityPct = 22;
    } else if (gatewayWorkersUsedPct >= 82 && !config.bulkheadEnabled) {
      catalogAvailabilityPct = 68;
    }

    // Zombie work (downstream executing requests whose upstream caller already timed out)
    const zombieWorkPct =
      downstreamDegraded && breakerState !== 'OPEN'
        ? config.deadlinePropagationEnabled
          ? 2
          : 44
        : 0;

    ticks.push({
      tick,
      downstreamDegraded,
      breakerState,
      downstreamErrorPct,
      gatewayWorkersUsedPct,
      catalogAvailabilityPct,
      downstreamLoadPct,
      adaptiveLimit,
      zombieWorkPct,
    });
  }

  const minCatalogAvailabilityPct = Math.min(...ticks.map((t) => t.catalogAvailabilityPct));
  const peakGatewayWorkersPct = Math.max(...ticks.map((t) => t.gatewayWorkersUsedPct));
  const breakerTripped = ticks.some((t) => t.breakerState === 'OPEN');
  const halfOpenProbed = ticks.some((t) => t.breakerState === 'HALF-OPEN');
  const recoveredToClosed = ticks[ticks.length - 1].breakerState === 'CLOSED';
  const avgZombieWorkPct = Math.round(
    ticks.reduce((acc, t) => acc + t.zombieWorkPct, 0) / ticks.length
  );
  const blastRadiusContained = minCatalogAvailabilityPct === 100 && peakGatewayWorkersPct < 85;

  const verdict = blastRadiusContained
    ? 'Blast radius fully contained: healthy /catalog traffic stayed at 100% availability while Downstream B degraded.'
    : 'Cascading failure detected: slow Downstream B calls saturated shared gateway workers and degraded unrelated /catalog traffic.';

  return {
    ticks,
    minCatalogAvailabilityPct,
    peakGatewayWorkersPct,
    breakerTripped,
    halfOpenProbed,
    recoveredToClosed,
    avgZombieWorkPct,
    blastRadiusContained,
    verdict,
  };
}
