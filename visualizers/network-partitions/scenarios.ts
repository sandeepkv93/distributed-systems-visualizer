import { Scenario } from '@/lib/types';

export const networkPartitionsScenarios: Scenario[] = [
  {
    id: 'split-brain',
    name: 'Split-Brain',
    concept: 'network-partitions',
    description: 'Partition splits cluster into two leaders.',
    initialState: {
      nodeCount: 5,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'partition',
        description: 'Split into {N0,N1,N2} and {N3,N4}',
        data: { partitionA: ['N0', 'N1', 'N2'], partitionB: ['N3', 'N4'] },
      },
      {
        id: 1,
        timestamp: 600,
        type: 'election',
        description: 'Start election in partition A',
        data: { partitionId: 'A' },
      },
      {
        id: 2,
        timestamp: 1200,
        type: 'election',
        description: 'Start election in partition B',
        data: { partitionId: 'B' },
      },
    ],
    learningObjectives: [
      'See leaders elected per partition',
      'Understand split-brain risk',
    ],
    expectedOutcome: 'Two leaders exist during partition.',
  },
  {
    id: 'heal-and-resolve',
    name: 'Heal and Resolve',
    concept: 'network-partitions',
    description: 'Partition heals and single leader emerges.',
    initialState: {
      nodeCount: 5,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'partition',
        description: 'Split into {N0,N1,N2} and {N3,N4}',
        data: { partitionA: ['N0', 'N1', 'N2'], partitionB: ['N3', 'N4'] },
      },
      {
        id: 1,
        timestamp: 600,
        type: 'election',
        description: 'Start election in partition A',
        data: { partitionId: 'A' },
      },
      {
        id: 2,
        timestamp: 1200,
        type: 'heal',
        description: 'Heal partition',
        data: {},
      },
      {
        id: 3,
        timestamp: 1800,
        type: 'election',
        description: 'Start election after heal',
        data: { partitionId: 'A' },
      },
    ],
    learningObjectives: [
      'See partition healing',
      'Understand leader resolution',
    ],
    expectedOutcome: 'Cluster converges to a single leader.',
  },
];
