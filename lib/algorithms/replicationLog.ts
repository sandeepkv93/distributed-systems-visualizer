import { LogMessage, LogPartition, LogReplica, ReplicationLogEntry, SimulationEvent } from '../types';

export class ReplicationLogAlgorithm {
  private partition: LogPartition;
  private messages: LogMessage[];
  private eventLog: SimulationEvent[];
  private messageIdCounter: number = 0;

  constructor(replicaCount: number = 3) {
    this.messages = [];
    this.eventLog = [];
    this.partition = this.initializePartition(replicaCount);
  }

  private initializePartition(replicaCount: number): LogPartition {
    const replicas: LogReplica[] = [];
    for (let i = 0; i < replicaCount; i++) {
      replicas.push({
        id: `B${i}`,
        role: i === 0 ? 'leader' : 'follower',
        log: [],
        highWatermark: -1,
        lag: 0,
        inSync: true,
      });
    }
    return {
      id: 'P0',
      replicas,
      isr: replicas.map((r) => r.id),
      leaderId: replicas[0].id,
      nextOffset: 0,
    };
  }

  private generateMessageId(): string {
    return `log-${this.messageIdCounter++}`;
  }

  produce(value: string): void {
    const leader = this.getLeader();
    if (!leader) return;
    const entry: ReplicationLogEntry = {
      offset: this.partition.nextOffset++,
      value,
    };
    leader.log.push(entry);
    this.addEvent('produce', `Leader appended ${value} @${entry.offset}`, {
      offset: entry.offset,
      value,
    });

    this.partition.replicas
      .filter((r) => r.id !== leader.id)
      .forEach((replica) => {
        const message: LogMessage = {
          id: this.generateMessageId(),
          from: leader.id,
          to: replica.id,
          type: 'Replicate',
          payload: {
            partitionId: this.partition.id,
            offset: entry.offset,
            value: entry.value,
            leaderId: leader.id,
          },
          status: 'in-flight',
          timestamp: Date.now(),
        };
        this.messages.push(message);
      });
  }

  fetch(replicaId: string): void {
    const replica = this.partition.replicas.find((r) => r.id === replicaId);
    if (!replica) return;
    this.addEvent('fetch', `${replicaId} fetches up to ${replica.highWatermark}`, { replicaId });
  }

  markOutOfSync(replicaId: string): void {
    const replica = this.partition.replicas.find((r) => r.id === replicaId);
    if (!replica) return;
    replica.inSync = false;
    this.partition.isr = this.partition.isr.filter((id) => id !== replicaId);
    this.addEvent('isr_shrink', `${replicaId} removed from ISR`, { replicaId });
  }

  markInSync(replicaId: string): void {
    const replica = this.partition.replicas.find((r) => r.id === replicaId);
    if (!replica) return;
    replica.inSync = true;
    if (!this.partition.isr.includes(replicaId)) {
      this.partition.isr.push(replicaId);
    }
    this.addEvent('isr_add', `${replicaId} added to ISR`, { replicaId });
  }

  deliverMessage(messageId: string): void {
    const message = this.messages.find((m) => m.id === messageId);
    if (!message) return;
    if (message.type === 'Replicate') {
      this.handleReplicate(message);
    }
    message.status = 'success';
  }

  private handleReplicate(message: LogMessage): void {
    const replica = this.partition.replicas.find((r) => r.id === message.to);
    if (!replica || !message.payload.value || message.payload.offset === undefined) return;
    if (!replica.inSync) return;

    replica.log.push({ offset: message.payload.offset, value: message.payload.value });
    replica.lag = this.getLeader()?.log.length ? this.getLeader()!.log.length - replica.log.length : 0;

    this.addEvent('replicated', `${replica.id} replicated @${message.payload.offset}`, {
      replicaId: replica.id,
      offset: message.payload.offset,
    });

    this.updateHighWatermark();
  }

  private updateHighWatermark(): void {
    const leader = this.getLeader();
    if (!leader) return;
    const isrReplicas = this.partition.replicas.filter((r) => this.partition.isr.includes(r.id));
    if (isrReplicas.length === 0) return;
    const minOffset = Math.min(...isrReplicas.map((r) => (r.log.length ? r.log[r.log.length - 1].offset : -1)));
    isrReplicas.forEach((replica) => {
      replica.highWatermark = minOffset;
    });
  }

  getLeader(): LogReplica | undefined {
    return this.partition.replicas.find((r) => r.id === this.partition.leaderId);
  }

  getPartition(): LogPartition {
    return this.partition;
  }

  getMessages(): LogMessage[] {
    return this.messages;
  }

  getStats(): {
    replicas: number;
    isrSize: number;
    highWatermark: number;
    logSize: number;
  } {
    const leader = this.getLeader();
    const highWatermark = leader?.highWatermark ?? -1;
    const logSize = leader?.log.length ?? 0;
    return {
      replicas: this.partition.replicas.length,
      isrSize: this.partition.isr.length,
      highWatermark,
      logSize,
    };
  }

  reset(): void {
    this.messages = [];
    this.eventLog = [];
    this.messageIdCounter = 0;
    this.partition = this.initializePartition(this.partition.replicas.length);
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
