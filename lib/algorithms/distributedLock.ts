import { LockLease, LockMessage, LockNode, SimulationEvent } from '../types';

export class DistributedLockAlgorithm {
  private nodes: LockNode[];
  private messages: LockMessage[];
  private eventLog: SimulationEvent[];
  private messageIdCounter: number = 0;
  private lease: LockLease;
  private queue: string[];
  private leaseTtlMs: number;
  private managerId: string = 'L';

  constructor(clientCount: number = 4, leaseTtlMs: number = 4000) {
    this.nodes = [];
    this.messages = [];
    this.eventLog = [];
    this.queue = [];
    this.leaseTtlMs = leaseTtlMs;
    this.lease = { ownerId: null, expiresAt: null };

    const radius = 210;
    const centerX = 420;
    const centerY = 340;
    const angleStep = (2 * Math.PI) / clientCount;

    this.nodes.push({
      id: this.managerId,
      position: { x: centerX, y: centerY },
      status: 'healthy',
      role: 'manager',
      holdingLock: false,
      leaseExpiresAt: null,
      lastHeartbeat: null,
    });

    for (let i = 0; i < clientCount; i++) {
      const angle = i * angleStep - Math.PI / 2;
      this.nodes.push({
        id: `C${i}`,
        position: {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        },
        status: 'healthy',
        role: 'client',
        holdingLock: false,
        leaseExpiresAt: null,
        lastHeartbeat: null,
      });
    }
  }

  private generateMessageId(): string {
    return `lock-${this.messageIdCounter++}`;
  }

  requestLock(clientId: string): void {
    const client = this.nodes.find((n) => n.id === clientId && n.role === 'client');
    const manager = this.getManager();
    if (!client || !manager || client.status !== 'healthy') {
      this.addEvent('acquire_failed', `Acquire failed at ${clientId}`, { clientId });
      return;
    }

    const message: LockMessage = {
      id: this.generateMessageId(),
      from: clientId,
      to: manager.id,
      type: 'Acquire',
      payload: {},
      status: 'in-flight',
      timestamp: Date.now(),
    };
    this.messages.push(message);
    this.addEvent('acquire_request', `${clientId} requests lock`, { clientId });
  }

  releaseLock(clientId: string): void {
    const manager = this.getManager();
    if (!manager) return;

    const message: LockMessage = {
      id: this.generateMessageId(),
      from: clientId,
      to: manager.id,
      type: 'Release',
      payload: {},
      status: 'in-flight',
      timestamp: Date.now(),
    };
    this.messages.push(message);
    this.addEvent('release_request', `${clientId} releases lock`, { clientId });
  }

  sendHeartbeat(clientId: string): void {
    const manager = this.getManager();
    if (!manager) return;

    const message: LockMessage = {
      id: this.generateMessageId(),
      from: clientId,
      to: manager.id,
      type: 'Heartbeat',
      payload: {},
      status: 'in-flight',
      timestamp: Date.now(),
    };
    this.messages.push(message);
    this.addEvent('heartbeat_send', `${clientId} heartbeat`, { clientId });
  }

  checkTimeouts(): void {
    if (!this.lease.ownerId || !this.lease.expiresAt) return;
    if (Date.now() < this.lease.expiresAt) return;

    const ownerId = this.lease.ownerId;
    this.addEvent('lease_timeout', `Lease expired for ${ownerId}`, { ownerId });
    this.clearLease();

    const timeoutMessage: LockMessage = {
      id: this.generateMessageId(),
      from: this.managerId,
      to: ownerId,
      type: 'Timeout',
      payload: {},
      status: 'in-flight',
      timestamp: Date.now(),
    };
    this.messages.push(timeoutMessage);

    this.grantNextFromQueue();
  }

  deliverMessage(messageId: string): void {
    const message = this.messages.find((m) => m.id === messageId);
    if (!message) return;

    const toNode = this.nodes.find((n) => n.id === message.to);
    if (!toNode || toNode.status !== 'healthy') {
      message.status = 'failure';
      return;
    }

    switch (message.type) {
      case 'Acquire':
        this.handleAcquire(message);
        break;
      case 'Grant':
        this.handleGrant(message);
        break;
      case 'Heartbeat':
        this.handleHeartbeat(message);
        break;
      case 'Release':
        this.handleRelease(message);
        break;
      case 'Deny':
        break;
      case 'Timeout':
        this.handleTimeout(message);
        break;
    }

    message.status = 'success';
  }

  private handleAcquire(message: LockMessage): void {
    const manager = this.getManager();
    if (!manager || manager.status !== 'healthy') return;

    const now = Date.now();
    if (!this.lease.ownerId || (this.lease.expiresAt && this.lease.expiresAt < now)) {
      this.grantLease(message.from);
    } else {
      if (!this.queue.includes(message.from)) {
        this.queue.push(message.from);
      }
      const deny: LockMessage = {
        id: this.generateMessageId(),
        from: manager.id,
        to: message.from,
        type: 'Deny',
        payload: {
          reason: 'queued',
          queuePosition: this.queue.indexOf(message.from) + 1,
        },
        status: 'in-flight',
        timestamp: Date.now(),
      };
      this.messages.push(deny);
      this.addEvent('acquire_queued', `${message.from} queued`, {
        clientId: message.from,
        position: this.queue.indexOf(message.from) + 1,
      });
    }
  }

  private handleGrant(message: LockMessage): void {
    const client = this.nodes.find((n) => n.id === message.to);
    if (!client) return;
    client.holdingLock = true;
    client.leaseExpiresAt = message.payload.leaseExpiresAt || null;
    client.lastHeartbeat = Date.now();
  }

  private handleHeartbeat(message: LockMessage): void {
    const manager = this.getManager();
    if (!manager) return;
    if (this.lease.ownerId !== message.from) return;

    this.lease.expiresAt = Date.now() + this.leaseTtlMs;
    const client = this.nodes.find((n) => n.id === message.from);
    if (client) {
      client.leaseExpiresAt = this.lease.expiresAt;
      client.lastHeartbeat = Date.now();
    }

    this.addEvent('heartbeat_recv', `${message.from} renewed lease`, { clientId: message.from });
  }

  private handleRelease(message: LockMessage): void {
    if (this.lease.ownerId === message.from) {
      this.clearLease();
      this.addEvent('release_ack', `${message.from} released lock`, { clientId: message.from });
      this.grantNextFromQueue();
    }
  }

  private handleTimeout(message: LockMessage): void {
    const client = this.nodes.find((n) => n.id === message.to);
    if (!client) return;
    client.holdingLock = false;
    client.leaseExpiresAt = null;
  }

  private getManager(): LockNode | undefined {
    return this.nodes.find((n) => n.id === this.managerId);
  }

  private grantLease(clientId: string): void {
    this.queue = this.queue.filter((id) => id !== clientId);
    const expiresAt = Date.now() + this.leaseTtlMs;
    this.lease = { ownerId: clientId, expiresAt };

    const grant: LockMessage = {
      id: this.generateMessageId(),
      from: this.managerId,
      to: clientId,
      type: 'Grant',
      payload: { leaseExpiresAt: expiresAt },
      status: 'in-flight',
      timestamp: Date.now(),
    };
    this.messages.push(grant);

    const client = this.nodes.find((n) => n.id === clientId);
    if (client) {
      client.holdingLock = true;
      client.leaseExpiresAt = expiresAt;
      client.lastHeartbeat = Date.now();
    }

    this.addEvent('grant', `${clientId} granted lease`, { clientId, expiresAt });
  }

  private grantNextFromQueue(): void {
    const next = this.queue.shift();
    if (next) {
      this.grantLease(next);
    }
  }

  private clearLease(): void {
    const ownerId = this.lease.ownerId;
    if (ownerId) {
      const owner = this.nodes.find((n) => n.id === ownerId);
      if (owner) {
        owner.holdingLock = false;
        owner.leaseExpiresAt = null;
      }
    }
    this.lease = { ownerId: null, expiresAt: null };
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

  getNodes(): LockNode[] {
    return this.nodes;
  }

  getMessages(): LockMessage[] {
    return this.messages;
  }

  getStats(): {
    totalNodes: number;
    healthyNodes: number;
    leaseOwner: string | null;
    queueLength: number;
    leaseTtlMs: number;
  } {
    const healthyNodes = this.nodes.filter((n) => n.status === 'healthy');
    return {
      totalNodes: this.nodes.length,
      healthyNodes: healthyNodes.length,
      leaseOwner: this.lease.ownerId,
      queueLength: this.queue.length,
      leaseTtlMs: this.leaseTtlMs,
    };
  }

  reset(): void {
    this.nodes.forEach((node) => {
      node.status = 'healthy';
      node.holdingLock = false;
      node.leaseExpiresAt = null;
      node.lastHeartbeat = null;
    });
    this.messages = [];
    this.eventLog = [];
    this.messageIdCounter = 0;
    this.queue = [];
    this.lease = { ownerId: null, expiresAt: null };
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
