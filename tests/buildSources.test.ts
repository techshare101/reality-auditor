// tests/buildSources.test.ts
import { describe, it, expect } from 'vitest';
import { buildSources } from '../src/lib/outlets';

describe('buildSources', () => {
  it('maps known outlets and deduplicates by registrable domain', () => {
    const citations = [
      'https://www.reuters.com/world/europe/sample-article',
      'https://reuters.com/another/page', // duplicate domain
      'https://www.nytimes.com/2025/08/30/world/sample.html',
      'https://www.bbc.co.uk/news/world-sample',
    ];

    const sources = buildSources(citations, undefined);

    // Should dedupe reuters.com
    expect(sources.length).toBe(3);

    const outlets = sources.map(s => s.outlet).sort();
    expect(outlets).toEqual(['BBC News', 'New York Times', 'Reuters'].sort());

    // URLs preserved
    expect(sources.some(s => s.url.includes('reuters.com'))).toBe(true);
  });

  it('falls back to Original Source when citations are empty and submittedUrl is provided', () => {
    const sources = buildSources([], 'https://example.com/original-article');
    expect(sources.length).toBe(1);
    expect(sources[0].outlet).toBe('Original Source');
    expect(sources[0].url).toBe('https://example.com/original-article');
  });

  it('skips malformed URLs and keeps valid ones', () => {
    const citations = [
      'not a url',
      'https://cnn.com/world/2025/sample',
    ];
    const sources = buildSources(citations, undefined);
    expect(sources.length).toBe(1);
    expect(sources[0].outlet).toBeTypeOf('string');
    expect(sources[0].url).toContain('cnn.com');
  });
});

