'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  ArrowUpRight,
  Scale,
  Link2,
  Check,
} from 'lucide-react';
import { RaftAlgorithm } from '@/lib/algorithms/raft';
import { PaxosAlgorithm } from '@/lib/algorithms/paxos';
import { TwoPhaseCommitAlgorithm } from '@/lib/algorithms/twoPhaseCommit';
import { DistributedTransactionsAlgorithm } from '@/lib/algorithms/distributedTransactions';
import { LamportClocksAlgorithm } from '@/lib/algorithms/lamportClocks';
import { VectorClocksAlgorithm } from '@/lib/algorithms/vectorClocks';
import { QuorumReplicationAlgorithm } from '@/lib/algorithms/quorumReplication';
import { CRDTAlgorithm } from '@/lib/algorithms/crdts';
import { ConsistentHashingAlgorithm } from '@/lib/algorithms/consistentHashing';
import { ShardingRebalancingAlgorithm } from '@/lib/algorithms/shardingRebalancing';
import { PBFTAlgorithm } from '@/lib/algorithms/pbft';
import {
  DUELS,
  DuelId,
  parseDuelDeepLink,
  clampDuelStep,
  buildDuelDeepLinkUrl,
} from '@/lib/duels';
import { showToast } from '@/lib/toast';
import { ScopeDefs, ScopeEdge, ScopeNode, SCOPE_COLORS } from '@/components/ScopeSvgKit';

const INITIAL_HASH_KEYS = [
  'user-01',
  'user-02',
  'user-03',
  'acct-10',
  'acct-11',
  'acct-12',
  'sess-20',
  'sess-21',
  'sess-22',
  'cart-30',
  'cart-31',
  'cart-32',
];

const BURST_HASH_KEYS = [
  'order-100',
  'order-101',
  'order-102',
  'order-103',
  'order-104',
  'order-105',
];

export default function ProtocolDuelPage() {
  const [duelId, setDuelId] = useState<DuelId>('raft-vs-paxos');
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Real algorithm engine instances
  const [raft] = useState(() => new RaftAlgorithm(5));
  const [paxos] = useState(() => new PaxosAlgorithm(2, 5, 2));
  const [tpc] = useState(() => new TwoPhaseCommitAlgorithm(3));
  const [saga] = useState(() => new DistributedTransactionsAlgorithm(3));
  const [lamport] = useState(() => new LamportClocksAlgorithm(3));
  const [vector] = useState(() => new VectorClocksAlgorithm(3));
  const [quorum] = useState(() => new QuorumReplicationAlgorithm(5, 3));
  const [crdt] = useState(() => new CRDTAlgorithm(3));
  const [hashing] = useState(() => new ConsistentHashingAlgorithm(3, 3));
  const [sharding] = useState(() => new ShardingRebalancingAlgorithm(3, 'range'));
  const [pbft] = useState(() => new PBFTAlgorithm(4));

  // Tick counter to force React re-render after mutating algorithm engines
  const [, setVersion] = useState(0);
  const hasHydratedRef = useRef(false);

  const activeDuel = useMemo(
    () => DUELS.find((d) => d.id === duelId) ?? DUELS[0],
    [duelId]
  );

  const totalSteps = activeDuel.steps.length;

  const syncUrl = useCallback((nextDuel: DuelId, nextStep: number) => {
    if (typeof window === 'undefined') return;
    try {
      const nextUrl = buildDuelDeepLinkUrl(window.location.href, nextDuel, nextStep);
      window.history.replaceState(null, '', nextUrl);
    } catch {
      // Ignore history API restrictions
    }
  }, []);

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
      } else if (targetDuel === 'lamport-vs-vector') {
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
      } else if (targetDuel === 'quorum-vs-crdts') {
        quorum.reset();
        crdt.reset();

        if (targetStep >= 1) {
          quorum.write('cart', 1, 'N0', 3);
          quorum
            .getMessages()
            .filter((m) => m.status === 'in-flight')
            .forEach((m) => quorum.deliverMessage(m.id));
          crdt.increment('R0');
          crdt.orSetAdd('R0', 'cart');
        }
        if (targetStep >= 2) {
          quorum.failNode('N2');
          quorum.write('cart', 2, 'N3', 3);
          crdt.increment('R1');
          crdt.increment('R2');
          crdt.orSetAdd('R1', 'promo');
        }
        if (targetStep >= 3) {
          quorum
            .getMessages()
            .filter((m) => m.type === 'Write' && m.status === 'in-flight')
            .forEach((m) => quorum.deliverMessage(m.id));
          quorum.read('cart', 'N0', 3);
        }
        if (targetStep >= 4) {
          quorum
            .getMessages()
            .filter((m) => m.type === 'Repair' && m.status === 'in-flight')
            .forEach((m) => quorum.deliverMessage(m.id));
          crdt.syncAll();
        }
        if (targetStep >= 5) {
          quorum.recoverNode('N2');
          quorum.read('cart', 'N2', 3);
          quorum
            .getMessages()
            .filter((m) => m.status === 'in-flight')
            .forEach((m) => quorum.deliverMessage(m.id));
          crdt
            .getMessages()
            .filter((m) => m.status === 'in-flight')
            .forEach((m) => crdt.deliverMessage(m.id));
        }
      } else if (targetDuel === 'hashing-vs-sharding') {
        hashing.reset();
        hashing.addServer('server-0');
        hashing.addServer('server-1');
        hashing.addServer('server-2');
        sharding.reset();
        sharding.setStrategy('range');

        if (targetStep >= 1) {
          INITIAL_HASH_KEYS.forEach((k) => hashing.addKey(k));
        }
        if (targetStep >= 2) {
          BURST_HASH_KEYS.forEach((k) => hashing.addKey(k));
        }
        if (targetStep >= 3) {
          hashing.addServer('server-3');
          sharding.addNode();
        }
        if (targetStep >= 4) {
          hashing.removeServer('server-1');
          sharding.removeNode('N1');
        }
        if (targetStep >= 5) {
          sharding
            .getMessages()
            .filter((m) => m.status === 'in-flight')
            .forEach((m) => sharding.deliverMessage(m.id));
          hashing.recordDistributionSnapshot('Post-rebalance');
        }
      } else if (targetDuel === 'raft-vs-pbft') {
        raft.reset();
        pbft.reset();

        if (targetStep >= 1) {
          raft.startElection('node-0');
          raft.processRequestVotes();
          raft.processVoteResponses();
          raft.finalizeElection();
          raft.addClientRequest('node-0', 'TX #7');

          pbft.clientRequest('TX #7');
          pbft
            .getMessages()
            .filter((m) => m.type === 'ClientRequest' && m.status === 'in-flight')
            .forEach((m) => pbft.deliverMessage(m.id));
        }
        if (targetStep >= 2) {
          pbft
            .getMessages()
            .filter((m) => m.type === 'PrePrepare' && m.status === 'in-flight')
            .forEach((m) => pbft.deliverMessage(m.id));
        }
        if (targetStep >= 3) {
          raft.replicatePendingLogs();
          pbft
            .getMessages()
            .filter((m) => m.type === 'Prepare' && m.status === 'in-flight')
            .forEach((m) => pbft.deliverMessage(m.id));
        }
        if (targetStep >= 4) {
          pbft
            .getMessages()
            .filter((m) => m.type === 'Commit' && m.status === 'in-flight')
            .forEach((m) => pbft.deliverMessage(m.id));
        }
        if (targetStep >= 5) {
          raft.failNode('node-0');
          raft.startElection('node-1');
          raft.processRequestVotes();
          raft.processVoteResponses();
          raft.finalizeElection();

          pbft.failNode('N0');
          pbft.triggerViewChange();
        }
      }

      setVersion((v) => v + 1);
    },
    [raft, paxos, tpc, saga, lamport, vector, quorum, crdt, hashing, sharding, pbft]
  );

  // Hydrate initial ?duel=<id>&step=<n> deep-link once on mount
  useEffect(() => {
    if (hasHydratedRef.current || typeof window === 'undefined') return;
    hasHydratedRef.current = true;
    const { duelId: linkedDuel, step: linkedStep } = parseDuelDeepLink(window.location.search);
    if (!linkedDuel && linkedStep === null) return;

    const timer = setTimeout(() => {
      const targetDuel = linkedDuel ?? 'raft-vs-paxos';
      const targetStep = linkedStep !== null ? clampDuelStep(targetDuel, linkedStep) : 0;
      setDuelId(targetDuel);
      setStep(targetStep);
      applyDuelState(targetDuel, targetStep);
    }, 0);
    return () => clearTimeout(timer);
  }, [applyDuelState]);

  const jumpToStep = useCallback(
    (nextStep: number) => {
      const clamped = Math.max(0, Math.min(totalSteps, nextStep));
      setStep(clamped);
      applyDuelState(duelId, clamped);
      syncUrl(duelId, clamped);
    },
    [applyDuelState, duelId, totalSteps, syncUrl]
  );

  const selectDuel = (nextId: DuelId) => {
    setIsPlaying(false);
    setDuelId(nextId);
    setStep(0);
    applyDuelState(nextId, 0);
    syncUrl(nextId, 0);
  };

  const handleCopyLink = async () => {
    if (typeof window === 'undefined') return;
    const shareUrl = buildDuelDeepLinkUrl(window.location.href, duelId, step);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      showToast('Duel deep-link copied to clipboard', 'success');
      setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      showToast('Unable to copy link in this browser context', 'error');
    }
  };

  useEffect(() => {
    if (!isPlaying || step >= totalSteps) return;
    const timer = setTimeout(() => {
      const next = step + 1;
      setStep(next);
      applyDuelState(duelId, next);
      syncUrl(duelId, next);
      if (next >= totalSteps) {
        setIsPlaying(false);
      }
    }, 1550);
    return () => clearTimeout(timer);
  }, [isPlaying, step, totalSteps, duelId, applyDuelState, syncUrl]);

  const currentStepInfo = step > 0 ? activeDuel.steps[step - 1] : null;

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-8 pb-20">
        {/* Top Editorial Masthead */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-8 border-b border-[var(--rule)] font-mono text-[11px] tracking-[0.1em] uppercase text-[var(--ink-muted)]">
          <span className="inline-flex items-center gap-2 text-[var(--signal)] font-semibold">
            <Scale className="w-3.5 h-3.5" />
            COMPARATIVE LABORATORY · 06 DUAL OSCILLOSCOPES
          </span>
          <Link href="/" className="hover:text-[var(--ink)] transition-colors">
            ← Return to Protocol Atlas
          </Link>
        </div>

        <div className="flex flex-col gap-6 mb-8">
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

          {/* Duel Selector Grid (6 Matchups) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {DUELS.map((d) => {
              const active = d.id === duelId;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => selectDuel(d.id)}
                  className={`px-3.5 py-2.5 border text-left transition-colors cursor-pointer ${
                    active
                      ? 'bg-[var(--ink)] text-[var(--paper-elevated)] border-[var(--ink)]'
                      : 'bg-[var(--paper-elevated)] text-[var(--ink-secondary)] border-[var(--rule)] hover:border-[var(--ink)] hover:text-[var(--ink)]'
                  }`}
                >
                  <div className="font-mono text-xs uppercase tracking-wider font-medium">
                    <span className={active ? 'text-[#FB923C] mr-1.5' : 'text-[var(--signal)] mr-1.5'}>
                      {d.number}
                    </span>
                    {d.title}
                  </div>
                  <div
                    className={`text-[11px] mt-0.5 line-clamp-1 ${
                      active ? 'text-[#C8C3B8]' : 'text-[var(--ink-muted)]'
                    }`}
                  >
                    {d.subtitle}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Synchronized Hardware Control Rail */}
        <div className="border border-[var(--ink)] bg-[var(--chassis)] p-4 mb-6 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
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

            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[var(--paper-elevated)] border border-[var(--rule)] hover:border-[var(--ink)] text-[var(--ink)] font-mono text-xs uppercase tracking-wider cursor-pointer"
              title="Copy shareable deep-link to this duel and step"
            >
              {copiedLink ? (
                <Check className="w-3.5 h-3.5 text-[var(--emerald)]" />
              ) : (
                <Link2 className="w-3.5 h-3.5 text-[var(--signal)]" />
              )}
              <span>{copiedLink ? 'Copied' : 'Copy Duel Link'}</span>
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
              {(duelId === 'raft-vs-paxos' || duelId === 'raft-vs-pbft') && (
                <RaftMiniScope raft={raft} />
              )}
              {duelId === '2pc-vs-saga' && <TwoPhaseMiniScope tpc={tpc} />}
              {duelId === 'lamport-vs-vector' && <LamportMiniScope lamport={lamport} />}
              {duelId === 'quorum-vs-crdts' && <QuorumMiniScope quorum={quorum} />}
              {duelId === 'hashing-vs-sharding' && <ConsistentHashingMiniScope hashing={hashing} />}
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
              {duelId === 'quorum-vs-crdts' && <CRDTMiniScope crdt={crdt} />}
              {duelId === 'hashing-vs-sharding' && <ShardingMiniScope sharding={sharding} />}
              {duelId === 'raft-vs-pbft' && <PBFTMiniScope pbft={pbft} />}
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

function QuorumMiniScope({ quorum }: { quorum: QuorumReplicationAlgorithm }) {
  const nodes = quorum.getNodes();
  const messages = quorum.getMessages();

  return (
    <svg viewBox="0 0 840 640" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
      <ScopeDefs idPrefix="duel-quorum" />
      <text x="28" y="38" fill={SCOPE_COLORS.inkMuted} fontSize="12" letterSpacing="0.1em">
        N=5 · W=3 · R=3 (W+R &gt; N) · HEALTHY {nodes.filter((n) => n.status === 'healthy').length}/5
      </text>
      {nodes.map((a, i) =>
        nodes.slice(i + 1).map((b) => (
          <line
            key={`dq-${a.id}-${b.id}`}
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
        const from =
          msg.from === 'repair'
            ? { position: { x: 420, y: 340 } }
            : nodes.find((n) => n.id === msg.from);
        const to = nodes.find((n) => n.id === msg.to);
        if (!from || !to) return null;
        const isRepair = msg.type === 'Repair';
        return (
          <ScopeEdge
            key={msg.id}
            idPrefix="duel-quorum"
            x1={from.position.x}
            y1={from.position.y}
            x2={to.position.x}
            y2={to.position.y}
            color={isRepair ? SCOPE_COLORS.amber : SCOPE_COLORS.cobalt}
            markerKey={isRepair ? 'amber' : 'cobalt'}
            inset={40}
            dashed={isRepair}
          />
        );
      })}
      {nodes.map((node) => {
        const isFailed = node.status === 'failed';
        const cart = node.data.get('cart');
        const accent = isFailed
          ? SCOPE_COLORS.danger
          : cart?.version && cart.version >= 2
          ? SCOPE_COLORS.emerald
          : cart
          ? SCOPE_COLORS.cobalt
          : SCOPE_COLORS.inkMuted;
        return (
          <ScopeNode
            key={node.id}
            x={node.position.x}
            y={node.position.y}
            radius={38}
            label={node.id}
            sublabel={isFailed ? 'DOWN' : cart ? `v${cart.version} = ${cart.value}` : 'EMPTY'}
            topTag={isFailed ? 'FAILED' : 'REPLICA'}
            bottomLine1={cart ? `KEY cart` : undefined}
            accentColor={accent}
            failed={isFailed}
            highlighted={Boolean(cart && cart.version >= 2)}
          />
        );
      })}
    </svg>
  );
}

function CRDTMiniScope({ crdt }: { crdt: CRDTAlgorithm }) {
  const replicas = crdt.getReplicas();
  const messages = crdt.getMessages();
  const stats = crdt.getStats();
  const coords = [
    { x: 420, y: 170 },
    { x: 610, y: 440 },
    { x: 230, y: 440 },
  ];

  const converged = stats.divergentGCounter === 0 && stats.divergentORSet === 0;

  return (
    <svg viewBox="0 0 840 620" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
      <ScopeDefs idPrefix="duel-crdt" />
      <text
        x="28"
        y="38"
        fill={converged ? SCOPE_COLORS.emerald : SCOPE_COLORS.amber}
        fontSize="12"
        letterSpacing="0.1em"
      >
        {converged
          ? 'STRONG EVENTUAL CONVERGENCE · ALL REPLICAS IDENTICAL'
          : `LOCAL DIVERGENCE ACTIVE · 0-RTT WRITES · ${stats.divergentGCounter} SKEWED`}
      </text>
      {coords.map((a, i) =>
        coords.slice(i + 1).map((b, j) => (
          <line
            key={`dc-${i}-${j}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={SCOPE_COLORS.hairlineSubtle}
            strokeWidth="1"
          />
        ))
      )}
      {messages.slice(-6).map((msg) => {
        const fromIdx = replicas.findIndex((r) => r.id === msg.from);
        const toIdx = replicas.findIndex((r) => r.id === msg.to);
        if (fromIdx < 0 || toIdx < 0) return null;
        return (
          <ScopeEdge
            key={msg.id}
            idPrefix="duel-crdt"
            x1={coords[fromIdx].x}
            y1={coords[fromIdx].y}
            x2={coords[toIdx].x}
            y2={coords[toIdx].y}
            color={msg.status === 'success' ? SCOPE_COLORS.emerald : SCOPE_COLORS.amber}
            markerKey={msg.status === 'success' ? 'emerald' : 'amber'}
            inset={48}
            dashed={msg.status === 'in-flight'}
            label="MERGE"
          />
        );
      })}
      {replicas.map((replica, idx) => {
        const total = crdt.getGCounterTotal(replica);
        const orSet = crdt.getORSetValues(replica);
        const vec = Object.keys(replica.gCounter)
          .sort()
          .map((k) => replica.gCounter[k])
          .join(',');
        return (
          <ScopeNode
            key={replica.id}
            x={coords[idx].x}
            y={coords[idx].y}
            radius={46}
            label={replica.id}
            sublabel={`SUM=${total} [${vec}]`}
            topTag="CRDT REPLICA"
            bottomLine1={orSet.length > 0 ? `{${orSet.join(', ')}}` : '{}'}
            accentColor={total > 0 ? (converged ? SCOPE_COLORS.emerald : SCOPE_COLORS.cobalt) : SCOPE_COLORS.inkMuted}
            highlighted={converged && total > 0}
          />
        );
      })}
    </svg>
  );
}

function ConsistentHashingMiniScope({ hashing }: { hashing: ConsistentHashingAlgorithm }) {
  const ring = hashing.getRing();
  const stats = hashing.getStats();
  const servers = hashing.getPhysicalServers();
  const cx = 420;
  const cy = 325;
  const radius = 195;
  const hashSpace = 2 ** 32;

  const palette = [
    SCOPE_COLORS.signal,
    SCOPE_COLORS.cobalt,
    SCOPE_COLORS.emerald,
    SCOPE_COLORS.amber,
  ];
  const colorForServer = (serverId?: string) => {
    const idx = servers.indexOf(serverId ?? '');
    return palette[(idx >= 0 ? idx : 0) % palette.length];
  };

  return (
    <svg viewBox="0 0 840 620" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
      <ScopeDefs idPrefix="duel-ch" />
      <text x="28" y="38" fill={SCOPE_COLORS.inkMuted} fontSize="12" letterSpacing="0.1em">
        SERVERS: {stats.physicalServers} · VNODES: {stats.totalNodes} · KEYS: {stats.totalKeys} ·
        IMBALANCE: {stats.loadStats.imbalance.toFixed(2)}×
      </text>

      {/* Main Hash Ring */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={SCOPE_COLORS.hairline}
        strokeWidth="2"
        strokeDasharray="6 4"
      />

      {/* Keys on Ring */}
      {ring.keys.map((k) => {
        const angle = (k.hashValue / hashSpace) * Math.PI * 2 - Math.PI / 2;
        const owner = ring.nodes.find((n) => n.id === k.nodeId);
        const kx = cx + (radius - 26) * Math.cos(angle);
        const ky = cy + (radius - 26) * Math.sin(angle);
        return (
          <circle
            key={k.key}
            cx={kx}
            cy={ky}
            r={5}
            fill={colorForServer(owner?.physicalNodeId)}
            opacity={0.9}
          />
        );
      })}

      {/* Virtual Nodes on Ring */}
      {ring.nodes.map((node) => {
        const angle = (node.hashValue / hashSpace) * Math.PI * 2 - Math.PI / 2;
        const nx = cx + radius * Math.cos(angle);
        const ny = cy + radius * Math.sin(angle);
        const color = colorForServer(node.physicalNodeId);
        return (
          <g key={node.id}>
            <circle cx={nx} cy={ny} r={11} fill="#161918" stroke={color} strokeWidth="2.5" />
            <text
              x={cx + (radius + 32) * Math.cos(angle)}
              y={cy + (radius + 32) * Math.sin(angle) + 4}
              textAnchor="middle"
              fill={color}
              fontSize="10"
              fontFamily="var(--font-ibm-plex-mono), monospace"
            >
              {node.id.replace('server-', 'S')}
            </text>
          </g>
        );
      })}

      {/* Center Load Summary */}
      <text
        x={cx}
        y={cy - 18}
        textAnchor="middle"
        fill={SCOPE_COLORS.inkMuted}
        fontSize="11"
        fontFamily="var(--font-ibm-plex-mono), monospace"
      >
        PHYSICAL LOAD
      </text>
      {servers.map((srv, idx) => (
        <text
          key={srv}
          x={cx}
          y={cy + 6 + idx * 20}
          textAnchor="middle"
          fill={colorForServer(srv)}
          fontSize="12"
          fontWeight="600"
          fontFamily="var(--font-ibm-plex-mono), monospace"
        >
          {srv.toUpperCase()}: {stats.loadDistribution.get(srv) ?? 0} keys
        </text>
      ))}
    </svg>
  );
}

function ShardingMiniScope({ sharding }: { sharding: ShardingRebalancingAlgorithm }) {
  const nodes = sharding.getNodes();
  const messages = sharding.getMessages();
  const stats = sharding.getStats();

  return (
    <svg viewBox="0 0 840 620" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
      <ScopeDefs idPrefix="duel-shard" />
      <text x="28" y="38" fill={SCOPE_COLORS.inkMuted} fontSize="12" letterSpacing="0.1em">
        STRATEGY: {stats.strategy.toUpperCase()} · NODES: {stats.totalNodes} · KEYS:{' '}
        {stats.totalKeys} · AVG {stats.avgLoad.toFixed(1)}/NODE
      </text>
      {messages.slice(-8).map((msg) => {
        const from = nodes.find((n) => n.id === msg.from);
        const to = nodes.find((n) => n.id === msg.to);
        if (!from || !to) return null;
        return (
          <ScopeEdge
            key={msg.id}
            idPrefix="duel-shard"
            x1={from.position.x}
            y1={from.position.y}
            x2={to.position.x}
            y2={to.position.y}
            color={SCOPE_COLORS.amber}
            markerKey="amber"
            inset={44}
            dashed={msg.status === 'in-flight'}
            label="MOVE"
          />
        );
      })}
      {nodes.map((node, idx) => {
        const range = node.shards[0];
        const hot = node.load > stats.avgLoad * 1.15;
        const accent = hot
          ? SCOPE_COLORS.signal
          : idx % 2 === 0
          ? SCOPE_COLORS.cobalt
          : SCOPE_COLORS.emerald;
        return (
          <ScopeNode
            key={node.id}
            x={node.position.x}
            y={node.position.y}
            radius={42}
            label={node.id}
            sublabel={range ? `[${range.start}–${range.end}]` : 'IDLE'}
            topTag={hot ? 'HOT SHARD' : 'RANGE SHARD'}
            bottomLine1={`LOAD ${node.load} KEYS`}
            accentColor={accent}
            highlighted={hot}
          />
        );
      })}
    </svg>
  );
}

function PBFTMiniScope({ pbft }: { pbft: PBFTAlgorithm }) {
  const nodes = pbft.getNodes();
  const messages = pbft.getMessages();
  const stats = pbft.getStats();

  return (
    <svg viewBox="0 0 840 640" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
      <ScopeDefs idPrefix="duel-pbft" />
      <text x="28" y="38" fill={SCOPE_COLORS.inkMuted} fontSize="12" letterSpacing="0.1em">
        VIEW v{stats.view} · 3f+1=4 (f=1) · QUORUM {stats.quorum} · EXECUTED {stats.executed}
      </text>
      {nodes.map((a, i) =>
        nodes.slice(i + 1).map((b) => (
          <line
            key={`dpb-${a.id}-${b.id}`}
            x1={a.position.x}
            y1={a.position.y}
            x2={b.position.x}
            y2={b.position.y}
            stroke={SCOPE_COLORS.hairlineSubtle}
            strokeWidth="1"
          />
        ))
      )}
      {messages.slice(-10).map((msg) => {
        const from = nodes.find((n) => n.id === msg.from);
        const to = nodes.find((n) => n.id === msg.to);
        if (!from || !to) return null;
        const color =
          msg.type === 'Commit'
            ? SCOPE_COLORS.emerald
            : msg.type === 'Prepare'
            ? SCOPE_COLORS.amber
            : SCOPE_COLORS.cobalt;
        const markerKey =
          msg.type === 'Commit' ? 'emerald' : msg.type === 'Prepare' ? 'amber' : 'cobalt';
        return (
          <ScopeEdge
            key={msg.id}
            idPrefix="duel-pbft"
            x1={from.position.x}
            y1={from.position.y}
            x2={to.position.x}
            y2={to.position.y}
            color={color}
            markerKey={markerKey}
            inset={42}
            dashed={msg.type === 'PrePrepare'}
          />
        );
      })}
      {nodes.map((node) => {
        const isFailed = node.status === 'failed';
        const isPrimary = !isFailed && node.role === 'primary';
        const hasExecuted = node.executed.length > 0;
        const latestPhase = Array.from(node.log.values()).at(-1)?.phase ?? 'idle';
        const accent = isFailed
          ? SCOPE_COLORS.danger
          : isPrimary
          ? SCOPE_COLORS.signal
          : hasExecuted
          ? SCOPE_COLORS.emerald
          : latestPhase === 'commit'
          ? SCOPE_COLORS.amber
          : SCOPE_COLORS.cobalt;
        return (
          <ScopeNode
            key={node.id}
            x={node.position.x}
            y={node.position.y}
            radius={40}
            label={node.id}
            sublabel={isFailed ? 'BYZ/DOWN' : latestPhase.toUpperCase()}
            topTag={isFailed ? 'FAULTY' : isPrimary ? `PRIMARY v${node.view}` : `REPLICA v${node.view}`}
            bottomLine1={`EXEC ${node.executed.length}`}
            accentColor={accent}
            failed={isFailed}
            highlighted={isPrimary || hasExecuted}
          />
        );
      })}
    </svg>
  );
}

