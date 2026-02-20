# Distributed Systems Visualizer

Interactive visual simulations for learning distributed systems, with step controls and in-page theory articles.

![Distributed Systems Visualizer](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwind-css)

## 🌟 Features

- **Interactive Visualizations**: Play, pause, and step through algorithms
- **Theory Drawer**: Read a detailed article inside each topic page
- **Scenarios + Manual Controls**: Pre-built cases plus knobs to inject events
- **Export + Share**: PNG/SVG/JSON export and share shortcuts
- **Progress Tracking**: Local progress, achievements, and stats
- **Static Export**: Deploy to GitHub Pages with no backend

## 📚 Concepts Covered

| Topic | Resource |
|---|---|
| CAP Theorem | [Brewer keynote (PODC 2000)](https://www.cs.berkeley.edu/~brewer/cs262b-2004/PODC-keynote.pdf) |
|  | [Brewer's Conjecture overview](https://en.wikipedia.org/wiki/CAP_theorem) |
| Lamport Clocks | [Time, Clocks, and the Ordering of Events](https://lamport.azurewebsites.net/pubs/time-clocks.pdf) |
|  | [Causality and logical clocks (overview)](https://en.wikipedia.org/wiki/Happened-before) |
| Vector Clocks | [Vector clocks (overview)](https://en.wikipedia.org/wiki/Vector_clock) |
|  | [Vector clocks explained](https://sookocheff.com/post/time/vector-clocks/) |
| Chandy-Lamport Snapshot | [Distributed snapshots (original paper)](https://lamport.azurewebsites.net/pubs/chandy.pdf) |
|  | [Chandy-Lamport walkthrough](https://decomposition.al/blog/2019/04/26/an-example-run-of-the-chandy-lamport-snapshot-algorithm/) |
| Eventual Consistency | [Dynamo: Amazon's key-value store](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf) |
|  | [Eventually Consistent (Vogels)](https://www.allthingsdistributed.com/2008/12/eventually_consistent.html) |
| CRDTs | [Conflict-free Replicated Data Types](https://hal.inria.fr/inria-00555588/document) |
|  | [Comprehensive CRDT study](https://hal.inria.fr/inria-00609399/document) |
| Gossip & Anti-Entropy | [Epidemic algorithms for replication (overview)](https://en.wikipedia.org/wiki/Gossip_protocol) |
|  | [SWIM membership protocol](https://www.cs.cornell.edu/projects/Quicksilver/public_pdfs/SWIM.pdf) |
| Merkle Anti-Entropy | [Merkle tree overview](https://en.wikipedia.org/wiki/Merkle_tree) |
|  | [Cassandra repair and anti-entropy](https://cassandra.apache.org/doc/stable/cassandra/managing/operating/repair.html) |
| Quorum Replication | [Quorum systems overview](https://en.wikipedia.org/wiki/Quorum_%28distributed_computing%29) |
|  | [Chain Replication](https://www.cs.cornell.edu/home/rvr/papers/OSDI04.pdf) |
| Replication Log | [Kafka: log processing paper](https://notes.stephenholiday.com/Kafka.pdf) |
|  | [The Log (Jay Kreps)](https://jaykreps.com/2013/06/17/the-log-what-every-software-engineer-should-know-about-real-time-datas-unifying/) |
| Failure Detectors | [Unreliable failure detectors (references)](https://www.cs.cornell.edu/info/people/sam/FDpapers.html) |
|  | [Phi accrual failure detector (implementation notes)](https://pekko.apache.org/docs/pekko/current/typed/failure-detector.html) |
| Consistent Hashing | [Consistent hashing and random trees](https://www.cs.princeton.edu/courses/archive/fall09/cos518/papers/chash.pdf) |
|  | [Jump consistent hash](https://arxiv.org/abs/1406.2294) |
| Sharding + Rebalancing | [MongoDB sharding docs](https://www.mongodb.com/docs/manual/sharding/) |
|  | [FoundationDB data distribution](https://apple.github.io/foundationdb/architecture.html) |
| Load Balancing | [Power of two choices (chapter)](https://www.eecs.harvard.edu/~michaelm/postscripts/handbook2001.pdf) |
|  | [Maglev load balancer](https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/44824.pdf) |
| Distributed Locking | [Chubby lock service](https://research.google/pubs/pub27897/) |
|  | [ZooKeeper](https://www.usenix.org/legacy/event/usenix10/tech/full_papers/Hunt.pdf) |
| Two-Phase Commit (2PC) | [Two-phase commit notes](https://en.wikipedia.org/wiki/Two-phase_commit_protocol) |
|  | [Consensus on transaction commit](https://lamport.azurewebsites.net/pubs/pubs.html#paxos-commit) |
| Distributed Transactions | [Sagas](https://www.cs.cornell.edu/andru/cs711/2002fa/reading/sagas.pdf) |
|  | [Life Beyond Distributed Transactions](https://www.cidrdb.org/cidr2007/papers/cidr07p15.pdf) |
| Network Partitions | [FLP impossibility](https://groups.csail.mit.edu/tds/papers/Lynch/jacm85.pdf) |
|  | [Partial synchrony (DLS)](https://groups.csail.mit.edu/tds/papers/Lynch/jacm88.pdf) |
| Paxos | [Paxos Made Simple](https://lamport.azurewebsites.net/pubs/paxos-simple.pdf) |
|  | [The Part-Time Parliament](https://lamport.azurewebsites.net/pubs/lamport-paxos.pdf) |
| Raft Consensus | [Raft paper](https://raft.github.io/raft.pdf) |
|  | [Raft project site](https://raft.github.io/) |
| Consensus Variants | [Paxos Made Live](https://static.googleusercontent.com/media/research.google.com/en//archive/paxos_made_live.pdf) |
|  | [EPaxos](https://www.cs.cmu.edu/~dga/papers/epaxos-sosp2013.pdf) |
| PBFT | [Practical Byzantine Fault Tolerance](https://www.usenix.org/conference/osdi-99/practical-byzantine-fault-tolerance) |
|  | [HotStuff (modern BFT)](https://arxiv.org/abs/1803.05069) |

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/sandeepkv93/distributed-systems-visualizer.git
cd distributed-systems-visualizer
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
```

This generates a static export in the `out/` directory, ready for deployment to GitHub Pages or any static hosting service.

## 🎯 Usage

1. Pick a topic from the home page or Topics menu.
2. Choose a scenario or use manual controls.
3. Use "Read the theory" for the long-form article.

### Export & Share

Export your visualizations in multiple formats:

- **PNG Export**: High-quality 2x resolution images perfect for presentations
- **SVG Export**: Scalable vector graphics for editing and scaling
- **JSON Export**: Save the current state as JSON for analysis
- **Share**: Use the system share dialog to share via email, messages, etc.
- **Copy Link**: Copy the current page URL to clipboard
- **Copy State**: Copy the current state data to clipboard

Click the "Export" button in any concept visualizer to access these options.

### Progress Tracking

Track your learning journey:

- **View Progress**: Click the "Progress" button in the top navigation
- **Achievements**: Unlock milestones by completing scenarios and concepts
- **Statistics**: See your total time spent and completion percentages
- **Export/Import**: Backup your progress or transfer it between devices

## 🏗️ Architecture

### Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React

### Adding New Concepts

1. Create algorithm implementation in `lib/algorithms/`
2. Create scenarios in `visualizers/your-concept/`
3. Create page in `app/your-concept/`
4. Update navigation in `components/Navigation.tsx`

## 🎨 Color Scheme

Node states are color-coded:
- 🟢 Green: Healthy nodes
- 🔴 Red: Failed nodes
- 🟠 Amber: Processing/Candidate
- 🔵 Blue: Leader
- 🟣 Purple: Special states

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is open source and available under the MIT License.

---

Made with ❤️ for the distributed systems community
