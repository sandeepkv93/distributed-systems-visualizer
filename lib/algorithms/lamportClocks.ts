import { LamportNode, LamportMessage, LamportHoldbackMessage, SimulationEvent } from '../types';

export class LamportClocksAlgorithm {
  private nodes: LamportNode[];
  private messages: LamportMessage[];
  private eventLog: SimulationEvent[];
  private messageIdCounter: number = 0;
  private pendingAcks: Map<string, Set<string>> = new Map();

  constructor(nodeCount: number = 3) {
    this.nodes = [];
    this.messages = [];
    this.eventLog = [];

    const angleStep = (2 * Math.PI) / nodeCount;
    const radius = 190;
    const centerX = 420;
    const centerY = 340;

    for (let i = 0; i < nodeCount; i++) {
      const angle = i * angleStep - Math.PI / 2;
      this.nodes.push({
        id: `P${i}`,
        position: {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        },
        status: 'healthy',
        clock: 0,
        holdback: [],
        delivered: [],
      });
    }
  }

  private generateMessageId(): string {
    return `b-${this.messageIdCounter++}`;
  }

  localEvent(nodeId: string, description: string = 'local event'): void {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (!node || node.status !== 'healthy') return;
    node.clock += 1;
    this.addEvent('local_event', `${nodeId} ${description} (clock=${node.clock})`, { nodeId });
  }

  broadcast(fromId: string, value: any): void {
    const node = this.nodes.find((n) => n.id === fromId);
    if (!node || node.status !== 'healthy') return;

    node.clock += 1;
    const messageId = this.generateMessageId();
    const timestamp = node.clock;

    const holdback: LamportHoldbackMessage = {
      id: messageId,
      from: fromId,
      timestamp,
      value,
      acks: [fromId],
    };

    const pending = this.pendingAcks.get(messageId);
    if (pending) {
      pending.forEach((id) => {
        if (!holdback.acks.includes(id)) {
          holdback.acks.push(id);
        }
      });
      this.pendingAcks.delete(messageId);
    }

    node.holdback.push(holdback);

    this.addEvent('broadcast', `${fromId} broadcasts ${JSON.stringify(value)} (t=${timestamp})`, {
      fromId,
      messageId,
      timestamp,
      value,
    });

    this.sendBroadcast(fromId, messageId, value, timestamp);
    this.sendAck(fromId, messageId);
    this.tryDeliver(node);
  }

  private sendBroadcast(fromId: string, messageId: string, value: any, timestamp: number): void {
    this.nodes.forEach((node) => {
      if (node.id === fromId || node.status !== 'healthy') return;
      const message: LamportMessage = {
        id: `msg-${messageId}-${node.id}`,
        from: fromId,
        to: node.id,
        type: 'Broadcast',
        payload: {
          messageId,
          value,
          timestamp,
        },
        status: 'in-flight',
        timestamp: Date.now(),
      };
      this.messages.push(message);
    });
  }

  private sendAck(fromId: string, messageId: string): void {
    const node = this.nodes.find((n) => n.id === fromId);
    if (!node || node.status !== 'healthy') return;
    node.clock += 1;
    const ackTimestamp = node.clock;

    this.nodes.forEach((target) => {
      if (target.id === fromId || target.status !== 'healthy') return;
      const message: LamportMessage = {
        id: `ack-${messageId}-${fromId}-${target.id}`,
        from: fromId,
        to: target.id,
        type: 'Ack',
        payload: {
          messageId,
          ackTimestamp,
        },
        status: 'in-flight',
        timestamp: Date.now(),
      };
      this.messages.push(message);
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

    if (message.type === 'Broadcast') {
      this.receiveBroadcast(message, toNode);
    } else {
      this.receiveAck(message, toNode);
    }

    message.status = 'success';
  }

  private receiveBroadcast(message: LamportMessage, toNode: LamportNode): void {
    const messageId = message.payload.messageId;
    const timestamp = message.payload.timestamp || 0;
    toNode.clock = Math.max(toNode.clock, timestamp) + 1;

    let holdback = toNode.holdback.find((m) => m.id === messageId);
    if (!holdback) {
      holdback = {
        id: messageId,
        from: message.from,
        timestamp,
        value: message.payload.value,
        acks: [],
      };
      const pending = this.pendingAcks.get(messageId);
      if (pending) {
        pending.forEach((id) => {
          if (!holdback?.acks.includes(id)) {
            holdback?.acks.push(id);
          }
        });
        this.pendingAcks.delete(messageId);
      }
      toNode.holdback.push(holdback);
    }

    if (!holdback.acks.includes(toNode.id)) {
      holdback.acks.push(toNode.id);
    }

    this.addEvent('broadcast_recv', `${toNode.id} receives ${JSON.stringify(message.payload.value)}`, {
      toId: toNode.id,
      fromId: message.from,
      messageId,
    });

    this.sendAck(toNode.id, messageId);
    this.tryDeliver(toNode);
  }

  private receiveAck(message: LamportMessage, toNode: LamportNode): void {
    const messageId = message.payload.messageId;
    const ackTimestamp = message.payload.ackTimestamp || 0;
    toNode.clock = Math.max(toNode.clock, ackTimestamp) + 1;

    const holdback = toNode.holdback.find((m) => m.id === messageId);
    if (holdback) {
      if (!holdback.acks.includes(message.from)) {
        holdback.acks.push(message.from);
      }
    } else {
      const pending = this.pendingAcks.get(messageId) || new Set<string>();
      pending.add(message.from);
      this.pendingAcks.set(messageId, pending);
    }

    this.addEvent('ack_recv', `${toNode.id} receives ack for ${messageId}`, {
      toId: toNode.id,
      fromId: message.from,
      messageId,
    });

    this.tryDeliver(toNode);
  }

  private tryDeliver(node: LamportNode): void {
    const totalNodes = this.nodes.length;
    let delivered = true;

    while (delivered) {
      delivered = false;
      const sorted = [...node.holdback].sort((a, b) => {
        if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
        return a.from.localeCompare(b.from);
      });

      const next = sorted[0];
      if (!next) return;
      if (next.acks.length < totalNodes) return;

      node.holdback = node.holdback.filter((m) => m.id !== next.id);
      node.delivered.push(next);
      this.addEvent('deliver', `${node.id} delivers ${JSON.stringify(next.value)}`, {
        nodeId: node.id,
        messageId: next.id,
      });
      delivered = true;
    }
  }

  getNodes(): LamportNode[] {
    return this.nodes;
  }

  getMessages(): LamportMessage[] {
    return this.messages;
  }

  getStats(): {
    totalNodes: number;
    totalBroadcasts: number;
    totalDelivered: number;
    pendingMessages: number;
  } {
    const totalDelivered = this.nodes.reduce((sum, node) => sum + node.delivered.length, 0);
    const pendingMessages = this.nodes.reduce((sum, node) => sum + node.holdback.length, 0);
    const totalBroadcasts = this.messageIdCounter;

    return {
      totalNodes: this.nodes.length,
      totalBroadcasts,
      totalDelivered,
      pendingMessages,
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
      node.clock = 0;
      node.holdback = [];
      node.delivered = [];
      node.status = 'healthy';
    });
    this.messages = [];
    this.eventLog = [];
    this.messageIdCounter = 0;
    this.pendingAcks.clear();
  }
}
