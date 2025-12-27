import { Scenario } from '@/lib/types';

export const failureDetectorScenarios: Scenario[] = [
  {
    id: 'phi-suspect',
    name: 'Phi Accrual Suspect',
    concept: 'failure-detectors',
    description: 'Heartbeats pause and phi rises to suspect.',
    initialState: {
      nodeCount: 5,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'heartbeat',
        description: 'N0 heartbeats',
        data: { nodeId: 'N0' },
      },
      {
        id: 1,
        timestamp: 1200,
        type: 'tick',
        description: 'Time passes, phi rises',
        data: {},
      },
    ],
    learningObjectives: [
      'See phi accrue as heartbeats stop',
      'Understand suspect transition',
    ],
    expectedOutcome: 'Node transitions to suspect as phi increases.',
  },
  {
    id: 'swim-probe',
    name: 'SWIM Probe',
    concept: 'failure-detectors',
    description: 'Nodes probe and receive acks.',
    initialState: {
      nodeCount: 5,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'probe',
        description: 'N1 probes N2',
        data: { fromId: 'N1', targetId: 'N2' },
      },
      {
        id: 1,
        timestamp: 800,
        type: 'tick',
        description: 'Time passes',
        data: {},
      },
    ],
    learningObjectives: [
      'Observe probe/ack flow',
      'See how suspicion clears on ack',
    ],
    expectedOutcome: 'Ack resets suspicion.',
  },
  {
    id: 'confirm-failure',
    name: 'Confirm Failure',
    concept: 'failure-detectors',
    description: 'Node is suspected then confirmed failed.',
    initialState: {
      nodeCount: 5,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'manual_fail',
        description: 'N3 fails',
        data: { nodeId: 'N3' },
      },
      {
        id: 1,
        timestamp: 800,
        type: 'suspect',
        description: 'N3 suspected',
        data: { nodeId: 'N3' },
      },
      {
        id: 2,
        timestamp: 1400,
        type: 'confirm',
        description: 'N3 confirmed failed',
        data: { nodeId: 'N3' },
      },
    ],
    learningObjectives: [
      'Understand suspicion vs confirmation',
      'See final failed state',
    ],
    expectedOutcome: 'Node is marked failed after confirmation.',
  },
];
