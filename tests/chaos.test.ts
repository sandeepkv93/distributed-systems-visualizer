import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CHAOS_CONFIG,
  isChaosActive,
  shouldDropPacket,
  computeDeliveryDelay,
  applyChaosToMessages,
} from '../lib/chaos';

describe('Live Chaos & Network Conditions engine', () => {
  it('keeps default configuration deterministic with zero drops and 1x delay', () => {
    assert.equal(DEFAULT_CHAOS_CONFIG.dropRate, 0);
    assert.equal(DEFAULT_CHAOS_CONFIG.delayMultiplier, 1);
    assert.equal(isChaosActive(DEFAULT_CHAOS_CONFIG), false);

    // Even when rng returns 0, dropRate 0 must never drop
    assert.equal(shouldDropPacket(0, () => 0), false);
    assert.equal(computeDeliveryDelay(500, 1), 500);
  });

  it('evaluates packet loss thresholds accurately and scales delivery delays', () => {
    assert.equal(isChaosActive({ dropRate: 25, delayMultiplier: 1 }), true);
    assert.equal(isChaosActive({ dropRate: 0, delayMultiplier: 2 }), true);

    assert.equal(shouldDropPacket(25, () => 0.1), true);
    assert.equal(shouldDropPacket(25, () => 0.25), false);
    assert.equal(shouldDropPacket(75, () => 0.74), true);
    assert.equal(shouldDropPacket(100, () => 0.9999), true);

    assert.equal(computeDeliveryDelay(500, 2), 1000);
    assert.equal(computeDeliveryDelay(350, 3), 1050);
    assert.equal(computeDeliveryDelay(400, 0.5), 400);
  });

  it('partitions in-flight frames and marks dropped messages with dropped status', () => {
    const frames = [
      { id: 'm1', status: 'in-flight' },
      { id: 'm2', status: 'in-flight' },
      { id: 'm3', status: 'in-flight' },
      { id: 'm4', status: 'in-flight' },
    ];
    const rolls = [0.1, 0.8, 0.2, 0.9];
    let idx = 0;
    const rng = () => rolls[idx++];

    const { survivors, dropped } = applyChaosToMessages(frames, 50, rng);
    assert.deepEqual(
      dropped.map((m) => m.id),
      ['m1', 'm3']
    );
    assert.deepEqual(
      survivors.map((m) => m.id),
      ['m2', 'm4']
    );
    assert.equal(frames[0].status, 'dropped');
    assert.equal(frames[1].status, 'in-flight');
    assert.equal(frames[2].status, 'dropped');
    assert.equal(frames[3].status, 'in-flight');
  });
});
