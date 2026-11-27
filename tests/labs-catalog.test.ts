import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  LAB_CATEGORIES,
  LABS_CATALOG,
  TOTAL_LABS,
  filterLabs,
  getCategoryCounts,
  getLabByPath,
  getLabsByCategory,
} from '../lib/labs-catalog';
import { CONCEPTS_CATALOG } from '../lib/catalog';
import { ATLAS_SEARCH_INDEX } from '../lib/search';

const REPO_ROOT = process.cwd();

describe('Unified Labs & Workbenches Catalog', () => {
  it('contains all 27 interactive labs with unique IDs, valid categories, valid concept links, disk pages, smoke coverage, and search coverage', () => {
    assert.equal(TOTAL_LABS, 27);
    assert.equal(LABS_CATALOG.length, 27);

    const uniqueIds = new Set(LABS_CATALOG.map((l) => l.id));
    const uniquePaths = new Set(LABS_CATALOG.map((l) => l.path));
    assert.equal(uniqueIds.size, LABS_CATALOG.length);
    assert.equal(uniquePaths.size, LABS_CATALOG.length);

    const validCategoryIds = new Set(LAB_CATEGORIES.map((c) => c.id));
    const validConceptIds = new Set(CONCEPTS_CATALOG.map((c) => c.id));
    const smokeScript = readFileSync(join(REPO_ROOT, 'scripts', 'smoke-export.mjs'), 'utf8');
    const searchHrefs = new Set(ATLAS_SEARCH_INDEX.map((item) => item.href));

    for (const lab of LABS_CATALOG) {
      assert.ok(validCategoryIds.has(lab.categoryId), `Invalid categoryId on ${lab.id}`);
      assert.ok(lab.path.startsWith('/'), `Path must start with /: ${lab.path}`);
      assert.ok(lab.relatedConceptIds.length > 0, `Lab ${lab.id} should reference related concepts`);

      for (const conceptId of lab.relatedConceptIds) {
        assert.ok(
          validConceptIds.has(conceptId),
          `Lab ${lab.id} references unknown conceptId "${conceptId}"`
        );
      }

      const routeDir = lab.path.replace(/^\/+/, '');
      const pagePath = join(REPO_ROOT, 'app', routeDir, 'page.tsx');
      assert.ok(existsSync(pagePath), `Missing Next.js page on disk for ${lab.path} (${pagePath})`);

      assert.ok(
        smokeScript.includes(`'${lab.path}'`),
        `Lab route ${lab.path} is missing from scripts/smoke-export.mjs`
      );

      assert.ok(
        searchHrefs.has(lab.path),
        `Lab route ${lab.path} is missing from ATLAS_SEARCH_INDEX`
      );
    }

    // Verify /labs directory itself is also wired into disk, smoke test, and search index
    assert.ok(existsSync(join(REPO_ROOT, 'app', 'labs', 'page.tsx')));
    assert.ok(smokeScript.includes("'/labs'"));
    assert.ok(searchHrefs.has('/labs'));
  });

  it('supports lookup by path, category counts, and multi-token filtering', () => {
    const counts = getCategoryCounts();
    const sum = Object.values(counts).reduce((acc, n) => acc + n, 0);
    assert.equal(sum, TOTAL_LABS);

    for (const category of LAB_CATEGORIES) {
      const items = getLabsByCategory(category.id);
      assert.equal(items.length, counts[category.id]);
      assert.ok(items.length >= 3, `Category ${category.id} should have at least 3 labs`);
    }

    const geoLab = getLabByPath('/replication-topologies/');
    assert.ok(geoLab);
    assert.equal(geoLab.id, 'replication-topologies');
    assert.equal(getLabByPath('/nonexistent-route'), null);

    const outboxMatches = filterLabs('all', 'debezium kafka');
    assert.equal(outboxMatches.length, 1);
    assert.equal(outboxMatches[0].id, 'outbox');

    const storageMatches = filterLabs('storage-data', 'bloom');
    assert.ok(storageMatches.some((l) => l.id === 'storage'));
    assert.ok(storageMatches.some((l) => l.id === 'sketches'));
    assert.ok(storageMatches.every((l) => l.categoryId === 'storage-data'));
  });
});
