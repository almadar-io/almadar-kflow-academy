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
import { generatePersona, looksLikeId, isDegenerate } from '../../services/conceptPersonaService';

jest.mock('@almadar/server', () => ({ getFirestore: jest.fn() }));
jest.mock('@almadar/logger', () => ({ createLogger: () => ({ info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() }) }));
jest.mock('../../services/llm', () => ({
  callLLM: jest.fn(),
  extractJSONObject: (s: string) => JSON.parse(s.match(/\{[\s\S]*\}/)[0]),
}));

const fakeDoc = { get: jest.fn(), set: jest.fn().mockResolvedValue(undefined) };

describe('isDegenerate', () => {
  it('flags the model echoing the concept word back as the name', () => {
    expect(isDegenerate('Pony', 'Pony')).toBe(true);
    expect(isDegenerate('pony', 'Pony')).toBe(true);
    expect(isDegenerate('JavaScript', 'javascript')).toBe(true);
  });

  it('passes real human names', () => {
    expect(isDegenerate('Brendan Eich', 'JavaScript')).toBe(false);
    expect(isDegenerate('Sylvan Clebsch', 'Pony')).toBe(false);
    expect(isDegenerate('Isaac Newton', 'Calculus')).toBe(false);
  });
});

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

  it('passes learning context into the LLM prompt for disambiguation', async () => {
    fakeDoc.get.mockResolvedValueOnce({ exists: false });
    (callLLM as jest.Mock).mockResolvedValueOnce({
      content: JSON.stringify({
        name: 'Georg Cantor',
        description: 'Founder of set theory.',
        greeting: "Welcome.",
      }),
    });
    const wikiBody = { query: { pages: { '1': { description: 'German mathematician', extract: 'Cantor founded set theory.' } } } };
    const fetchMock = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => wikiBody });
    Object.assign(globalThis, { fetch: fetchMock });

    const ctx = 'learning level 1; related concepts: Logic, Proof Techniques';
    await generatePersona('Sets', ctx);

    const userPrompt = (callLLM as jest.Mock).mock.calls[0][0].userPrompt as string;
    expect(userPrompt).toContain('Sets');
    expect(userPrompt).toContain(ctx);
    const sysPrompt = (callLLM as jest.Mock).mock.calls[0][0].systemPrompt as string;
    expect(sysPrompt.toLowerCase()).toContain('context');
  });

  it('retries once when the model echoes the concept word, then uses the corrected human', async () => {
    fakeDoc.get.mockResolvedValue({ exists: false });
    (callLLM as jest.Mock)
      .mockResolvedValueOnce({ content: JSON.stringify({ name: 'Pony', description: 'x', greeting: 'hi' }) })
      .mockResolvedValueOnce({
        content: JSON.stringify({ name: 'Sylvan Clebsch', description: 'Created Pony.', greeting: 'Welcome.' }),
      });
    const wikiBody = { query: { pages: { '1': { description: 'British computer scientist', extract: 'Clebsch created the Pony language.' } } } };
    const fetchMock = jest.fn().mockResolvedValueOnce({ ok: true, json: async () => wikiBody });
    Object.assign(globalThis, { fetch: fetchMock });

    const result = await generatePersona('Pony', 'knowledge map level L1; other topics: Rust, Go, Elixir');

    expect(result.persona.name).toBe('Sylvan Clebsch');
    expect(callLLM).toHaveBeenCalledTimes(2);
    // The correction message was sent on retry.
    const retryPrompt = (callLLM as jest.Mock).mock.calls[1][0].userPrompt as string;
    expect(retryPrompt).toContain('not a person');
  });

  it('falls back to a neutral tutor and skips Wikipedia if the model still cannot name a human', async () => {
    fakeDoc.get.mockResolvedValue({ exists: false });
    (callLLM as jest.Mock)
      .mockResolvedValue({ content: JSON.stringify({ name: 'Pony', description: 'x', greeting: 'hi' }) });
    const fetchMock = jest.fn();
    Object.assign(globalThis, { fetch: fetchMock });

    const result = await generatePersona('Pony');

    expect(result.persona.name).toBe('Pony Tutor');
    expect(result.persona.portraitUrl).toBeUndefined();
    // No Wikipedia lookup on the literal concept — no horse.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(callLLM).toHaveBeenCalledTimes(2);
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
