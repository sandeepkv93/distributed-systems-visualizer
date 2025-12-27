import { PartitionLink, PartitionMessage, PartitionNode, PartitionRole, SimulationEvent } from '../types';

export class NetworkPartitionsAlgorithm {
  private nodes: PartitionNode[];
  private links: PartitionLink[];
  private messages: PartitionMessage[];
  private eventLog: SimulationEvent[];
  private messageIdCounter: number = 0;
  private currentTerm: number = 0;

  constructor(nodeCount: number = 5) {
    this.nodes = [];
    this.links = [];
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
        role: 'follower',
        term: 0,
        partitionId: 'A',
        votes: 0,
        status: 'healthy',
      });
    }

    this.nodes.forEach((node) => {
      this.nodes.forEach((other) => {
        if (node.id !== other.id) {
          this.links.push({ from: node.id, to: other.id, status: 'up' });
        }
      });
    });
  }

  private generateMessageId(): string {
    return `partition-${this.messageIdCounter++}`;
  }

  split(partitionA: string[], partitionB: string[]): void {
    this.nodes.forEach((node) => {
      if (partitionA.includes(node.id)) node.partitionId = 'A';
      if (partitionB.includes(node.id)) node.partitionId = 'B';
    });

    this.links.forEach((link) => {
      const fromNode = this.nodes.find((n) => n.id === link.from);
      const toNode = this.nodes.find((n) => n.id === link.to);
      if (!fromNode || !toNode) return;
      link.status = fromNode.partitionId === toNode.partitionId ? 'up' : 'down';
    });

    this.addEvent('partition', 'Network partition created', { partitionA, partitionB });
  }

  heal(): void {
    this.nodes.forEach((node) => {
      node.partitionId = 'A';
    });
    this.links.forEach((link) => {
      link.status = 'up';
    });
    this.addEvent('heal', 'Network partition healed', {});
  }

  startElection(partitionId: string): void {
    const candidates = this.nodes.filter((n) => n.partitionId === partitionId);
    if (candidates.length === 0) return;
    const candidate = candidates[Math.floor(Math.random() * candidates.length)];
    candidate.role = 'candidate';
    candidate.votes = 1;
    candidate.term = ++this.currentTerm;

    this.addEvent('election_start', `${candidate.id} starts election`, { candidateId: candidate.id });

    candidates.forEach((node) => {
      if (node.id === candidate.id) return;
      const link = this.links.find((l) => l.from === candidate.id && l.to === node.id);
      if (link?.status === 'down') return;
      const message: PartitionMessage = {
        id: this.generateMessageId(),
        from: candidate.id,
        to: node.id,
        type: 'VoteRequest',
        payload: {
          term: candidate.term,
          partitionId,
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
    if (!toNode) return;

    if (message.type === 'VoteRequest') {
      if (toNode.term <= message.payload.term) {
        toNode.term = message.payload.term;
        const vote: PartitionMessage = {
          id: this.generateMessageId(),
          from: toNode.id,
          to: message.from,
          type: 'Vote',
          payload: {
            term: toNode.term,
            partitionId: toNode.partitionId,
          },
          status: 'in-flight',
          timestamp: Date.now(),
        };
        this.messages.push(vote);
      } else {
        const reject: PartitionMessage = {
          id: this.generateMessageId(),
          from: toNode.id,
          to: message.from,
          type: 'Reject',
          payload: {
            term: toNode.term,
            partitionId: toNode.partitionId,
          },
          status: 'in-flight',
          timestamp: Date.now(),
        };
        this.messages.push(reject);
      }
    } else if (message.type === 'Vote') {
      const candidate = this.nodes.find((n) => n.id === message.to);
      if (!candidate || candidate.role !== 'candidate') return;
      candidate.votes += 1;
      const partitionNodes = this.nodes.filter((n) => n.partitionId === candidate.partitionId);
      if (candidate.votes > Math.floor(partitionNodes.length / 2)) {
        this.nodes.forEach((node) => {
          if (node.partitionId === candidate.partitionId) {
            node.role = node.id === candidate.id ? 'leader' : 'follower';
            node.votes = 0;
          }
        });
        this.addEvent('leader_elected', `${candidate.id} becomes leader`, {
          leaderId: candidate.id,
          partitionId: candidate.partitionId,
        });
      }
    }

    message.status = 'success';
  }

  getNodes(): PartitionNode[] {
    return this.nodes;
  }

  getLinks(): PartitionLink[] {
    return this.links;
  }

  getMessages(): PartitionMessage[] {
    return this.messages;
  }

  getStats(): {
    totalNodes: number;
    leaders: number;
    partitions: number;
  } {
    const leaders = this.nodes.filter((n) => n.role === 'leader').length;
    const partitions = new Set(this.nodes.map((n) => n.partitionId)).size;
    return {
      totalNodes: this.nodes.length,
      leaders,
      partitions,
    };
  }

  reset(): void {
    this.nodes.forEach((node) => {
      node.role = 'follower';
      node.term = 0;
      node.partitionId = 'A';
      node.votes = 0;
    });
    this.links.forEach((link) => {
      link.status = 'up';
    });
    this.messages = [];
    this.eventLog = [];
    this.messageIdCounter = 0;
    this.currentTerm = 0;
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
