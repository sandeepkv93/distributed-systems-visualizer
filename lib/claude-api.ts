import Anthropic from '@anthropic-ai/sdk';
import { QuizQuestion } from './types';

const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';
const DEFAULT_MAX_TOKENS = 1024;

// Get API key from localStorage
function getApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('claude_api_key');
}

// Create Anthropic client
function createClient(): Anthropic | null {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  return new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true, // Required for client-side usage
  });
}

// Explain a scenario
export async function explainScenario(
  concept: string,
  currentState: any,
  question: string
): Promise<string> {
  const client = createClient();
  if (!client) {
    throw new Error('Claude API key not found. Please set it in the settings.');
  }

  const prompt = `You are an expert in distributed systems. You're helping a student understand ${concept}.

Current state of the system:
${JSON.stringify(currentState, null, 2)}

Student's question: ${question}

Please provide a clear, concise explanation that helps them understand what's happening and why. Use technical accuracy but keep it accessible.`;

  try {
    const message = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: DEFAULT_MAX_TOKENS,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const textContent = message.content.find((block) => block.type === 'text');
    if (textContent && textContent.type === 'text') {
      return textContent.text;
    }

    return 'Unable to generate explanation.';
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw new Error('Failed to get explanation from Claude API');
  }
}

// Generate quiz questions
export async function generateQuiz(
  concept: string,
  difficulty: 'easy' | 'medium' | 'hard',
  count: number = 5
): Promise<QuizQuestion[]> {
  const client = createClient();
  if (!client) {
    throw new Error('Claude API key not found. Please set it in the settings.');
  }

  const prompt = `You are an expert in distributed systems. Generate ${count} ${difficulty} level quiz questions about ${concept}.

For each question, provide:
1. The question text
2. 4 multiple choice options (if applicable)
3. The correct answer
4. A brief explanation

Format your response as a JSON array of quiz questions with this structure:
[
  {
    "question": "Question text here",
    "type": "multiple-choice",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Explanation here"
  }
]

Make sure questions are technically accurate and test understanding, not just memorization.`;

  try {
    const message = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const textContent = message.content.find((block) => block.type === 'text');
    if (textContent && textContent.type === 'text') {
      // Parse the JSON response
      const jsonMatch = textContent.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const questions = JSON.parse(jsonMatch[0]);
        return questions.map((q: any, index: number) => ({
          id: `${concept}-${difficulty}-${index}`,
          question: q.question,
          type: q.type || 'multiple-choice',
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          difficulty,
        }));
      }
    }

    return [];
  } catch (error) {
    console.error('Error generating quiz:', error);
    throw new Error('Failed to generate quiz questions');
  }
}

// Predict outcome
export async function predictOutcome(
  concept: string,
  currentState: any,
  proposedAction: string
): Promise<string> {
  const client = createClient();
  if (!client) {
    throw new Error('Claude API key not found. Please set it in the settings.');
  }

  const prompt = `You are an expert in distributed systems, specifically ${concept}.

Current system state:
${JSON.stringify(currentState, null, 2)}

Proposed action: ${proposedAction}

Predict what will happen when this action is executed. Be specific about:
1. Immediate effects
2. State transitions
3. Potential edge cases or issues
4. Final system state

Keep your prediction concise but technically accurate.`;

  try {
    const message = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: DEFAULT_MAX_TOKENS,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const textContent = message.content.find((block) => block.type === 'text');
    if (textContent && textContent.type === 'text') {
      return textContent.text;
    }

    return 'Unable to generate prediction.';
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw new Error('Failed to get prediction from Claude API');
  }
}

// Validate API key
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const client = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true,
    });

    await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 10,
      messages: [
        {
          role: 'user',
          content: 'Hello',
        },
      ],
    });

    return true;
  } catch (error) {
    return false;
  }
}

// Save API key to localStorage
export function saveApiKey(apiKey: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('claude_api_key', apiKey);
  }
}

// Remove API key from localStorage
export function clearApiKey(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('claude_api_key');
  }
}

// Check if API key exists
export function hasApiKey(): boolean {
  return getApiKey() !== null;
}
