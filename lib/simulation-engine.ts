import { SimulationEvent, SimulationState } from './types';
import { SnapshotAdapter } from './snapshot';

export type SimulationStateListener = (state: SimulationState) => void;

export class SimulationEngine {
  private state: SimulationState;
  private eventHandlers: Map<string, (event: SimulationEvent) => void>;
  private listeners: Set<SimulationStateListener>;
  private snapshotAdapter: SnapshotAdapter | null = null;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private stateHistory: unknown[] = [];

  constructor(events: SimulationEvent[] = []) {
    this.state = {
      isPlaying: false,
      speed: 1,
      currentEventIndex: 0,
      events: [...events],
    };
    this.eventHandlers = new Map();
    this.listeners = new Set();
  }

  // Subscribe to simulation state changes
  subscribe(listener: SimulationStateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Notify all subscribers of current state
  private notify(): void {
    const snapshot = this.getState();
    this.listeners.forEach((listener) => {
      listener(snapshot);
    });
  }

  // Register a snapshot adapter for real algorithm state capture/restore
  setSnapshotAdapter(adapter: SnapshotAdapter | null): void {
    this.snapshotAdapter = adapter;
  }

  // Register event handlers
  on(eventType: string, handler: (event: SimulationEvent) => void): void {
    this.eventHandlers.set(eventType, handler);
  }

  // Get current state
  getState(): SimulationState {
    return { ...this.state };
  }

  // Set events
  setEvents(events: SimulationEvent[]): void {
    this.stopTimer();
    this.state.isPlaying = false;
    this.state.events = [...events];
    this.state.currentEventIndex = 0;
    this.stateHistory = [];
    this.notify();
  }

  // Clear pending playback timer without notifying
  private stopTimer(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  // Save current state to history
  private saveStateToHistory(stateSnapshot: unknown): void {
    this.stateHistory.push(stateSnapshot);
  }

  // Play simulation
  play(): void {
    if (this.state.isPlaying) return;
    if (this.state.events.length === 0 || this.isComplete()) {
      return;
    }

    this.state.isPlaying = true;
    this.notify();
    this.runSimulation();
  }

  // Pause simulation
  pause(): void {
    const wasPlaying = this.state.isPlaying;
    this.state.isPlaying = false;
    this.stopTimer();
    if (wasPlaying) {
      this.notify();
    }
  }

  // Step forward one event
  stepForward(stateSnapshot?: unknown): boolean {
    if (this.state.currentEventIndex >= this.state.events.length) {
      return false;
    }

    const event = this.state.events[this.state.currentEventIndex];

    // Capture state before executing event
    const snapshotToSave =
      stateSnapshot !== undefined
        ? stateSnapshot
        : this.snapshotAdapter
        ? this.snapshotAdapter.capture()
        : undefined;

    if (snapshotToSave !== undefined) {
      this.saveStateToHistory(snapshotToSave);
    }

    // Execute event handler
    const handler = this.eventHandlers.get(event.type);
    if (handler) {
      handler(event);
    }

    this.state.currentEventIndex++;
    this.notify();
    return true;
  }

  // Step backward one event
  stepBackward(): unknown | null {
    if (this.state.currentEventIndex <= 0) {
      return null;
    }

    // Pause autoplay when stepping backward manually
    this.state.isPlaying = false;
    this.stopTimer();

    this.state.currentEventIndex--;

    // Restore previous state
    const previousState =
      this.stateHistory.length > this.state.currentEventIndex
        ? this.stateHistory.pop()
        : undefined;

    if (previousState !== undefined && this.snapshotAdapter) {
      this.snapshotAdapter.restore(previousState);
    }

    this.notify();
    return previousState ?? null;
  }

  // Reset simulation
  reset(): void {
    this.state.isPlaying = false;
    this.stopTimer();
    this.state.currentEventIndex = 0;
    this.stateHistory = [];
    this.notify();
  }

  // Set playback speed
  setSpeed(multiplier: number): void {
    this.state.speed = Math.max(0.5, Math.min(5, multiplier));
    this.notify();
  }

  // Jump to a specific step index (0 = initial state, k = after k events executed)
  jumpToStep(stepIndex: number, stateSnapshot?: unknown): void {
    const targetIndex = Math.max(0, Math.min(this.state.events.length, stepIndex));
    if (targetIndex === this.state.currentEventIndex) return;

    this.state.isPlaying = false;
    this.stopTimer();

    if (targetIndex < this.state.currentEventIndex) {
      if (this.stateHistory.length > targetIndex) {
        const snapshot = this.stateHistory[targetIndex];
        this.stateHistory.length = targetIndex;
        this.state.currentEventIndex = targetIndex;
        if (snapshot !== undefined && this.snapshotAdapter) {
          this.snapshotAdapter.restore(snapshot);
        }
        this.notify();
      } else {
        this.reset();
        while (this.state.currentEventIndex < targetIndex) {
          this.stepForward(stateSnapshot);
        }
      }
    } else {
      while (this.state.currentEventIndex < targetIndex) {
        this.stepForward(stateSnapshot);
      }
    }
  }

  // Jump to specific event by ID
  jumpToEvent(eventId: number, stateSnapshot?: unknown): void {
    const targetIndex = this.state.events.findIndex((e) => e.id === eventId);
    if (targetIndex === -1) return;
    this.jumpToStep(targetIndex, stateSnapshot);
  }

  // Run simulation loop
  private runSimulation(): void {
    if (!this.state.isPlaying) return;

    const hasMore = this.stepForward();

    if (!hasMore || this.isComplete()) {
      this.pause();
      return;
    }

    // Calculate delay based on speed
    const baseDelay = 1000; // 1 second per event at 1x speed
    const delay = baseDelay / this.state.speed;

    this.timerId = setTimeout(() => {
      this.timerId = null;
      this.runSimulation();
    }, delay);
  }

  // Get current event
  getCurrentEvent(): SimulationEvent | null {
    if (this.state.currentEventIndex >= this.state.events.length) {
      return null;
    }
    return this.state.events[this.state.currentEventIndex];
  }

  // Check if simulation is complete
  isComplete(): boolean {
    return this.state.currentEventIndex >= this.state.events.length;
  }

  // Get progress percentage
  getProgress(): number {
    if (this.state.events.length === 0) return 0;
    return (this.state.currentEventIndex / this.state.events.length) * 100;
  }
}
