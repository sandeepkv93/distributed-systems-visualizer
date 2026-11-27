'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scissors, Plus, RotateCcw } from 'lucide-react';

interface MiniNode {
  id: string;
  label: string;
  x: number;
  y: number;
  side: 'left' | 'right';
  alive: boolean;
  logIndex: number;
}

interface PulsePacket {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  kind: 'heartbeat' | 'append';
}

const INITIAL_NODES: MiniNode[] = [
  { id: 'n1', label: 'N1', x: 86, y: 112, side: 'left', alive: true, logIndex: 3 },
  { id: 'n2', label: 'N2', x: 102, y: 216, side: 'left', alive: true, logIndex: 3 },
  { id: 'n3', label: 'N3', x: 264, y: 84, side: 'right', alive: true, logIndex: 3 },
  { id: 'n4', label: 'N4', x: 356, y: 158, side: 'right', alive: true, logIndex: 3 },
  { id: 'n5', label: 'N5', x: 268, y: 234, side: 'right', alive: true, logIndex: 3 },
];

export default function HeroSimulation() {
  const [nodes, setNodes] = useState<MiniNode[]>(INITIAL_NODES);
  const [partitioned, setPartitioned] = useState(false);
  const [term, setTerm] = useState(1);
  const [leaderId, setLeaderId] = useState<string | null>('n1');
  const [commitIndex, setCommitIndex] = useState(3);
  const [pulses, setPulses] = useState<PulsePacket[]>([]);
  const [lastTrace, setLastTrace] = useState('Leader N1 replicating heartbeats · Quorum 5/5');
  const pulseTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    const timers = pulseTimersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const getReachablePeers = useCallback(
    (source: MiniNode, allNodes: MiniNode[], isPartitioned: boolean) => {
      return allNodes.filter((n) => {
        if (!n.alive) return false;
        if (isPartitioned && n.side !== source.side) return false;
        return true;
      });
    },
    []
  );

  // Resolve leader & quorum state whenever topology changes
  const resolveCluster = useCallback(
    (nextNodes: MiniNode[], nextPartitioned: boolean, currentLeaderId: string | null, currentTerm: number) => {
      const currentLeader = nextNodes.find((n) => n.id === currentLeaderId && n.alive) ?? null;

      if (currentLeader) {
        const reachable = getReachablePeers(currentLeader, nextNodes, nextPartitioned);
        if (reachable.length >= 3) {
          return {
            leaderId: currentLeader.id,
            term: currentTerm,
            quorumCount: reachable.length,
            trace: `Leader ${currentLeader.label} active · Quorum ${reachable.length}/5`,
          };
        }
      }

      // Check if any partition has a majority (>= 3 alive nodes)
      const groups: MiniNode[][] = nextPartitioned
        ? [
            nextNodes.filter((n) => n.side === 'left' && n.alive),
            nextNodes.filter((n) => n.side === 'right' && n.alive),
          ]
        : [nextNodes.filter((n) => n.alive)];

      const majorityGroup = groups.find((g) => g.length >= 3);
      if (majorityGroup) {
        const elected = majorityGroup[0];
        const nextTerm = currentTerm + 1;
        return {
          leaderId: elected.id,
          term: nextTerm,
          quorumCount: majorityGroup.length,
          trace: `Term ${nextTerm}: ${elected.label} elected with ${majorityGroup.length}/5 votes`,
        };
      }

      return {
        leaderId: null,
        term: currentTerm,
        quorumCount: Math.max(...groups.map((g) => g.length), 0),
        trace: 'Quorum lost (< 3 reachable nodes) · Writes halted',
      };
    },
    [getReachablePeers]
  );

  const firePulses = useCallback(
    (from: MiniNode, targets: MiniNode[], kind: 'heartbeat' | 'append') => {
      const batchId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newPulses: PulsePacket[] = targets
        .filter((t) => t.id !== from.id)
        .map((t) => ({
          id: `${batchId}-${t.id}`,
          fromX: from.x,
          fromY: from.y,
          toX: t.x,
          toY: t.y,
          kind,
        }));
      if (newPulses.length === 0) return;
      setPulses((prev) => [...prev.slice(-8), ...newPulses]);
      const timer = setTimeout(() => {
        pulseTimersRef.current.delete(timer);
        setPulses((prev) => prev.filter((p) => !p.id.startsWith(batchId)));
      }, 850);
      pulseTimersRef.current.add(timer);
    },
    []
  );

  // Periodic subtle heartbeat from active leader (paused when browser tab is hidden)
  useEffect(() => {
    if (!leaderId) return;
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      const leader = nodes.find((n) => n.id === leaderId && n.alive);
      if (!leader) return;
      const reachable = getReachablePeers(leader, nodes, partitioned);
      if (reachable.length >= 3) {
        firePulses(leader, reachable, 'heartbeat');
      }
    }, 2400);
    return () => clearInterval(interval);
  }, [leaderId, nodes, partitioned, getReachablePeers, firePulses]);

  const toggleNode = (id: string) => {
    const nextNodes = nodes.map((n) => (n.id === id ? { ...n, alive: !n.alive } : n));
    const result = resolveCluster(nextNodes, partitioned, leaderId, term);
    setNodes(nextNodes);
    setLeaderId(result.leaderId);
    setTerm(result.term);
    setLastTrace(result.trace);
  };

  const togglePartition = () => {
    const nextPartitioned = !partitioned;
    const result = resolveCluster(nodes, nextPartitioned, leaderId, term);
    setPartitioned(nextPartitioned);
    setLeaderId(result.leaderId);
    setTerm(result.term);
    if (!nextPartitioned && result.leaderId) {
      // Catch up lagging healthy nodes when partition heals
      setNodes((prev) => prev.map((n) => (n.alive ? { ...n, logIndex: commitIndex } : n)));
      setLastTrace(`Partition healed · All live replicas synced to log #${commitIndex}`);
    } else {
      setLastTrace(
        nextPartitioned
          ? `Split [N1,N2] | [N3,N4,N5] · ${result.trace}`
          : result.trace
      );
    }
  };

  const appendEntry = () => {
    const leader = nodes.find((n) => n.id === leaderId && n.alive);
    if (!leader) {
      setLastTrace('Append rejected · No leader holds a majority quorum');
      return;
    }
    const reachable = getReachablePeers(leader, nodes, partitioned);
    if (reachable.length < 3) {
      setLastTrace('Append rejected · Partition has fewer than 3 live nodes');
      return;
    }
    const nextCommit = commitIndex + 1;
    const reachableIds = new Set(reachable.map((n) => n.id));
    setNodes((prev) =>
      prev.map((n) => (reachableIds.has(n.id) ? { ...n, logIndex: nextCommit } : n))
    );
    setCommitIndex(nextCommit);
    firePulses(leader, reachable, 'append');
    setLastTrace(`Committed log #${nextCommit} across ${reachable.length}/5 nodes (Term ${term})`);
  };

  const resetDemo = () => {
    setNodes(INITIAL_NODES);
    setPartitioned(false);
    setTerm(1);
    setLeaderId('n1');
    setCommitIndex(3);
    setPulses([]);
    setLastTrace('Cluster reset · Leader N1 replicating heartbeats · Quorum 5/5');
  };

  const activeLeader = useMemo(
    () => nodes.find((n) => n.id === leaderId && n.alive) ?? null,
    [nodes, leaderId]
  );

  const quorumCount = useMemo(() => {
    if (!activeLeader) {
      return nodes.filter((n) => n.alive).length;
    }
    return getReachablePeers(activeLeader, nodes, partitioned).length;
  }, [activeLeader, nodes, partitioned, getReachablePeers]);

  const hasQuorum = activeLeader !== null && quorumCount >= 3;

  return (
    <div className="border border-[var(--ink)] bg-[var(--chassis)] shadow-[6px_6px_0_0_var(--ink)]">
      {/* Instrument Bezel Top Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-[var(--rule)] bg-[var(--paper-elevated)] font-mono text-[11px] tracking-wide uppercase">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              hasQuorum ? 'bg-[#10B981]' : 'bg-[var(--signal)]'
            }`}
          />
          <span className="font-semibold text-[var(--ink)]">LIVE BENCH · RAFT QUORUM</span>
        </div>
        <div className="flex items-center gap-3 text-[var(--ink-muted)] tabular-nums">
          <span>TERM {String(term).padStart(2, '0')}</span>
          <span>LOG #{commitIndex}</span>
        </div>
      </div>

      {/* Recessed Obsidian Oscilloscope Screen */}
      <div className="relative scope-viewport select-none">
        {/* Corner telemetry micro-labels */}
        <div className="absolute top-2.5 left-3 z-10 font-mono text-[10px] tracking-widest uppercase text-[#9E9B90]">
          CLICK ANY NODE TO CRASH / RECOVER
        </div>
        <div
          className={`absolute top-2.5 right-3 z-10 font-mono text-[10px] tracking-widest uppercase ${
            hasQuorum ? 'text-[#34D399]' : 'text-[#F87171]'
          }`}
        >
          {hasQuorum ? `QUORUM ${quorumCount}/5` : 'NO QUORUM'}
        </div>

        <svg
          viewBox="0 0 430 300"
          className="w-full h-[250px] sm:h-[280px] block"
          role="img"
          aria-label="Interactive 5-node Raft quorum simulation"
        >
          {/* Subtle calibration corner brackets */}
          <g stroke="rgba(244,240,232,0.22)" strokeWidth="1" fill="none">
            <path d="M12 22V12H22" />
            <path d="M408 12H418V22" />
            <path d="M12 278V288H22" />
            <path d="M408 288H418V278" />
          </g>

          {/* Mesh links */}
          {nodes.map((a, i) =>
            nodes.slice(i + 1).map((b) => {
              const severed = partitioned && a.side !== b.side;
              const bothAlive = a.alive && b.alive;
              const touchesLeader =
                activeLeader && (a.id === activeLeader.id || b.id === activeLeader.id);

              return (
                <line
                  key={`${a.id}-${b.id}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={
                    severed
                      ? 'rgba(217, 68, 30, 0.14)'
                      : touchesLeader && bothAlive
                      ? 'rgba(244, 240, 232, 0.28)'
                      : 'rgba(244, 240, 232, 0.09)'
                  }
                  strokeWidth={touchesLeader && bothAlive && !severed ? 1.4 : 1}
                  strokeDasharray={severed ? '3 5' : undefined}
                />
              );
            })
          )}

          {/* Network partition cut line */}
          <AnimatePresence>
            {partitioned && (
              <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <line
                  x1="184"
                  y1="38"
                  x2="184"
                  y2="274"
                  stroke="#D9441E"
                  strokeWidth="1.75"
                  strokeDasharray="6 5"
                />
                <rect x="148" y="256" width="72" height="17" fill="#111413" stroke="#D9441E" strokeWidth="1" />
                <text
                  x="184"
                  y="268"
                  textAnchor="middle"
                  fill="#F87171"
                  fontSize="9"
                  fontFamily="var(--font-mono), monospace"
                >
                  NET SPLIT
                </text>
              </motion.g>
            )}
          </AnimatePresence>

          {/* Animated message pulses */}
          {pulses.map((pulse) => (
            <motion.circle
              key={pulse.id}
              r={pulse.kind === 'append' ? 4.2 : 2.8}
              fill={pulse.kind === 'append' ? '#34D399' : '#D9441E'}
              initial={{ cx: pulse.fromX, cy: pulse.fromY, opacity: 1 }}
              animate={{ cx: pulse.toX, cy: pulse.toY, opacity: 0.15 }}
              transition={{ duration: 0.72, ease: 'easeOut' }}
            />
          ))}

          {/* Interactive Cluster Nodes */}
          {nodes.map((node) => {
            const isLeader = node.id === activeLeader?.id;
            const isMinority = partitioned && node.side === 'left' && node.alive;

            const ringColor = !node.alive
              ? '#57534E'
              : isLeader
              ? '#D9441E'
              : isMinority
              ? '#D97706'
              : '#34D399';

            return (
              <g
                key={node.id}
                onClick={() => toggleNode(node.id)}
                className="cursor-pointer group"
                role="button"
                tabIndex={0}
                aria-label={`Toggle node ${node.label} (${node.alive ? 'alive' : 'failed'})`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleNode(node.id);
                  }
                }}
              >
                {/* Leader outer halo ring */}
                {isLeader && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="28"
                    fill="none"
                    stroke="#D9441E"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    opacity="0.7"
                  />
                )}

                <circle
                  cx={node.x}
                  cy={node.y}
                  r="22"
                  fill={!node.alive ? '#1C1D1B' : isLeader ? '#2B1610' : '#171C1A'}
                  stroke={ringColor}
                  strokeWidth={isLeader ? '2.2' : '1.6'}
                />

                {/* Cross mark when crashed */}
                {!node.alive && (
                  <path
                    d={`M${node.x - 10} ${node.y - 10}L${node.x + 10} ${node.y + 10}M${node.x + 10} ${node.y - 10}L${node.x - 10} ${node.y + 10}`}
                    stroke="#EF4444"
                    strokeWidth="1.5"
                    opacity="0.65"
                  />
                )}

                <text
                  x={node.x}
                  y={node.y - 2}
                  textAnchor="middle"
                  fill={node.alive ? '#F4F0E8' : '#78716C'}
                  fontSize="12"
                  fontWeight="600"
                  fontFamily="var(--font-mono), monospace"
                >
                  {node.label}
                </text>
                <text
                  x={node.x}
                  y={node.y + 11}
                  textAnchor="middle"
                  fill={
                    !node.alive
                      ? '#EF4444'
                      : isLeader
                      ? '#FB923C'
                      : isMinority
                      ? '#FBBF24'
                      : '#9CA3AF'
                  }
                  fontSize="8.5"
                  fontFamily="var(--font-mono), monospace"
                >
                  {!node.alive
                    ? 'DOWN'
                    : isLeader
                    ? 'LEADER'
                    : isMinority
                    ? 'STALLED'
                    : `LOG #${node.logIndex}`}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Live Telemetry Readout Strip */}
        <div
          aria-live="polite"
          aria-atomic="true"
          className="px-3.5 py-2 border-t border-[rgba(244,240,232,0.12)] bg-[#0C0E0D] font-mono text-[11px] text-[#D6D2C7] flex items-center justify-between gap-2"
        >
          <span className="truncate" title={lastTrace}>
            {lastTrace}
          </span>
        </div>
      </div>

      {/* Physical Hardware Control Strip */}
      <div className="p-2.5 flex flex-wrap items-center gap-2 bg-[var(--chassis)] border-t border-[var(--rule)]">
        <button
          type="button"
          onClick={appendEntry}
          className="flex-1 min-w-[110px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[var(--signal)] hover:bg-[var(--signal-hover)] text-[#FAF7F1] font-mono text-xs font-medium tracking-wide uppercase transition-colors cursor-pointer active:translate-y-px"
        >
          <Plus className="w-3.5 h-3.5" />
          Append Log
        </button>
        <button
          type="button"
          onClick={togglePartition}
          className={`flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border font-mono text-xs font-medium tracking-wide uppercase transition-colors cursor-pointer active:translate-y-px ${
            partitioned
              ? 'bg-[var(--ink)] text-[var(--paper-elevated)] border-[var(--ink)]'
              : 'bg-[var(--paper-elevated)] text-[var(--ink)] border-[rgba(22,22,20,0.3)] hover:border-[var(--ink)]'
          }`}
        >
          <Scissors className="w-3.5 h-3.5" />
          {partitioned ? 'Heal Split' : 'Split Network'}
        </button>
        <button
          type="button"
          onClick={resetDemo}
          className="inline-flex items-center justify-center p-1.5 bg-[var(--paper-elevated)] text-[var(--ink)] border border-[rgba(22,22,20,0.28)] hover:border-[var(--ink)] transition-colors cursor-pointer active:translate-y-px"
          title="Reset cluster"
          aria-label="Reset cluster"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
