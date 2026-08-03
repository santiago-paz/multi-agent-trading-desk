import { hashString, seededPick } from './seed';
import { pacedStream, type PacedItem } from './sse';

export const DEMO_WIKI_TOPICS = [
  { title: 'The Lighthouse of Alexandria', extract: 'One of the seven wonders of the ancient world, a guide for lost sailors.' },
  { title: 'The Antikythera Mechanism', extract: 'An ancient Greek device considered the first analog computer.' },
  { title: 'The Double-Slit Experiment', extract: 'A demonstration of wave-particle duality in quantum mechanics.' },
  { title: 'The Silk Road', extract: 'A network of trade routes that connected East and West for centuries.' },
  { title: 'The Giant Squid', extract: 'An elusive deep-sea creature that inspired kraken legends.' },
  { title: 'The Library of Babel', extract: 'Borges’ tale of an infinite library containing every possible book.' },
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
