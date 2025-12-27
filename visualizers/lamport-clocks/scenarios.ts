import { Scenario } from '@/lib/types';

export const lamportClocksScenarios: Scenario[] = [
  {
    id: 'basic-broadcast',
    name: 'Basic Total Order Broadcast',
    concept: 'lamport-clocks',
    description: 'Multiple broadcasts are delivered in timestamp order.',
    initialState: {
      nodeCount: 3,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'broadcast',
        description: 'P0 broadcasts {task: 1}',
        data: { fromId: 'P0', value: { task: 1 } },
      },
      {
        id: 1,
        timestamp: 600,
        type: 'broadcast',
        description: 'P1 broadcasts {task: 2}',
        data: { fromId: 'P1', value: { task: 2 } },
      },
      {
        id: 2,
        timestamp: 1200,
        type: 'broadcast',
        description: 'P2 broadcasts {task: 3}',
        data: { fromId: 'P2', value: { task: 3 } },
      },
    ],
    learningObjectives: [
      'Observe Lamport timestamps on broadcasts',
      'See ordered delivery based on timestamp + tie-break',
      'Understand holdback queue behavior',
    ],
    expectedOutcome: 'All nodes deliver messages in the same order.',
  },
  {
    id: 'local-events-interleaving',
    name: 'Local Events and Broadcasts',
    concept: 'lamport-clocks',
    description: 'Local events advance clocks between broadcasts.',
    initialState: {
      nodeCount: 3,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'local_event',
        description: 'P0 performs a local event',
        data: { nodeId: 'P0', description: 'local event' },
      },
      {
        id: 1,
        timestamp: 400,
        type: 'broadcast',
        description: 'P0 broadcasts {op: "A"}',
        data: { fromId: 'P0', value: { op: 'A' } },
      },
      {
        id: 2,
        timestamp: 900,
        type: 'local_event',
        description: 'P2 performs a local event',
        data: { nodeId: 'P2', description: 'local event' },
      },
      {
        id: 3,
        timestamp: 1400,
        type: 'broadcast',
        description: 'P2 broadcasts {op: "B"}',
        data: { fromId: 'P2', value: { op: 'B' } },
      },
    ],
    learningObjectives: [
      'See local events increment Lamport clocks',
      'Compare broadcast timestamps after local events',
      'Understand causality vs total order',
    ],
    expectedOutcome: 'Clocks advance on local events and preserve global ordering.',
  },
  {
    id: 'near-simultaneous',
    name: 'Near-Simultaneous Broadcasts',
    concept: 'lamport-clocks',
    description: 'Tie-break by process ID when timestamps are close.',
    initialState: {
      nodeCount: 4,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'broadcast',
        description: 'P1 broadcasts {event: "X"}',
        data: { fromId: 'P1', value: { event: 'X' } },
      },
      {
        id: 1,
        timestamp: 200,
        type: 'broadcast',
        description: 'P0 broadcasts {event: "Y"}',
        data: { fromId: 'P0', value: { event: 'Y' } },
      },
      {
        id: 2,
        timestamp: 600,
        type: 'broadcast',
        description: 'P3 broadcasts {event: "Z"}',
        data: { fromId: 'P3', value: { event: 'Z' } },
      },
    ],
    learningObjectives: [
      'See how ties are broken deterministically',
      'Understand total order across nodes',
      'Observe holdback delivery once acks complete',
    ],
    expectedOutcome: 'All nodes deliver in the same tie-broken order.',
  },
];
