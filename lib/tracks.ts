import { CONCEPTS_BY_ID, ConceptCatalogEntry } from './catalog';

export interface LearningTrack {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  estimatedMinutes: number;
  conceptIds: readonly string[];
}

export const LEARNING_TRACKS: readonly LearningTrack[] = [
  {
    id: 'time-and-causality',
    number: '01',
    title: 'Time & Causal Ordering',
    subtitle: 'Reason about event order and global state without synchronized physical clocks.',
    estimatedMinutes: 25,
    conceptIds: ['lamport-clocks', 'vector-clocks', 'chandy-lamport'],
  },
  {
    id: 'consensus-from-scratch',
    number: '02',
    title: 'Consensus from Scratch',
    subtitle: 'From failure detection and split-brain partitions to Paxos, Raft, and Byzantine quorums.',
    estimatedMinutes: 55,
    conceptIds: [
      'failure-detectors',
      'network-partitions',
      'paxos',
      'raft',
      'consensus-variants',
      'pbft',
    ],
  },
  {
    id: 'replication-and-storage',
    number: '03',
    title: 'Replication, Storage & Scale',
    subtitle: 'CAP bounds, tunable quorums, logs, CRDTs, anti-entropy repair, and consistent hash rings.',
    estimatedMinutes: 70,
    conceptIds: [
      'cap-theorem',
      'eventual-consistency',
      'quorum-replication',
      'replication-log',
      'gossip-anti-entropy',
      'merkle-anti-entropy',
      'crdts',
      'consistent-hashing',
      'sharding-rebalancing',
      'load-balancing',
    ],
  },
  {
    id: 'coordination-and-transactions',
    number: '04',
    title: 'Coordination & Transactions',
    subtitle: 'Lease-based distributed locks, atomic 2PC commits, 3PC, and compensating sagas.',
    estimatedMinutes: 30,
    conceptIds: ['distributed-locking', 'two-phase-commit', 'distributed-transactions'],
  },
] as const;

export interface TrackContext {
  track: LearningTrack;
  index: number;
  total: number;
  prev: ConceptCatalogEntry | null;
  next: ConceptCatalogEntry | null;
}

export function getTrackContextForConcept(conceptId: string): TrackContext | null {
  for (const track of LEARNING_TRACKS) {
    const idx = track.conceptIds.indexOf(conceptId);
    if (idx !== -1) {
      const prevId = idx > 0 ? track.conceptIds[idx - 1] : null;
      const nextId = idx < track.conceptIds.length - 1 ? track.conceptIds[idx + 1] : null;
      return {
        track,
        index: idx,
        total: track.conceptIds.length,
        prev: prevId ? CONCEPTS_BY_ID.get(prevId) ?? null : null,
        next: nextId ? CONCEPTS_BY_ID.get(nextId) ?? null : null,
      };
    }
  }
  return null;
}

export interface NextRecommendedPlate {
  concept: ConceptCatalogEntry;
  track: LearningTrack;
}

/**
 * Walks the curated learning tracks in curriculum order and returns the first
 * concept the learner has not yet completed, or null once all 22 plates are done.
 */
export function getNextRecommendedPlate(
  completedConceptIds: readonly string[]
): NextRecommendedPlate | null {
  const done = new Set(completedConceptIds);
  for (const track of LEARNING_TRACKS) {
    for (const id of track.conceptIds) {
      if (!done.has(id)) {
        const concept = CONCEPTS_BY_ID.get(id);
        if (concept) {
          return { concept, track };
        }
      }
    }
  }
  return null;
}
