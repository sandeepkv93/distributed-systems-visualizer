import { VectorClockProcess, VectorClockEvent, VectorClock, SimulationEvent } from '../types';

export class VectorClocksAlgorithm {
  private processes: Map<string, VectorClockProcess>;
  private allEvents: VectorClockEvent[];
  private eventLog: SimulationEvent[];
  private nextEventId: number;

  constructor(processCount: number = 3) {
    this.processes = new Map();
    this.allEvents = [];
    this.eventLog = [];
    this.nextEventId = 0;

    // Initialize processes
    for (let i = 0; i < processCount; i++) {
      const processId = `P${i}`;
      const initialClock: VectorClock = {};

      // Initialize vector clock with zeros for all processes
      for (let j = 0; j < processCount; j++) {
        initialClock[`P${j}`] = 0;
      }

      const process: VectorClockProcess = {
        id: processId,
        position: { x: 150 + i * 250, y: 300 },
        status: 'healthy',
        processId,
        vectorClock: initialClock,
        events: [],
      };
      this.processes.set(processId, process);
    }
  }

  // Get all processes
  getProcesses(): VectorClockProcess[] {
    return Array.from(this.processes.values());
  }

  // Get all events
  getAllEvents(): VectorClockEvent[] {
    return this.allEvents;
  }

  // Get event log
  getEventLog(): SimulationEvent[] {
    return this.eventLog;
  }

  // Add event to log
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

  // Create a local event (internal computation)
  createLocalEvent(processId: string, description: string = 'Local computation'): VectorClockEvent | null {
    const process = this.processes.get(processId);
    if (!process || process.status !== 'healthy') return null;

    // Increment own clock
    process.vectorClock[processId]++;

    const event: VectorClockEvent = {
      id: `event-${this.nextEventId++}`,
      processId,
      vectorClock: { ...process.vectorClock },
      type: 'local',
      timestamp: Date.now(),
    };

    process.events.push(event);
    this.allEvents.push(event);

    this.addEvent('local_event', `${processId}: ${description} [${this.clockToString(event.vectorClock)}]`, {
      processId,
      eventId: event.id,
      vectorClock: event.vectorClock,
    });

    return event;
  }

  // Send a message from one process to another
  sendMessage(fromProcessId: string, toProcessId: string, message: string = 'Message'): VectorClockEvent | null {
    const fromProcess = this.processes.get(fromProcessId);
    const toProcess = this.processes.get(toProcessId);

    if (!fromProcess || !toProcess || fromProcess.status !== 'healthy' || toProcess.status !== 'healthy') {
      return null;
    }

    // Increment sender's clock
    fromProcess.vectorClock[fromProcessId]++;

    const sendEvent: VectorClockEvent = {
      id: `event-${this.nextEventId++}`,
      processId: fromProcessId,
      vectorClock: { ...fromProcess.vectorClock },
      type: 'send',
      timestamp: Date.now(),
      relatedEvent: '', // Will be set when message is received
    };

    fromProcess.events.push(sendEvent);
    this.allEvents.push(sendEvent);

    this.addEvent(
      'send_message',
      `${fromProcessId} → ${toProcessId}: ${message} [${this.clockToString(sendEvent.vectorClock)}]`,
      {
        from: fromProcessId,
        to: toProcessId,
        eventId: sendEvent.id,
        vectorClock: sendEvent.vectorClock,
        message,
      }
    );

    return sendEvent;
  }

  // Receive a message (updates receiver's clock)
  receiveMessage(
    toProcessId: string,
    senderClock: VectorClock,
    sendEventId: string,
    message: string = 'Message'
  ): VectorClockEvent | null {
    const toProcess = this.processes.get(toProcessId);
    if (!toProcess || toProcess.status !== 'healthy') return null;

    // Update vector clock: max of own clock and sender's clock, then increment own
    Object.keys(toProcess.vectorClock).forEach((pid) => {
      toProcess.vectorClock[pid] = Math.max(toProcess.vectorClock[pid], senderClock[pid] || 0);
    });
    toProcess.vectorClock[toProcessId]++;

    const receiveEvent: VectorClockEvent = {
      id: `event-${this.nextEventId++}`,
      processId: toProcessId,
      vectorClock: { ...toProcess.vectorClock },
      type: 'receive',
      timestamp: Date.now(),
      relatedEvent: sendEventId,
    };

    toProcess.events.push(receiveEvent);
    this.allEvents.push(receiveEvent);

    // Update send event's related event
    const sendEvent = this.allEvents.find((e) => e.id === sendEventId);
    if (sendEvent) {
      sendEvent.relatedEvent = receiveEvent.id;
    }

    this.addEvent(
      'receive_message',
      `${toProcessId} ← received: ${message} [${this.clockToString(receiveEvent.vectorClock)}]`,
      {
        processId: toProcessId,
        eventId: receiveEvent.id,
        vectorClock: receiveEvent.vectorClock,
        relatedEvent: sendEventId,
      }
    );

    return receiveEvent;
  }

  // Check if event A happened before event B (A → B)
  happenedBefore(clockA: VectorClock, clockB: VectorClock): boolean {
    let allLessOrEqual = true;
    let atLeastOneLess = false;

    Object.keys(clockA).forEach((pid) => {
      if (clockA[pid] > (clockB[pid] || 0)) {
        allLessOrEqual = false;
      }
      if (clockA[pid] < (clockB[pid] || 0)) {
        atLeastOneLess = true;
      }
    });

    return allLessOrEqual && atLeastOneLess;
  }

  // Check if events are concurrent (neither happened before the other)
  areConcurrent(clockA: VectorClock, clockB: VectorClock): boolean {
    return !this.happenedBefore(clockA, clockB) && !this.happenedBefore(clockB, clockA);
  }

  // Compare two events
  compareEvents(eventIdA: string, eventIdB: string): 'before' | 'after' | 'concurrent' | 'unknown' {
    const eventA = this.allEvents.find((e) => e.id === eventIdA);
    const eventB = this.allEvents.find((e) => e.id === eventIdB);

    if (!eventA || !eventB) return 'unknown';

    if (this.happenedBefore(eventA.vectorClock, eventB.vectorClock)) {
      return 'before';
    } else if (this.happenedBefore(eventB.vectorClock, eventA.vectorClock)) {
      return 'after';
    } else {
      return 'concurrent';
    }
  }

  // Get causal history of an event (all events that happened before it)
  getCausalHistory(eventId: string): VectorClockEvent[] {
    const targetEvent = this.allEvents.find((e) => e.id === eventId);
    if (!targetEvent) return [];

    return this.allEvents.filter((e) => {
      if (e.id === eventId) return false;
      return this.happenedBefore(e.vectorClock, targetEvent.vectorClock);
    });
  }

  // Get concurrent events
  getConcurrentEvents(eventId: string): VectorClockEvent[] {
    const targetEvent = this.allEvents.find((e) => e.id === eventId);
    if (!targetEvent) return [];

    return this.allEvents.filter((e) => {
      if (e.id === eventId) return false;
      return this.areConcurrent(e.vectorClock, targetEvent.vectorClock);
    });
  }

  // Convert vector clock to string representation
  private clockToString(clock: VectorClock): string {
    const processes = Object.keys(clock).sort();
    return `[${processes.map((p) => clock[p]).join(', ')}]`;
  }

  // Fail a process
  failProcess(processId: string): void {
    const process = this.processes.get(processId);
    if (process) {
      process.status = 'failed';
      this.addEvent('process_failed', `${processId} failed`, { processId });
    }
  }

  // Recover a process
  recoverProcess(processId: string): void {
    const process = this.processes.get(processId);
    if (process) {
      process.status = 'healthy';
      this.addEvent('process_recovered', `${processId} recovered`, { processId });
    }
  }

  // Reset the algorithm
  reset(): void {
    this.processes.forEach((process) => {
      process.status = 'healthy';
      process.events = [];

      // Reset vector clock to all zeros
      Object.keys(process.vectorClock).forEach((pid) => {
        process.vectorClock[pid] = 0;
      });
    });

    this.allEvents = [];
    this.eventLog = [];
    this.nextEventId = 0;
  }

  // Get statistics
  getStats(): {
    totalEvents: number;
    localEvents: number;
    sendEvents: number;
    receiveEvents: number;
    concurrentPairs: number;
  } {
    const localEvents = this.allEvents.filter((e) => e.type === 'local').length;
    const sendEvents = this.allEvents.filter((e) => e.type === 'send').length;
    const receiveEvents = this.allEvents.filter((e) => e.type === 'receive').length;

    // Count concurrent event pairs
    let concurrentPairs = 0;
    for (let i = 0; i < this.allEvents.length; i++) {
      for (let j = i + 1; j < this.allEvents.length; j++) {
        if (this.areConcurrent(this.allEvents[i].vectorClock, this.allEvents[j].vectorClock)) {
          concurrentPairs++;
        }
      }
    }

    return {
      totalEvents: this.allEvents.length,
      localEvents,
      sendEvents,
      receiveEvents,
      concurrentPairs,
    };
  }
}
