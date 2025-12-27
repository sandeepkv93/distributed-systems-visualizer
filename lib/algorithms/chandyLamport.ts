import { SnapshotNode, SnapshotMessage, SnapshotState, SnapshotChannelRecord, SimulationEvent } from '../types';

export class ChandyLamportAlgorithm {
  private nodes: SnapshotNode[];
  private messages: SnapshotMessage[];
  private eventLog: SimulationEvent[];
  private messageIdCounter: number = 0;
  private snapshotCounter: number = 0;

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
        localState: 0,
      });
    }
  }

  private generateMessageId(): string {
    return `snapshot-msg-${this.messageIdCounter++}`;
  }

  private createSnapshotState(
    node: SnapshotNode,
    snapshotId: string,
    allIncoming: string[],
    recordingFrom: string[]
  ): SnapshotState {
    const channels: Record<string, SnapshotChannelRecord[]> = {};
    allIncoming.forEach((fromId) => {
      channels[fromId] = [];
    });
    return {
      id: snapshotId,
      localState: node.localState,
      channels,
      recordingFrom: [...recordingFrom],
      complete: recordingFrom.length === 0,
    };
  }

  startSnapshot(initiatorId: string): void {
    const node = this.nodes.find((n) => n.id === initiatorId);
    if (!node || node.status !== 'healthy') {
      this.addEvent('snapshot_failed', `Snapshot start failed at ${initiatorId}`, { initiatorId });
      return;
    }

    const snapshotId = `S${this.snapshotCounter++}`;
    const incoming = this.nodes.filter((n) => n.id !== node.id).map((n) => n.id);
    node.snapshot = this.createSnapshotState(node, snapshotId, incoming, incoming);

    this.addEvent('snapshot_start', `Snapshot ${snapshotId} started at ${initiatorId}`, {
      snapshotId,
      initiatorId,
    });
    this.addEvent('snapshot_record', `${initiatorId} records local state`, {
      nodeId: initiatorId,
      snapshotId,
    });

    if (node.snapshot.complete) {
      this.addEvent('snapshot_complete', `${initiatorId} completes snapshot`, {
        nodeId: initiatorId,
        snapshotId,
      });
    }

    this.broadcastMarker(node.id, snapshotId);
  }

  sendAppMessage(fromId: string, toId: string, value: any): void {
    const fromNode = this.nodes.find((n) => n.id === fromId);
    const toNode = this.nodes.find((n) => n.id === toId);
    if (!fromNode || !toNode || fromNode.status !== 'healthy' || toNode.status !== 'healthy') {
      this.addEvent('send_failed', `Send ${fromId} → ${toId} failed`, { fromId, toId });
      return;
    }

    fromNode.localState += 1;
    const message: SnapshotMessage = {
      id: this.generateMessageId(),
      from: fromId,
      to: toId,
      type: 'App',
      payload: { value },
      status: 'in-flight',
      timestamp: Date.now(),
    };
    this.messages.push(message);

    this.addEvent('app_send', `${fromId} → ${toId}: ${JSON.stringify(value)}`, { fromId, toId, value });
  }

  private broadcastMarker(fromId: string, snapshotId: string): void {
    this.nodes.forEach((node) => {
      if (node.id === fromId || node.status !== 'healthy') return;
      const message: SnapshotMessage = {
        id: this.generateMessageId(),
        from: fromId,
        to: node.id,
        type: 'Marker',
        payload: { snapshotId },
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

    if (message.type === 'App') {
      this.handleAppDelivery(message, toNode);
    } else {
      this.handleMarkerDelivery(message, toNode);
    }

    message.status = 'success';
  }

  private handleAppDelivery(message: SnapshotMessage, toNode: SnapshotNode): void {
    toNode.localState += 1;
    const incomingFrom = message.from;
    const snapshot = toNode.snapshot;
    if (snapshot && snapshot.recordingFrom.includes(incomingFrom)) {
      snapshot.channels[incomingFrom] = snapshot.channels[incomingFrom] || [];
      snapshot.channels[incomingFrom].push({ from: incomingFrom, value: message.payload.value });
    }
    this.addEvent('app_deliver', `${message.to} received ${JSON.stringify(message.payload.value)}`, {
      toId: message.to,
      fromId: message.from,
    });
  }

  private handleMarkerDelivery(message: SnapshotMessage, toNode: SnapshotNode): void {
    const snapshotId = message.payload.snapshotId || 'S0';
    const hasSnapshot = !!toNode.snapshot && toNode.snapshot.id === snapshotId;

    if (!hasSnapshot) {
      const allIncoming = this.nodes.filter((n) => n.id !== toNode.id).map((n) => n.id);
      const recordingFrom = allIncoming.filter((id) => id !== message.from);
      toNode.snapshot = this.createSnapshotState(toNode, snapshotId, allIncoming, recordingFrom);

      this.addEvent('snapshot_record', `${toNode.id} records local state`, {
        nodeId: toNode.id,
        snapshotId,
      });

      this.broadcastMarker(toNode.id, snapshotId);

      if (toNode.snapshot.complete) {
        this.addEvent('snapshot_complete', `${toNode.id} completes snapshot`, {
          nodeId: toNode.id,
          snapshotId,
        });
      }
    } else {
      const snapshot = toNode.snapshot as SnapshotState;
      if (snapshot.recordingFrom.includes(message.from)) {
        snapshot.recordingFrom = snapshot.recordingFrom.filter((id) => id !== message.from);
        if (snapshot.recordingFrom.length === 0) {
          snapshot.complete = true;
          this.addEvent('snapshot_complete', `${toNode.id} completes snapshot`, {
            nodeId: toNode.id,
            snapshotId,
          });
        }
      }
    }
  }

  getNodes(): SnapshotNode[] {
    return this.nodes;
  }

  getMessages(): SnapshotMessage[] {
    return this.messages;
  }

  getStats(): {
    totalNodes: number;
    healthyNodes: number;
    snapshotsActive: number;
    snapshotsComplete: number;
  } {
    const healthyNodes = this.nodes.filter((n) => n.status === 'healthy');
    const snapshotsActive = this.nodes.filter((n) => n.snapshot && !n.snapshot.complete).length;
    const snapshotsComplete = this.nodes.filter((n) => n.snapshot && n.snapshot.complete).length;

    return {
      totalNodes: this.nodes.length,
      healthyNodes: healthyNodes.length,
      snapshotsActive,
      snapshotsComplete,
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
      node.localState = 0;
      node.snapshot = undefined;
      node.status = 'healthy';
    });
    this.messages = [];
    this.eventLog = [];
    this.messageIdCounter = 0;
    this.snapshotCounter = 0;
  }
}
