import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { AnalystOutput } from './types';

// Configure Vercel AI Gateway
const openai = createOpenAI({
  baseURL: process.env.OPENAI_BASE_URL || 'https://gateway.ai.vercel.sh/v1',
  apiKey: process.env.OPENAI_API_KEY,
  headers: {
    'x-vercel-ai-provider': 'anthropic',
    'x-vercel-ai-model': 'claude-3-5-sonnet-20240620',
  },
});

// Mock historical data for simulation
const MOCK_HISTORY = {
  AAPL: 'Price trend for last 30 days: 150, 152, 155, 153, 158, 160, 162, 165, 163, 168...',
  KO: 'Price trend for last 30 days: 60, 60.5, 61, 60.8, 61.2, 61.5, 62, 61.8, 62.2, 62.5...',
  TSLA: 'Price trend for last 30 days: 200, 195, 190, 192, 188, 185, 182, 180, 178, 175...',
};

export class AnalystAgent {
  async analyze(symbol: string): Promise<AnalystOutput> {
    const history = MOCK_HISTORY[symbol as keyof typeof MOCK_HISTORY] || 'No data available';

    const prompt = `
      You are a Technical Analyst for a hedge fund.
      Analyze the following price history for ${symbol}:
      ${history}
      
      Provide a technical analysis score from 0 to 100 (0 is extremely bearish, 100 is extremely bullish).
      Determine the trend (bullish, bearish, neutral).
      Provide a brief reasoning.
      
      Return the result in JSON format:
      {
        "symbol": "${symbol}",
        "trend": "bullish" | "bearish" | "neutral",
        "score": number,
        "reasoning": "string"
      }
    `;

    try {
      const { text } = await generateText({
        model: openai('claude-3-5-sonnet-20240620'),
        prompt: prompt,
      });

      // Parse the JSON response
      // In a real app, we should use structured outputs or schema validation
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as AnalystOutput;
      }
      
      throw new Error('Failed to parse analyst output');
    } catch (error) {
      console.error(`Analyst failed for ${symbol}:`, error);
      return {
        symbol,
        trend: 'neutral',
        score: 50,
        reasoning: 'Analysis failed, defaulting to neutral.',
      };
    }
  }
}

export const analystAgent = new AnalystAgent();
