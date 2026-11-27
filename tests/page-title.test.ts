import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONCEPTS_CATALOG } from '@/lib/catalog';
import { LABS_CATALOG, TOTAL_LABS } from '@/lib/labs-catalog';
import { DEFAULT_PAGE_TITLE, getPageTitleForPath } from '@/lib/page-title';

describe('Dynamic per-route browser tab titles', () => {
  it('resolves distinct, concise titles for home, /labs, all 22 plates, and all 27 labs', () => {
    assert.equal(getPageTitleForPath('/'), DEFAULT_PAGE_TITLE);
    assert.equal(getPageTitleForPath('/labs'), `Workbenches Directory (${TOTAL_LABS}) — DS Atlas`);
    assert.equal(getPageTitleForPath('/labs/'), `Workbenches Directory (${TOTAL_LABS}) — DS Atlas`);

    const titles = new Set<string>();

    for (const concept of CONCEPTS_CATALOG) {
      const title = getPageTitleForPath(concept.path);
      assert.ok(title.includes(`Plate ${concept.plateNumber}`), `Missing plate number in ${title}`);
      assert.ok(title.includes(concept.name), `Missing concept name in ${title}`);
      assert.ok(title.endsWith('— DS Atlas'));
      assert.equal(getPageTitleForPath(`${concept.path}/`), title);
      titles.add(title);
    }

    for (const lab of LABS_CATALOG) {
      const title = getPageTitleForPath(lab.path);
      assert.ok(title.includes(lab.navTitle), `Missing lab title in ${title}`);
      assert.ok(title.endsWith('— DS Atlas'));
      assert.equal(getPageTitleForPath(`${lab.path}/`), title);
      titles.add(title);
    }

    assert.equal(titles.size, CONCEPTS_CATALOG.length + LABS_CATALOG.length);
    assert.equal(getPageTitleForPath('/unknown-route'), DEFAULT_PAGE_TITLE);
  });
});
