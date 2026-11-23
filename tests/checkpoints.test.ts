import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CONCEPTS_BY_ID, CONCEPTS_CATALOG } from '@/lib/catalog';
import {
  PREDICTION_CHECKPOINTS,
  TOTAL_CHECKPOINTS,
  getCheckpointForConcept,
  getCheckpointForScenario,
} from '@/lib/checkpoints';
import {
  getProgress,
  getProgressStats,
  markCheckpointSolved,
  resetProgress,
  exportProgress,
  importProgress,
} from '@/lib/progress';

function installMockStorage() {
  const makeStore = () => {
    const map = new Map<string, string>();
    return {
      getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
      setItem: (key: string, value: string) => {
        map.set(key, String(value));
      },
      removeItem: (key: string) => {
        map.delete(key);
      },
      clear: () => {
        map.clear();
      },
    };
  };

  (globalThis as unknown as Record<string, unknown>).window = {
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  (globalThis as unknown as Record<string, unknown>).localStorage = makeStore();
  (globalThis as unknown as Record<string, unknown>).sessionStorage = makeStore();
}

describe('Prediction Checkpoints contract and persistence', () => {
  beforeEach(() => {
    installMockStorage();
    resetProgress();
  });

  it('covers all 22 catalog concepts with valid scenarios and options', () => {
    assert.ok(TOTAL_CHECKPOINTS >= 22);
    const seenIds = new Set<string>();
    const coveredConcepts = new Set<string>();

    for (const cp of PREDICTION_CHECKPOINTS) {
      assert.equal(seenIds.has(cp.id), false, `Duplicate checkpoint id: ${cp.id}`);
      seenIds.add(cp.id);

      const concept = CONCEPTS_BY_ID.get(cp.conceptId);
      assert.ok(concept, `Unknown conceptId "${cp.conceptId}" in checkpoint ${cp.id}`);
      coveredConcepts.add(cp.conceptId);

      if (concept.scenarios.length > 0) {
        assert.ok(
          concept.scenarios.some((s) => s.id === cp.scenarioId),
          `Unknown scenarioId "${cp.scenarioId}" for concept "${cp.conceptId}"`
        );
      } else {
        assert.equal(cp.scenarioId, 'tradeoffs');
      }

      assert.equal(cp.options.length, 3);
      assert.ok(cp.correctIndex >= 0 && cp.correctIndex < cp.options.length);
      assert.equal(getCheckpointForScenario(cp.conceptId, cp.scenarioId)?.id, cp.id);
    }

    for (const concept of CONCEPTS_CATALOG) {
      assert.ok(
        coveredConcepts.has(concept.id),
        `Missing prediction checkpoint for concept "${concept.id}"`
      );
      assert.ok(
        getCheckpointForConcept(concept.id),
        `getCheckpointForConcept returned null for "${concept.id}"`
      );
    }
  });

  it('persists solved checkpoints, awards intuition_verified seal, and round-trips export/import', () => {
    markCheckpointSolved('raft:split-brain');
    markCheckpointSolved('paxos:dueling-proposers');
    assert.equal(getProgressStats().checkpointsSolved, 2);
    assert.equal(getProgress().achievements.includes('intuition_verified'), false);

    markCheckpointSolved('consistent-hashing:add-server');
    assert.equal(getProgressStats().checkpointsSolved, 3);
    assert.equal(getProgress().achievements.includes('intuition_verified'), true);

    const exported = exportProgress();
    resetProgress();
    assert.equal(getProgressStats().checkpointsSolved, 0);

    assert.equal(importProgress(exported), true);
    assert.equal(getProgressStats().checkpointsSolved, 3);
  });
});
