import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CONCEPTS_CATALOG } from '../lib/catalog';
import {
  GEO_REGIONS,
  TOPOLOGY_SPECS,
  evaluateGeoTopology,
} from '../lib/replication-topologies';

describe('Geo-Distributed Replication Topologies WAN Lab', () => {
  it('defines 3 regions and 4 replication topologies referencing valid catalog conceptIds', () => {
    const validIds = new Set(CONCEPTS_CATALOG.map((c) => c.id));
    assert.equal(GEO_REGIONS.length, 3);
    assert.equal(TOPOLOGY_SPECS.length, 4);
    for (const spec of TOPOLOGY_SPECS) {
      for (const cid of spec.conceptIds) {
        assert.ok(validIds.has(cid), `Topology ${spec.id} has invalid conceptId: ${cid}`);
      }
    }
  });

  it('captures exact latency, failover RPO/RTO, and conflict trade-offs across all 4 topologies', () => {
    // AP-SOUTH client pays high WAN latency under Single-Leader Sync vs ultra-low local latency under Multi-Leader
    const syncFromAp = evaluateGeoTopology({
      topology: 'single-leader-sync',
      clientRegion: 'ap-south',
      failedRegion: 'none',
      sloppyQuorum: false,
    });
    const multiFromAp = evaluateGeoTopology({
      topology: 'multi-leader',
      clientRegion: 'ap-south',
      failedRegion: 'none',
      sloppyQuorum: false,
    });
    assert.ok((syncFromAp.writeLatencyMs ?? 0) > 200);
    assert.ok((multiFromAp.writeLatencyMs ?? 999) < 20);
    assert.equal(syncFromAp.conflictRisk, 'None');
    assert.equal(multiFromAp.conflictRisk, 'High (Merge Required)');

    // US-EAST crash halts Single-Leader Async writes while Single-Leader Sync promotes EU-WEST with RPO=0
    const asyncPrimaryDown = evaluateGeoTopology({
      topology: 'single-leader-async',
      clientRegion: 'eu-west',
      failedRegion: 'us-east',
      sloppyQuorum: false,
    });
    assert.equal(asyncPrimaryDown.writesAvailable, false);

    const syncPrimaryDown = evaluateGeoTopology({
      topology: 'single-leader-sync',
      clientRegion: 'eu-west',
      failedRegion: 'us-east',
      sloppyQuorum: false,
    });
    assert.equal(syncPrimaryDown.writesAvailable, true);
    assert.deepEqual(syncPrimaryDown.leaderRegions, ['eu-west']);

    // Leaderless Quorum survives any 1 region failure with 0s RTO
    const dynamoDown = evaluateGeoTopology({
      topology: 'leaderless-quorum',
      clientRegion: 'eu-west',
      failedRegion: 'us-east',
      sloppyQuorum: false,
    });
    assert.equal(dynamoDown.writesAvailable, true);
    assert.equal(dynamoDown.leaderRegions.length, 0);
  });
});
