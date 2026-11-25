import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLOCK_PRESETS,
  compareHlc,
  formatHlc,
  simulateClockTrace,
} from '../lib/clocks-lab';

describe('Hybrid Logical Clocks (HLC) & TrueTime Uncertainty Lab', () => {
  it('defines 4 presets and always preserves HLC causal order even under severe NTP skew', () => {
    assert.equal(CLOCK_PRESETS.length, 4);

    for (const preset of CLOCK_PRESETS) {
      const res = simulateClockTrace({
        skewA: preset.skewA,
        skewB: preset.skewB,
        skewC: preset.skewC,
        epsilonMs: preset.epsilonMs,
      });

      assert.equal(res.events.length, 4);
      assert.equal(res.hlcOrderHolds, true, `HLC violated causality on preset ${preset.id}`);
      for (let i = 1; i < res.events.length; i++) {
        assert.ok(
          compareHlc(res.events[i].hlc, res.events[i - 1].hlc) > 0,
          `Expected strictly increasing HLC on ${preset.id}`
        );
      }
      assert.equal(res.trueTimeCommitWaitMs, 2 * preset.epsilonMs);
    }
  });

  it('detects Wall-Clock LWW causal inversion under NTP skew while Spanner TrueTime stays bounded', () => {
    const ntp = simulateClockTrace({
      skewA: 25,
      skewB: -20,
      skewC: 5,
      epsilonMs: 20,
      networkDelayMs: 12,
    });
    assert.ok(ntp.lwwInversionCount >= 1);
    assert.equal(ntp.hlcOrderHolds, true);
    assert.ok(ntp.maxHlcDriftFromWallMs > 0);
    // Actual skew (+25ms) exceeds ε=20ms => TrueTime bound breached
    assert.equal(ntp.externalConsistencyGuaranteed, false);

    const spanner = simulateClockTrace({
      skewA: 2,
      skewB: -2,
      skewC: 1,
      epsilonMs: 3,
      networkDelayMs: 12,
    });
    assert.equal(spanner.lwwInversionCount, 0);
    assert.equal(spanner.trueTimeCommitWaitMs, 6);
    assert.equal(spanner.externalConsistencyGuaranteed, true);
    assert.equal(formatHlc({ l: 120, c: 2 }), '(120ms, c=2)');
  });
});
