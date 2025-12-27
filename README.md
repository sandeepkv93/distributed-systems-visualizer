# Distributed Systems Visualizer

Interactive visual simulations for learning distributed systems, with step controls, AI explanations, and in-page theory articles.

![Distributed Systems Visualizer](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwind-css)

## 🌟 Features

- **Interactive Visualizations**: Play, pause, and step through algorithms
- **Theory Drawer**: Read a detailed article inside each topic page
- **AI Explanations + Quizzes**: Ask Claude questions and test understanding
- **Scenarios + Manual Controls**: Pre-built cases plus knobs to inject events
- **Export + Share**: PNG/SVG/JSON export and share shortcuts
- **Progress Tracking**: Local progress, achievements, and stats
- **Static Export**: Deploy to GitHub Pages with no backend

## 📚 Concepts Covered

### CAP Theorem
Learning Resources:
- [Brewer keynote (PODC 2000)](https://www.cs.berkeley.edu/~brewer/cs262b-2004/PODC-keynote.pdf)
- [Brewer's Conjecture paper](https://www.comp.nus.edu.sg/~gilbert/pubs/BrewersConjecture-SIGACT.pdf)

### Lamport Clocks
Learning Resources:
- [Time, Clocks, and the Ordering of Events](https://lamport.azurewebsites.net/pubs/time-clocks.pdf)
- [Causality and logical clocks (lecture)](https://www.cs.cornell.edu/courses/cs5414/2017sp/lectures/lec10-causality.pdf)

### Vector Clocks
Learning Resources:
- [Fidge, timestamps in message-passing systems](https://www.cs.colostate.edu/~cs457/yr2018sp/more_material/Fidge_Timestamps.pdf)
- [Mattern, virtual time and global states](https://www.cs.colostate.edu/~cs457/yr2018sp/more_material/Mattern_VirtualTime.pdf)

### Chandy-Lamport Snapshot
Learning Resources:
- [Distributed snapshots (original paper)](https://lamport.azurewebsites.net/pubs/chandy.pdf)
- [Chandy-Lamport notes](https://www.cs.cornell.edu/courses/cs5414/2014sp/reading/chandy-lamport.pdf)

### Eventual Consistency
Learning Resources:
- [Dynamo: Amazon's key-value store](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf)
- [Eventually Consistent (Vogels)](https://www.allthingsdistributed.com/2008/12/eventually_consistent.html)

### CRDTs
Learning Resources:
- [Conflict-free Replicated Data Types](https://hal.inria.fr/inria-00555588/document)
- [Comprehensive CRDT study](https://hal.inria.fr/inria-00609399/document)

### Gossip & Anti-Entropy
Learning Resources:
- [Epidemic algorithms for replication](https://www.cs.cornell.edu/home/rvr/papers/epidemic.pdf)
- [SWIM membership protocol](https://www.cs.cornell.edu/projects/Quicksilver/public_pdfs/SWIM.pdf)

### Merkle Anti-Entropy
Learning Resources:
- [Merkle tree original paper](https://www.merkle.com/papers/merkle-tree.pdf)
- [Cassandra repair and anti-entropy](https://cassandra.apache.org/doc/latest/cassandra/operating/repair.html)

### Quorum Replication
Learning Resources:
- [Quorum systems survey](https://www.cs.cornell.edu/home/vinod/papers/quorum.pdf)
- [Chain Replication](https://www.cs.cornell.edu/home/rvr/papers/OSDI04.pdf)

### Replication Log
Learning Resources:
- [Kafka: log processing paper](https://notes.stephenholiday.com/Kafka.pdf)
- [The Log, LinkedIn Engineering](https://engineering.linkedin.com/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-data)

### Failure Detectors
Learning Resources:
- [Unreliable failure detectors (Chandra-Toueg)](https://www.cs.cornell.edu/home/rvr/papers/ChandraToueg.pdf)
- [Phi accrual failure detector](https://www.jaist.ac.jp/~shima/reading/AccrualFailureDetector.pdf)

### Consistent Hashing
Learning Resources:
- [Consistent hashing and random trees](https://www.cs.princeton.edu/courses/archive/fall09/cos518/papers/chash.pdf)
- [Jump consistent hash](https://arxiv.org/abs/1406.2294)

### Sharding + Rebalancing
Learning Resources:
- [MongoDB sharding docs](https://www.mongodb.com/docs/manual/sharding/)
- [FoundationDB data distribution](https://apple.github.io/foundationdb/data-distribution.html)

### Load Balancing
Learning Resources:
- [Power of two choices](https://www.eecs.harvard.edu/~michaelm/postscripts/twchoices.pdf)
- [Maglev load balancer](https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/44824.pdf)

### Distributed Locking
Learning Resources:
- [Chubby lock service](https://research.google/pubs/pub27897/)
- [ZooKeeper](https://www.usenix.org/legacy/event/usenix10/tech/full_papers/Hunt.pdf)

### Two-Phase Commit (2PC)
Learning Resources:
- [Two-phase commit notes](https://www.cs.cornell.edu/courses/cs5414/2014sp/reading/2pc.pdf)
- [Consensus on transaction commit](https://lamport.azurewebsites.net/pubs/txncommit.pdf)

### Distributed Transactions
Learning Resources:
- [Sagas](https://www.cs.cornell.edu/andru/cs711/2002fa/reading/sagas.pdf)
- [Life Beyond Distributed Transactions](https://www-db.cs.wisc.edu/cidr/cidr2007/papers/cidr07p15.pdf)

### Network Partitions
Learning Resources:
- [FLP impossibility](https://groups.csail.mit.edu/tds/papers/Lynch/jacm85.pdf)
- [Partial synchrony (DLS)](https://groups.csail.mit.edu/tds/papers/Lynch/jacm88.pdf)

### Paxos
Learning Resources:
- [Paxos Made Simple](https://lamport.azurewebsites.net/pubs/paxos-simple.pdf)
- [The Part-Time Parliament](https://lamport.azurewebsites.net/pubs/lamport-paxos.pdf)

### Raft Consensus
Learning Resources:
- [Raft paper](https://raft.github.io/raft.pdf)
- [Raft project site](https://raft.github.io/)

### Consensus Variants
Learning Resources:
- [Paxos Made Live](https://static.googleusercontent.com/media/research.google.com/en//archive/paxos_made_live.pdf)
- [EPaxos](https://www.cs.cmu.edu/~dga/papers/epaxos-sosp2013.pdf)

### PBFT
Learning Resources:
- [Practical Byzantine Fault Tolerance](https://pmg.csail.mit.edu/papers/osdi99.pdf)
- [Zyzzyva](https://www.usenix.org/legacy/event/osdi07/tech/full_papers/kotla/kotla.pdf)

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/distributed-systems-visualizer.git
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
4. Ask Claude for explanations or quizzes.

### Enabling AI Explanations

1. Click "Set API Key" in the top-right corner
2. Enter your Anthropic API key (get one at [https://console.anthropic.com](https://console.anthropic.com))
3. Your key is stored locally in your browser and never sent to our servers
4. Now you can ask Claude questions about the simulation and take AI-generated quizzes!

### Export & Share

Export your visualizations in multiple formats:

- **PNG Export**: High-quality 2x resolution images perfect for presentations
- **SVG Export**: Scalable vector graphics for editing and scaling
- **JSON Export**: Save the current state as JSON for analysis
- **Share**: Use the system share dialog to share via email, messages, etc.
- **Copy Link**: Copy the current page URL to clipboard
- **Copy State**: Copy the current state data to clipboard

Click the "Export" button in the header of Raft, Paxos, or CAP Theorem visualizers to access these options.

### Progress Tracking

Track your learning journey:

- **View Progress**: Click the "Progress" button in the top navigation
- **Achievements**: Unlock 9 achievements by completing scenarios, quizzes, and concepts
- **Statistics**: See your total time spent, quiz scores, and completion percentages
- **Export/Import**: Backup your progress or transfer it between devices

## 🏗️ Architecture

### Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **AI Integration**: Anthropic Claude API (client-side)
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
