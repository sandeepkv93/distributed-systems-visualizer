import { Scenario } from '@/lib/types';

export const consensusVariantsScenarios: Scenario[] = [
  {
    id: 'raft-joint',
    name: 'Raft Joint Consensus',
    concept: 'consensus-variants',
    description: 'Switch cluster membership using joint consensus.',
    initialState: {
      variant: 'raft-joint',
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'elect_leader',
        description: 'Elect leader N0',
        data: { variant: 'raft-joint', nodeId: 'N0' },
      },
      {
        id: 1,
        timestamp: 700,
        type: 'joint_start',
        description: 'Start joint config (N0-N3)',
        data: { newConfigIds: ['N0', 'N1', 'N2', 'N3'] },
      },
      {
        id: 2,
        timestamp: 1400,
        type: 'append',
        description: 'Append entry during joint config',
        data: { variant: 'raft-joint', value: 'reconfig' },
      },
      {
        id: 3,
        timestamp: 2000,
        type: 'joint_end',
        description: 'Finalize new config',
        data: {},
      },
    ],
    learningObjectives: [
      'See joint consensus phase',
      'Understand membership change safety',
    ],
    expectedOutcome: 'Cluster moves to the new configuration.',
  },
  {
    id: 'multi-paxos',
    name: 'Multi-Paxos Leader',
    concept: 'consensus-variants',
    description: 'Stable leader proposes multiple values.',
    initialState: {
      variant: 'multi-paxos',
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'elect_leader',
        description: 'Elect leader N1',
        data: { variant: 'multi-paxos', nodeId: 'N1' },
      },
      {
        id: 1,
        timestamp: 800,
        type: 'multi_paxos',
        description: 'Propose value A',
        data: { value: 'A' },
      },
      {
        id: 2,
        timestamp: 1400,
        type: 'multi_paxos',
        description: 'Propose value B',
        data: { value: 'B' },
      },
    ],
    learningObjectives: [
      'Observe stable leader proposals',
      'Understand amortized phase 1',
    ],
    expectedOutcome: 'Entries commit under a single leader.',
  },
  {
    id: 'epaxos-fast',
    name: 'EPaxos Fast Path',
    concept: 'consensus-variants',
    description: 'Commit commands via fast path.',
    initialState: {
      variant: 'epaxos',
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'epaxos',
        description: 'Fast path command X',
        data: { value: 'X', path: 'fast' },
      },
      {
        id: 1,
        timestamp: 800,
        type: 'epaxos',
        description: 'Slow path command Y',
        data: { value: 'Y', path: 'slow' },
      },
    ],
    learningObjectives: [
      'Compare fast vs slow path',
      'Understand dependency-free commits',
    ],
    expectedOutcome: 'Commands commit on fast/slow paths.',
  },
];
