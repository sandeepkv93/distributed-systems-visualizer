import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseScenarioDeepLink,
  clampDeepLinkStep,
  buildScenarioDeepLinkUrl,
} from '@/lib/deeplink';

describe('Scenario & step deep-link URL helpers', () => {
  it('parses valid scenario and step query parameters and rejects malformed steps', () => {
    assert.deepEqual(parseScenarioDeepLink('?scenario=split-brain&step=4'), {
      scenarioId: 'split-brain',
      step: 4,
    });
    assert.deepEqual(parseScenarioDeepLink('?scenario=leader-failure'), {
      scenarioId: 'leader-failure',
      step: null,
    });
    assert.deepEqual(parseScenarioDeepLink('?scenario=basic&step=-3'), {
      scenarioId: 'basic',
      step: null,
    });
    assert.deepEqual(parseScenarioDeepLink('?scenario=basic&step=abc'), {
      scenarioId: 'basic',
      step: null,
    });
    assert.deepEqual(parseScenarioDeepLink(''), {
      scenarioId: null,
      step: null,
    });
  });

  it('clamps step indices safely within scenario bounds', () => {
    assert.equal(clampDeepLinkStep(3, 10), 3);
    assert.equal(clampDeepLinkStep(42, 7), 7);
    assert.equal(clampDeepLinkStep(-5, 7), 0);
    assert.equal(clampDeepLinkStep(2, 0), 0);
  });

  it('builds and cleans deep-link URLs while preserving unrelated params and hash', () => {
    const base = 'https://example.github.io/distributed-systems-visualizer/raft?ref=atlas#top';

    const withStep = buildScenarioDeepLinkUrl(base, 'split-brain', 5);
    assert.equal(
      withStep,
      'https://example.github.io/distributed-systems-visualizer/raft?ref=atlas&scenario=split-brain&step=5#top'
    );

    const atZero = buildScenarioDeepLinkUrl(withStep, 'split-brain', 0);
    assert.equal(
      atZero,
      'https://example.github.io/distributed-systems-visualizer/raft?ref=atlas&scenario=split-brain#top'
    );

    const cleared = buildScenarioDeepLinkUrl(withStep, '', 0);
    assert.equal(
      cleared,
      'https://example.github.io/distributed-systems-visualizer/raft?ref=atlas#top'
    );
  });
});
