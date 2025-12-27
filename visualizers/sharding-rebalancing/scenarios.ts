import { Scenario } from '@/lib/types';

export const shardingRebalancingScenarios: Scenario[] = [
  {
    id: 'range-scale-out',
    name: 'Range Sharding Scale-Out',
    concept: 'sharding-rebalancing',
    description: 'Add a node and rebalance range shards.',
    initialState: {
      nodeCount: 3,
      strategy: 'range',
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'set_strategy',
        description: 'Use range sharding',
        data: { strategy: 'range' },
      },
      {
        id: 1,
        timestamp: 800,
        type: 'add_node',
        description: 'Add a new node N3',
        data: {},
      },
      {
        id: 2,
        timestamp: 1400,
        type: 'rebalance',
        description: 'Rebalance shards',
        data: {},
      },
    ],
    learningObjectives: [
      'See contiguous range splits',
      'Observe shard movement during scale-out',
      'Understand load redistribution',
    ],
    expectedOutcome: 'Ranges split evenly across nodes.',
  },
  {
    id: 'hash-scale-out',
    name: 'Hash Sharding Scale-Out',
    concept: 'sharding-rebalancing',
    description: 'Add a node with hash sharding.',
    initialState: {
      nodeCount: 3,
      strategy: 'hash',
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'set_strategy',
        description: 'Use hash sharding',
        data: { strategy: 'hash' },
      },
      {
        id: 1,
        timestamp: 800,
        type: 'add_node',
        description: 'Add a new node N3',
        data: {},
      },
      {
        id: 2,
        timestamp: 1400,
        type: 'rebalance',
        description: 'Rebalance shards',
        data: {},
      },
    ],
    learningObjectives: [
      'See hash bucket redistribution',
      'Observe smaller shard movement',
      'Compare with range sharding',
    ],
    expectedOutcome: 'Hash ranges are redistributed evenly.',
  },
  {
    id: 'node-removal',
    name: 'Node Removal',
    concept: 'sharding-rebalancing',
    description: 'Remove a node and rebalance shards.',
    initialState: {
      nodeCount: 4,
      strategy: 'range',
    },
    events: [
      {
        id: 0,
        timestamp: 0,
        type: 'set_strategy',
        description: 'Use range sharding',
        data: { strategy: 'range' },
      },
      {
        id: 1,
        timestamp: 800,
        type: 'remove_node',
        description: 'Remove node N1',
        data: { nodeId: 'N1' },
      },
      {
        id: 2,
        timestamp: 1400,
        type: 'rebalance',
        description: 'Rebalance shards',
        data: {},
      },
    ],
    learningObjectives: [
      'See reassignment after node loss',
      'Observe shifts in key ownership',
      'Understand impact on load',
    ],
    expectedOutcome: 'Remaining nodes absorb shards from removed node.',
  },
];
