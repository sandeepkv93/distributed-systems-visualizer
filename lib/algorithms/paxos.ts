import { PaxosNode, PaxosMessage, SimulationEvent } from '../types';

export class PaxosAlgorithm {
  private proposers: Map<string, PaxosNode>;
  private acceptors: Map<string, PaxosNode>;
  private learners: Map<string, PaxosNode>;
  private messages: PaxosMessage[];
  private eventLog: SimulationEvent[];
  private nextProposalNumber: number;
  private decidedValue: any;

  constructor(proposerCount: number = 2, acceptorCount: number = 5, learnerCount: number = 2) {
    this.proposers = new Map();
    this.acceptors = new Map();
    this.learners = new Map();
    this.messages = [];
    this.eventLog = [];
    this.nextProposalNumber = 1;
    this.decidedValue = null;

    // Initialize proposers (top row)
    for (let i = 0; i < proposerCount; i++) {
      const node: PaxosNode = {
        id: `proposer-${i}`,
        position: { x: 150 + i * 300, y: 100 },
        status: 'healthy',
        role: 'proposer',
        proposalNumber: 0,
      };
      this.proposers.set(node.id, node);
    }

    // Initialize acceptors (middle row)
    for (let i = 0; i < acceptorCount; i++) {
      const node: PaxosNode = {
        id: `acceptor-${i}`,
        position: { x: 100 + i * 150, y: 300 },
        status: 'healthy',
        role: 'acceptor',
        promisedProposal: 0,
        acceptedProposal: 0,
        acceptedValue: null,
      };
      this.acceptors.set(node.id, node);
    }

    // Initialize learners (bottom row)
    for (let i = 0; i < learnerCount; i++) {
      const node: PaxosNode = {
        id: `learner-${i}`,
        position: { x: 200 + i * 300, y: 500 },
        status: 'healthy',
        role: 'learner',
      };
      this.learners.set(node.id, node);
    }
  }

  // Get all nodes
  getAllNodes(): PaxosNode[] {
    return [
      ...Array.from(this.proposers.values()),
      ...Array.from(this.acceptors.values()),
      ...Array.from(this.learners.values()),
    ];
  }

  // Get nodes by role
  getProposers(): PaxosNode[] {
    return Array.from(this.proposers.values());
  }

  getAcceptors(): PaxosNode[] {
    return Array.from(this.acceptors.values());
  }

  getLearners(): PaxosNode[] {
    return Array.from(this.learners.values());
  }

  // Get messages
  getMessages(): PaxosMessage[] {
    return this.messages;
  }

  // Add message
  addMessage(message: PaxosMessage): void {
    this.messages.push(message);
  }

  // Clear messages
  clearMessages(): void {
    this.messages = [];
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

  // Generate unique proposal number
  private generateProposalNumber(proposerId: string): number {
    // Use round number + proposer ID to ensure uniqueness
    const proposerIndex = parseInt(proposerId.split('-')[1]);
    return this.nextProposalNumber * 10 + proposerIndex;
  }

  // Phase 1a: Proposer sends Prepare
  startProposal(proposerId: string, value: any): SimulationEvent[] {
    const proposer = this.proposers.get(proposerId);
    if (!proposer || proposer.status !== 'healthy') return [];

    const events: SimulationEvent[] = [];

    // Generate proposal number
    const proposalNumber = this.generateProposalNumber(proposerId);
    this.nextProposalNumber++;
    proposer.proposalNumber = proposalNumber;

    this.addEvent('prepare_start', `${proposerId} starts proposal ${proposalNumber} with value: ${value}`, {
      proposerId,
      proposalNumber,
      value,
    });
    events.push(...this.eventLog.slice(-1));

    // Send Prepare to all acceptors
    this.acceptors.forEach((acceptor) => {
      if (acceptor.status === 'healthy') {
        const message: PaxosMessage = {
          id: `msg-${Date.now()}-${proposerId}-${acceptor.id}`,
          from: proposerId,
          to: acceptor.id,
          type: 'Prepare',
          status: 'in-flight',
          timestamp: Date.now(),
          payload: {
            proposalNumber,
            value,
          },
        };
        this.addMessage(message);

        this.addEvent('prepare_sent', `${proposerId} → ${acceptor.id}: Prepare(${proposalNumber})`, {
          from: proposerId,
          to: acceptor.id,
          proposalNumber,
        });
        events.push(...this.eventLog.slice(-1));
      }
    });

    return events;
  }

  // Phase 1b: Acceptor responds to Prepare with Promise
  handlePrepare(messageId: string): SimulationEvent[] {
    const message = this.messages.find((m) => m.id === messageId);
    if (!message || message.type !== 'Prepare') return [];

    const events: SimulationEvent[] = [];
    const acceptor = this.acceptors.get(message.to);

    if (!acceptor || acceptor.status !== 'healthy') {
      message.status = 'failure';
      return events;
    }

    message.status = 'success';

    const proposalNumber = message.payload.proposalNumber;

    // Check if proposal number is higher than any previously promised
    if (proposalNumber > (acceptor.promisedProposal || 0)) {
      // Promise to not accept proposals with lower numbers
      acceptor.promisedProposal = proposalNumber;

      const response: PaxosMessage = {
        id: `msg-${Date.now()}-${acceptor.id}-${message.from}`,
        from: acceptor.id,
        to: message.from,
        type: 'Promise',
        status: 'in-flight',
        timestamp: Date.now(),
        payload: {
          proposalNumber,
          acceptedProposal: acceptor.acceptedProposal,
          acceptedValue: acceptor.acceptedValue,
        },
      };
      this.addMessage(response);

      this.addEvent('promise_sent', `${acceptor.id} → ${message.from}: Promise(${proposalNumber})`, {
        from: acceptor.id,
        to: message.from,
        proposalNumber,
        acceptedProposal: acceptor.acceptedProposal,
      });
      events.push(...this.eventLog.slice(-1));
    } else {
      // Send Nack
      const response: PaxosMessage = {
        id: `msg-${Date.now()}-${acceptor.id}-${message.from}`,
        from: acceptor.id,
        to: message.from,
        type: 'Nack',
        status: 'in-flight',
        timestamp: Date.now(),
        payload: {
          proposalNumber,
        },
      };
      this.addMessage(response);

      this.addEvent('nack_sent', `${acceptor.id} → ${message.from}: Nack (promised ${acceptor.promisedProposal})`, {
        from: acceptor.id,
        to: message.from,
        promisedProposal: acceptor.promisedProposal,
      });
      events.push(...this.eventLog.slice(-1));
    }

    return events;
  }

  // Phase 2a: Proposer receives promises and sends Accept
  handlePromise(messageId: string, proposedValue: any): SimulationEvent[] {
    const message = this.messages.find((m) => m.id === messageId);
    if (!message || message.type !== 'Promise') return [];

    const events: SimulationEvent[] = [];
    const proposer = this.proposers.get(message.to);

    if (!proposer || proposer.status !== 'healthy') {
      message.status = 'success';
      return events;
    }

    message.status = 'success';

    // Count promises received for this proposal number
    const proposalNumber = message.payload.proposalNumber;
    const promises = this.messages.filter(
      (m) =>
        m.type === 'Promise' &&
        m.to === proposer.id &&
        m.payload.proposalNumber === proposalNumber &&
        m.status === 'success'
    );

    const majority = Math.floor(this.acceptors.size / 2) + 1;

    // If we have a majority of promises, send Accept
    if (promises.length >= majority) {
      // Check if any acceptor has already accepted a value
      let valueToPropose = proposedValue;
      let highestAcceptedProposal = 0;

      promises.forEach((p) => {
        if (p.payload.acceptedProposal && p.payload.acceptedProposal > highestAcceptedProposal) {
          highestAcceptedProposal = p.payload.acceptedProposal;
          valueToPropose = p.payload.acceptedValue;
        }
      });

      this.addEvent('majority_promises', `${proposer.id} received majority promises`, {
        proposerId: proposer.id,
        proposalNumber,
        promiseCount: promises.length,
      });
      events.push(...this.eventLog.slice(-1));

      // Send Accept to all acceptors
      this.acceptors.forEach((acceptor) => {
        if (acceptor.status === 'healthy') {
          const acceptMessage: PaxosMessage = {
            id: `msg-${Date.now()}-${proposer.id}-${acceptor.id}`,
            from: proposer.id,
            to: acceptor.id,
            type: 'Accept',
            status: 'in-flight',
            timestamp: Date.now(),
            payload: {
              proposalNumber,
              value: valueToPropose,
            },
          };
          this.addMessage(acceptMessage);

          this.addEvent('accept_sent', `${proposer.id} → ${acceptor.id}: Accept(${proposalNumber}, ${valueToPropose})`, {
            from: proposer.id,
            to: acceptor.id,
            proposalNumber,
            value: valueToPropose,
          });
          events.push(...this.eventLog.slice(-1));
        }
      });
    }

    return events;
  }

  // Phase 2b: Acceptor accepts the value
  handleAccept(messageId: string): SimulationEvent[] {
    const message = this.messages.find((m) => m.id === messageId);
    if (!message || message.type !== 'Accept') return [];

    const events: SimulationEvent[] = [];
    const acceptor = this.acceptors.get(message.to);

    if (!acceptor || acceptor.status !== 'healthy') {
      message.status = 'failure';
      return events;
    }

    message.status = 'success';

    const proposalNumber = message.payload.proposalNumber;
    const value = message.payload.value;

    // Accept if proposal number >= promised proposal
    if (proposalNumber >= (acceptor.promisedProposal || 0)) {
      acceptor.acceptedProposal = proposalNumber;
      acceptor.acceptedValue = value;

      const response: PaxosMessage = {
        id: `msg-${Date.now()}-${acceptor.id}-learners`,
        from: acceptor.id,
        to: 'learners',
        type: 'Accepted',
        status: 'in-flight',
        timestamp: Date.now(),
        payload: {
          proposalNumber,
          value,
        },
      };
      this.addMessage(response);

      this.addEvent('accepted', `${acceptor.id} accepted value: ${value}`, {
        acceptorId: acceptor.id,
        proposalNumber,
        value,
      });
      events.push(...this.eventLog.slice(-1));

      // Notify learners
      this.learners.forEach((learner) => {
        if (learner.status === 'healthy') {
          const learnerMessage: PaxosMessage = {
            id: `msg-${Date.now()}-${acceptor.id}-${learner.id}`,
            from: acceptor.id,
            to: learner.id,
            type: 'Accepted',
            status: 'in-flight',
            timestamp: Date.now(),
            payload: {
              proposalNumber,
              value,
            },
          };
          this.addMessage(learnerMessage);
        }
      });

      // Check if value is decided (majority of acceptors accepted)
      this.checkForDecision(value);
    }

    return events;
  }

  // Check if a value has been decided (majority accepted)
  private checkForDecision(value: any): void {
    const acceptedCount = Array.from(this.acceptors.values()).filter(
      (a) => a.acceptedValue === value
    ).length;

    const majority = Math.floor(this.acceptors.size / 2) + 1;

    if (acceptedCount >= majority && this.decidedValue === null) {
      this.decidedValue = value;

      this.addEvent('value_decided', `Consensus reached! Decided value: ${value}`, {
        value,
        acceptorCount: acceptedCount,
      });
    }
  }

  // Get decided value
  getDecidedValue(): any {
    return this.decidedValue;
  }

  // Fail a node
  failNode(nodeId: string): void {
    const node =
      this.proposers.get(nodeId) || this.acceptors.get(nodeId) || this.learners.get(nodeId);
    if (node) {
      node.status = 'failed';
      this.addEvent('node_failed', `${nodeId} failed`, { nodeId });
    }
  }

  // Recover a node
  recoverNode(nodeId: string): void {
    const node =
      this.proposers.get(nodeId) || this.acceptors.get(nodeId) || this.learners.get(nodeId);
    if (node) {
      node.status = 'healthy';
      this.addEvent('node_recovered', `${nodeId} recovered`, { nodeId });
    }
  }

  // Reset the algorithm
  reset(): void {
    this.proposers.forEach((node) => {
      node.status = 'healthy';
      node.proposalNumber = 0;
    });
    this.acceptors.forEach((node) => {
      node.status = 'healthy';
      node.promisedProposal = 0;
      node.acceptedProposal = 0;
      node.acceptedValue = null;
    });
    this.learners.forEach((node) => {
      node.status = 'healthy';
    });
    this.messages = [];
    this.eventLog = [];
    this.nextProposalNumber = 1;
    this.decidedValue = null;
  }
}
