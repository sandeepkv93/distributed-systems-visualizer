import { Scenario } from '@/lib/types';

export const merkleAntiEntropyScenarios: Scenario[] = [
  {
    id: 'root-compare',
    name: 'Root Comparison',
    concept: 'merkle-anti-entropy',
    description: 'Compare root hashes to detect divergence.',
    initialState: {
      replicaCount: 2,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'compare_roots',
        description: 'Compare root hashes',
        data: {},
      },
    ],
    learningObjectives: [
      'Use root hashes to detect mismatches',
      'Understand fast divergence detection',
    ],
    expectedOutcome: 'Root mismatch triggers deeper comparison.',
  },
  {
    id: 'deep-compare',
    name: 'Recursive Comparison',
    concept: 'merkle-anti-entropy',
    description: 'Walk the tree to isolate the mismatched ranges.',
    initialState: {
      replicaCount: 2,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'compare_roots',
        description: 'Compare root hashes',
        data: {},
      },
      {
        id: 1,
        timestamp: 800,
        type: 'compare_nodes',
        description: 'Compare child ranges',
        data: {},
      },
    ],
    learningObjectives: [
      'See recursive tree comparison',
      'Understand narrowing to divergent leaves',
    ],
    expectedOutcome: 'Mismatched leaves are identified.',
  },
  {
    id: 'leaf-sync',
    name: 'Leaf Synchronization',
    concept: 'merkle-anti-entropy',
    description: 'Sync specific divergent leaves.',
    initialState: {
      replicaCount: 2,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'compare_roots',
        description: 'Compare root hashes',
        data: {},
      },
      {
        id: 1,
        timestamp: 800,
        type: 'compare_nodes',
        description: 'Compare child ranges',
        data: {},
      },
      {
        id: 2,
        timestamp: 1600,
        type: 'sync_leaf',
        description: 'Sync divergent leaf',
        data: {},
      },
    ],
    learningObjectives: [
      'See leaf-level synchronization',
      'Understand efficient anti-entropy repair',
    ],
    expectedOutcome: 'Replicas converge after syncing leaves.',
  },
];
