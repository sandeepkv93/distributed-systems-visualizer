import { UserProgress } from './types';
import {
  CONCEPTS_BY_ID,
  TOTAL_CONCEPTS,
  TOTAL_SCENARIOS,
  getScenarioKey,
  normalizeConceptId,
} from './catalog';

const PROGRESS_KEY = 'distributed_systems_progress';
const SESSION_START_KEY = 'session_start_time';

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  condition: (progress: UserProgress) => boolean;
}

export interface AchievementStatus {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
}

export interface UnlockedAchievement {
  id: string;
  name: string;
  description: string;
}

export interface ProgressStats {
  totalScenarios: number;
  completedScenarios: number;
  totalConcepts: number;
  completedConcepts: number;
  totalTimeSpent: number;
  achievementsUnlocked: number;
  totalAchievements: number;
}

export interface ProgressStoreSnapshot {
  progress: UserProgress;
  achievements: AchievementStatus[];
  stats: ProgressStats;
}

type ProgressListener = () => void;
type AchievementListener = (unlocked: UnlockedAchievement[]) => void;

const progressListeners = new Set<ProgressListener>();
const achievementListeners = new Set<AchievementListener>();

// Create a fresh default progress object (never share a mutable singleton)
export function createDefaultProgress(): UserProgress {
  return {
    conceptsCompleted: [],
    scenariosCompleted: [],
    timeSpent: {},
    achievements: [],
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.trim().length > 0);
}

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items));
}

// Validate and normalize unknown JSON into a safe UserProgress object
export function validateProgressData(input: unknown): UserProgress | null {
  if (!isPlainObject(input)) {
    return null;
  }

  const { conceptsCompleted, scenariosCompleted, timeSpent, achievements } = input;

  if (!isStringArray(conceptsCompleted)) {
    return null;
  }
  if (!isStringArray(scenariosCompleted)) {
    return null;
  }
  if (!isPlainObject(timeSpent)) {
    return null;
  }
  if (!isStringArray(achievements)) {
    return null;
  }

  const normalizedTimeSpent: Record<string, number> = {};
  for (const [conceptKey, duration] of Object.entries(timeSpent)) {
    if (typeof duration !== 'number' || !Number.isFinite(duration) || duration < 0) {
      return null;
    }
    const normalizedKey = normalizeConceptId(conceptKey);
    normalizedTimeSpent[normalizedKey] = (normalizedTimeSpent[normalizedKey] || 0) + duration;
  }

  return {
    conceptsCompleted: dedupe(conceptsCompleted.map(normalizeConceptId)),
    scenariosCompleted: dedupe(scenariosCompleted),
    timeSpent: normalizedTimeSpent,
    achievements: dedupe(achievements),
  };
}

// Achievement definitions using live catalog totals
const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Complete your first scenario',
    condition: (progress: UserProgress) => progress.scenariosCompleted.length >= 1,
  },
  {
    id: 'scenario_master',
    name: 'Scenario Master',
    description: 'Complete 10 scenarios',
    condition: (progress: UserProgress) => progress.scenariosCompleted.length >= 10,
  },
  {
    id: 'scenario_legend',
    name: 'Scenario Legend',
    description: `Complete all ${TOTAL_SCENARIOS} scenarios`,
    condition: (progress: UserProgress) => progress.scenariosCompleted.length >= TOTAL_SCENARIOS,
  },
  {
    id: 'concept_explorer',
    name: 'Concept Explorer',
    description: 'Complete 3 different concepts',
    condition: (progress: UserProgress) => progress.conceptsCompleted.length >= 3,
  },
  {
    id: 'concept_master',
    name: 'Concept Master',
    description: `Complete all ${TOTAL_CONCEPTS} concepts`,
    condition: (progress: UserProgress) => progress.conceptsCompleted.length >= TOTAL_CONCEPTS,
  },
  {
    id: 'dedicated_learner',
    name: 'Dedicated Learner',
    description: 'Spend 1 hour learning',
    condition: (progress: UserProgress) => {
      const totalTime = Object.values(progress.timeSpent).reduce((sum, time) => sum + time, 0);
      return totalTime >= 3600000; // 1 hour in milliseconds
    },
  },
  {
    id: 'time_traveler',
    name: 'Time Traveler',
    description: 'Spend 5 hours learning',
    condition: (progress: UserProgress) => {
      const totalTime = Object.values(progress.timeSpent).reduce((sum, time) => sum + time, 0);
      return totalTime >= 18000000; // 5 hours in milliseconds
    },
  },
];

function computeAchievements(progress: UserProgress): AchievementStatus[] {
  return ACHIEVEMENTS.map((achievement) => ({
    id: achievement.id,
    name: achievement.name,
    description: achievement.description,
    unlocked: progress.achievements.includes(achievement.id),
  }));
}

function computeStats(progress: UserProgress): ProgressStats {
  const totalTimeSpent = Object.values(progress.timeSpent).reduce((sum, time) => sum + time, 0);

  return {
    totalScenarios: TOTAL_SCENARIOS,
    completedScenarios: progress.scenariosCompleted.length,
    totalConcepts: TOTAL_CONCEPTS,
    completedConcepts: progress.conceptsCompleted.length,
    totalTimeSpent,
    achievementsUnlocked: progress.achievements.length,
    totalAchievements: ACHIEVEMENTS.length,
  };
}

// Cached snapshots for React useSyncExternalStore (referentially stable until mutated)
const SERVER_SNAPSHOT: ProgressStoreSnapshot = (() => {
  const empty = createDefaultProgress();
  return {
    progress: empty,
    achievements: computeAchievements(empty),
    stats: computeStats(empty),
  };
})();

let cachedClientSnapshot: ProgressStoreSnapshot | null = null;

function invalidateSnapshotCache(): void {
  cachedClientSnapshot = null;
}

function notifyProgressListeners(): void {
  invalidateSnapshotCache();
  progressListeners.forEach((listener) => {
    listener();
  });
}

function notifyAchievementListeners(unlocked: UnlockedAchievement[]): void {
  if (unlocked.length === 0) return;
  achievementListeners.forEach((listener) => {
    listener(unlocked);
  });
}

export function subscribeProgress(listener: ProgressListener): () => void {
  progressListeners.add(listener);

  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === PROGRESS_KEY) {
      invalidateSnapshotCache();
      listener();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
  }

  return () => {
    progressListeners.delete(listener);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
    }
  };
}

export function subscribeAchievements(listener: AchievementListener): () => void {
  achievementListeners.add(listener);
  return () => {
    achievementListeners.delete(listener);
  };
}

export function getServerProgressSnapshot(): ProgressStoreSnapshot {
  return SERVER_SNAPSHOT;
}

export function getClientProgressSnapshot(): ProgressStoreSnapshot {
  if (typeof window === 'undefined') {
    return SERVER_SNAPSHOT;
  }
  if (!cachedClientSnapshot) {
    const progress = getProgress();
    cachedClientSnapshot = {
      progress,
      achievements: computeAchievements(progress),
      stats: computeStats(progress),
    };
  }
  return cachedClientSnapshot;
}

// Get user progress from localStorage (always returns a fresh object)
export function getProgress(): UserProgress {
  if (typeof window === 'undefined') return createDefaultProgress();

  try {
    const stored = localStorage.getItem(PROGRESS_KEY);
    if (!stored) return createDefaultProgress();

    const parsed: unknown = JSON.parse(stored);
    const validated = validateProgressData(parsed);
    if (!validated) {
      return createDefaultProgress();
    }
    return validated;
  } catch (error) {
    console.error('Error loading progress:', error);
    return createDefaultProgress();
  }
}

// Save user progress to localStorage
export function saveProgress(progress: UserProgress): void {
  if (typeof window === 'undefined') return;

  try {
    const normalized: UserProgress = {
      conceptsCompleted: dedupe(progress.conceptsCompleted.map(normalizeConceptId)),
      scenariosCompleted: dedupe(progress.scenariosCompleted),
      timeSpent: { ...progress.timeSpent },
      achievements: dedupe(progress.achievements),
    };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(normalized));
    notifyProgressListeners();
  } catch (error) {
    console.error('Error saving progress:', error);
  }
}

// Mark a concept as completed
export function markConceptCompleted(concept: string): void {
  const normalizedConcept = normalizeConceptId(concept);
  const progress = getProgress();

  if (!progress.conceptsCompleted.includes(normalizedConcept)) {
    progress.conceptsCompleted.push(normalizedConcept);
    saveProgress(progress);
    checkAchievements(progress);
  }
}

// Mark a scenario as completed (namespaces with conceptId when provided and auto-completes concepts)
export function markScenarioCompleted(scenarioId: string, conceptId?: string): void {
  const normalizedConcept = conceptId ? normalizeConceptId(conceptId) : undefined;
  const scenarioKey =
    normalizedConcept && !scenarioId.includes(':')
      ? getScenarioKey(normalizedConcept, scenarioId)
      : scenarioId;

  const progress = getProgress();
  let changed = false;

  if (!progress.scenariosCompleted.includes(scenarioKey)) {
    progress.scenariosCompleted.push(scenarioKey);
    changed = true;
  }

  // Derive conceptId from scenarioKey if not explicitly passed
  const resolvedConceptId =
    normalizedConcept ??
    (scenarioKey.includes(':') ? normalizeConceptId(scenarioKey.split(':')[0]) : undefined);

  if (resolvedConceptId) {
    const conceptEntry = CONCEPTS_BY_ID.get(resolvedConceptId);
    if (
      conceptEntry &&
      conceptEntry.scenarioKeys.length > 0 &&
      conceptEntry.scenarioKeys.every((key) => progress.scenariosCompleted.includes(key)) &&
      !progress.conceptsCompleted.includes(resolvedConceptId)
    ) {
      progress.conceptsCompleted.push(resolvedConceptId);
      changed = true;
    }
  }

  if (changed) {
    saveProgress(progress);
    checkAchievements(progress);
  }
}

// Track time spent on a concept
export function startSession(concept: string): void {
  if (typeof window === 'undefined') return;

  const sessionData = {
    concept: normalizeConceptId(concept),
    startTime: Date.now(),
  };

  sessionStorage.setItem(SESSION_START_KEY, JSON.stringify(sessionData));
}

export function endSession(): void {
  if (typeof window === 'undefined') return;

  try {
    const sessionData = sessionStorage.getItem(SESSION_START_KEY);
    if (!sessionData) return;

    const parsed: unknown = JSON.parse(sessionData);
    sessionStorage.removeItem(SESSION_START_KEY);

    if (
      !isPlainObject(parsed) ||
      typeof parsed.concept !== 'string' ||
      typeof parsed.startTime !== 'number' ||
      !Number.isFinite(parsed.startTime)
    ) {
      return;
    }

    const duration = Date.now() - parsed.startTime;
    if (!Number.isFinite(duration) || duration <= 0) {
      return;
    }

    const conceptId = normalizeConceptId(parsed.concept);
    const progress = getProgress();
    progress.timeSpent[conceptId] = (progress.timeSpent[conceptId] || 0) + duration;
    saveProgress(progress);

    // Check for time-based achievements when session ends
    checkAchievements(progress);
  } catch (error) {
    console.error('Error ending session:', error);
  }
}

// Check and award achievements
function checkAchievements(progress: UserProgress): UnlockedAchievement[] {
  const newAchievements: UnlockedAchievement[] = [];

  ACHIEVEMENTS.forEach((achievement) => {
    if (!progress.achievements.includes(achievement.id) && achievement.condition(progress)) {
      progress.achievements.push(achievement.id);
      newAchievements.push({
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
      });
    }
  });

  if (newAchievements.length > 0) {
    saveProgress(progress);
    notifyAchievementListeners(newAchievements);
  }

  return newAchievements;
}

// Get all achievements with unlock status
export function getAllAchievements(): AchievementStatus[] {
  return computeAchievements(getProgress());
}

// Get progress statistics
export function getProgressStats(): ProgressStats {
  return computeStats(getProgress());
}

// Reset all progress
export function resetProgress(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(PROGRESS_KEY);
  sessionStorage.removeItem(SESSION_START_KEY);
  notifyProgressListeners();
}

// Export progress as JSON
export function exportProgress(): string {
  const progress = getProgress();
  return JSON.stringify(progress, null, 2);
}

// Import progress from JSON with strict schema validation
export function importProgress(jsonString: string): boolean {
  try {
    const parsed: unknown = JSON.parse(jsonString);
    const validated = validateProgressData(parsed);
    if (!validated) {
      return false;
    }
    saveProgress(validated);
    checkAchievements(validated);
    return true;
  } catch (error) {
    console.error('Error importing progress:', error);
    return false;
  }
}
