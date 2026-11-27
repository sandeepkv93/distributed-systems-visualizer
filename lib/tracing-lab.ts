export type TracePresetId = 'checkout-fanout' | 'n-plus-one-db' | 'retry-error-trace';

export interface TraceSpan {
  spanId: string;
  parentSpanId: string | null;
  service: string;
  operation: string;
  host: string;
  startMs: number;
  durationMs: number;
  status: 'ok' | 'error';
  depth: number;
  skewTarget?: boolean;
}

export interface TracePreset {
  id: TracePresetId;
  name: string;
  traceId: string;
  summary: string;
  spans: readonly TraceSpan[];
}

export interface AnalyzedSpan extends TraceSpan {
  reportedStartMs: number;
  reportedEndMs: number;
  onCriticalPath: boolean;
  clockInverted: boolean;
  traceparent: string;
}

export interface TraceAnalysisResult {
  preset: TracePreset;
  spans: AnalyzedSpan[];
  totalDurationMs: number;
  criticalPathIds: string[];
  bottleneckSpan: AnalyzedSpan;
  clockSkewInversionDetected: boolean;
  hasErrorSpan: boolean;
}

export interface SamplingParams {
  totalRps: number;
  errorRatePct: number;
  slowTailRatePct: number;
  headSamplePct: number;
  tailBufferSec: number;
}

export interface SamplingComparisonResult {
  headStoredRps: number;
  headErrorCapturePct: number;
  headSlowCapturePct: number;
  tailStoredRps: number;
  tailErrorCapturePct: number;
  tailSlowCapturePct: number;
  tailBufferMb: number;
  verdict: string;
}

export const TRACE_PRESETS: readonly TracePreset[] = [
  {
    id: 'checkout-fanout',
    name: 'Checkout Parallel Fan-Out & Fraud Bottleneck',
    traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
    summary: 'Parallel inventory + pricing calls overlap, while synchronous fraud-ml scoring dominates the critical path.',
    spans: [
      { spanId: '00f067aa0ba902b7', parentSpanId: null, service: 'api-gateway', operation: 'POST /v1/checkout', host: 'edge-01', startMs: 0, durationMs: 240, status: 'ok', depth: 0 },
      { spanId: '11a2bc0011223344', parentSpanId: '00f067aa0ba902b7', service: 'auth-svc', operation: 'VerifyJWT', host: 'auth-02', startMs: 6, durationMs: 18, status: 'ok', depth: 1 },
      { spanId: '22b3cd0022334455', parentSpanId: '00f067aa0ba902b7', service: 'inventory-svc', operation: 'ReserveStock', host: 'inv-04', startMs: 28, durationMs: 42, status: 'ok', depth: 1 },
      { spanId: '33c4de0033445566', parentSpanId: '00f067aa0ba902b7', service: 'pricing-svc', operation: 'CalcTaxPromo', host: 'price-01', startMs: 28, durationMs: 30, status: 'ok', depth: 1 },
      { spanId: '44d5ef0044556677', parentSpanId: '00f067aa0ba902b7', service: 'payment-svc', operation: 'AuthorizeCharge', host: 'pay-03', startMs: 74, durationMs: 158, status: 'ok', depth: 1 },
      { spanId: '55e6f00055667788', parentSpanId: '44d5ef0044556677', service: 'fraud-ml', operation: 'ScoreRiskModel', host: 'ml-gpu-07', startMs: 80, durationMs: 118, status: 'ok', depth: 2, skewTarget: true },
      { spanId: '66f7010066778899', parentSpanId: '44d5ef0044556677', service: 'ledger-raft', operation: 'RaftAppendCommit', host: 'raft-01', startMs: 200, durationMs: 28, status: 'ok', depth: 2 },
    ],
  },
  {
    id: 'n-plus-one-db',
    name: 'Serial N+1 Query Waterfall',
    traceId: '9f8e7d6c5b4a3210fedcba9876543210',
    summary: 'Five sequential 22ms SQL queries inside a loop stretch a trivial feed render to 150ms despite low individual span latency.',
    spans: [
      { spanId: 'a000000000000001', parentSpanId: null, service: 'feed-api', operation: 'GET /v1/timeline', host: 'web-04', startMs: 0, durationMs: 152, status: 'ok', depth: 0 },
      { spanId: 'a000000000000002', parentSpanId: 'a000000000000001', service: 'timeline-svc', operation: 'FetchPostIds', host: 'tl-01', startMs: 6, durationMs: 18, status: 'ok', depth: 1 },
      { spanId: 'a000000000000003', parentSpanId: 'a000000000000001', service: 'profile-db', operation: 'SELECT author#1', host: 'pg-read-02', startMs: 28, durationMs: 22, status: 'ok', depth: 2, skewTarget: true },
      { spanId: 'a000000000000004', parentSpanId: 'a000000000000001', service: 'profile-db', operation: 'SELECT author#2', host: 'pg-read-02', startMs: 52, durationMs: 22, status: 'ok', depth: 2 },
      { spanId: 'a000000000000005', parentSpanId: 'a000000000000001', service: 'profile-db', operation: 'SELECT author#3', host: 'pg-read-02', startMs: 76, durationMs: 22, status: 'ok', depth: 2 },
      { spanId: 'a000000000000006', parentSpanId: 'a000000000000001', service: 'profile-db', operation: 'SELECT author#4', host: 'pg-read-02', startMs: 100, durationMs: 22, status: 'ok', depth: 2 },
      { spanId: 'a000000000000007', parentSpanId: 'a000000000000001', service: 'profile-db', operation: 'SELECT author#5', host: 'pg-read-02', startMs: 124, durationMs: 22, status: 'ok', depth: 2 },
    ],
  },
  {
    id: 'retry-error-trace',
    name: '503 Timeout & Jittered Retry Recovery',
    traceId: '77aa88bb99cc00dd11ee22ff33445566',
    summary: 'Attempt #1 fails with 503 after a 95ms timeout; jittered backoff + attempt #2 succeeds—hidden by averages unless tail-sampled.',
    spans: [
      { spanId: 'b000000000000001', parentSpanId: null, service: 'edge-proxy', operation: 'POST /v1/orders', host: 'envoy-09', startMs: 0, durationMs: 196, status: 'ok', depth: 0 },
      { spanId: 'b000000000000002', parentSpanId: 'b000000000000001', service: 'order-svc', operation: 'CreateOrder', host: 'ord-02', startMs: 8, durationMs: 182, status: 'ok', depth: 1 },
      { spanId: 'b000000000000003', parentSpanId: 'b000000000000002', service: 'shard-db-a', operation: 'WriteAttempt#1 (503)', host: 'db-05', startMs: 16, durationMs: 95, status: 'error', depth: 2, skewTarget: true },
      { spanId: 'b000000000000004', parentSpanId: 'b000000000000002', service: 'order-svc', operation: 'BackoffJitter(30ms)', host: 'ord-02', startMs: 112, durationMs: 30, status: 'ok', depth: 2 },
      { spanId: 'b000000000000005', parentSpanId: 'b000000000000002', service: 'shard-db-b', operation: 'WriteAttempt#2 (200)', host: 'db-06', startMs: 144, durationMs: 38, status: 'ok', depth: 2 },
    ],
  },
];

export function analyzeTrace(
  presetId: TracePresetId,
  childClockSkewMs: number = 0
): TraceAnalysisResult {
  const preset = TRACE_PRESETS.find((p) => p.id === presetId) ?? TRACE_PRESETS[0];
  const skew = Math.max(-120, Math.min(120, childClockSkewMs));

  const spanMap = new Map(preset.spans.map((s) => [s.spanId, s]));
  const totalDurationMs = Math.max(...preset.spans.map((s) => s.startMs + s.durationMs));

  // Identify critical path: root + longest leaf/branch chain (ignoring overlapped shorter siblings)
  const criticalSet = new Set<string>();
  const root = preset.spans.find((s) => s.parentSpanId === null) ?? preset.spans[0];
  criticalSet.add(root.spanId);

  // Mark every span that is not strictly shadowed by a longer overlapping sibling
  for (const span of preset.spans) {
    if (span.parentSpanId === null) continue;
    const siblings = preset.spans.filter((o) => o.parentSpanId === span.parentSpanId);
    const shadowedByLongerSibling = siblings.some(
      (sib) =>
        sib.spanId !== span.spanId &&
        sib.startMs <= span.startMs &&
        sib.startMs + sib.durationMs >= span.startMs + span.durationMs &&
        sib.durationMs > span.durationMs
    );
    if (!shadowedByLongerSibling) {
      criticalSet.add(span.spanId);
    }
  }

  const analyzed: AnalyzedSpan[] = preset.spans.map((span) => {
    const appliedSkew = span.skewTarget ? skew : 0;
    const reportedStartMs = span.startMs + appliedSkew;
    const reportedEndMs = reportedStartMs + span.durationMs;

    let clockInverted = false;
    if (span.parentSpanId) {
      const parent = spanMap.get(span.parentSpanId);
      if (parent) {
        if (reportedStartMs < parent.startMs || reportedEndMs > parent.startMs + parent.durationMs) {
          clockInverted = true;
        }
      }
    }

    return {
      ...span,
      reportedStartMs,
      reportedEndMs,
      onCriticalPath: criticalSet.has(span.spanId),
      clockInverted,
      traceparent: `00-${preset.traceId}-${span.spanId}-01`,
    };
  });

  // Top non-root bottleneck span by duration
  const nonRoot = analyzed.filter((s) => s.parentSpanId !== null);
  const bottleneckSpan =
    nonRoot.reduce((best, cur) => (cur.durationMs > best.durationMs ? cur : best), nonRoot[0]) ??
    analyzed[0];

  return {
    preset,
    spans: analyzed,
    totalDurationMs,
    criticalPathIds: Array.from(criticalSet),
    bottleneckSpan,
    clockSkewInversionDetected: analyzed.some((s) => s.clockInverted),
    hasErrorSpan: analyzed.some((s) => s.status === 'error'),
  };
}

export function evaluateSamplingEconomics(
  params: SamplingParams
): SamplingComparisonResult {
  const totalRps = Math.max(100, Math.min(500000, params.totalRps));
  const errorPct = Math.max(0.1, Math.min(20, params.errorRatePct));
  const slowPct = Math.max(0.5, Math.min(20, params.slowTailRatePct));
  const headPct = Math.max(0.5, Math.min(50, params.headSamplePct));
  const bufferSec = Math.max(5, Math.min(60, params.tailBufferSec));

  // Head-based sampling keeps uniform headPct of everything (blindly drops 100 - headPct of errors!)
  const headStoredRps = Math.round(totalRps * (headPct / 100));
  const headErrorCapturePct = headPct;
  const headSlowCapturePct = headPct;

  // Tail-based sampling keeps 100% of errors + 100% of p99 slow traces + 1% healthy baseline
  const tailKeepPct = Math.min(100, errorPct + slowPct + 1);
  const tailStoredRps = Math.round(totalRps * (tailKeepPct / 100));
  const tailErrorCapturePct = 100;
  const tailSlowCapturePct = 100;

  // Stateful collector RAM buffer: ~18 KB per in-flight multi-span trace held for bufferSec
  const tailBufferMb = Math.round((totalRps * bufferSec * 18) / 1024);

  const verdict = `Head sampling at ${headPct}% drops ${(100 - headPct).toFixed(1)}% of production 5xx errors; Tail sampling captures 100% of errors & slow traces while requiring ~${tailBufferMb.toLocaleString()} MB stateful collector RAM.`;

  return {
    headStoredRps,
    headErrorCapturePct,
    headSlowCapturePct,
    tailStoredRps,
    tailErrorCapturePct,
    tailSlowCapturePct,
    tailBufferMb,
    verdict,
  };
}
