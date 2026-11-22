import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CONCEPTS_CATALOG, TOTAL_CONCEPTS, TOTAL_SCENARIOS } from '@/lib/catalog';

const repoRoot = process.env.REPO_ROOT || process.cwd();

describe('Catalog and scenario event contracts', () => {
  it('registers all 22 concepts and 79 scenarios with valid page routes', () => {
    assert.equal(TOTAL_CONCEPTS, 22);
    assert.equal(TOTAL_SCENARIOS, 79);
    assert.equal(CONCEPTS_CATALOG.length, 22);

    for (const concept of CONCEPTS_CATALOG) {
      const pagePath = path.join(repoRoot, 'app', concept.id, 'page.tsx');
      assert.ok(fs.existsSync(pagePath), `Expected route page for concept: ${concept.id}`);

      const seenIds = new Set<string>();
      for (const scenario of concept.scenarios) {
        assert.ok(scenario.id.trim().length > 0, `Empty scenario id in ${concept.id}`);
        assert.equal(
          seenIds.has(scenario.id),
          false,
          `Duplicate scenario id "${scenario.id}" in ${concept.id}`
        );
        seenIds.add(scenario.id);
        assert.ok(scenario.name.trim().length > 0, `Empty scenario name in ${concept.id}/${scenario.id}`);
        assert.ok(scenario.events.length > 0, `Scenario has no events: ${concept.id}/${scenario.id}`);
      }
    }
  });

  it('wires every scenario event type, snapshot restore, timeline jump, and progress tracking in all 21 simulation pages', () => {
    const simulationConcepts = CONCEPTS_CATALOG.filter((c) => c.scenarios.length > 0);
    assert.equal(simulationConcepts.length, 21);

    for (const concept of simulationConcepts) {
      const pagePath = path.join(repoRoot, 'app', concept.id, 'page.tsx');
      const pageSource = fs.readFileSync(pagePath, 'utf8');

      // Extract all registered simulation.onEvent('<type>', ...) handlers
      const registeredHandlers = new Set<string>();
      const handlerRegex = /onEvent\(\s*'([^']+)'/g;
      let match: RegExpExecArray | null;
      while ((match = handlerRegex.exec(pageSource)) !== null) {
        registeredHandlers.add(match[1]);
      }

      for (const scenario of concept.scenarios) {
        for (const event of scenario.events) {
          assert.ok(
            registeredHandlers.has(event.type),
            `Unhandled event type "${event.type}" in ${concept.id}/${scenario.id} (app/${concept.id}/page.tsx)`
          );
        }
      }

      assert.ok(
        pageSource.includes('.serialize()') && pageSource.includes('.restore('),
        `Missing serialize/restore snapshot wiring in app/${concept.id}/page.tsx`
      );
      assert.ok(
        pageSource.includes('useScenarioCompletion('),
        `Missing useScenarioCompletion wiring in app/${concept.id}/page.tsx`
      );
      assert.ok(
        pageSource.includes('onJumpToStep={simulation.jumpToStep}'),
        `Missing onJumpToStep wiring in app/${concept.id}/page.tsx`
      );
    }
  });

  it('sets responsive viewBox on every visualizer SVG and avoids blocking alert/confirm dialogs', () => {
    for (const concept of CONCEPTS_CATALOG) {
      const pagePath = path.join(repoRoot, 'app', concept.id, 'page.tsx');
      const pageSource = fs.readFileSync(pagePath, 'utf8');
      const svgMatch = pageSource.match(/<svg[^>]*ref=\{svgRef\}[^>]*>/);
      assert.ok(svgMatch, `Expected <svg ref={svgRef}> in app/${concept.id}/page.tsx`);
      assert.ok(
        svgMatch[0].includes('viewBox='),
        `Missing viewBox on <svg ref={svgRef}> in app/${concept.id}/page.tsx`
      );
    }

    const dirsToCheck = ['app', 'components', 'hooks', 'lib'];
    const walk = (dir: string): string[] => {
      const files: string[] = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...walk(full));
        } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
          files.push(full);
        }
      }
      return files;
    };

    for (const relDir of dirsToCheck) {
      for (const file of walk(path.join(repoRoot, relDir))) {
        const source = fs.readFileSync(file, 'utf8');
        assert.equal(
          /\b(?:window\.)?(?:alert|confirm)\s*\(/.test(source),
          false,
          `Found blocking alert()/confirm() call in ${path.relative(repoRoot, file)}`
        );
      }
    }
  });
});
