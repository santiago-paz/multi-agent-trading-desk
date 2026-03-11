import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { AnalystOutput, SentinelOutput, StrategistOutput } from './types';

// Configure Vercel AI Gateway
const openai = createOpenAI({
  baseURL: process.env.OPENAI_BASE_URL || 'https://gateway.ai.vercel.sh/v1',
  apiKey: process.env.OPENAI_API_KEY,
  headers: {
    'x-vercel-ai-provider': 'anthropic',
    'x-vercel-ai-model': 'claude-3-5-sonnet-20240620',
  },
});

export class StrategistAgent {
  async decide(analystOutputs: AnalystOutput[], sentinelOutput: SentinelOutput): Promise<StrategistOutput> {
    const analystData = JSON.stringify(analystOutputs, null, 2);
    const sentinelData = JSON.stringify(sentinelOutput, null, 2);

    const prompt = `
      You are the Chief Investment Strategist (Warren Buffett persona) for a hedge fund.
      You have received the following reports:
      
      **Analyst Reports (Technical Analysis):**
      ${analystData}
      
      **Sentinel Report (Market Sentiment & Risk):**
      ${sentinelData}
      
      Your goal is to allocate a portfolio of $1000 USD across the following assets: AAPL, KO, TSLA, CASH (PESOS).
      Consider the technical scores and the overall market sentiment.
      Prioritize capital preservation but seek growth opportunities.
      
      Provide a target allocation percentage for each asset (must sum to 100%).
      Explain your reasoning for each allocation.
      Provide an overall strategy summary.
      
      Return the result in strictly valid JSON format:
      {
        "allocations": [
          { "symbol": "AAPL", "percentage": number, "reasoning": "string" },
          { "symbol": "KO", "percentage": number, "reasoning": "string" },
          { "symbol": "TSLA", "percentage": number, "reasoning": "string" },
          { "symbol": "CASH", "percentage": number, "reasoning": "string" }
        ],
        "overallStrategy": "string"
      }
    `;

    try {
      const { text } = await generateText({
        model: openai('claude-3-5-sonnet-20240620'),
        prompt: prompt,
      });

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as StrategistOutput;
      }
      
      throw new Error('Failed to parse strategist output');
    } catch (error) {
      console.error('Strategist failed:', error);
      return {
        allocations: [
          { symbol: 'CASH', percentage: 1, reasoning: 'Strategy failed, defaulting to cash.' }
        ],
        overallStrategy: 'Analysis failed, defaulting to cash preservation.',
      };
    }
  }
}

export const strategistAgent = new StrategistAgent();
