import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CONCEPTS_BY_ID } from '@/lib/catalog';
import {
  PREDICTION_CHECKPOINTS,
  TOTAL_CHECKPOINTS,
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

  it('maps every checkpoint to a real catalog concept and scenario with valid options', () => {
    assert.ok(TOTAL_CHECKPOINTS >= 12);
    const seenIds = new Set<string>();

    for (const cp of PREDICTION_CHECKPOINTS) {
      assert.equal(seenIds.has(cp.id), false, `Duplicate checkpoint id: ${cp.id}`);
      seenIds.add(cp.id);

      const concept = CONCEPTS_BY_ID.get(cp.conceptId);
      assert.ok(concept, `Unknown conceptId "${cp.conceptId}" in checkpoint ${cp.id}`);
      assert.ok(
        concept.scenarios.some((s) => s.id === cp.scenarioId),
        `Unknown scenarioId "${cp.scenarioId}" for concept "${cp.conceptId}"`
      );
      assert.equal(cp.options.length, 3);
      assert.ok(cp.correctIndex >= 0 && cp.correctIndex < cp.options.length);
      assert.equal(getCheckpointForScenario(cp.conceptId, cp.scenarioId)?.id, cp.id);
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
