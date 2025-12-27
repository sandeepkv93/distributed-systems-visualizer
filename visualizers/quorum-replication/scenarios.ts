import { Scenario } from '@/lib/types';

export const quorumReplicationScenarios: Scenario[] = [
  {
    id: 'write-quorum-success',
    name: 'Write Quorum Success',
    concept: 'quorum-replication',
    description: 'Write reaches W quorum and replicates to peers.',
    initialState: {
      nodeCount: 5,
      replicationFactor: 3,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'write',
        description: 'N0 writes cart:1={items:2} with W=2',
        data: { nodeId: 'N0', key: 'cart:1', value: { items: 2 }, quorumWrite: 2 },
      },
      {
        id: 1,
        timestamp: 700,
        type: 'read',
        description: 'N2 reads cart:1 with R=2',
        data: { nodeId: 'N2', key: 'cart:1', quorumRead: 2 },
      },
    ],
    learningObjectives: [
      'Understand W quorum requirements',
      'See replication to multiple replicas',
      'Read returns latest version with R quorum',
    ],
    expectedOutcome: 'Write is durable and readable from quorum.',
  },
  {
    id: 'read-repair',
    name: 'Read Repair',
    concept: 'quorum-replication',
    description: 'Read quorum detects a stale replica and repairs it.',
    initialState: {
      nodeCount: 5,
      replicationFactor: 3,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'write',
        description: 'N1 writes profile:7={age:30} with W=2',
        data: { nodeId: 'N1', key: 'profile:7', value: { age: 30 }, quorumWrite: 2 },
      },
      {
        id: 1,
        timestamp: 500,
        type: 'fail_node',
        description: 'N2 fails before receiving update',
        data: { nodeId: 'N2' },
      },
      {
        id: 2,
        timestamp: 900,
        type: 'recover_node',
        description: 'N2 recovers (stale)',
        data: { nodeId: 'N2' },
      },
      {
        id: 3,
        timestamp: 1400,
        type: 'read',
        description: 'N0 reads profile:7 with R=2 (repair)',
        data: { nodeId: 'N0', key: 'profile:7', quorumRead: 2 },
      },
    ],
    learningObjectives: [
      'See how read repair updates stale replicas',
      'Understand R quorum behavior',
      'Observe healing after failures',
    ],
    expectedOutcome: 'Stale node catches up via read repair.',
  },
  {
    id: 'write-quorum-failure',
    name: 'Write Quorum Failure',
    concept: 'quorum-replication',
    description: 'Write misses quorum when nodes are down.',
    initialState: {
      nodeCount: 4,
      replicationFactor: 3,
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'fail_node',
        description: 'N2 fails',
        data: { nodeId: 'N2' },
      },
      {
        id: 1,
        timestamp: 200,
        type: 'fail_node',
        description: 'N3 fails',
        data: { nodeId: 'N3' },
      },
      {
        id: 2,
        timestamp: 600,
        type: 'write',
        description: 'N0 writes inventory:5=99 with W=3',
        data: { nodeId: 'N0', key: 'inventory:5', value: 99, quorumWrite: 3 },
      },
    ],
    learningObjectives: [
      'Understand quorum write failure',
      'See impact of replica availability',
      'Highlight the W+R>N rule',
    ],
    expectedOutcome: 'Write fails to reach quorum due to outages.',
  },
];
