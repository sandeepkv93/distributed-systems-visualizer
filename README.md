# Distributed Systems Visualizer

An interactive learning platform for understanding distributed systems concepts through visual animations, step-by-step execution, and AI-powered explanations.

![Distributed Systems Visualizer](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwind-css)

## 🌟 Features

- **Interactive Visualizations**: Play, pause, and step through distributed systems algorithms in real-time
- **AI-Powered Explanations**: Get instant explanations powered by Claude AI for any state or event
- **AI-Generated Quizzes**: Test your understanding with Claude-powered quizzes tailored to each concept
- **Progress Tracking**: Track completed scenarios, quizzes, and unlock achievements
- **Export & Share**: Export visualizations as PNG, SVG, or share via system dialog
- **Pre-built Scenarios**: Learn from carefully crafted edge cases and failure scenarios (33 total!)
- **Manual Controls**: Inject failures, trigger events, and experiment with different configurations
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Static Export**: Deployable to GitHub Pages with zero backend dependencies

## 📚 Concepts Covered

### ✅ All Visualizers Implemented!

1. **Raft Consensus** - Leader election, log replication, and failover scenarios
   - 5 scenarios covering elections, failures, partitions, and replication

2. **Paxos Consensus** - Two-phase distributed consensus protocol
   - 5 scenarios including dueling proposers, acceptor failures, and Multi-Paxos

3. **Vector Clocks** - Causality tracking and concurrent event detection
   - 5 scenarios demonstrating happened-before relationships and concurrency

4. **Consistent Hashing** - Data partitioning with minimal redistribution
   - 6 scenarios showing virtual nodes, server scaling, and load distribution

5. **Two-Phase Commit (2PC)** - Atomic distributed transaction protocol
   - 6 scenarios covering successful commits, aborts, failures, and recovery

6. **Eventual Consistency** - Asynchronous replication with tunable consistency
   - 6 scenarios exploring ONE/QUORUM/ALL levels, conflicts, and anti-entropy

7. **Gossip & Anti-Entropy** - Epidemic-style state exchange for convergence
   - Scenarios covering push, pull, and push-pull rounds

8. **Chandy-Lamport Snapshot** - Consistent global snapshots with marker messages
   - Scenarios showing in-transit message capture and marker propagation

9. **Lamport Clocks + Total Order Broadcast** - Logical clocks with a total delivery order
   - Scenarios covering local events, broadcasts, and tie-breaking

10. **Quorum Replication + Read Repair** - Read/write quorums that heal stale replicas
   - Scenarios showing successful writes, quorum failures, and repair

11. **PBFT Consensus** - Byzantine fault tolerance with view changes
   - Scenarios covering normal case and leader replacement

12. **Distributed Locking + Leases** - Lock manager with heartbeats and timeouts
   - Scenarios showing acquisition, renewal, expiry, and contention

13. **Sharding + Rebalancing** - Range vs hash sharding under scale changes
   - Scenarios showing node add/remove and data movement

14. **Merkle Tree Anti-Entropy** - Hash-based divergence detection and repair
   - Scenarios showing root comparison and leaf synchronization

15. **CRDTs** - Conflict-free replicated data types (G-Counter, OR-Set, RGA)
   - Scenarios showing merge convergence across replicas

16. **Replication Log (Kafka-style)** - Partition replication with ISR and HW
   - Scenarios showing ISR shrink and rejoin

17. **Failure Detectors** - Phi accrual and SWIM-style probing
   - Scenarios showing suspicion and confirmation

18. **CAP Theorem** - Interactive exploration of distributed systems trade-offs
   - Triangle visualization with real-world database systems (MongoDB, Cassandra, etc.)
   - Educational content explaining CA, CP, and AP combinations

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

### Basic Workflow

1. **Choose a Concept**: Select from the available distributed systems concepts on the home page
2. **Select a Scenario** (Optional): Pick a pre-built scenario from the control panel to see specific behaviors
3. **Control Playback**: Use play/pause/step controls to navigate through the simulation
4. **Interact**: Click nodes to fail/recover them, trigger elections, or add client requests
5. **Ask Questions**: Use the "Ask Claude" feature to get explanations about what's happening

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

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Visualizations**: SVG with motion animations
- **State Management**: React Hooks + Custom simulation engine
- **AI Integration**: Anthropic Claude API (client-side)
- **Icons**: Lucide React

### Project Structure

```
distributed-systems-visualizer/
├── app/                      # Next.js pages
│   ├── raft/                # Raft consensus page
│   ├── paxos/               # Paxos consensus page
│   ├── vector-clocks/       # Vector clocks page
│   ├── consistent-hashing/  # Consistent hashing page
│   ├── two-phase-commit/    # 2PC page
│   ├── eventual-consistency/# Eventual consistency page
│   ├── cap-theorem/         # CAP theorem page
│   └── page.tsx             # Home page
├── components/              # Reusable React components
│   ├── Navigation.tsx       # Top navigation bar
│   ├── ControlPanel.tsx     # Playback controls
│   ├── ExplanationPanel.tsx # AI explanation display
│   ├── ExportMenu.tsx       # Export/share menu
│   ├── QuizComponent.tsx    # AI-powered quiz interface
│   └── ProgressDashboard.tsx # Progress tracking dashboard
├── lib/                     # Core library code
│   ├── algorithms/          # Algorithm implementations
│   │   ├── raft.ts         # Raft consensus logic
│   │   ├── paxos.ts        # Paxos consensus logic
│   │   ├── vectorClocks.ts # Vector clocks logic
│   │   ├── consistentHashing.ts # Consistent hashing logic
│   │   ├── twoPhaseCommit.ts # 2PC logic
│   │   └── eventualConsistency.ts # Eventual consistency logic
│   ├── types.ts            # TypeScript type definitions
│   ├── simulation-engine.ts # Generic simulation engine
│   ├── claude-api.ts       # Claude API integration
│   ├── progress.ts         # Progress tracking & achievements
│   └── export.ts           # Export utilities (PNG, SVG, JSON)
├── hooks/                   # Custom React hooks
│   ├── useSimulation.ts    # Simulation state management
│   ├── useClaudeExplainer.ts # AI explanation hook
│   └── useProgress.ts      # Progress tracking hook
├── visualizers/             # Concept-specific visualizers
│   ├── raft/scenarios.ts   # Pre-built Raft scenarios
│   ├── paxos/scenarios.ts  # Pre-built Paxos scenarios
│   ├── vector-clocks/scenarios.ts # Vector clock scenarios
│   ├── consistent-hashing/scenarios.ts # Consistent hashing scenarios
│   ├── two-phase-commit/scenarios.ts # 2PC scenarios
│   └── eventual-consistency/scenarios.ts # Eventual consistency scenarios
└── public/                  # Static assets
```

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

## 📖 Learning Resources

- [Raft Paper](https://raft.github.io/raft.pdf) - In Search of an Understandable Consensus Algorithm
- [Paxos Made Simple](https://lamport.azurewebsites.net/pubs/paxos-simple.pdf) - Leslie Lamport
- [Designing Data-Intensive Applications](https://dataintensive.net/) - Martin Kleppmann

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is open source and available under the MIT License.

---

Made with ❤️ for the distributed systems community
