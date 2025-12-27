import { Scenario } from '@/lib/types';

export const replicationLogScenarios: Scenario[] = [
  {
    id: 'produce-replicate',
    name: 'Produce + Replicate',
    concept: 'replication-log',
    description: 'Leader appends entries and followers replicate.',
    initialState: {
      replicaCount: 3,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'produce',
        description: 'Produce message A',
        data: { value: 'A' },
      },
      {
        id: 1,
        timestamp: 700,
        type: 'produce',
        description: 'Produce message B',
        data: { value: 'B' },
      },
    ],
    learningObjectives: [
      'See leader append',
      'Observe follower replication',
      'Understand high-watermark progression',
    ],
    expectedOutcome: 'Followers catch up and HW advances.',
  },
  {
    id: 'isr-shrink',
    name: 'ISR Shrink',
    concept: 'replication-log',
    description: 'Replica falls out of ISR and HW stalls.',
    initialState: {
      replicaCount: 3,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'produce',
        description: 'Produce message X',
        data: { value: 'X' },
      },
      {
        id: 1,
        timestamp: 600,
        type: 'mark_out_of_sync',
        description: 'Replica B2 falls out of ISR',
        data: { replicaId: 'B2' },
      },
      {
        id: 2,
        timestamp: 1200,
        type: 'produce',
        description: 'Produce message Y',
        data: { value: 'Y' },
      },
    ],
    learningObjectives: [
      'See ISR shrink',
      'Understand HW limited by ISR',
      'Observe lagging replica',
    ],
    expectedOutcome: 'ISR shrinks and replication continues with fewer replicas.',
  },
  {
    id: 'isr-rejoin',
    name: 'ISR Rejoin',
    concept: 'replication-log',
    description: 'Replica catches up and rejoins ISR.',
    initialState: {
      replicaCount: 3,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'produce',
        description: 'Produce message M',
        data: { value: 'M' },
      },
      {
        id: 1,
        timestamp: 500,
        type: 'mark_out_of_sync',
        description: 'Replica B1 falls out of ISR',
        data: { replicaId: 'B1' },
      },
      {
        id: 2,
        timestamp: 1200,
        type: 'mark_in_sync',
        description: 'Replica B1 rejoins ISR',
        data: { replicaId: 'B1' },
      },
      {
        id: 3,
        timestamp: 1600,
        type: 'produce',
        description: 'Produce message N',
        data: { value: 'N' },
      },
    ],
    learningObjectives: [
      'See ISR rejoin after catch-up',
      'Observe HW advance',
      'Understand ISR membership',
    ],
    expectedOutcome: 'Replica rejoins ISR and HW catches up.',
  },
];
