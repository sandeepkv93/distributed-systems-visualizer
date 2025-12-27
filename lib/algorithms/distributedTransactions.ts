import {
  SagaStep,
  TransactionMessage,
  TransactionParticipant,
  TransactionPhase,
  SimulationEvent,
} from '../types';

export class DistributedTransactionsAlgorithm {
  private participants: TransactionParticipant[];
  private sagaSteps: SagaStep[];
  private messages: TransactionMessage[];
  private eventLog: SimulationEvent[];
  private messageIdCounter: number = 0;

  constructor(participantCount: number = 3) {
    this.participants = [];
    this.sagaSteps = [];
    this.messages = [];
    this.eventLog = [];

    for (let i = 0; i < participantCount; i++) {
      this.participants.push({
        id: `P${i}`,
        status: 'healthy',
        phase: 'init',
      });
      this.sagaSteps.push({
        id: `S${i}`,
        name: `Step ${i + 1}`,
        status: 'pending',
      });
    }
  }

  private generateMessageId(): string {
    return `txn-${this.messageIdCounter++}`;
  }

  start3PC(): void {
    this.participants.forEach((p) => {
      p.phase = 'prepare';
    });
    this.addEvent('3pc_prepare', 'Coordinator sends PREPARE', {});
    this.broadcast('Prepare');
  }

  receiveVote(participantId: string, vote: 'yes' | 'no'): void {
    const participant = this.participants.find((p) => p.id === participantId);
    if (!participant) return;
    participant.vote = vote;
    const message: TransactionMessage = {
      id: this.generateMessageId(),
      from: participantId,
      to: 'coordinator',
      type: 'Vote',
      payload: {
        participantId,
        vote,
      },
      status: 'in-flight',
      timestamp: Date.now(),
    };
    this.messages.push(message);
  }

  decide3PC(): void {
    const allYes = this.participants.every((p) => p.vote === 'yes');
    if (!allYes) {
      this.participants.forEach((p) => (p.phase = 'abort'));
      this.broadcast('Abort');
      this.addEvent('3pc_abort', 'Coordinator aborts', {});
      return;
    }
    this.participants.forEach((p) => (p.phase = 'pre-commit'));
    this.broadcast('PreCommit');
    this.addEvent('3pc_precommit', 'Coordinator sends PRE-COMMIT', {});
  }

  commit3PC(): void {
    this.participants.forEach((p) => (p.phase = 'commit'));
    this.broadcast('Commit');
    this.addEvent('3pc_commit', 'Coordinator commits', {});
    this.participants.forEach((p) => (p.phase = 'done'));
  }

  startSaga(): void {
    this.sagaSteps.forEach((step) => {
      step.status = 'pending';
    });
    this.addEvent('saga_start', 'Saga starts', {});
  }

  completeSagaStep(stepId: string): void {
    const step = this.sagaSteps.find((s) => s.id === stepId);
    if (!step) return;
    step.status = 'completed';
    this.addEvent('saga_step', `${step.name} completed`, { stepId });
  }

  compensateSaga(stepId: string): void {
    const step = this.sagaSteps.find((s) => s.id === stepId);
    if (!step) return;
    step.status = 'compensated';
    const message: TransactionMessage = {
      id: this.generateMessageId(),
      from: 'saga',
      to: stepId,
      type: 'Compensate',
      payload: {
        participantId: stepId,
        stepId,
      },
      status: 'in-flight',
      timestamp: Date.now(),
    };
    this.messages.push(message);
    this.addEvent('saga_compensate', `${step.name} compensated`, { stepId });
  }

  deliverMessage(messageId: string): void {
    const message = this.messages.find((m) => m.id === messageId);
    if (!message) return;
    message.status = 'success';
  }

  failParticipant(participantId: string): void {
    const participant = this.participants.find((p) => p.id === participantId);
    if (participant) {
      participant.status = 'failed';
      this.addEvent('participant_fail', `${participantId} failed`, { participantId });
    }
  }

  recoverParticipant(participantId: string): void {
    const participant = this.participants.find((p) => p.id === participantId);
    if (participant) {
      participant.status = 'healthy';
      this.addEvent('participant_recover', `${participantId} recovered`, { participantId });
    }
  }

  getParticipants(): TransactionParticipant[] {
    return this.participants;
  }

  getSagaSteps(): SagaStep[] {
    return this.sagaSteps;
  }

  getMessages(): TransactionMessage[] {
    return this.messages;
  }

  getStats(): {
    participants: number;
    prepared: number;
    committed: number;
    aborted: number;
    sagaCompleted: number;
    sagaCompensated: number;
  } {
    const prepared = this.participants.filter((p) => p.phase === 'prepare' || p.phase === 'pre-commit').length;
    const committed = this.participants.filter((p) => p.phase === 'done' || p.phase === 'commit').length;
    const aborted = this.participants.filter((p) => p.phase === 'abort').length;
    const sagaCompleted = this.sagaSteps.filter((s) => s.status === 'completed').length;
    const sagaCompensated = this.sagaSteps.filter((s) => s.status === 'compensated').length;

    return {
      participants: this.participants.length,
      prepared,
      committed,
      aborted,
      sagaCompleted,
      sagaCompensated,
    };
  }

  reset(): void {
    this.participants.forEach((p) => {
      p.phase = 'init';
      p.vote = undefined;
      p.status = 'healthy';
    });
    this.sagaSteps.forEach((s) => {
      s.status = 'pending';
    });
    this.messages = [];
    this.eventLog = [];
    this.messageIdCounter = 0;
  }

  private broadcast(type: TransactionMessage['type']): void {
    this.participants.forEach((participant) => {
      const message: TransactionMessage = {
        id: this.generateMessageId(),
        from: 'coordinator',
        to: participant.id,
        type,
        payload: {
          participantId: participant.id,
        },
        status: 'in-flight',
        timestamp: Date.now(),
      };
      this.messages.push(message);
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
