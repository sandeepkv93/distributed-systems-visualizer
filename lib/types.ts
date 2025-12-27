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
