import { TwoPhaseCommitNode, TwoPhaseCommitMessage, TwoPhaseCommitState, SimulationEvent } from '../types';

export class TwoPhaseCommitAlgorithm {
  private coordinator: TwoPhaseCommitNode;
  private participants: TwoPhaseCommitNode[];
  private messages: TwoPhaseCommitMessage[];
  private eventLog: SimulationEvent[];
  private currentTransactionId: string;
  private messageIdCounter: number = 0;

  constructor(participantCount: number = 3) {
    this.currentTransactionId = this.generateTransactionId();
    this.eventLog = [];
    this.messages = [];

    // Initialize coordinator
    this.coordinator = {
      id: 'coordinator',
      role: 'coordinator',
      state: 'init',
      status: 'healthy',
      position: { x: 400, y: 100 },
      transactionId: this.currentTransactionId,
    };

    // Initialize participants
    this.participants = [];
    const angleStep = (2 * Math.PI) / participantCount;
    const radius = 200;
    const centerX = 400;
    const centerY = 350;

    for (let i = 0; i < participantCount; i++) {
      const angle = i * angleStep - Math.PI / 2;
      this.participants.push({
        id: `participant-${i}`,
        role: 'participant',
        state: 'init',
        status: 'healthy',
        position: {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        },
        transactionId: this.currentTransactionId,
      });
    }
  }

  private generateTransactionId(): string {
    return `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg-${this.messageIdCounter++}`;
  }

  // Phase 1: Prepare phase
  startTransaction(): void {
    if (this.coordinator.state !== 'init') {
      console.warn('Transaction already in progress');
      return;
    }

    this.coordinator.state = 'preparing';

    // Send VoteRequest to all participants
    this.participants.forEach((participant) => {
      if (participant.status === 'healthy') {
        const message: TwoPhaseCommitMessage = {
          id: this.generateMessageId(),
          from: this.coordinator.id,
          to: participant.id,
          type: 'VoteRequest',
          payload: { transactionId: this.currentTransactionId },
          status: 'in-flight',
          timestamp: Date.now(),
        };
        this.messages.push(message);

        this.addEvent(
          'vote_request',
          `Coordinator sends VoteRequest to ${participant.id}`,
          { participantId: participant.id }
        );
      }
    });
  }

  // Participant responds to VoteRequest
  participantVote(participantId: string, vote: 'yes' | 'no'): void {
    const participant = this.participants.find((p) => p.id === participantId);
    if (!participant) return;

    if (participant.status !== 'healthy') {
      // Failed participant implicitly votes NO
      this.handleParticipantVote(participantId, 'no');
      return;
    }

    participant.vote = vote;
    if (vote === 'yes') {
      participant.state = 'prepared';
    } else {
      participant.state = 'aborted';
    }

    this.handleParticipantVote(participantId, vote);
  }

  private handleParticipantVote(participantId: string, vote: 'yes' | 'no'): void {
    const messageType = vote === 'yes' ? 'VoteYes' : 'VoteNo';

    const message: TwoPhaseCommitMessage = {
      id: this.generateMessageId(),
      from: participantId,
      to: this.coordinator.id,
      type: messageType,
      payload: { transactionId: this.currentTransactionId },
      status: 'in-flight',
      timestamp: Date.now(),
    };
    this.messages.push(message);

    // Mark VoteRequest as success
    const voteRequest = this.messages.find(
      (m) => m.from === this.coordinator.id && m.to === participantId && m.type === 'VoteRequest'
    );
    if (voteRequest) {
      voteRequest.status = 'success';
    }

    this.addEvent('participant_vote', `${participantId} votes ${vote.toUpperCase()}`, {
      participantId,
      vote,
    });
  }

  // Phase 2: Commit or Abort
  coordinatorDecide(): 'commit' | 'abort' | 'waiting' {
    const healthyParticipants = this.participants.filter((p) => p.status === 'healthy');
    const votedParticipants = healthyParticipants.filter((p) => p.vote !== undefined);

    // Wait for all votes
    if (votedParticipants.length < healthyParticipants.length) {
      return 'waiting';
    }

    // Decision: All YES -> COMMIT, any NO -> ABORT
    const allYes = healthyParticipants.every((p) => p.vote === 'yes');
    const decision = allYes ? 'commit' : 'abort';

    if (decision === 'commit') {
      this.coordinator.state = 'committing';
      this.sendCommit();
    } else {
      this.coordinator.state = 'aborting';
      this.sendAbort();
    }

    return decision;
  }

  private sendCommit(): void {
    this.participants.forEach((participant) => {
      if (participant.status === 'healthy' && participant.vote === 'yes') {
        const message: TwoPhaseCommitMessage = {
          id: this.generateMessageId(),
          from: this.coordinator.id,
          to: participant.id,
          type: 'Commit',
          payload: { transactionId: this.currentTransactionId },
          status: 'in-flight',
          timestamp: Date.now(),
        };
        this.messages.push(message);
      }
    });

    this.addEvent('commit_decision', 'Coordinator decides to COMMIT', {});
  }

  private sendAbort(): void {
    this.participants.forEach((participant) => {
      if (participant.status === 'healthy') {
        const message: TwoPhaseCommitMessage = {
          id: this.generateMessageId(),
          from: this.coordinator.id,
          to: participant.id,
          type: 'Abort',
          payload: { transactionId: this.currentTransactionId },
          status: 'in-flight',
          timestamp: Date.now(),
        };
        this.messages.push(message);
      }
    });

    this.addEvent('abort_decision', 'Coordinator decides to ABORT', {});
  }

  // Participant handles final decision
  participantFinalize(participantId: string, decision: 'commit' | 'abort'): void {
    const participant = this.participants.find((p) => p.id === participantId);
    if (!participant) return;

    if (decision === 'commit') {
      participant.state = 'committed';
    } else {
      participant.state = 'aborted';
    }

    // Send ACK
    const message: TwoPhaseCommitMessage = {
      id: this.generateMessageId(),
      from: participantId,
      to: this.coordinator.id,
      type: 'Ack',
      payload: { transactionId: this.currentTransactionId },
      status: 'in-flight',
      timestamp: Date.now(),
    };
    this.messages.push(message);

    // Mark decision message as success
    const decisionMessage = this.messages.find(
      (m) =>
        m.from === this.coordinator.id &&
        m.to === participantId &&
        (m.type === 'Commit' || m.type === 'Abort')
    );
    if (decisionMessage) {
      decisionMessage.status = 'success';
    }

    this.addEvent('participant_finalize', `${participantId} ${decision.toUpperCase()}s`, {
      participantId,
      decision,
    });
  }

  coordinatorComplete(): void {
    const healthyParticipants = this.participants.filter((p) => p.status === 'healthy');
    const finalizedParticipants = healthyParticipants.filter(
      (p) => p.state === 'committed' || p.state === 'aborted'
    );

    if (finalizedParticipants.length === healthyParticipants.length) {
      if (this.coordinator.state === 'committing') {
        this.coordinator.state = 'committed';
        this.addEvent('transaction_complete', 'Transaction COMMITTED successfully', {});
      } else {
        this.coordinator.state = 'aborted';
        this.addEvent('transaction_complete', 'Transaction ABORTED', {});
      }
    }
  }

  // Simulate participant failure
  failParticipant(participantId: string): void {
    const participant = this.participants.find((p) => p.id === participantId);
    if (participant) {
      participant.status = 'failed';
      this.addEvent('participant_failed', `${participantId} failed`, { participantId });
    }
  }

  // Recover participant
  recoverParticipant(participantId: string): void {
    const participant = this.participants.find((p) => p.id === participantId);
    if (participant) {
      participant.status = 'healthy';
      this.addEvent('participant_recovered', `${participantId} recovered`, { participantId });
    }
  }

  // Timeout handling
  handleTimeout(): void {
    if (this.coordinator.state === 'preparing') {
      // Timeout during prepare -> ABORT
      this.coordinator.state = 'aborting';
      this.sendAbort();
      this.addEvent('timeout', 'Coordinator timeout during PREPARE phase -> ABORT', {});
    }
  }

  // Get current state
  getCoordinator(): TwoPhaseCommitNode {
    return this.coordinator;
  }

  getParticipants(): TwoPhaseCommitNode[] {
    return this.participants;
  }

  getMessages(): TwoPhaseCommitMessage[] {
    return this.messages;
  }

  getAllNodes(): TwoPhaseCommitNode[] {
    return [this.coordinator, ...this.participants];
  }

  // Statistics
  getStats(): {
    totalParticipants: number;
    healthyParticipants: number;
    failedParticipants: number;
    yesVotes: number;
    noVotes: number;
    pendingVotes: number;
    coordinatorState: TwoPhaseCommitState;
    transactionOutcome: 'committed' | 'aborted' | 'in-progress';
  } {
    const healthyParticipants = this.participants.filter((p) => p.status === 'healthy');
    const failedParticipants = this.participants.filter((p) => p.status === 'failed');
    const yesVotes = this.participants.filter((p) => p.vote === 'yes').length;
    const noVotes = this.participants.filter((p) => p.vote === 'no').length;
    const pendingVotes = healthyParticipants.length - yesVotes - noVotes;

    let outcome: 'committed' | 'aborted' | 'in-progress' = 'in-progress';
    if (this.coordinator.state === 'committed') {
      outcome = 'committed';
    } else if (this.coordinator.state === 'aborted') {
      outcome = 'aborted';
    }

    return {
      totalParticipants: this.participants.length,
      healthyParticipants: healthyParticipants.length,
      failedParticipants: failedParticipants.length,
      yesVotes,
      noVotes,
      pendingVotes,
      coordinatorState: this.coordinator.state,
      transactionOutcome: outcome,
    };
  }

  // Event log
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

  // Reset
  reset(): void {
    this.currentTransactionId = this.generateTransactionId();
    this.coordinator.state = 'init';
    this.coordinator.vote = undefined;
    this.coordinator.transactionId = this.currentTransactionId;

    this.participants.forEach((p) => {
      p.state = 'init';
      p.vote = undefined;
      p.status = 'healthy';
      p.transactionId = this.currentTransactionId;
    });

    this.messages = [];
    this.eventLog = [];
    this.messageIdCounter = 0;
  }

  // Clear messages
  clearMessages(): void {
    this.messages = [];
  }
}
