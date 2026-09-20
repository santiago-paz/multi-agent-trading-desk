import { describe, it, expect } from 'vitest';
import { demoOraculoStream, DEMO_WIKI_TOPICS } from './oraculo';

async function readAll(res: Response): Promise<string> {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let out = '';
  for (;;) { const { done, value } = await reader.read(); if (done) break; out += dec.decode(value); }
  return out;
}

describe('demo oráculo', () => {
  it('has a local topic pool', () => {
    expect(DEMO_WIKI_TOPICS.length).toBeGreaterThan(3);
    expect(DEMO_WIKI_TOPICS[0].title).toBeTruthy();
  });

  it('every topic carries an image and an article link', () => {
    for (const topic of DEMO_WIKI_TOPICS) {
      expect(topic.thumbnail.source, `${topic.title} has no image`).toMatch(/^https:\/\/.*wikimedia\.org\//);
      expect(topic.content_urls.desktop.page, `${topic.title} has no link`).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\//);
    }
  });

  it('streams text deltas terminated by [DONE]', async () => {
    const text = await readAll(demoOraculoStream({ title: 'The Lighthouse of Alexandria' }));
    expect(text).toContain('data: ');
    expect(text.trim().endsWith('data: [DONE]')).toBe(true);
    // reassemble the deltas
    const parts = text.split('\n\n').filter(Boolean);
    let assembled = '';
    for (const p of parts) {
      if (!p.startsWith('data: ')) continue;
      const payload = p.slice(6);
      if (payload === '[DONE]') continue;
      assembled += (JSON.parse(payload) as { text: string }).text;
    }
    expect(assembled.length).toBeGreaterThan(10);
  });
});
