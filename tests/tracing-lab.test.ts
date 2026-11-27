import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TRACE_PRESETS,
  analyzeTrace,
  evaluateSamplingEconomics,
} from '../lib/tracing-lab';

describe('Distributed Tracing, OpenTelemetry Span Trees & Tail Sampling Lab', () => {
  it('analyzes critical path, W3C traceparent format, and detects NTP clock-skew span inversion', () => {
    assert.equal(TRACE_PRESETS.length, 3);

    const clean = analyzeTrace('checkout-fanout', 0);
    assert.equal(clean.clockSkewInversionDetected, false);
    assert.equal(clean.bottleneckSpan.service, 'payment-svc');
    assert.ok(clean.spans.every((s) => /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/.test(s.traceparent)));
    // pricing-svc (30ms) is shadowed by parallel inventory-svc (42ms)
    assert.equal(clean.spans.find((s) => s.service === 'pricing-svc')?.onCriticalPath, false);
    assert.equal(clean.spans.find((s) => s.service === 'inventory-svc')?.onCriticalPath, true);

    // Inject -60ms clock skew onto fraud-ml (startMs=80 -> reportedStartMs=20 < parent payment-svc startMs=74)
    const skewed = analyzeTrace('checkout-fanout', -60);
    assert.equal(skewed.clockSkewInversionDetected, true);
    assert.equal(skewed.spans.find((s) => s.service === 'fraud-ml')?.clockInverted, true);

    const retryTrace = analyzeTrace('retry-error-trace', 0);
    assert.equal(retryTrace.hasErrorSpan, true);
  });

  it('contrasts Head-Based vs Tail-Based Sampling error capture and stateful collector RAM', () => {
    const res = evaluateSamplingEconomics({
      totalRps: 20000,
      errorRatePct: 0.5,
      slowTailRatePct: 1,
      headSamplePct: 5,
      tailBufferSec: 15,
    });

    assert.equal(res.headErrorCapturePct, 5);
    assert.equal(res.tailErrorCapturePct, 100);
    assert.equal(res.tailSlowCapturePct, 100);
    assert.ok(res.tailStoredRps < res.headStoredRps);
    assert.ok(res.tailBufferMb > 1000);
  });
});
