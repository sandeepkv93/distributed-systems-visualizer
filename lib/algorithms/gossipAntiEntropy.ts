import { GossipNode, GossipMessage, GossipMode, GossipValue, SimulationEvent } from '../types';

export class GossipAntiEntropyAlgorithm {
  private nodes: GossipNode[];
  private messages: GossipMessage[];
  private eventLog: SimulationEvent[];
  private messageIdCounter: number = 0;

  constructor(nodeCount: number = 6) {
    this.eventLog = [];
    this.messages = [];
    this.nodes = [];

    const angleStep = (2 * Math.PI) / nodeCount;
    const radius = 210;
    const centerX = 420;
    const centerY = 350;

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
    return `gossip-${this.messageIdCounter++}`;
  }

  setValue(nodeId: string, key: string, value: any): void {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (!node || node.status !== 'healthy') {
      this.addEvent('set_failed', `Write to ${nodeId} failed (node unhealthy)`, { nodeId, key });
      return;
    }

    const existing = node.data.get(key);
    const nextVersion = (existing?.version || 0) + 1;

    const dataValue: GossipValue = {
      value,
      version: nextVersion,
      origin: node.id,
      timestamp: Date.now(),
    };

    node.data.set(key, dataValue);
    node.version += 1;

    this.addEvent('set_value', `${nodeId} sets ${key}=${JSON.stringify(value)}`, { nodeId, key, value });
  }

  gossipRound(mode: GossipMode = 'push-pull', fanout: number = 1): void {
    const healthyNodes = this.nodes.filter((n) => n.status === 'healthy');
    if (healthyNodes.length < 2) {
      this.addEvent('gossip_skip', 'Not enough healthy nodes for gossip round', {});
      return;
    }

    healthyNodes.forEach((node) => {
      const peers = healthyNodes.filter((n) => n.id !== node.id);
      const targets = this.pickRandomPeers(peers, Math.min(fanout, peers.length));
      targets.forEach((target) => {
        this.sendGossipMessage(node.id, target.id, mode);
      });
    });

    this.addEvent('gossip_round', `Gossip round (${mode}) fanout=${fanout}`, { mode, fanout });
  }

  private pickRandomPeers(peers: GossipNode[], count: number): GossipNode[] {
    const shuffled = [...peers].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  private sendGossipMessage(fromId: string, toId: string, mode: GossipMode): void {
    const message: GossipMessage = {
      id: this.generateMessageId(),
      from: fromId,
      to: toId,
      type: 'Gossip',
      payload: {
        mode,
      },
      status: 'in-flight',
      timestamp: Date.now(),
    };
    this.messages.push(message);
  }

  deliverGossip(messageId: string): void {
    const message = this.messages.find((m) => m.id === messageId);
    if (!message) return;

    const fromNode = this.nodes.find((n) => n.id === message.from);
    const toNode = this.nodes.find((n) => n.id === message.to);

    if (!fromNode || !toNode || fromNode.status !== 'healthy' || toNode.status !== 'healthy') {
      message.status = 'failure';
      return;
    }

    if (message.payload.mode === 'push') {
      this.syncState(fromNode, toNode);
    } else if (message.payload.mode === 'pull') {
      this.syncState(toNode, fromNode);
    } else {
      this.syncState(fromNode, toNode);
      this.syncState(toNode, fromNode);
    }

    message.status = 'success';
  }

  private syncState(source: GossipNode, target: GossipNode): void {
    const updatedKeys: string[] = [];

    source.data.forEach((dataValue, key) => {
      const existing = target.data.get(key);
      if (!existing || existing.version < dataValue.version) {
        target.data.set(key, { ...dataValue });
        updatedKeys.push(key);
      }
    });

    if (updatedKeys.length > 0) {
      target.version += updatedKeys.length;
      this.addEvent('gossip_update', `${source.id} synced ${updatedKeys.join(', ')} to ${target.id}`, {
        from: source.id,
        to: target.id,
        keys: updatedKeys,
      });
    }
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

  getNodes(): GossipNode[] {
    return this.nodes;
  }

  getMessages(): GossipMessage[] {
    return this.messages;
  }

  getStats(): {
    totalNodes: number;
    healthyNodes: number;
    failedNodes: number;
    totalKeys: number;
    divergentNodes: number;
  } {
    const healthyNodes = this.nodes.filter((n) => n.status === 'healthy');
    const failedNodes = this.nodes.filter((n) => n.status === 'failed');

    const allKeys = new Set<string>();
    this.nodes.forEach((node) => {
      node.data.forEach((_, key) => allKeys.add(key));
    });

    const maxVersions: Record<string, number> = {};
    allKeys.forEach((key) => {
      let max = 0;
      this.nodes.forEach((node) => {
        const value = node.data.get(key);
        if (value) max = Math.max(max, value.version);
      });
      maxVersions[key] = max;
    });

    const divergentNodes = this.nodes.filter((node) => {
      if (node.status !== 'healthy') return false;
      for (const key of allKeys) {
        const value = node.data.get(key);
        if (!value || value.version < maxVersions[key]) {
          return true;
        }
      }
      return false;
    }).length;

    return {
      totalNodes: this.nodes.length,
      healthyNodes: healthyNodes.length,
      failedNodes: failedNodes.length,
      totalKeys: allKeys.size,
      divergentNodes,
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

  getEventLog(): SimulationEvent[] {
    return this.eventLog;
  }

  reset(): void {
    this.nodes.forEach((node) => {
      node.data.clear();
      node.status = 'healthy';
      node.version = 0;
    });
    this.messages = [];
    this.eventLog = [];
    this.messageIdCounter = 0;
  }

  clearMessages(): void {
    this.messages = this.messages.filter((m) => m.status === 'in-flight');
  }
}
