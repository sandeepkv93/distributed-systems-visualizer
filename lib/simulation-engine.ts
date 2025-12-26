import { SimulationEvent, SimulationState } from './types';

export class SimulationEngine {
  private state: SimulationState;
  private eventHandlers: Map<string, (event: SimulationEvent) => void>;
  private timerId: NodeJS.Timeout | null = null;
  private stateHistory: any[] = [];

  constructor(events: SimulationEvent[] = []) {
    this.state = {
      isPlaying: false,
      speed: 1,
      currentEventIndex: 0,
      events,
    };
    this.eventHandlers = new Map();
  }

  // Register event handlers
  on(eventType: string, handler: (event: SimulationEvent) => void) {
    this.eventHandlers.set(eventType, handler);
  }

  // Get current state
  getState(): SimulationState {
    return { ...this.state };
  }

  // Set events
  setEvents(events: SimulationEvent[]) {
    this.state.events = events;
    this.state.currentEventIndex = 0;
    this.stateHistory = [];
  }

  // Save current state to history
  private saveStateToHistory(stateSnapshot: any) {
    this.stateHistory.push(stateSnapshot);
  }

  // Get state from history
  private getStateFromHistory(index: number): any {
    return this.stateHistory[index];
  }

  // Play simulation
  play() {
    if (this.state.isPlaying) return;

    this.state.isPlaying = true;
    this.runSimulation();
  }

  // Pause simulation
  pause() {
    this.state.isPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  // Step forward one event
  stepForward(stateSnapshot?: any) {
    if (this.state.currentEventIndex >= this.state.events.length) {
      return false;
    }

    const event = this.state.events[this.state.currentEventIndex];

    // Save state before executing event
    if (stateSnapshot) {
      this.saveStateToHistory(stateSnapshot);
    }

    // Execute event handler
    const handler = this.eventHandlers.get(event.type);
    if (handler) {
      handler(event);
    }

    this.state.currentEventIndex++;
    return true;
  }

  // Step backward one event
  stepBackward(): any | null {
    if (this.state.currentEventIndex <= 0) {
      return null;
    }

    this.state.currentEventIndex--;

    // Restore previous state
    const previousState = this.getStateFromHistory(this.state.currentEventIndex);
    this.stateHistory.pop(); // Remove last state from history

    return previousState;
  }

  // Reset simulation
  reset() {
    this.pause();
    this.state.currentEventIndex = 0;
    this.stateHistory = [];
  }

  // Set playback speed
  setSpeed(multiplier: number) {
    this.state.speed = Math.max(0.5, Math.min(5, multiplier));
  }

  // Jump to specific event
  jumpToEvent(eventId: number, stateSnapshot?: any) {
    const targetIndex = this.state.events.findIndex((e) => e.id === eventId);
    if (targetIndex === -1) return;

    if (targetIndex < this.state.currentEventIndex) {
      // Going backward - need to reset and replay
      this.reset();
      while (this.state.currentEventIndex < targetIndex) {
        this.stepForward(stateSnapshot);
      }
    } else {
      // Going forward
      while (this.state.currentEventIndex < targetIndex) {
        this.stepForward(stateSnapshot);
      }
    }
  }

  // Run simulation loop
  private runSimulation() {
    if (!this.state.isPlaying) return;

    const hasMore = this.stepForward();

    if (!hasMore) {
      this.pause();
      return;
    }

    // Calculate delay based on speed
    const baseDelay = 1000; // 1 second per event at 1x speed
    const delay = baseDelay / this.state.speed;

    this.timerId = setTimeout(() => {
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
