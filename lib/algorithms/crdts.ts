import { CRDTElement, CRDTMessage, CRDTReplica, SimulationEvent } from '../types';

const HEAD_ID = 'HEAD';
const DEFAULT_REPLICA_COUNT = 3;

export class CRDTAlgorithm {
  private replicas: CRDTReplica[];
  private messages: CRDTMessage[];
  private eventLog: SimulationEvent[];
  private messageIdCounter: number = 0;

  constructor(replicaCount: number = DEFAULT_REPLICA_COUNT) {
    this.replicas = [];
    this.messages = [];
    this.eventLog = [];

    for (let i = 0; i < replicaCount; i++) {
      const id = `R${i}`;
      const gCounter: Record<string, number> = {};
      for (let j = 0; j < replicaCount; j++) {
        gCounter[`R${j}`] = 0;
      }
      this.replicas.push({
        id,
        gCounter,
        orSetAdds: {},
        orSetRemoves: [],
        rga: {},
        localCounter: 0,
      });
    }
  }

  private generateMessageId(): string {
    return `crdt-${this.messageIdCounter++}`;
  }

  increment(replicaId: string): void {
    const replica = this.getReplica(replicaId);
    if (!replica) return;
    replica.gCounter[replicaId] += 1;
    this.addEvent('gcounter_inc', `${replicaId} increments`, { replicaId });
  }

  orSetAdd(replicaId: string, value: string): void {
    const replica = this.getReplica(replicaId);
    if (!replica) return;
    const tag = `${replicaId}-${replica.localCounter++}`;
    const existing = replica.orSetAdds[value] || [];
    replica.orSetAdds[value] = [...existing, tag];
    this.addEvent('orset_add', `${replicaId} adds ${value}`, { replicaId, value, tag });
  }

  orSetRemove(replicaId: string, value: string): void {
    const replica = this.getReplica(replicaId);
    if (!replica) return;
    const tags = replica.orSetAdds[value] || [];
    tags.forEach((tag) => {
      if (!replica.orSetRemoves.includes(tag)) {
        replica.orSetRemoves.push(tag);
      }
    });
    this.addEvent('orset_remove', `${replicaId} removes ${value}`, { replicaId, value });
  }

  rgaInsert(replicaId: string, value: string, afterId?: string): void {
    const replica = this.getReplica(replicaId);
    if (!replica) return;
    const insertAfter = afterId && (afterId === HEAD_ID || replica.rga[afterId]) ? afterId : this.getLastElementId(replica);
    const id = `${replicaId}-${replica.localCounter++}`;
    const element: CRDTElement = {
      id,
      value,
      prevId: insertAfter || HEAD_ID,
      tombstone: false,
    };
    replica.rga[id] = element;
    this.addEvent('rga_insert', `${replicaId} inserts ${value}`, { replicaId, id, value });
  }

  rgaRemove(replicaId: string, elementId: string): void {
    const replica = this.getReplica(replicaId);
    if (!replica) return;
    const element = replica.rga[elementId];
    if (!element) return;
    element.tombstone = true;
    this.addEvent('rga_remove', `${replicaId} removes ${elementId}`, { replicaId, elementId });
  }

  sync(fromId: string, toId: string): void {
    if (fromId === toId) return;
    const message: CRDTMessage = {
      id: this.generateMessageId(),
      from: fromId,
      to: toId,
      type: 'Sync',
      payload: { fromId, toId },
      status: 'in-flight',
      timestamp: Date.now(),
    };
    this.messages.push(message);
    this.addEvent('sync_send', `Sync ${fromId} -> ${toId}`, { fromId, toId });
  }

  syncAll(): void {
    for (let i = 0; i < this.replicas.length; i++) {
      for (let j = i + 1; j < this.replicas.length; j++) {
        this.sync(this.replicas[i].id, this.replicas[j].id);
      }
    }
  }

  deliverMessage(messageId: string): void {
    const message = this.messages.find((m) => m.id === messageId);
    if (!message) return;
    if (message.type === 'Sync') {
      const from = this.getReplica(message.from);
      const to = this.getReplica(message.to);
      if (from && to) {
        this.mergeReplica(from, to);
        this.mergeReplica(to, from);
      }
    }
    message.status = 'success';
  }

  private mergeReplica(source: CRDTReplica, target: CRDTReplica): void {
    Object.keys(source.gCounter).forEach((id) => {
      target.gCounter[id] = Math.max(target.gCounter[id] || 0, source.gCounter[id] || 0);
    });

    Object.entries(source.orSetAdds).forEach(([value, tags]) => {
      const existing = target.orSetAdds[value] || [];
      const merged = new Set([...existing, ...tags]);
      target.orSetAdds[value] = Array.from(merged);
    });
    source.orSetRemoves.forEach((tag) => {
      if (!target.orSetRemoves.includes(tag)) {
        target.orSetRemoves.push(tag);
      }
    });

    Object.values(source.rga).forEach((element) => {
      const existing = target.rga[element.id];
      if (!existing) {
        target.rga[element.id] = { ...element };
      } else if (element.tombstone && !existing.tombstone) {
        existing.tombstone = true;
      }
    });
  }

  getReplicas(): CRDTReplica[] {
    return this.replicas;
  }

  getMessages(): CRDTMessage[] {
    return this.messages;
  }

  getGCounterTotal(replica: CRDTReplica): number {
    return Object.values(replica.gCounter).reduce((sum, value) => sum + value, 0);
  }

  getORSetValues(replica: CRDTReplica): string[] {
    return Object.keys(replica.orSetAdds).filter((value) => {
      const tags = replica.orSetAdds[value] || [];
      return tags.some((tag) => !replica.orSetRemoves.includes(tag));
    });
  }

  getRgaSequence(replica: CRDTReplica): CRDTElement[] {
    const children: Record<string, CRDTElement[]> = {};
    Object.values(replica.rga).forEach((element) => {
      const key = element.prevId || HEAD_ID;
      if (!children[key]) children[key] = [];
      children[key].push(element);
    });
    Object.values(children).forEach((list) => list.sort((a, b) => a.id.localeCompare(b.id)));

    const ordered: CRDTElement[] = [];
    const traverse = (parentId: string) => {
      const list = children[parentId] || [];
      list.forEach((element) => {
        if (!element.tombstone) {
          ordered.push(element);
        }
        traverse(element.id);
      });
    };
    traverse(HEAD_ID);
    return ordered;
  }

  private getLastElementId(replica: CRDTReplica): string {
    const seq = this.getRgaSequence(replica);
    if (seq.length === 0) return HEAD_ID;
    return seq[seq.length - 1].id;
  }

  getStats(): {
    replicaCount: number;
    divergentGCounter: number;
    divergentORSet: number;
    divergentRGA: number;
  } {
    if (this.replicas.length === 0) {
      return { replicaCount: 0, divergentGCounter: 0, divergentORSet: 0, divergentRGA: 0 };
    }
    const base = this.replicas[0];
    const baseG = this.getGCounterTotal(base);
    const baseO = this.getORSetValues(base).join(',');
    const baseR = this.getRgaSequence(base).map((e) => e.value).join(',');

    let divergentG = 0;
    let divergentO = 0;
    let divergentR = 0;

    this.replicas.slice(1).forEach((replica) => {
      if (this.getGCounterTotal(replica) !== baseG) divergentG += 1;
      if (this.getORSetValues(replica).join(',') !== baseO) divergentO += 1;
      if (this.getRgaSequence(replica).map((e) => e.value).join(',') !== baseR) divergentR += 1;
    });

    return {
      replicaCount: this.replicas.length,
      divergentGCounter: divergentG,
      divergentORSet: divergentO,
      divergentRGA: divergentR,
    };
  }

  reset(): void {
    this.replicas = [];
    this.messages = [];
    this.eventLog = [];
    this.messageIdCounter = 0;
    for (let i = 0; i < DEFAULT_REPLICA_COUNT; i++) {
      const id = `R${i}`;
      const gCounter: Record<string, number> = {};
      for (let j = 0; j < DEFAULT_REPLICA_COUNT; j++) {
        gCounter[`R${j}`] = 0;
      }
      this.replicas.push({
        id,
        gCounter,
        orSetAdds: {},
        orSetRemoves: [],
        rga: {},
        localCounter: 0,
      });
    }
  }

  private getReplica(replicaId: string): CRDTReplica | undefined {
    return this.replicas.find((r) => r.id === replicaId);
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
