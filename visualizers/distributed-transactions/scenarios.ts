import { Scenario } from '@/lib/types';

export const distributedTransactionsScenarios: Scenario[] = [
  {
    id: '3pc-success',
    name: '3PC Success Path',
    concept: 'distributed-transactions',
    description: 'Prepare, pre-commit, commit with unanimous yes votes.',
    initialState: {
      participantCount: 3,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'start_3pc',
        description: 'Coordinator starts 3PC',
        data: {},
      },
      {
        id: 1,
        timestamp: 600,
        type: 'vote',
        description: 'All participants vote yes',
        data: { votes: { P0: 'yes', P1: 'yes', P2: 'yes' } },
      },
      {
        id: 2,
        timestamp: 1200,
        type: 'decide_3pc',
        description: 'Coordinator sends pre-commit',
        data: {},
      },
      {
        id: 3,
        timestamp: 1800,
        type: 'commit_3pc',
        description: 'Coordinator commits',
        data: {},
      },
    ],
    learningObjectives: [
      'See 3PC phases',
      'Understand pre-commit safety',
      'Observe final commit',
    ],
    expectedOutcome: 'All participants commit.',
  },
  {
    id: '3pc-abort',
    name: '3PC Abort Path',
    concept: 'distributed-transactions',
    description: 'A no vote triggers abort.',
    initialState: {
      participantCount: 3,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'start_3pc',
        description: 'Coordinator starts 3PC',
        data: {},
      },
      {
        id: 1,
        timestamp: 600,
        type: 'vote',
        description: 'P1 votes no',
        data: { votes: { P0: 'yes', P1: 'no', P2: 'yes' } },
      },
      {
        id: 2,
        timestamp: 1200,
        type: 'decide_3pc',
        description: 'Coordinator aborts',
        data: {},
      },
    ],
    learningObjectives: [
      'Understand abort on no vote',
      'See participants stop at abort',
    ],
    expectedOutcome: 'Transaction aborts.',
  },
  {
    id: 'saga-compensation',
    name: 'Saga Compensation',
    concept: 'distributed-transactions',
    description: 'Compensate when a step fails.',
    initialState: {
      participantCount: 3,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'start_saga',
        description: 'Start saga',
        data: {},
      },
      {
        id: 1,
        timestamp: 500,
        type: 'saga_step',
        description: 'Complete step 1',
        data: { stepId: 'S0' },
      },
      {
        id: 2,
        timestamp: 1000,
        type: 'saga_step',
        description: 'Complete step 2',
        data: { stepId: 'S1' },
      },
      {
        id: 3,
        timestamp: 1500,
        type: 'saga_compensate',
        description: 'Compensate step 2',
        data: { stepId: 'S1' },
      },
      {
        id: 4,
        timestamp: 2000,
        type: 'saga_compensate',
        description: 'Compensate step 1',
        data: { stepId: 'S0' },
      },
    ],
    learningObjectives: [
      'See saga forward steps',
      'Understand compensation',
      'Observe rollback',
    ],
    expectedOutcome: 'Saga steps are compensated in reverse order.',
  },
];
