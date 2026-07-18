/**
 * Integration tests for the on-the-fly concept persona service.
 *
 * Locks the contract that was broken in the field: a concept id/UUID must NEVER be
 * accepted as a conceptLabel (it made the model hallucinate "John Dewey"), and a real
 * concept name resolves to the correct originator with a portrait + biography, cached
 * per concept.
 */
import { getFirestore } from '@almadar/server';
import { callLLM } from '../../services/llm';
import { generatePersona, looksLikeId } from '../../services/conceptPersonaService';

jest.mock('@almadar/server', () => ({ getFirestore: jest.fn() }));
jest.mock('@almadar/logger', () => ({ createLogger: () => ({ info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() }) }));
jest.mock('../../services/llm', () => ({
  callLLM: jest.fn(),
  extractJSONObject: (s: string) => JSON.parse(s.match(/\{[\s\S]*\}/)[0]),
}));

const fakeDoc = { get: jest.fn(), set: jest.fn().mockResolvedValue(undefined) };

describe('looksLikeId', () => {
  it('flags UUIDs and numeric ids', () => {
    expect(looksLikeId('5c66318c-d365-4449-82de-768070aae760')).toBe(true);
    expect(looksLikeId('57eafa14-2c0a-469f-88c9-138a604406ad')).toBe(true);
    expect(looksLikeId('12345')).toBe(true);
  });

  it('passes real concept names', () => {
    expect(looksLikeId('JavaScript')).toBe(false);
    expect(looksLikeId('Calculus')).toBe(false);
    expect(looksLikeId('Big O Notation')).toBe(false);
  });
});

describe('generatePersona', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getFirestore as jest.Mock).mockReturnValue({
      collection: () => ({ doc: () => fakeDoc }),
    });
  });

  it('resolves a real concept name to the correct originator with portrait + bio', async () => {
    fakeDoc.get.mockResolvedValueOnce({ exists: false });
    (callLLM as jest.Mock).mockResolvedValueOnce({
      content: JSON.stringify({
        name: 'Brendan Eich',
        description: 'Creator of JavaScript.',
        greeting: "Welcome — I'm Brendan Eich.",
      }),
    });
    const wikiBody = {
      query: {
        pages: {
          '1': {
            description: 'American programmer (born 1961)',
            thumbnail: { source: 'https://upload.wikimedia.org/eich.jpg' },
            extract: 'Brendan Eich created JavaScript in 1995 at Netscape.',
          },
        },
      },
    };
    const fetchMock = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => wikiBody,
    });
    Object.assign(globalThis, { fetch: fetchMock });

    const result = await generatePersona('JavaScript');

    expect(result.persona.name).toBe('Brendan Eich');
    expect(result.persona.portraitUrl).toBe('https://upload.wikimedia.org/eich.jpg');
    // Wikipedia's verified description wins over the LLM one.
    expect(result.persona.description).toBe('American programmer (born 1961)');
    expect(result.greeting).toContain("Brendan Eich");
    // Cached with the biography for grounding replies.
    expect(fakeDoc.set).toHaveBeenCalledTimes(1);
    const cached = fakeDoc.set.mock.calls[0][0];
    expect(cached.bio).toContain('JavaScript in 1995');
    expect(callLLM).toHaveBeenCalledTimes(1);
  });

  it('serves a cached persona without calling the LLM again', async () => {
    const cached = {
      persona: { name: 'Isaac Newton', description: 'English polymath' },
      greeting: 'Hello.',
      bio: 'Newton bio',
      cachedAt: Date.now(),
    };
    fakeDoc.get.mockResolvedValueOnce({ exists: true, data: () => cached });

    const result = await generatePersona('Calculus');

    expect(result.persona.name).toBe('Isaac Newton');
    expect(callLLM).not.toHaveBeenCalled();
    expect(fakeDoc.set).not.toHaveBeenCalled();
  });
});
