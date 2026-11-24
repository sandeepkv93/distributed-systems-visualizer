import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  EXAM_QUESTIONS,
  EXAM_PASS_THRESHOLD,
  TOTAL_EXAM_QUESTIONS,
  gradeExam,
} from '../lib/exam';
import { CONCEPTS_BY_ID, CONCEPT_DOMAINS } from '../lib/catalog';

describe('Systems Mastery Assessment engine', () => {
  it('defines 10 unique questions balanced evenly (2 per domain) across all 5 catalog domains', () => {
    assert.equal(EXAM_QUESTIONS.length, 10);
    assert.equal(TOTAL_EXAM_QUESTIONS, 10);
    assert.equal(EXAM_PASS_THRESHOLD, 8);

    const ids = new Set<string>();
    const countsByDomain = new Map<string, number>();

    for (const q of EXAM_QUESTIONS) {
      assert.ok(!ids.has(q.id), `Duplicate exam question id: ${q.id}`);
      ids.add(q.id);

      const concept = CONCEPTS_BY_ID.get(q.conceptId);
      assert.ok(concept, `Invalid conceptId ${q.conceptId} on ${q.id}`);
      assert.equal(
        concept.domainId,
        q.domainId,
        `Question ${q.id} domainId ${q.domainId} does not match concept ${q.conceptId} domain ${concept.domainId}`
      );
      assert.equal(q.options.length, 4);
      assert.ok(q.correctIndex >= 0 && q.correctIndex < 4);
      assert.ok(q.explanation.length > 30);

      countsByDomain.set(q.domainId, (countsByDomain.get(q.domainId) ?? 0) + 1);
    }

    for (const domain of CONCEPT_DOMAINS) {
      assert.equal(
        countsByDomain.get(domain.id),
        2,
        `Expected exactly 2 questions for domain ${domain.id}`
      );
    }
  });

  it('grades perfect, passing threshold, failing, and partial submissions accurately', () => {
    const perfectAnswers: Record<string, number> = {};
    for (const q of EXAM_QUESTIONS) {
      perfectAnswers[q.id] = q.correctIndex;
    }
    const perfect = gradeExam(perfectAnswers);
    assert.equal(perfect.score, 10);
    assert.equal(perfect.total, 10);
    assert.equal(perfect.percentage, 100);
    assert.equal(perfect.passed, true);
    assert.equal(perfect.answeredCount, 10);
    assert.ok(perfect.byDomain.every((d) => d.correct === 2 && d.total === 2));

    // Exactly 8/10 passes
    const thresholdAnswers = { ...perfectAnswers };
    thresholdAnswers[EXAM_QUESTIONS[0].id] = (EXAM_QUESTIONS[0].correctIndex + 1) % 4;
    thresholdAnswers[EXAM_QUESTIONS[1].id] = (EXAM_QUESTIONS[1].correctIndex + 1) % 4;
    const threshold = gradeExam(thresholdAnswers);
    assert.equal(threshold.score, 8);
    assert.equal(threshold.percentage, 80);
    assert.equal(threshold.passed, true);
    assert.equal(
      threshold.byDomain.find((d) => d.domainId === 'time-causality')?.correct,
      0
    );

    // 7/10 fails
    const failingAnswers = { ...thresholdAnswers };
    failingAnswers[EXAM_QUESTIONS[2].id] = (EXAM_QUESTIONS[2].correctIndex + 1) % 4;
    const failed = gradeExam(failingAnswers);
    assert.equal(failed.score, 7);
    assert.equal(failed.passed, false);

    // Empty / out-of-range answers are safely ignored
    const empty = gradeExam({ [EXAM_QUESTIONS[0].id]: 99 });
    assert.equal(empty.score, 0);
    assert.equal(empty.answeredCount, 0);
    assert.equal(empty.passed, false);
  });
});
