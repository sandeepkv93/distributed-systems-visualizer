# Distributed Systems Visualizer

An interactive learning platform for understanding distributed systems concepts through visual animations, step-by-step execution, and AI-powered explanations.

![Distributed Systems Visualizer](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwind-css)

## 🌟 Features

- **Interactive Visualizations**: Play, pause, and step through distributed systems algorithms in real-time
- **AI-Powered Explanations**: Get instant explanations powered by Claude AI for any state or event
- **Pre-built Scenarios**: Learn from carefully crafted edge cases and failure scenarios
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

7. **CAP Theorem** - Interactive exploration of distributed systems trade-offs
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
4. Now you can ask Claude questions about the simulation!

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
│   ├── paxos/               # Paxos page (coming soon)
│   └── ...
├── components/              # Reusable React components
│   ├── Navigation.tsx       # Top navigation bar
│   ├── ControlPanel.tsx     # Playback controls
│   └── ExplanationPanel.tsx # AI explanation display
├── lib/                     # Core library code
│   ├── algorithms/          # Algorithm implementations
│   │   ├── raft.ts         # Raft consensus logic
│   │   └── ...
│   ├── types.ts            # TypeScript type definitions
│   ├── simulation-engine.ts # Generic simulation engine
│   └── claude-api.ts       # Claude API integration
├── hooks/                   # Custom React hooks
│   ├── useSimulation.ts    # Simulation state management
│   └── useClaudeExplainer.ts # AI explanation hook
├── visualizers/             # Concept-specific visualizers
│   ├── raft/
│   │   └── scenarios.ts    # Pre-built Raft scenarios
│   └── ...
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
