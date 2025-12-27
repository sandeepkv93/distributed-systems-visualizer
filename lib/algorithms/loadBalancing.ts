import { LoadMessage, LoadRequest, LoadWorker, SimulationEvent } from '../types';

export class LoadBalancingAlgorithm {
  private workers: LoadWorker[];
  private requests: LoadRequest[];
  private messages: LoadMessage[];
  private eventLog: SimulationEvent[];
  private messageIdCounter: number = 0;
  private requestCounter: number = 0;
  private maxQueue: number = 8;

  constructor(workerCount: number = 4) {
    this.workers = [];
    this.requests = [];
    this.messages = [];
    this.eventLog = [];

    const angleStep = (2 * Math.PI) / workerCount;
    const radius = 200;
    const centerX = 420;
    const centerY = 340;

    for (let i = 0; i < workerCount; i++) {
      const angle = i * angleStep - Math.PI / 2;
      this.workers.push({
        id: `W${i}`,
        position: {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        },
        queue: 0,
        capacity: 3,
        processing: 0,
        status: 'healthy',
        loadStatus: 'healthy',
      });
    }
  }

  private generateMessageId(): string {
    return `lb-${this.messageIdCounter++}`;
  }

  private generateRequestId(): string {
    return `req-${this.requestCounter++}`;
  }

  enqueueRequest(latency: number = 1): void {
    const request: LoadRequest = {
      id: this.generateRequestId(),
      latency,
      status: 'queued',
    };
    this.requests.push(request);
    this.dispatchRequest(request);
  }

  private dispatchRequest(request: LoadRequest): void {
    const healthyWorkers = this.workers.filter((w) => w.loadStatus !== 'failed');
    if (healthyWorkers.length === 0) {
      request.status = 'dropped';
      return;
    }

    const target = [...healthyWorkers].sort((a, b) => a.queue - b.queue)[0];
    if (target.queue >= this.maxQueue) {
      request.status = 'dropped';
      const drop: LoadMessage = {
        id: this.generateMessageId(),
        from: 'balancer',
        to: target.id,
        type: 'Drop',
        payload: { requestId: request.id, workerId: target.id },
        status: 'in-flight',
        timestamp: Date.now(),
      };
      this.messages.push(drop);
      this.addEvent('drop', `${request.id} dropped`, { requestId: request.id });
      return;
    }

    request.assignedTo = target.id;
    request.status = 'queued';
    target.queue += 1;

    const message: LoadMessage = {
      id: this.generateMessageId(),
      from: 'balancer',
      to: target.id,
      type: 'Dispatch',
      payload: { requestId: request.id, workerId: target.id },
      status: 'in-flight',
      timestamp: Date.now(),
    };
    this.messages.push(message);
    this.addEvent('dispatch', `${request.id} dispatched to ${target.id}`, { requestId: request.id });
  }

  deliverMessage(messageId: string): void {
    const message = this.messages.find((m) => m.id === messageId);
    if (!message) return;
    const worker = this.workers.find((w) => w.id === message.to);
    if (!worker) return;

    if (message.type === 'Dispatch') {
      if (worker.processing < worker.capacity) {
        worker.processing += 1;
        worker.queue = Math.max(0, worker.queue - 1);
        const request = this.requests.find((r) => r.id === message.payload.requestId);
        if (request) {
          request.status = 'processing';
        }
      } else {
        worker.loadStatus = 'overloaded';
        worker.status = 'processing';
      }
    } else if (message.type === 'Drop') {
      // no-op
    } else if (message.type === 'Complete') {
      worker.processing = Math.max(0, worker.processing - 1);
      const request = this.requests.find((r) => r.id === message.payload.requestId);
      if (request) request.status = 'done';
    }

    message.status = 'success';
  }

  tick(): void {
    this.requests
      .filter((r) => r.status === 'processing')
      .forEach((request) => {
        request.latency -= 1;
        if (request.latency <= 0) {
          request.status = 'done';
          const worker = this.workers.find((w) => w.id === request.assignedTo);
          if (worker) {
            worker.processing = Math.max(0, worker.processing - 1);
          }
          const complete: LoadMessage = {
            id: this.generateMessageId(),
            from: request.assignedTo || 'worker',
            to: 'balancer',
            type: 'Complete',
            payload: { requestId: request.id, workerId: request.assignedTo },
            status: 'in-flight',
            timestamp: Date.now(),
          };
          this.messages.push(complete);
        }
      });

    this.workers.forEach((worker) => {
      if (worker.processing < worker.capacity && worker.queue < this.maxQueue) {
        worker.loadStatus = 'healthy';
        if (worker.status !== 'failed') {
          worker.status = 'healthy';
        }
      }
    });
  }

  failWorker(workerId: string): void {
    const worker = this.workers.find((w) => w.id === workerId);
    if (worker) {
      worker.loadStatus = 'failed';
      worker.status = 'failed';
      this.addEvent('fail', `${workerId} failed`, { workerId });
    }
  }

  recoverWorker(workerId: string): void {
    const worker = this.workers.find((w) => w.id === workerId);
    if (worker) {
      worker.loadStatus = 'healthy';
      worker.status = 'healthy';
      this.addEvent('recover', `${workerId} recovered`, { workerId });
    }
  }

  getWorkers(): LoadWorker[] {
    return this.workers;
  }

  getRequests(): LoadRequest[] {
    return this.requests;
  }

  getMessages(): LoadMessage[] {
    return this.messages;
  }

  getStats(): {
    totalRequests: number;
    dropped: number;
    inFlight: number;
    completed: number;
  } {
    return {
      totalRequests: this.requests.length,
      dropped: this.requests.filter((r) => r.status === 'dropped').length,
      inFlight: this.requests.filter((r) => r.status === 'processing' || r.status === 'queued').length,
      completed: this.requests.filter((r) => r.status === 'done').length,
    };
  }

  reset(): void {
    this.requests = [];
    this.messages = [];
    this.eventLog = [];
    this.messageIdCounter = 0;
    this.requestCounter = 0;
    this.workers.forEach((worker) => {
      worker.queue = 0;
      worker.processing = 0;
      worker.loadStatus = 'healthy';
      worker.status = 'healthy';
    });
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
