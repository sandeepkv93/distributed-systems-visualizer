import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SimulationEngine } from '@/lib/simulation-engine';
import { RaftAlgorithm } from '@/lib/algorithms/raft';
import { PaxosAlgorithm } from '@/lib/algorithms/paxos';
import { ConsistentHashingAlgorithm } from '@/lib/algorithms/consistentHashing';
import { ChandyLamportAlgorithm } from '@/lib/algorithms/chandyLamport';
import { ConsensusVariantsAlgorithm } from '@/lib/algorithms/consensusVariants';
import { CRDTAlgorithm } from '@/lib/algorithms/crdts';
import { DistributedLockAlgorithm } from '@/lib/algorithms/distributedLock';
import { DistributedTransactionsAlgorithm } from '@/lib/algorithms/distributedTransactions';
import { EventualConsistencyAlgorithm } from '@/lib/algorithms/eventualConsistency';
import { FailureDetectorsAlgorithm } from '@/lib/algorithms/failureDetectors';
import { GossipAntiEntropyAlgorithm } from '@/lib/algorithms/gossipAntiEntropy';
import { LamportClocksAlgorithm } from '@/lib/algorithms/lamportClocks';
import { LoadBalancingAlgorithm } from '@/lib/algorithms/loadBalancing';
import { MerkleAntiEntropyAlgorithm } from '@/lib/algorithms/merkleAntiEntropy';
import { NetworkPartitionsAlgorithm } from '@/lib/algorithms/networkPartitions';
import { PBFTAlgorithm } from '@/lib/algorithms/pbft';
import { QuorumReplicationAlgorithm } from '@/lib/algorithms/quorumReplication';
import { ReplicationLogAlgorithm } from '@/lib/algorithms/replicationLog';
import { ShardingRebalancingAlgorithm } from '@/lib/algorithms/shardingRebalancing';
import { TwoPhaseCommitAlgorithm } from '@/lib/algorithms/twoPhaseCommit';
import { VectorClocksAlgorithm } from '@/lib/algorithms/vectorClocks';
import { raftScenarios } from '@/visualizers/raft/scenarios';
import { paxosScenarios } from '@/visualizers/paxos/scenarios';
import { consistentHashingScenarios } from '@/visualizers/consistent-hashing/scenarios';

describe('Raft scenarios end-to-end', () => {
  const runRaftScenario = (scenarioId: string) => {
    const scenario = raftScenarios.find((s) => s.id === scenarioId);
    assert.ok(scenario, `Missing Raft scenario: ${scenarioId}`);
    const raft = new RaftAlgorithm(5);
    const engine = new SimulationEngine(scenario.events);
    engine.setSnapshotAdapter({
      capture: () => raft.serialize(),
      restore: (s) => raft.restore(s as ReturnType<RaftAlgorithm['serialize']>),
    });

    engine.on('start_election', (e) => raft.startElection(e.data.nodeId));
    engine.on('request_vote', () => raft.processRequestVotes());
    engine.on('vote_response', () => raft.processVoteResponses());
    engine.on('leader_elected', () => raft.finalizeElection());
    engine.on('network_partition', (e) => raft.partitionNetwork(e.data.partition));
    engine.on('heal_partition', () => raft.healPartition());
    engine.on('fail_node', (e) => raft.failNode(e.data.nodeId));
    engine.on('recover_node', (e) => raft.recoverNode(e.data.nodeId));
    engine.on('client_request', (e) => raft.addClientRequest(e.data.leaderId, e.data.command));
    engine.on('replicate_log', () => raft.replicatePendingLogs());
    engine.on('catch_up', (e) => raft.catchUpNode(e.data.nodeId));

    while (!engine.isComplete()) {
      engine.stepForward();
    }
    return { raft, engine };
  };

  it('elects a leader in basic-election', () => {
    const { raft } = runRaftScenario('basic-election');
    assert.equal(raft.getNode('node-0')?.state, 'leader');
  });

  it('elects a new leader after leader-failure', () => {
    const { raft } = runRaftScenario('leader-failure');
    assert.equal(raft.getNode('node-0')?.status, 'failed');
    assert.equal(raft.getNode('node-1')?.state, 'leader');
    assert.equal(raft.getNode('node-1')?.term, 2);
  });

  it('elects majority leader and reconciles stale leader in split-brain', () => {
    const { raft, engine } = runRaftScenario('split-brain');
    assert.equal(raft.getPartitions().length, 0);
    assert.equal(raft.getNode('node-2')?.state, 'leader');
    assert.equal(raft.getNode('node-0')?.state, 'follower');

    engine.stepBackward();
    assert.equal(raft.getPartitions().length, 2);
  });

  it('replicates all log entries to every node in log-replication', () => {
    const { raft } = runRaftScenario('log-replication');
    for (const node of raft.getNodes()) {
      assert.equal(node.log.length, 2);
      assert.equal(node.log[0].command, 'SET x=1');
      assert.equal(node.log[1].command, 'SET y=2');
    }
  });

  it('catches up recovered lagging follower in follower-lag and rolls back on stepBackward', () => {
    const { raft, engine } = runRaftScenario('follower-lag');
    assert.equal(raft.getNode('node-3')?.status, 'healthy');
    assert.equal(raft.getNode('node-3')?.log.length, 2);

    engine.stepBackward();
    assert.equal(raft.getNode('node-3')?.log.length, 0);
  });
});

describe('Paxos scenarios end-to-end', () => {
  const runPaxosScenario = (scenarioId: string) => {
    const scenario = paxosScenarios.find((s) => s.id === scenarioId);
    assert.ok(scenario, `Missing Paxos scenario: ${scenarioId}`);
    const paxos = new PaxosAlgorithm(2, 5, 2);
    const engine = new SimulationEngine(scenario.events);
    engine.setSnapshotAdapter({
      capture: () => paxos.serialize(),
      restore: (s) => paxos.restore(s as ReturnType<PaxosAlgorithm['serialize']>),
    });

    engine.on('start_proposal', (e) =>
      paxos.startProposal(e.data.proposerId, e.data.value, Boolean(e.data.newInstance))
    );
    engine.on('handle_prepare', () => {
      paxos
        .getMessages()
        .filter((m) => m.type === 'Prepare' && m.status === 'in-flight')
        .forEach((m) => paxos.handlePrepare(m.id));
    });
    engine.on('handle_promise', (e) => {
      paxos
        .getMessages()
        .filter((m) => m.type === 'Promise' && m.status === 'in-flight')
        .forEach((m) => paxos.handlePromise(m.id, e.data?.value));
    });
    engine.on('handle_accept', () => {
      paxos
        .getMessages()
        .filter((m) => m.type === 'Accept' && m.status === 'in-flight')
        .forEach((m) => paxos.handleAccept(m.id));
    });
    engine.on('consensus_reached', (e) => paxos.finalizeConsensus(e.data?.value));
    engine.on('fail_node', (e) => paxos.failNode(e.data.nodeId));
    engine.on('recover_node', (e) => paxos.recoverNode(e.data.nodeId));

    while (!engine.isComplete()) {
      engine.stepForward();
    }
    return { paxos, engine };
  };

  it('decides single value in basic-consensus', () => {
    assert.equal(runPaxosScenario('basic-consensus').paxos.getDecidedValue(), 'A');
  });

  it('resolves dueling-proposers with non-undefined winning value', () => {
    assert.equal(runPaxosScenario('dueling-proposers').paxos.getDecidedValue(), 'Y');
  });

  it('reaches consensus despite acceptor-failure', () => {
    assert.equal(runPaxosScenario('acceptor-failure').paxos.getDecidedValue(), 'A');
  });

  it('preserves already accepted value in late-proposer', () => {
    assert.equal(runPaxosScenario('late-proposer').paxos.getDecidedValue(), 'First');
  });

  it('decides all 3 commands sequentially in multi-paxos and rolls back cleanly', () => {
    const { paxos, engine } = runPaxosScenario('multi-paxos');
    assert.deepEqual(paxos.getDecidedValues(), ['Command-1', 'Command-2', 'Command-3']);

    engine.stepBackward();
    engine.stepBackward();
    assert.deepEqual(paxos.getDecidedValues(), ['Command-1', 'Command-2']);
  });
});

describe('Consistent Hashing scenarios end-to-end', () => {
  it('handles show_distribution and rolls back server addition cleanly', () => {
    const scenario = consistentHashingScenarios.find((s) => s.id === 'add-server')!;
    const ch = new ConsistentHashingAlgorithm(
      scenario.initialState.serverCount,
      scenario.initialState.virtualNodes
    );
    const engine = new SimulationEngine(scenario.events);
    engine.setSnapshotAdapter({
      capture: () => ch.serialize(),
      restore: (s) => ch.restore(s as ReturnType<ConsistentHashingAlgorithm['serialize']>),
    });

    engine.on('add_keys', (e) => ch.addRandomKeys(e.data.count, e.data.prefix));
    engine.on('add_server', (e) => ch.addServer(e.data.serverId));
    engine.on('remove_server', (e) => ch.removeServer(e.data.serverId));
    engine.on('set_virtual_nodes', (e) => ch.setVirtualNodesPerServer(e.data.count));
    engine.on('show_distribution', (e) => ch.recordDistributionSnapshot(e.description));

    while (!engine.isComplete()) {
      engine.stepForward();
    }

    assert.equal(ch.getPhysicalServers().length, 4);
    assert.equal(ch.getLastDistributionSnapshot()?.label, 'New distribution (minimal keys moved)');

    engine.stepBackward();
    engine.stepBackward();
    assert.equal(ch.getPhysicalServers().length, 3);
    assert.equal(ch.getLastDistributionSnapshot()?.label, 'Initial distribution');
  });
});

describe('All 21 algorithm classes serialize/restore immutability', () => {
  it('round-trips snapshots cleanly for every remaining algorithm class', () => {
    const chandy = new ChandyLamportAlgorithm(5);
    const chandySnap = chandy.serialize();
    chandy.startSnapshot('N0');
    assert.ok(chandy.getMessages().length > 0);
    chandy.restore(chandySnap);
    assert.equal(chandy.getMessages().length, 0);

    const cv = new ConsensusVariantsAlgorithm(5);
    const cvSnap = cv.serialize();
    cv.electLeader('raft-joint', 'N0');
    cv.appendEntry('raft-joint', 'v1');
    cv.restore(cvSnap);
    assert.equal(cv.getNodes('raft-joint')[0].log.length, 0);

    const crdt = new CRDTAlgorithm(3);
    const crdtSnap = crdt.serialize();
    crdt.increment('R0');
    assert.equal(crdt.getReplicas()[0].gCounter['R0'], 1);
    crdt.restore(crdtSnap);
    assert.equal(crdt.getReplicas()[0].gCounter['R0'], 0);

    const lock = new DistributedLockAlgorithm(4, 4000);
    const lockSnap = lock.serialize();
    lock.requestLock('C1');
    assert.ok(lock.getMessages().length > 0);
    lock.restore(lockSnap);
    assert.equal(lock.getMessages().length, 0);

    const dt = new DistributedTransactionsAlgorithm(3);
    const dtSnap = dt.serialize();
    dt.start3PC();
    assert.ok(dt.getMessages().length > 0);
    dt.restore(dtSnap);
    assert.equal(dt.getMessages().length, 0);

    const ec = new EventualConsistencyAlgorithm(5, 3);
    const ecSnap = ec.serialize();
    ec.write('k', 'v', 'N0', 'QUORUM');
    assert.equal(ec.getNodes()[0].data.get('k')?.value, 'v');
    ec.restore(ecSnap);
    assert.equal(ec.getNodes()[0].data.has('k'), false);

    const fd = new FailureDetectorsAlgorithm(5);
    const fdSnap = fd.serialize();
    fd.markFailed('N0');
    assert.equal(fd.getNodes()[0].fdStatus, 'failed');
    fd.restore(fdSnap);
    assert.equal(fd.getNodes()[0].fdStatus, 'alive');

    const gossip = new GossipAntiEntropyAlgorithm(6);
    const gossipSnap = gossip.serialize();
    gossip.setValue('N0', 'k', 'v');
    assert.equal(gossip.getNodes()[0].data.get('k')?.value, 'v');
    gossip.restore(gossipSnap);
    assert.equal(gossip.getNodes()[0].data.has('k'), false);

    const lamport = new LamportClocksAlgorithm(3);
    const lamportSnap = lamport.serialize();
    lamport.localEvent('P0');
    assert.equal(lamport.getNodes()[0].clock, 1);
    lamport.restore(lamportSnap);
    assert.equal(lamport.getNodes()[0].clock, 0);

    const lb = new LoadBalancingAlgorithm(4);
    const lbSnap = lb.serialize();
    lb.enqueueRequest(2);
    assert.equal(lb.getRequests().length, 1);
    lb.restore(lbSnap);
    assert.equal(lb.getRequests().length, 0);

    const merkle = new MerkleAntiEntropyAlgorithm(2);
    const merkleSnap = merkle.serialize();
    merkle.compareRoots();
    assert.ok(merkle.getMessages().length > 0);
    merkle.restore(merkleSnap);
    assert.equal(merkle.getMessages().length, 0);

    const np = new NetworkPartitionsAlgorithm(5);
    const npSnap = np.serialize();
    const initialPart = np.getNodes()[2].partitionId;
    np.split(['N0', 'N1'], ['N2', 'N3', 'N4']);
    assert.equal(np.getNodes()[2].partitionId, 'B');
    np.restore(npSnap);
    assert.equal(np.getNodes()[2].partitionId, initialPart);

    const pbft = new PBFTAlgorithm(4);
    const pbftSnap = pbft.serialize();
    pbft.clientRequest('tx1');
    assert.ok(pbft.getMessages().length > 0);
    pbft.restore(pbftSnap);
    assert.equal(pbft.getMessages().length, 0);

    const quorum = new QuorumReplicationAlgorithm(5, 3);
    const quorumSnap = quorum.serialize();
    quorum.write('k', 'v', 'N0', 2);
    assert.ok(quorum.getMessages().length > 0);
    quorum.restore(quorumSnap);
    assert.equal(quorum.getMessages().length, 0);

    const rep = new ReplicationLogAlgorithm(3);
    const repSnap = rep.serialize();
    rep.produce('msg1');
    assert.equal(rep.getPartition().nextOffset, 1);
    rep.restore(repSnap);
    assert.equal(rep.getPartition().nextOffset, 0);

    const sharding = new ShardingRebalancingAlgorithm(3, 'range');
    const shardingSnap = sharding.serialize();
    sharding.setStrategy('hash');
    sharding.addNode();
    assert.equal(sharding.getStrategy(), 'hash');
    assert.equal(sharding.getNodes().length, 4);
    sharding.restore(shardingSnap);
    assert.equal(sharding.getStrategy(), 'range');
    assert.equal(sharding.getNodes().length, 3);

    const tpc = new TwoPhaseCommitAlgorithm(3);
    const tpcSnap = tpc.serialize();
    tpc.startTransaction();
    assert.equal(tpc.getCoordinator().state, 'preparing');
    tpc.restore(tpcSnap);
    assert.equal(tpc.getCoordinator().state, 'init');

    const vc = new VectorClocksAlgorithm(3);
    const vcSnap = vc.serialize();
    vc.createLocalEvent('P0', 'e1');
    assert.equal(vc.getAllEvents().length, 1);
    vc.restore(vcSnap);
    assert.equal(vc.getAllEvents().length, 0);
  });
});
