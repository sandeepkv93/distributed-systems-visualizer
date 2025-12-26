import { RaftNode, RaftMessage, LogEntry, SimulationEvent } from '../types';

export class RaftAlgorithm {
  private nodes: Map<string, RaftNode>;
  private messages: RaftMessage[];
  private eventLog: SimulationEvent[];
  private currentTerm: number;
  private electionTimeout: number;
  private heartbeatInterval: number;

  constructor(nodeCount: number = 5) {
    this.nodes = new Map();
    this.messages = [];
    this.eventLog = [];
    this.currentTerm = 0;
    this.electionTimeout = 150; // milliseconds
    this.heartbeatInterval = 50; // milliseconds

    // Initialize nodes
    for (let i = 0; i < nodeCount; i++) {
      const node: RaftNode = {
        id: `node-${i}`,
        position: this.calculateNodePosition(i, nodeCount),
        status: 'healthy',
        state: 'follower',
        term: 0,
        log: [],
        commitIndex: 0,
        votedFor: null,
        votesReceived: 0,
      };
      this.nodes.set(node.id, node);
    }
  }

  // Calculate node position in a circle
  private calculateNodePosition(index: number, total: number): { x: number; y: number } {
    const angle = (2 * Math.PI * index) / total - Math.PI / 2;
    const radius = 200;
    return {
      x: 400 + radius * Math.cos(angle),
      y: 300 + radius * Math.sin(angle),
    };
  }

  // Get all nodes
  getNodes(): RaftNode[] {
    return Array.from(this.nodes.values());
  }

  // Get a specific node
  getNode(nodeId: string): RaftNode | undefined {
    return this.nodes.get(nodeId);
  }

  // Update a node
  updateNode(nodeId: string, updates: Partial<RaftNode>): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      this.nodes.set(nodeId, { ...node, ...updates });
    }
  }

  // Get messages
  getMessages(): RaftMessage[] {
    return this.messages;
  }

  // Add message
  addMessage(message: RaftMessage): void {
    this.messages.push(message);
  }

  // Clear messages
  clearMessages(): void {
    this.messages = [];
  }

  // Get event log
  getEventLog(): SimulationEvent[] {
    return this.eventLog;
  }

  // Add event to log
  private addEvent(type: string, description: string, data: any = {}): void {
    const event: SimulationEvent = {
      id: this.eventLog.length,
      timestamp: Date.now(),
      type,
      description,
      data,
    };
    this.eventLog.push(event);
  }

  // Start election for a node
  startElection(nodeId: string): SimulationEvent[] {
    const node = this.nodes.get(nodeId);
    if (!node || node.status !== 'healthy') return [];

    const events: SimulationEvent[] = [];

    // Increment term
    node.term++;
    node.state = 'candidate';
    node.votedFor = node.id;
    node.votesReceived = 1; // Vote for self

    this.addEvent('election_started', `${nodeId} started election for term ${node.term}`, {
      nodeId,
      term: node.term,
    });
    events.push(...this.eventLog.slice(-1));

    // Send RequestVote to all other nodes
    this.nodes.forEach((targetNode) => {
      if (targetNode.id !== nodeId && targetNode.status === 'healthy') {
        const message: RaftMessage = {
          id: `msg-${Date.now()}-${nodeId}-${targetNode.id}`,
          from: nodeId,
          to: targetNode.id,
          type: 'RequestVote',
          status: 'in-flight',
          timestamp: Date.now(),
          payload: {
            term: node.term,
            candidateId: nodeId,
            lastLogIndex: node.log.length - 1,
            lastLogTerm: node.log[node.log.length - 1]?.term || 0,
          },
        };
        this.addMessage(message);

        this.addEvent('request_vote_sent', `${nodeId} → ${targetNode.id}: RequestVote`, {
          from: nodeId,
          to: targetNode.id,
          term: node.term,
        });
        events.push(...this.eventLog.slice(-1));
      }
    });

    return events;
  }

  // Handle RequestVote RPC
  handleRequestVote(messageId: string): SimulationEvent[] {
    const message = this.messages.find((m) => m.id === messageId);
    if (!message || message.type !== 'RequestVote') return [];

    const events: SimulationEvent[] = [];
    const voter = this.nodes.get(message.to);
    const candidate = this.nodes.get(message.from);

    if (!voter || !candidate || voter.status !== 'healthy') {
      message.status = 'failure';
      return events;
    }

    message.status = 'success';

    let voteGranted = false;

    // Grant vote if:
    // 1. Candidate's term is greater than voter's term, OR
    // 2. Candidate's term equals voter's term and voter hasn't voted for anyone else
    if (message.payload.term > voter.term) {
      voter.term = message.payload.term;
      voter.votedFor = null;
      voter.state = 'follower';
    }

    if (
      message.payload.term >= voter.term &&
      (voter.votedFor === null || voter.votedFor === candidate.id)
    ) {
      voteGranted = true;
      voter.votedFor = candidate.id;
    }

    // Send response
    const response: RaftMessage = {
      id: `msg-${Date.now()}-${voter.id}-${candidate.id}`,
      from: voter.id,
      to: candidate.id,
      type: 'RequestVoteResponse',
      status: 'in-flight',
      timestamp: Date.now(),
      payload: {
        term: voter.term,
        voteGranted,
      },
    };
    this.addMessage(response);

    this.addEvent(
      'vote_response',
      `${voter.id} → ${candidate.id}: ${voteGranted ? 'Granted' : 'Denied'}`,
      {
        from: voter.id,
        to: candidate.id,
        voteGranted,
      }
    );
    events.push(...this.eventLog.slice(-1));

    return events;
  }

  // Handle RequestVote Response
  handleRequestVoteResponse(messageId: string): SimulationEvent[] {
    const message = this.messages.find((m) => m.id === messageId);
    if (!message || message.type !== 'RequestVoteResponse') return [];

    const events: SimulationEvent[] = [];
    const candidate = this.nodes.get(message.to);

    if (!candidate || candidate.state !== 'candidate') {
      message.status = 'success';
      return events;
    }

    message.status = 'success';

    if (message.payload.voteGranted) {
      candidate.votesReceived++;

      this.addEvent('vote_received', `${candidate.id} received vote from ${message.from}`, {
        candidateId: candidate.id,
        votesReceived: candidate.votesReceived,
        totalNodes: this.nodes.size,
      });
      events.push(...this.eventLog.slice(-1));

      // Check if won election (majority)
      const majority = Math.floor(this.nodes.size / 2) + 1;
      if (candidate.votesReceived >= majority) {
        this.becomeLeader(candidate.id);

        this.addEvent('leader_elected', `${candidate.id} became leader for term ${candidate.term}`, {
          leaderId: candidate.id,
          term: candidate.term,
          votes: candidate.votesReceived,
        });
        events.push(...this.eventLog.slice(-1));
      }
    }

    return events;
  }

  // Become leader
  private becomeLeader(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    node.state = 'leader';
    node.votesReceived = 0;

    // All other nodes become followers
    this.nodes.forEach((n) => {
      if (n.id !== nodeId && n.status === 'healthy') {
        n.state = 'follower';
        n.votedFor = null;
        n.votesReceived = 0;
      }
    });
  }

  // Send heartbeat (AppendEntries with no entries)
  sendHeartbeat(leaderId: string): SimulationEvent[] {
    const leader = this.nodes.get(leaderId);
    if (!leader || leader.state !== 'leader') return [];

    const events: SimulationEvent[] = [];

    this.nodes.forEach((follower) => {
      if (follower.id !== leaderId && follower.status === 'healthy') {
        const message: RaftMessage = {
          id: `msg-${Date.now()}-${leaderId}-${follower.id}`,
          from: leaderId,
          to: follower.id,
          type: 'AppendEntries',
          status: 'in-flight',
          timestamp: Date.now(),
          payload: {
            term: leader.term,
            leaderId,
            entries: [],
            leaderCommit: leader.commitIndex,
          },
        };
        this.addMessage(message);
      }
    });

    this.addEvent('heartbeat_sent', `${leaderId} sent heartbeat`, {
      leaderId,
      term: leader.term,
    });
    events.push(...this.eventLog.slice(-1));

    return events;
  }

  // Handle AppendEntries (heartbeat or log replication)
  handleAppendEntries(messageId: string): SimulationEvent[] {
    const message = this.messages.find((m) => m.id === messageId);
    if (!message || message.type !== 'AppendEntries') return [];

    const events: SimulationEvent[] = [];
    const follower = this.nodes.get(message.to);

    if (!follower || follower.status !== 'healthy') {
      message.status = 'failure';
      return events;
    }

    message.status = 'success';

    // Update term if necessary
    if (message.payload.term > follower.term) {
      follower.term = message.payload.term;
      follower.state = 'follower';
      follower.votedFor = null;
    }

    // If this is a heartbeat (no entries), just acknowledge
    const success = message.payload.term >= follower.term;

    const response: RaftMessage = {
      id: `msg-${Date.now()}-${follower.id}-${message.from}`,
      from: follower.id,
      to: message.from,
      type: 'AppendEntriesResponse',
      status: 'in-flight',
      timestamp: Date.now(),
      payload: {
        term: follower.term,
        success,
      },
    };
    this.addMessage(response);

    return events;
  }

  // Add client request (log entry)
  addClientRequest(leaderId: string, command: string): SimulationEvent[] {
    const leader = this.nodes.get(leaderId);
    if (!leader || leader.state !== 'leader') return [];

    const events: SimulationEvent[] = [];

    const entry: LogEntry = {
      term: leader.term,
      index: leader.log.length,
      command,
    };

    leader.log.push(entry);

    this.addEvent('client_request', `Client request added to ${leaderId}: ${command}`, {
      leaderId,
      command,
      index: entry.index,
    });
    events.push(...this.eventLog.slice(-1));

    // Replicate to followers
    this.replicateLog(leaderId);

    return events;
  }

  // Replicate log to followers
  private replicateLog(leaderId: string): void {
    const leader = this.nodes.get(leaderId);
    if (!leader) return;

    this.nodes.forEach((follower) => {
      if (follower.id !== leaderId && follower.status === 'healthy') {
        const message: RaftMessage = {
          id: `msg-${Date.now()}-${leaderId}-${follower.id}`,
          from: leaderId,
          to: follower.id,
          type: 'AppendEntries',
          status: 'in-flight',
          timestamp: Date.now(),
          payload: {
            term: leader.term,
            leaderId,
            entries: leader.log.slice(-1), // Send last entry
            leaderCommit: leader.commitIndex,
          },
        };
        this.addMessage(message);
      }
    });
  }

  // Fail a node
  failNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.status = 'failed';
      node.state = 'follower';

      this.addEvent('node_failed', `${nodeId} failed`, { nodeId });
    }
  }

  // Recover a node
  recoverNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.status = 'healthy';

      this.addEvent('node_recovered', `${nodeId} recovered`, { nodeId });
    }
  }

  // Reset the algorithm
  reset(): void {
    this.nodes.forEach((node) => {
      node.state = 'follower';
      node.term = 0;
      node.log = [];
      node.commitIndex = 0;
      node.votedFor = null;
      node.votesReceived = 0;
      node.status = 'healthy';
    });
    this.messages = [];
    this.eventLog = [];
    this.currentTerm = 0;
  }
}
