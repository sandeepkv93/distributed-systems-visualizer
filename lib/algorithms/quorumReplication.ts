import { QuorumNode, QuorumMessage, QuorumValue, SimulationEvent } from '../types';

export class QuorumReplicationAlgorithm {
  private nodes: QuorumNode[];
  private messages: QuorumMessage[];
  private eventLog: SimulationEvent[];
  private messageIdCounter: number = 0;
  private replicationFactor: number;

  constructor(nodeCount: number = 5, replicationFactor: number = 3) {
    this.nodes = [];
    this.messages = [];
    this.eventLog = [];
    this.replicationFactor = replicationFactor;

    const angleStep = (2 * Math.PI) / nodeCount;
    const radius = 210;
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
        data: new Map(),
        version: 0,
      });
    }
  }

  private generateMessageId(): string {
    return `q-${this.messageIdCounter++}`;
  }

  write(key: string, value: any, nodeId: string, quorumWrite: number): void {
    const coordinator = this.nodes.find((n) => n.id === nodeId);
    if (!coordinator || coordinator.status !== 'healthy') {
      this.addEvent('write_failed', `Write failed at ${nodeId}`, { nodeId, key });
      return;
    }

    coordinator.version += 1;
    const dataValue: QuorumValue = {
      value,
      version: coordinator.version,
      timestamp: Date.now(),
    };
    coordinator.data.set(key, dataValue);

    this.addEvent('write_local', `${nodeId} writes ${key}=${JSON.stringify(value)}`, {
      nodeId,
      key,
      value,
      version: dataValue.version,
    });

    const replicaTargets = this.getReplicaTargets(nodeId);
    let acked = 1;

    replicaTargets.forEach((target) => {
      const message: QuorumMessage = {
        id: this.generateMessageId(),
        from: nodeId,
        to: target.id,
        type: 'Write',
        payload: {
          key,
          value,
          version: dataValue.version,
        },
        status: 'in-flight',
        timestamp: Date.now(),
      };
      this.messages.push(message);

      if (target.status === 'healthy') {
        acked += 1;
      }
    });

    const success = acked >= quorumWrite;
    this.addEvent(
      success ? 'write_quorum' : 'write_incomplete',
      `${nodeId} write ${success ? 'reached' : 'missed'} W=${quorumWrite}`,
      { nodeId, key, quorumWrite, acked }
    );
  }

  read(key: string, nodeId: string, quorumRead: number): void {
    const coordinator = this.nodes.find((n) => n.id === nodeId);
    if (!coordinator || coordinator.status !== 'healthy') {
      this.addEvent('read_failed', `Read failed at ${nodeId}`, { nodeId, key });
      return;
    }

    const replicaTargets = [coordinator, ...this.getReplicaTargets(nodeId)];
    const healthyTargets = replicaTargets.filter((n) => n.status === 'healthy');
    const sample = healthyTargets.slice(0, Math.min(quorumRead, healthyTargets.length));

    const values = sample
      .map((node) => {
        const value = node.data.get(key);
        return value ? { nodeId: node.id, value } : null;
      })
      .filter(Boolean) as { nodeId: string; value: QuorumValue }[];

    const latest = values.sort((a, b) => b.value.version - a.value.version)[0];

    this.addEvent('read_quorum', `${nodeId} reads ${key} via R=${quorumRead}`, {
      nodeId,
      key,
      quorumRead,
      observed: values.map((v) => ({ nodeId: v.nodeId, version: v.value.version })),
      latest: latest?.value?.version,
    });

    if (latest) {
      this.runReadRepair(key, latest.value, values.map((v) => v.nodeId));
    }
  }

  private runReadRepair(key: string, latest: QuorumValue, observedNodes: string[]): void {
    this.nodes.forEach((node) => {
      if (node.status !== 'healthy') return;
      const current = node.data.get(key);
      if (!current || current.version < latest.version) {
        const message: QuorumMessage = {
          id: this.generateMessageId(),
          from: 'repair',
          to: node.id,
          type: 'Repair',
          payload: {
            key,
            value: latest.value,
            version: latest.version,
          },
          status: 'in-flight',
          timestamp: Date.now(),
        };
        this.messages.push(message);
      }
    });

    this.addEvent('read_repair', `Read repair for ${key} (v${latest.version})`, {
      key,
      repairedNodes: this.nodes.filter((n) => !observedNodes.includes(n.id)).map((n) => n.id),
    });
  }

  deliverMessage(messageId: string): void {
    const message = this.messages.find((m) => m.id === messageId);
    if (!message) return;

    const toNode = this.nodes.find((n) => n.id === message.to);
    if (!toNode || toNode.status !== 'healthy') {
      message.status = 'failure';
      return;
    }

    if (message.type === 'Write' || message.type === 'Repair') {
      const { key, value, version } = message.payload;
      if (key && value !== undefined && version !== undefined) {
        const existing = toNode.data.get(key);
        if (!existing || existing.version < version) {
          toNode.data.set(key, {
            value,
            version,
            timestamp: Date.now(),
          });
          toNode.version = Math.max(toNode.version, version);
        }
      }
    }

    message.status = 'success';
  }

  failNode(nodeId: string): void {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (node) {
      node.status = 'failed';
      this.addEvent('node_failed', `${nodeId} failed`, { nodeId });
    }
  }

  recoverNode(nodeId: string): void {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (node) {
      node.status = 'healthy';
      this.addEvent('node_recovered', `${nodeId} recovered`, { nodeId });
    }
  }

  getReplicaTargets(nodeId: string): QuorumNode[] {
    const healthy = this.nodes.filter((n) => n.id !== nodeId);
    return healthy.slice(0, Math.min(this.replicationFactor - 1, healthy.length));
  }

  getNodes(): QuorumNode[] {
    return this.nodes;
  }

  getMessages(): QuorumMessage[] {
    return this.messages;
  }

  getStats(): {
    totalNodes: number;
    healthyNodes: number;
    totalKeys: number;
    replicationFactor: number;
  } {
    const healthyNodes = this.nodes.filter((n) => n.status === 'healthy');
    const allKeys = new Set<string>();
    this.nodes.forEach((node) => node.data.forEach((_, key) => allKeys.add(key)));

    return {
      totalNodes: this.nodes.length,
      healthyNodes: healthyNodes.length,
      totalKeys: allKeys.size,
      replicationFactor: this.replicationFactor,
    };
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

  reset(): void {
    this.nodes.forEach((node) => {
      node.data.clear();
      node.version = 0;
      node.status = 'healthy';
    });
    this.messages = [];
    this.eventLog = [];
    this.messageIdCounter = 0;
  }
}
