import { generateText } from 'ai';
import { NewsItem } from './market-data';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0'
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function fetchArticleContent(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    // Increase timeout slightly as 3s might be too aggressive for some sites
    const timeoutId = setTimeout(() => controller.abort(), 8000); 

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'Referer': 'https://www.google.com/',
      }
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const html = await response.text();
    
    // Use JSDOM to parse HTML
    const doc = new JSDOM(html, { url });
    
    // Use Readability to extract main content
    const reader = new Readability(doc.window.document);
    const article = reader.parse();
    
    if (!article || !article.textContent) {
      return null;
    }
    
    // Clean up whitespace
    const cleanText = article.textContent.replace(/\s+/g, ' ').trim();
    
    // Return first 3000 chars as context
    return cleanText.slice(0, 3000);
  } catch (error) {
    return null;
  }
}

export async function processNewsItem(item: NewsItem): Promise<NewsItem> {
  // 1. Fetch Content
  const content = await fetchArticleContent(item.link);
  
  // Check if we have substantial content (more than just a title or very short snippet)
  const hasContent = content && content.length > 200;
  const textToSummarize = hasContent ? content : item.title;

  try {
    let prompt = '';
    
    if (hasContent) {
      prompt = `
        Summarize the following financial news article in 1-2 concise sentences.
        Focus on the market impact or key event.
        
        Title: ${item.title}
        Content: ${textToSummarize.slice(0, 2000)}...
      `;
    } else {
      prompt = `
        The full content of this article is unavailable, but here is the headline: "${item.title}".
        Based ONLY on this headline, provide a 1-sentence summary of the likely market implication or event.
        Do not mention that the content is missing.
        If the headline is too vague to summarize, just return the headline itself.
      `;
    }

    // 2. Generate Summary with LLM
    const { text: summary } = await generateText({
      model: 'meta/llama-3.1-8b-instruct',
      prompt: prompt,
    });

    return {
      ...item,
      fullContent: hasContent ? content : undefined, // Store full content if we got it
      summary: summary.trim()
    };
  } catch (error) {
    console.error('Summarization failed:', error);
    return {
      ...item,
      summary: 'Summary unavailable.'
    };
  }
}

export async function processNewsBatch(items: NewsItem[]): Promise<NewsItem[]> {
  // Process in parallel
  return Promise.all(items.map(item => processNewsItem(item)));
}
