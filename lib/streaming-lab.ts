export type WindowMode = 'tumbling' | 'sliding' | 'session';
export type EventDisposition = 'on-time' | 'late-updated' | 'dropped';
export type CheckpointMode = 'aligned' | 'unaligned';

export interface StreamEvent {
  id: string;
  key: string;
  eventTimeSec: number;
  processingTimeSec: number;
  value: number;
}

export interface EvaluatedStreamEvent extends StreamEvent {
  watermarkAtArrivalSec: number;
  disposition: EventDisposition;
  windowLabel: string;
}

export interface StreamWindowResult {
  id: string;
  startSec: number;
  endSec: number;
  eventCount: number;
  lateUpdateCount: number;
  sumValue: number;
}

export interface StreamParams {
  windowMode: WindowMode;
  windowSizeSec: number;
  watermarkLagSec: number;
  allowedLatenessSec: number;
}

export interface StreamEvaluationResult {
  events: EvaluatedStreamEvent[];
  windows: StreamWindowResult[];
  onTimeCount: number;
  lateUpdatedCount: number;
  droppedCount: number;
  completenessPct: number;
  avgEmissionLatencySec: number;
  watermarkCurve: Array<{ procSec: number; watermarkSec: number }>;
}

export const BASE_STREAM_EVENTS: readonly StreamEvent[] = [
  { id: 'E1', key: 'checkout', eventTimeSec: 2, processingTimeSec: 3, value: 12 },
  { id: 'E2', key: 'checkout', eventTimeSec: 5, processingTimeSec: 6, value: 18 },
  { id: 'E3', key: 'checkout', eventTimeSec: 8, processingTimeSec: 9, value: 10 },
  { id: 'E4', key: 'checkout', eventTimeSec: 12, processingTimeSec: 13, value: 25 },
  { id: 'E6', key: 'checkout', eventTimeSec: 15, processingTimeSec: 16, value: 20 },
  { id: 'E5', key: 'checkout', eventTimeSec: 6, processingTimeSec: 17, value: 15 }, // moderate straggler after W>10
  { id: 'E7', key: 'checkout', eventTimeSec: 18, processingTimeSec: 19, value: 14 },
  { id: 'E8', key: 'checkout', eventTimeSec: 9, processingTimeSec: 20, value: 16 }, // moderate straggler after W>10
  { id: 'E9', key: 'checkout', eventTimeSec: 22, processingTimeSec: 23, value: 30 },
  { id: 'E10', key: 'checkout', eventTimeSec: 4, processingTimeSec: 24, value: 22 }, // severe offline straggler
  { id: 'E11', key: 'checkout', eventTimeSec: 26, processingTimeSec: 27, value: 19 },
  { id: 'E12', key: 'checkout', eventTimeSec: 28, processingTimeSec: 29, value: 11 },
];

export const CHECKPOINT_MODES: ReadonlyArray<{
  id: CheckpointMode;
  name: string;
  mechanism: string;
  backpressureBehavior: string;
  recoverySize: string;
  guarantee: string;
}> = [
  {
    id: 'aligned',
    name: 'Aligned Barriers (Flink ABS / Chandy–Lamport)',
    mechanism: 'Operator pauses faster input channel until checkpoint barrier arrives on all input channels, then snapshots local state.',
    backpressureBehavior: 'Under heavy skew or backpressure, alignment stalls fast channels and checkpoint duration spikes.',
    recoverySize: 'Smallest checkpoint size (no in-flight buffers persisted).',
    guarantee: 'Exactly-Once stateful processing (paired with two-phase commit sink).',
  },
  {
    id: 'unaligned',
    name: 'Unaligned Checkpoints (In-Flight Buffer Snapshot)',
    mechanism: 'Barrier overtakes queued buffers immediately; in-flight records from slower channels are persisted inside the checkpoint.',
    backpressureBehavior: 'Checkpoint finishes in bounded time even under severe downstream backpressure.',
    recoverySize: 'Larger checkpoint payload (operator state + in-flight network buffers).',
    guarantee: 'Exactly-Once stateful processing with predictable checkpoint latency.',
  },
];

function windowBoundsForEvent(
  eventTimeSec: number,
  mode: WindowMode,
  size: number
): { id: string; startSec: number; endSec: number } {
  if (mode === 'tumbling') {
    const start = Math.floor(eventTimeSec / size) * size;
    return { id: `[${start}s, ${start + size}s)`, startSec: start, endSec: start + size };
  }
  if (mode === 'sliding') {
    const slide = Math.max(2, Math.floor(size / 2));
    const start = Math.floor(eventTimeSec / slide) * slide;
    return { id: `[${start}s, ${start + size}s)`, startSec: start, endSec: start + size };
  }
  // Session window: group events into 12s gap-separated sessions
  const sessionBucket = eventTimeSec < 10 ? 0 : eventTimeSec < 20 ? 10 : 20;
  return {
    id: `S[${sessionBucket}s..${sessionBucket + 9}s]`,
    startSec: sessionBucket,
    endSec: sessionBucket + 9,
  };
}

export function evaluateStreamWindows(params: StreamParams): StreamEvaluationResult {
  const windowSize = Math.max(5, Math.min(15, params.windowSizeSec));
  const lag = Math.max(0, Math.min(15, params.watermarkLagSec));
  const allowedLateness = Math.max(0, Math.min(15, params.allowedLatenessSec));

  const sortedByArrival = [...BASE_STREAM_EVENTS].sort(
    (a, b) => a.processingTimeSec - b.processingTimeSec
  );

  let maxEventSeen = 0;
  const evaluated: EvaluatedStreamEvent[] = [];
  const watermarkCurve: Array<{ procSec: number; watermarkSec: number }> = [];
  const windowMap = new Map<string, StreamWindowResult>();

  for (const ev of sortedByArrival) {
    // Watermark prior to processing this record
    const currentWatermark = Math.max(0, maxEventSeen - lag);
    const bounds = windowBoundsForEvent(ev.eventTimeSec, params.windowMode, windowSize);

    let disposition: EventDisposition = 'on-time';
    if (bounds.endSec <= currentWatermark) {
      if (bounds.endSec + allowedLateness >= currentWatermark) {
        disposition = 'late-updated';
      } else {
        disposition = 'dropped';
      }
    }

    if (ev.eventTimeSec > maxEventSeen) {
      maxEventSeen = ev.eventTimeSec;
    }
    const nextWatermark = Math.max(0, maxEventSeen - lag);
    watermarkCurve.push({ procSec: ev.processingTimeSec, watermarkSec: nextWatermark });

    evaluated.push({
      ...ev,
      watermarkAtArrivalSec: currentWatermark,
      disposition,
      windowLabel: bounds.id,
    });

    if (disposition !== 'dropped') {
      const existing = windowMap.get(bounds.id) ?? {
        id: bounds.id,
        startSec: bounds.startSec,
        endSec: bounds.endSec,
        eventCount: 0,
        lateUpdateCount: 0,
        sumValue: 0,
      };
      existing.eventCount += 1;
      existing.sumValue += ev.value;
      if (disposition === 'late-updated') {
        existing.lateUpdateCount += 1;
      }
      windowMap.set(bounds.id, existing);
    }
  }

  const onTimeCount = evaluated.filter((e) => e.disposition === 'on-time').length;
  const lateUpdatedCount = evaluated.filter((e) => e.disposition === 'late-updated').length;
  const droppedCount = evaluated.filter((e) => e.disposition === 'dropped').length;
  const completenessPct = Math.round(
    ((onTimeCount + lateUpdatedCount) / evaluated.length) * 100
  );
  // Window closes once watermark crosses window end: emission latency grows directly with watermark lag
  const avgEmissionLatencySec = Number((lag + 1.5).toFixed(1));

  const windows = Array.from(windowMap.values()).sort((a, b) => a.startSec - b.startSec);

  return {
    events: evaluated,
    windows,
    onTimeCount,
    lateUpdatedCount,
    droppedCount,
    completenessPct,
    avgEmissionLatencySec,
    watermarkCurve,
  };
}
