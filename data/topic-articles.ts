export type TopicSection = {
  heading: string;
  body: string[];
};

export type TopicArticle = {
  title: string;
  sections: TopicSection[];
};

export const topicArticles: Record<string, TopicArticle> = {
  raft: {
    title: 'Raft Consensus: A Practical Guide',
    sections: [
      {
        heading: 'What problem Raft solves',
        body: [
          'Raft is a consensus algorithm that lets a cluster of machines agree on the same sequence of commands.',
          'It is designed for building replicated state machines where each node applies the same log entries in the same order.',
          'The goal is to stay consistent even when nodes crash, networks split, or messages arrive late.',
        ],
      },
      {
        heading: 'Core idea',
        body: [
          'Raft keeps one leader at a time. Clients send requests to the leader, the leader appends them to its log, and followers replicate that log.',
          'An entry is considered committed when the leader knows that a majority of nodes stored it.',
          'Once committed, every node applies the entry to its local state machine in order.',
        ],
      },
      {
        heading: 'Roles and terms',
        body: [
          'Nodes are followers, candidates, or leaders. Followers respond to requests; candidates run elections; leaders replicate logs.',
          'Time is divided into terms. Each term has at most one leader. Terms increase whenever an election starts.',
          'If a node sees a higher term, it steps down to follower and updates its term.',
        ],
      },
      {
        heading: 'Leader election',
        body: [
          'Followers start an election if they do not hear from a leader for a timeout.',
          'A candidate requests votes from all nodes. Each node votes at most once per term.',
          'A candidate wins if it gets a majority of votes. It then becomes leader and starts sending heartbeats.',
        ],
      },
      {
        heading: 'Log replication',
        body: [
          'The leader appends client commands to its log and sends AppendEntries to followers.',
          'Followers accept entries only if their log matches the leader at the previous index, which prevents divergent histories.',
          'If logs diverge, the leader backs up until it finds the last matching index and overwrites conflicting entries.',
        ],
      },
      {
        heading: 'Commit rule',
        body: [
          'The leader marks an entry committed once it is stored on a majority of nodes.',
          'Followers apply entries in order up to the leader commit index.',
          'This majority rule ensures that committed entries survive any single node failure.',
        ],
      },
      {
        heading: 'Safety and fault tolerance',
        body: [
          'Raft guarantees that once an entry is committed, it will never be lost or overwritten.',
          'Safety relies on majority quorums and the rule that candidates must have the most up to date log to win.',
          'The system remains available as long as a majority of nodes can communicate.',
        ],
      },
      {
        heading: 'Common failure cases',
        body: [
          'If the leader crashes, followers start a new election and a new leader is elected.',
          'If a network partition splits the cluster, only the partition with a majority can elect a leader and make progress.',
          'When the partition heals, the leader in the majority overwrites conflicting entries on the minority side.',
        ],
      },
      {
        heading: 'How to read the visualization',
        body: [
          'Watch leader changes and log indices to see who is in charge.',
          'Follow AppendEntries messages to see replication and how conflicts get repaired.',
          'Use scenarios to reproduce elections, failures, and partition recovery.',
        ],
      },
    ],
  },
  paxos: {
    title: 'Paxos: A Practical Guide',
    sections: [
      {
        heading: 'What problem Paxos solves',
        body: [
          'Paxos is a consensus protocol that lets a group of nodes agree on a single value, even if some nodes fail or messages are delayed.',
          'It is often used to build replicated state machines by repeatedly agreeing on log entries.',
          'The protocol focuses on safety first: once a value is chosen, it never changes.',
        ],
      },
      {
        heading: 'Roles and phases',
        body: [
          'Paxos has three logical roles: proposers suggest values, acceptors vote on them, and learners observe the final decision.',
          'Consensus happens in two phases: prepare (to establish a proposal number) and accept (to lock in a value).',
          'In practice, a single node can play multiple roles at once.',
        ],
      },
      {
        heading: 'Prepare phase',
        body: [
          'A proposer picks a unique, increasing proposal number and sends a Prepare request to acceptors.',
          'Acceptors reply with a Promise: they will not accept lower-numbered proposals and they may include the highest previously accepted value.',
          'If a proposer gets promises from a majority, it can move to the accept phase.',
        ],
      },
      {
        heading: 'Accept phase',
        body: [
          'The proposer sends Accept requests with its proposal number and a value.',
          'If any acceptor already accepted a value, the proposer must use the highest-numbered accepted value it learned in the prepare phase.',
          'A value is chosen once a majority of acceptors accept the same proposal.',
        ],
      },
      {
        heading: 'Safety guarantees',
        body: [
          'The prepare rule ensures that once a value could be chosen, future proposers must carry it forward.',
          'Majority quorums intersect, so at least one acceptor in a new quorum knows about previously accepted values.',
          'This is why Paxos never picks two different values for the same decision.',
        ],
      },
      {
        heading: 'Multi-Paxos optimization',
        body: [
          'If one leader stays stable, it can skip repeated prepare phases and directly issue accept requests for new entries.',
          'This makes Paxos efficient for log replication while preserving the same safety properties.',
        ],
      },
      {
        heading: 'Failure and contention',
        body: [
          'Competing proposers can cause conflicts where one proposal supersedes another.',
          'The protocol still makes progress once a proposer can collect a majority without interruption.',
          'If the leader fails, another proposer can take over with a higher proposal number.',
        ],
      },
      {
        heading: 'How to read the visualization',
        body: [
          'Watch proposal numbers to see which proposer is currently winning.',
          'Track acceptor responses to see how chosen values propagate.',
          'Scenarios highlight dueling proposers, acceptor failures, and the Multi-Paxos fast path.',
        ],
      },
    ],
  },
  'two-phase-commit': {
    title: 'Two-Phase Commit (2PC): A Practical Guide',
    sections: [
      {
        heading: 'What problem 2PC solves',
        body: [
          'Two-Phase Commit coordinates a distributed transaction so all participants either commit or abort together.',
          'It is used when multiple services or databases must agree on a single outcome.',
          'The key promise is atomicity across nodes: no partial commit is allowed.',
        ],
      },
      {
        heading: 'Roles: coordinator and participants',
        body: [
          'A coordinator drives the protocol and collects votes from participants.',
          'Participants hold the data and decide whether they can commit.',
          'Each participant must be able to say “yes” only if it can durably commit.',
        ],
      },
      {
        heading: 'Phase 1: Prepare',
        body: [
          'The coordinator sends a PREPARE request to all participants.',
          'Each participant checks constraints, writes a prepare record to stable storage, and replies with YES or NO.',
          'A YES vote means “I can commit if you tell me to.”',
        ],
      },
      {
        heading: 'Phase 2: Commit or Abort',
        body: [
          'If all participants vote YES, the coordinator sends COMMIT.',
          'If any participant votes NO or times out, the coordinator sends ABORT.',
          'Participants persist the final decision and release locks.',
        ],
      },
      {
        heading: 'Failure handling',
        body: [
          'If the coordinator fails after participants voted YES, participants may block while waiting.',
          'This blocking behavior is the main downside of 2PC.',
          'Systems often add timeouts, retries, or a backup coordinator to mitigate this risk.',
        ],
      },
      {
        heading: 'Why 2PC is still used',
        body: [
          'It is conceptually simple and works well inside a single data center.',
          'It provides strong atomicity guarantees when the coordinator is reliable.',
          'Many databases and transaction managers implement 2PC as a building block.',
        ],
      },
      {
        heading: 'How to read the visualization',
        body: [
          'Watch the prepare votes to see whether the system can commit.',
          'See how failures or timeouts force an abort.',
          'Use scenarios to observe coordinator failure and recovery behaviors.',
        ],
      },
    ],
  },
  'eventual-consistency': {
    title: 'Eventual Consistency: A Practical Guide',
    sections: [
      {
        heading: 'What eventual consistency means',
        body: [
          'Eventual consistency allows replicas to accept updates independently and converge later.',
          'It trades immediate consistency for availability and low latency.',
          'If no new updates occur, all replicas eventually reach the same state.',
        ],
      },
      {
        heading: 'Replication factor and quorums',
        body: [
          'Systems often replicate data to N nodes and use read/write quorums (R and W).',
          'If W + R > N, reads are guaranteed to see the latest write.',
          'Choosing smaller R or W improves latency but increases the chance of stale reads.',
        ],
      },
      {
        heading: 'Consistency levels',
        body: [
          'ONE returns after one replica responds, which is fast but can be stale.',
          'QUORUM waits for a majority of replicas, balancing latency and freshness.',
          'ALL waits for all replicas, giving stronger consistency but higher latency.',
        ],
      },
      {
        heading: 'Conflict detection',
        body: [
          'Concurrent writes can cause divergent versions of the same key.',
          'Vector clocks or version vectors track causality between updates.',
          'Conflicts appear when two updates are concurrent rather than ordered.',
        ],
      },
      {
        heading: 'Conflict resolution',
        body: [
          'Some systems use last-write-wins based on timestamps.',
          'Others keep multiple versions and let the application resolve conflicts.',
          'CRDTs are another approach that merge without conflicts.',
        ],
      },
      {
        heading: 'Anti-entropy repair',
        body: [
          'Replicas periodically exchange state to reconcile differences.',
          'Gossip and Merkle trees reduce the amount of data exchanged.',
          'Read repair updates stale replicas during reads.',
        ],
      },
      {
        heading: 'Failure and partitions',
        body: [
          'During partitions, each side may accept writes independently.',
          'After healing, conflicts are resolved and replicas converge again.',
          'This is why eventual consistency is often paired with availability goals.',
        ],
      },
      {
        heading: 'How to read the visualization',
        body: [
          'Use consistency level buttons to see how reads and writes behave.',
          'Trigger failures and anti-entropy to observe divergence and convergence.',
          'Watch inconsistent key counts to understand convergence speed.',
        ],
      },
    ],
  },
  'vector-clocks': {
    title: 'Vector Clocks: A Practical Guide',
    sections: [
      {
        heading: 'What vector clocks solve',
        body: [
          'Vector clocks track causality between events in distributed systems.',
          'They help determine whether one event happened before another or whether two events are concurrent.',
          'This is essential for conflict detection and ordering decisions.',
        ],
      },
      {
        heading: 'How they work',
        body: [
          'Each node keeps a vector of counters, one per node.',
          'On each local event, the node increments its own counter.',
          'When sending a message, the node includes its current vector.',
        ],
      },
      {
        heading: 'Message receive rule',
        body: [
          'On receive, a node merges the incoming vector with its own by taking the max per index.',
          'Then it increments its own counter to represent the receive event.',
          'This ensures the receiver’s clock reflects causal dependencies.',
        ],
      },
      {
        heading: 'Comparing two events',
        body: [
          'Clock A is “before” B if every component of A is less than or equal to B and at least one is strictly less.',
          'If A is not before B and B is not before A, the events are concurrent.',
          'Concurrency means there is no causal relationship between them.',
        ],
      },
      {
        heading: 'Why this matters',
        body: [
          'Vector clocks are used in multi-version systems to detect conflicts.',
          'They are the basis for causal consistency and conflict resolution strategies.',
          'They allow systems to avoid unnecessary overwrites of concurrent updates.',
        ],
      },
      {
        heading: 'Practical limitations',
        body: [
          'Vector size grows with the number of nodes, which can be expensive at scale.',
          'Systems often compress or approximate vectors to reduce overhead.',
        ],
      },
      {
        heading: 'How to read the visualization',
        body: [
          'Click events to compare their vectors and see the causal relationship.',
          'Send messages to observe how vectors merge across processes.',
          'Look for concurrent pairs to understand conflicts.',
        ],
      },
    ],
  },
  'consistent-hashing': {
    title: 'Consistent Hashing: A Practical Guide',
    sections: [
      {
        heading: 'What consistent hashing solves',
        body: [
          'Consistent hashing distributes keys across nodes while minimizing key movement when nodes join or leave.',
          'It avoids reshuffling all keys during scaling, which is critical for large systems.',
          'Only a small fraction of keys move when the ring membership changes.',
        ],
      },
      {
        heading: 'The hash ring',
        body: [
          'Both nodes and keys are mapped onto a circular hash space.',
          'A key is assigned to the first node encountered while moving clockwise on the ring.',
          'This mapping stays stable even if unrelated nodes are added or removed.',
        ],
      },
      {
        heading: 'Virtual nodes',
        body: [
          'Each physical node is represented by multiple virtual nodes on the ring.',
          'Virtual nodes smooth out uneven distribution caused by hash randomness.',
          'They make load balancing more even across the cluster.',
        ],
      },
      {
        heading: 'Adding or removing nodes',
        body: [
          'When a node is added, it only takes over the keys in the segments it now owns.',
          'When a node is removed, its keys move to the next node on the ring.',
          'This keeps movement proportional to the node’s share of the ring.',
        ],
      },
      {
        heading: 'Replication on the ring',
        body: [
          'Many systems replicate by choosing the next R nodes clockwise as replicas.',
          'This keeps replicas close on the ring and simplifies routing.',
          'Replica placement still benefits from minimal movement when membership changes.',
        ],
      },
      {
        heading: 'Trade-offs and pitfalls',
        body: [
          'Without enough virtual nodes, hot spots can appear if keys cluster.',
          'Ring size and hash function choice affect distribution quality.',
          'You still need monitoring to detect skew and rebalance if needed.',
        ],
      },
      {
        heading: 'How to read the visualization',
        body: [
          'Watch how keys move when nodes are added or removed.',
          'Compare distributions with and without virtual nodes.',
          'Look for load balance across the ring segments.',
        ],
      },
    ],
  },
  'cap-theorem': {
    title: 'CAP Theorem: A Practical Guide',
    sections: [
      {
        heading: 'What CAP says',
        body: [
          'CAP states that in the presence of a network partition, a system must choose between consistency and availability.',
          'Partition tolerance is non-negotiable in distributed systems because partitions can and do happen.',
          'So the real trade-off is between consistency (C) and availability (A) during a partition.',
        ],
      },
      {
        heading: 'Consistency vs availability',
        body: [
          'Consistency means all clients see the same data at the same time.',
          'Availability means every request receives a response, even if it is stale.',
          'During a partition, you cannot guarantee both simultaneously.',
        ],
      },
      {
        heading: 'CA, CP, and AP',
        body: [
          'CA systems choose consistency and availability but assume no partitions (typically single-node or tightly coupled systems).',
          'CP systems prefer consistency; they may reject requests on the minority side to avoid divergence.',
          'AP systems prefer availability; they accept requests on both sides and reconcile later.',
        ],
      },
      {
        heading: 'What CAP does not say',
        body: [
          'CAP is about trade-offs under partitions, not about normal operation.',
          'Systems can be highly consistent and highly available most of the time.',
          'Real systems often allow tuning between C and A depending on workload.',
        ],
      },
      {
        heading: 'Typical examples',
        body: [
          'CP: systems like ZooKeeper or etcd, which may sacrifice availability to preserve strong consistency.',
          'AP: systems like Cassandra, which stay available and reconcile later.',
          'CA: single-node databases or tightly coupled clusters with no partition tolerance.',
        ],
      },
      {
        heading: 'Operational consequences',
        body: [
          'Choosing CP can lead to higher latency or rejected writes during partitions.',
          'Choosing AP can lead to stale reads or conflicts that must be resolved later.',
          'The best choice depends on product requirements and failure tolerance.',
        ],
      },
      {
        heading: 'How to read the visualization',
        body: [
          'Use the triangle to explore trade-offs and see where real systems fall.',
          'Compare how systems prioritize different CAP properties.',
        ],
      },
    ],
  },
  'gossip-anti-entropy': {
    title: 'Gossip and Anti-Entropy: A Practical Guide',
    sections: [
      {
        heading: 'What gossip protocols do',
        body: [
          'Gossip protocols spread information by having nodes periodically exchange state with random peers.',
          'They are decentralized, scalable, and resilient to failures.',
          'Over time, updates propagate to the whole cluster without a central coordinator.',
        ],
      },
      {
        heading: 'Push, pull, and push-pull',
        body: [
          'Push gossip sends local updates to a peer.',
          'Pull gossip asks a peer for missing updates.',
          'Push-pull combines both, typically converging faster than either alone.',
        ],
      },
      {
        heading: 'Anti-entropy rounds',
        body: [
          'Anti-entropy is a periodic reconciliation step that compares states and repairs differences.',
          'It can use full state exchange or efficient summaries like digests or Merkle trees.',
          'Repeated rounds guarantee eventual convergence.',
        ],
      },
      {
        heading: 'Convergence and fanout',
        body: [
          'Fanout is the number of peers each node contacts per round.',
          'Higher fanout accelerates convergence but increases network cost.',
          'Systems tune fanout based on cluster size and acceptable overhead.',
        ],
      },
      {
        heading: 'Failure tolerance',
        body: [
          'Gossip works well under node failures because updates continue spreading through other peers.',
          'Recovered nodes can rejoin and catch up via anti-entropy.',
        ],
      },
      {
        heading: 'Where it is used',
        body: [
          'Membership and failure detection systems often rely on gossip (e.g., SWIM).',
          'Eventually consistent databases use gossip to synchronize replicas.',
        ],
      },
      {
        heading: 'How to read the visualization',
        body: [
          'Run push, pull, and push-pull rounds and watch messages spread.',
          'Observe how many rounds are needed to converge under different fanout settings.',
          'Introduce failures and see recovery through anti-entropy.',
        ],
      },
    ],
  },
  'chandy-lamport': {
    title: 'Chandy-Lamport Snapshot: A Practical Guide',
    sections: [
      {
        heading: 'What snapshots solve',
        body: [
          'A distributed snapshot captures a consistent global state without stopping the system.',
          'It is used for debugging, checkpointing, and recovery.',
          'The snapshot must include both local state and in-flight messages.',
        ],
      },
      {
        heading: 'Marker messages',
        body: [
          'The protocol starts when a node records its local state and sends a marker on all outgoing channels.',
          'Markers indicate the boundary between “before snapshot” and “after snapshot” messages.',
          'Each node records its local state the first time it sees a marker.',
        ],
      },
      {
        heading: 'Recording in-flight messages',
        body: [
          'For each incoming channel, a node records messages until it receives a marker on that channel.',
          'Those recorded messages are the in-flight messages that belong to the snapshot.',
          'Once a marker arrives on a channel, recording for that channel stops.',
        ],
      },
      {
        heading: 'Why it is consistent',
        body: [
          'Markers ensure that the snapshot separates messages sent before the snapshot from those sent after it.',
          'This prevents “half-applied” state that would violate consistency.',
          'The resulting global state could have occurred at a single instant in time.',
        ],
      },
      {
        heading: 'Fault tolerance',
        body: [
          'The algorithm does not require synchronized clocks or stopping computation.',
          'It works as long as channels are reliable and deliver messages in order.',
          'Failures can still be handled by taking a new snapshot after recovery.',
        ],
      },
      {
        heading: 'How to read the visualization',
        body: [
          'Watch markers flow from the initiator to other nodes.',
          'See which messages are captured as in-flight.',
          'Track snapshot completion as all channels close.',
        ],
      },
    ],
  },
  'lamport-clocks': {
    title: 'Lamport Clocks: A Practical Guide',
    sections: [
      {
        heading: 'What Lamport clocks solve',
        body: [
          'Lamport clocks provide a logical ordering of events without relying on physical time.',
          'They help establish a consistent ordering for distributed events and messages.',
          'This is useful when you need a total order for broadcasts or logs.',
        ],
      },
      {
        heading: 'Clock rules',
        body: [
          'Each node keeps a single counter.',
          'On every local event, the counter increments by one.',
          'On receiving a message, the node sets its counter to max(local, incoming) + 1.',
        ],
      },
      {
        heading: 'Total ordering',
        body: [
          'Lamport clocks provide a partial order; to get a total order, you add a tie-breaker such as node ID.',
          'For total order broadcast, messages are delivered in increasing (timestamp, nodeId) order.',
          'This ensures all nodes deliver the same sequence of events.',
        ],
      },
      {
        heading: 'Acknowledgements and delivery',
        body: [
          'Nodes often keep a holdback queue of messages not yet safe to deliver.',
          'A message is deliverable when the node knows no earlier timestamped message can still arrive.',
          'Acknowledgements from all nodes ensure delivery is safe.',
        ],
      },
      {
        heading: 'What Lamport clocks cannot do',
        body: [
          'Lamport clocks do not detect concurrency by themselves.',
          'They only preserve “happened-before” ordering, not causality details.',
          'Vector clocks are needed to explicitly detect concurrent events.',
        ],
      },
      {
        heading: 'How to read the visualization',
        body: [
          'Watch timestamps increase as messages and events occur.',
          'Observe holdback queues and how delivery order is determined.',
          'Compare the delivery sequence across nodes to confirm total order.',
        ],
      },
    ],
  },
  'quorum-replication': {
    title: 'Quorum Replication: A Practical Guide',
    sections: [
      {
        heading: 'What quorums solve',
        body: [
          'Quorum replication balances consistency and availability by requiring only a subset of replicas to respond.',
          'Read quorum (R) and write quorum (W) determine how many replicas must participate.',
          'If R + W > N (replication factor), a read will see the latest write.',
        ],
      },
      {
        heading: 'Write path',
        body: [
          'A coordinator writes to replicas and waits for W acknowledgements.',
          'Lower W means faster writes but potentially stale reads.',
          'Higher W improves consistency at the cost of latency.',
        ],
      },
      {
        heading: 'Read path',
        body: [
          'A coordinator reads from R replicas and returns the most recent version.',
          'If R is small, reads are fast but can be stale if W is also small.',
          'R can be tuned based on workload and consistency needs.',
        ],
      },
      {
        heading: 'Read repair',
        body: [
          'When a read sees divergent versions, the coordinator can write the newest version back to stale replicas.',
          'This gradually heals inconsistencies without running full background repair.',
          'Read repair is most effective when reads are frequent.',
        ],
      },
      {
        heading: 'Failure handling',
        body: [
          'If too many replicas are down, quorum cannot be reached and the operation fails.',
          'The system can still remain available with smaller quorums, but data may be stale.',
          'Operators choose trade-offs based on tolerance for stale reads.',
        ],
      },
      {
        heading: 'How to read the visualization',
        body: [
          'Adjust W and R to see how quickly operations succeed or fail.',
          'Observe how read repair updates stale replicas.',
          'Watch the inconsistency count change as replicas converge.',
        ],
      },
    ],
  },
  'pbft': {
    title: 'PBFT: A Practical Guide',
    sections: [
      {
        heading: 'What PBFT solves',
        body: [
          'Practical Byzantine Fault Tolerance (PBFT) allows a cluster to agree on decisions even if some nodes behave maliciously.',
          'It tolerates up to f faulty nodes out of 3f+1 total.',
          'The protocol guarantees safety and liveness under partial synchrony.',
        ],
      },
      {
        heading: 'Roles and views',
        body: [
          'A primary (leader) coordinates the protocol and replicas validate and execute requests.',
          'A view is a leadership epoch; view changes replace faulty primaries.',
          'Each view has a single primary and many replicas.',
        ],
      },
      {
        heading: 'Phases: pre-prepare, prepare, commit',
        body: [
          'The primary sends a pre-prepare message with the request and sequence number.',
          'Replicas broadcast prepare messages to each other to confirm the proposal.',
          'Once a replica collects 2f+1 prepares, it sends a commit.',
        ],
      },
      {
        heading: 'Execution and reply',
        body: [
          'A replica executes a request after receiving 2f+1 commits.',
          'Replicas reply to the client with the result.',
          'The client accepts the result after f+1 matching replies.',
        ],
      },
      {
        heading: 'Quorum intuition',
        body: [
          'Prepare and commit quorums intersect, ensuring that a committed decision cannot be reversed.',
          'Even if f nodes lie, the honest majority preserves safety.',
        ],
      },
      {
        heading: 'View changes',
        body: [
          'If the primary is slow or faulty, replicas trigger a view change.',
          'A new primary collects state and continues from the highest stable sequence.',
          'This prevents the system from getting stuck on a faulty leader.',
        ],
      },
      {
        heading: 'How to read the visualization',
        body: [
          'Follow the pre-prepare → prepare → commit message flow.',
          'Watch how many prepares/commits are needed for execution.',
          'Trigger leader failure to see view changes in action.',
        ],
      },
    ],
  },
  'distributed-locking': {
    title: 'Distributed Locking and Leases: A Practical Guide',
    sections: [
      {
        heading: 'What distributed locks solve',
        body: [
          'Distributed locks ensure only one client can perform a critical operation at a time.',
          'They prevent race conditions across processes or machines.',
          'Common use cases include leader election, scheduling, and exclusive resource access.',
        ],
      },
      {
        heading: 'Lease-based locking',
        body: [
          'A lease grants time-limited ownership of a lock.',
          'If the holder fails, the lease expires and another client can acquire the lock.',
          'Leases reduce the risk of deadlocks caused by crashed clients.',
        ],
      },
      {
        heading: 'Heartbeats and renewal',
        body: [
          'The lock holder periodically sends heartbeats to renew the lease.',
          'If heartbeats stop, the lock manager allows the lease to expire.',
          'This balances safety with availability during failures.',
        ],
      },
      {
        heading: 'Contention and fairness',
        body: [
          'When multiple clients request the lock, the manager may queue requests.',
          'FIFO queues improve fairness but can reduce throughput under heavy load.',
          'Some systems use randomized backoff instead of strict queues.',
        ],
      },
      {
        heading: 'Failure cases',
        body: [
          'If the lock manager fails, clients may be unable to acquire or renew locks.',
          'Systems often use replicated coordinators (e.g., ZooKeeper, etcd) to avoid this single point of failure.',
        ],
      },
      {
        heading: 'How to read the visualization',
        body: [
          'Watch lease grants and expiries as time advances.',
          'Observe heartbeats extend leases and prevent expiry.',
          'See queued clients receive the lock after release or timeout.',
        ],
      },
    ],
  },
  'sharding-rebalancing': {
    title: 'Sharding + Rebalancing: A Practical Guide',
    sections: [
      {
        heading: 'What sharding solves',
        body: [
          'Sharding splits a large dataset across multiple nodes so no single machine holds all keys.',
          'The main goals are scale (more storage and throughput) and isolation (one hot tenant does not overwhelm everything).',
          'Rebalancing keeps shards evenly distributed when nodes join, leave, or change capacity.',
        ],
      },
      {
        heading: 'Core mental model',
        body: [
          'Every key belongs to exactly one shard, and each shard belongs to exactly one node.',
          'A sharding strategy defines the mapping from key to shard, and from shard to node.',
          'Rebalancing changes those mappings while preserving correctness and minimizing data movement.',
        ],
      },
      {
        heading: 'Range sharding',
        body: [
          'Range sharding groups contiguous key ranges on the same node.',
          'It is easy to reason about and efficient for range queries.',
          'The downside is hotspots: a small range can become extremely hot and overload a node.',
        ],
      },
      {
        heading: 'Hash sharding',
        body: [
          'Hash sharding uses a hash function to spread keys uniformly.',
          'It balances load well for random access patterns.',
          'Range queries are harder because adjacent keys are scattered across nodes.',
        ],
      },
      {
        heading: 'What triggers rebalancing',
        body: [
          'Nodes added: redistribute shards so the new capacity is used.',
          'Nodes removed or failed: move their shards to healthy nodes.',
          'Skewed load: detect hotspots and move or split shards to reduce imbalance.',
        ],
      },
      {
        heading: 'How rebalancing moves data',
        body: [
          'A controller picks candidate shards and target nodes based on load and capacity.',
          'Data is copied to the target, verified, and then ownership is switched.',
          'During the move, systems often use forwarding or dual writes to keep reads correct.',
        ],
      },
      {
        heading: 'Minimizing movement',
        body: [
          'Good strategies move as little data as possible to reach a balanced state.',
          'Consistent hashing is popular because adding a node only moves a small fraction of keys.',
          'Range sharding can also minimize movement by splitting just the hottest ranges.',
        ],
      },
      {
        heading: 'Operational tradeoffs',
        body: [
          'Rebalancing too aggressively can harm latency and saturate networks.',
          'Rebalancing too slowly can leave hot nodes overloaded for long periods.',
          'Many systems throttle movement, apply backpressure, and schedule moves during low traffic.',
        ],
      },
      {
        heading: 'Failure handling',
        body: [
          'If a node fails mid-move, the system either rolls back or finishes from another replica.',
          'Metadata updates must be atomic so only one node is authoritative for a shard.',
          'Careful bookkeeping prevents split-brain ownership of the same shard.',
        ],
      },
      {
        heading: 'How to read the visualization',
        body: [
          'Switch between range and hash to compare how shards cluster on nodes.',
          'Add or remove nodes to see which shards are moved and how load shifts.',
          'Trigger rebalancing to observe how the system spreads keys more evenly.',
        ],
      },
    ],
  },
  'merkle-anti-entropy': {
    title: 'Merkle Tree Anti-Entropy: A Practical Guide',
    sections: [
      {
        heading: 'What problem it solves',
        body: [
          'Replicas can drift apart due to missed updates, delays, or partial failures.',
          'Anti-entropy is the process of reconciling replicas until they converge.',
          'Merkle trees make that reconciliation efficient by comparing hashes instead of full datasets.',
        ],
      },
      {
        heading: 'Core idea',
        body: [
          'Each replica builds a Merkle tree over its key-value data.',
          'Internal nodes store hashes of their children, and the root summarizes the entire dataset.',
          'If two roots match, the replicas are identical; if not, they walk the tree to find differences.',
        ],
      },
      {
        heading: 'Comparing roots',
        body: [
          'Replica A sends its root hash to replica B.',
          'If B’s root hash matches, no further work is needed.',
          'If they differ, the replicas compare child hashes to narrow the divergence.',
        ],
      },
      {
        heading: 'Tree walk to pinpoint differences',
        body: [
          'When a subtree hash differs, the replicas compare its children.',
          'This continues recursively until reaching leaves that correspond to specific keys.',
          'Only the mismatched leaves are transferred or repaired.',
        ],
      },
      {
        heading: 'Why it is efficient',
        body: [
          'Hash comparisons are small and fast, even for very large datasets.',
          'Only divergent ranges require data transfer.',
          'Bandwidth use scales with the size of the difference, not the size of the dataset.',
        ],
      },
      {
        heading: 'Data layout matters',
        body: [
          'Keys must be ordered consistently so both replicas build identical trees.',
          'Many systems sort keys or bucket them into fixed ranges.',
          'If replicas partition differently, they will compare unrelated subtrees and lose efficiency.',
        ],
      },
      {
        heading: 'Failure and convergence',
        body: [
          'If a node fails mid-compare, the process can be retried without corrupting state.',
          'Repeated anti-entropy rounds eventually converge even with intermittent failures.',
          'This is why Merkle trees are popular in eventually consistent stores.',
        ],
      },
      {
        heading: 'How to read the visualization',
        body: [
          'Trigger a root compare to see whether the replicas agree.',
          'Watch subtree comparisons narrow down to specific keys.',
          'Mutate a key to create divergence, then sync it back with a leaf repair.',
        ],
      },
    ],
  },
  crdts: {
    title: 'CRDTs: A Practical Guide',
    sections: [
      {
        heading: 'What problem CRDTs solve',
        body: [
          'In distributed systems, replicas often update data independently and out of order.',
          'Conflict-free Replicated Data Types (CRDTs) guarantee that all replicas converge without coordination.',
          'They are designed so merges are safe, deterministic, and do not require a leader.',
        ],
      },
      {
        heading: 'The core CRDT idea',
        body: [
          'Each replica can apply local updates and ship them later.',
          'When replicas exchange state or operations, the merge function resolves conflicts automatically.',
          'The merge is associative, commutative, and idempotent, so order and duplication do not matter.',
        ],
      },
      {
        heading: 'Two big families',
        body: [
          'State-based CRDTs (CvRDTs) send full or partial state and merge with a join operation.',
          'Operation-based CRDTs (CmRDTs) send operations that are guaranteed to commute.',
          'Both approaches aim for the same guarantee: eventual convergence.',
        ],
      },
      {
        heading: 'Example: G-Counter',
        body: [
          'A G-Counter is a grow-only counter where each replica keeps its own component.',
          'When replicas sync, they take the max of each component.',
          'The total counter value is the sum of all components, and it never decreases.',
        ],
      },
      {
        heading: 'Example: OR-Set',
        body: [
          'An Observed-Remove Set lets replicas add and remove elements without conflicts.',
          'Each add tags the element with a unique identifier.',
          'A remove only deletes tags it has observed, preventing lost updates.',
        ],
      },
      {
        heading: 'Example: RGA sequence',
        body: [
          'A Replicated Growable Array models a list where inserts happen after a specific element.',
          'Each insert creates a unique element ID, so concurrent inserts have a deterministic order.',
          'Removals are tombstones rather than deletions, preserving causality.',
        ],
      },
      {
        heading: 'Tradeoffs',
        body: [
          'CRDTs favor availability and offline writes, but they can grow metadata over time.',
          'Some types only allow monotonic changes (like G-Counter).',
          'Designing a CRDT requires careful thought about the invariants you want.',
        ],
      },
      {
        heading: 'How to read the visualization',
        body: [
          'Make divergent updates on different replicas to create conflicts.',
          'Sync replicas and watch the merge bring them back to the same state.',
          'Compare how G-Counter, OR-Set, and RGA handle concurrency.',
        ],
      },
    ],
  },
  'replication-log': {
    title: 'Replication Log (Kafka-style): A Practical Guide',
    sections: [
      {
        heading: 'What problem the replication log solves',
        body: [
          'A replicated log provides a durable, ordered history of events.',
          'It lets producers write once and many consumers read in the same order.',
          'Replication keeps the log available even if a broker fails.',
        ],
      },
      {
        heading: 'Core mental model',
        body: [
          'A topic is split into partitions, and each partition is an ordered log.',
          'Each partition has one leader and multiple followers.',
          'Clients write to the leader, and followers replicate the leader’s log.',
        ],
      },
      {
        heading: 'Offsets and ordering',
        body: [
          'Each log entry has a monotonically increasing offset.',
          'Offsets define a total order within a partition.',
          'Consumers track their own offset to replay or catch up.',
        ],
      },
      {
        heading: 'High watermark (HW)',
        body: [
          'The high watermark is the last offset known to be replicated by the in-sync replicas (ISR).',
          'Only entries at or below the HW are safe for consumers to read.',
          'This prevents consumers from seeing messages that could be lost on failure.',
        ],
      },
      {
        heading: 'ISR and lag',
        body: [
          'ISR is the set of replicas that are fully caught up to the leader.',
          'If a follower lags too far behind, it is removed from ISR.',
          'A smaller ISR reduces durability guarantees until the follower catches up.',
        ],
      },
      {
        heading: 'Produce acknowledgments',
        body: [
          'Producers can choose how many replicas must acknowledge a write.',
          'acks=1 is fast but risks data loss if the leader fails.',
          'acks=all waits for ISR and is safer but slower.',
        ],
      },
      {
        heading: 'Failure handling',
        body: [
          'If the leader fails, a new leader is elected from the ISR.',
          'Out-of-sync replicas can rejoin by catching up from the leader.',
          'Keeping the ISR healthy is key to safe failover.',
        ],
      },
      {
        heading: 'How to read the visualization',
        body: [
          'Produce messages to see how logs and offsets grow.',
          'Remove a follower from ISR to see how HW and durability change.',
          'Rejoin the follower to watch it catch up and restore the ISR.',
        ],
      },
    ],
  },
  'failure-detectors': {
    title: 'Failure Detectors: A Practical Guide',
    sections: [
      {
        heading: 'What failure detectors solve',
        body: [
          'Distributed systems need to decide whether a node is alive or dead.',
          'Because networks are unreliable, we can only make educated guesses.',
          'Failure detectors provide those guesses so higher-level systems can react.',
        ],
      },
      {
        heading: 'The core challenge',
        body: [
          'Slow networks and crashes look the same from the outside.',
          'If you suspect too quickly, you create false positives.',
          'If you wait too long, recovery is slow.',
        ],
      },
      {
        heading: 'Heartbeat-based detection',
        body: [
          'Nodes send periodic heartbeats to signal they are alive.',
          'Missing heartbeats for some timeout triggers suspicion.',
          'Timeout-based detectors are simple but sensitive to latency spikes.',
        ],
      },
      {
        heading: 'Phi accrual detectors',
        body: [
          'Phi accrual treats heartbeats as a statistical process.',
          'It calculates a suspicion level (phi) based on heartbeat history.',
          'This adapts to normal latency variations and reduces false positives.',
        ],
      },
      {
        heading: 'SWIM-style probing',
        body: [
          'Instead of fixed heartbeats, nodes periodically probe peers.',
          'If a probe fails, they ask other nodes to confirm.',
          'This spreads detection load and improves accuracy at scale.',
        ],
      },
      {
        heading: 'Suspicion and confirmation',
        body: [
          'Systems often introduce a suspect state before declaring failure.',
          'Suspect nodes can still recover if they respond in time.',
          'Confirmation from multiple peers helps avoid bad decisions.',
        ],
      },
      {
        heading: 'Tuning tradeoffs',
        body: [
          'Short timeouts improve detection speed but raise false positives.',
          'Long timeouts improve accuracy but slow failover.',
          'Real systems tune based on workload, latency, and failure tolerance.',
        ],
      },
      {
        heading: 'How to read the visualization',
        body: [
          'Send heartbeats to keep phi low and nodes healthy.',
          'Pause heartbeats and watch phi climb into suspect and failed.',
          'Probe peers to see how indirect checks confirm suspicion.',
        ],
      },
    ],
  },
  'distributed-transactions': {
    title: 'Distributed Transactions: A Practical Guide',
    sections: [
      {
        heading: 'What distributed transactions solve',
        body: [
          'When a business action spans multiple services, you still want an all-or-nothing outcome.',
          'Distributed transactions coordinate those services so partial updates do not leave data inconsistent.',
          'Two common approaches are atomic commit protocols and sagas.',
        ],
      },
      {
        heading: 'Atomic commit vs saga',
        body: [
          'Atomic commit aims for one global decision: commit or abort for all participants.',
          'Sagas allow each step to commit locally and use compensating actions if something fails.',
          'Atomic commit is simpler for correctness; sagas are usually more available and scalable.',
        ],
      },
      {
        heading: '3PC in a nutshell',
        body: [
          'Three-Phase Commit adds an extra phase to reduce blocking compared to 2PC.',
          'Phases are: prepare, pre-commit, and commit.',
          'Participants can time out and make progress if they reach pre-commit and lose the coordinator.',
        ],
      },
      {
        heading: '3PC phases in detail',
        body: [
          'Prepare: coordinator asks participants if they can commit.',
          'Pre-commit: coordinator tells participants it will commit, and they acknowledge.',
          'Commit: coordinator finalizes the decision; participants make it durable.',
        ],
      },
      {
        heading: 'Limitations of 3PC',
        body: [
          '3PC assumes bounded delays and no partitions, which are hard to guarantee.',
          'In real systems, network partitions can still cause inconsistent outcomes.',
          'Because of this, 3PC is less common than simpler 2PC or saga patterns.',
        ],
      },
      {
        heading: 'Saga pattern',
        body: [
          'A saga breaks a transaction into ordered steps, each with a local commit.',
          'If a later step fails, compensating actions undo the earlier steps.',
          'This trades strict atomicity for availability and throughput.',
        ],
      },
      {
        heading: 'Designing compensations',
        body: [
          'Compensations must be safe to run multiple times and handle partial failures.',
          'They are not always perfect undo operations, so domain modeling matters.',
          'Careful ordering and idempotency are crucial to avoid drift.',
        ],
      },
      {
        heading: 'How to read the visualization',
        body: [
          'Run 3PC to see participants move through prepare, pre-commit, and commit.',
          'Force a NO vote to see the abort path.',
          'Run a saga and then compensate steps to observe rollback behavior.',
        ],
      },
    ],
  },
  'load-balancing': {
    title: 'Load Balancing + Backpressure: A Practical Guide',
    sections: [
      {
        heading: 'What load balancing solves',
        body: [
          'Load balancing spreads traffic across multiple workers to improve throughput and resilience.',
          'It avoids overloading a single server while others sit idle.',
          'Backpressure protects the system when demand exceeds capacity.',
        ],
      },
      {
        heading: 'The core mental model',
        body: [
          'Requests arrive at a dispatcher and are routed to available workers.',
          'Each worker has a queue and a processing capacity.',
          'If queues grow too large, the system must slow down or reject work.',
        ],
      },
      {
        heading: 'Common routing strategies',
        body: [
          'Round-robin distributes requests evenly but ignores current load.',
          'Least-loaded routing picks the worker with the smallest queue or CPU usage.',
          'Hash-based routing keeps related requests on the same worker for cache locality.',
        ],
      },
      {
        heading: 'Backpressure techniques',
        body: [
          'Queues can be bounded to prevent unbounded memory growth.',
          'When full, the system can drop, defer, or reject requests.',
          'Adaptive throttling slows intake based on queue length or latency.',
        ],
      },
      {
        heading: 'Failure handling',
        body: [
          'If a worker fails, the balancer reroutes new traffic to healthy workers.',
          'In-flight requests may need retries or timeouts.',
          'Health checks and fast failure detection keep the pool accurate.',
        ],
      },
      {
        heading: 'Tradeoffs',
        body: [
          'Aggressive throttling protects latency but reduces throughput.',
          'Lenient throttling increases throughput but risks long queues and timeouts.',
          'Choosing the right policy depends on SLOs and workload patterns.',
        ],
      },
      {
        heading: 'How to read the visualization',
        body: [
          'Send bursts to see queues grow and overloaded workers appear.',
          'Watch requests get dropped when backpressure kicks in.',
          'Fail a worker to see how the system reroutes traffic.',
        ],
      },
    ],
  },
  'network-partitions': {
    title: 'Network Partitions + Split-Brain: A Practical Guide',
    sections: [
      {
        heading: 'What network partitions are',
        body: [
          'A network partition happens when a cluster splits into groups that cannot communicate.',
          'Each group may still be internally connected and continue operating.',
          'From the system’s perspective, this looks like a subset of nodes failing.',
        ],
      },
      {
        heading: 'Why split-brain is dangerous',
        body: [
          'If each partition elects its own leader, the system can diverge.',
          'Two leaders can accept conflicting writes for the same data.',
          'When the partition heals, reconciling those conflicts is hard.',
        ],
      },
      {
        heading: 'Majority quorum rule',
        body: [
          'Many systems require a majority to make progress.',
          'If a partition does not have a majority, it must stop accepting writes.',
          'This sacrifices availability to preserve consistency.',
        ],
      },
      {
        heading: 'Minority isolation',
        body: [
          'Nodes in the minority can still serve stale reads or reject writes.',
          'They should not elect a leader or commit new data.',
          'This avoids two independent histories forming at once.',
        ],
      },
      {
        heading: 'Leader elections during partitions',
        body: [
          'If the leader is isolated from the majority, a new leader can be elected on the majority side.',
          'The old leader must step down once it hears from a higher term.',
          'This prevents permanent split-brain once connectivity returns.',
        ],
      },
      {
        heading: 'Healing and recovery',
        body: [
          'When the partition heals, nodes exchange logs or state to converge.',
          'The majority leader’s history usually wins and overwrites conflicts.',
          'Systems that allow writes in both partitions need explicit conflict resolution.',
        ],
      },
      {
        heading: 'How to read the visualization',
        body: [
          'Split the network to see nodes grouped into partitions.',
          'Trigger elections in each partition to observe split-brain risk.',
          'Heal the network to watch how leadership stabilizes again.',
        ],
      },
    ],
  },
  'consensus-variants': {
    title: 'Consensus Variants: A Practical Guide',
    sections: [
      {
        heading: 'Why there are variants',
        body: [
          'Consensus has a common core goal: agree on a single ordered history.',
          'Different systems optimize for latency, throughput, or cluster changes.',
          'Variants trade complexity for performance in specific scenarios.',
        ],
      },
      {
        heading: 'Raft joint consensus',
        body: [
          'Joint consensus safely changes cluster membership.',
          'For a short period, both the old and new configurations must agree.',
          'This prevents split decisions while nodes are being added or removed.',
        ],
      },
      {
        heading: 'Multi-Paxos',
        body: [
          'Multi-Paxos is Paxos optimized for repeated decisions in a log.',
          'A stable leader skips repeated prepare phases and streams accepts.',
          'This makes it similar in performance to Raft for steady workloads.',
        ],
      },
      {
        heading: 'EPaxos',
        body: [
          'EPaxos allows leaders to propose commands independently.',
          'Non-conflicting commands can commit in one round-trip (fast path).',
          'Conflicting commands fall back to a slower, coordinated path.',
        ],
      },
      {
        heading: 'Tradeoffs across variants',
        body: [
          'Joint consensus adds safety during membership changes but adds coordination overhead.',
          'Multi-Paxos is efficient with a stable leader but still leader-centric.',
          'EPaxos reduces latency under low conflict but is more complex to implement.',
        ],
      },
      {
        heading: 'When to choose what',
        body: [
          'Choose joint consensus when membership changes must be safe and frequent.',
          'Choose Multi-Paxos when you want a proven design with a stable leader.',
          'Choose EPaxos when you need lower latency and can tolerate complexity.',
        ],
      },
      {
        heading: 'How to read the visualization',
        body: [
          'Switch variants to compare message flow and leadership roles.',
          'Start joint config to see how two quorums overlap.',
          'Run EPaxos fast and slow paths to see the difference in message counts.',
        ],
      },
    ],
  },
};
