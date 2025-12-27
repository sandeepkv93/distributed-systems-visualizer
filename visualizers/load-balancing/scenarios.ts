import { Scenario } from '@/lib/types';

export const loadBalancingScenarios: Scenario[] = [
  {
    id: 'steady-load',
    name: 'Steady Load',
    concept: 'load-balancing',
    description: 'Requests spread across workers evenly.',
    initialState: {
      workerCount: 4,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'request',
        description: 'Incoming request',
        data: { latency: 2 },
      },
      {
        id: 1,
        timestamp: 400,
        type: 'request',
        description: 'Incoming request',
        data: { latency: 2 },
      },
      {
        id: 2,
        timestamp: 800,
        type: 'tick',
        description: 'Process queue',
        data: {},
      },
    ],
    learningObjectives: [
      'See least-queue dispatching',
      'Observe queue balancing',
      'Understand steady throughput',
    ],
    expectedOutcome: 'Requests complete with minimal backlog.',
  },
  {
    id: 'burst-backpressure',
    name: 'Burst + Backpressure',
    concept: 'load-balancing',
    description: 'Burst traffic triggers drops.',
    initialState: {
      workerCount: 3,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'burst',
        description: 'Burst of 10 requests',
        data: { count: 10, latency: 3 },
      },
      {
        id: 1,
        timestamp: 500,
        type: 'tick',
        description: 'Process backlog',
        data: {},
      },
    ],
    learningObjectives: [
      'See overload response',
      'Understand drop under backpressure',
      'Observe queue saturation',
    ],
    expectedOutcome: 'Some requests are dropped to protect workers.',
  },
  {
    id: 'worker-failure',
    name: 'Worker Failure',
    concept: 'load-balancing',
    description: 'Traffic reroutes when a worker fails.',
    initialState: {
      workerCount: 4,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'request',
        description: 'Incoming request',
        data: { latency: 2 },
      },
      {
        id: 1,
        timestamp: 300,
        type: 'fail_worker',
        description: 'Worker W2 fails',
        data: { workerId: 'W2' },
      },
      {
        id: 2,
        timestamp: 700,
        type: 'request',
        description: 'Incoming request',
        data: { latency: 2 },
      },
    ],
    learningObjectives: [
      'Observe load rerouting',
      'Understand capacity reduction',
      'See queue growth',
    ],
    expectedOutcome: 'Remaining workers absorb the load.',
  },
];
