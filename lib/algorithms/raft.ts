import { RaftNode, RaftMessage, LogEntry, SimulationEvent } from '../types';
import { Snapshotable, cloneSnapshot } from '../snapshot';

export interface RaftSnapshot {
  nodes: Map<string, RaftNode>;
  messages: RaftMessage[];
  eventLog: SimulationEvent[];
  currentTerm: number;
  electionTimeout: number;
  heartbeatInterval: number;
  partitions: string[][];
  messageIdCounter: number;
}

export class RaftAlgorithm implements Snapshotable<RaftSnapshot> {
  private nodes: Map<string, RaftNode>;
  private messages: RaftMessage[];
  private eventLog: SimulationEvent[];
  private currentTerm: number;
  private electionTimeout: number;
  private heartbeatInterval: number;
  private partitions: string[][];
  private messageIdCounter: number = 0;

  constructor(nodeCount: number = 5) {
    this.nodes = new Map();
    this.messages = [];
    this.eventLog = [];
    this.currentTerm = 0;
    this.electionTimeout = 150; // milliseconds
    this.heartbeatInterval = 50; // milliseconds
    this.partitions = [];

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

  private generateMessageId(from: string, to: string): string {
    this.messageIdCounter++;
    return `raft-msg-${this.messageIdCounter}-${from}-${to}`;
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

  // Check if two nodes can communicate under current network partitions
  canCommunicate(fromId: string, toId: string): boolean {
    if (this.partitions.length === 0) return true;
    return this.partitions.some((group) => group.includes(fromId) && group.includes(toId));
  }

  // Get active network partitions
  getPartitions(): string[][] {
    return this.partitions.map((group) => [...group]);
  }

  // Partition the network into isolated node groups
  partitionNetwork(groups: string[][]): SimulationEvent[] {
    this.partitions = groups.map((group) => [...group]);

    // Mark any in-flight messages crossing partition boundaries as failed
    this.messages.forEach((msg) => {
      if (msg.status === 'in-flight' && !this.canCommunicate(msg.from, msg.to)) {
        msg.status = 'failure';
      }
    });

    this.addEvent(
      'network_partition',
      `Network partitioned into ${groups.map((g) => `[${g.join(', ')}]`).join(' | ')}`,
      { partition: groups }
    );
    return this.eventLog.slice(-1);
  }

  // Heal network partitions and reconcile split-brain leaders by term
  healPartition(): SimulationEvent[] {
    const events: SimulationEvent[] = [];
    this.partitions = [];

    const healthyNodes = Array.from(this.nodes.values()).filter((n) => n.status === 'healthy');
    const maxTerm = healthyNodes.reduce((max, n) => Math.max(max, n.term), this.currentTerm);
    this.currentTerm = maxTerm;

    const leaders = healthyNodes.filter((n) => n.state === 'leader');
    let authoritativeLeader: RaftNode | null = null;

    if (leaders.length > 0) {
      leaders.sort((a, b) => b.term - a.term);
      authoritativeLeader = leaders[0];

      // Step down any stale lower-term leaders
      for (let i = 1; i < leaders.length; i++) {
        leaders[i].state = 'follower';
        leaders[i].term = authoritativeLeader.term;
        leaders[i].votedFor = null;
        leaders[i].votesReceived = 0;
      }
    }

    // Sync follower terms up to current max term
    healthyNodes.forEach((node) => {
      if (authoritativeLeader && node.id !== authoritativeLeader.id) {
        if (node.term < authoritativeLeader.term) {
          node.term = authoritativeLeader.term;
          node.state = 'follower';
          node.votedFor = null;
          node.votesReceived = 0;
        }
      }
    });

    this.addEvent('heal_partition', 'Network partition healed; cluster reconciled', {
      leaderId: authoritativeLeader?.id ?? null,
      term: this.currentTerm,
    });
    events.push(...this.eventLog.slice(-1));

    if (authoritativeLeader) {
      events.push(...this.sendHeartbeat(authoritativeLeader.id));
    }

    return events;
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
    this.currentTerm = Math.max(this.currentTerm, node.term);
    node.state = 'candidate';
    node.votedFor = node.id;
    node.votesReceived = 1; // Vote for self

    this.addEvent('election_started', `${nodeId} started election for term ${node.term}`, {
      nodeId,
      term: node.term,
    });
    events.push(...this.eventLog.slice(-1));

    // Send RequestVote to all other healthy, reachable nodes
    this.nodes.forEach((targetNode) => {
      if (
        targetNode.id !== nodeId &&
        targetNode.status === 'healthy' &&
        this.canCommunicate(nodeId, targetNode.id)
      ) {
        const message: RaftMessage = {
          id: this.generateMessageId(nodeId, targetNode.id),
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

  // Process all in-flight RequestVote messages
  processRequestVotes(): SimulationEvent[] {
    const events: SimulationEvent[] = [];
    const pendingVotes = this.messages.filter(
      (m) => m.type === 'RequestVote' && m.status === 'in-flight'
    );
    pendingVotes.forEach((msg) => {
      events.push(...this.handleRequestVote(msg.id));
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

    if (
      !voter ||
      !candidate ||
      voter.status !== 'healthy' ||
      !this.canCommunicate(message.from, message.to)
    ) {
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
      this.currentTerm = Math.max(this.currentTerm, voter.term);
      voter.votedFor = null;
      voter.state = 'follower';
      voter.votesReceived = 0;
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
      id: this.generateMessageId(voter.id, candidate.id),
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

  // Process all in-flight RequestVoteResponse messages
  processVoteResponses(): SimulationEvent[] {
    const events: SimulationEvent[] = [];
    const pendingResponses = this.messages.filter(
      (m) => m.type === 'RequestVoteResponse' && m.status === 'in-flight'
    );
    pendingResponses.forEach((msg) => {
      events.push(...this.handleRequestVoteResponse(msg.id));
    });
    return events;
  }

  // Handle RequestVote Response
  handleRequestVoteResponse(messageId: string): SimulationEvent[] {
    const message = this.messages.find((m) => m.id === messageId);
    if (!message || message.type !== 'RequestVoteResponse') return [];

    const events: SimulationEvent[] = [];
    const candidate = this.nodes.get(message.to);

    if (
      !candidate ||
      candidate.status !== 'healthy' ||
      !this.canCommunicate(message.from, message.to)
    ) {
      message.status = 'failure';
      return events;
    }

    if (candidate.state !== 'candidate') {
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

  // Finalize any pending election and send initial heartbeat from leader
  finalizeElection(): SimulationEvent[] {
    const events: SimulationEvent[] = [];
    events.push(...this.processRequestVotes());
    events.push(...this.processVoteResponses());

    const leaders = Array.from(this.nodes.values())
      .filter((n) => n.state === 'leader' && n.status === 'healthy')
      .sort((a, b) => b.term - a.term);

    if (leaders.length > 0) {
      events.push(...this.sendHeartbeat(leaders[0].id));
    }

    return events;
  }

  // Become leader
  private becomeLeader(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    node.state = 'leader';
    node.votesReceived = 0;

    // All other reachable healthy nodes become followers
    this.nodes.forEach((n) => {
      if (n.id !== nodeId && n.status === 'healthy' && this.canCommunicate(nodeId, n.id)) {
        n.state = 'follower';
        n.term = Math.max(n.term, node.term);
        n.votedFor = null;
        n.votesReceived = 0;
      }
    });
  }

  // Send heartbeat (AppendEntries with no entries)
  sendHeartbeat(leaderId: string): SimulationEvent[] {
    const leader = this.nodes.get(leaderId);
    if (!leader || leader.state !== 'leader' || leader.status !== 'healthy') return [];

    const events: SimulationEvent[] = [];

    this.nodes.forEach((follower) => {
      if (
        follower.id !== leaderId &&
        follower.status === 'healthy' &&
        this.canCommunicate(leaderId, follower.id)
      ) {
        const message: RaftMessage = {
          id: this.generateMessageId(leaderId, follower.id),
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

    if (
      !follower ||
      follower.status !== 'healthy' ||
      !this.canCommunicate(message.from, message.to)
    ) {
      message.status = 'failure';
      return events;
    }

    message.status = 'success';

    // Update term if necessary
    if (message.payload.term > follower.term) {
      follower.term = message.payload.term;
      this.currentTerm = Math.max(this.currentTerm, follower.term);
      follower.state = 'follower';
      follower.votedFor = null;
      follower.votesReceived = 0;
    }

    const success = message.payload.term >= follower.term;

    if (success) {
      const entries: LogEntry[] = Array.isArray(message.payload.entries)
        ? message.payload.entries
        : [];
      entries.forEach((entry) => {
        if (entry.index < follower.log.length) {
          follower.log[entry.index] = { ...entry };
        } else if (entry.index === follower.log.length) {
          follower.log.push({ ...entry });
        } else {
          follower.log.push({ ...entry });
        }
      });

      if (typeof message.payload.leaderCommit === 'number') {
        follower.commitIndex = Math.min(message.payload.leaderCommit, follower.log.length);
      }
    }

    const response: RaftMessage = {
      id: this.generateMessageId(follower.id, message.from),
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
    let leader = this.nodes.get(leaderId);
    if (!leader || leader.state !== 'leader' || leader.status !== 'healthy') {
      leader = Array.from(this.nodes.values()).find(
        (n) => n.state === 'leader' && n.status === 'healthy'
      );
    }
    if (!leader || leader.state !== 'leader') return [];

    const events: SimulationEvent[] = [];

    const entry: LogEntry = {
      term: leader.term,
      index: leader.log.length,
      command,
    };

    leader.log.push(entry);

    this.addEvent('client_request', `Client request added to ${leader.id}: ${command}`, {
      leaderId: leader.id,
      command,
      index: entry.index,
    });
    events.push(...this.eventLog.slice(-1));

    // Replicate to followers
    this.replicateLog(leader.id);

    return events;
  }

  // Replicate log to followers
  private replicateLog(leaderId: string): void {
    const leader = this.nodes.get(leaderId);
    if (!leader || leader.status !== 'healthy') return;

    this.nodes.forEach((follower) => {
      if (
        follower.id !== leaderId &&
        follower.status === 'healthy' &&
        this.canCommunicate(leaderId, follower.id)
      ) {
        const missingEntries = leader.log.slice(follower.log.length);
        const entriesToSend = missingEntries.length > 0 ? missingEntries : leader.log.slice(-1);
        const message: RaftMessage = {
          id: this.generateMessageId(leaderId, follower.id),
          from: leaderId,
          to: follower.id,
          type: 'AppendEntries',
          status: 'in-flight',
          timestamp: Date.now(),
          payload: {
            term: leader.term,
            leaderId,
            entries: entriesToSend.map((entry) => ({ ...entry })),
            leaderCommit: leader.commitIndex,
          },
        };
        this.addMessage(message);
      }
    });
  }

  // Deliver pending AppendEntries messages and advance commitIndex on majority
  replicatePendingLogs(): SimulationEvent[] {
    const events: SimulationEvent[] = [];
    let pending = this.messages.filter(
      (m) => m.type === 'AppendEntries' && m.status === 'in-flight'
    );

    const leader = Array.from(this.nodes.values())
      .filter((n) => n.state === 'leader' && n.status === 'healthy')
      .sort((a, b) => b.term - a.term)[0];

    if (pending.length === 0 && leader) {
      this.replicateLog(leader.id);
      pending = this.messages.filter(
        (m) => m.type === 'AppendEntries' && m.status === 'in-flight'
      );
    }

    pending.forEach((msg) => {
      events.push(...this.handleAppendEntries(msg.id));
    });

    if (leader && leader.log.length > 0) {
      const majority = Math.floor(this.nodes.size / 2) + 1;
      const replicatedCount = Array.from(this.nodes.values()).filter(
        (n) => n.log.length >= leader.log.length
      ).length;

      if (replicatedCount >= majority) {
        leader.commitIndex = leader.log.length;
        this.nodes.forEach((node) => {
          if (
            node.id !== leader.id &&
            node.status === 'healthy' &&
            this.canCommunicate(leader.id, node.id)
          ) {
            node.commitIndex = Math.min(leader.commitIndex, node.log.length);
          }
        });
      }

      this.addEvent(
        'replicate_log',
        `${leader.id} replicated ${leader.log.length} log entries to followers`,
        {
          leaderId: leader.id,
          logLength: leader.log.length,
          commitIndex: leader.commitIndex,
        }
      );
      events.push(...this.eventLog.slice(-1));
    }

    return events;
  }

  // Catch up a recovered follower with all missing log entries from the leader
  catchUpNode(nodeId: string): SimulationEvent[] {
    const follower = this.nodes.get(nodeId);
    const leader = Array.from(this.nodes.values())
      .filter((n) => n.state === 'leader' && n.status === 'healthy')
      .sort((a, b) => b.term - a.term)[0];

    if (!follower || follower.status !== 'healthy' || !leader) return [];
    if (!this.canCommunicate(leader.id, follower.id)) return [];

    const missingEntries = leader.log.slice(follower.log.length).map((e) => ({ ...e }));

    const message: RaftMessage = {
      id: this.generateMessageId(leader.id, follower.id),
      from: leader.id,
      to: follower.id,
      type: 'AppendEntries',
      status: 'in-flight',
      timestamp: Date.now(),
      payload: {
        term: leader.term,
        leaderId: leader.id,
        entries: missingEntries,
        leaderCommit: leader.commitIndex,
      },
    };
    this.addMessage(message);

    const events = this.handleAppendEntries(message.id);
    follower.term = leader.term;
    follower.commitIndex = Math.min(leader.commitIndex, follower.log.length);

    this.addEvent(
      'catch_up',
      `${follower.id} caught up with ${leader.id} (${follower.log.length} entries)`,
      {
        nodeId: follower.id,
        leaderId: leader.id,
        entriesSynced: missingEntries.length,
      }
    );
    events.push(...this.eventLog.slice(-1));

    return events;
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
    this.partitions = [];
    this.messageIdCounter = 0;
  }

  serialize(): RaftSnapshot {
    return cloneSnapshot({
      nodes: this.nodes,
      messages: this.messages,
      eventLog: this.eventLog,
      currentTerm: this.currentTerm,
      electionTimeout: this.electionTimeout,
      heartbeatInterval: this.heartbeatInterval,
      partitions: this.partitions,
      messageIdCounter: this.messageIdCounter,
    });
  }

  restore(snapshot: RaftSnapshot): void {
    const cloned = cloneSnapshot(snapshot);
    this.nodes = cloned.nodes;
    this.messages = cloned.messages;
    this.eventLog = cloned.eventLog;
    this.currentTerm = cloned.currentTerm;
    this.electionTimeout = cloned.electionTimeout;
    this.heartbeatInterval = cloned.heartbeatInterval;
    this.partitions = cloned.partitions;
    this.messageIdCounter = cloned.messageIdCounter;
  }
}
