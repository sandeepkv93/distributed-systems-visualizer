import { CONCEPTS_CATALOG } from './catalog';

export type GeoRegionId = 'us-east' | 'eu-west' | 'ap-south';
export type ReplicationTopologyId =
  | 'single-leader-async'
  | 'single-leader-sync'
  | 'multi-leader'
  | 'leaderless-quorum';

export interface GeoRegionSpec {
  id: GeoRegionId;
  label: string;
  city: string;
  x: number;
  y: number;
}

export interface GeoEvalParams {
  topology: ReplicationTopologyId;
  clientRegion: GeoRegionId;
  failedRegion: GeoRegionId | 'none';
  sloppyQuorum: boolean;
}

export interface GeoEvalResult {
  topology: ReplicationTopologyId;
  writeLatencyMs: number | null;
  readLatencyMs: number | null;
  writesAvailable: boolean;
  readsAvailable: boolean;
  rpoLabel: string;
  rtoEstimate: string;
  conflictRisk: 'None' | 'High (Merge Required)' | 'Moderate (Quorum / Siblings)';
  leaderRegions: GeoRegionId[];
  explanation: string;
}

export const GEO_REGIONS: readonly GeoRegionSpec[] = [
  { id: 'us-east', label: 'US-EAST', city: 'Virginia', x: 145, y: 120 },
  { id: 'eu-west', label: 'EU-WEST', city: 'Dublin', x: 385, y: 74 },
  { id: 'ap-south', label: 'AP-SOUTH', city: 'Singapore', x: 565, y: 185 },
];

export const WAN_RTT_MS: Record<GeoRegionId, Record<GeoRegionId, number>> = {
  'us-east': { 'us-east': 4, 'eu-west': 82, 'ap-south': 190 },
  'eu-west': { 'us-east': 82, 'eu-west': 4, 'ap-south': 118 },
  'ap-south': { 'us-east': 190, 'eu-west': 118, 'ap-south': 4 },
};

export const TOPOLOGY_SPECS: ReadonlyArray<{
  id: ReplicationTopologyId;
  name: string;
  shortName: string;
  examples: string;
  summary: string;
  conceptIds: readonly string[];
}> = [
  {
    id: 'single-leader-async',
    name: 'Single-Leader (Async Followers)',
    shortName: '1-Leader Async',
    examples: 'PostgreSQL Async · MySQL Binlog · Aurora Global',
    summary: 'All writes route to US-EAST primary and ack locally before streaming asynchronously to EU/AP.',
    conceptIds: ['replication-log', 'eventual-consistency'],
  },
  {
    id: 'single-leader-sync',
    name: 'Single-Leader (Sync Quorum / Raft)',
    shortName: '1-Leader Sync',
    examples: 'CockroachDB · Spanner · etcd · Postgres Sync',
    summary: 'Primary waits for at least 1 cross-region follower ACK (quorum 2/3) before committing—guaranteeing RPO = 0.',
    conceptIds: ['raft', 'paxos', 'replication-log'],
  },
  {
    id: 'multi-leader',
    name: 'Multi-Leader (Active-Active)',
    shortName: 'Multi-Leader',
    examples: 'CouchDB · DynamoDB Global Tables · BDR',
    summary: 'Every region accepts local writes in <10ms and replicates asynchronously—introducing concurrent write conflicts.',
    conceptIds: ['crdts', 'vector-clocks', 'eventual-consistency'],
  },
  {
    id: 'leaderless-quorum',
    name: 'Leaderless Dynamo Quorum (W=2, R=2)',
    shortName: 'Leaderless',
    examples: 'Apache Cassandra · Amazon Dynamo · Riak',
    summary: 'Client/coordinator writes to all 3 regions and awaits W=2 ACKs (or falls back to Hinted Handoff under sloppy quorum).',
    conceptIds: ['quorum-replication', 'merkle-anti-entropy', 'gossip-anti-entropy'],
  },
];

export function evaluateGeoTopology(params: GeoEvalParams): GeoEvalResult {
  const { topology, clientRegion, failedRegion, sloppyQuorum } = params;
  const healthyRegions = GEO_REGIONS.map((r) => r.id).filter((id) => id !== failedRegion);
  const clientRegionDown = failedRegion === clientRegion;

  // Pick nearest healthy fallback region if client's local DC is down
  const entryRegion: GeoRegionId = clientRegionDown
    ? healthyRegions.reduce((best, r) =>
        WAN_RTT_MS[clientRegion][r] < WAN_RTT_MS[clientRegion][best] ? r : best
      )
    : clientRegion;
  const clientEntryRtt = WAN_RTT_MS[clientRegion][entryRegion];

  if (topology === 'single-leader-async') {
    const primaryDown = failedRegion === 'us-east';
    const writeLat = primaryDown
      ? null
      : WAN_RTT_MS[clientRegion]['us-east'] + 4;
    const readLat = clientEntryRtt + 4; // local async follower read
    return {
      topology,
      writeLatencyMs: writeLat,
      readLatencyMs: readLat,
      writesAvailable: !primaryDown,
      readsAvailable: true,
      rpoLabel: 'RPO > 0 (Async tail lost on US-EAST crash)',
      rtoEstimate: primaryDown ? '30s – 120s (Manual/Auto Promotion)' : '0s (Healthy)',
      conflictRisk: 'None',
      leaderRegions: primaryDown ? [] : ['us-east'],
      explanation: primaryDown
        ? 'Primary US-EAST failed: writes stall until a lagging follower is promoted (losing unreplicated async WAL tail).'
        : `Client in ${clientRegion.toUpperCase()} pays ${writeLat}ms to forward writes to US-EAST primary, while local follower reads stay fast (${readLat}ms) with possible replication lag.`,
    };
  }

  if (topology === 'single-leader-sync') {
    // Leader in US-EAST; if US-EAST fails, EU-WEST promotes immediately with 0 data loss (2/3 majority alive)
    const activeLeader: GeoRegionId = failedRegion === 'us-east' ? 'eu-west' : 'us-east';
    const peers = healthyRegions.filter((r) => r !== activeLeader);
    const nearestPeerRtt =
      peers.length > 0
        ? Math.min(...peers.map((p) => WAN_RTT_MS[activeLeader][p]))
        : null;
    const quorumAlive = healthyRegions.length >= 2 && nearestPeerRtt !== null;
    const writeLat = quorumAlive
      ? WAN_RTT_MS[clientRegion][activeLeader] + nearestPeerRtt + 6
      : null;
    const readLat = quorumAlive ? WAN_RTT_MS[clientRegion][activeLeader] + 4 : null;

    return {
      topology,
      writeLatencyMs: writeLat,
      readLatencyMs: readLat,
      writesAvailable: quorumAlive,
      readsAvailable: quorumAlive,
      rpoLabel: 'RPO = 0 (Majority Quorum Durable)',
      rtoEstimate: failedRegion === 'us-east' ? '2s – 5s (Raft Auto-Election)' : '0s (Healthy)',
      conflictRisk: 'None',
      leaderRegions: quorumAlive ? [activeLeader] : [],
      explanation: `Active leader in ${activeLeader.toUpperCase()} replicates synchronously to its nearest healthy peer (${nearestPeerRtt}ms WAN RTT), guaranteeing RPO = 0 and linearizable reads.`,
    };
  }

  if (topology === 'multi-leader') {
    const writeLat = clientEntryRtt + 6;
    const readLat = clientEntryRtt + 4;
    return {
      topology,
      writeLatencyMs: writeLat,
      readLatencyMs: readLat,
      writesAvailable: true,
      readsAvailable: true,
      rpoLabel: 'RPO > 0 (Unreplicated local region crash)',
      rtoEstimate: '0s (Route to surviving leader)',
      conflictRisk: 'High (Merge Required)',
      leaderRegions: healthyRegions,
      explanation: `Every surviving region accepts writes locally in ${writeLat}ms without waiting for WAN round-trips, but concurrent edits to the same key across continents require CRDT or LWW conflict resolution.`,
    };
  }

  // Leaderless Dynamo Quorum (N=3, W=2, R=2)
  const sortedRtts = healthyRegions
    .map((r) => WAN_RTT_MS[clientRegion][r])
    .sort((a, b) => a - b);

  const hasStrictQuorum = sortedRtts.length >= 2;
  const writeLat = hasStrictQuorum
    ? sortedRtts[1] + 6 // wait for 2nd fastest healthy replica
    : sloppyQuorum
    ? sortedRtts[0] + 8
    : null;
  const readLat = hasStrictQuorum ? sortedRtts[1] + 4 : sloppyQuorum ? sortedRtts[0] + 4 : null;

  return {
    topology,
    writeLatencyMs: writeLat,
    readLatencyMs: readLat,
    writesAvailable: hasStrictQuorum || sloppyQuorum,
    readsAvailable: hasStrictQuorum || sloppyQuorum,
    rpoLabel: hasStrictQuorum
      ? 'RPO = 0 (W=2 Majority Overlap)'
      : 'Sloppy Hinted Handoff (Stale Reads Possible)',
    rtoEstimate: '0s (No leader election needed)',
    conflictRisk: 'Moderate (Quorum / Siblings)',
    leaderRegions: [],
    explanation: `Coordinator fans out to all 3 regions and returns as soon as the 2nd fastest replica replies (${writeLat}ms). Zero failover pause when any 1 region goes down.`,
  };
}

export function getReplicationConcept(conceptId: string) {
  return CONCEPTS_CATALOG.find((c) => c.id === conceptId) ?? null;
}
