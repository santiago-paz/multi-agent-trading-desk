import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { SentinelOutput } from './types';

// Configure Vercel AI Gateway
const openai = createOpenAI({
  baseURL: process.env.OPENAI_BASE_URL || 'https://gateway.ai.vercel.sh/v1',
  apiKey: process.env.OPENAI_API_KEY,
  headers: {
    'x-vercel-ai-provider': 'anthropic',
    'x-vercel-ai-model': 'claude-3-5-sonnet-20240620',
  },
});

// Mock news headlines for simulation
const MOCK_NEWS = [
  "Fed signals potential rate hike pause as inflation cools",
  "Tech stocks rally on strong earnings reports",
  "Geopolitical tensions rise in Eastern Europe",
  "Oil prices surge amid supply concerns",
  "Consumer confidence hits 6-month high",
];

export class SentinelAgent {
  async analyzeRisk(): Promise<SentinelOutput> {
    const headlines = MOCK_NEWS.join('\n');

    const prompt = `
      You are a Risk Sentinel for a hedge fund.
      Analyze the following news headlines for market sentiment and risk:
      ${headlines}
      
      Provide a risk score from -1 (extreme risk/negative sentiment) to 1 (low risk/positive sentiment).
      Determine the overall sentiment (positive, negative, neutral).
      Identify the top 3 most impactful headlines.
      Provide a brief reasoning.
      
      Return the result in JSON format:
      {
        "riskScore": number,
        "sentiment": "positive" | "negative" | "neutral",
        "topHeadlines": string[],
        "reasoning": "string"
      }
    `;

    try {
      const { text } = await generateText({
        model: openai('claude-3-5-sonnet-20240620'),
        prompt: prompt,
      });

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as SentinelOutput;
      }
      
      throw new Error('Failed to parse sentinel output');
    } catch (error) {
      console.error('Sentinel failed:', error);
      return {
        riskScore: 0,
        sentiment: 'neutral',
        topHeadlines: [],
        reasoning: 'Analysis failed, defaulting to neutral.',
      };
    }
  }
}

export const sentinelAgent = new SentinelAgent();
