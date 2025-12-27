import {
  ConsensusEntry,
  ConsensusMessage,
  ConsensusNode,
  ConsensusVariant,
  EPaxosInstance,
  SimulationEvent,
} from '../types';

export class ConsensusVariantsAlgorithm {
  private variants: Record<ConsensusVariant, ConsensusNode[]>;
  private messages: ConsensusMessage[];
  private eventLog: SimulationEvent[];
  private messageIdCounter: number = 0;
  private entryCounter: number = 0;
  private instanceCounter: number = 0;

  constructor(nodeCount: number = 5) {
    this.messages = [];
    this.eventLog = [];
    this.variants = {
      'raft-joint': this.createNodes(nodeCount),
      'multi-paxos': this.createNodes(nodeCount),
      epaxos: this.createNodes(nodeCount),
    };
  }

  private createNodes(nodeCount: number): ConsensusNode[] {
    const angleStep = (2 * Math.PI) / nodeCount;
    const radius = 200;
    const centerX = 420;
    const centerY = 340;

    return Array.from({ length: nodeCount }, (_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      return {
        id: `N${i}`,
        position: {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        },
        status: 'healthy',
        role: 'follower',
        term: 0,
        log: [],
        configPhase: 'old',
        inNewConfig: false,
        committedIndex: -1,
        instances: [],
      };
    });
  }

  private generateMessageId(): string {
    return `consensus-${this.messageIdCounter++}`;
  }

  private generateEntryId(): string {
    return `e-${this.entryCounter++}`;
  }

  private generateInstanceId(): string {
    return `i-${this.instanceCounter++}`;
  }

  electLeader(variant: ConsensusVariant, nodeId: string): void {
    const nodes = this.variants[variant];
    nodes.forEach((node) => {
      node.role = node.id === nodeId ? 'leader' : 'follower';
      node.term += node.id === nodeId ? 1 : 0;
    });
    this.addEvent('leader', `${nodeId} elected leader (${variant})`, { variant, nodeId });
  }

  startJointConsensus(newConfigIds: string[]): void {
    const nodes = this.variants['raft-joint'];
    nodes.forEach((node) => {
      node.configPhase = 'joint';
      node.inNewConfig = newConfigIds.includes(node.id);
    });
    this.addEvent('joint_start', 'Joint consensus started', { newConfigIds });
  }

  finalizeJointConsensus(): void {
    const nodes = this.variants['raft-joint'];
    nodes.forEach((node) => {
      node.configPhase = node.inNewConfig ? 'new' : 'old';
    });
    this.addEvent('joint_end', 'Joint consensus finalized', {});
  }

  appendEntry(variant: ConsensusVariant, value: string): void {
    const nodes = this.variants[variant];
    const leader = nodes.find((n) => n.role === 'leader') || nodes[0];
    const entry: ConsensusEntry = {
      id: this.generateEntryId(),
      value,
      committed: false,
    };
    leader.log.push(entry);

    nodes
      .filter((n) => n.id !== leader.id)
      .forEach((follower) => {
        const message: ConsensusMessage = {
          id: this.generateMessageId(),
          from: leader.id,
          to: follower.id,
          type: 'Append',
          payload: {
            entryId: entry.id,
            value: entry.value,
          },
          status: 'in-flight',
          timestamp: Date.now(),
        };
        this.messages.push(message);
      });

    entry.committed = true;
    leader.committedIndex = leader.log.length - 1;
    this.addEvent('append', `${leader.id} appends ${entry.value}`, { variant, entryId: entry.id });
  }

  proposeMultiPaxos(value: string): void {
    const nodes = this.variants['multi-paxos'];
    const leader = nodes.find((n) => n.role === 'leader') || nodes[0];
    this.appendEntry('multi-paxos', value);
    leader.term += 1;
  }

  proposeEPaxos(value: string, path: 'fast' | 'slow'): void {
    const nodes = this.variants.epaxos;
    const proposer = nodes[Math.floor(Math.random() * nodes.length)];
    proposer.role = 'proposer';
    const instance: EPaxosInstance = {
      id: this.generateInstanceId(),
      leaderId: proposer.id,
      command: value,
      path,
      committed: path === 'fast',
    };
    proposer.instances.push(instance);
    this.addEvent('epaxos', `${proposer.id} proposes ${value} (${path})`, {
      instanceId: instance.id,
      path,
    });
  }

  deliverMessage(messageId: string): void {
    const message = this.messages.find((m) => m.id === messageId);
    if (!message) return;
    const node = Object.values(this.variants).flat().find((n) => n.id === message.to);
    if (!node) return;
    if (message.type === 'Append' && message.payload.entryId && message.payload.value) {
      node.log.push({
        id: message.payload.entryId,
        value: message.payload.value,
        committed: true,
      });
      node.committedIndex = node.log.length - 1;
    }
    message.status = 'success';
  }

  getNodes(variant: ConsensusVariant): ConsensusNode[] {
    return this.variants[variant];
  }

  getMessages(): ConsensusMessage[] {
    return this.messages;
  }

  getStats(variant: ConsensusVariant): {
    nodes: number;
    committed: number;
    configPhase?: string;
  } {
    const nodes = this.variants[variant];
    const committed = nodes.reduce((sum, node) => sum + node.log.filter((e) => e.committed).length, 0);
    const configPhase = variant === 'raft-joint' ? nodes[0]?.configPhase : undefined;
    return {
      nodes: nodes.length,
      committed,
      configPhase,
    };
  }

  reset(): void {
    this.messages = [];
    this.eventLog = [];
    this.messageIdCounter = 0;
    this.entryCounter = 0;
    this.instanceCounter = 0;
    this.variants = {
      'raft-joint': this.createNodes(5),
      'multi-paxos': this.createNodes(5),
      epaxos: this.createNodes(5),
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
}
