import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SimulationEngine } from '@/lib/simulation-engine';
import { cloneSnapshot } from '@/lib/snapshot';
import { RaftAlgorithm } from '@/lib/algorithms/raft';
import { raftScenarios } from '@/visualizers/raft/scenarios';

describe('cloneSnapshot', () => {
  it('deep-clones Maps, Sets, Dates, arrays, and nested objects without shared references', () => {
    const original = {
      count: 1,
      date: new Date(1700000000000),
      map: new Map([['a', { nested: [1, 2] }]]),
      set: new Set(['x', 'y']),
    };

    const cloned = cloneSnapshot(original);
    assert.notEqual(cloned, original);
    assert.notEqual(cloned.map, original.map);
    assert.notEqual(cloned.set, original.set);
    assert.notEqual(cloned.date, original.date);

    cloned.map.get('a')!.nested.push(3);
    cloned.set.add('z');
    cloned.date.setTime(0);

    assert.deepEqual(original.map.get('a')!.nested, [1, 2]);
    assert.equal(original.set.has('z'), false);
    assert.equal(original.date.getTime(), 1700000000000);
  });
});

describe('SimulationEngine', () => {
  it('notifies subscribers during autoplay and flips isPlaying to false on completion', async () => {
    const raft = new RaftAlgorithm(5);
    const engine = new SimulationEngine(raftScenarios[0].events);
    engine.setSnapshotAdapter({
      capture: () => raft.serialize(),
      restore: (s) => raft.restore(s as ReturnType<RaftAlgorithm['serialize']>),
    });

    engine.on('start_election', (e) => raft.startElection(e.data.nodeId));
    engine.on('request_vote', () => raft.processRequestVotes());
    engine.on('vote_response', () => raft.processVoteResponses());
    engine.on('leader_elected', () => raft.finalizeElection());

    const snapshots: Array<{ idx: number; isPlaying: boolean }> = [];
    const unsubscribe = engine.subscribe((state) => {
      snapshots.push({ idx: state.currentEventIndex, isPlaying: state.isPlaying });
    });

    engine.setSpeed(5); // 200ms per tick
    engine.play();

    await new Promise((resolve) => setTimeout(resolve, 1000));
    unsubscribe();

    assert.equal(engine.isComplete(), true);
    assert.equal(engine.getState().isPlaying, false);
    assert.equal(engine.getProgress(), 100);
    assert.ok(snapshots.some((s) => s.isPlaying && s.idx === 1));
    assert.equal(snapshots[snapshots.length - 1].isPlaying, false);
    assert.equal(raft.getNode('node-0')?.state, 'leader');
  });

  it('rolls back algorithm state cleanly on stepBackward and jumpToStep without double-mutating', () => {
    const raft = new RaftAlgorithm(5);
    const engine = new SimulationEngine(raftScenarios[0].events);
    engine.setSnapshotAdapter({
      capture: () => raft.serialize(),
      restore: (s) => raft.restore(s as ReturnType<RaftAlgorithm['serialize']>),
    });

    engine.on('start_election', (e) => raft.startElection(e.data.nodeId));
    engine.on('request_vote', () => raft.processRequestVotes());
    engine.on('vote_response', () => raft.processVoteResponses());
    engine.on('leader_elected', () => raft.finalizeElection());

    while (!engine.isComplete()) {
      engine.stepForward();
    }
    assert.equal(raft.getNode('node-0')?.state, 'leader');

    // Roll back before vote_response
    engine.stepBackward(); // step 3
    engine.stepBackward(); // step 2
    assert.equal(engine.getState().currentEventIndex, 2);
    assert.equal(raft.getNode('node-0')?.state, 'candidate');

    // Jump directly to initial state (step 0)
    engine.jumpToStep(0);
    assert.equal(engine.getState().currentEventIndex, 0);
    assert.equal(raft.getNode('node-0')?.state, 'follower');
    assert.equal(raft.getNode('node-0')?.term, 0);
    assert.equal(raft.getMessages().length, 0);

    // Re-apply step 1 cleanly (term should be 1, not 2)
    engine.stepForward();
    assert.equal(raft.getNode('node-0')?.term, 1);
    assert.equal(raft.getNode('node-0')?.state, 'candidate');

    // Jump forward directly to step 4 (complete)
    engine.jumpToStep(4);
    assert.equal(engine.getState().currentEventIndex, 4);
    assert.equal(raft.getNode('node-0')?.state, 'leader');

    // Jump backward to step 1
    engine.jumpToStep(1);
    assert.equal(engine.getState().currentEventIndex, 1);
    assert.equal(raft.getNode('node-0')?.state, 'candidate');
  });

  it('stops playback timers when setEvents or reset is called mid-playback', async () => {
    let calls = 0;
    const engine = new SimulationEngine(raftScenarios[0].events);
    engine.on('start_election', () => {
      calls++;
    });
    engine.on('request_vote', () => {
      calls++;
    });

    engine.setSpeed(5);
    engine.play();
    assert.equal(calls, 1);
    engine.reset();
    assert.equal(engine.getState().isPlaying, false);
    assert.equal(engine.getState().currentEventIndex, 0);

    await new Promise((resolve) => setTimeout(resolve, 350));
    assert.equal(calls, 1, 'No timer callbacks should fire after reset');
  });
});
