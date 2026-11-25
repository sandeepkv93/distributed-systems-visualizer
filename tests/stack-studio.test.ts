import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PARTITIONING_OPTIONS,
  REPLICATION_OPTIONS,
  TRANSACTION_OPTIONS,
  CLOCK_REPAIR_OPTIONS,
  STACK_PRESETS,
  evaluateComposedStack,
  formatStackAdrMarkdown,
} from '../lib/stack-studio';
import { CONCEPTS_BY_ID } from '../lib/catalog';

describe('System Design Stack Composer & ADR Exporter', () => {
  it('references valid catalog conceptIds across every layer option and evaluates all 5 presets cleanly', () => {
    const allOptions = [
      ...PARTITIONING_OPTIONS,
      ...REPLICATION_OPTIONS,
      ...TRANSACTION_OPTIONS,
      ...CLOCK_REPAIR_OPTIONS,
    ];
    for (const opt of allOptions) {
      assert.ok(CONCEPTS_BY_ID.has(opt.conceptId), `Invalid conceptId ${opt.conceptId}`);
    }

    assert.equal(STACK_PRESETS.length, 5);
    for (const preset of STACK_PRESETS) {
      const report = evaluateComposedStack(preset.selection);
      assert.ok(report.fitScore >= 85, `Preset ${preset.id} had unexpectedly low fit score ${report.fitScore}`);
      assert.equal(
        report.warnings.filter((w) => w.severity === 'critical').length,
        0,
        `Preset ${preset.id} should not trigger critical anti-pattern warnings`
      );
      assert.ok(report.linkedConceptIds.length >= 2);
    }
  });

  it('detects critical architectural conflicts and exports valid Markdown ADR documents', () => {
    const brokenStack = {
      partitioning: 'consistent-hashing' as const,
      replication: 'crdt' as const,
      transactions: 'two-phase-commit' as const,
      clocks: 'wall-lww' as const,
    };
    const report = evaluateComposedStack(brokenStack);
    assert.ok(report.warnings.some((w) => w.id === 'warn-2pc-ap' && w.severity === 'critical'));
    assert.ok(report.warnings.some((w) => w.id === 'warn-wall-lww' && w.severity === 'critical'));
    assert.ok(report.fitScore < 50);

    const adr = formatStackAdrMarkdown(brokenStack, report, 'Payments Ledger');
    assert.ok(adr.includes('# ADR: Payments Ledger'));
    assert.ok(adr.includes('Two-Phase Commit (2PC)'));
    assert.ok(adr.includes('[CRITICAL]'));
  });
});
