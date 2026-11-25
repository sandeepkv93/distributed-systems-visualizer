import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateRaftInvariants,
  evaluatePaxosInvariants,
  evaluatePBFTInvariants,
  evaluateTwoPhaseCommitInvariants,
  evaluateQuorumInvariants,
  evaluateVectorClockInvariants,
  evaluateCRDTInvariants,
  evaluateChandyLamportInvariants,
  evaluateReplicationLogInvariants,
  evaluateDistributedLockInvariants,
  evaluateConsistentHashingInvariants,
  evaluateGossipInvariants,
  evaluateLamportClockInvariants,
  evaluateCAPInvariants,
  evaluateConsensusVariantInvariants,
  evaluateEventualConsistencyInvariants,
  evaluateMerkleInvariants,
  evaluateNetworkPartitionInvariants,
  evaluateFailureDetectorInvariants,
  evaluateShardingInvariants,
  evaluateLoadBalancingInvariants,
  evaluateDistributedTransactionsInvariants,
  summarizeInvariants,
} from '../lib/invariants';
import { RaftAlgorithm } from '../lib/algorithms/raft';
import { PaxosAlgorithm } from '../lib/algorithms/paxos';
import { PBFTAlgorithm } from '../lib/algorithms/pbft';
import { TwoPhaseCommitAlgorithm } from '../lib/algorithms/twoPhaseCommit';
import { QuorumReplicationAlgorithm } from '../lib/algorithms/quorumReplication';
import { VectorClocksAlgorithm } from '../lib/algorithms/vectorClocks';
import { CRDTAlgorithm } from '../lib/algorithms/crdts';
import { ChandyLamportAlgorithm } from '../lib/algorithms/chandyLamport';
import { ReplicationLogAlgorithm } from '../lib/algorithms/replicationLog';
import { DistributedLockAlgorithm } from '../lib/algorithms/distributedLock';
import { ConsistentHashingAlgorithm } from '../lib/algorithms/consistentHashing';
import { GossipAntiEntropyAlgorithm } from '../lib/algorithms/gossipAntiEntropy';
import { LamportClocksAlgorithm } from '../lib/algorithms/lamportClocks';
import { ConsensusVariantsAlgorithm } from '../lib/algorithms/consensusVariants';
import { EventualConsistencyAlgorithm } from '../lib/algorithms/eventualConsistency';
import { MerkleAntiEntropyAlgorithm } from '../lib/algorithms/merkleAntiEntropy';
import { NetworkPartitionsAlgorithm } from '../lib/algorithms/networkPartitions';
import { FailureDetectorsAlgorithm } from '../lib/algorithms/failureDetectors';
import { ShardingRebalancingAlgorithm } from '../lib/algorithms/shardingRebalancing';
import { LoadBalancingAlgorithm } from '../lib/algorithms/loadBalancing';
import { DistributedTransactionsAlgorithm } from '../lib/algorithms/distributedTransactions';

describe('Live Formal Invariant Monitor evaluators', () => {
  it('evaluates Raft Election Safety, Quorum Liveness, and detects split-leader violations', () => {
    const raft = new RaftAlgorithm(5);
    raft.startElection('node-0');
    raft.processRequestVotes();
    raft.processVoteResponses();
    raft.finalizeElection();

    const healthyChecks = evaluateRaftInvariants(raft.getNodes(), raft.getPartitions());
    assert.equal(summarizeInvariants(healthyChecks).overall, 'holding');

    // Crash 3 nodes to lose majority quorum
    raft.failNode('node-2');
    raft.failNode('node-3');
    raft.failNode('node-4');
    const degradedChecks = evaluateRaftInvariants(raft.getNodes(), raft.getPartitions());
    assert.equal(
      degradedChecks.find((c) => c.id === 'raft-quorum-liveness')?.status,
      'degraded'
    );

    // Artificially inject two leaders in the same term to verify Election Safety catches it
    const tampered = raft.getNodes().map((n) =>
      n.id === 'node-1' ? { ...n, status: 'healthy' as const, state: 'leader' as const, term: 1 } : n
    );
    const violatedChecks = evaluateRaftInvariants(tampered, []);
    assert.equal(
      violatedChecks.find((c) => c.id === 'raft-election-safety')?.status,
      'violated'
    );
    assert.equal(summarizeInvariants(violatedChecks).overall, 'violated');
  });

  it('evaluates Paxos acceptor quorum and PBFT 3f+1 bounds', () => {
    const paxos = new PaxosAlgorithm(2, 5, 2);
    assert.equal(summarizeInvariants(evaluatePaxosInvariants(paxos.getAllNodes(), [])).overall, 'holding');

    paxos.failNode('acceptor-0');
    paxos.failNode('acceptor-1');
    paxos.failNode('acceptor-2');
    const paxosDegraded = evaluatePaxosInvariants(paxos.getAllNodes(), []);
    assert.equal(
      paxosDegraded.find((c) => c.id === 'paxos-acceptor-quorum')?.status,
      'degraded'
    );

    const pbft = new PBFTAlgorithm(4);
    assert.equal(summarizeInvariants(evaluatePBFTInvariants(pbft.getNodes())).overall, 'holding');

    pbft.failNode('N0');
    pbft.failNode('N1');
    const pbftDegraded = evaluatePBFTInvariants(pbft.getNodes());
    assert.equal(
      pbftDegraded.find((c) => c.id === 'pbft-quorum-bound')?.status,
      'degraded'
    );
  });

  it('detects 2PC blocking window and atomic decision violations', () => {
    const tpc = new TwoPhaseCommitAlgorithm(3);
    tpc.startTransaction();
    tpc.participantVote('participant-0', 'yes');

    // Simulate coordinator crash while participant-0 is PREPARED
    const crashedCoord = { ...tpc.getCoordinator(), status: 'failed' as const };
    const blockedChecks = evaluateTwoPhaseCommitInvariants(crashedCoord, tpc.getParticipants());
    assert.equal(
      blockedChecks.find((c) => c.id === '2pc-blocking-window')?.status,
      'degraded'
    );

    // Simulate mixed COMMIT + ABORT violation
    const mixed = tpc.getParticipants().map((p, idx) => ({
      ...p,
      state: idx === 0 ? ('committed' as const) : ('aborted' as const),
    }));
    const violated = evaluateTwoPhaseCommitInvariants(tpc.getCoordinator(), mixed);
    assert.equal(violated.find((c) => c.id === '2pc-atomicity')?.status, 'violated');
  });

  it('evaluates Dynamo quorum overlap W+R>N and Vector Clock integrity', () => {
    const quorum = new QuorumReplicationAlgorithm(5, 3);
    const strict = evaluateQuorumInvariants(quorum.getNodes(), 3, 3);
    assert.equal(summarizeInvariants(strict).overall, 'holding');

    const stale = evaluateQuorumInvariants(quorum.getNodes(), 2, 2);
    assert.equal(stale.find((c) => c.id === 'quorum-overlap')?.status, 'violated');

    const vc = new VectorClocksAlgorithm(3);
    vc.createLocalEvent('P0', 'evt-1');
    vc.createLocalEvent('P2', 'evt-2');
    const vcChecks = evaluateVectorClockInvariants(vc.getProcesses(), vc.getStats().concurrentPairs);
    assert.equal(summarizeInvariants(vcChecks).overall, 'holding');
  });

  it('evaluates CRDT convergence, Chandy-Lamport cut, Replication Log HW, Lock mutual exclusion, Hashing skew, and Gossip', () => {
    const crdt = new CRDTAlgorithm(3);
    assert.equal(summarizeInvariants(evaluateCRDTInvariants(crdt.getReplicas(), crdt.getStats())).overall, 'holding');
    crdt.increment('R0');
    assert.equal(
      evaluateCRDTInvariants(crdt.getReplicas(), crdt.getStats()).find((c) => c.id === 'crdt-sec-convergence')?.status,
      'degraded'
    );

    const cl = new ChandyLamportAlgorithm(4);
    assert.equal(summarizeInvariants(evaluateChandyLamportInvariants(cl.getNodes())).overall, 'holding');
    cl.startSnapshot('N0');
    assert.equal(
      evaluateChandyLamportInvariants(cl.getNodes()).find((c) => c.id === 'cl-global-cut')?.status,
      'degraded'
    );

    const repl = new ReplicationLogAlgorithm(3);
    assert.equal(summarizeInvariants(evaluateReplicationLogInvariants(repl.getPartition())).overall, 'holding');

    const lock = new DistributedLockAlgorithm(4, 4000);
    assert.equal(summarizeInvariants(evaluateDistributedLockInvariants(lock.getNodes())).overall, 'holding');
    const dualHolders = lock.getNodes().map((n) => (n.role === 'client' ? { ...n, holdingLock: true } : n));
    assert.equal(
      evaluateDistributedLockInvariants(dualHolders).find((c) => c.id === 'lock-mutual-exclusion')?.status,
      'violated'
    );

    const ch = new ConsistentHashingAlgorithm(3, 3);
    assert.equal(summarizeInvariants(evaluateConsistentHashingInvariants(ch.getStats())).overall, 'holding');
    const emptyRing = evaluateConsistentHashingInvariants({
      physicalServers: 0,
      totalNodes: 0,
      totalKeys: 0,
      loadStats: { imbalance: 0 },
    });
    assert.equal(emptyRing.find((c) => c.id === 'ch-ring-coverage')?.status, 'violated');

    const gossip = new GossipAntiEntropyAlgorithm(5);
    assert.equal(summarizeInvariants(evaluateGossipInvariants(gossip.getNodes(), gossip.getStats())).overall, 'holding');
    gossip.setValue('N0', 'rumor:1', 42);
    assert.equal(
      evaluateGossipInvariants(gossip.getNodes(), gossip.getStats()).find((c) => c.id === 'gossip-convergence')?.status,
      'degraded'
    );
  });

  it('evaluates remaining 10 plates to achieve 22/22 formal invariant coverage', () => {
    const lamport = new LamportClocksAlgorithm(3);
    assert.equal(summarizeInvariants(evaluateLamportClockInvariants(lamport.getNodes())).overall, 'holding');

    assert.equal(summarizeInvariants(evaluateCAPInvariants('CP')).overall, 'holding');
    assert.equal(
      evaluateCAPInvariants('CA').find((c) => c.id === 'cap-partition-resilience')?.status,
      'degraded'
    );

    const cvar = new ConsensusVariantsAlgorithm(5);
    assert.equal(
      summarizeInvariants(evaluateConsensusVariantInvariants(cvar.getNodes('epaxos'), 'epaxos')).overall,
      'holding'
    );

    const ec = new EventualConsistencyAlgorithm(5, 3);
    assert.equal(summarizeInvariants(evaluateEventualConsistencyInvariants(ec.getStats())).overall, 'holding');
    assert.equal(
      evaluateEventualConsistencyInvariants({ totalNodes: 5, healthyNodes: 0, inconsistentKeys: 0 }).find(
        (c) => c.id === 'ec-availability'
      )?.status,
      'violated'
    );

    const merkle = new MerkleAntiEntropyAlgorithm(2);
    assert.equal(
      evaluateMerkleInvariants(merkle.getReplicas(), merkle.getStats()).length,
      2
    );

    const np = new NetworkPartitionsAlgorithm(5);
    assert.equal(summarizeInvariants(evaluateNetworkPartitionInvariants(np.getNodes(), np.getStats())).overall, 'holding');
    assert.equal(
      evaluateNetworkPartitionInvariants(np.getNodes(), { leaders: 2, partitions: 2 }).find(
        (c) => c.id === 'np-split-brain'
      )?.status,
      'violated'
    );

    const fd = new FailureDetectorsAlgorithm(5);
    assert.equal(summarizeInvariants(evaluateFailureDetectorInvariants(fd.getStats())).overall, 'holding');
    assert.equal(
      evaluateFailureDetectorInvariants({ alive: 2, suspect: 1, failed: 2 }).find(
        (c) => c.id === 'fd-quorum-alive'
      )?.status,
      'degraded'
    );

    const shardRange = new ShardingRebalancingAlgorithm(3, 'range');
    assert.equal(
      evaluateShardingInvariants(shardRange.getNodes(), shardRange.getStats()).find(
        (c) => c.id === 'shard-balance'
      )?.status,
      'degraded'
    );
    const shardHash = new ShardingRebalancingAlgorithm(3, 'hash');
    assert.equal(
      summarizeInvariants(evaluateShardingInvariants(shardHash.getNodes(), shardHash.getStats())).overall,
      'holding'
    );

    const lb = new LoadBalancingAlgorithm(4);
    assert.equal(summarizeInvariants(evaluateLoadBalancingInvariants(lb.getWorkers(), lb.getStats())).overall, 'holding');
    assert.equal(
      evaluateLoadBalancingInvariants(
        lb.getWorkers().map((w) => ({ ...w, loadStatus: 'failed' })),
        lb.getStats()
      ).find((c) => c.id === 'lb-worker-pool')?.status,
      'violated'
    );

    const dtx = new DistributedTransactionsAlgorithm(3);
    assert.equal(
      summarizeInvariants(evaluateDistributedTransactionsInvariants(dtx.getParticipants(), dtx.getSagaSteps())).overall,
      'holding'
    );
    const splitParticipants = dtx.getParticipants().map((p, i) => ({
      ...p,
      phase: i === 0 ? ('commit' as const) : ('abort' as const),
    }));
    assert.equal(
      evaluateDistributedTransactionsInvariants(splitParticipants, dtx.getSagaSteps()).find(
        (c) => c.id === 'dtx-3pc-atomicity'
      )?.status,
      'violated'
    );
  });
});
