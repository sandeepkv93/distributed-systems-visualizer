import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  QUEUEING_PRESETS,
  buildUtilizationCurve,
  computeFanOutTail,
  computeMMcMetrics,
  simulateRetryStorm,
} from '../lib/queueing-math';

describe('Queueing Theory, Little’s Law & Tail-Latency engine', () => {
  it('satisfies exact M/M/1 response time, Little’s Law L = λW, and instability at ρ ≥ 1', () => {
    // M/M/1 with λ=80 rps, service=10ms (μ=100 rps) => ρ=0.8, W = 1/(100-80) = 50ms, L = 80 * 0.05 = 4
    const mm1 = computeMMcMetrics({ arrivalRateRps: 80, serviceTimeMs: 10, servers: 1 });
    assert.equal(mm1.stable, true);
    assert.ok(Math.abs(mm1.utilization - 0.8) < 1e-9);
    assert.ok(Math.abs(mm1.meanResponseMs - 50) < 1e-6);
    assert.ok(Math.abs(mm1.littleConcurrency - 4) < 1e-6);
    assert.ok(Math.abs(mm1.littleConcurrency - mm1.arrivalRateRps * (mm1.meanResponseMs / 1000)) < 1e-9);

    // Multi-server pooling at same ρ=0.8 yields dramatically lower mean queue wait than M/M/1
    const mm4 = computeMMcMetrics({ arrivalRateRps: 320, serviceTimeMs: 10, servers: 4 });
    assert.equal(mm4.stable, true);
    assert.ok(mm4.meanQueueWaitMs < mm1.meanQueueWaitMs);
    assert.ok(Math.abs(mm4.littleConcurrency - mm4.arrivalRateRps * (mm4.meanResponseMs / 1000)) < 1e-9);

    // Saturated ρ >= 1 must mark unstable
    const saturated = computeMMcMetrics({ arrivalRateRps: 100, serviceTimeMs: 10, servers: 1 });
    assert.equal(saturated.stable, false);
    assert.equal(saturated.meanResponseMs, Number.POSITIVE_INFINITY);

    const curve = buildUtilizationCurve(10, 4);
    assert.ok(curve.length >= 10);
    for (let i = 1; i < curve.length; i++) {
      assert.ok(curve[i].meanResponseMs >= curve[i - 1].meanResponseMs);
    }
  });

  it('computes fan-out tail amplification, hedged request reduction, and retry storm collapse', () => {
    assert.equal(QUEUEING_PRESETS.length, 4);

    // k=100, p=0.01 => 1 - 0.99^100 ≈ 63.4% unhedged vs ~0.995% hedged
    const fan = computeFanOutTail(100, 1);
    assert.ok(fan.unhedgedTailProbPct > 63 && fan.unhedgedTailProbPct < 64);
    assert.ok(fan.hedgedTailProbPct < 1.2);
    assert.ok(fan.reductionFactor > 50);

    // High baseline load + aggressive retries causes metastable collapse under naive retries while jittered recovers
    const storm = simulateRetryStorm(82, 3);
    assert.equal(storm.ticks.length, 16);
    assert.equal(storm.naiveMetastableCollapsed, true);
    assert.equal(storm.jitteredRecovered, true);
    assert.ok(storm.peakNaiveQueue > storm.peakJitteredQueue * 3);
  });
});
