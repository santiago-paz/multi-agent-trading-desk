import { generateText } from 'ai';
import { AnalystOutput } from './types';
import { getHistoricalPrices } from '../market-data';

export class AnalystAgent {
  async analyze(symbol: string): Promise<AnalystOutput> {
    const history = await getHistoricalPrices(symbol);

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
        model: 'meta/llama-3.3-70b',
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
