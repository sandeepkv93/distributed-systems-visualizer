import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONCEPTS_CATALOG } from '../lib/catalog';
import {
  INTERVIEW_PROMPTS,
  evaluateInterview,
  getInterviewPrompt,
} from '../lib/interviews';

describe('System Design Interview Simulator & Critique Studio', () => {
  it('defines 6 unique prompts with 5 stages each and valid catalog conceptIds', () => {
    const validIds = new Set(CONCEPTS_CATALOG.map((c) => c.id));
    assert.equal(INTERVIEW_PROMPTS.length, 6);
    assert.equal(new Set(INTERVIEW_PROMPTS.map((p) => p.id)).size, 6);

    for (const prompt of INTERVIEW_PROMPTS) {
      assert.equal(prompt.stages.length, 5, `${prompt.id} must have 5 decision stages`);
      for (const stage of prompt.stages) {
        assert.equal(stage.options.length, 3, `${prompt.id}/${stage.id} must have 3 options`);
        const tiers = new Set(stage.options.map((o) => o.tier));
        assert.deepEqual(
          [...tiers].sort(),
          ['antipattern', 'principal', 'viable'],
          `${prompt.id}/${stage.id} must cover all 3 tiers`
        );
        for (const opt of stage.options) {
          assert.ok(
            validIds.has(opt.conceptId),
            `${prompt.id}/${stage.id}/${opt.id} references invalid conceptId: ${opt.conceptId}`
          );
        }
      }
    }

    assert.equal(getInterviewPrompt('unknown').id, 'payment-ledger');
  });

  it('scores Principal, Staff, and Anti-Pattern architectures accurately with warnings', () => {
    const prompt = getInterviewPrompt('payment-ledger');

    const optimalSelections: Record<string, string> = {};
    const antipatternSelections: Record<string, string> = {};
    for (const stage of prompt.stages) {
      optimalSelections[stage.id] = stage.options.find((o) => o.tier === 'principal')!.id;
      antipatternSelections[stage.id] = stage.options.find((o) => o.tier === 'antipattern')!.id;
    }

    const perfect = evaluateInterview(prompt, optimalSelections);
    assert.equal(perfect.score, 100);
    assert.equal(perfect.band, 'Principal Ready');
    assert.equal(perfect.warnings.length, 0);
    assert.ok(perfect.stageCritiques.every((c) => c.isOptimal));

    const broken = evaluateInterview(prompt, antipatternSelections);
    assert.equal(broken.score, 20);
    assert.equal(broken.band, 'Needs Refinement');
    assert.equal(broken.warnings.length, 5);
    assert.ok(broken.stageCritiques.every((c) => !c.isOptimal));
    assert.ok(broken.reviewConceptIds.length >= 4);
  });
});
