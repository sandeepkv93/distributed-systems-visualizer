import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeSpaceTimeLayout, SpaceTimeActor, SpaceTimeFrame } from '@/lib/spacetime';

const ACTORS: SpaceTimeActor[] = [
  { id: 'N0', label: 'N0', color: '#D9441E' },
  { id: 'N1', label: 'N1', color: '#34D399' },
  { id: 'N2', label: 'N2', color: '#34D399' },
];

describe('Space-Time Wire Trace layout engine', () => {
  it('distributes actor lifelines evenly and slants delivered arrows downward', () => {
    const frames: SpaceTimeFrame[] = [
      { id: 'm1', from: 'N0', to: 'N1', label: 'RequestVote', color: '#FBBF24', status: 'delivered' },
      { id: 'm2', from: 'N1', to: 'N0', label: 'VoteGranted', color: '#34D399', status: 'in-flight' },
    ];

    const layout = computeSpaceTimeLayout(ACTORS, frames);
    assert.equal(layout.lifelines.length, 3);
    assert.ok(layout.lifelines[0].x < layout.lifelines[1].x);
    assert.ok(layout.lifelines[1].x < layout.lifelines[2].x);

    assert.equal(layout.arrows.length, 2);
    assert.equal(layout.arrows[0].seq, 1);
    assert.ok(layout.arrows[0].y2 > layout.arrows[0].y1);
    assert.equal(layout.arrows[0].x1, layout.lifelines[0].x);
    assert.equal(layout.arrows[0].x2, layout.lifelines[1].x);
    assert.equal(layout.arrows[0].dropped, false);
  });

  it('truncates dropped/lost frames mid-flight and enforces sliding maxFrames window', () => {
    const frames: SpaceTimeFrame[] = Array.from({ length: 10 }, (_, idx) => ({
      id: `m-${idx}`,
      from: 'N0',
      to: 'N2',
      label: `AE #${idx}`,
      color: '#60A5FA',
      status: idx === 9 ? 'dropped' : 'delivered',
    }));

    const layout = computeSpaceTimeLayout(ACTORS, frames, { maxFrames: 4 });
    assert.equal(layout.totalFrames, 10);
    assert.equal(layout.truncatedCount, 6);
    assert.equal(layout.arrows.length, 4);
    assert.equal(layout.arrows[0].seq, 7);

    const last = layout.arrows[3];
    assert.equal(last.dropped, true);
    assert.ok(last.x2 < layout.lifelines[2].x && last.x2 > layout.lifelines[0].x);
  });

  it('skips frames referencing unknown actors without throwing', () => {
    const frames: SpaceTimeFrame[] = [
      { id: 'bad', from: 'client', to: 'N0', label: 'ClientReq', color: '#60A5FA', status: 'delivered' },
      { id: 'ok', from: 'N0', to: 'N2', label: 'Append', color: '#60A5FA', status: 'delivered' },
    ];

    const layout = computeSpaceTimeLayout(ACTORS, frames);
    assert.equal(layout.arrows.length, 1);
    assert.equal(layout.arrows[0].frame.id, 'ok');
  });
});
