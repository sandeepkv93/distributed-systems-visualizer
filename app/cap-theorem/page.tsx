'use client';

import { useState } from 'react';
import { useClaudeExplainer } from '@/hooks/useClaudeExplainer';
import ExplanationPanel from '@/components/ExplanationPanel';
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
  const [selectedCombination, setSelectedCombination] = useState<CAPCombination>(null);
  const [selectedSystem, setSelectedSystem] = useState<System | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const claude = useClaudeExplainer('CAP Theorem');

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

  const handleCombinationClick = (combo: CAPCombination) => {
    setSelectedCombination(selectedCombination === combo ? null : combo);
    setSelectedSystem(null);
  };

  const handleSystemClick = (system: System) => {
    setSelectedSystem(selectedSystem?.name === system.name ? null : system);
    setSelectedCombination(system.category);
  };

  const handleAskClaude = async (question: string) => {
    setShowExplanation(true);
    const currentState = {
      selectedCombination,
      selectedSystem: selectedSystem?.name,
      theorem: 'CAP Theorem states you can only have 2 of 3: Consistency, Availability, Partition Tolerance',
    };
    await claude.explain(currentState, question);
  };

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Left Panel - Educational Content */}
      <div className="w-96 bg-slate-800 border-r border-slate-700 p-6 overflow-y-auto">
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
                <div className="w-3 h-3 rounded-full bg-purple-500" />
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

          <div className="border-t border-slate-600 pt-4">
            <h3 className="font-semibold text-white mb-2">Ask Claude</h3>
            <input
              type="text"
              placeholder="Ask about CAP theorem..."
              className="w-full px-3 py-2 bg-slate-700 text-white text-sm rounded border border-slate-600 focus:outline-none focus:border-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  handleAskClaude(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Visualization Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-slate-800 border-b border-slate-700 p-4">
          <h1 className="text-2xl font-bold text-white">CAP Theorem Interactive Visualization</h1>
          <p className="text-slate-400 text-sm mt-1">
            Click on combinations or systems to explore trade-offs in distributed systems
          </p>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative bg-slate-900 flex items-center justify-center">
          <svg className="w-full h-full">
            {/* Triangle */}
            <motion.polygon
              points={`${triangleVertices.C.x},${triangleVertices.C.y} ${triangleVertices.A.x},${triangleVertices.A.y} ${triangleVertices.P.x},${triangleVertices.P.y}`}
              fill="none"
              stroke="#475569"
              strokeWidth="3"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1 }}
            />

            {/* Vertices - C, A, P */}
            {(['C', 'A', 'P'] as CAPProperty[]).map((property) => {
              const vertex = triangleVertices[property];
              const colors = { C: '#3B82F6', A: '#10B981', P: '#8B5CF6' };
              const labels = {
                C: 'Consistency',
                A: 'Availability',
                P: 'Partition Tolerance',
              };

              return (
                <motion.g
                  key={property}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <circle cx={vertex.x} cy={vertex.y} r="50" fill={colors[property]} opacity="0.9" />
                  <text
                    x={vertex.x}
                    y={vertex.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#FFF"
                    fontSize="24"
                    fontWeight="bold"
                  >
                    {property}
                  </text>
                  <text
                    x={vertex.x}
                    y={vertex.y + (property === 'C' ? -70 : 70)}
                    textAnchor="middle"
                    fill={colors[property]}
                    fontSize="14"
                    fontWeight="semibold"
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

              return (
                <motion.g
                  key={combo}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  className="cursor-pointer"
                  onClick={() => handleCombinationClick(combo)}
                >
                  <circle
                    cx={midpoint.x}
                    cy={midpoint.y}
                    r={isSelected ? 35 : 30}
                    fill={isSelected ? '#F59E0B' : '#1F2937'}
                    stroke={isSelected ? '#F59E0B' : '#475569'}
                    strokeWidth="2"
                    opacity={isSelected ? 1 : 0.7}
                  />
                  <text
                    x={midpoint.x}
                    y={midpoint.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#FFF"
                    fontSize="16"
                    fontWeight="bold"
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
                const colors = { CA: '#3B82F6', CP: '#8B5CF6', AP: '#10B981' };

                return (
                  <motion.g
                    key={system.name}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                    className="cursor-pointer"
                    onClick={() => handleSystemClick(system)}
                  >
                    <circle
                      cx={system.position.x}
                      cy={system.position.y}
                      r={isSelected ? 25 : 20}
                      fill={colors[system.category]}
                      stroke="#1F2937"
                      strokeWidth="2"
                      opacity={isSelected ? 1 : 0.8}
                    />
                    <text
                      x={system.position.x}
                      y={system.position.y + 35}
                      textAnchor="middle"
                      fill={colors[system.category]}
                      fontSize="11"
                      fontWeight={isSelected ? 'bold' : 'normal'}
                    >
                      {system.name}
                    </text>
                  </motion.g>
                );
              })}

            {/* Legend */}
            <g transform="translate(50, 50)">
              <text x="0" y="0" fill="#CBD5E1" fontSize="12" fontWeight="semibold">
                Real-World Systems:
              </text>
              <g transform="translate(0, 20)">
                <circle cx="5" cy="0" r="5" fill="#3B82F6" />
                <text x="15" y="5" fill="#CBD5E1" fontSize="11">
                  CA Systems
                </text>
              </g>
              <g transform="translate(0, 35)">
                <circle cx="5" cy="0" r="5" fill="#8B5CF6" />
                <text x="15" y="5" fill="#CBD5E1" fontSize="11">
                  CP Systems
                </text>
              </g>
              <g transform="translate(0, 50)">
                <circle cx="5" cy="0" r="5" fill="#10B981" />
                <text x="15" y="5" fill="#CBD5E1" fontSize="11">
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
                <span className="font-semibold text-purple-400">CP</span>: Reject writes during partition to maintain
                consistency (sacrifice availability)
              </li>
              <li>
                <span className="font-semibold text-green-400">AP</span>: Accept writes on both sides of partition,
                deal with conflicts later (sacrifice consistency)
              </li>
            </ul>
            <p className="text-xs text-slate-400 mt-2 italic">
              Note: CA systems are essentially non-distributed systems (single-node or tightly-coupled clusters)
            </p>
          </div>
        </div>
      </div>

      {/* Explanation Panel */}
      {showExplanation && (
        <ExplanationPanel
          explanation={claude.explanation}
          isLoading={claude.isLoading}
          error={claude.error}
          onClose={() => {
            setShowExplanation(false);
            claude.clearExplanation();
          }}
        />
      )}
    </div>
  );
}
