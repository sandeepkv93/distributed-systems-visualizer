import { ShardMessage, ShardMigration, ShardNode, ShardRange, ShardingStrategy, SimulationEvent } from '../types';

const HASH_RING_SIZE = 100;
const DEFAULT_KEY_COUNT = 60;

export class ShardingRebalancingAlgorithm {
  private nodes: ShardNode[];
  private messages: ShardMessage[];
  private eventLog: SimulationEvent[];
  private messageIdCounter: number = 0;
  private strategy: ShardingStrategy;
  private keys: number[];

  constructor(nodeCount: number = 3, strategy: ShardingStrategy = 'range') {
    this.nodes = [];
    this.messages = [];
    this.eventLog = [];
    this.strategy = strategy;
    this.keys = Array.from({ length: DEFAULT_KEY_COUNT }, (_, i) => i);

    this.initializeNodes(nodeCount);
    this.assignShards();
  }

  private initializeNodes(nodeCount: number): void {
    const angleStep = (2 * Math.PI) / nodeCount;
    const radius = 200;
    const centerX = 420;
    const centerY = 340;

    for (let i = 0; i < nodeCount; i++) {
      const angle = i * angleStep - Math.PI / 2;
      this.nodes.push({
        id: `N${i}`,
        position: {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        },
        status: 'healthy',
        shards: [],
        keys: [],
        load: 0,
      });
    }
  }

  private generateMessageId(): string {
    return `shard-${this.messageIdCounter++}`;
  }

  setStrategy(strategy: ShardingStrategy): void {
    this.strategy = strategy;
    this.assignShards();
  }

  addNode(): void {
    const newIndex = this.nodes.length;
    const angleStep = (2 * Math.PI) / (this.nodes.length + 1);
    const radius = 200;
    const centerX = 420;
    const centerY = 340;
    const angle = newIndex * angleStep - Math.PI / 2;

    this.nodes.push({
      id: `N${newIndex}`,
      position: {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      },
      status: 'healthy',
      shards: [],
      keys: [],
      load: 0,
    });

    this.rebalance();
  }

  removeNode(nodeId: string): void {
    const index = this.nodes.findIndex((n) => n.id === nodeId);
    if (index === -1) return;
    this.nodes.splice(index, 1);
    this.rebalance();
  }

  rebalance(): void {
    const migrations = this.computeMigrations();
    migrations.forEach((migration) => {
      const message: ShardMessage = {
        id: this.generateMessageId(),
        from: migration.from,
        to: migration.to,
        type: 'MoveShard',
        payload: {
          range: migration.range,
          keys: migration.keys,
          strategy: this.strategy,
        },
        status: 'in-flight',
        timestamp: Date.now(),
      };
      this.messages.push(message);
    });

    this.assignShards();
    this.addEvent('rebalance', `Rebalanced using ${this.strategy} sharding`, {
      strategy: this.strategy,
      migrations: migrations.length,
    });
  }

  private computeMigrations(): ShardMigration[] {
    const migrations: ShardMigration[] = [];
    const previousAssignments = this.nodes.map((node) => ({
      id: node.id,
      shards: [...node.shards],
    }));

    this.assignShards();

    previousAssignments.forEach((prev) => {
      const current = this.nodes.find((n) => n.id === prev.id);
      if (!current) return;
      prev.shards.forEach((prevShard) => {
        const stillOwns = current.shards.some(
          (shard) => shard.start === prevShard.start && shard.end === prevShard.end
        );
        if (!stillOwns) {
          const newOwner = this.nodes.find((node) =>
            node.shards.some((shard) => shard.start === prevShard.start && shard.end === prevShard.end)
          );
          if (newOwner) {
            const keys = this.keys.filter((key) => key >= prevShard.start && key <= prevShard.end);
            migrations.push({
              from: prev.id,
              to: newOwner.id,
              range: prevShard,
              keys,
            });
          }
        }
      });
    });

    return migrations;
  }

  private assignShards(): void {
    this.nodes.forEach((node) => {
      node.shards = [];
      node.keys = [];
      node.load = 0;
    });

    if (this.nodes.length === 0) return;

    if (this.strategy === 'range') {
      const rangeSize = Math.floor(HASH_RING_SIZE / this.nodes.length);
      this.nodes.forEach((node, index) => {
        const start = index * rangeSize;
        const end = index === this.nodes.length - 1 ? HASH_RING_SIZE - 1 : (index + 1) * rangeSize - 1;
        node.shards = [{ start, end }];
      });
    } else {
      this.nodes.forEach((node, index) => {
        const start = (index * HASH_RING_SIZE) / this.nodes.length;
        const end = ((index + 1) * HASH_RING_SIZE) / this.nodes.length - 1;
        node.shards = [{ start: Math.floor(start), end: Math.floor(end) }];
      });
    }

    this.keys.forEach((key) => {
      const shardKey = this.strategy === 'hash' ? this.hashKey(key) : key;
      const owner = this.nodes.find((node) =>
        node.shards.some((shard) => shardKey >= shard.start && shardKey <= shard.end)
      );
      if (owner) {
        owner.keys.push(key);
      }
    });

    this.nodes.forEach((node) => {
      node.load = node.keys.length;
    });
  }

  private hashKey(key: number): number {
    return (key * 37) % HASH_RING_SIZE;
  }

  deliverMessage(messageId: string): void {
    const message = this.messages.find((m) => m.id === messageId);
    if (!message) return;
    message.status = 'success';
  }

  getNodes(): ShardNode[] {
    return this.nodes;
  }

  getMessages(): ShardMessage[] {
    return this.messages;
  }

  getStats(): {
    totalNodes: number;
    strategy: ShardingStrategy;
    totalKeys: number;
    avgLoad: number;
  } {
    const totalKeys = this.keys.length;
    const avgLoad = this.nodes.length === 0 ? 0 : totalKeys / this.nodes.length;

    return {
      totalNodes: this.nodes.length,
      strategy: this.strategy,
      totalKeys,
      avgLoad,
    };
  }

  reset(): void {
    this.nodes = [];
    this.messages = [];
    this.eventLog = [];
    this.messageIdCounter = 0;
    this.keys = Array.from({ length: DEFAULT_KEY_COUNT }, (_, i) => i);
    this.initializeNodes(3);
    this.assignShards();
  }

  private addEvent(type: string, description: string, data: any = {}): void {
    const event: SimulationEvent = {
      id: this.eventLog.length,
      timestamp: Date.now(),
      type,
      description,
      data,
    };
    this.eventLog.push(event);
  }
}
