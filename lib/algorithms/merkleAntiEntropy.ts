import { MerkleLeaf, MerkleMessage, MerkleNode, MerkleReplica, SimulationEvent } from '../types';

function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) % 1000000007;
  }
  return hash.toString(16);
}

export class MerkleAntiEntropyAlgorithm {
  private replicas: MerkleReplica[];
  private messages: MerkleMessage[];
  private eventLog: SimulationEvent[];
  private messageIdCounter: number = 0;
  private keySpace: string[];

  constructor(replicaCount: number = 2) {
    this.replicas = [];
    this.messages = [];
    this.eventLog = [];
    this.keySpace = Array.from({ length: 12 }, (_, i) => `k${i + 1}`);

    for (let i = 0; i < replicaCount; i++) {
      const data = new Map<string, string>();
      this.keySpace.forEach((key) => {
        data.set(key, `${key}-v1`);
      });
      this.replicas.push({
        id: `R${i}`,
        data,
        root: null,
      });
    }

    this.introduceDivergence();
    this.buildTrees();
  }

  private generateMessageId(): string {
    return `merkle-${this.messageIdCounter++}`;
  }

  private introduceDivergence(): void {
    const replicaA = this.replicas[0];
    const replicaB = this.replicas[1];
    if (!replicaA || !replicaB) return;

    replicaA.data.set('k3', 'k3-v2');
    replicaA.data.set('k7', 'k7-v2');
    replicaB.data.set('k9', 'k9-v2');
  }

  mutateReplica(replicaId: string, key: string, value: string): void {
    const replica = this.replicas.find((r) => r.id === replicaId);
    if (!replica) return;
    replica.data.set(key, value);
    this.buildTrees();
    this.addEvent('mutate', `${replicaId} updates ${key}=${value}`, { replicaId, key, value });
  }

  buildTrees(): void {
    this.replicas.forEach((replica) => {
      const leaves = this.keySpace.map((key) => ({
        key,
        value: replica.data.get(key) || '',
        hash: simpleHash(`${key}:${replica.data.get(key) || ''}`),
      }));
      replica.root = this.buildTree(leaves);
    });
  }

  private buildTree(leaves: MerkleLeaf[]): MerkleNode | null {
    if (leaves.length === 0) return null;
    const nodes = leaves.map((leaf) => ({
      hash: leaf.hash,
      range: [leaf.key, leaf.key] as [string, string],
    }));

    return this.buildInternal(nodes);
  }

  private buildInternal(nodes: MerkleNode[]): MerkleNode {
    if (nodes.length === 1) return nodes[0];
    const next: MerkleNode[] = [];
    for (let i = 0; i < nodes.length; i += 2) {
      const left = nodes[i];
      const right = nodes[i + 1];
      if (!right) {
        next.push(left);
        continue;
      }
      const combinedHash = simpleHash(left.hash + right.hash);
      next.push({
        hash: combinedHash,
        left,
        right,
        range: [left.range[0], right.range[1]],
      });
    }
    return this.buildInternal(next);
  }

  compareRoots(): void {
    const [a, b] = this.replicas;
    if (!a || !b) return;
    const message: MerkleMessage = {
      id: this.generateMessageId(),
      from: a.id,
      to: b.id,
      type: 'CompareRoot',
      payload: {
        range: ['k1', 'k12'],
        hash: a.root?.hash,
      },
      status: 'in-flight',
      timestamp: Date.now(),
    };
    this.messages.push(message);
    this.addEvent('compare_root', 'Compare root hashes', {});
  }

  deliverMessage(messageId: string): void {
    const message = this.messages.find((m) => m.id === messageId);
    if (!message) return;

    if (message.type === 'CompareRoot') {
      this.handleCompareRoot(message);
    } else if (message.type === 'CompareNode') {
      this.handleCompareNode(message);
    } else if (message.type === 'SyncLeaf') {
      this.handleSyncLeaf(message);
    }

    message.status = 'success';
  }

  private handleCompareRoot(message: MerkleMessage): void {
    const [a, b] = this.replicas;
    if (!a || !b) return;
    if (a.root?.hash === b.root?.hash) {
      this.addEvent('roots_match', 'Roots match, no sync needed', {});
      return;
    }
    this.enqueueNodeCompare(a.root, b.root);
  }

  private enqueueNodeCompare(a: MerkleNode | null, b: MerkleNode | null): void {
    if (!a || !b) return;
    if (a.hash === b.hash) return;

    if (!a.left || !a.right || !b.left || !b.right) {
      this.enqueueLeafSync(a.range[0]);
      return;
    }

    const leftMessage: MerkleMessage = {
      id: this.generateMessageId(),
      from: this.replicas[0].id,
      to: this.replicas[1].id,
      type: 'CompareNode',
      payload: {
        range: a.left.range,
        hash: a.left.hash,
      },
      status: 'in-flight',
      timestamp: Date.now(),
    };
    const rightMessage: MerkleMessage = {
      id: this.generateMessageId(),
      from: this.replicas[0].id,
      to: this.replicas[1].id,
      type: 'CompareNode',
      payload: {
        range: a.right.range,
        hash: a.right.hash,
      },
      status: 'in-flight',
      timestamp: Date.now(),
    };
    this.messages.push(leftMessage, rightMessage);
  }

  private handleCompareNode(message: MerkleMessage): void {
    const [a, b] = this.replicas;
    if (!a || !b) return;

    const range = message.payload.range;
    const nodeA = this.findNode(a.root, range);
    const nodeB = this.findNode(b.root, range);
    if (!nodeA || !nodeB) return;

    if (nodeA.hash === nodeB.hash) {
      this.addEvent('node_match', `Range ${range[0]}-${range[1]} matches`, { range });
      return;
    }

    if (!nodeA.left || !nodeA.right || !nodeB.left || !nodeB.right) {
      this.enqueueLeafSync(range[0]);
      return;
    }

    this.enqueueNodeCompare(nodeA, nodeB);
  }

  private enqueueLeafSync(key: string): void {
    const [a, b] = this.replicas;
    if (!a || !b) return;
    const value = a.data.get(key);
    if (!value) return;
    const message: MerkleMessage = {
      id: this.generateMessageId(),
      from: a.id,
      to: b.id,
      type: 'SyncLeaf',
      payload: {
        range: [key, key],
        key,
        value,
      },
      status: 'in-flight',
      timestamp: Date.now(),
    };
    this.messages.push(message);
    this.addEvent('sync_leaf', `Sync ${key}`, { key });
  }

  private handleSyncLeaf(message: MerkleMessage): void {
    const replica = this.replicas.find((r) => r.id === message.to);
    if (!replica) return;
    if (!message.payload.key || message.payload.value === undefined) return;
    replica.data.set(message.payload.key, message.payload.value);
    this.buildTrees();
  }

  private findNode(root: MerkleNode | null, range: [string, string]): MerkleNode | null {
    if (!root) return null;
    if (root.range[0] === range[0] && root.range[1] === range[1]) return root;
    if (!root.left && !root.right) return null;
    if (root.left) {
      const match = this.findNode(root.left, range);
      if (match) return match;
    }
    if (root.right) {
      const match = this.findNode(root.right, range);
      if (match) return match;
    }
    return null;
  }

  getReplicas(): MerkleReplica[] {
    return this.replicas;
  }

  getMessages(): MerkleMessage[] {
    return this.messages;
  }

  getStats(): {
    replicaCount: number;
    mismatchedKeys: number;
  } {
    const [a, b] = this.replicas;
    if (!a || !b) {
      return { replicaCount: this.replicas.length, mismatchedKeys: 0 };
    }
    let mismatched = 0;
    this.keySpace.forEach((key) => {
      if (a.data.get(key) !== b.data.get(key)) mismatched += 1;
    });
    return {
      replicaCount: this.replicas.length,
      mismatchedKeys: mismatched,
    };
  }

  reset(): void {
    this.messages = [];
    this.eventLog = [];
    this.messageIdCounter = 0;
    this.replicas = [];
    for (let i = 0; i < 2; i++) {
      const data = new Map<string, string>();
      this.keySpace.forEach((key) => {
        data.set(key, `${key}-v1`);
      });
      this.replicas.push({ id: `R${i}`, data, root: null });
    }
    this.introduceDivergence();
    this.buildTrees();
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
