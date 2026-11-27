import { CONCEPTS_CATALOG } from './catalog';

export type OutboxArchitectureId =
  | 'dual-write-db-first'
  | 'dual-write-broker-first'
  | 'transactional-outbox-cdc';

export type OutboxFaultId =
  | 'crash-after-db'
  | 'crash-after-broker'
  | 'relay-duplicate-redelivery'
  | 'healthy-steady-state';

export interface OutboxStep {
  step: number;
  actor: 'APP' | 'DB' | 'CDC' | 'KAFKA' | 'CONSUMER';
  label: string;
  detail: string;
  status: 'ok' | 'crash' | 'corrupt' | 'dedup';
}

export interface OutboxSimulationResult {
  architecture: OutboxArchitectureId;
  fault: OutboxFaultId;
  idempotentInbox: boolean;
  steps: OutboxStep[];
  dbOrderCommitted: boolean;
  brokerMessagesPublished: number;
  consumerEffectsApplied: number;
  consistent: boolean;
  anomalyTag: string;
  verdict: string;
}

export const OUTBOX_ARCHITECTURES: ReadonlyArray<{
  id: OutboxArchitectureId;
  name: string;
  shortName: string;
  summary: string;
  conceptIds: readonly string[];
}> = [
  {
    id: 'dual-write-db-first',
    name: 'Broken Dual-Write (DB → Kafka)',
    shortName: 'DB → Kafka',
    summary: 'Commits Postgres row first, then makes an uncoordinated RPC to publish to Kafka.',
    conceptIds: ['two-phase-commit', 'replication-log'],
  },
  {
    id: 'dual-write-broker-first',
    name: 'Broken Dual-Write (Kafka → DB)',
    shortName: 'Kafka → DB',
    summary: 'Publishes Kafka event first, then attempts to commit the Postgres order row.',
    conceptIds: ['two-phase-commit', 'distributed-transactions'],
  },
  {
    id: 'transactional-outbox-cdc',
    name: 'Transactional Outbox + WAL CDC',
    shortName: 'Outbox + CDC',
    summary: 'Writes order + outbox row in 1 ACID DB transaction; Debezium tails WAL to Kafka; consumer deduplicates via Inbox.',
    conceptIds: ['replication-log', 'distributed-transactions', 'two-phase-commit'],
  },
];

export const OUTBOX_FAULTS: ReadonlyArray<{
  id: OutboxFaultId;
  name: string;
  description: string;
}> = [
  {
    id: 'crash-after-db',
    name: 'Crash After DB Commit',
    description: 'App container OOMs immediately after Postgres COMMIT returns, before calling Kafka.',
  },
  {
    id: 'crash-after-broker',
    name: 'DB Rollback / Crash After Publish',
    description: 'Kafka ack arrives, then Postgres transaction rolls back on constraint/timeout.',
  },
  {
    id: 'relay-duplicate-redelivery',
    name: 'At-Least-Once Duplicate Redelivery',
    description: 'Relay publishes event to Kafka, restarts before checkpointing offset, and publishes a second copy.',
  },
  {
    id: 'healthy-steady-state',
    name: 'Healthy End-to-End Flow',
    description: 'No crashes or retries; baseline path comparison.',
  },
];

export function simulateOutboxScenario(
  architecture: OutboxArchitectureId,
  fault: OutboxFaultId,
  idempotentInbox: boolean
): OutboxSimulationResult {
  if (architecture === 'dual-write-db-first') {
    if (fault === 'crash-after-db') {
      return {
        architecture,
        fault,
        idempotentInbox,
        steps: [
          { step: 1, actor: 'APP', label: 'BEGIN TX', detail: 'Insert order #42 in Postgres', status: 'ok' },
          { step: 2, actor: 'DB', label: 'COMMIT OK', detail: 'Order #42 durably committed', status: 'ok' },
          { step: 3, actor: 'APP', label: 'OOM CRASH', detail: 'Process killed before Kafka produce()', status: 'crash' },
          { step: 4, actor: 'KAFKA', label: '0 EVENTS', detail: 'OrderCreated event never emitted', status: 'corrupt' },
          { step: 5, actor: 'CONSUMER', label: 'SILENT DRIFT', detail: 'Order paid in DB, never shipped!', status: 'corrupt' },
        ],
        dbOrderCommitted: true,
        brokerMessagesPublished: 0,
        consumerEffectsApplied: 0,
        consistent: false,
        anomalyTag: 'LOST EVENT · SILENT DRIFT',
        verdict: 'Database committed Order #42, but the crash dropped the Kafka publish permanently—leaving downstream services out of sync.',
      };
    }

    if (fault === 'relay-duplicate-redelivery') {
      const effects = idempotentInbox ? 1 : 2;
      return {
        architecture,
        fault,
        idempotentInbox,
        steps: [
          { step: 1, actor: 'DB', label: 'COMMIT OK', detail: 'Order #42 saved', status: 'ok' },
          { step: 2, actor: 'KAFKA', label: '2× PRODUCE', detail: 'Client retry publishes duplicate event', status: 'ok' },
          {
            step: 3,
            actor: 'CONSUMER',
            label: idempotentInbox ? 'INBOX DEDUP' : 'DOUBLE SHIP',
            detail: idempotentInbox
              ? 'processed_inbox PK ignores duplicate event_id'
              : 'Consumer executes side effect twice!',
            status: idempotentInbox ? 'dedup' : 'corrupt',
          },
        ],
        dbOrderCommitted: true,
        brokerMessagesPublished: 2,
        consumerEffectsApplied: effects,
        consistent: idempotentInbox,
        anomalyTag: idempotentInbox ? 'DEDUPED AT CONSUMER' : 'DUPLICATE SIDE EFFECT',
        verdict: idempotentInbox
          ? 'Idempotent inbox prevented duplicate fulfillment, though DB-first dual-write remains vulnerable to crash-after-DB loss.'
          : 'Without an idempotent inbox table, at-least-once broker retries charge or ship Order #42 twice.',
      };
    }

    return {
      architecture,
      fault,
      idempotentInbox,
      steps: [
        { step: 1, actor: 'DB', label: 'COMMIT OK', detail: 'Order #42 committed', status: 'ok' },
        { step: 2, actor: 'KAFKA', label: 'PUBLISH OK', detail: 'OrderCreated emitted to topic', status: 'ok' },
        { step: 3, actor: 'CONSUMER', label: 'APPLIED (1×)', detail: 'Downstream fulfillment updated', status: 'ok' },
      ],
      dbOrderCommitted: true,
      brokerMessagesPublished: 1,
      consumerEffectsApplied: 1,
      consistent: true,
      anomalyTag: 'CONSISTENT (LUCKY RUN)',
      verdict: 'Succeeded only because no crash landed in the unguarded window between DB commit and Kafka publish.',
    };
  }

  if (architecture === 'dual-write-broker-first') {
    if (fault === 'crash-after-broker') {
      return {
        architecture,
        fault,
        idempotentInbox,
        steps: [
          { step: 1, actor: 'APP', label: 'PRODUCE', detail: 'Publishes OrderCreated #42 to Kafka', status: 'ok' },
          { step: 2, actor: 'KAFKA', label: 'ACK OK', detail: 'Event immutable on broker log', status: 'ok' },
          { step: 3, actor: 'DB', label: 'TX ROLLBACK', detail: 'Postgres rejects commit (constraint/timeout)', status: 'crash' },
          { step: 4, actor: 'CONSUMER', label: 'PHANTOM SHIP', detail: 'Ships item for nonexistent Order #42!', status: 'corrupt' },
        ],
        dbOrderCommitted: false,
        brokerMessagesPublished: 1,
        consumerEffectsApplied: 1,
        consistent: false,
        anomalyTag: 'PHANTOM EVENT · GHOST ORDER',
        verdict: 'Cannot un-publish an immutable Kafka event after Postgres rolls back—downstream services process a ghost order.',
      };
    }

    if (fault === 'relay-duplicate-redelivery') {
      const effects = idempotentInbox ? 1 : 2;
      return {
        architecture,
        fault,
        idempotentInbox,
        steps: [
          { step: 1, actor: 'KAFKA', label: '2× PRODUCE', detail: 'Retried publish lands twice', status: 'ok' },
          { step: 2, actor: 'DB', label: 'COMMIT OK', detail: 'Order #42 committed once', status: 'ok' },
          {
            step: 3,
            actor: 'CONSUMER',
            label: idempotentInbox ? 'INBOX DEDUP' : 'DOUBLE EFFECT',
            detail: idempotentInbox ? 'Duplicate suppressed via PK' : 'Side effect applied twice',
            status: idempotentInbox ? 'dedup' : 'corrupt',
          },
        ],
        dbOrderCommitted: true,
        brokerMessagesPublished: 2,
        consumerEffectsApplied: effects,
        consistent: idempotentInbox,
        anomalyTag: idempotentInbox ? 'DEDUPED AT CONSUMER' : 'DUPLICATE SIDE EFFECT',
        verdict: idempotentInbox
          ? 'Consumer inbox absorbed duplicates, but broker-first dual-writes still leak phantom events on DB rollback.'
          : 'Duplicate delivery triggered double side effects.',
      };
    }

    return {
      architecture,
      fault,
      idempotentInbox,
      steps: [
        { step: 1, actor: 'KAFKA', label: 'PUBLISH OK', detail: 'OrderCreated written to log', status: 'ok' },
        { step: 2, actor: 'DB', label: 'COMMIT OK', detail: 'Order #42 saved', status: 'ok' },
        { step: 3, actor: 'CONSUMER', label: 'APPLIED (1×)', detail: 'Downstream updated', status: 'ok' },
      ],
      dbOrderCommitted: true,
      brokerMessagesPublished: 1,
      consumerEffectsApplied: 1,
      consistent: true,
      anomalyTag: 'CONSISTENT (LUCKY RUN)',
      verdict: 'Succeeded only because Postgres did not fail or roll back after Kafka ack.',
    };
  }

  // Transactional Outbox + Debezium WAL CDC
  if (fault === 'crash-after-db') {
    return {
      architecture,
      fault,
      idempotentInbox,
      steps: [
        { step: 1, actor: 'DB', label: '1 ACID TX', detail: 'INSERT orders + INSERT outbox atomically', status: 'ok' },
        { step: 2, actor: 'APP', label: 'OOM CRASH', detail: 'App crashes immediately after COMMIT', status: 'crash' },
        { step: 3, actor: 'CDC', label: 'WAL TAIL', detail: 'Debezium reads committed outbox row from WAL', status: 'ok' },
        { step: 4, actor: 'KAFKA', label: 'PUBLISH OK', detail: 'Event reliably emitted despite app crash', status: 'ok' },
        { step: 5, actor: 'CONSUMER', label: 'APPLIED (1×)', detail: 'Zero drift: DB and downstream match 100%', status: 'ok' },
      ],
      dbOrderCommitted: true,
      brokerMessagesPublished: 1,
      consumerEffectsApplied: 1,
      consistent: true,
      anomalyTag: 'CRASH-SAFE · ATOMIC OUTBOX',
      verdict: 'Because order and outbox row share one local ACID transaction, Debezium WAL CDC delivers the event even when the app crashes immediately.',
    };
  }

  if (fault === 'crash-after-broker') {
    return {
      architecture,
      fault,
      idempotentInbox,
      steps: [
        { step: 1, actor: 'DB', label: 'TX ROLLBACK', detail: 'Order + Outbox row roll back atomically', status: 'crash' },
        { step: 2, actor: 'CDC', label: 'WAL CLEAN', detail: 'Uncommitted rows never streamed by logical decoding', status: 'ok' },
        { step: 3, actor: 'KAFKA', label: '0 EVENTS', detail: 'No phantom event ever emitted', status: 'ok' },
        { step: 4, actor: 'CONSUMER', label: 'CLEAN (0×)', detail: 'Zero ghost orders processed', status: 'ok' },
      ],
      dbOrderCommitted: false,
      brokerMessagesPublished: 0,
      consumerEffectsApplied: 0,
      consistent: true,
      anomalyTag: 'ZERO PHANTOMS · ATOMIC ROLLBACK',
      verdict: 'Rolling back the local DB transaction discards the outbox row atomically—making phantom Kafka events impossible.',
    };
  }

  if (fault === 'relay-duplicate-redelivery') {
    const effects = idempotentInbox ? 1 : 2;
    return {
      architecture,
      fault,
      idempotentInbox,
      steps: [
        { step: 1, actor: 'DB', label: '1 ACID TX', detail: 'Order + Outbox committed atomically', status: 'ok' },
        { step: 2, actor: 'CDC', label: '2× REPLAY', detail: 'CDC restarts before LSN ack → at-least-once replay', status: 'crash' },
        { step: 3, actor: 'KAFKA', label: '2 COPIES', detail: 'Same event_id delivered twice', status: 'ok' },
        {
          step: 4,
          actor: 'CONSUMER',
          label: idempotentInbox ? 'INBOX DEDUP' : 'DOUBLE EFFECT',
          detail: idempotentInbox
            ? 'INSERT INTO processed_inbox(event_id) ON CONFLICT DO NOTHING'
            : 'Consumer lacked inbox dedup → applied twice!',
          status: idempotentInbox ? 'dedup' : 'corrupt',
        },
      ],
      dbOrderCommitted: true,
      brokerMessagesPublished: 2,
      consumerEffectsApplied: effects,
      consistent: idempotentInbox,
      anomalyTag: idempotentInbox ? 'EFFECTIVELY-ONCE VERIFIED' : 'AT-LEAST-ONCE DUPLICATE',
      verdict: idempotentInbox
        ? 'Outbox + CDC guarantees at-least-once delivery; pairing it with a Consumer Idempotent Inbox achieves end-to-end effectively-once state.'
        : 'Outbox + CDC guarantees at-least-once (never lost), so consumers MUST enable Idempotent Inbox deduplication to remain safe on replay!',
    };
  }

  return {
    architecture,
    fault,
    idempotentInbox,
    steps: [
      { step: 1, actor: 'DB', label: '1 ACID TX', detail: 'Order + Outbox row committed in 1 WAL write', status: 'ok' },
      { step: 2, actor: 'CDC', label: 'WAL STREAM', detail: 'Debezium tails logical replication slot (<15ms)', status: 'ok' },
      { step: 3, actor: 'KAFKA', label: 'PUBLISH OK', detail: 'Event appended with event_id key', status: 'ok' },
      { step: 4, actor: 'CONSUMER', label: 'APPLIED (1×)', detail: 'Atomic business state + inbox record committed', status: 'ok' },
    ],
    dbOrderCommitted: true,
    brokerMessagesPublished: 1,
    consumerEffectsApplied: 1,
    consistent: true,
    anomalyTag: 'EFFECTIVELY-ONCE STEADY STATE',
    verdict: 'Zero 2PC coordination overhead, sub-20ms WAL tailing latency, and mathematically safe across crashes and redeliveries.',
  };
}

export function getOutboxConcept(conceptId: string) {
  return CONCEPTS_CATALOG.find((c) => c.id === conceptId) ?? null;
}
