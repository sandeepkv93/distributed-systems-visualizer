'use client';

import { useState, useRef, useEffect } from 'react';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import ExportMenu from '@/components/ExportMenu';
import PredictionCheckpoint from '@/components/PredictionCheckpoint';
import { getCheckpointForConcept } from '@/lib/checkpoints';
import { useProgress } from '@/hooks/useProgress';
import { motion } from 'framer-motion';

type CAPProperty = 'C' | 'A' | 'P';
type CAPCombination = 'CA' | 'CP' | 'AP' | null;

interface System {
  name: string;
  position: { x: number; y: number };
  category: 'CA' | 'CP' | 'AP';
  description: string;
}

const realWorldSystems: System[] = [
  // CA Systems (Consistency + Availability, sacrifice Partition tolerance)
  {
    name: 'PostgreSQL',
    position: { x: 400, y: 150 },
    category: 'CA',
    description: 'Traditional RDBMS prioritizing ACID guarantees, single-node or coordinated clusters',
  },
  {
    name: 'MySQL',
    position: { x: 450, y: 180 },
    category: 'CA',
    description: 'Relational database with strong consistency in non-distributed setups',
  },

  // CP Systems (Consistency + Partition tolerance, sacrifice Availability)
  {
    name: 'HBase',
    position: { x: 250, y: 500 },
    category: 'CP',
    description: 'Distributed database prioritizing consistency, may become unavailable during partitions',
  },
  {
    name: 'MongoDB',
    position: { x: 300, y: 480 },
    category: 'CP',
    description: 'Document database with strong consistency, uses majority writes',
  },
  {
    name: 'Redis',
    position: { x: 350, y: 510 },
    category: 'CP',
    description: 'In-memory store, can be configured for strong consistency with partitioning',
  },

  // AP Systems (Availability + Partition tolerance, sacrifice Consistency)
  {
    name: 'Cassandra',
    position: { x: 550, y: 480 },
    category: 'AP',
    description: 'Distributed NoSQL with eventual consistency, always available',
  },
  {
    name: 'DynamoDB',
    position: { x: 600, y: 500 },
    category: 'AP',
    description: 'AWS managed database prioritizing availability and partition tolerance',
  },
  {
    name: 'Riak',
    position: { x: 650, y: 510 },
    category: 'AP',
    description: 'Distributed key-value store with tunable consistency, favors availability',
  },
];

const scenarios = {
  CA: {
    title: 'Consistency + Availability',
    description: 'System is consistent and available, but cannot tolerate network partitions',
    example: 'Traditional single-node databases like PostgreSQL',
    tradeoff: 'If network splits, system must choose between consistency or availability',
    useCase: 'Banking systems, financial transactions where consistency is critical',
  },
  CP: {
    title: 'Consistency + Partition Tolerance',
    description: 'System maintains consistency even during partitions, but may become unavailable',
    example: 'MongoDB, HBase with strong consistency settings',
    tradeoff: 'During partition, system may reject writes to maintain consistency',
    useCase: 'Distributed databases where data accuracy is more important than uptime',
  },
  AP: {
    title: 'Availability + Partition Tolerance',
    description: 'System remains available during partitions, but may have temporary inconsistencies',
    example: 'Cassandra, DynamoDB with eventual consistency',
    tradeoff: 'Data may be inconsistent across nodes until partition heals',
    useCase: 'Social media, shopping carts, where availability is critical',
  },
};

export default function CAPTheoremPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedCombination, setSelectedCombination] = useState<CAPCombination>(null);
  const [selectedSystem, setSelectedSystem] = useState<System | null>(null);
  const [exploredCombinations, setExploredCombinations] = useState<Set<'CA' | 'CP' | 'AP'>>(
    () => new Set()
  );
  const [showArticle, setShowArticle] = useState(false);
  const { completeConcept } = useProgress('cap-theorem');
  const capCheckpoint = getCheckpointForConcept('cap-theorem');

  // Triangle vertices
  const triangleVertices = {
    C: { x: 400, y: 100 }, // Top (Consistency)
    A: { x: 650, y: 550 }, // Bottom right (Availability)
    P: { x: 150, y: 550 }, // Bottom left (Partition Tolerance)
  };

  // Midpoints for CA, CP, AP
  const midpoints = {
    CA: {
      x: (triangleVertices.C.x + triangleVertices.A.x) / 2,
      y: (triangleVertices.C.y + triangleVertices.A.y) / 2,
    },
    CP: {
      x: (triangleVertices.C.x + triangleVertices.P.x) / 2,
      y: (triangleVertices.C.y + triangleVertices.P.y) / 2,
    },
    AP: {
      x: (triangleVertices.A.x + triangleVertices.P.x) / 2,
      y: (triangleVertices.A.y + triangleVertices.P.y) / 2,
    },
  };

  useEffect(() => {
    if (exploredCombinations.size === 3) {
      completeConcept('cap-theorem');
    }
  }, [exploredCombinations.size, completeConcept]);

  const recordCombinationExplored = (combo: 'CA' | 'CP' | 'AP') => {
    setExploredCombinations((prev) => {
      if (prev.has(combo)) return prev;
      const next = new Set(prev);
      next.add(combo);
      return next;
    });
  };

  const handleCombinationClick = (combo: CAPCombination) => {
    setSelectedCombination(selectedCombination === combo ? null : combo);
    setSelectedSystem(null);
    if (combo) {
      recordCombinationExplored(combo);
    }
  };

  const handleSystemClick = (system: System) => {
    setSelectedSystem(selectedSystem?.name === system.name ? null : system);
    setSelectedCombination(system.category);
    recordCombinationExplored(system.category);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen bg-slate-900">
      {/* Left Panel - Educational Content */}
      <div className="w-full md:w-96 bg-slate-800 border-b md:border-b-0 md:border-r border-slate-700 p-6 max-h-[45vh] md:max-h-none overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-4">CAP Theorem</h2>

        <div className="space-y-4 text-sm">
          <div className="bg-slate-700 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-2">The Theorem</h3>
            <p className="text-slate-300">
              In a distributed system, you can only guarantee <span className="text-blue-400 font-semibold">two</span> out
              of these three properties:
            </p>
          </div>

          <div className="space-y-3">
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <h4 className="font-semibold text-white">Consistency (C)</h4>
              </div>
              <p className="text-slate-300 text-xs">
                All nodes see the same data at the same time. Every read receives the most recent write.
              </p>
            </div>

            <div className="bg-slate-700 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <h4 className="font-semibold text-white">Availability (A)</h4>
              </div>
              <p className="text-slate-300 text-xs">
                Every request receives a response (success or failure). System remains operational.
              </p>
            </div>

            <div className="bg-slate-700 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full bg-[#D9441E]" />
                <h4 className="font-semibold text-white">Partition Tolerance (P)</h4>
              </div>
              <p className="text-slate-300 text-xs">
                System continues to operate despite network failures or message loss between nodes.
              </p>
            </div>
          </div>

          {selectedCombination && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-900/30 border border-amber-700 rounded-lg p-4"
            >
              <h3 className="font-semibold text-amber-400 mb-2">{scenarios[selectedCombination].title}</h3>
              <div className="space-y-2 text-xs text-slate-300">
                <p>
                  <span className="font-semibold">Description:</span> {scenarios[selectedCombination].description}
                </p>
                <p>
                  <span className="font-semibold">Example:</span> {scenarios[selectedCombination].example}
                </p>
                <p>
                  <span className="font-semibold">Trade-off:</span> {scenarios[selectedCombination].tradeoff}
                </p>
                <p>
                  <span className="font-semibold">Use Case:</span> {scenarios[selectedCombination].useCase}
                </p>
              </div>
            </motion.div>
          )}

          {selectedSystem && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-blue-900/30 border border-blue-700 rounded-lg p-4"
            >
              <h3 className="font-semibold text-blue-400 mb-2">{selectedSystem.name}</h3>
              <div className="space-y-2 text-xs text-slate-300">
                <p>
                  <span className="font-semibold">Category:</span> {selectedSystem.category}
                </p>
                <p>{selectedSystem.description}</p>
              </div>
            </motion.div>
          )}

          {capCheckpoint && <PredictionCheckpoint checkpoint={capCheckpoint} />}
        </div>
        </div>


        {/* Main Visualization Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 p-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">CAP Theorem Interactive Visualization</h1>
            <p className="text-slate-400 text-sm mt-1">
              Click on combinations or systems to explore trade-offs in distributed systems
            </p>
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={() => setShowArticle(true)}
                className="px-3 py-1 text-sm bg-slate-700 text-white rounded hover:bg-slate-600"
              >
                Read the theory
              </button>
              <span className="text-xs text-slate-300 bg-slate-700/70 px-2.5 py-1 rounded">
                Explored: {exploredCombinations.size}/3 trade-offs
              </span>
            </div>
          </div>
          <ExportMenu
            svgRef={svgRef}
            concept="CAP Theorem"
            currentState={{
              selectedCombination,
              selectedSystem: selectedSystem?.name,
            }}
          />
        </div>

        {/* Canvas */}
        <div className="flex-1 relative bg-slate-900 flex items-center justify-center min-h-[420px]">
          <svg ref={svgRef} viewBox="0 0 800 660" preserveAspectRatio="xMidYMid meet" className="w-full h-full">
            {/* Subtle geometric altitude construction lines */}
            <g stroke="rgba(244,240,232,0.08)" strokeWidth="1" strokeDasharray="3 5">
              <line x1={triangleVertices.C.x} y1={triangleVertices.C.y} x2={midpoints.AP.x} y2={midpoints.AP.y} />
              <line x1={triangleVertices.A.x} y1={triangleVertices.A.y} x2={midpoints.CP.x} y2={midpoints.CP.y} />
              <line x1={triangleVertices.P.x} y1={triangleVertices.P.y} x2={midpoints.CA.x} y2={midpoints.CA.y} />
            </g>

            {/* Triangle base frame */}
            <motion.polygon
              points={`${triangleVertices.C.x},${triangleVertices.C.y} ${triangleVertices.A.x},${triangleVertices.A.y} ${triangleVertices.P.x},${triangleVertices.P.y}`}
              fill="rgba(244,240,232,0.02)"
              stroke="rgba(244,240,232,0.28)"
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8 }}
            />

            {/* Highlighted active trade-off edge */}
            {selectedCombination && (
              <motion.line
                key={`edge-${selectedCombination}`}
                x1={
                  selectedCombination === 'CA'
                    ? triangleVertices.C.x
                    : selectedCombination === 'CP'
                    ? triangleVertices.C.x
                    : triangleVertices.A.x
                }
                y1={
                  selectedCombination === 'CA'
                    ? triangleVertices.C.y
                    : selectedCombination === 'CP'
                    ? triangleVertices.C.y
                    : triangleVertices.A.y
                }
                x2={
                  selectedCombination === 'CA'
                    ? triangleVertices.A.x
                    : selectedCombination === 'CP'
                    ? triangleVertices.P.x
                    : triangleVertices.P.x
                }
                y2={
                  selectedCombination === 'CA'
                    ? triangleVertices.A.y
                    : selectedCombination === 'CP'
                    ? triangleVertices.P.y
                    : triangleVertices.P.y
                }
                stroke={
                  selectedCombination === 'CA'
                    ? '#60A5FA'
                    : selectedCombination === 'CP'
                    ? '#D9441E'
                    : '#34D399'
                }
                strokeWidth="3.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.35 }}
              />
            )}

            {/* Vertices - C, A, P (precision double-ring instrument bezels) */}
            {(['C', 'A', 'P'] as CAPProperty[]).map((property) => {
              const vertex = triangleVertices[property];
              const colors = { C: '#60A5FA', A: '#34D399', P: '#D9441E' };
              const labels = {
                C: 'CONSISTENCY',
                A: 'AVAILABILITY',
                P: 'PARTITION TOLERANCE',
              };

              return (
                <motion.g
                  key={property}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <circle
                    cx={vertex.x}
                    cy={vertex.y}
                    r="52"
                    fill="none"
                    stroke={colors[property]}
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    opacity="0.45"
                  />
                  <circle
                    cx={vertex.x}
                    cy={vertex.y}
                    r="44"
                    fill="#161A18"
                    stroke={colors[property]}
                    strokeWidth="2.5"
                  />
                  <text
                    x={vertex.x}
                    y={vertex.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#F4F0E8"
                    fontSize="24"
                    fontWeight="600"
                  >
                    {property}
                  </text>
                  <text
                    x={vertex.x}
                    y={vertex.y + (property === 'C' ? -68 : 70)}
                    textAnchor="middle"
                    fill={colors[property]}
                    fontSize="11.5"
                    fontWeight="600"
                    letterSpacing="0.14em"
                  >
                    {labels[property]}
                  </text>
                </motion.g>
              );
            })}

            {/* Combination zones (CA, CP, AP) */}
            {(['CA', 'CP', 'AP'] as CAPCombination[]).map((combo) => {
              if (!combo) return null;
              const midpoint = midpoints[combo];
              const isSelected = selectedCombination === combo;
              const comboColor =
                combo === 'CA' ? '#60A5FA' : combo === 'CP' ? '#D9441E' : '#34D399';

              return (
                <motion.g
                  key={combo}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.35 }}
                  className="cursor-pointer"
                  onClick={() => handleCombinationClick(combo)}
                >
                  <circle
                    cx={midpoint.x}
                    cy={midpoint.y}
                    r={isSelected ? 34 : 28}
                    fill={isSelected ? comboColor : '#151917'}
                    stroke={comboColor}
                    strokeWidth={isSelected ? '2.5' : '1.6'}
                  />
                  <text
                    x={midpoint.x}
                    y={midpoint.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={isSelected ? '#111413' : '#F4F0E8'}
                    fontSize="14"
                    fontWeight="700"
                  >
                    {combo}
                  </text>
                </motion.g>
              );
            })}

            {/* Real-world systems */}
            {realWorldSystems
              .filter(
                (system) =>
                  !selectedCombination || selectedCombination === system.category
              )
              .map((system, index) => {
                const isSelected = selectedSystem?.name === system.name;
                const colors = { CA: '#60A5FA', CP: '#D9441E', AP: '#34D399' };

                return (
                  <motion.g
                    key={system.name}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35, delay: index * 0.05 }}
                    className="cursor-pointer"
                    onClick={() => handleSystemClick(system)}
                  >
                    {isSelected && (
                      <circle
                        cx={system.position.x}
                        cy={system.position.y}
                        r="27"
                        fill="none"
                        stroke="#F4F0E8"
                        strokeWidth="1.2"
                        strokeDasharray="3 3"
                      />
                    )}
                    <circle
                      cx={system.position.x}
                      cy={system.position.y}
                      r={isSelected ? 21 : 17}
                      fill="#171B19"
                      stroke={colors[system.category]}
                      strokeWidth={isSelected ? '2.4' : '1.8'}
                    />
                    <text
                      x={system.position.x}
                      y={system.position.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={colors[system.category]}
                      fontSize="9"
                      fontWeight="600"
                    >
                      {system.category}
                    </text>
                    <text
                      x={system.position.x}
                      y={system.position.y + 32}
                      textAnchor="middle"
                      fill={isSelected ? '#F4F0E8' : colors[system.category]}
                      fontSize="10.5"
                      fontWeight={isSelected ? '700' : '500'}
                    >
                      {system.name}
                    </text>
                  </motion.g>
                );
              })}

            {/* Legend */}
            <g transform="translate(36, 44)">
              <text x="0" y="0" fill="#9E9B90" fontSize="10" fontWeight="600" letterSpacing="0.12em">
                REAL-WORLD SYSTEMS
              </text>
              <g transform="translate(0, 20)">
                <circle cx="5" cy="0" r="4.5" fill="#171B19" stroke="#60A5FA" strokeWidth="1.8" />
                <text x="16" y="4" fill="#D6D2C7" fontSize="10.5">
                  CA Systems
                </text>
              </g>
              <g transform="translate(0, 38)">
                <circle cx="5" cy="0" r="4.5" fill="#171B19" stroke="#D9441E" strokeWidth="1.8" />
                <text x="16" y="4" fill="#D6D2C7" fontSize="10.5">
                  CP Systems
                </text>
              </g>
              <g transform="translate(0, 56)">
                <circle cx="5" cy="0" r="4.5" fill="#171B19" stroke="#34D399" strokeWidth="1.8" />
                <text x="16" y="4" fill="#D6D2C7" fontSize="10.5">
                  AP Systems
                </text>
              </g>
            </g>
          </svg>

          {/* Info box */}
          <div className="absolute bottom-4 left-4 bg-slate-800 rounded-lg p-4 border border-slate-700 max-w-md">
            <h3 className="text-sm font-semibold text-white mb-2">Why Only 2 of 3?</h3>
            <p className="text-xs text-slate-300 mb-2">
              In a distributed system with network partitions (P is unavoidable in real networks), you must choose
              between:
            </p>
            <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
              <li>
                <span className="font-semibold text-[#F97316]">CP</span>: Reject writes during partition to maintain
                consistency (sacrifice availability)
              </li>
              <li>
                <span className="font-semibold text-[#34D399]">AP</span>: Accept writes on both sides of partition,
                deal with conflicts later (sacrifice consistency)
              </li>
            </ul>
            <p className="text-xs text-slate-400 mt-2 italic">
              Note: CA systems are essentially non-distributed systems (single-node or tightly-coupled clusters)
            </p>
          </div>
        </div>
      </div>

      <TopicArticleDrawer
        open={showArticle}
        title={topicArticles['cap-theorem'].title}
        onClose={() => setShowArticle(false)}
      >
        {topicArticles['cap-theorem'].sections.map((section) => (
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
