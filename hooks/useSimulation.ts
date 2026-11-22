'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { SimulationEngine } from '@/lib/simulation-engine';
import { SnapshotAdapter } from '@/lib/snapshot';
import { SimulationEvent, SimulationState } from '@/lib/types';

export interface UseSimulationOptions<TSnapshot = unknown> {
  snapshot?: SnapshotAdapter<TSnapshot>;
}

export function useSimulation<TSnapshot = unknown>(
  initialEvents: SimulationEvent[] = [],
  options?: UseSimulationOptions<TSnapshot>
) {
  const engineRef = useRef<SimulationEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new SimulationEngine(initialEvents);
  }

  const snapshotRef = useRef<SnapshotAdapter<TSnapshot> | undefined>(options?.snapshot);
  const pendingTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const [state, setState] = useState<SimulationState>(() => engineRef.current!.getState());
  const [customState, setCustomState] = useState<unknown>(null);

  const clearScheduledTimeouts = useCallback(() => {
    pendingTimersRef.current.forEach((timerId) => {
      clearTimeout(timerId);
    });
    pendingTimersRef.current.clear();
  }, []);

  const scheduleTimeout = useCallback((callback: () => void, delayMs: number) => {
    const timerId = setTimeout(() => {
      pendingTimersRef.current.delete(timerId);
      callback();
    }, delayMs);
    pendingTimersRef.current.add(timerId);
    return timerId;
  }, []);

  // Keep latest snapshot adapter in ref so closures never go stale
  useEffect(() => {
    snapshotRef.current = options?.snapshot;
  }, [options?.snapshot]);

  // Subscribe to engine state updates and register snapshot adapter; clean up on unmount
  useEffect(() => {
    const engine = engineRef.current!;

    engine.setSnapshotAdapter({
      capture: () => snapshotRef.current?.capture(),
      restore: (snapshot) => {
        clearScheduledTimeouts();
        snapshotRef.current?.restore(snapshot as TSnapshot);
      },
    });

    const unsubscribe = engine.subscribe((nextState) => {
      setState(nextState);
    });

    return () => {
      unsubscribe();
      engine.pause();
      engine.setSnapshotAdapter(null);
      clearScheduledTimeouts();
    };
  }, [clearScheduledTimeouts]);

  // Play simulation
  const play = useCallback(() => {
    engineRef.current!.play();
  }, []);

  // Pause simulation
  const pause = useCallback(() => {
    engineRef.current!.pause();
  }, []);

  // Step forward
  const stepForward = useCallback(() => {
    const fallbackSnapshot = snapshotRef.current ? undefined : customState ?? undefined;
    return engineRef.current!.stepForward(fallbackSnapshot);
  }, [customState]);

  // Step backward
  const stepBackward = useCallback(() => {
    clearScheduledTimeouts();
    const previousState = engineRef.current!.stepBackward();
    if (!snapshotRef.current && previousState !== null) {
      setCustomState(previousState);
    }
    return previousState;
  }, [clearScheduledTimeouts]);

  // Reset simulation
  const reset = useCallback(() => {
    clearScheduledTimeouts();
    engineRef.current!.reset();
    setCustomState(null);
  }, [clearScheduledTimeouts]);

  // Set speed
  const setSpeed = useCallback((multiplier: number) => {
    engineRef.current!.setSpeed(multiplier);
  }, []);

  // Jump to event
  const jumpToEvent = useCallback(
    (eventId: number) => {
      clearScheduledTimeouts();
      const fallbackSnapshot = snapshotRef.current ? undefined : customState ?? undefined;
      engineRef.current!.jumpToEvent(eventId, fallbackSnapshot);
    },
    [clearScheduledTimeouts, customState]
  );

  // Set events
  const setEvents = useCallback(
    (events: SimulationEvent[]) => {
      clearScheduledTimeouts();
      engineRef.current!.setEvents(events);
    },
    [clearScheduledTimeouts]
  );

  // Register event handler
  const onEvent = useCallback((eventType: string, handler: (event: SimulationEvent) => void) => {
    engineRef.current!.on(eventType, handler);
  }, []);

  // Get current event
  const getCurrentEvent = useCallback(() => {
    return engineRef.current!.getCurrentEvent();
  }, []);

  // Check if complete
  const isComplete = useCallback(() => {
    return engineRef.current!.isComplete();
  }, []);

  // Get progress
  const getProgress = useCallback(() => {
    return engineRef.current!.getProgress();
  }, []);

  return useMemo(
    () => ({
      state,
      customState,
      setCustomState,
      play,
      pause,
      stepForward,
      stepBackward,
      reset,
      setSpeed,
      jumpToEvent,
      setEvents,
      onEvent,
      getCurrentEvent,
      isComplete,
      getProgress,
      scheduleTimeout,
      clearScheduledTimeouts,
    }),
    [
      state,
      customState,
      play,
      pause,
      stepForward,
      stepBackward,
      reset,
      setSpeed,
      jumpToEvent,
      setEvents,
      onEvent,
      getCurrentEvent,
      isComplete,
      getProgress,
      scheduleTimeout,
      clearScheduledTimeouts,
    ]
  );
}
