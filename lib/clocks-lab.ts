export type ClockPresetId = 'ntp-skew' | 'spanner-truetime' | 'severe-drift' | 'synchronized';

export interface ClockPreset {
  id: ClockPresetId;
  label: string;
  description: string;
  skewA: number;
  skewB: number;
  skewC: number;
  epsilonMs: number;
}

export interface ClockLabConfig {
  skewA: number; // ms offset from true real time (-50..+50)
  skewB: number;
  skewC: number;
  epsilonMs: number; // TrueTime uncertainty half-width ε (1..50ms)
  networkDelayMs?: number; // one-way RPC delay (default 12ms)
}

export interface HlcTimestamp {
  l: number; // physical component (ms)
  c: number; // logical counter
}

export interface ClockTraceEvent {
  id: string;
  node: 'A' | 'B' | 'C';
  label: string;
  trueTimeMs: number;
  causalParentId: string | null;
  wallClockMs: number;
  hlc: HlcTimestamp;
  trueTimeEarliestMs: number;
  trueTimeLatestMs: number;
  commitWaitMs: number;
  lwwCausalInversion: boolean;
  hlcOrderPreserved: boolean;
}

export interface ClockLabResult {
  events: ClockTraceEvent[];
  lwwInversionCount: number;
  hlcOrderHolds: boolean;
  maxHlcDriftFromWallMs: number;
  trueTimeCommitWaitMs: number;
  externalConsistencyGuaranteed: boolean;
  summaryVerdict: string;
}

export const CLOCK_PRESETS: readonly ClockPreset[] = [
  {
    id: 'ntp-skew',
    label: 'Cloud NTP Skew',
    description: 'Typical ±20ms NTP drift causes Wall-Clock LWW to drop a causally newer write.',
    skewA: 25,
    skewB: -20,
    skewC: 5,
    epsilonMs: 20,
  },
  {
    id: 'spanner-truetime',
    label: 'Spanner TrueTime',
    description: 'GPS + atomic clocks bound uncertainty ε = 3ms, enabling 6ms Commit-Wait.',
    skewA: 2,
    skewB: -2,
    skewC: 1,
    epsilonMs: 3,
  },
  {
    id: 'severe-drift',
    label: 'VM Pause / Severe Drift',
    description: 'Heavy 75ms cross-node skew breaks LWW across multiple hops; HLC tracks causality.',
    skewA: 40,
    skewB: -35,
    skewC: -15,
    epsilonMs: 35,
  },
  {
    id: 'synchronized',
    label: 'Ideal Zero Skew',
    description: 'Zero physical drift baseline where wall clock, HLC, and TrueTime all align.',
    skewA: 0,
    skewB: 0,
    skewC: 0,
    epsilonMs: 1,
  },
] as const;

export function compareHlc(a: HlcTimestamp, b: HlcTimestamp): number {
  if (a.l !== b.l) return a.l - b.l;
  return a.c - b.c;
}

export function formatHlc(ts: HlcTimestamp): string {
  return `(${ts.l}ms, c=${ts.c})`;
}

function hlcLocalOrSend(prev: HlcTimestamp, pt: number): HlcTimestamp {
  const l = Math.max(prev.l, pt);
  const c = l === prev.l ? prev.c + 1 : 0;
  return { l, c };
}

function hlcReceive(prev: HlcTimestamp, msg: HlcTimestamp, pt: number): HlcTimestamp {
  const l = Math.max(prev.l, msg.l, pt);
  let c = 0;
  if (l === prev.l && l === msg.l) {
    c = Math.max(prev.c, msg.c) + 1;
  } else if (l === prev.l) {
    c = prev.c + 1;
  } else if (l === msg.l) {
    c = msg.c + 1;
  }
  return { l, c };
}

export function simulateClockTrace(raw: ClockLabConfig): ClockLabResult {
  const skew: Record<'A' | 'B' | 'C', number> = {
    A: Math.max(-50, Math.min(50, Math.round(raw.skewA))),
    B: Math.max(-50, Math.min(50, Math.round(raw.skewB))),
    C: Math.max(-50, Math.min(50, Math.round(raw.skewC))),
  };
  const epsilonMs = Math.max(1, Math.min(50, Math.round(raw.epsilonMs)));
  const netDelay = Math.max(2, Math.min(40, Math.round(raw.networkDelayMs ?? 12)));

  const hlcState: Record<'A' | 'B' | 'C', HlcTimestamp> = {
    A: { l: 0, c: 0 },
    B: { l: 0, c: 0 },
    C: { l: 0, c: 0 },
  };

  const schedule: ReadonlyArray<{
    id: string;
    node: 'A' | 'B' | 'C';
    label: string;
    trueTimeMs: number;
    causalParentId: string | null;
  }> = [
    {
      id: 'e1',
      node: 'A',
      label: 'W(k, "v1") on Node A',
      trueTimeMs: 100,
      causalParentId: null,
    },
    {
      id: 'e2',
      node: 'B',
      label: 'Recv(e1) → W(k, "v2") on Node B',
      trueTimeMs: 100 + netDelay,
      causalParentId: 'e1',
    },
    {
      id: 'e3',
      node: 'C',
      label: 'Recv(e2) → W(k, "v3") on Node C',
      trueTimeMs: 100 + netDelay * 2,
      causalParentId: 'e2',
    },
    {
      id: 'e4',
      node: 'B',
      label: 'Recv(e3) → W(k, "v4") on Node B',
      trueTimeMs: 100 + netDelay * 3,
      causalParentId: 'e3',
    },
  ];

  const byId = new Map<string, ClockTraceEvent>();
  const events: ClockTraceEvent[] = [];

  for (const step of schedule) {
    const pt = step.trueTimeMs + skew[step.node];
    const parent = step.causalParentId ? byId.get(step.causalParentId) ?? null : null;

    const nextHlc = parent
      ? hlcReceive(hlcState[step.node], parent.hlc, pt)
      : hlcLocalOrSend(hlcState[step.node], pt);
    hlcState[step.node] = nextHlc;

    const lwwCausalInversion = parent ? pt <= parent.wallClockMs : false;
    const hlcOrderPreserved = parent ? compareHlc(nextHlc, parent.hlc) > 0 : true;

    const evt: ClockTraceEvent = {
      id: step.id,
      node: step.node,
      label: step.label,
      trueTimeMs: step.trueTimeMs,
      causalParentId: step.causalParentId,
      wallClockMs: pt,
      hlc: nextHlc,
      trueTimeEarliestMs: pt - epsilonMs,
      trueTimeLatestMs: pt + epsilonMs,
      commitWaitMs: 2 * epsilonMs,
      lwwCausalInversion,
      hlcOrderPreserved,
    };

    byId.set(evt.id, evt);
    events.push(evt);
  }

  const lwwInversionCount = events.filter((e) => e.lwwCausalInversion).length;
  const hlcOrderHolds = events.every((e) => e.hlcOrderPreserved);
  const maxHlcDriftFromWallMs = events.reduce(
    (max, e) => Math.max(max, Math.abs(e.hlc.l - e.wallClockMs)),
    0
  );
  const trueTimeCommitWaitMs = 2 * epsilonMs;

  // TrueTime guarantees external consistency whenever actual physical skew stays within ±epsilon
  const maxAbsSkew = Math.max(Math.abs(skew.A), Math.abs(skew.B), Math.abs(skew.C));
  const externalConsistencyGuaranteed = maxAbsSkew <= epsilonMs;

  const summaryVerdict =
    lwwInversionCount > 0
      ? `Wall-Clock LWW suffered ${lwwInversionCount} causal inversion(s) (silent data loss), while HLC preserved 100% causal order (max logical drift ${maxHlcDriftFromWallMs}ms).`
      : 'No Wall-Clock LWW inversions under current skew; HLC and TrueTime remain monotonic.';

  return {
    events,
    lwwInversionCount,
    hlcOrderHolds,
    maxHlcDriftFromWallMs,
    trueTimeCommitWaitMs,
    externalConsistencyGuaranteed,
    summaryVerdict,
  };
}
