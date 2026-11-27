import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONCEPTS_CATALOG } from '../lib/catalog';
import {
  OUTBOX_ARCHITECTURES,
  OUTBOX_FAULTS,
  simulateOutboxScenario,
} from '../lib/outbox-lab';

describe('Transactional Outbox, WAL CDC & Idempotent Consumers Lab', () => {
  it('defines 3 architectures and 4 fault modes referencing valid catalog conceptIds', () => {
    const validIds = new Set(CONCEPTS_CATALOG.map((c) => c.id));
    assert.equal(OUTBOX_ARCHITECTURES.length, 3);
    assert.equal(OUTBOX_FAULTS.length, 4);
    for (const arch of OUTBOX_ARCHITECTURES) {
      for (const cid of arch.conceptIds) {
        assert.ok(validIds.has(cid), `Outbox arch ${arch.id} references invalid conceptId: ${cid}`);
      }
    }
  });

  it('catches dual-write lost & phantom events while proving Outbox + CDC + Idempotent Inbox consistency', () => {
    // DB-first dual write loses event on crash-after-db
    const lost = simulateOutboxScenario('dual-write-db-first', 'crash-after-db', true);
    assert.equal(lost.consistent, false);
    assert.equal(lost.dbOrderCommitted, true);
    assert.equal(lost.brokerMessagesPublished, 0);

    // Broker-first dual write emits phantom event on DB rollback
    const phantom = simulateOutboxScenario('dual-write-broker-first', 'crash-after-broker', true);
    assert.equal(phantom.consistent, false);
    assert.equal(phantom.dbOrderCommitted, false);
    assert.equal(phantom.consumerEffectsApplied, 1);

    // Transactional Outbox + CDC stays consistent across crash-after-db and crash-after-broker
    const outboxCrashDb = simulateOutboxScenario('transactional-outbox-cdc', 'crash-after-db', true);
    assert.equal(outboxCrashDb.consistent, true);
    assert.equal(outboxCrashDb.consumerEffectsApplied, 1);

    const outboxRollback = simulateOutboxScenario('transactional-outbox-cdc', 'crash-after-broker', true);
    assert.equal(outboxRollback.consistent, true);
    assert.equal(outboxRollback.brokerMessagesPublished, 0);

    // At-least-once redelivery requires Idempotent Inbox for effectively-once safety
    const dupUnsafe = simulateOutboxScenario('transactional-outbox-cdc', 'relay-duplicate-redelivery', false);
    assert.equal(dupUnsafe.consistent, false);
    assert.equal(dupUnsafe.consumerEffectsApplied, 2);

    const dupSafe = simulateOutboxScenario('transactional-outbox-cdc', 'relay-duplicate-redelivery', true);
    assert.equal(dupSafe.consistent, true);
    assert.equal(dupSafe.consumerEffectsApplied, 1);
  });
});
