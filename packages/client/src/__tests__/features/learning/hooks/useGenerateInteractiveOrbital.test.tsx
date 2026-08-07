import { renderHook, act } from '@testing-library/react';
import type { OrbitalSchema } from '@almadar/core';
import { useGenerateInteractiveOrbital } from '../../../../features/learning/hooks/useGenerateInteractiveOrbital';
import { interactiveOrbitalAPI } from '../../../../features/learning/api/interactiveOrbitalAPI';

jest.mock('../../../../features/learning/api/interactiveOrbitalAPI', () => ({
  interactiveOrbitalAPI: {
    generate: jest.fn(),
    generateStreaming: jest.fn(),
  },
}));

const mockApi = interactiveOrbitalAPI as jest.Mocked<typeof interactiveOrbitalAPI>;

const mockSchema: OrbitalSchema = { name: 'test-orbital', orbitals: [] };

const mockRequest = {
  type: 'math' as const,
  concept: { name: 'Vectors' },
  markerDescription: 'Show a vector field',
};

describe('useGenerateInteractiveOrbital', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('progresses through streamed phases and lands on the final schema', async () => {
    mockApi.generateStreaming.mockImplementation(async (_request, callbacks) => {
      callbacks.onPhase?.('classifying');
      callbacks.onPhase?.('composing');
      return { schema: mockSchema, appId: 'app-1', cached: false };
    });

    const { result } = renderHook(() => useGenerateInteractiveOrbital());

    expect(result.current.phase).toBeNull();

    let returned: OrbitalSchema | null = null;
    await act(async () => {
      returned = await result.current.generate(mockRequest);
    });

    expect(mockApi.generateStreaming).toHaveBeenCalledWith(
      mockRequest,
      expect.objectContaining({ onPhase: expect.any(Function) }),
    );
    expect(returned).toEqual(mockSchema);
    expect(result.current.schema).toEqual(mockSchema);
    expect(result.current.isGenerating).toBe(false);
    // Phase clears once generation settles.
    expect(result.current.phase).toBeNull();
  });

  it('surfaces intermediate phases while generating', async () => {
    let onPhase: ((phase: string) => void) | undefined;
    let resolveGenerate!: (value: { schema: OrbitalSchema }) => void;

    mockApi.generateStreaming.mockImplementation((_request, callbacks) => {
      onPhase = callbacks.onPhase;
      return new Promise((resolve) => { resolveGenerate = resolve; });
    });

    const { result } = renderHook(() => useGenerateInteractiveOrbital());

    let generatePromise!: Promise<OrbitalSchema | null>;
    act(() => {
      generatePromise = result.current.generate(mockRequest);
    });

    act(() => {
      onPhase?.('classifying');
    });

    expect(result.current.phase).toBe('classifying');

    await act(async () => {
      resolveGenerate({ schema: mockSchema });
      await generatePromise;
    });

    expect(result.current.phase).toBeNull();
  });

  it('sets an error and clears phase when the stream fails', async () => {
    mockApi.generateStreaming.mockImplementation(async (_request, callbacks) => {
      callbacks.onPhase?.('classifying');
      throw new Error('Generation failed');
    });

    const { result } = renderHook(() => useGenerateInteractiveOrbital());

    let returned: OrbitalSchema | null = null;
    await act(async () => {
      returned = await result.current.generate(mockRequest);
    });

    expect(returned).toBeNull();
    expect(result.current.error).toBe('Generation failed');
    expect(result.current.phase).toBeNull();
    expect(result.current.isGenerating).toBe(false);
  });

  it('reset clears schema, error, and phase', async () => {
    mockApi.generateStreaming.mockResolvedValue({ schema: mockSchema });

    const { result } = renderHook(() => useGenerateInteractiveOrbital());

    await act(async () => {
      await result.current.generate(mockRequest);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.schema).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.phase).toBeNull();
    expect(result.current.isGenerating).toBe(false);
  });
});
