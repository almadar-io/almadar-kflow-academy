import { trackLLMCost, CostTrackingMetadata } from '../../services/llm';
import { calculateTokenPricing, logTokenUsage, TokenCountResult } from '../../utils/tokenPricing';

// Mock tokenPricing
jest.mock('../../utils/tokenPricing', () => ({
  calculateTokenPricing: jest.fn(),
  logTokenUsage: jest.fn(),
}));

describe('LLM Cost Tracking - Backend', () => {
  const mockMetadata: CostTrackingMetadata = {
    systemPrompt: 'You are a helpful assistant.',
    userPrompt: 'Explain React components.',
    provider: 'deepseek',
    model: 'deepseek-chat',
    uid: 'test-uid',
  };

  const mockTokenResult: TokenCountResult = {
    inputTokens: 1000,
    outputTokens: 500,
    inputCost: 0.00028,
    outputCost: 0.00021,
    totalCost: 0.00049,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (calculateTokenPricing as jest.Mock).mockResolvedValue(mockTokenResult);
  });

  describe('trackLLMCost - Non-Streaming', () => {
    it('should track costs for non-streaming responses', async () => {
      const outputContent = 'React components are reusable UI building blocks.';

      const result = await trackLLMCost(mockMetadata, outputContent);

      expect(calculateTokenPricing).toHaveBeenCalledWith(
        'deepseek',
        mockMetadata.systemPrompt,
        mockMetadata.userPrompt,
        outputContent,
        'deepseek-chat',
        'test-uid'
      );
      expect(logTokenUsage).toHaveBeenCalledWith('deepseek', 'deepseek-chat', mockTokenResult);
      expect(result).toEqual(mockTokenResult);
    });

    it('should skip cost tracking when UID is missing', async () => {
      const metadataWithoutUid: CostTrackingMetadata = {
        ...mockMetadata,
        uid: undefined,
      };
      const outputContent = 'Some content';

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await trackLLMCost(metadataWithoutUid, outputContent);

      expect(consoleWarnSpy).toHaveBeenCalledWith('[LLM Service] Skipping cost tracking - UID is missing');
      expect(calculateTokenPricing).not.toHaveBeenCalled();
      expect(result).toBeNull();

      consoleWarnSpy.mockRestore();
    });

    it('should handle errors gracefully', async () => {
      const outputContent = 'Some content';
      const error = new Error('Token calculation failed');
      (calculateTokenPricing as jest.Mock).mockRejectedValue(error);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await trackLLMCost(mockMetadata, outputContent);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[LLM Service] Error tracking costs:', error);
      expect(result).toBeNull();

      consoleErrorSpy.mockRestore();
    });

    it('should track costs for OpenAI provider', async () => {
      const openaiMetadata: CostTrackingMetadata = {
        ...mockMetadata,
        provider: 'openai',
        model: 'gpt-5',
      };
      const outputContent = 'OpenAI response content.';

      await trackLLMCost(openaiMetadata, outputContent);

      expect(calculateTokenPricing).toHaveBeenCalledWith(
        'openai',
        openaiMetadata.systemPrompt,
        openaiMetadata.userPrompt,
        outputContent,
        'gpt-5',
        'test-uid'
      );
    });

    it('should track costs for Gemini provider', async () => {
      const geminiMetadata: CostTrackingMetadata = {
        ...mockMetadata,
        provider: 'gemini',
        model: 'gemini-2.5-flash',
      };
      const outputContent = 'Gemini response content.';

      await trackLLMCost(geminiMetadata, outputContent);

      expect(calculateTokenPricing).toHaveBeenCalledWith(
        'gemini',
        geminiMetadata.systemPrompt,
        geminiMetadata.userPrompt,
        outputContent,
        'gemini-2.5-flash',
        'test-uid'
      );
    });

    it('should track costs for Deepseek provider', async () => {
      const outputContent = 'Deepseek response content.';

      await trackLLMCost(mockMetadata, outputContent);

      expect(calculateTokenPricing).toHaveBeenCalledWith(
        'deepseek',
        mockMetadata.systemPrompt,
        mockMetadata.userPrompt,
        outputContent,
        'deepseek-chat',
        'test-uid'
      );
    });

    it('should return token count result with correct structure', async () => {
      const outputContent = 'Response content.';

      const result = await trackLLMCost(mockMetadata, outputContent);

      expect(result).toHaveProperty('inputTokens');
      expect(result).toHaveProperty('outputTokens');
      expect(result).toHaveProperty('inputCost');
      expect(result).toHaveProperty('outputCost');
      expect(result).toHaveProperty('totalCost');
      expect(result?.totalCost).toBe(mockTokenResult.totalCost);
    });

    it('should log token usage after calculation', async () => {
      const outputContent = 'Response content.';

      await trackLLMCost(mockMetadata, outputContent);

      expect(logTokenUsage).toHaveBeenCalledWith(
        mockMetadata.provider,
        mockMetadata.model,
        mockTokenResult
      );
    });
  });

  describe('Streaming Cost Tracking', () => {
    // Note: wrapStreamWithCostTracking is a private function, so we test it indirectly
    // through the behavior of trackLLMCost when called with accumulated stream content

    it('should track costs for accumulated streaming content', async () => {
      // Simulate accumulated content from a stream
      const accumulatedContent = 'Chunk 1\nChunk 2\nChunk 3\nFinal chunk.';

      const result = await trackLLMCost(mockMetadata, accumulatedContent);

      expect(calculateTokenPricing).toHaveBeenCalledWith(
        'deepseek',
        mockMetadata.systemPrompt,
        mockMetadata.userPrompt,
        accumulatedContent,
        'deepseek-chat',
        'test-uid'
      );
      expect(result).toEqual(mockTokenResult);
    });

    it('should handle empty stream content gracefully', async () => {
      const emptyContent = '';

      // When UID is present but content is empty, trackLLMCost should still be called
      // but calculateTokenPricing will handle empty content
      const result = await trackLLMCost(mockMetadata, emptyContent);

      expect(calculateTokenPricing).toHaveBeenCalled();
      // Token calculation should handle empty content (returns 0 tokens)
      expect(result).toBeDefined();
    });

    it('should track costs even if stream was interrupted', async () => {
      // Simulate partial content from interrupted stream
      const partialContent = 'Partial content from interrupted stream...';

      const result = await trackLLMCost(mockMetadata, partialContent);

      // Should still track costs for what was received
      expect(calculateTokenPricing).toHaveBeenCalledWith(
        'deepseek',
        mockMetadata.systemPrompt,
        mockMetadata.userPrompt,
        partialContent,
        'deepseek-chat',
        'test-uid'
      );
      expect(result).toBeDefined();
    });
  });

  describe('Integration with calculateTokenPricing', () => {
    it('should pass correct parameters to calculateTokenPricing', async () => {
      const systemPrompt = 'System prompt';
      const userPrompt = 'User prompt';
      const outputContent = 'Output content';
      const metadata: CostTrackingMetadata = {
        systemPrompt,
        userPrompt,
        provider: 'deepseek',
        model: 'deepseek-chat',
        uid: 'test-uid',
      };

      await trackLLMCost(metadata, outputContent);

      expect(calculateTokenPricing).toHaveBeenCalledWith(
        'deepseek',
        systemPrompt,
        userPrompt,
        outputContent,
        'deepseek-chat',
        'test-uid'
      );
    });

    it('should handle calculateTokenPricing errors', async () => {
      const error = new Error('Token pricing calculation failed');
      (calculateTokenPricing as jest.Mock).mockRejectedValue(error);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await trackLLMCost(mockMetadata, 'Some content');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[LLM Service] Error tracking costs:', error);
      expect(result).toBeNull();

      consoleErrorSpy.mockRestore();
    });

    it('should return null when calculateTokenPricing fails', async () => {
      (calculateTokenPricing as jest.Mock).mockRejectedValue(new Error('Calculation error'));

      const result = await trackLLMCost(mockMetadata, 'Some content');

      expect(result).toBeNull();
    });
  });

  describe('Cost Tracking Metadata', () => {
    it('should use correct metadata for cost tracking', async () => {
      const metadata: CostTrackingMetadata = {
        systemPrompt: 'Custom system prompt',
        userPrompt: 'Custom user prompt',
        provider: 'openai',
        model: 'gpt-5-mini',
        uid: 'custom-uid',
      };
      const outputContent = 'Response';

      await trackLLMCost(metadata, outputContent);

      expect(calculateTokenPricing).toHaveBeenCalledWith(
        'openai',
        'Custom system prompt',
        'Custom user prompt',
        'Response',
        'gpt-5-mini',
        'custom-uid'
      );
    });

    it('should handle different model names', async () => {
      const models = ['gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gemini-2.5-flash', 'deepseek-chat'];

      for (const model of models) {
        const metadata: CostTrackingMetadata = {
          ...mockMetadata,
          model,
        };

        await trackLLMCost(metadata, 'Content');

        expect(calculateTokenPricing).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.any(String),
          'Content',
          model,
          'test-uid'
        );
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle calculateTokenPricing throwing error', async () => {
      const error = new Error('Token calculation error');
      (calculateTokenPricing as jest.Mock).mockRejectedValue(error);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await trackLLMCost(mockMetadata, 'Content');

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result).toBeNull();

      consoleErrorSpy.mockRestore();
    });

    it('should handle non-Error exceptions', async () => {
      (calculateTokenPricing as jest.Mock).mockRejectedValue('String error');

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await trackLLMCost(mockMetadata, 'Content');

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result).toBeNull();

      consoleErrorSpy.mockRestore();
    });

    it('should not throw when cost tracking fails', async () => {
      (calculateTokenPricing as jest.Mock).mockRejectedValue(new Error('Tracking failed'));

      await expect(trackLLMCost(mockMetadata, 'Content')).resolves.not.toThrow();
    });
  });

  describe('UID Validation', () => {
    it('should skip tracking when UID is undefined', async () => {
      const metadata: CostTrackingMetadata = {
        ...mockMetadata,
        uid: undefined,
      };

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await trackLLMCost(metadata, 'Content');

      expect(consoleWarnSpy).toHaveBeenCalledWith('[LLM Service] Skipping cost tracking - UID is missing');
      expect(calculateTokenPricing).not.toHaveBeenCalled();
      expect(result).toBeNull();

      consoleWarnSpy.mockRestore();
    });

    it('should skip tracking when UID is empty string', async () => {
      const metadata: CostTrackingMetadata = {
        ...mockMetadata,
        uid: '',
      };

      // Empty string is falsy, so it should be treated as missing
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await trackLLMCost(metadata, 'Content');

      expect(consoleWarnSpy).toHaveBeenCalledWith('[LLM Service] Skipping cost tracking - UID is missing');
      expect(calculateTokenPricing).not.toHaveBeenCalled();
      expect(result).toBeNull();

      consoleWarnSpy.mockRestore();
    });

    it('should track costs when UID is provided', async () => {
      const result = await trackLLMCost(mockMetadata, 'Content');

      expect(calculateTokenPricing).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('Logging', () => {
    it('should log tracking start with correct metadata', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await trackLLMCost(mockMetadata, 'Content');

      // Check that log was called with the tracking message
      const logCalls = consoleLogSpy.mock.calls;
      const trackingCall = logCalls.find(call => 
        call[0] && typeof call[0] === 'string' && call[0].includes('[LLM Service] Tracking costs')
      );
      
      expect(trackingCall).toBeDefined();
      if (trackingCall) {
        expect(trackingCall[0]).toContain('deepseek');
        expect(trackingCall[0]).toContain('deepseek-chat');
        expect(trackingCall[0]).toContain('test-uid');
      }

      consoleLogSpy.mockRestore();
    });

    it('should log successful cost tracking', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await trackLLMCost(mockMetadata, 'Content');

      // Check that log was called with the success message
      const logCalls = consoleLogSpy.mock.calls;
      const successCall = logCalls.find(call => 
        call[0] && typeof call[0] === 'string' && call[0].includes('[LLM Service] Successfully tracked costs')
      );
      
      expect(successCall).toBeDefined();
      if (successCall) {
        expect(successCall[0]).toContain('Total:');
      }

      consoleLogSpy.mockRestore();
    });
  });
});

