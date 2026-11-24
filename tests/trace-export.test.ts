import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  summarizeWireFrames,
  formatTraceMarkdown,
  formatTraceJson,
} from '../lib/trace-export';

describe('Wire Transcript Recorder & Trace Exporter', () => {
  it('summarizes delivered, in-flight, and dropped/lost frames accurately', () => {
    const stats = summarizeWireFrames([
      { id: '1', from: 'N0', to: 'N1', type: 'RequestVote', status: 'success' },
      { id: '2', from: 'N0', to: 'N2', type: 'RequestVote', status: 'in-flight' },
      { id: '3', from: 'N0', to: 'N3', type: 'RequestVote', status: 'dropped' },
      { id: '4', from: 'N0', to: 'N4', type: 'RequestVote', status: 'lost' },
    ]);

    assert.deepEqual(stats, {
      total: 4,
      delivered: 1,
      inFlight: 1,
      dropped: 2,
    });
  });

  it('formats Markdown wire transcripts with formal invariants and escapes pipes cleanly', () => {
    const md = formatTraceMarkdown({
      protocol: 'Raft Consensus',
      scenario: 'leader-failure',
      exportedAt: '2026-11-24T12:00:00Z',
      invariants: [
        {
          id: 'raft-election',
          name: 'Election Safety',
          formula: '|leaders(term)| <= 1',
          status: 'holding',
          detail: 'Unique leader verified',
        },
      ],
      frames: [
        {
          id: 'm1',
          from: 'node-0',
          to: 'node-1',
          type: 'RequestVote',
          status: 'dropped',
          detail: 'T1 | chaos drop',
        },
      ],
    });

    assert.ok(md.includes('# Raft Consensus — Wire Trace Transcript'));
    assert.ok(md.includes('`leader-failure`'));
    assert.ok(md.includes('1 total (0 delivered, 0 in-flight, 1 dropped)'));
    assert.ok(md.includes('\\|leaders(term)\\| <= 1'));
    assert.ok(md.includes('T1 \\| chaos drop'));
  });

  it('produces valid parseable JSON trace exports and handles empty frames gracefully', () => {
    const emptyMd = formatTraceMarkdown({
      protocol: 'PBFT',
      scenario: '',
      invariants: [],
      frames: [],
    });
    assert.ok(emptyMd.includes('_No wire frames captured yet._'));

    const json = formatTraceJson({
      protocol: 'PBFT',
      scenario: 'view-change',
      exportedAt: '2026-11-24T12:00:00Z',
      invariants: [],
      frames: [{ id: 'p1', from: 'N0', to: 'N1', type: 'PrePrepare', status: 'success' }],
    });
    const parsed = JSON.parse(json);
    assert.equal(parsed.protocol, 'PBFT');
    assert.equal(parsed.scenario, 'view-change');
    assert.equal(parsed.summary.frames.delivered, 1);
    assert.equal(parsed.frames.length, 1);
  });
});
