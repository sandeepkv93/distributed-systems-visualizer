import { Scenario } from '@/lib/types';

export const crdtScenarios: Scenario[] = [
  {
    id: 'gcounter-converge',
    name: 'G-Counter Convergence',
    concept: 'crdts',
    description: 'Counters increment independently then sync.',
    initialState: {
      replicaCount: 3,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'g_inc',
        description: 'R0 increments',
        data: { replicaId: 'R0' },
      },
      {
        id: 1,
        timestamp: 400,
        type: 'g_inc',
        description: 'R1 increments twice',
        data: { replicaId: 'R1', times: 2 },
      },
      {
        id: 2,
        timestamp: 900,
        type: 'sync_all',
        description: 'Sync all replicas',
        data: {},
      },
    ],
    learningObjectives: [
      'See independent increments',
      'Observe merge by max per replica',
      'Understand eventual convergence',
    ],
    expectedOutcome: 'All replicas report the same total.',
  },
  {
    id: 'orset-add-remove',
    name: 'OR-Set Add/Remove',
    concept: 'crdts',
    description: 'Add and remove elements with unique tags.',
    initialState: {
      replicaCount: 3,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'or_add',
        description: 'R0 adds apple',
        data: { replicaId: 'R0', value: 'apple' },
      },
      {
        id: 1,
        timestamp: 500,
        type: 'or_add',
        description: 'R1 adds banana',
        data: { replicaId: 'R1', value: 'banana' },
      },
      {
        id: 2,
        timestamp: 900,
        type: 'or_remove',
        description: 'R0 removes apple',
        data: { replicaId: 'R0', value: 'apple' },
      },
      {
        id: 3,
        timestamp: 1300,
        type: 'sync_all',
        description: 'Sync all replicas',
        data: {},
      },
    ],
    learningObjectives: [
      'Track tagged adds/removes',
      'Understand remove wins for seen tags',
      'See convergence after sync',
    ],
    expectedOutcome: 'Replicas converge on the same set.',
  },
  {
    id: 'rga-sequence',
    name: 'RGA Sequence',
    concept: 'crdts',
    description: 'Insert elements concurrently and merge order.',
    initialState: {
      replicaCount: 3,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'rga_insert',
        description: 'R0 inserts A',
        data: { replicaId: 'R0', value: 'A' },
      },
      {
        id: 1,
        timestamp: 500,
        type: 'rga_insert',
        description: 'R1 inserts B',
        data: { replicaId: 'R1', value: 'B' },
      },
      {
        id: 2,
        timestamp: 900,
        type: 'sync_all',
        description: 'Sync all replicas',
        data: {},
      },
    ],
    learningObjectives: [
      'See sequence merge with IDs',
      'Understand deterministic ordering',
      'Observe convergence across replicas',
    ],
    expectedOutcome: 'All replicas show the same sequence.',
  },
];
