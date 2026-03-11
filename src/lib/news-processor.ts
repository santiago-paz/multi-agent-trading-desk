import { generateText } from 'ai';
import { NewsItem } from './market-data';
import { Readability } from '@mozilla/readability';
import { JSDOM, VirtualConsole } from 'jsdom';
import puppeteer from 'puppeteer';

// Keep fetch as a fallback for simple sites or if Puppeteer fails
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0'
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function fetchWithPuppeteer(url: string): Promise<string | null> {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent(getRandomUserAgent());
    
    // Set extra headers to look like a real browser
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
    });

    // Enable request interception to block unnecessary resources
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Navigate to page and wait for domcontentloaded (faster than networkidle2)
    // We mostly care about text content which is usually present early
    await page.goto(url, { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000 // Increased timeout to 30s
    });

    // Get the HTML content
    const content = await page.content();
    return content;
  } catch (error) {
    console.error(`Puppeteer failed for ${url}:`, error);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function fetchArticleContent(url: string): Promise<string | null> {
  // Try Puppeteer first as it's more robust
  let html = await fetchWithPuppeteer(url);

  if (!html) {
    // Fallback to simple fetch if Puppeteer fails (though unlikely if installed correctly)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); 

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.google.com/',
        }
      });
      
      clearTimeout(timeoutId);
      if (response.ok) {
        html = await response.text();
      }
    } catch {
      // Ignore fetch error
    }
  }

  if (!html) return null;

  try {
    // Use JSDOM to parse HTML
    const virtualConsole = new VirtualConsole();
    virtualConsole.on("error", () => { /* ignore css parsing errors */ });
    const doc = new JSDOM(html, { url, virtualConsole });
    
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
  } catch {
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
You are a financial news summarizer. Output ONLY the summary—no preamble, no "Here's a summary", no meta-commentary.

Rules:
- Write 1-2 concise sentences focusing on market impact or the key event.
- Output the summary directly. Start with the first word of the summary.
- Do not add any introductory phrases.

Title: ${item.title}
Content: ${textToSummarize.slice(0, 2000)}...
      `;
    } else {
      prompt = `
You are a financial news summarizer. Output ONLY the summary—no preamble, no meta-commentary.

Rules:
- Based ONLY on this headline, write 1 sentence about the likely market implication or event.
- Output the summary directly. Start with the first word of the summary.
- Do not mention that content is missing. Do not add "Here's..." or similar.
- If the headline is too vague, output the headline itself verbatim.

Headline: "${item.title}"
      `;
    }

    // 2. Generate Summary with LLM
    const { text: summary } = await generateText({
      model: 'meta/llama-3.1-8b',
      system: 'Output only the requested summary. No preamble, no "Here\'s a summary", no meta-commentary. Start directly with the first word of the summary.',
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
  // Process sequentially to avoid spawning too many browsers at once and crashing the machine
  // Or limit concurrency. For now, let's do a simple concurrency limit of 2.
  const results: NewsItem[] = [];
  const batchSize = 2;
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(item => processNewsItem(item)));
    results.push(...batchResults);
  }
  
  return results;
}
