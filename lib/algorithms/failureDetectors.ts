import { FailureDetectorMessage, FailureDetectorNode, FDStatus, SimulationEvent } from '../types';

const PHI_THRESHOLD = 8;
const HEARTBEAT_INTERVAL = 1000;

export class FailureDetectorsAlgorithm {
  private nodes: FailureDetectorNode[];
  private messages: FailureDetectorMessage[];
  private eventLog: SimulationEvent[];
  private messageIdCounter: number = 0;

  constructor(nodeCount: number = 5) {
    this.nodes = [];
    this.messages = [];
    this.eventLog = [];

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
        lastHeartbeat: Date.now(),
        phi: 0,
        fdStatus: 'alive',
      });
    }
  }

  private generateMessageId(): string {
    return `fd-${this.messageIdCounter++}`;
  }

  sendHeartbeat(fromId: string): void {
    const fromNode = this.nodes.find((n) => n.id === fromId);
    if (!fromNode || fromNode.status === 'failed') return;

    this.nodes
      .filter((n) => n.id !== fromId && n.status !== 'failed')
      .forEach((target) => {
        const message: FailureDetectorMessage = {
          id: this.generateMessageId(),
          from: fromId,
          to: target.id,
          type: 'Heartbeat',
          payload: {
            targetId: target.id,
          },
          status: 'in-flight',
          timestamp: Date.now(),
        };
        this.messages.push(message);
      });
    this.addEvent('heartbeat_send', `${fromId} heartbeats`, { fromId });
  }

  probe(targetId: string, fromId: string): void {
    const fromNode = this.nodes.find((n) => n.id === fromId);
    if (!fromNode || fromNode.status === 'failed') return;
    const message: FailureDetectorMessage = {
      id: this.generateMessageId(),
      from: fromId,
      to: targetId,
      type: 'Probe',
      payload: {
        targetId,
      },
      status: 'in-flight',
      timestamp: Date.now(),
    };
    this.messages.push(message);
    this.addEvent('probe', `${fromId} probes ${targetId}`, { fromId, targetId });
  }

  deliverMessage(messageId: string): void {
    const message = this.messages.find((m) => m.id === messageId);
    if (!message) return;
    const toNode = this.nodes.find((n) => n.id === message.to);
    if (!toNode || toNode.status === 'failed') {
      message.status = 'failure';
      return;
    }

    if (message.type === 'Heartbeat') {
      toNode.lastHeartbeat = Date.now();
      toNode.phi = 0;
      toNode.fdStatus = 'alive';
      toNode.status = 'healthy';
      this.addEvent('heartbeat_recv', `${toNode.id} received heartbeat`, { toNode: toNode.id });
    } else if (message.type === 'Probe') {
      const ack: FailureDetectorMessage = {
        id: this.generateMessageId(),
        from: message.to,
        to: message.from,
        type: 'Ack',
        payload: {
          targetId: message.to,
        },
        status: 'in-flight',
        timestamp: Date.now(),
      };
      this.messages.push(ack);
      this.addEvent('ack_send', `${message.to} ack to ${message.from}`, { from: message.to, to: message.from });
    } else if (message.type === 'Ack') {
      this.addEvent('ack_recv', `${message.to} received ack`, { from: message.from });
      const observer = this.nodes.find((n) => n.id === message.to);
      if (observer) {
        observer.fdStatus = 'alive';
        observer.status = 'healthy';
      }
    } else if (message.type === 'Suspect') {
      toNode.fdStatus = 'suspect';
      toNode.status = 'processing';
      this.addEvent('suspect', `${toNode.id} suspected`, { nodeId: toNode.id });
    } else if (message.type === 'Confirm') {
      toNode.fdStatus = 'failed';
      toNode.status = 'failed';
      this.addEvent('confirm', `${toNode.id} confirmed failed`, { nodeId: toNode.id });
    }

    message.status = 'success';
  }

  tick(): void {
    const now = Date.now();
    this.nodes.forEach((node) => {
      if (node.fdStatus === 'failed') return;
      const elapsed = now - node.lastHeartbeat;
      node.phi = elapsed / HEARTBEAT_INTERVAL;
      if (node.phi >= PHI_THRESHOLD) {
        node.fdStatus = 'failed';
        node.status = 'failed';
      } else if (node.phi >= PHI_THRESHOLD / 2) {
        node.fdStatus = 'suspect';
        node.status = 'processing';
      } else {
        node.fdStatus = 'alive';
        if (node.status !== 'failed') {
          node.status = 'healthy';
        }
      }
    });
  }

  markFailed(nodeId: string): void {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (node) {
      node.fdStatus = 'failed';
      node.status = 'failed';
      this.addEvent('manual_fail', `${nodeId} failed`, { nodeId });
    }
  }

  recover(nodeId: string): void {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (node) {
      node.fdStatus = 'alive';
      node.status = 'healthy';
      node.lastHeartbeat = Date.now();
      node.phi = 0;
      this.addEvent('recover', `${nodeId} recovered`, { nodeId });
    }
  }

  getNodes(): FailureDetectorNode[] {
    return this.nodes;
  }

  getMessages(): FailureDetectorMessage[] {
    return this.messages;
  }

  getStats(): {
    totalNodes: number;
    alive: number;
    suspect: number;
    failed: number;
  } {
    const alive = this.nodes.filter((n) => n.fdStatus === 'alive').length;
    const suspect = this.nodes.filter((n) => n.fdStatus === 'suspect').length;
    const failed = this.nodes.filter((n) => n.fdStatus === 'failed').length;
    return {
      totalNodes: this.nodes.length,
      alive,
      suspect,
      failed,
    };
  }

  reset(): void {
    this.nodes.forEach((node) => {
      node.fdStatus = 'alive';
      node.status = 'healthy';
      node.lastHeartbeat = Date.now();
      node.phi = 0;
    });
    this.messages = [];
    this.eventLog = [];
    this.messageIdCounter = 0;
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
