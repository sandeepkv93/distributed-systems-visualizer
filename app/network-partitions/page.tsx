'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { NetworkPartitionsAlgorithm } from '@/lib/algorithms/networkPartitions';
import { useSimulation } from '@/hooks/useSimulation';
import { useScenarioCompletion } from '@/hooks/useProgress';
import ControlPanel from '@/components/ControlPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import ExportMenu from '@/components/ExportMenu';
import { networkPartitionsScenarios } from '@/visualizers/network-partitions/scenarios';
import { PartitionLink, PartitionMessage, PartitionNode } from '@/lib/types';
import { ScopeDefs, ScopeNode, SCOPE_COLORS } from '@/components/ScopeSvgKit';
import WireTapInspector, { WireTapHint } from '@/components/WireTapInspector';
import InvariantMonitor from '@/components/InvariantMonitor';
import { evaluateNetworkPartitionInvariants } from '@/lib/invariants';
import WireLogDrawer from '@/components/WireLogDrawer';
import SpaceTimeScope, { ScopeMode, ScopeModeToggle } from '@/components/SpaceTimeScope';
import ChaosStrip from '@/components/ChaosStrip';
import {
  ChaosConfig,
  DEFAULT_CHAOS_CONFIG,
  applyChaosToMessages,
  computeDeliveryDelay,
} from '@/lib/chaos';

export default function NetworkPartitionsPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [np] = useState(() => new NetworkPartitionsAlgorithm(5));
  const [nodes, setNodes] = useState<PartitionNode[]>(np.getNodes());
  const [links, setLinks] = useState<PartitionLink[]>(np.getLinks());
  const [messages, setMessages] = useState<PartitionMessage[]>(np.getMessages());
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showArticle, setShowArticle] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [scopeMode, setScopeMode] = useState<ScopeMode>('topology');
  const [chaos, setChaos] = useState<ChaosConfig>(DEFAULT_CHAOS_CONFIG);
  const [droppedCount, setDroppedCount] = useState(0);
  const chaosRef = useRef<ChaosConfig>(DEFAULT_CHAOS_CONFIG);

  const handleChaosChange = useCallback((next: ChaosConfig) => {
    chaosRef.current = next;
    setChaos(next);
  }, []);

  const syncVisualization = useCallback(() => {
    setNodes([...np.getNodes()]);
    setLinks([...np.getLinks()]);
    setMessages([...np.getMessages()]);
  }, [np]);

  const simulation = useSimulation([], {
    snapshot: {
      capture: () => np.serialize(),
      restore: (snapshot) => {
        np.restore(snapshot);
        syncVisualization();
      },
    },
  });

  useScenarioCompletion('network-partitions', selectedScenario, simulation.state);

  const updateVisualization = useCallback(() => {
    syncVisualization();

    const inFlight = np.getMessages().filter((m) => m.status === 'in-flight');
    if (inFlight.length > 0) {
      const delayMs = computeDeliveryDelay(500, chaosRef.current.delayMultiplier);
      simulation.scheduleTimeout(() => {
        const { dropRate } = chaosRef.current;
        const { survivors, dropped } =
          dropRate > 0
            ? applyChaosToMessages(inFlight, dropRate)
            : { survivors: inFlight, dropped: [] };
        if (dropped.length > 0) {
          setDroppedCount((c) => c + dropped.length);
        }
        survivors.forEach((msg) => np.deliverMessage(msg.id));
        updateVisualization();
      }, delayMs);
    }
  }, [np, simulation, syncVisualization]);

  useEffect(() => {
    simulation.onEvent('partition', (event) => {
      np.split(event.data.partitionA, event.data.partitionB);
      updateVisualization();
    });

    simulation.onEvent('heal', () => {
      np.heal();
      updateVisualization();
    });

    simulation.onEvent('election', (event) => {
      np.startElection(event.data.partitionId);
      updateVisualization();
    });
  }, [np, simulation, updateVisualization]);

  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = networkPartitionsScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      np.reset();
      simulation.setEvents(scenario.events);
      updateVisualization();
    }
  };

  const split = () => {
    np.split(['N0', 'N1', 'N2'], ['N3', 'N4']);
    updateVisualization();
  };

  const heal = () => {
    np.heal();
    updateVisualization();
  };

  const electionA = () => {
    np.startElection('A');
    updateVisualization();
  };

  const electionB = () => {
    np.startElection('B');
    updateVisualization();
  };

  const getNodeColor = (node: PartitionNode): string => {
    if (node.role === 'leader') return SCOPE_COLORS.signal;
    if (node.role === 'candidate') return SCOPE_COLORS.amber;
    return node.partitionId === 'B' ? SCOPE_COLORS.amber : SCOPE_COLORS.cobalt;
  };

  const stats = np.getStats();
  const isSplitBrain = stats.leaders > 1;
  const inspectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId) ?? null
    : null;

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen bg-slate-900">
      <ControlPanel
        isPlaying={simulation.state.isPlaying}
        speed={simulation.state.speed}
        progress={simulation.getProgress()}
        scenarios={networkPartitionsScenarios}
        selectedScenario={selectedScenario}
        onPlay={simulation.play}
        onPause={simulation.pause}
        onStepForward={simulation.stepForward}
        onStepBackward={simulation.stepBackward}
        onReset={() => {
          simulation.reset();
          np.reset();
          updateVisualization();
        }}
        onSpeedChange={simulation.setSpeed}
        currentEventIndex={simulation.state.currentEventIndex}
        events={simulation.state.events}
        onScenarioChange={handleScenarioChange}
        onJumpToStep={simulation.jumpToStep}
      />

      <div className="flex-1 flex flex-col">
        <div className="bg-slate-800 border-b border-slate-700 p-4">
          <h1 className="text-2xl font-bold text-white">Network Partitions + Split-Brain</h1>
          <p className="text-slate-400 text-sm mt-1">
            Partitioned clusters and leader elections across splits
          </p>
          <div className="mt-3">
            <button
              onClick={() => setShowArticle(true)}
              className="px-3 py-1 text-sm bg-slate-700 text-white rounded hover:bg-slate-600"
            >
              Read the theory
            </button>
          </div>
          <div className="flex flex-wrap gap-6 mt-3 text-sm">
            <span className="text-slate-300">
              Leaders:{' '}
              <span className={`font-semibold ${isSplitBrain ? 'text-red-400' : 'text-green-400'}`}>
                {stats.leaders}
                {isSplitBrain ? ' (SPLIT-BRAIN)' : ''}
              </span>
            </span>
            <span className="text-slate-300">
              Partitions:{' '}
              <span className={`font-semibold ${stats.partitions > 1 ? 'text-amber-400' : 'text-white'}`}>
                {stats.partitions}
              </span>
            </span>
          </div>
        </div>

        <div className="flex-1 relative bg-slate-900 overflow-hidden min-h-[420px]">
          <InvariantMonitor
            protocolLabel="Network Partition Properties"
            checks={evaluateNetworkPartitionInvariants(nodes, stats)}
          />

          <div className="absolute top-4 right-4 z-20">
            <ExportMenu
              svgRef={svgRef}
              concept="Network Partitions + Split-Brain"
              currentState={{ scenario: selectedScenario, stats }}
            />
          </div>

          <WireLogDrawer
            protocol="Network Partitions + Split-Brain"
            scenario={selectedScenario}
            invariants={evaluateNetworkPartitionInvariants(nodes, stats)}
            frames={messages.map((m) => ({
              id: m.id,
              from: m.from,
              to: m.to,
              type: m.type,
              detail: m.payload?.term !== undefined ? `T${m.payload.term}` : undefined,
              status: m.status,
            }))}
          />

          <ScopeModeToggle
            mode={scopeMode}
            onChange={setScopeMode}
            frameCount={messages.length}
          />

          {scopeMode === 'topology' ? (
          <svg ref={svgRef} role="group" aria-label="Network partition split-brain quorum and isolation topology diagram" viewBox="0 0 840 680" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
            <ScopeDefs idPrefix="netpart" />

            {links.map((link) => {
              const fromNode = nodes.find((n) => n.id === link.from);
              const toNode = nodes.find((n) => n.id === link.to);
              if (!fromNode || !toNode) return null;
              const isDown = link.status !== 'up';
              return (
                <line
                  key={`${link.from}-${link.to}`}
                  x1={fromNode.position.x}
                  y1={fromNode.position.y}
                  x2={toNode.position.x}
                  y2={toNode.position.y}
                  stroke={isDown ? SCOPE_COLORS.danger : SCOPE_COLORS.hairline}
                  strokeWidth={isDown ? '1.3' : '1'}
                  strokeDasharray={isDown ? '4 5' : undefined}
                  opacity={isDown ? 0.5 : 0.75}
                />
              );
            })}

            {nodes.map((node) => {
              const haloColor =
                stats.partitions > 1
                  ? node.partitionId === 'A'
                    ? SCOPE_COLORS.cobalt
                    : SCOPE_COLORS.amber
                  : undefined;
              return (
                <ScopeNode
                  key={node.id}
                  x={node.position.x}
                  y={node.position.y}
                  radius={42}
                  label={node.id}
                  sublabel={`PART ${node.partitionId}`}
                  topTag={node.role.toUpperCase()}
                  bottomLine1={
                    node.role === 'leader' ? 'ELECTED LEADER' : `PARTITION ${node.partitionId}`
                  }
                  accentColor={getNodeColor(node)}
                  haloColor={haloColor}
                  highlighted={node.role === 'leader'}
                  selected={selectedNodeId === node.id}
                  onClick={() =>
                    setSelectedNodeId((prev) => (prev === node.id ? null : node.id))
                  }
                />
              );
            })}
          </svg>
          ) : (
            <SpaceTimeScope
              svgRef={svgRef}
              title="NETWORK PARTITIONS · SPLIT-BRAIN ELECTION WIRE TRACE"
              idPrefix="netpart-st"
              actors={nodes.map((node) => ({
                id: node.id,
                label: node.id,
                sublabel: `${node.role.toUpperCase()} · P${node.partitionId}`,
                color: getNodeColor(node),
              }))}
              frames={messages.map((msg) => ({
                id: msg.id,
                from: msg.from,
                to: msg.to,
                label: msg.payload?.term !== undefined ? `${msg.type} T${msg.payload.term}` : msg.type,
                color:
                  msg.type === 'Vote'
                    ? SCOPE_COLORS.emerald
                    : msg.type === 'Reject'
                    ? SCOPE_COLORS.danger
                    : msg.type === 'Heartbeat'
                    ? SCOPE_COLORS.cobalt
                    : SCOPE_COLORS.signal,
                status: msg.status,
                dashed: msg.type === 'Reject',
              }))}
            />
          )}

          {!inspectedNode && <WireTapHint text="Click any node to inspect partition membership & links" />}

          {inspectedNode && (
            <WireTapInspector
              title={`NODE ${inspectedNode.id}`}
              subtitle={`PARTITION ${inspectedNode.partitionId}`}
              status={
                inspectedNode.role === 'leader'
                  ? 'leader'
                  : inspectedNode.role === 'candidate'
                  ? 'candidate'
                  : 'healthy'
              }
              className="top-14 left-4"
              metrics={[
                { label: 'Role', value: inspectedNode.role.toUpperCase(), tone: 'signal' },
                { label: 'Partition', value: inspectedNode.partitionId, tone: 'cobalt' },
                {
                  label: 'Reachable',
                  value: `${
                    links.filter(
                      (l) =>
                        l.status === 'up' &&
                        (l.from === inspectedNode.id || l.to === inspectedNode.id)
                    ).length
                  } peers`,
                  tone: 'emerald',
                },
                {
                  label: 'Cluster',
                  value: isSplitBrain ? 'SPLIT-BRAIN' : stats.partitions > 1 ? 'PARTITIONED' : 'UNIFIED',
                  tone: isSplitBrain ? 'danger' : stats.partitions > 1 ? 'amber' : 'emerald',
                },
              ]}
              actions={[
                {
                  label: `Elect Part ${inspectedNode.partitionId}`,
                  onClick: () =>
                    inspectedNode.partitionId === 'B' ? electionB() : electionA(),
                  variant: 'signal',
                },
                stats.partitions > 1
                  ? { label: 'Heal Network', onClick: heal, variant: 'emerald' }
                  : { label: 'Split Network', onClick: split, variant: 'danger' },
              ]}
              onClose={() => setSelectedNodeId(null)}
            />
          )}

          <div className="absolute bottom-4 left-4 bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-2 max-w-xs">
            <h3 className="text-sm font-semibold text-white">Manual Controls</h3>
            <button
              onClick={split}
              className="w-full px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Split Network
            </button>
            <button
              onClick={heal}
              className="w-full px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              Heal Network
            </button>
            <button
              onClick={electionA}
              className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Election Partition A
            </button>
            <button
              onClick={electionB}
              className="w-full px-3 py-2 bg-[#D9441E] text-white text-sm rounded hover:bg-[#B83412]"
            >
              Election Partition B
            </button>
          </div>

          <ChaosStrip
            config={chaos}
            onChange={handleChaosChange}
            droppedCount={droppedCount}
            onResetDropped={() => setDroppedCount(0)}
          />
        </div>
      </div>

      <TopicArticleDrawer
        open={showArticle}
        title={topicArticles['network-partitions'].title}
        onClose={() => setShowArticle(false)}
      >
        {topicArticles['network-partitions'].sections.map((section) => (
          <div key={section.heading} className="mb-5">
            <h3 className="text-base font-semibold text-white mb-2">{section.heading}</h3>
            {section.body.map((para) => (
              <p key={para} className="text-sm text-slate-300 mb-2">
                {para}
              </p>
            ))}
          </div>
        ))}
      </TopicArticleDrawer>
    </div>
  );
}
