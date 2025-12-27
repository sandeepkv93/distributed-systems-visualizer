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

CAP Theorem, Lamport/Vector Clocks, Chandy-Lamport Snapshot, Eventual Consistency,
CRDTs, Gossip, Merkle Anti-Entropy, Quorum Replication, Replication Log,
Failure Detectors, Consistent Hashing, Sharding + Rebalancing, Load Balancing,
Distributed Locking, 2PC, Distributed Transactions, Network Partitions,
Paxos, Raft, Consensus Variants, PBFT.

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
