import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GLOSSARY_ENTRIES, TOTAL_GLOSSARY_TERMS, filterGlossary } from '../lib/glossary';
import { CONCEPTS_BY_ID, CONCEPT_DOMAINS } from '../lib/catalog';

describe('Canonical Distributed Systems Glossary & Notation Lexicon', () => {
  it('defines >= 35 unique alphabetically ordered terms covering all 5 domains with valid conceptIds', () => {
    assert.ok(GLOSSARY_ENTRIES.length >= 35);
    assert.equal(TOTAL_GLOSSARY_TERMS, GLOSSARY_ENTRIES.length);

    const ids = new Set<string>();
    const domainsCovered = new Set<string>();

    for (let i = 0; i < GLOSSARY_ENTRIES.length; i++) {
      const entry = GLOSSARY_ENTRIES[i];
      assert.ok(!ids.has(entry.id), `Duplicate glossary id ${entry.id}`);
      ids.add(entry.id);
      domainsCovered.add(entry.domainId);

      assert.ok(entry.conceptIds.length >= 1);
      for (const cid of entry.conceptIds) {
        assert.ok(CONCEPTS_BY_ID.has(cid), `Unknown conceptId ${cid} on glossary entry ${entry.id}`);
      }

      if (i > 0) {
        const prev = GLOSSARY_ENTRIES[i - 1].term.toLowerCase();
        const curr = entry.term.toLowerCase();
        assert.ok(
          prev <= curr,
          `Glossary entries not sorted alphabetically: "${GLOSSARY_ENTRIES[i - 1].term}" before "${entry.term}"`
        );
      }
    }

    for (const domain of CONCEPT_DOMAINS) {
      assert.ok(domainsCovered.has(domain.id), `Glossary missing coverage for domain ${domain.id}`);
    }
  });

  it('filters glossary accurately by domain, initial letter, and search text', () => {
    assert.equal(filterGlossary('all', 'all', '').length, TOTAL_GLOSSARY_TERMS);
    assert.ok(filterGlossary('consensus', 'all', '').every((e) => e.domainId === 'consensus'));
    assert.ok(filterGlossary('all', 'L', '').every((e) => e.term.startsWith('L')));

    const flp = filterGlossary('all', 'all', 'fischer');
    assert.equal(flp.length, 1);
    assert.equal(flp[0].id, 'flp-impossibility');
  });
});
