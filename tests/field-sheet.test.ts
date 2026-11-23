import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { escapeXml, generateFieldSheetSvg } from '../lib/field-sheet';
import { CONCEPTS_CATALOG, CONCEPT_DOMAINS } from '../lib/catalog';

describe('Archival Field Study Sheet SVG generator', () => {
  it('escapes XML special characters safely', () => {
    assert.equal(
      escapeXml(`Raft & Paxos <2f+1> "strict" 'quorum'`),
      'Raft &amp; Paxos &lt;2f+1&gt; &quot;strict&quot; &apos;quorum&apos;'
    );
  });

  it('renders a complete archival SVG containing all 22 plates, 5 domains, and user metrics', () => {
    const svg = generateFieldSheetSvg({
      completedConceptIds: ['raft', 'paxos', 'pbft'],
      completedScenarioKeys: ['raft:normal-election', 'raft:leader-failure', 'paxos:basic-consensus'],
      checkpointsSolved: 7,
      totalCheckpoints: 25,
      achievementsUnlocked: 4,
      totalAchievements: 9,
      totalTimeSpentMs: 4_500_000, // 1h 15m
      generatedDate: '2026-11-23',
    });

    assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
    assert.ok(svg.endsWith('</svg>'));
    assert.ok(svg.includes('ISSUED 2026-11-23'));
    assert.ok(svg.includes('3/22'));
    assert.ok(svg.includes('3/79'));
    assert.ok(svg.includes('7/25'));
    assert.ok(svg.includes('4/9'));
    assert.ok(svg.includes('1h 15m'));

    for (const domain of CONCEPT_DOMAINS) {
      assert.ok(
        svg.includes(escapeXml(domain.label.toUpperCase())),
        `Missing domain label: ${domain.label}`
      );
    }

    for (const concept of CONCEPTS_CATALOG) {
      assert.ok(
        svg.includes(escapeXml(concept.name)),
        `Missing concept plate: ${concept.name}`
      );
      assert.ok(
        svg.includes(escapeXml(concept.plateNumber)),
        `Missing plate number: ${concept.plateNumber}`
      );
    }

    // Completed plates should carry green checkmark paths
    const checkCount = (svg.match(/stroke="#FAF7F1" stroke-width="2"/g) || []).length;
    assert.equal(checkCount, 3);
  });
});
