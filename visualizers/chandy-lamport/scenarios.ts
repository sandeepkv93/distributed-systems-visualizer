import { Scenario } from '@/lib/types';

export const chandyLamportScenarios: Scenario[] = [
  {
    id: 'basic-snapshot',
    name: 'Basic Snapshot',
    concept: 'chandy-lamport',
    description: 'Start a snapshot while messages are in transit.',
    initialState: {
      nodeCount: 5,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'send_message',
        description: 'N0 sends order:101 to N2',
        data: { fromId: 'N0', toId: 'N2', value: { order: 101 } },
      },
      {
        id: 1,
        timestamp: 500,
        type: 'send_message',
        description: 'N3 sends payment:55 to N1',
        data: { fromId: 'N3', toId: 'N1', value: { payment: 55 } },
      },
      {
        id: 2,
        timestamp: 900,
        type: 'start_snapshot',
        description: 'Start snapshot at N0',
        data: { initiatorId: 'N0' },
      },
      {
        id: 3,
        timestamp: 1600,
        type: 'send_message',
        description: 'N2 sends ship:1 to N4',
        data: { fromId: 'N2', toId: 'N4', value: { ship: 1 } },
      },
    ],
    learningObjectives: [
      'See marker propagation through the network',
      'Capture local state at snapshot start',
      'Record in-transit messages on channels',
    ],
    expectedOutcome: 'Snapshot completes with recorded channel state.',
  },
  {
    id: 'in-transit-capture',
    name: 'In-Transit Message Capture',
    concept: 'chandy-lamport',
    description: 'A message sent before the marker is recorded as in-transit.',
    initialState: {
      nodeCount: 4,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'send_message',
        description: 'N1 sends balance:80 to N2',
        data: { fromId: 'N1', toId: 'N2', value: { balance: 80 } },
      },
      {
        id: 1,
        timestamp: 400,
        type: 'start_snapshot',
        description: 'Start snapshot at N0',
        data: { initiatorId: 'N0' },
      },
      {
        id: 2,
        timestamp: 900,
        type: 'send_message',
        description: 'N3 sends invoice:12 to N2',
        data: { fromId: 'N3', toId: 'N2', value: { invoice: 12 } },
      },
    ],
    learningObjectives: [
      'Understand why in-transit messages must be captured',
      'See how channel recording works',
      'Compare local state vs channel state',
    ],
    expectedOutcome: 'Channel logs capture messages that cross the snapshot boundary.',
  },
  {
    id: 'multi-initiator',
    name: 'Concurrent Activity During Snapshot',
    concept: 'chandy-lamport',
    description: 'Application messages continue while markers propagate.',
    initialState: {
      nodeCount: 6,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'send_message',
        description: 'N2 sends job:7 to N5',
        data: { fromId: 'N2', toId: 'N5', value: { job: 7 } },
      },
      {
        id: 1,
        timestamp: 500,
        type: 'start_snapshot',
        description: 'Start snapshot at N4',
        data: { initiatorId: 'N4' },
      },
      {
        id: 2,
        timestamp: 1100,
        type: 'send_message',
        description: 'N0 sends job:8 to N3',
        data: { fromId: 'N0', toId: 'N3', value: { job: 8 } },
      },
      {
        id: 3,
        timestamp: 1700,
        type: 'send_message',
        description: 'N1 sends job:9 to N2',
        data: { fromId: 'N1', toId: 'N2', value: { job: 9 } },
      },
    ],
    learningObjectives: [
      'Observe snapshot markers alongside application traffic',
      'See how local state keeps evolving',
      'Understand snapshot consistency guarantees',
    ],
    expectedOutcome: 'Snapshot completes without stopping normal message flow.',
  },
];
