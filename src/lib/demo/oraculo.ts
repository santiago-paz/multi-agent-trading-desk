import { hashString, seededPick } from './seed';
import { pacedStream, type PacedItem } from './sse';

/**
 * Demo article pool. Each entry mirrors the shape of the Wikipedia REST summary
 * endpoint (`/page/random/summary`) — thumbnail and article link included — so the
 * widget renders demo and live articles through exactly the same code path.
 * Every image is a Wikimedia Commons file; every link points at its English article.
 */
export const DEMO_WIKI_TOPICS = [
  {
    title: 'The Lighthouse of Alexandria',
    extract: 'One of the seven wonders of the ancient world, a guide for lost sailors.',
    thumbnail: { source: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/22/Lighthouse_-_Thiersch.png/330px-Lighthouse_-_Thiersch.png', width: 330, height: 281 },
    content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Lighthouse_of_Alexandria' } },
  },
  {
    title: 'The Antikythera Mechanism',
    extract: 'An ancient Greek device considered the first analog computer.',
    thumbnail: { source: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c8/Antikythera_Fragment_A_%28Front%29.webp/330px-Antikythera_Fragment_A_%28Front%29.webp', width: 330, height: 330 },
    content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Antikythera_mechanism' } },
  },
  {
    title: 'The Double-Slit Experiment',
    extract: 'A demonstration of wave-particle duality in quantum mechanics.',
    thumbnail: { source: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cd/Double-slit.svg/330px-Double-slit.svg.png', width: 330, height: 165 },
    content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Double-slit_experiment' } },
  },
  {
    title: 'The Silk Road',
    extract: 'A network of trade routes that connected East and West for centuries.',
    thumbnail: { source: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/49/Silk_road_Kazakhstan.svg/330px-Silk_road_Kazakhstan.svg.png', width: 330, height: 330 },
    content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Silk_Road' } },
  },
  {
    title: 'The Giant Squid',
    extract: 'An elusive deep-sea creature that inspired kraken legends.',
    thumbnail: { source: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3c/Giant_squid_Ranheim.jpg/330px-Giant_squid_Ranheim.jpg', width: 330, height: 495 },
    content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Giant_squid' } },
  },
  {
    title: 'The Voynich Manuscript',
    extract: 'A 15th-century codex written in a script nobody has ever deciphered.',
    thumbnail: { source: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/93/Voynich_Manuscript_%2832%29.jpg/330px-Voynich_Manuscript_%2832%29.jpg', width: 330, height: 443 },
    content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Voynich_manuscript' } },
  },
];

const ORACULO_TEMPLATES = [
  (t: string) => `The tides of fate whisper that ${t} and the markets dance the same invisible waltz (not advice, it's destiny).`,
  (t: string) => `Where others see noise, the oracle sees ${t} foreshadowing a turn in the markets (not advice, it's an omen).`,
  (t: string) => `The incense smoke traces the ticker ${t} over tomorrow's candlesticks (not advice, it's prophecy).`,
];

export function demoOraculoStream(input: { title?: string }): Response {
  const title = input.title ?? seededPick(DEMO_WIKI_TOPICS, 0).title;
  const seed = hashString(title);
  // Pick a CEDEAR ticker deterministically for flavor.
  const tickers = ['AAPL', 'KO', 'TSLA', 'NVDA', 'MELI', 'MSFT', 'GOOGL'];
  const ticker = seededPick(tickers, seed);
  const line = seededPick(ORACULO_TEMPLATES, seed)(ticker);

  const words = line.split(' ');
  const items: PacedItem[] = words.map((w, i) => ({
    chunk: `data: ${JSON.stringify({ text: (i === 0 ? '' : ' ') + w })}\n\n`,
    delayMs: 35,
  }));
  items.push({ chunk: `data: [DONE]\n\n`, delayMs: 0 });

  return new Response(pacedStream(items), {
    headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache, no-transform' },
  });
}
