import { generateText } from 'ai';
import { SentinelOutput } from './types';
import { getNews, NewsItem } from '../market-data';

// Mock news headlines for simulation fallback
const MOCK_NEWS: NewsItem[] = [
  { title: "Fed signals potential rate hike pause as inflation cools", link: "#", publisher: "Central Bank News" },
  { title: "Tech stocks rally on strong earnings reports", link: "#", publisher: "Market Watch" },
  { title: "Geopolitical tensions rise in Eastern Europe", link: "#", publisher: "Global News" },
  { title: "Oil prices surge amid supply concerns", link: "#", publisher: "Energy Weekly" },
  { title: "Consumer confidence hits 6-month high", link: "#", publisher: "Economic Times" },
];

interface SentinelLLMOutput {
  riskScore: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  topHeadlines: string[]; // Titles only
  reasoning: string;
}

export class SentinelAgent {
  async analyzeRisk(symbols: string[] = [], preFetchedNews: NewsItem[] = []): Promise<SentinelOutput> {
    let allNews: NewsItem[] = preFetchedNews;

    // If no pre-fetched news provided, fetch them (fallback behavior)
    if (allNews.length === 0 && symbols.length > 0) {
      try {
        const newsPromises = symbols.map(symbol => getNews(symbol, 3));
        const results = await Promise.all(newsPromises);
        allNews = results.flat();
      } catch (error) {
        console.error('Failed to fetch real news, using mock data:', error);
      }
    }

    if (allNews.length === 0) {
      allNews = MOCK_NEWS;
    }

    // Remove duplicates based on title
    allNews = Array.from(new Map(allNews.map(item => [item.title, item])).values());

    // Limit to 15 headlines to avoid token limits
    const newsToAnalyze = allNews.slice(0, 15);
    
    // Use full content if available, otherwise fallback to title
    const headlinesList = newsToAnalyze.map(n => {
      const content = n.text ? `\nCONTENT: ${n.text.slice(0, 500)}...` : '';
      return `- TITLE: ${n.title} (${n.publisher})${content}`;
    }).join('\n\n');

    const prompt = `
      You are a Risk Sentinel for a hedge fund.
      Analyze the following news headlines/articles for market sentiment and risk regarding the following symbols: ${symbols.join(', ')}.
      
      NEWS ITEMS:
      ${headlinesList}
      
      Provide a risk score from -1 (extreme risk/negative sentiment) to 1 (low risk/positive sentiment).
      Determine the overall sentiment (positive, negative, neutral).
      Identify the top 3 most impactful headlines (return the exact titles as they appear in the list).
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
        model: 'meta/llama-3.3-70b',
        prompt: prompt,
      });

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const llmOutput = JSON.parse(jsonMatch[0]) as SentinelLLMOutput;
        
        // Map titles back to full news objects
        const topHeadlines = llmOutput.topHeadlines.map(title => {
          const original = newsToAnalyze.find(n => n.title.includes(title) || title.includes(n.title));
          return original || { title, link: '#', publisher: 'Unknown' };
        });

        return {
          riskScore: llmOutput.riskScore,
          sentiment: llmOutput.sentiment,
          topHeadlines,
          reasoning: llmOutput.reasoning
        };
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
