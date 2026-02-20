'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { LoadBalancingAlgorithm } from '@/lib/algorithms/loadBalancing';
import { useSimulation } from '@/hooks/useSimulation';
import ControlPanel from '@/components/ControlPanel';
import TopicArticleDrawer from '@/components/TopicArticleDrawer';
import { topicArticles } from '@/data/topic-articles';
import ExportMenu from '@/components/ExportMenu';
import { loadBalancingScenarios } from '@/visualizers/load-balancing/scenarios';
import { LoadMessage, LoadRequest, LoadWorker } from '@/lib/types';
import { motion } from 'framer-motion';

export default function LoadBalancingPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [lb] = useState(() => new LoadBalancingAlgorithm(4));
  const [workers, setWorkers] = useState<LoadWorker[]>(lb.getWorkers());
  const [requests, setRequests] = useState<LoadRequest[]>(lb.getRequests());
  const [messages, setMessages] = useState<LoadMessage[]>(lb.getMessages());
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [showArticle, setShowArticle] = useState(false);

  const simulation = useSimulation([]);

  const updateVisualization = useCallback(() => {
    lb.tick();
    setWorkers([...lb.getWorkers()]);
    setRequests([...lb.getRequests()]);
    setMessages([...lb.getMessages()]);

    const inFlight = lb.getMessages().filter((m) => m.status === 'in-flight');
    if (inFlight.length > 0) {
      setTimeout(() => {
        inFlight.forEach((msg) => lb.deliverMessage(msg.id));
        updateVisualization();
      }, 400);
    }
  }, [lb]);

  useEffect(() => {
    simulation.onEvent('request', (event) => {
      lb.enqueueRequest(event.data.latency || 2);
      updateVisualization();
    });

    simulation.onEvent('burst', (event) => {
      for (let i = 0; i < (event.data.count || 5); i += 1) {
        lb.enqueueRequest(event.data.latency || 2);
      }
      updateVisualization();
    });

    simulation.onEvent('tick', () => {
      lb.tick();
      updateVisualization();
    });

    simulation.onEvent('fail_worker', (event) => {
      lb.failWorker(event.data.workerId);
      updateVisualization();
    });

    simulation.onEvent('recover_worker', (event) => {
      lb.recoverWorker(event.data.workerId);
      updateVisualization();
    });
  }, [lb, simulation, updateVisualization]);

  const handleScenarioChange = (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    const scenario = loadBalancingScenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      lb.reset();
      simulation.setEvents(scenario.events);
      updateVisualization();
    }
  };

  const sendRequest = () => {
    lb.enqueueRequest(2);
    updateVisualization();
  };

  const burst = () => {
    for (let i = 0; i < 8; i += 1) {
      lb.enqueueRequest(3);
    }
    updateVisualization();
  };

  const tick = () => {
    lb.tick();
    updateVisualization();
  };

  const toggleWorker = (workerId: string) => {
    const worker = workers.find((w) => w.id === workerId);
    if (!worker) return;
    if (worker.loadStatus === 'failed') {
      lb.recoverWorker(workerId);
    } else {
      lb.failWorker(workerId);
    }
    updateVisualization();
  };

  const getWorkerColor = (worker: LoadWorker): string => {
    if (worker.loadStatus === 'failed') return '#EF4444';
    if (worker.loadStatus === 'overloaded') return '#F59E0B';
    return '#10B981';
  };

  const stats = lb.getStats();

  return (
    <div className="flex h-screen bg-slate-900">
      <ControlPanel
        isPlaying={simulation.state.isPlaying}
        speed={simulation.state.speed}
        progress={simulation.getProgress()}
        scenarios={loadBalancingScenarios}
        selectedScenario={selectedScenario}
        onPlay={simulation.play}
        onPause={simulation.pause}
        onStepForward={simulation.stepForward}
        onStepBackward={simulation.stepBackward}
        onReset={() => {
          simulation.reset();
          lb.reset();
          updateVisualization();
        }}
        onSpeedChange={simulation.setSpeed}
        onScenarioChange={handleScenarioChange}
      />

      <div className="flex-1 flex flex-col">
        <div className="bg-slate-800 border-b border-slate-700 p-4">
          <h1 className="text-2xl font-bold text-white">Load Balancing + Backpressure</h1>
          <p className="text-slate-400 text-sm mt-1">
            Dispatch requests to workers while protecting queues
          </p>
          <div className="mt-3">
            <button
              onClick={() => setShowArticle(true)}
              className="px-3 py-1 text-sm bg-slate-700 text-white rounded hover:bg-slate-600"
            >
              Read the theory
            </button>
          </div>
          <div className="flex gap-6 mt-3 text-sm">
            <span className="text-slate-300">
              Total: <span className="font-semibold text-white">{stats.totalRequests}</span>
            </span>
            <span className="text-slate-300">
              In Flight: <span className="font-semibold text-amber-400">{stats.inFlight}</span>
            </span>
            <span className="text-slate-300">
              Dropped: <span className="font-semibold text-red-400">{stats.dropped}</span>
            </span>
            <span className="text-slate-300">
              Completed: <span className="font-semibold text-green-400">{stats.completed}</span>
            </span>
          </div>
        </div>

        <div className="flex-1 relative bg-slate-900 overflow-hidden">
          <div className="absolute top-4 right-4 z-20">
            <ExportMenu
              svgRef={svgRef}
              concept="Load Balancing + Backpressure"
              currentState={{ scenario: selectedScenario }}
            />
          </div>

          <svg ref={svgRef} className="w-full h-full">
            {workers.map((worker, index) => (
              <motion.g
                key={worker.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
              >
                <circle
                  cx={worker.position.x}
                  cy={worker.position.y}
                  r="45"
                  fill={getWorkerColor(worker)}
                  stroke="#1F2937"
                  strokeWidth="3"
                  className="cursor-pointer"
                  onClick={() => toggleWorker(worker.id)}
                />
                <text
                  x={worker.position.x}
                  y={worker.position.y - 10}
                  textAnchor="middle"
                  fill="#FFF"
                  fontSize="14"
                  fontWeight="bold"
                >
                  {worker.id}
                </text>
                <text
                  x={worker.position.x}
                  y={worker.position.y + 6}
                  textAnchor="middle"
                  fill="#E2E8F0"
                  fontSize="10"
                >
                  q{worker.queue} / p{worker.processing}
                </text>
              </motion.g>
            ))}

            {messages
              .filter((m) => m.status === 'in-flight')
              .map((message) => (
                <g key={message.id}>
                  <motion.line
                    x1={420}
                    y1={340}
                    x2={workers.find((w) => w.id === message.to)?.position.x || 420}
                    y2={workers.find((w) => w.id === message.to)?.position.y || 340}
                    stroke="#3B82F6"
                    strokeWidth="2"
                    strokeDasharray="6,6"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.4 }}
                  />
                  <motion.circle
                    cx={(workers.find((w) => w.id === message.to)?.position.x || 420 + 420) / 2}
                    cy={(workers.find((w) => w.id === message.to)?.position.y || 340 + 340) / 2}
                    r="6"
                    fill="#3B82F6"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                </g>
              ))}
          </svg>

          <div className="absolute bottom-4 left-4 bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-2 max-w-xs">
            <h3 className="text-sm font-semibold text-white">Manual Controls</h3>
            <button
              onClick={sendRequest}
              className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Send Request
            </button>
            <button
              onClick={burst}
              className="w-full px-3 py-2 bg-amber-600 text-white text-sm rounded hover:bg-amber-700"
            >
              Burst Requests
            </button>
            <button
              onClick={tick}
              className="w-full px-3 py-2 bg-slate-600 text-white text-sm rounded hover:bg-slate-700"
            >
              Tick
            </button>
            <p className="text-xs text-slate-400">Click workers to fail/recover.</p>
          </div>

          <div className="absolute top-4 right-4 bg-slate-800 rounded-lg p-4 border border-slate-700 max-w-sm max-h-96 overflow-y-auto">
            <h3 className="text-sm font-semibold text-white mb-2">Requests</h3>
            <div className="space-y-2">
              {requests.slice(-10).map((req) => (
                <div key={req.id} className="text-xs text-slate-300">
                  {req.id} · {req.status} · {req.assignedTo || 'none'}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <TopicArticleDrawer
        open={showArticle}
        title={topicArticles['load-balancing'].title}
        onClose={() => setShowArticle(false)}
      >
        {topicArticles['load-balancing'].sections.map((section) => (
          <div key={section.heading} className="mb-5">
            <h3 className="text-base font-semibold text-white mb-2">{section.heading}</h3>
            {section.body.map((para) => (
              <p key={para} className="text-sm text-slate-300 mb-2">
                {para}
              </p>
            ))}
          </div>
        ))}
      </TopicArticleDrawer>
    </div>
  );
}
