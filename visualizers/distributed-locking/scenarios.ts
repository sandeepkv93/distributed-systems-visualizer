import { Scenario } from '@/lib/types';

export const distributedLockingScenarios: Scenario[] = [
  {
    id: 'basic-lock',
    name: 'Acquire and Release',
    concept: 'distributed-locking',
    description: 'A client acquires a lock and releases it.',
    initialState: {
      clientCount: 4,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'request_lock',
        description: 'C0 requests the lock',
        data: { clientId: 'C0' },
      },
      {
        id: 1,
        timestamp: 1000,
        type: 'release_lock',
        description: 'C0 releases the lock',
        data: { clientId: 'C0' },
      },
      {
        id: 2,
        timestamp: 1600,
        type: 'request_lock',
        description: 'C1 requests the lock',
        data: { clientId: 'C1' },
      },
    ],
    learningObjectives: [
      'Understand centralized lock acquisition',
      'See grant and release flow',
      'Observe queue handoff',
    ],
    expectedOutcome: 'Lock transfers cleanly between clients.',
  },
  {
    id: 'lease-expiry',
    name: 'Lease Expiry',
    concept: 'distributed-locking',
    description: 'No heartbeat causes lease to expire.',
    initialState: {
      clientCount: 4,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'request_lock',
        description: 'C2 requests the lock',
        data: { clientId: 'C2' },
      },
      {
        id: 1,
        timestamp: 1200,
        type: 'tick',
        description: 'Time advances (lease expiry)',
        data: {},
      },
      {
        id: 2,
        timestamp: 1800,
        type: 'request_lock',
        description: 'C3 requests the lock after expiry',
        data: { clientId: 'C3' },
      },
    ],
    learningObjectives: [
      'See lease timeouts reclaim locks',
      'Understand why heartbeats are needed',
      'Observe new owner after expiry',
    ],
    expectedOutcome: 'Lease expiry frees the lock for another client.',
  },
  {
    id: 'heartbeat-renewal',
    name: 'Heartbeat Renewal',
    concept: 'distributed-locking',
    description: 'Heartbeats keep the lease alive.',
    initialState: {
      clientCount: 4,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'request_lock',
        description: 'C1 requests the lock',
        data: { clientId: 'C1' },
      },
      {
        id: 1,
        timestamp: 800,
        type: 'heartbeat',
        description: 'C1 heartbeat',
        data: { clientId: 'C1' },
      },
      {
        id: 2,
        timestamp: 1600,
        type: 'heartbeat',
        description: 'C1 heartbeat again',
        data: { clientId: 'C1' },
      },
      {
        id: 3,
        timestamp: 2400,
        type: 'release_lock',
        description: 'C1 releases the lock',
        data: { clientId: 'C1' },
      },
    ],
    learningObjectives: [
      'Understand lease renewal with heartbeats',
      'See expiry extend with each heartbeat',
      'Observe graceful release after renewal',
    ],
    expectedOutcome: 'Lease remains valid while heartbeats continue.',
  },
  {
    id: 'contention-queue',
    name: 'Contention Queue',
    concept: 'distributed-locking',
    description: 'Multiple clients queue for a lock.',
    initialState: {
      clientCount: 4,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'request_lock',
        description: 'C0 requests the lock',
        data: { clientId: 'C0' },
      },
      {
        id: 1,
        timestamp: 500,
        type: 'request_lock',
        description: 'C2 requests the lock',
        data: { clientId: 'C2' },
      },
      {
        id: 2,
        timestamp: 900,
        type: 'request_lock',
        description: 'C3 requests the lock',
        data: { clientId: 'C3' },
      },
      {
        id: 3,
        timestamp: 1400,
        type: 'release_lock',
        description: 'C0 releases lock to next in queue',
        data: { clientId: 'C0' },
      },
    ],
    learningObjectives: [
      'See queueing behavior under contention',
      'Observe FIFO lock grants',
      'Understand deny/queue responses',
    ],
    expectedOutcome: 'Queued clients receive the lock in order.',
  },
];
