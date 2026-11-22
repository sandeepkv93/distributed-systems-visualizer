import ConceptGrid from '@/components/ConceptGrid';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-12 text-slate-100">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Distributed Systems Visualizer
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">
            Learn distributed systems concepts through interactive visualizations, step-by-step
            execution, and scenario-driven exploration.
          </p>
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <div className="bg-slate-800/70 border border-slate-700 rounded-lg px-6 py-5">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  1
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Pick a topic</h3>
                  <p className="text-slate-400 text-sm">
                    Choose a visualizer and load a scenario or start exploring manually.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  2
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Run the simulation</h3>
                  <p className="text-slate-400 text-sm">
                    Play, pause, step, and inject failures to see protocol behavior.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  3
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Ask and validate</h3>
                  <p className="text-slate-400 text-sm">
                    Compare scenarios, inject failures, and validate your understanding.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Concepts Grid */}
        <div>
          <h2 className="text-3xl font-bold mb-8 text-center text-white">Explore Concepts</h2>
          <ConceptGrid />
        </div>
      </div>
    </div>
  );
}
