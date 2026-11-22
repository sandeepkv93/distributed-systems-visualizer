import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { TOTAL_CONCEPTS, TOTAL_SCENARIOS } from '@/lib/catalog';
import {
  createDefaultProgress,
  getProgress,
  getProgressStats,
  getAllAchievements,
  markScenarioCompleted,
  markConceptCompleted,
  startSession,
  endSession,
  importProgress,
  exportProgress,
  resetProgress,
  subscribeAchievements,
  subscribeProgress,
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

describe('Progress & Achievements system', () => {
  beforeEach(() => {
    installMockStorage();
    resetProgress();
  });

  it('never returns a shared mutable defaultProgress reference', () => {
    const a = getProgress();
    a.conceptsCompleted.push('polluted');
    a.scenariosCompleted.push('polluted');
    a.achievements.push('polluted');

    const b = getProgress();
    assert.deepEqual(b.conceptsCompleted, []);
    assert.deepEqual(b.scenariosCompleted, []);
    assert.deepEqual(b.achievements, []);

    const d = createDefaultProgress();
    d.conceptsCompleted.push('polluted');
    assert.deepEqual(createDefaultProgress().conceptsCompleted, []);
  });

  it('computes dynamic totals from the 22-concept / 79-scenario catalog', () => {
    const stats = getProgressStats();
    assert.equal(stats.totalConcepts, TOTAL_CONCEPTS);
    assert.equal(stats.totalScenarios, TOTAL_SCENARIOS);

    const achievements = getAllAchievements();
    assert.ok(achievements.some((a) => a.id === 'scenario_legend' && a.description.includes('79')));
    assert.ok(achievements.some((a) => a.id === 'concept_master' && a.description.includes('22')));
  });

  it('namespaces scenarios per concept, auto-completes concepts, and notifies subscribers', () => {
    const unlockedIds: string[] = [];
    let progressUpdates = 0;

    const unsubAch = subscribeAchievements((list) => {
      list.forEach((a) => unlockedIds.push(a.id));
    });
    const unsubProg = subscribeProgress(() => {
      progressUpdates++;
    });

    markScenarioCompleted('split-brain', 'network-partitions');
    assert.ok(unlockedIds.includes('first_steps'));
    assert.equal(getProgress().conceptsCompleted.includes('network-partitions'), false);

    markScenarioCompleted('heal-and-resolve', 'network-partitions');
    assert.equal(getProgress().conceptsCompleted.includes('network-partitions'), true);

    // Same scenario ID under a different concept must not collide
    markScenarioCompleted('split-brain', 'raft');
    assert.equal(getProgress().scenariosCompleted.length, 3);
    assert.ok(progressUpdates >= 3);

    unsubAch();
    unsubProg();
  });

  it('awards time-based achievements when endSession() finishes', () => {
    const unlockedIds: string[] = [];
    const unsub = subscribeAchievements((list) => {
      list.forEach((a) => unlockedIds.push(a.id));
    });

    startSession('raft');
    sessionStorage.setItem(
      'session_start_time',
      JSON.stringify({ concept: 'raft', startTime: Date.now() - 3605000 })
    );
    endSession();

    assert.ok(getProgress().achievements.includes('dedicated_learner'));
    assert.ok(unlockedIds.includes('dedicated_learner'));

    unsub();
  });

  it('validates imported JSON strictly and normalizes legacy concept names', () => {
    assert.equal(importProgress('not valid json'), false);
    assert.equal(importProgress('{}'), false);
    assert.equal(importProgress('[]'), false);
    assert.equal(
      importProgress(
        JSON.stringify({
          conceptsCompleted: 'raft',
          scenariosCompleted: [],
          timeSpent: {},
          achievements: [],
        })
      ),
      false
    );
    assert.equal(
      importProgress(
        JSON.stringify({
          conceptsCompleted: [],
          scenariosCompleted: [],
          timeSpent: { raft: -100 },
          achievements: [],
        })
      ),
      false
    );

    markConceptCompleted('cap-theorem');
    const exported = exportProgress();
    resetProgress();
    assert.equal(getProgress().conceptsCompleted.length, 0);

    assert.equal(importProgress(exported), true);
    assert.deepEqual(getProgress().conceptsCompleted, ['cap-theorem']);

    // Legacy display names normalize cleanly to canonical concept IDs
    assert.equal(
      importProgress(
        JSON.stringify({
          conceptsCompleted: ['Raft Consensus', 'CAP Theorem'],
          scenariosCompleted: ['raft:basic-election'],
          timeSpent: { 'Raft Consensus': 2000 },
          achievements: [],
        })
      ),
      true
    );
    assert.deepEqual(getProgress().conceptsCompleted, ['raft', 'cap-theorem']);
    assert.equal(getProgress().timeSpent.raft, 2000);
  });
});
