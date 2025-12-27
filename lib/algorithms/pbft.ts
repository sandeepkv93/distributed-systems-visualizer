import { PBFTLogEntry, PBFTMessage, PBFTNode, PBFTPhase, SimulationEvent } from '../types';

export class PBFTAlgorithm {
  private nodes: PBFTNode[];
  private messages: PBFTMessage[];
  private eventLog: SimulationEvent[];
  private messageIdCounter: number = 0;
  private seqCounter: number = 0;

  constructor(nodeCount: number = 4) {
    this.nodes = [];
    this.messages = [];
    this.eventLog = [];

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
        view: 0,
        role: i === 0 ? 'primary' : 'replica',
        log: new Map(),
        executed: [],
      });
    }
  }

  private generateMessageId(): string {
    return `pbft-${this.messageIdCounter++}`;
  }

  private getFaultTolerance(): number {
    return Math.floor((this.nodes.length - 1) / 3);
  }

  private quorumSize(): number {
    const f = this.getFaultTolerance();
    return 2 * f + 1;
  }

  private getPrimary(view: number): PBFTNode | undefined {
    const index = view % this.nodes.length;
    return this.nodes[index];
  }

  private setRoles(view: number): void {
    const primary = this.getPrimary(view);
    this.nodes.forEach((node) => {
      node.view = view;
      node.role = node.id === primary?.id ? 'primary' : 'replica';
    });
  }

  clientRequest(value: any): void {
    const primary = this.nodes.find((n) => n.role === 'primary' && n.status === 'healthy');
    if (!primary) {
      this.addEvent('request_failed', 'No healthy primary available', {});
      return;
    }

    const requestId = `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const message: PBFTMessage = {
      id: this.generateMessageId(),
      from: 'client',
      to: primary.id,
      type: 'ClientRequest',
      payload: {
        requestId,
        view: primary.view,
        value,
      },
      status: 'in-flight',
      timestamp: Date.now(),
    };
    this.messages.push(message);

    this.addEvent('client_request', `Client sends ${JSON.stringify(value)} to ${primary.id}`, {
      requestId,
      primary: primary.id,
    });
  }

  triggerViewChange(): void {
    const newView = (this.nodes[0]?.view || 0) + 1;
    this.setRoles(newView);
    this.addEvent('view_change', `View change to v${newView}`, { newView });
  }

  deliverMessage(messageId: string): void {
    const message = this.messages.find((m) => m.id === messageId);
    if (!message) return;

    if (message.type === 'ClientRequest') {
      this.handleClientRequest(message);
    } else if (message.type === 'PrePrepare') {
      this.handlePrePrepare(message);
    } else if (message.type === 'Prepare') {
      this.handlePrepare(message);
    } else if (message.type === 'Commit') {
      this.handleCommit(message);
    } else if (message.type === 'ViewChange') {
      this.handleViewChange(message);
    }

    message.status = 'success';
  }

  private handleClientRequest(message: PBFTMessage): void {
    const primary = this.nodes.find((n) => n.id === message.to);
    if (!primary || primary.status !== 'healthy') return;

    const seq = this.seqCounter++;
    const entry: PBFTLogEntry = {
      requestId: message.payload.requestId,
      view: primary.view,
      seq,
      value: message.payload.value,
      phase: 'pre-prepare',
      prepares: [primary.id],
      commits: [],
    };
    primary.log.set(entry.requestId, entry);

    this.addEvent('pre_prepare', `${primary.id} pre-prepares ${entry.requestId}`, {
      requestId: entry.requestId,
      seq,
    });

    this.nodes.forEach((node) => {
      if (node.id === primary.id || node.status !== 'healthy') return;
      const prePrepare: PBFTMessage = {
        id: this.generateMessageId(),
        from: primary.id,
        to: node.id,
        type: 'PrePrepare',
        payload: {
          requestId: entry.requestId,
          view: primary.view,
          seq,
          value: entry.value,
        },
        status: 'in-flight',
        timestamp: Date.now(),
      };
      this.messages.push(prePrepare);
    });
  }

  private handlePrePrepare(message: PBFTMessage): void {
    const replica = this.nodes.find((n) => n.id === message.to);
    if (!replica || replica.status !== 'healthy') return;

    const entry: PBFTLogEntry = {
      requestId: message.payload.requestId,
      view: message.payload.view,
      seq: message.payload.seq || 0,
      value: message.payload.value,
      phase: 'prepare',
      prepares: [replica.id],
      commits: [],
    };
    replica.log.set(entry.requestId, entry);

    this.addEvent('prepare', `${replica.id} prepares ${entry.requestId}`, {
      requestId: entry.requestId,
    });

    this.nodes.forEach((node) => {
      if (node.id === replica.id || node.status !== 'healthy') return;
      const prepare: PBFTMessage = {
        id: this.generateMessageId(),
        from: replica.id,
        to: node.id,
        type: 'Prepare',
        payload: {
          requestId: entry.requestId,
          view: entry.view,
          seq: entry.seq,
          value: entry.value,
        },
        status: 'in-flight',
        timestamp: Date.now(),
      };
      this.messages.push(prepare);
    });
  }

  private handlePrepare(message: PBFTMessage): void {
    const node = this.nodes.find((n) => n.id === message.to);
    if (!node || node.status !== 'healthy') return;

    const entry = node.log.get(message.payload.requestId);
    if (!entry) {
      const newEntry: PBFTLogEntry = {
        requestId: message.payload.requestId,
        view: message.payload.view,
        seq: message.payload.seq || 0,
        value: message.payload.value,
        phase: 'prepare',
        prepares: [node.id, message.from],
        commits: [],
      };
      node.log.set(newEntry.requestId, newEntry);
    } else {
      if (!entry.prepares.includes(message.from)) {
        entry.prepares.push(message.from);
      }
    }

    const updatedEntry = node.log.get(message.payload.requestId);
    if (!updatedEntry) return;

    if (updatedEntry.prepares.length >= this.quorumSize() && updatedEntry.phase !== 'commit') {
      updatedEntry.phase = 'commit';
      this.addEvent('commit', `${node.id} commits ${updatedEntry.requestId}`, {
        requestId: updatedEntry.requestId,
      });

      this.nodes.forEach((replica) => {
        if (replica.id === node.id || replica.status !== 'healthy') return;
        const commit: PBFTMessage = {
          id: this.generateMessageId(),
          from: node.id,
          to: replica.id,
          type: 'Commit',
          payload: {
            requestId: updatedEntry.requestId,
            view: updatedEntry.view,
            seq: updatedEntry.seq,
            value: updatedEntry.value,
          },
          status: 'in-flight',
          timestamp: Date.now(),
        };
        this.messages.push(commit);
      });
    }
  }

  private handleCommit(message: PBFTMessage): void {
    const node = this.nodes.find((n) => n.id === message.to);
    if (!node || node.status !== 'healthy') return;

    const entry = node.log.get(message.payload.requestId);
    if (!entry) {
      const newEntry: PBFTLogEntry = {
        requestId: message.payload.requestId,
        view: message.payload.view,
        seq: message.payload.seq || 0,
        value: message.payload.value,
        phase: 'commit',
        prepares: [],
        commits: [message.from],
      };
      node.log.set(newEntry.requestId, newEntry);
    } else {
      if (!entry.commits.includes(message.from)) {
        entry.commits.push(message.from);
      }
    }

    const updatedEntry = node.log.get(message.payload.requestId);
    if (!updatedEntry) return;

    if (updatedEntry.commits.length + 1 >= this.quorumSize() && updatedEntry.phase !== 'executed') {
      updatedEntry.phase = 'executed';
      node.executed.push(updatedEntry);
      this.addEvent('execute', `${node.id} executes ${updatedEntry.requestId}`, {
        requestId: updatedEntry.requestId,
      });
    }
  }

  private handleViewChange(message: PBFTMessage): void {
    const newView = message.payload.newView ?? 0;
    this.setRoles(newView);
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

  getNodes(): PBFTNode[] {
    return this.nodes;
  }

  getMessages(): PBFTMessage[] {
    return this.messages;
  }

  getStats(): {
    totalNodes: number;
    healthyNodes: number;
    view: number;
    quorum: number;
    executed: number;
  } {
    const healthyNodes = this.nodes.filter((n) => n.status === 'healthy');
    const executed = this.nodes.reduce((sum, node) => sum + node.executed.length, 0);
    const view = this.nodes[0]?.view || 0;

    return {
      totalNodes: this.nodes.length,
      healthyNodes: healthyNodes.length,
      view,
      quorum: this.quorumSize(),
      executed,
    };
  }

  reset(): void {
    this.nodes.forEach((node, index) => {
      node.status = 'healthy';
      node.view = 0;
      node.role = index === 0 ? 'primary' : 'replica';
      node.log.clear();
      node.executed = [];
    });
    this.messages = [];
    this.eventLog = [];
    this.messageIdCounter = 0;
    this.seqCounter = 0;
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
