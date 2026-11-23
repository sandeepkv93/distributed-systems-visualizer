import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BIBLIOGRAPHY, filterBibliography } from '../lib/bibliography';
import { CONCEPTS_CATALOG, CONCEPT_DOMAINS_BY_ID } from '../lib/catalog';
import { isDuelId } from '../lib/duels';

describe('Primary Literature & Citation Monograph integrity', () => {
  it('orders papers chronologically and covers every single one of the 22 catalog concepts', () => {
    assert.ok(BIBLIOGRAPHY.length >= 18);

    const validConceptIds = new Set(CONCEPTS_CATALOG.map((c) => c.id));
    const coveredConceptIds = new Set<string>();
    const seenIds = new Set<string>();
    let prevYear = 0;

    for (const paper of BIBLIOGRAPHY) {
      assert.ok(!seenIds.has(paper.id), `Duplicate paper id: ${paper.id}`);
      seenIds.add(paper.id);

      assert.ok(paper.year >= prevYear, `Paper ${paper.id} (${paper.year}) is out of chronological order`);
      prevYear = paper.year;

      assert.ok(CONCEPT_DOMAINS_BY_ID.has(paper.domainId), `Invalid domainId: ${paper.domainId}`);
      assert.ok(paper.conceptIds.length > 0, `Paper ${paper.id} must link at least one concept`);

      for (const cid of paper.conceptIds) {
        assert.ok(validConceptIds.has(cid), `Unknown conceptId "${cid}" in paper ${paper.id}`);
        coveredConceptIds.add(cid);
      }

      if (paper.duelIds) {
        for (const duelId of paper.duelIds) {
          assert.ok(isDuelId(duelId), `Invalid duelId "${duelId}" in paper ${paper.id}`);
        }
      }
    }

    for (const concept of CONCEPTS_CATALOG) {
      assert.ok(
        coveredConceptIds.has(concept.id),
        `Catalog concept "${concept.id}" is missing from the primary bibliography`
      );
    }
  });

  it('filters bibliography accurately by decade, domain, and search text', () => {
    const seventies = filterBibliography({ decade: '1970s' });
    assert.equal(seventies.length, 3);
    assert.ok(seventies.every((p) => p.year >= 1970 && p.year < 1980));

    const consensus = filterBibliography({ domainId: 'consensus' });
    assert.ok(consensus.some((p) => p.id === 'ongaro-2014-raft'));
    assert.ok(consensus.some((p) => p.id === 'castro-liskov-1999-pbft'));

    const lamport = filterBibliography({ query: 'Lamport' });
    assert.equal(lamport.length, 3); // 1978 Clocks, 1985 Chandy-Lamport, 1998 Paxos
  });
});
