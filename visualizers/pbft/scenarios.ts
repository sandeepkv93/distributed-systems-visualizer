import { Scenario } from '@/lib/types';

export const pbftScenarios: Scenario[] = [
  {
    id: 'basic-consensus',
    name: 'Basic PBFT Consensus',
    concept: 'pbft',
    description: 'Client request flows through pre-prepare, prepare, commit.',
    initialState: {
      nodeCount: 4,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'client_request',
        description: 'Client requests transfer: {amount: 5}',
        data: { value: { transfer: 5 } },
      },
      {
        id: 1,
        timestamp: 1200,
        type: 'client_request',
        description: 'Client requests transfer: {amount: 9}',
        data: { value: { transfer: 9 } },
      },
    ],
    learningObjectives: [
      'Track PBFT phases across nodes',
      'Understand quorum requirements (2f+1)',
      'Observe execution after commits',
    ],
    expectedOutcome: 'Replicas execute requests in order after commit quorum.',
  },
  {
    id: 'leader-change',
    name: 'Leader Change',
    concept: 'pbft',
    description: 'Primary fails and view change selects a new leader.',
    initialState: {
      nodeCount: 4,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'client_request',
        description: 'Client requests set: {key: "x", value: 1}',
        data: { value: { set: { key: 'x', value: 1 } } },
      },
      {
        id: 1,
        timestamp: 700,
        type: 'fail_node',
        description: 'Primary N0 fails',
        data: { nodeId: 'N0' },
      },
      {
        id: 2,
        timestamp: 1200,
        type: 'view_change',
        description: 'Trigger view change to new primary',
        data: {},
      },
      {
        id: 3,
        timestamp: 1700,
        type: 'client_request',
        description: 'Client requests set: {key: "x", value: 2}',
        data: { value: { set: { key: 'x', value: 2 } } },
      },
    ],
    learningObjectives: [
      'Understand primary role and view changes',
      'See system continue under new leader',
      'Observe health impact on consensus',
    ],
    expectedOutcome: 'New primary continues processing requests.',
  },
  {
    id: 'replica-failure',
    name: 'Replica Failure Tolerance',
    concept: 'pbft',
    description: 'Consensus proceeds despite one replica failure.',
    initialState: {
      nodeCount: 4,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'fail_node',
        description: 'Replica N3 fails',
        data: { nodeId: 'N3' },
      },
      {
        id: 1,
        timestamp: 600,
        type: 'client_request',
        description: 'Client requests update: {score: 10}',
        data: { value: { score: 10 } },
      },
    ],
    learningObjectives: [
      'See quorum calculation with f=1',
      'Observe consensus without all replicas',
      'Understand PBFT resilience',
    ],
    expectedOutcome: 'Consensus still reaches commit with 3 replicas.',
  },
];
