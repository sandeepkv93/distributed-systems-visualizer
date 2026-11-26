import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BASE_STREAM_EVENTS,
  CHECKPOINT_MODES,
  evaluateStreamWindows,
} from '../lib/streaming-lab';

describe('Stream Processing: Event-Time Watermarks & Checkpoint Barriers Lab', () => {
  it('models completeness vs emission-latency trade-off cleanly as watermark lag and allowed lateness vary', () => {
    assert.equal(BASE_STREAM_EVENTS.length, 12);
    assert.equal(CHECKPOINT_MODES.length, 2);

    // Zero watermark lag and zero allowed lateness drops late out-of-order stragglers (E5, E10)
    const aggressive = evaluateStreamWindows({
      windowMode: 'tumbling',
      windowSizeSec: 10,
      watermarkLagSec: 0,
      allowedLatenessSec: 0,
    });
    assert.ok(aggressive.droppedCount >= 2, 'Aggressive 0s watermark should drop late stragglers');
    assert.ok(aggressive.completenessPct < 100);

    // Increasing allowed lateness rescues moderate stragglers via late-firing updates
    const withLateness = evaluateStreamWindows({
      windowMode: 'tumbling',
      windowSizeSec: 10,
      watermarkLagSec: 2,
      allowedLatenessSec: 6,
    });
    assert.ok(withLateness.lateUpdatedCount >= 1);
    assert.ok(withLateness.completenessPct > aggressive.completenessPct);

    // Generous watermark lag + allowed lateness achieves 100% completeness at higher emission latency
    const patient = evaluateStreamWindows({
      windowMode: 'tumbling',
      windowSizeSec: 10,
      watermarkLagSec: 12,
      allowedLatenessSec: 10,
    });
    assert.equal(patient.droppedCount, 0);
    assert.equal(patient.completenessPct, 100);
    assert.ok(patient.avgEmissionLatencySec > aggressive.avgEmissionLatencySec);
  });

  it('produces valid monotonic watermark curves and non-empty window aggregates across all 3 window modes', () => {
    for (const mode of ['tumbling', 'sliding', 'session'] as const) {
      const res = evaluateStreamWindows({
        windowMode: mode,
        windowSizeSec: 10,
        watermarkLagSec: 4,
        allowedLatenessSec: 4,
      });
      assert.ok(res.windows.length >= 2);
      assert.equal(res.watermarkCurve.length, BASE_STREAM_EVENTS.length);
      for (let i = 1; i < res.watermarkCurve.length; i++) {
        assert.ok(
          res.watermarkCurve[i].watermarkSec >= res.watermarkCurve[i - 1].watermarkSec,
          'Watermarks must advance monotonically'
        );
      }
    }
  });
});
