'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { SimulationEngine } from '@/lib/simulation-engine';
import { SimulationEvent, SimulationState } from '@/lib/types';

export function useSimulation(initialEvents: SimulationEvent[] = []) {
  const engineRef = useRef<SimulationEngine>(new SimulationEngine(initialEvents));
  const [state, setState] = useState<SimulationState>(engineRef.current.getState());
  const [customState, setCustomState] = useState<any>(null);

  // Update state from engine
  const updateState = useCallback(() => {
    setState(engineRef.current.getState());
  }, []);

  // Play simulation
  const play = useCallback(() => {
    engineRef.current.play();
    updateState();
  }, [updateState]);

  // Pause simulation
  const pause = useCallback(() => {
    engineRef.current.pause();
    updateState();
  }, [updateState]);

  // Step forward
  const stepForward = useCallback(() => {
    const success = engineRef.current.stepForward(customState);
    updateState();
    return success;
  }, [updateState, customState]);

  // Step backward
  const stepBackward = useCallback(() => {
    const previousState = engineRef.current.stepBackward();
    if (previousState) {
      setCustomState(previousState);
    }
    updateState();
    return previousState;
  }, [updateState]);

  // Reset simulation
  const reset = useCallback(() => {
    engineRef.current.reset();
    setCustomState(null);
    updateState();
  }, [updateState]);

  // Set speed
  const setSpeed = useCallback(
    (multiplier: number) => {
      engineRef.current.setSpeed(multiplier);
      updateState();
    },
    [updateState]
  );

  // Jump to event
  const jumpToEvent = useCallback(
    (eventId: number) => {
      engineRef.current.jumpToEvent(eventId, customState);
      updateState();
    },
    [updateState, customState]
  );

  // Set events
  const setEvents = useCallback(
    (events: SimulationEvent[]) => {
      engineRef.current.setEvents(events);
      updateState();
    },
    [updateState]
  );

  // Register event handler
  const onEvent = useCallback((eventType: string, handler: (event: SimulationEvent) => void) => {
    engineRef.current.on(eventType, handler);
  }, []);

  // Get current event
  const getCurrentEvent = useCallback(() => {
    return engineRef.current.getCurrentEvent();
  }, []);

  // Check if complete
  const isComplete = useCallback(() => {
    return engineRef.current.isComplete();
  }, []);

  // Get progress
  const getProgress = useCallback(() => {
    return engineRef.current.getProgress();
  }, []);

  return {
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
  };
}
