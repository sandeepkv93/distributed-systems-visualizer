import { EventualConsistencyNode, EventualConsistencyMessage, VectorClock, ConsistencyLevel, SimulationEvent } from '../types';

interface DataValue {
  value: any;
  vectorClock: VectorClock;
  timestamp: number;
}

export class EventualConsistencyAlgorithm {
  private nodes: EventualConsistencyNode[];
  private messages: EventualConsistencyMessage[];
  private eventLog: SimulationEvent[];
  private messageIdCounter: number = 0;
  private replicationFactor: number = 3;

  constructor(nodeCount: number = 5, replicationFactor: number = 3) {
    this.eventLog = [];
    this.messages = [];
    this.replicationFactor = replicationFactor;
    this.nodes = [];

    // Initialize nodes in a circular layout
    const angleStep = (2 * Math.PI) / nodeCount;
    const radius = 200;
    const centerX = 400;
    const centerY = 350;

    for (let i = 0; i < nodeCount; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const vectorClock: VectorClock = {};

      // Initialize vector clock for all nodes
      for (let j = 0; j < nodeCount; j++) {
        vectorClock[`N${j}`] = 0;
      }

      this.nodes.push({
        id: `N${i}`,
        position: {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        },
        status: 'healthy',
        data: new Map(),
        vectorClock,
        version: 0,
      });
    }
  }

  private generateMessageId(): string {
    return `msg-${this.messageIdCounter++}`;
  }

  // Write operation with configurable consistency level
  write(key: string, value: any, nodeId: string, consistencyLevel: ConsistencyLevel = 'QUORUM'): void {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (!node || node.status !== 'healthy') {
      this.addEvent('write_failed', `Write to ${nodeId} failed (node unhealthy)`, { key, nodeId });
      return;
    }

    // Update local data and vector clock
    node.vectorClock[nodeId] = (node.vectorClock[nodeId] || 0) + 1;
    node.version++;

    const dataValue: DataValue = {
      value,
      vectorClock: { ...node.vectorClock },
      timestamp: Date.now(),
    };

    node.data.set(key, dataValue);

    this.addEvent('write_local', `${nodeId} writes ${key}=${value}`, { key, value, nodeId });

    // Determine replication targets based on consistency level
    const healthyNodes = this.nodes.filter((n) => n.id !== nodeId && n.status === 'healthy');
    let replicaCount = 0;

    switch (consistencyLevel) {
      case 'ONE':
        // Write to coordinator only, background replication
        replicaCount = 0;
        break;
      case 'QUORUM':
        // Write to majority
        replicaCount = Math.floor((this.replicationFactor + 1) / 2) - 1;
        break;
      case 'ALL':
        // Write to all replicas
        replicaCount = Math.min(this.replicationFactor - 1, healthyNodes.length);
        break;
    }

    // Send replicate messages
    const replicaTargets = healthyNodes.slice(0, replicaCount);
    replicaTargets.forEach((targetNode) => {
      this.sendReplicateMessage(nodeId, targetNode.id, key, dataValue);
    });

    // Background replication for ONE
    if (consistencyLevel === 'ONE') {
      healthyNodes.slice(0, this.replicationFactor - 1).forEach((targetNode) => {
        setTimeout(() => {
          this.sendReplicateMessage(nodeId, targetNode.id, key, dataValue);
        }, 1000);
      });
    }

    this.addEvent('write_complete', `Write ${key}=${value} complete (${consistencyLevel})`, {
      key,
      value,
      nodeId,
      consistencyLevel,
      replicas: replicaCount,
    });
  }

  private sendReplicateMessage(fromId: string, toId: string, key: string, dataValue: DataValue): void {
    const message: EventualConsistencyMessage = {
      id: this.generateMessageId(),
      from: fromId,
      to: toId,
      type: 'Replicate',
      payload: {
        key,
        value: dataValue.value,
        vectorClock: dataValue.vectorClock,
      },
      status: 'in-flight',
      timestamp: Date.now(),
    };
    this.messages.push(message);

    this.addEvent('replicate_sent', `${fromId} → ${toId}: Replicate ${key}`, {
      from: fromId,
      to: toId,
      key,
    });
  }

  // Receive replication message
  receiveReplicate(messageId: string): void {
    const message = this.messages.find((m) => m.id === messageId);
    if (!message || message.type !== 'Replicate') return;

    const targetNode = this.nodes.find((n) => n.id === message.to);
    if (!targetNode || targetNode.status !== 'healthy') {
      message.status = 'failure';
      return;
    }

    const { key, value, vectorClock } = message.payload;

    // Merge vector clocks
    Object.keys(vectorClock).forEach((nodeId) => {
      targetNode.vectorClock[nodeId] = Math.max(
        targetNode.vectorClock[nodeId] || 0,
        vectorClock[nodeId] || 0
      );
    });

    // Check if incoming data is newer
    const existingData = targetNode.data.get(key);
    const shouldUpdate = !existingData || this.compareVectorClocks(vectorClock, existingData.vectorClock) === 'after';

    if (shouldUpdate) {
      const dataValue: DataValue = {
        value,
        vectorClock: { ...targetNode.vectorClock },
        timestamp: Date.now(),
      };
      targetNode.data.set(key, dataValue);
      targetNode.version++;

      this.addEvent('replicate_received', `${message.to} received ${key}=${value}`, {
        nodeId: message.to,
        key,
        value,
      });
    }

    message.status = 'success';
  }

  // Read operation with configurable consistency level
  read(key: string, nodeId: string, consistencyLevel: ConsistencyLevel = 'ONE'): any {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (!node || node.status !== 'healthy') {
      this.addEvent('read_failed', `Read from ${nodeId} failed (node unhealthy)`, { key, nodeId });
      return null;
    }

    const localData = node.data.get(key);

    switch (consistencyLevel) {
      case 'ONE':
        // Return local data immediately
        this.addEvent('read_local', `${nodeId} reads ${key}=${localData?.value || 'null'} (ONE)`, {
          key,
          nodeId,
          value: localData?.value,
        });
        return localData?.value || null;

      case 'QUORUM':
        // Read from quorum and return most recent
        const quorumSize = Math.floor((this.replicationFactor + 1) / 2);
        const healthyNodes = this.nodes.filter((n) => n.status === 'healthy');
        const readNodes = healthyNodes.slice(0, quorumSize);

        let mostRecentData = localData;
        readNodes.forEach((n) => {
          const data = n.data.get(key);
          if (
            data &&
            (!mostRecentData || this.compareVectorClocks(data.vectorClock, mostRecentData.vectorClock) === 'after')
          ) {
            mostRecentData = data;
          }
        });

        this.addEvent('read_quorum', `${nodeId} reads ${key}=${mostRecentData?.value || 'null'} (QUORUM)`, {
          key,
          nodeId,
          value: mostRecentData?.value,
          nodesRead: readNodes.length,
        });
        return mostRecentData?.value || null;

      case 'ALL':
        // Read from all replicas and return most recent
        const allNodes = this.nodes.filter((n) => n.status === 'healthy');
        let mostRecent = localData;

        allNodes.forEach((n) => {
          const data = n.data.get(key);
          if (data && (!mostRecent || this.compareVectorClocks(data.vectorClock, mostRecent.vectorClock) === 'after')) {
            mostRecent = data;
          }
        });

        this.addEvent('read_all', `${nodeId} reads ${key}=${mostRecent?.value || 'null'} (ALL)`, {
          key,
          nodeId,
          value: mostRecent?.value,
          nodesRead: allNodes.length,
        });
        return mostRecent?.value || null;
    }
  }

  // Anti-entropy: gossip protocol to sync data
  runAntiEntropy(): void {
    const healthyNodes = this.nodes.filter((n) => n.status === 'healthy');

    healthyNodes.forEach((node) => {
      // Pick a random peer
      const peers = healthyNodes.filter((n) => n.id !== node.id);
      if (peers.length === 0) return;

      const peer = peers[Math.floor(Math.random() * peers.length)];

      // Exchange all data
      node.data.forEach((dataValue, key) => {
        const peerData = peer.data.get(key);

        if (!peerData || this.compareVectorClocks(dataValue.vectorClock, peerData.vectorClock) === 'after') {
          // Node has newer data, send to peer
          this.sendReplicateMessage(node.id, peer.id, key, dataValue);
        } else if (this.compareVectorClocks(peerData.vectorClock, dataValue.vectorClock) === 'after') {
          // Peer has newer data, send to node
          this.sendReplicateMessage(peer.id, node.id, key, peerData);
        }
      });

      // Check for keys peer has that node doesn't
      peer.data.forEach((peerDataValue, key) => {
        if (!node.data.has(key)) {
          this.sendReplicateMessage(peer.id, node.id, key, peerDataValue);
        }
      });
    });

    this.addEvent('anti_entropy', 'Anti-entropy sync initiated', {});
  }

  // Compare vector clocks
  private compareVectorClocks(vc1: VectorClock, vc2: VectorClock): 'before' | 'after' | 'concurrent' {
    let vc1Greater = false;
    let vc2Greater = false;

    const allKeys = new Set([...Object.keys(vc1), ...Object.keys(vc2)]);

    allKeys.forEach((key) => {
      const v1 = vc1[key] || 0;
      const v2 = vc2[key] || 0;

      if (v1 > v2) vc1Greater = true;
      if (v2 > v1) vc2Greater = true;
    });

    if (vc1Greater && !vc2Greater) return 'after';
    if (vc2Greater && !vc1Greater) return 'before';
    if (!vc1Greater && !vc2Greater) return 'after'; // Equal, treat as after
    return 'concurrent';
  }

  // Fail a node
  failNode(nodeId: string): void {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (node) {
      node.status = 'failed';
      this.addEvent('node_failed', `${nodeId} failed`, { nodeId });
    }
  }

  // Recover a node
  recoverNode(nodeId: string): void {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (node) {
      node.status = 'healthy';
      this.addEvent('node_recovered', `${nodeId} recovered`, { nodeId });

      // Trigger anti-entropy to catch up
      setTimeout(() => this.runAntiEntropy(), 500);
    }
  }

  // Get current state
  getNodes(): EventualConsistencyNode[] {
    return this.nodes;
  }

  getMessages(): EventualConsistencyMessage[] {
    return this.messages;
  }

  // Statistics
  getStats(): {
    totalNodes: number;
    healthyNodes: number;
    failedNodes: number;
    totalKeys: number;
    inconsistentKeys: number;
    replicationFactor: number;
  } {
    const healthyNodes = this.nodes.filter((n) => n.status === 'healthy');
    const failedNodes = this.nodes.filter((n) => n.status === 'failed');

    // Collect all unique keys
    const allKeys = new Set<string>();
    this.nodes.forEach((node) => {
      node.data.forEach((_, key) => allKeys.add(key));
    });

    // Check for inconsistencies
    let inconsistentKeys = 0;
    allKeys.forEach((key) => {
      const values = new Map<any, number>();
      this.nodes
        .filter((n) => n.status === 'healthy')
        .forEach((node) => {
          const data = node.data.get(key);
          if (data) {
            const count = values.get(data.value) || 0;
            values.set(data.value, count + 1);
          }
        });

      if (values.size > 1) {
        inconsistentKeys++;
      }
    });

    return {
      totalNodes: this.nodes.length,
      healthyNodes: healthyNodes.length,
      failedNodes: failedNodes.length,
      totalKeys: allKeys.size,
      inconsistentKeys,
      replicationFactor: this.replicationFactor,
    };
  }

  // Event log
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

  getEventLog(): SimulationEvent[] {
    return this.eventLog;
  }

  // Reset
  reset(): void {
    this.nodes.forEach((node) => {
      node.data.clear();
      node.status = 'healthy';
      node.version = 0;
      Object.keys(node.vectorClock).forEach((key) => {
        node.vectorClock[key] = 0;
      });
    });
    this.messages = [];
    this.eventLog = [];
    this.messageIdCounter = 0;
  }

  // Clear messages
  clearMessages(): void {
    this.messages = this.messages.filter((m) => m.status === 'in-flight');
  }
}
