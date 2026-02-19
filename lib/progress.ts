import { UserProgress } from './types';

const PROGRESS_KEY = 'distributed_systems_progress';
const SESSION_START_KEY = 'session_start_time';

// Initialize default progress
const defaultProgress: UserProgress = {
  conceptsCompleted: [],
  scenariosCompleted: [],
  quizScores: {},
  timeSpent: {},
  achievements: [],
};

// Get user progress from localStorage
export function getProgress(): UserProgress {
  if (typeof window === 'undefined') return defaultProgress;

  try {
    const stored = localStorage.getItem(PROGRESS_KEY);
    if (!stored) return defaultProgress;

    const progress = JSON.parse(stored);
    return { ...defaultProgress, ...progress };
  } catch (error) {
    console.error('Error loading progress:', error);
    return defaultProgress;
  }
}

// Save user progress to localStorage
export function saveProgress(progress: UserProgress): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Error saving progress:', error);
  }
}

// Mark a concept as completed
export function markConceptCompleted(concept: string): void {
  const progress = getProgress();

  if (!progress.conceptsCompleted.includes(concept)) {
    progress.conceptsCompleted.push(concept);
    saveProgress(progress);

    // Check for achievements
    checkAchievements(progress);
  }
}

// Mark a scenario as completed
export function markScenarioCompleted(scenarioId: string): void {
  const progress = getProgress();

  if (!progress.scenariosCompleted.includes(scenarioId)) {
    progress.scenariosCompleted.push(scenarioId);
    saveProgress(progress);

    // Check for achievements
    checkAchievements(progress);
  }
}

// Save quiz score
export function saveQuizScore(quizId: string, score: number): void {
  const progress = getProgress();

  // Update score if it's higher than previous
  const previousScore = progress.quizScores[quizId] || 0;
  if (score > previousScore) {
    progress.quizScores[quizId] = score;
    saveProgress(progress);

    // Check for achievements
    checkAchievements(progress);
  }
}

// Track time spent on a concept
export function startSession(concept: string): void {
  if (typeof window === 'undefined') return;

  const sessionData = {
    concept,
    startTime: Date.now(),
  };

  sessionStorage.setItem(SESSION_START_KEY, JSON.stringify(sessionData));
}

export function endSession(): void {
  if (typeof window === 'undefined') return;

  try {
    const sessionData = sessionStorage.getItem(SESSION_START_KEY);
    if (!sessionData) return;

    const { concept, startTime } = JSON.parse(sessionData);
    const duration = Date.now() - startTime;

    const progress = getProgress();
    progress.timeSpent[concept] = (progress.timeSpent[concept] || 0) + duration;
    saveProgress(progress);

    sessionStorage.removeItem(SESSION_START_KEY);
  } catch (error) {
    console.error('Error ending session:', error);
  }
}

// Achievement definitions
const achievements = [
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
    description: 'Complete all 33 scenarios',
    condition: (progress: UserProgress) => progress.scenariosCompleted.length >= 33,
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
    description: 'Complete all 7 concepts',
    condition: (progress: UserProgress) => progress.conceptsCompleted.length >= 7,
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

// Check and award achievements
function checkAchievements(progress: UserProgress): void {
  const newAchievements: string[] = [];

  achievements.forEach((achievement) => {
    if (!progress.achievements.includes(achievement.id) && achievement.condition(progress)) {
      progress.achievements.push(achievement.id);
      newAchievements.push(achievement.name);
    }
  });

  if (newAchievements.length > 0) {
    saveProgress(progress);

    // Show achievement notification (optional: could integrate with a toast library)
    if (typeof window !== 'undefined' && newAchievements.length > 0) {
      console.log('🏆 New achievements unlocked:', newAchievements.join(', '));
    }
  }
}

// Get all achievements with unlock status
export function getAllAchievements(): Array<{
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
}> {
  const progress = getProgress();

  return achievements.map((achievement) => ({
    id: achievement.id,
    name: achievement.name,
    description: achievement.description,
    unlocked: progress.achievements.includes(achievement.id),
  }));
}

// Get progress statistics
export function getProgressStats(): {
  totalScenarios: number;
  completedScenarios: number;
  totalConcepts: number;
  completedConcepts: number;
  totalQuizzes: number;
  averageQuizScore: number;
  totalTimeSpent: number;
  achievementsUnlocked: number;
  totalAchievements: number;
} {
  const progress = getProgress();

  const quizScores = Object.values(progress.quizScores);
  const averageQuizScore = quizScores.length > 0 ? quizScores.reduce((a, b) => a + b, 0) / quizScores.length : 0;
  const totalTimeSpent = Object.values(progress.timeSpent).reduce((sum, time) => sum + time, 0);

  return {
    totalScenarios: 33, // Total scenarios across all concepts
    completedScenarios: progress.scenariosCompleted.length,
    totalConcepts: 7, // Raft, Paxos, Vector Clocks, Consistent Hashing, 2PC, Eventual Consistency, CAP
    completedConcepts: progress.conceptsCompleted.length,
    totalQuizzes: Object.keys(progress.quizScores).length,
    averageQuizScore: Math.round(averageQuizScore),
    totalTimeSpent,
    achievementsUnlocked: progress.achievements.length,
    totalAchievements: achievements.length,
  };
}

// Reset all progress
export function resetProgress(): void {
  if (typeof window === 'undefined') return;

  if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
    localStorage.removeItem(PROGRESS_KEY);
    sessionStorage.removeItem(SESSION_START_KEY);
  }
}

// Export progress as JSON
export function exportProgress(): string {
  const progress = getProgress();
  return JSON.stringify(progress, null, 2);
}

// Import progress from JSON
export function importProgress(jsonString: string): boolean {
  try {
    const progress = JSON.parse(jsonString);
    saveProgress(progress);
    return true;
  } catch (error) {
    console.error('Error importing progress:', error);
    return false;
  }
}
