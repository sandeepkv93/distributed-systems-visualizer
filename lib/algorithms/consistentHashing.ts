import { ConsistentHashNode, ConsistentHashKey, ConsistentHashRing, SimulationEvent } from '../types';

export class ConsistentHashingAlgorithm {
  private ring: ConsistentHashRing;
  private hashSpace: number = 2 ** 32; // 32-bit hash space
  private eventLog: SimulationEvent[];

  constructor(serverCount: number = 3, virtualNodesPerServer: number = 3) {
    this.ring = {
      nodes: [],
      keys: [],
      virtualNodesPerNode: virtualNodesPerServer,
    };
    this.eventLog = [];

    // Add initial servers
    for (let i = 0; i < serverCount; i++) {
      this.addServer(`server-${i}`);
    }
  }

  // Simple hash function (for demonstration - in production use MD5/SHA-1)
  private hash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % this.hashSpace;
  }

  // Add a server to the ring
  addServer(serverId: string): void {
    const { virtualNodesPerNode } = this.ring;

    // Create virtual nodes
    for (let i = 0; i < virtualNodesPerNode; i++) {
      const virtualId = `${serverId}-v${i}`;
      const hashValue = this.hash(virtualId);

      const node: ConsistentHashNode = {
        id: virtualId,
        hashValue,
        isVirtual: true,
        physicalNodeId: serverId,
        keys: [],
      };

      this.ring.nodes.push(node);
    }

    // Sort nodes by hash value
    this.ring.nodes.sort((a, b) => a.hashValue - b.hashValue);

    // Redistribute keys
    this.redistributeKeys();

    this.addEvent('server_added', `Added server ${serverId} with ${virtualNodesPerNode} virtual nodes`, {
      serverId,
      virtualNodes: virtualNodesPerNode,
    });
  }

  // Remove a server from the ring
  removeServer(serverId: string): void {
    // Find all virtual nodes for this server
    const virtualNodes = this.ring.nodes.filter((n) => n.physicalNodeId === serverId);

    // Collect keys that need to be moved
    const keysToMove: ConsistentHashKey[] = [];
    virtualNodes.forEach((vNode) => {
      keysToMove.push(...this.ring.keys.filter((k) => k.nodeId === vNode.id));
    });

    // Remove virtual nodes
    this.ring.nodes = this.ring.nodes.filter((n) => n.physicalNodeId !== serverId);

    // Redistribute affected keys
    keysToMove.forEach((key) => {
      const newNode = this.findNodeForKey(key.hashValue);
      if (newNode) {
        key.nodeId = newNode.id;
      }
    });

    this.updateNodeKeys();

    this.addEvent('server_removed', `Removed server ${serverId}`, {
      serverId,
      keysAffected: keysToMove.length,
    });
  }

  // Add a key to the ring
  addKey(key: string): void {
    const hashValue = this.hash(key);
    const node = this.findNodeForKey(hashValue);

    if (!node) {
      console.warn('No nodes available to store key');
      return;
    }

    const keyObj: ConsistentHashKey = {
      key,
      hashValue,
      nodeId: node.id,
    };

    this.ring.keys.push(keyObj);
    node.keys.push(key);

    this.addEvent('key_added', `Added key "${key}" to ${node.physicalNodeId}`, {
      key,
      hashValue,
      nodeId: node.physicalNodeId,
    });
  }

  // Find the node responsible for a given hash value
  private findNodeForKey(hashValue: number): ConsistentHashNode | null {
    if (this.ring.nodes.length === 0) return null;

    // Find the first node with hash >= key hash (clockwise)
    for (const node of this.ring.nodes) {
      if (node.hashValue >= hashValue) {
        return node;
      }
    }

    // Wrap around to the first node
    return this.ring.nodes[0];
  }

  // Redistribute all keys (used when topology changes)
  private redistributeKeys(): void {
    const allKeys = [...this.ring.keys];

    // Clear all node key lists
    this.ring.nodes.forEach((node) => {
      node.keys = [];
    });

    // Reassign each key
    allKeys.forEach((key) => {
      const node = this.findNodeForKey(key.hashValue);
      if (node) {
        key.nodeId = node.id;
      }
    });

    this.updateNodeKeys();
  }

  // Update node key lists based on key assignments
  private updateNodeKeys(): void {
    // Clear all node key lists
    this.ring.nodes.forEach((node) => {
      node.keys = [];
    });

    // Rebuild key lists
    this.ring.keys.forEach((key) => {
      const node = this.ring.nodes.find((n) => n.id === key.nodeId);
      if (node) {
        node.keys.push(key.key);
      }
    });
  }

  // Get ring state
  getRing(): ConsistentHashRing {
    return this.ring;
  }

  // Get physical servers (unique)
  getPhysicalServers(): string[] {
    const servers = new Set<string>();
    this.ring.nodes.forEach((node) => {
      if (node.physicalNodeId) {
        servers.add(node.physicalNodeId);
      }
    });
    return Array.from(servers).sort();
  }

  // Get load distribution (keys per physical server)
  getLoadDistribution(): Map<string, number> {
    const distribution = new Map<string, number>();

    this.ring.keys.forEach((key) => {
      const node = this.ring.nodes.find((n) => n.id === key.nodeId);
      if (node && node.physicalNodeId) {
        distribution.set(node.physicalNodeId, (distribution.get(node.physicalNodeId) || 0) + 1);
      }
    });

    return distribution;
  }

  // Calculate load balance statistics
  getLoadBalanceStats(): {
    min: number;
    max: number;
    avg: number;
    stdDev: number;
    imbalance: number;
  } {
    const distribution = this.getLoadDistribution();
    const loads = Array.from(distribution.values());

    if (loads.length === 0) {
      return { min: 0, max: 0, avg: 0, stdDev: 0, imbalance: 0 };
    }

    const min = Math.min(...loads);
    const max = Math.max(...loads);
    const avg = loads.reduce((sum, load) => sum + load, 0) / loads.length;

    // Standard deviation
    const variance = loads.reduce((sum, load) => sum + (load - avg) ** 2, 0) / loads.length;
    const stdDev = Math.sqrt(variance);

    // Imbalance factor (max/avg)
    const imbalance = avg > 0 ? max / avg : 0;

    return { min, max, avg, stdDev, imbalance };
  }

  // Add event to log
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

  // Get event log
  getEventLog(): SimulationEvent[] {
    return this.eventLog;
  }

  // Reset
  reset(): void {
    this.ring.nodes = [];
    this.ring.keys = [];
    this.eventLog = [];
  }

  // Batch add keys
  addRandomKeys(count: number, prefix: string = 'key'): void {
    for (let i = 0; i < count; i++) {
      this.addKey(`${prefix}-${i}`);
    }
  }

  // Get statistics
  getStats(): {
    totalNodes: number;
    physicalServers: number;
    virtualNodesPerServer: number;
    totalKeys: number;
    loadDistribution: Map<string, number>;
    loadStats: {
      min: number;
      max: number;
      avg: number;
      stdDev: number;
      imbalance: number;
    };
  } {
    return {
      totalNodes: this.ring.nodes.length,
      physicalServers: this.getPhysicalServers().length,
      virtualNodesPerServer: this.ring.virtualNodesPerNode,
      totalKeys: this.ring.keys.length,
      loadDistribution: this.getLoadDistribution(),
      loadStats: this.getLoadBalanceStats(),
    };
  }

  // Change virtual node count (requires rebuilding)
  setVirtualNodesPerServer(count: number): void {
    const servers = this.getPhysicalServers();
    const keys = this.ring.keys.map((k) => k.key);

    this.reset();
    this.ring.virtualNodesPerNode = count;

    // Re-add servers
    servers.forEach((serverId) => this.addServer(serverId));

    // Re-add keys
    keys.forEach((key) => this.addKey(key));

    this.addEvent('virtual_nodes_changed', `Changed virtual nodes per server to ${count}`, {
      count,
    });
  }
}
