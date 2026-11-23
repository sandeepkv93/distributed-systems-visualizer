import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONCEPTS_CATALOG } from '@/lib/catalog';
import {
  PROTOCOL_MAP_EDGES,
  PROTOCOL_MAP_NODES,
  PROTOCOL_MAP_NODES_BY_ID,
  getDownstreamIds,
  getUpstreamIds,
} from '@/lib/protocol-map';

describe('Protocol Dependency Map integrity', () => {
  it('places all 22 catalog concepts exactly once with valid coordinates', () => {
    const catalogIds = new Set(CONCEPTS_CATALOG.map((c) => c.id));
    const seen = new Set<string>();

    for (const node of PROTOCOL_MAP_NODES) {
      assert.ok(catalogIds.has(node.conceptId), `Unknown concept in map: ${node.conceptId}`);
      assert.equal(seen.has(node.conceptId), false, `Duplicate map node: ${node.conceptId}`);
      seen.add(node.conceptId);
      assert.ok(node.x > 0 && node.y > 0, `Invalid coordinates for ${node.conceptId}`);
    }

    assert.equal(seen.size, catalogIds.size, 'All 22 catalog concepts must appear on /map');
  });

  it('connects only valid concepts with no self-loops or duplicate directed edges', () => {
    assert.ok(PROTOCOL_MAP_EDGES.length >= 25);
    const seenEdges = new Set<string>();

    for (const edge of PROTOCOL_MAP_EDGES) {
      assert.ok(PROTOCOL_MAP_NODES_BY_ID.has(edge.from), `Unknown edge source: ${edge.from}`);
      assert.ok(PROTOCOL_MAP_NODES_BY_ID.has(edge.to), `Unknown edge target: ${edge.to}`);
      assert.notEqual(edge.from, edge.to, `Self-loop on ${edge.from}`);

      const key = `${edge.from}->${edge.to}`;
      assert.equal(seenEdges.has(key), false, `Duplicate edge: ${key}`);
      seenEdges.add(key);
    }

    assert.ok(getUpstreamIds('raft').includes('paxos'));
    assert.ok(getDownstreamIds('cap-theorem').includes('network-partitions'));
  });
});
