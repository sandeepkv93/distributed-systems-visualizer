// Common types across all visualizers

export type NodeStatus = 'healthy' | 'failed' | 'processing';

export interface Position {
  x: number;
  y: number;
}

export interface BaseNode {
  id: string;
  position: Position;
  status: NodeStatus;
}

// Message types
export type MessageStatus = 'in-flight' | 'success' | 'failure';

export interface Message {
  id: string;
  from: string;
  to: string;
  type: string;
  payload: any;
  status: MessageStatus;
  timestamp: number;
}

// Simulation control types
export interface PlaybackControls {
  play: () => void;
  pause: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  reset: () => void;
  setSpeed: (multiplier: number) => void;
  jumpToEvent: (eventId: number) => void;
}

export interface SimulationState {
  isPlaying: boolean;
  speed: number;
  currentEventIndex: number;
  events: SimulationEvent[];
}

export interface SimulationEvent {
  id: number;
  timestamp: number;
  type: string;
  description: string;
  data: any;
}

// Raft-specific types
export type RaftNodeState = 'follower' | 'candidate' | 'leader';

export interface LogEntry {
  term: number;
  index: number;
  command: string;
}

export interface RaftNode extends BaseNode {
  state: RaftNodeState;
  term: number;
  log: LogEntry[];
  commitIndex: number;
  votedFor: string | null;
  votesReceived: number;
}

export interface RaftMessage extends Message {
  type: 'RequestVote' | 'RequestVoteResponse' | 'AppendEntries' | 'AppendEntriesResponse' | 'ClientRequest';
  payload: {
    term: number;
    [key: string]: any;
  };
}

// Paxos-specific types
export type PaxosRole = 'proposer' | 'acceptor' | 'learner';
export type PaxosPhase = 'prepare' | 'promise' | 'accept' | 'accepted';

export interface PaxosNode extends BaseNode {
  role: PaxosRole;
  proposalNumber?: number;
  acceptedProposal?: number;
  acceptedValue?: any;
  promisedProposal?: number;
}

export interface PaxosMessage extends Message {
  type: 'Prepare' | 'Promise' | 'Accept' | 'Accepted' | 'Nack';
  payload: {
    proposalNumber: number;
    value?: any;
    acceptedProposal?: number;
    acceptedValue?: any;
  };
}

// Two-Phase Commit types
export type TwoPhaseCommitRole = 'coordinator' | 'participant';
export type TwoPhaseCommitState = 'init' | 'preparing' | 'prepared' | 'committing' | 'committed' | 'aborting' | 'aborted';

export interface TwoPhaseCommitNode extends BaseNode {
  role: TwoPhaseCommitRole;
  state: TwoPhaseCommitState;
  vote?: 'yes' | 'no';
  transactionId: string;
}

export interface TwoPhaseCommitMessage extends Message {
  type: 'VoteRequest' | 'VoteYes' | 'VoteNo' | 'Commit' | 'Abort' | 'Ack';
  payload: {
    transactionId: string;
  };
}

// Eventual Consistency types
export type ConsistencyLevel = 'ONE' | 'QUORUM' | 'ALL';

export interface VectorClock {
  [nodeId: string]: number;
}

export interface EventualConsistencyNode extends BaseNode {
  data: Map<string, any>;
  vectorClock: VectorClock;
  version: number;
}

export interface EventualConsistencyMessage extends Message {
  type: 'Write' | 'Read' | 'Replicate' | 'AntiEntropy';
  payload: {
    key: string;
    value?: any;
    vectorClock: VectorClock;
    consistencyLevel?: ConsistencyLevel;
  };
}

// Gossip / Anti-Entropy types
export type GossipMode = 'push' | 'pull' | 'push-pull';

export interface GossipValue {
  value: any;
  version: number;
  origin: string;
  timestamp: number;
}

export interface GossipNode extends BaseNode {
  data: Map<string, GossipValue>;
  version: number;
}

export interface GossipMessage extends Message {
  type: 'Gossip';
  payload: {
    mode: GossipMode;
  };
}

// Chandy-Lamport Snapshot types
export interface SnapshotChannelRecord {
  from: string;
  value: any;
}

export interface SnapshotState {
  id: string;
  localState: number;
  channels: Record<string, SnapshotChannelRecord[]>;
  recordingFrom: string[];
  complete: boolean;
}

export interface SnapshotNode extends BaseNode {
  localState: number;
  snapshot?: SnapshotState;
}

export interface SnapshotMessage extends Message {
  type: 'App' | 'Marker';
  payload: {
    value?: any;
    snapshotId?: string;
  };
}

// Lamport Clocks + Total Order Broadcast types
export interface LamportHoldbackMessage {
  id: string;
  from: string;
  timestamp: number;
  value: any;
  acks: string[];
}

export interface LamportNode extends BaseNode {
  clock: number;
  holdback: LamportHoldbackMessage[];
  delivered: LamportHoldbackMessage[];
}

export interface LamportMessage extends Message {
  type: 'Broadcast' | 'Ack';
  payload: {
    messageId: string;
    value?: any;
    timestamp?: number;
    ackTimestamp?: number;
  };
}

// Quorum Replication + Read Repair types
export interface QuorumValue {
  value: any;
  version: number;
  timestamp: number;
}

export interface QuorumNode extends BaseNode {
  data: Map<string, QuorumValue>;
  version: number;
}

export interface QuorumMessage extends Message {
  type: 'Write' | 'Read' | 'Repair';
  payload: {
    key: string;
    value?: any;
    version?: number;
  };
}

// Distributed Lock + Lease types
export interface LockLease {
  ownerId: string | null;
  expiresAt: number | null;
}

export interface LockNode extends BaseNode {
  role: 'manager' | 'client';
  holdingLock: boolean;
  leaseExpiresAt: number | null;
  lastHeartbeat: number | null;
}

export interface LockMessage extends Message {
  type: 'Acquire' | 'Grant' | 'Heartbeat' | 'Release' | 'Deny' | 'Timeout';
  payload: {
    leaseExpiresAt?: number;
    reason?: string;
    queuePosition?: number;
  };
}

// Sharding + Rebalancing types
export type ShardingStrategy = 'range' | 'hash';

export interface ShardRange {
  start: number;
  end: number;
}

export interface ShardNode extends BaseNode {
  shards: ShardRange[];
  keys: number[];
  load: number;
}

export interface ShardMigration {
  from: string;
  to: string;
  range: ShardRange;
  keys: number[];
}

export interface ShardMessage extends Message {
  type: 'MoveShard' | 'Rebalance';
  payload: {
    range: ShardRange;
    keys: number[];
    strategy: ShardingStrategy;
  };
}

// Merkle Tree Anti-Entropy types
export interface MerkleLeaf {
  key: string;
  value: string;
  hash: string;
}

export interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
  range: [string, string];
}

export interface MerkleReplica {
  id: string;
  data: Map<string, string>;
  root: MerkleNode | null;
}

export interface MerkleMessage extends Message {
  type: 'CompareRoot' | 'CompareNode' | 'SyncLeaf';
  payload: {
    range: [string, string];
    hash?: string;
    key?: string;
    value?: string;
  };
}

// CRDT types
export interface CRDTElement {
  id: string;
  value: string;
  prevId: string;
  tombstone: boolean;
}

export interface CRDTReplica {
  id: string;
  gCounter: Record<string, number>;
  orSetAdds: Record<string, string[]>;
  orSetRemoves: string[];
  rga: Record<string, CRDTElement>;
  localCounter: number;
}

export interface CRDTMessage extends Message {
  type: 'Sync';
  payload: {
    fromId: string;
    toId: string;
  };
}

// Replication Log (Kafka-style) types
export interface ReplicationLogEntry {
  offset: number;
  value: string;
}

export interface LogReplica {
  id: string;
  role: 'leader' | 'follower';
  log: ReplicationLogEntry[];
  highWatermark: number;
  lag: number;
  inSync: boolean;
}

export interface LogPartition {
  id: string;
  replicas: LogReplica[];
  isr: string[];
  leaderId: string;
  nextOffset: number;
}

export interface LogMessage extends Message {
  type: 'Produce' | 'Replicate' | 'Fetch' | 'Ack';
  payload: {
    partitionId: string;
    offset?: number;
    value?: string;
    leaderId?: string;
  };
}

// Failure Detector types
export type FDStatus = 'alive' | 'suspect' | 'failed';

export interface FailureDetectorNode extends BaseNode {
  lastHeartbeat: number;
  phi: number;
  status: FDStatus;
}

export interface FailureDetectorMessage extends Message {
  type: 'Heartbeat' | 'Probe' | 'Ack' | 'Suspect' | 'Confirm';
  payload: {
    targetId: string;
    phi?: number;
  };
}

// Distributed Transactions types
export type TransactionPhase = 'init' | 'prepare' | 'pre-commit' | 'commit' | 'abort' | 'done';
export type SagaStepStatus = 'pending' | 'completed' | 'compensated';

export interface TransactionParticipant {
  id: string;
  status: 'healthy' | 'failed';
  phase: TransactionPhase;
  vote?: 'yes' | 'no';
}

export interface SagaStep {
  id: string;
  name: string;
  status: SagaStepStatus;
}

export interface TransactionMessage extends Message {
  type: 'Prepare' | 'PreCommit' | 'Commit' | 'Abort' | 'Vote' | 'Compensate';
  payload: {
    participantId: string;
    vote?: 'yes' | 'no';
    stepId?: string;
  };
}

// Load Balancing + Backpressure types
export interface LoadWorker extends BaseNode {
  queue: number;
  capacity: number;
  processing: number;
  status: 'healthy' | 'overloaded' | 'failed';
}

export interface LoadRequest {
  id: string;
  latency: number;
  assignedTo?: string;
  status: 'queued' | 'processing' | 'done' | 'dropped';
}

export interface LoadMessage extends Message {
  type: 'Request' | 'Dispatch' | 'Drop' | 'Complete';
  payload: {
    requestId: string;
    workerId?: string;
  };
}

// PBFT types
export type PBFTPhase = 'pre-prepare' | 'prepare' | 'commit' | 'executed';

export interface PBFTLogEntry {
  requestId: string;
  view: number;
  seq: number;
  value: any;
  phase: PBFTPhase;
  prepares: string[];
  commits: string[];
}

export interface PBFTNode extends BaseNode {
  view: number;
  role: 'primary' | 'replica';
  log: Map<string, PBFTLogEntry>;
  executed: PBFTLogEntry[];
}

export interface PBFTMessage extends Message {
  type: 'ClientRequest' | 'PrePrepare' | 'Prepare' | 'Commit' | 'ViewChange';
  payload: {
    requestId: string;
    view: number;
    seq?: number;
    value?: any;
    newView?: number;
  };
}

// Vector Clocks types
export interface VectorClockEvent {
  id: string;
  processId: string;
  vectorClock: VectorClock;
  type: 'local' | 'send' | 'receive';
  timestamp: number;
  relatedEvent?: string; // For send/receive pairs
}

export interface VectorClockProcess extends BaseNode {
  processId: string;
  vectorClock: VectorClock;
  events: VectorClockEvent[];
}

// Consistent Hashing types
export interface ConsistentHashNode {
  id: string;
  hashValue: number;
  isVirtual: boolean;
  physicalNodeId?: string;
  keys: string[];
}

export interface ConsistentHashKey {
  key: string;
  hashValue: number;
  nodeId: string;
}

export interface ConsistentHashRing {
  nodes: ConsistentHashNode[];
  keys: ConsistentHashKey[];
  virtualNodesPerNode: number;
}

// CAP Theorem types
export type CAPProperty = 'consistency' | 'availability' | 'partition-tolerance';

export interface CAPSystem {
  name: string;
  properties: CAPProperty[];
  description: string;
  position: { x: number; y: number }; // Position on triangle
}

// Scenario types
export interface Scenario {
  id: string;
  name: string;
  description: string;
  concept: string;
  initialState: any;
  events: SimulationEvent[];
  learningObjectives: string[];
  expectedOutcome: string;
}

// Quiz types
export type QuizQuestionType = 'multiple-choice' | 'open-ended';

export interface QuizQuestion {
  id: string;
  question: string;
  type: QuizQuestionType;
  options?: string[];
  correctAnswer: string | number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Quiz {
  id: string;
  concept: string;
  questions: QuizQuestion[];
}

// Progress tracking types
export interface UserProgress {
  conceptsCompleted: string[];
  scenariosCompleted: string[];
  quizScores: { [quizId: string]: number };
  timeSpent: { [concept: string]: number };
  achievements: string[];
}

// Claude API types
export interface ClaudeExplanation {
  question: string;
  answer: string;
  timestamp: number;
}

export interface ClaudeAPIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
}
