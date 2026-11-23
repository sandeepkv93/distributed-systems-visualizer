'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Play, Pause, SkipForward, RotateCcw, ArrowUpRight, Scale } from 'lucide-react';
import { RaftAlgorithm } from '@/lib/algorithms/raft';
import { PaxosAlgorithm } from '@/lib/algorithms/paxos';
import { TwoPhaseCommitAlgorithm } from '@/lib/algorithms/twoPhaseCommit';
import { DistributedTransactionsAlgorithm } from '@/lib/algorithms/distributedTransactions';
import { LamportClocksAlgorithm } from '@/lib/algorithms/lamportClocks';
import { VectorClocksAlgorithm } from '@/lib/algorithms/vectorClocks';
import { ScopeDefs, ScopeEdge, ScopeNode, SCOPE_COLORS } from '@/components/ScopeSvgKit';

type DuelId = 'raft-vs-paxos' | '2pc-vs-saga' | 'lamport-vs-vector';

interface DuelSpec {
  id: DuelId;
  number: string;
  title: string;
  subtitle: string;
  leftName: string;
  leftPath: string;
  leftPaper: string;
  rightName: string;
  rightPath: string;
  rightPaper: string;
  steps: Array<{
    title: string;
    leftNote: string;
    rightNote: string;
    insight: string;
  }>;
  comparison: Array<{
    axis: string;
    left: string;
    right: string;
  }>;
}

const DUELS: readonly DuelSpec[] = [
  {
    id: 'raft-vs-paxos',
    number: '01',
    title: 'Raft vs. Paxos',
    subtitle: 'Strong-leader log replication vs. symmetric proposer/acceptor consensus rounds',
    leftName: 'Raft Consensus',
    leftPath: '/raft',
    leftPaper: 'Ongaro & Ousterhout, 2014',
    rightName: 'Paxos Consensus',
    rightPath: '/paxos',
    rightPaper: 'Lamport, 1998',
    steps: [
      {
        title: 'Initiate Agreement',
        leftNote: 'N0 increments term to 1 and broadcasts RequestVote to all peers.',
        rightNote: 'Proposer P0 broadcasts Phase 1 Prepare(#1) to all 5 acceptors.',
        insight: 'Both begin with a majority-seeking round, but Raft elects a durable leader while Paxos seeks permission for a single proposal number.',
      },
      {
        title: 'Quorum Responses',
        leftNote: 'Followers grant votes once per term; N0 collects majority.',
        rightNote: 'Acceptors promise not to accept proposals < #1 and reply Promise(#1).',
        insight: 'Both require ⌊N/2⌋ + 1 = 3 replies so any two quorums intersect at ≥ 1 node.',
      },
      {
        title: 'Establish Authority / Propose',
        leftNote: 'N0 becomes Term 1 Leader — all future writes flow directly through N0.',
        rightNote: 'P0 sends Phase 2 Accept(#1, "SET x=42") to the acceptor quorum.',
        insight: 'Once elected, Raft skips Phase 1 for subsequent entries; basic Paxos runs Prepare+Accept per value.',
      },
      {
        title: 'Commit Value',
        leftNote: 'Leader N0 appends "SET x=42" and replicates via AppendEntries.',
        rightNote: 'Acceptors accept "SET x=42" and notify Learners — consensus reached.',
        insight: 'Both commit durably once a majority persists the entry.',
      },
      {
        title: 'Fault Injection: Crash Primary',
        leftNote: 'Leader N0 crashes! Cluster stalls until an election timeout triggers Term 2.',
        rightNote: 'P0 and Acceptor A0 crash — 4/5 acceptors remain healthy for P1.',
        insight: 'Raft must elect a new leader before serving writes; Paxos allows any backup proposer to step in immediately.',
      },
      {
        title: 'Recovery & Next Write',
        leftNote: 'N1 wins Term 2 election and replicates "SET y=99" across remaining 4 nodes.',
        rightNote: 'Proposer P1 runs Prepare/Accept for "SET y=99" and commits on 4/5 acceptors.',
        insight: 'Both survive minority failures (f < N/2) without losing previously committed state.',
      },
    ],
    comparison: [
      { axis: 'Leadership', left: 'Strong single leader per term', right: 'Leaderless in basic Paxos (any proposer)' },
      { axis: 'Steady-State RTT', left: '1 RTT (AppendEntries)', right: '2 RTTs (Prepare + Accept)' },
      { axis: 'Log Continuity', left: 'Strictly sequential, no holes', right: 'Out-of-order slots allowed' },
      { axis: 'Fault Tolerance', left: 'Tolerates f < N/2 crashes', right: 'Tolerates f < N/2 crashes' },
    ],
  },
  {
    id: '2pc-vs-saga',
    number: '02',
    title: 'Two-Phase Commit vs. Saga',
    subtitle: 'Blocking atomic locking vs. non-blocking local commits with compensating rollbacks',
    leftName: 'Two-Phase Commit',
    leftPath: '/two-phase-commit',
    leftPaper: 'Gray, 1978',
    rightName: 'Compensating Saga',
    rightPath: '/distributed-transactions',
    rightPaper: 'Garcia-Molina, 1987',
    steps: [
      {
        title: 'Start Distributed Order',
        leftNote: 'Coordinator broadcasts VoteRequest; participants acquire locks.',
        rightNote: 'Saga starts pipeline — no global locks acquired across services.',
        insight: '2PC coordinates all participants up front; Saga breaks work into independent local transactions.',
      },
      {
        title: 'Partial Progress',
        leftNote: 'P0 and P1 vote YES and enter PREPARED (locked, waiting on coordinator).',
        rightNote: 'Step 1 (Inventory) & Step 2 (Payment) commit locally and release locks.',
        insight: '2PC preserves full isolation while waiting; Saga exposes intermediate committed state immediately.',
      },
      {
        title: 'Downstream Failure',
        leftNote: 'P2 fails / votes NO — atomic invariant forbids partial commit.',
        rightNote: 'Step 3 (Shipping) fails after Steps 1 & 2 already committed locally.',
        insight: '2PC detects failure before any commit; Saga discovers failure mid-flight.',
      },
      {
        title: 'Abort vs. Compensate',
        leftNote: 'Coordinator broadcasts ABORT to roll back P0 & P1 cleanly.',
        rightNote: 'Saga executes compensating transaction for Step 2 (Refund Payment).',
        insight: '2PC aborts cleanly via undo logs; Saga requires custom semantic undo actions.',
      },
      {
        title: 'Final Convergence',
        leftNote: 'All participants ABORTED and locks released (atomic all-or-nothing).',
        rightNote: 'Step 1 compensated (Release Inventory) — system eventually consistent.',
        insight: 'Use 2PC for strict ACID within a tight boundary; use Sagas across loosely-coupled microservices.',
      },
    ],
    comparison: [
      { axis: 'Isolation', left: 'Strict ACID (locks held across phases)', right: 'Eventual (intermediate states visible)' },
      { axis: 'Blocking Risk', left: 'Blocks if coordinator crashes mid-phase', right: 'Non-blocking (local commits proceed)' },
      { axis: 'Failure Undo', left: 'Automatic database rollback (ABORT)', right: 'Explicit compensating transactions' },
      { axis: 'Best Fit', left: 'Single-region sharded DB / XA', right: 'Cross-service workflows & workflows' },
    ],
  },
  {
    id: 'lamport-vs-vector',
    number: '03',
    title: 'Lamport vs. Vector Clocks',
    subtitle: 'Scalar logical clocks (1 integer) vs. exact causal partial-order vectors (N integers)',
    leftName: 'Lamport Clocks',
    leftPath: '/lamport-clocks',
    leftPaper: 'Lamport, 1978',
    rightName: 'Vector Clocks',
    rightPath: '/vector-clocks',
    rightPaper: 'Fidge & Mattern, 1988',
    steps: [
      {
        title: 'Independent Event on P0',
        leftNote: 'P0 executes local event → scalar clock ticks to 1.',
        rightNote: 'P0 executes local event → vector clock becomes [1, 0, 0].',
        insight: 'At a single process, both clocks simply increment their own counter.',
      },
      {
        title: 'Concurrent Event on P2',
        leftNote: 'P2 executes local event → scalar clock ticks to 1 (ties with P0).',
        rightNote: 'P2 executes local event → vector clock becomes [0, 0, 1].',
        insight: 'Vector clocks immediately prove [1,0,0] ∥ [0,0,1] are concurrent (neither ≤ the other).',
      },
      {
        title: 'Divergent Ticks on P0',
        leftNote: 'P0 ticks again → P0=2 > P2=1. Scalar comparison hides concurrency!',
        rightNote: 'P0=[2, 0, 0] vs P2=[0, 0, 1] → still provably CONCURRENT!',
        insight: 'Key theorem: Lamport gives (a→b ⇒ L(a)<L(b)), NOT the converse. Vector clocks give ⇔.',
      },
      {
        title: 'Causal Message P0 → P1',
        leftNote: 'P0 broadcasts (t=3); P1 updates its scalar clock past 3.',
        rightNote: 'P0 sends [3,0,0] to P1; P1 takes element-wise max → [3, 1, 0].',
        insight: 'Vector merge captures the entire causal ancestry known to P0 at send time.',
      },
      {
        title: 'Transitive Chain P1 → P2',
        leftNote: 'P1 broadcasts; P2 advances scalar clock into total order.',
        rightNote: 'P1 sends [3,2,0] to P2; P2 merges → [3, 2, 2], proving P0 → P1 → P2.',
        insight: 'Vector clocks detect exact causality at the cost of O(N) metadata per message.',
      },
    ],
    comparison: [
      { axis: 'Metadata Size', left: 'O(1) — single integer', right: 'O(N) — vector of N process counters' },
      { axis: 'Causal Guarantee', left: 'a → b ⇒ L(a) < L(b) (one-way)', right: 'a → b ⇔ V(a) < V(b) (if and only if)' },
      { axis: 'Concurrency Detection', left: 'Cannot distinguish concurrent vs causal', right: 'Exact concurrency detection (V(a) ∥ V(b))' },
      { axis: 'Total Order', left: 'Easy tie-break with (clock, nodeId)', right: 'Partial order by design' },
    ],
  },
];

export default function ProtocolDuelPage() {
  const [duelId, setDuelId] = useState<DuelId>('raft-vs-paxos');
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Real algorithm engine instances
  const [raft] = useState(() => new RaftAlgorithm(5));
  const [paxos] = useState(() => new PaxosAlgorithm(2, 5, 2));
  const [tpc] = useState(() => new TwoPhaseCommitAlgorithm(3));
  const [saga] = useState(() => new DistributedTransactionsAlgorithm(3));
  const [lamport] = useState(() => new LamportClocksAlgorithm(3));
  const [vector] = useState(() => new VectorClocksAlgorithm(3));

  // Tick counter to force React re-render after mutating algorithm engines
  const [, setVersion] = useState(0);

  const activeDuel = useMemo(
    () => DUELS.find((d) => d.id === duelId) ?? DUELS[0],
    [duelId]
  );

  const totalSteps = activeDuel.steps.length;

  // Deterministically reconstruct both engines at exact step `targetStep`
  const applyDuelState = useCallback(
    (targetDuel: DuelId, targetStep: number) => {
      if (targetDuel === 'raft-vs-paxos') {
        raft.reset();
        paxos.reset();

        if (targetStep >= 1) {
          raft.startElection('node-0');
          paxos.startProposal('proposer-0', 'SET x=42');
        }
        if (targetStep >= 2) {
          raft.processRequestVotes();
          raft.processVoteResponses();
          paxos
            .getMessages()
            .filter((m) => m.type === 'Prepare' && m.status === 'in-flight')
            .forEach((m) => paxos.handlePrepare(m.id));
        }
        if (targetStep >= 3) {
          raft.finalizeElection();
          paxos
            .getMessages()
            .filter((m) => m.type === 'Promise' && m.status === 'in-flight')
            .forEach((m) => paxos.handlePromise(m.id, 'SET x=42'));
        }
        if (targetStep >= 4) {
          raft.addClientRequest('node-0', 'SET x=42');
          raft.replicatePendingLogs();
          paxos
            .getMessages()
            .filter((m) => m.type === 'Accept' && m.status === 'in-flight')
            .forEach((m) => paxos.handleAccept(m.id));
          paxos.finalizeConsensus('SET x=42');
        }
        if (targetStep >= 5) {
          raft.failNode('node-0');
          paxos.failNode('proposer-0');
          paxos.failNode('acceptor-0');
        }
        if (targetStep >= 6) {
          raft.startElection('node-1');
          raft.processRequestVotes();
          raft.processVoteResponses();
          raft.finalizeElection();
          raft.addClientRequest('node-1', 'SET y=99');
          raft.replicatePendingLogs();

          paxos.startProposal('proposer-1', 'SET y=99', true);
          paxos
            .getMessages()
            .filter((m) => m.type === 'Prepare' && m.status === 'in-flight')
            .forEach((m) => paxos.handlePrepare(m.id));
          paxos
            .getMessages()
            .filter((m) => m.type === 'Promise' && m.status === 'in-flight')
            .forEach((m) => paxos.handlePromise(m.id, 'SET y=99'));
          paxos
            .getMessages()
            .filter((m) => m.type === 'Accept' && m.status === 'in-flight')
            .forEach((m) => paxos.handleAccept(m.id));
          paxos.finalizeConsensus('SET y=99');
        }
      } else if (targetDuel === '2pc-vs-saga') {
        tpc.reset();
        saga.reset();

        if (targetStep >= 1) {
          tpc.startTransaction();
          saga.startSaga();
        }
        if (targetStep >= 2) {
          tpc.participantVote('participant-0', 'yes');
          tpc.participantVote('participant-1', 'yes');
          saga.completeSagaStep('S0');
          saga.completeSagaStep('S1');
        }
        if (targetStep >= 3) {
          tpc.participantVote('participant-2', 'no');
          saga.failParticipant('P2');
        }
        if (targetStep >= 4) {
          tpc.coordinatorDecide();
          saga.compensateSaga('S1');
        }
        if (targetStep >= 5) {
          tpc.participantFinalize('participant-0', 'abort');
          tpc.participantFinalize('participant-1', 'abort');
          tpc.participantFinalize('participant-2', 'abort');
          tpc.coordinatorComplete();
          saga.compensateSaga('S0');
        }
      } else {
        lamport.reset();
        vector.reset();

        if (targetStep >= 1) {
          lamport.localEvent('P0', 'write A');
          vector.createLocalEvent('P0', 'write A');
        }
        if (targetStep >= 2) {
          lamport.localEvent('P2', 'write B');
          vector.createLocalEvent('P2', 'write B');
        }
        if (targetStep >= 3) {
          lamport.localEvent('P0', 'write C');
          vector.createLocalEvent('P0', 'write C');
        }
        if (targetStep >= 4) {
          lamport.broadcast('P0', 'msg-1');
          lamport
            .getMessages()
            .filter((m) => m.status === 'in-flight')
            .forEach((m) => lamport.deliverMessage(m.id));
          const sent = vector.sendMessage('P0', 'P1', 'msg-1');
          if (sent) {
            vector.receiveMessage('P1', sent.vectorClock, sent.id, 'P0→P1');
          }
        }
        if (targetStep >= 5) {
          lamport.broadcast('P1', 'msg-2');
          lamport
            .getMessages()
            .filter((m) => m.status === 'in-flight')
            .forEach((m) => lamport.deliverMessage(m.id));
          const sent = vector.sendMessage('P1', 'P2', 'msg-2');
          if (sent) {
            vector.receiveMessage('P2', sent.vectorClock, sent.id, 'P1→P2');
          }
        }
      }

      setVersion((v) => v + 1);
    },
    [raft, paxos, tpc, saga, lamport, vector]
  );

  const jumpToStep = useCallback(
    (nextStep: number) => {
      const clamped = Math.max(0, Math.min(totalSteps, nextStep));
      setStep(clamped);
      applyDuelState(duelId, clamped);
    },
    [applyDuelState, duelId, totalSteps]
  );

  const selectDuel = (nextId: DuelId) => {
    setIsPlaying(false);
    setDuelId(nextId);
    setStep(0);
    applyDuelState(nextId, 0);
  };

  useEffect(() => {
    if (!isPlaying || step >= totalSteps) return;
    const timer = setTimeout(() => {
      const next = step + 1;
      setStep(next);
      applyDuelState(duelId, next);
      if (next >= totalSteps) {
        setIsPlaying(false);
      }
    }, 1550);
    return () => clearTimeout(timer);
  }, [isPlaying, step, totalSteps, duelId, applyDuelState]);

  const currentStepInfo = step > 0 ? activeDuel.steps[step - 1] : null;

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-20">
        {/* Top Editorial Masthead */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-8 border-b border-[var(--rule)] font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-muted)]">
          <span className="inline-flex items-center gap-2 text-[var(--signal)] font-semibold">
            <Scale className="w-3.5 h-3.5" />
            COMPARATIVE LABORATORY · DUAL OSCILLOSCOPE
          </span>
          <Link href="/" className="hover:text-[var(--ink)] transition-colors">
            ← Return to Protocol Atlas
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="font-editorial text-4xl sm:text-5xl tracking-[-0.025em] text-[var(--ink)] leading-tight">
              Protocol <em className="italic text-[var(--signal)] font-normal">Duel</em> Bench
            </h1>
            <p className="text-sm sm:text-base text-[var(--ink-secondary)] mt-2 max-w-2xl">
              Step two real protocol engines simultaneously through the exact same workload and fault
              injections to observe how their guarantees, blocking behavior, and message rounds
              diverge.
            </p>
          </div>

          {/* Duel Selector Tabs */}
          <div className="flex flex-wrap gap-2">
            {DUELS.map((d) => {
              const active = d.id === duelId;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => selectDuel(d.id)}
                  className={`px-3.5 py-2 border font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer ${
                    active
                      ? 'bg-[var(--ink)] text-[var(--paper-elevated)] border-[var(--ink)]'
                      : 'bg-[var(--paper-elevated)] text-[var(--ink-secondary)] border-[var(--rule)] hover:border-[var(--ink)] hover:text-[var(--ink)]'
                  }`}
                >
                  <span className={active ? 'text-[#FB923C] mr-1.5' : 'text-[var(--signal)] mr-1.5'}>
                    {d.number}
                  </span>
                  {d.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* Synchronized Hardware Control Rail */}
        <div className="border border-[var(--ink)] bg-[var(--chassis)] p-4 mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {isPlaying ? (
              <button
                type="button"
                onClick={() => setIsPlaying(false)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--ink)] text-[var(--paper-elevated)] font-mono text-xs uppercase tracking-wider cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
                Pause Duel
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (step >= totalSteps) jumpToStep(0);
                  setIsPlaying(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--signal)] hover:bg-[var(--signal-hover)] text-[#FAF7F1] font-mono text-xs uppercase tracking-wider font-medium cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                {step >= totalSteps ? 'Replay Duel' : 'Run Duel'}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                jumpToStep(step + 1);
              }}
              disabled={step >= totalSteps}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[var(--paper-elevated)] border border-[var(--ink)]/35 hover:border-[var(--ink)] text-[var(--ink)] font-mono text-xs uppercase tracking-wider disabled:opacity-35 cursor-pointer"
            >
              <span>Step Both</span>
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                jumpToStep(0);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[var(--paper-elevated)] border border-[var(--rule)] hover:border-[var(--ink)] text-[var(--ink)] font-mono text-xs uppercase tracking-wider cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          {/* Calibrated Step Scrubber */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                jumpToStep(0);
              }}
              className={`px-2 py-1 border cursor-pointer tabular-nums ${
                step === 0
                  ? 'bg-[var(--ink)] text-[var(--paper-elevated)] border-[var(--ink)]'
                  : 'bg-[var(--paper-elevated)] text-[var(--ink-muted)] border-[var(--rule)] hover:border-[var(--ink)]'
              }`}
            >
              00
            </button>
            {activeDuel.steps.map((s, idx) => {
              const num = idx + 1;
              const isCurrent = step === num;
              const isDone = step > num;
              return (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    jumpToStep(num);
                  }}
                  title={s.title}
                  className={`px-2.5 py-1 border cursor-pointer tabular-nums transition-colors ${
                    isCurrent
                      ? 'bg-[var(--signal)] text-[#FAF7F1] border-[var(--signal)] font-semibold'
                      : isDone
                      ? 'bg-[var(--ink)]/10 text-[var(--ink)] border-[var(--ink)]/35'
                      : 'bg-[var(--paper-elevated)] text-[var(--ink-muted)] border-[var(--rule)] hover:border-[var(--ink)]'
                  }`}
                >
                  {String(num).padStart(2, '0')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Step Insight Strip */}
        <div className="mb-6 border border-[var(--rule)] bg-[var(--paper-elevated)] p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--signal)] font-semibold">
              {currentStepInfo
                ? `STEP ${String(step).padStart(2, '0')} / ${String(totalSteps).padStart(2, '0')} · ${currentStepInfo.title}`
                : `STANDBY · ${activeDuel.title.toUpperCase()}`}
            </span>
            <span className="font-mono text-[10px] text-[var(--ink-muted)] uppercase">
              {activeDuel.subtitle}
            </span>
          </div>
          <p className="text-sm text-[var(--ink)] leading-relaxed">
            {currentStepInfo
              ? currentStepInfo.insight
              : 'Press "Run Duel" or "Step Both" to watch both live algorithm engines execute side by side.'}
          </p>
        </div>

        {/* DUAL SIDE-BY-SIDE OSCILLOSCOPES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          {/* LEFT OSCILLOSCOPE */}
          <div className="border border-[var(--ink)] bg-[var(--paper-elevated)] flex flex-col">
            <div className="px-4 py-3 border-b border-[var(--rule)] bg-[var(--chassis)]/70 flex items-center justify-between gap-2">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--ink-muted)]">
                  ENGINE A · {activeDuel.leftPaper}
                </div>
                <h2 className="font-editorial text-2xl text-[var(--ink)]">{activeDuel.leftName}</h2>
              </div>
              <Link
                href={activeDuel.leftPath}
                className="inline-flex items-center gap-1 px-2.5 py-1 border border-[var(--rule)] bg-[var(--paper-elevated)] hover:border-[var(--ink)] font-mono text-[10px] uppercase tracking-wider text-[var(--ink)]"
              >
                Full Plate
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="scope-viewport h-[340px] relative">
              {duelId === 'raft-vs-paxos' && <RaftMiniScope raft={raft} />}
              {duelId === '2pc-vs-saga' && <TwoPhaseMiniScope tpc={tpc} />}
              {duelId === 'lamport-vs-vector' && <LamportMiniScope lamport={lamport} />}
            </div>

            <div className="px-4 py-3 border-t border-[var(--rule)] bg-[var(--paper)] font-mono text-xs text-[var(--ink-secondary)] min-h-[56px]">
              {currentStepInfo ? currentStepInfo.leftNote : 'Initial healthy cluster state.'}
            </div>
          </div>

          {/* RIGHT OSCILLOSCOPE */}
          <div className="border border-[var(--ink)] bg-[var(--paper-elevated)] flex flex-col">
            <div className="px-4 py-3 border-b border-[var(--rule)] bg-[var(--chassis)]/70 flex items-center justify-between gap-2">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--ink-muted)]">
                  ENGINE B · {activeDuel.rightPaper}
                </div>
                <h2 className="font-editorial text-2xl text-[var(--ink)]">{activeDuel.rightName}</h2>
              </div>
              <Link
                href={activeDuel.rightPath}
                className="inline-flex items-center gap-1 px-2.5 py-1 border border-[var(--rule)] bg-[var(--paper-elevated)] hover:border-[var(--ink)] font-mono text-[10px] uppercase tracking-wider text-[var(--ink)]"
              >
                Full Plate
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="scope-viewport h-[340px] relative">
              {duelId === 'raft-vs-paxos' && <PaxosMiniScope paxos={paxos} />}
              {duelId === '2pc-vs-saga' && <SagaMiniScope saga={saga} />}
              {duelId === 'lamport-vs-vector' && <VectorMiniScope vector={vector} />}
            </div>

            <div className="px-4 py-3 border-t border-[var(--rule)] bg-[var(--paper)] font-mono text-xs text-[var(--ink-secondary)] min-h-[56px]">
              {currentStepInfo ? currentStepInfo.rightNote : 'Initial healthy cluster state.'}
            </div>
          </div>
        </div>

        {/* Architectural Invariant Comparison Table */}
        <section className="border border-[var(--ink)] bg-[var(--paper-elevated)] overflow-x-auto">
          <div className="px-4 py-2.5 border-b border-[var(--ink)] bg-[var(--chassis)] font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-secondary)]">
            Architectural Trade-off Matrix · {activeDuel.title}
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--rule)] font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)] bg-[var(--paper)]">
                <th className="py-2.5 px-4 w-44">Dimension</th>
                <th className="py-2.5 px-4">{activeDuel.leftName}</th>
                <th className="py-2.5 px-4">{activeDuel.rightName}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--rule)] text-sm">
              {activeDuel.comparison.map((row) => (
                <tr key={row.axis}>
                  <td className="py-3 px-4 font-mono text-xs font-semibold text-[var(--ink)] uppercase">
                    {row.axis}
                  </td>
                  <td className="py-3 px-4 text-[var(--ink-secondary)]">{row.left}</td>
                  <td className="py-3 px-4 text-[var(--ink-secondary)]">{row.right}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

/* ==================== LIVE ENGINE MINI-OSCILLOSCOPES ==================== */

function RaftMiniScope({ raft }: { raft: RaftAlgorithm }) {
  const nodes = raft.getNodes();
  const messages = raft.getMessages();

  return (
    <svg viewBox="0 0 840 640" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
      <ScopeDefs idPrefix="duel-raft" />
      {nodes.map((a, i) =>
        nodes.slice(i + 1).map((b) => (
          <line
            key={`dr-${a.id}-${b.id}`}
            x1={a.position.x}
            y1={a.position.y}
            x2={b.position.x}
            y2={b.position.y}
            stroke={SCOPE_COLORS.hairlineSubtle}
            strokeWidth="1"
          />
        ))
      )}
      {messages.slice(-8).map((msg) => {
        const from = nodes.find((n) => n.id === msg.from);
        const to = nodes.find((n) => n.id === msg.to);
        if (!from || !to) return null;
        const isVote = msg.type === 'RequestVote';
        return (
          <ScopeEdge
            key={msg.id}
            idPrefix="duel-raft"
            x1={from.position.x}
            y1={from.position.y}
            x2={to.position.x}
            y2={to.position.y}
            color={isVote ? SCOPE_COLORS.amber : SCOPE_COLORS.cobalt}
            markerKey={isVote ? 'amber' : 'cobalt'}
            inset={42}
            dashed={isVote}
          />
        );
      })}
      {nodes.map((node) => {
        const isFailed = node.status === 'failed';
        const isLeader = !isFailed && node.state === 'leader';
        const accent = isFailed
          ? SCOPE_COLORS.danger
          : isLeader
          ? SCOPE_COLORS.signal
          : node.state === 'candidate'
          ? SCOPE_COLORS.amber
          : SCOPE_COLORS.emerald;
        return (
          <ScopeNode
            key={node.id}
            x={node.position.x}
            y={node.position.y}
            radius={36}
            label={`N${node.id.replace('node-', '')}`}
            sublabel={isFailed ? 'DOWN' : `T${node.term}`}
            topTag={isFailed ? 'FAILED' : node.state.toUpperCase()}
            bottomLine1={`LOG ${node.log.length} · CMT ${node.commitIndex}`}
            accentColor={accent}
            failed={isFailed}
            highlighted={isLeader}
          />
        );
      })}
    </svg>
  );
}

function PaxosMiniScope({ paxos }: { paxos: PaxosAlgorithm }) {
  const nodes = paxos.getAllNodes();
  const messages = paxos.getMessages();
  const decided = paxos.getDecidedValues();

  return (
    <svg viewBox="0 0 820 620" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
      <ScopeDefs idPrefix="duel-paxos" />
      {decided.length > 0 && (
        <text x="24" y="34" fill={SCOPE_COLORS.emerald} fontSize="13" fontWeight="600">
          DECIDED: {decided.join(', ')}
        </text>
      )}
      {messages.slice(-8).map((msg) => {
        const from = nodes.find((n) => n.id === msg.from);
        const to =
          msg.to === 'learners'
            ? paxos.getLearners()[0]
            : nodes.find((n) => n.id === msg.to);
        if (!from || !to) return null;
        const isPhase1 = msg.type === 'Prepare' || msg.type === 'Promise';
        return (
          <ScopeEdge
            key={msg.id}
            idPrefix="duel-paxos"
            x1={from.position.x}
            y1={from.position.y}
            x2={to.position.x}
            y2={to.position.y}
            color={isPhase1 ? SCOPE_COLORS.cobalt : SCOPE_COLORS.amber}
            markerKey={isPhase1 ? 'cobalt' : 'amber'}
            inset={36}
            dashed={isPhase1}
          />
        );
      })}
      {nodes.map((node) => {
        const isFailed = node.status === 'failed';
        const accent = isFailed
          ? SCOPE_COLORS.danger
          : node.role === 'proposer'
          ? SCOPE_COLORS.cobalt
          : node.role === 'learner'
          ? SCOPE_COLORS.signal
          : node.acceptedValue
          ? SCOPE_COLORS.emerald
          : SCOPE_COLORS.amber;
        return (
          <ScopeNode
            key={node.id}
            x={node.position.x}
            y={node.position.y}
            radius={31}
            label={`${node.id.split('-')[0][0].toUpperCase()}${node.id.split('-')[1]}`}
            sublabel={isFailed ? 'DOWN' : node.role.slice(0, 3).toUpperCase()}
            topTag={isFailed ? 'FAILED' : node.role.toUpperCase()}
            bottomLine1={
              node.acceptedValue
                ? `✓ ${node.acceptedValue}`
                : node.promisedProposal
                ? `PROM #${node.promisedProposal}`
                : undefined
            }
            accentColor={accent}
            failed={isFailed}
            highlighted={Boolean(node.acceptedValue)}
          />
        );
      })}
    </svg>
  );
}

function TwoPhaseMiniScope({ tpc }: { tpc: TwoPhaseCommitAlgorithm }) {
  const coordinator = tpc.getCoordinator();
  const participants = tpc.getParticipants();
  const allNodes = [coordinator, ...participants];
  const messages = tpc.getMessages();

  return (
    <svg viewBox="0 0 800 580" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
      <ScopeDefs idPrefix="duel-2pc" />
      {participants.map((p) => (
        <line
          key={`2pc-wire-${p.id}`}
          x1={coordinator.position.x}
          y1={coordinator.position.y}
          x2={p.position.x}
          y2={p.position.y}
          stroke={SCOPE_COLORS.hairlineSubtle}
          strokeWidth="1"
        />
      ))}
      {messages.slice(-6).map((msg) => {
        const from = allNodes.find((n) => n.id === msg.from);
        const to = allNodes.find((n) => n.id === msg.to);
        if (!from || !to) return null;
        const isAbort = msg.type === 'Abort' || msg.type === 'VoteNo';
        return (
          <ScopeEdge
            key={msg.id}
            idPrefix="duel-2pc"
            x1={from.position.x}
            y1={from.position.y}
            x2={to.position.x}
            y2={to.position.y}
            color={isAbort ? SCOPE_COLORS.danger : SCOPE_COLORS.amber}
            markerKey={isAbort ? 'danger' : 'amber'}
            inset={44}
            label={msg.type}
          />
        );
      })}
      {allNodes.map((node) => {
        const isAborted = node.state === 'aborted' || node.state === 'aborting';
        const isPrepared = node.state === 'prepared' || node.state === 'preparing';
        const accent = isAborted
          ? SCOPE_COLORS.danger
          : node.state === 'committed'
          ? SCOPE_COLORS.emerald
          : isPrepared
          ? SCOPE_COLORS.amber
          : SCOPE_COLORS.cobalt;
        return (
          <ScopeNode
            key={node.id}
            x={node.position.x}
            y={node.position.y}
            radius={node.role === 'coordinator' ? 42 : 36}
            label={node.role === 'coordinator' ? 'COORD' : `P${node.id.split('-')[1]}`}
            sublabel={node.state.toUpperCase()}
            topTag={node.vote ? `VOTE ${node.vote.toUpperCase()}` : node.role.toUpperCase()}
            accentColor={accent}
            failed={isAborted}
            highlighted={node.role === 'coordinator'}
          />
        );
      })}
    </svg>
  );
}

function SagaMiniScope({ saga }: { saga: DistributedTransactionsAlgorithm }) {
  const steps = saga.getSagaSteps();
  const participants = saga.getParticipants();
  const stepNames = ['INVENTORY', 'PAYMENT', 'SHIPPING'];
  const coords = [
    { x: 170, y: 260 },
    { x: 410, y: 260 },
    { x: 650, y: 260 },
  ];

  return (
    <svg viewBox="0 0 820 520" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
      <ScopeDefs idPrefix="duel-saga" />
      <text x="28" y="42" fill={SCOPE_COLORS.inkMuted} fontSize="12" letterSpacing="0.12em">
        FORWARD LOCAL TXNS → / ← COMPENSATING ROLLBACKS
      </text>

      {/* Forward connectors */}
      <ScopeEdge
        idPrefix="duel-saga"
        x1={coords[0].x}
        y1={coords[0].y}
        x2={coords[1].x}
        y2={coords[1].y}
        color={steps[0]?.status === 'completed' ? SCOPE_COLORS.emerald : SCOPE_COLORS.inkMuted}
        markerKey={steps[0]?.status === 'completed' ? 'emerald' : 'muted'}
        inset={54}
      />
      <ScopeEdge
        idPrefix="duel-saga"
        x1={coords[1].x}
        y1={coords[1].y}
        x2={coords[2].x}
        y2={coords[2].y}
        color={steps[1]?.status === 'completed' ? SCOPE_COLORS.emerald : SCOPE_COLORS.inkMuted}
        markerKey={steps[1]?.status === 'completed' ? 'emerald' : 'muted'}
        inset={54}
      />

      {/* Reverse compensation arcs */}
      {steps[1]?.status === 'compensated' && (
        <path
          d="M 620 318 Q 530 395 430 318"
          fill="none"
          stroke={SCOPE_COLORS.signal}
          strokeWidth="2"
          strokeDasharray="5 4"
          markerEnd="url(#duel-saga-arrow-signal)"
        />
      )}
      {steps[0]?.status === 'compensated' && (
        <path
          d="M 380 318 Q 290 395 190 318"
          fill="none"
          stroke={SCOPE_COLORS.signal}
          strokeWidth="2"
          strokeDasharray="5 4"
          markerEnd="url(#duel-saga-arrow-signal)"
        />
      )}

      {steps.map((s, idx) => {
        const failed = participants[idx]?.status === 'failed';
        const accent = failed
          ? SCOPE_COLORS.danger
          : s.status === 'compensated'
          ? SCOPE_COLORS.signal
          : s.status === 'completed'
          ? SCOPE_COLORS.emerald
          : SCOPE_COLORS.inkMuted;
        return (
          <ScopeNode
            key={s.id}
            x={coords[idx].x}
            y={coords[idx].y}
            radius={44}
            label={`S${idx + 1}`}
            sublabel={failed ? 'FAILED' : s.status.toUpperCase()}
            topTag={stepNames[idx]}
            bottomLine1={
              s.status === 'compensated'
                ? 'COMPENSATED'
                : s.status === 'completed'
                ? 'LOCAL COMMIT'
                : failed
                ? 'ERR · UNWIND'
                : 'PENDING'
            }
            accentColor={accent}
            failed={failed}
            highlighted={s.status === 'compensated'}
          />
        );
      })}
    </svg>
  );
}

function LamportMiniScope({ lamport }: { lamport: LamportClocksAlgorithm }) {
  const nodes = lamport.getNodes();
  const p0 = nodes.find((n) => n.id === 'P0')?.clock ?? 0;
  const p2 = nodes.find((n) => n.id === 'P2')?.clock ?? 0;

  return (
    <svg viewBox="0 0 840 620" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
      <ScopeDefs idPrefix="duel-lamport" />
      <text x="28" y="38" fill={SCOPE_COLORS.amber} fontSize="12">
        SCALAR COMPARISON: L(P0)={p0} vs L(P2)={p2}
        {p0 > p2 && p2 > 0 ? '  [LOOKS ORDERED — CONCURRENCY HIDDEN!]' : ''}
      </text>
      {nodes.map((a, i) =>
        nodes.slice(i + 1).map((b) => (
          <line
            key={`dl-${a.id}-${b.id}`}
            x1={a.position.x}
            y1={a.position.y}
            x2={b.position.x}
            y2={b.position.y}
            stroke={SCOPE_COLORS.hairlineSubtle}
            strokeWidth="1"
          />
        ))
      )}
      {nodes.map((node) => (
        <ScopeNode
          key={node.id}
          x={node.position.x}
          y={node.position.y}
          radius={44}
          label={node.id}
          sublabel={`L = ${node.clock}`}
          topTag="SCALAR CLOCK"
          bottomLine1={`DELIVERED ${node.delivered.length}`}
          accentColor={node.clock > 0 ? SCOPE_COLORS.cobalt : SCOPE_COLORS.inkMuted}
          highlighted={node.clock > 0}
        />
      ))}
    </svg>
  );
}

function VectorMiniScope({ vector }: { vector: VectorClocksAlgorithm }) {
  const processes = vector.getProcesses();
  const stats = vector.getStats();
  const coords = [
    { x: 420, y: 155 },
    { x: 585, y: 425 },
    { x: 255, y: 425 },
  ];

  const formatVc = (vc: Record<string, number>) =>
    `[${Object.keys(vc)
      .sort()
      .map((k) => vc[k])
      .join(', ')}]`;

  return (
    <svg viewBox="0 0 840 620" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
      <ScopeDefs idPrefix="duel-vector" />
      <text
        x="28"
        y="38"
        fill={stats.concurrentPairs > 0 ? SCOPE_COLORS.emerald : SCOPE_COLORS.inkMuted}
        fontSize="12"
      >
        EXACT CONCURRENT PAIRS DETECTED: {stats.concurrentPairs} · EVENTS: {stats.totalEvents}
      </text>
      {coords.map((a, i) =>
        coords.slice(i + 1).map((b, j) => (
          <line
            key={`dv-${i}-${j}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={SCOPE_COLORS.hairlineSubtle}
            strokeWidth="1"
          />
        ))
      )}
      {processes.map((proc, idx) => (
        <ScopeNode
          key={proc.id}
          x={coords[idx].x}
          y={coords[idx].y}
          radius={44}
          label={proc.id}
          sublabel={formatVc(proc.vectorClock)}
          topTag="VECTOR CLOCK"
          bottomLine1={`EVENTS ${proc.events.length}`}
          accentColor={proc.events.length > 0 ? SCOPE_COLORS.emerald : SCOPE_COLORS.inkMuted}
          highlighted={proc.events.length > 0}
        />
      ))}
    </svg>
  );
}
