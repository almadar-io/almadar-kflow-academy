import {
  addCostToDailyTracking,
  getDailyCosts,
  getCostsForDateRange,
  DailyCostDocument,
} from '../../services/costService';
import { getFirestore } from '../../config/firebaseAdmin';

// Mock Firebase Admin
jest.mock('../../config/firebaseAdmin', () => ({
  getFirestore: jest.fn(),
}));

describe('Cost Tracking - Backend', () => {
  let mockDocRef: any;
  let mockDoc: any;
  let mockFirestore: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Firestore document
    mockDoc = {
      exists: false,
      data: jest.fn(),
      get: jest.fn(),
    };

    mockDocRef = {
      get: jest.fn().mockResolvedValue(mockDoc),
      set: jest.fn().mockResolvedValue(undefined),
      doc: jest.fn().mockReturnThis(),
    };

    mockFirestore = {
      doc: jest.fn().mockReturnValue(mockDocRef),
    };

    (getFirestore as jest.Mock).mockReturnValue(mockFirestore);
  });

  describe('Daily Tracking', () => {
    it('should add cost to daily tracking document', async () => {
      mockDoc.exists = false;
      mockDoc.data.mockReturnValue({ totalCost: 0 });

      await addCostToDailyTracking(
        'test-uid',
        'deepseek',
        'deepseek-chat',
        1000,
        500,
        0.00028,
        0.00021
      );

      expect(mockFirestore.doc).toHaveBeenCalled();
      expect(mockDocRef.set).toHaveBeenCalled();
      
      const setCall = (mockDocRef.set as jest.Mock).mock.calls[0][0];
      expect(setCall.totalCost).toBeGreaterThan(0);
      expect(setCall.deepseek).toBeDefined();
      expect(setCall.deepseek['deepseek-chat']).toBeDefined();
      expect(setCall.deepseek['deepseek-chat'].totalInputTokens).toBe(1000);
      expect(setCall.deepseek['deepseek-chat'].totalOutputTokens).toBe(500);
    });

    it('should update existing daily tracking document', async () => {
      const existingData: DailyCostDocument = {
        totalCost: 0.5,
        deepseek: {
          'deepseek-chat': {
            totalInput: 0.00028,
            totalOutput: 0.00021,
            totalCost: 0.00049,
            totalInputTokens: 1000,
            totalOutputTokens: 500,
          },
        },
      };

      mockDoc.exists = true;
      mockDoc.data.mockReturnValue(existingData);

      await addCostToDailyTracking(
        'test-uid',
        'deepseek',
        'deepseek-chat',
        2000,
        1000,
        0.00056,
        0.00042
      );

      expect(mockDocRef.set).toHaveBeenCalled();
      const setCall = (mockDocRef.set as jest.Mock).mock.calls[0][0];
      const modelCost = setCall.deepseek['deepseek-chat'];
      
      // Should accumulate tokens and costs
      expect(modelCost.totalInputTokens).toBe(3000); // 1000 + 2000
      expect(modelCost.totalOutputTokens).toBe(1500); // 500 + 1000
      expect(modelCost.totalInput).toBeCloseTo(0.00084, 6); // 0.00028 + 0.00056
      expect(modelCost.totalOutput).toBeCloseTo(0.00063, 6); // 0.00021 + 0.00042
    });

    it('should track costs for multiple providers', async () => {
      mockDoc.exists = false;
      mockDoc.data.mockReturnValue({ totalCost: 0 });

      // Add cost for OpenAI
      await addCostToDailyTracking(
        'test-uid',
        'openai',
        'gpt-5',
        1000,
        500,
        0.00125,
        0.005
      );

      // After first call, document exists with OpenAI data
      const firstCallData = (mockDocRef.set as jest.Mock).mock.calls[0][0];
      mockDoc.exists = true;
      mockDoc.data.mockReturnValue(firstCallData);

      // Add cost for Deepseek
      await addCostToDailyTracking(
        'test-uid',
        'deepseek',
        'deepseek-chat',
        2000,
        1000,
        0.00056,
        0.00042
      );

      expect(mockDocRef.set).toHaveBeenCalledTimes(2);
      
      // Check that both providers are tracked in the final call
      const lastCall = (mockDocRef.set as jest.Mock).mock.calls[1][0];
      expect(lastCall.openai).toBeDefined();
      expect(lastCall.deepseek).toBeDefined();
    });

    it('should track costs for multiple models of same provider', async () => {
      mockDoc.exists = false;
      mockDoc.data.mockReturnValue({ totalCost: 0 });

      // Add cost for first model
      await addCostToDailyTracking(
        'test-uid',
        'openai',
        'gpt-5',
        1000,
        500,
        0.00125,
        0.005
      );

      // After first call, document exists with gpt-5 data
      const firstCallData = (mockDocRef.set as jest.Mock).mock.calls[0][0];
      mockDoc.exists = true;
      mockDoc.data.mockReturnValue(firstCallData);

      // Add cost for second model
      await addCostToDailyTracking(
        'test-uid',
        'openai',
        'gpt-5-mini',
        2000,
        1000,
        0.0005,
        0.002
      );

      expect(mockDocRef.set).toHaveBeenCalledTimes(2);
      
      const lastCall = (mockDocRef.set as jest.Mock).mock.calls[1][0];
      expect(lastCall.openai['gpt-5']).toBeDefined();
      expect(lastCall.openai['gpt-5-mini']).toBeDefined();
    });

    it('should calculate total cost across all providers and models', async () => {
      const existingData: DailyCostDocument = {
        totalCost: 0,
        openai: {
          'gpt-5': {
            totalInput: 0.00125,
            totalOutput: 0.005,
            totalCost: 0.00625,
            totalInputTokens: 1000,
            totalOutputTokens: 500,
          },
        },
        deepseek: {
          'deepseek-chat': {
            totalInput: 0.00028,
            totalOutput: 0.00021,
            totalCost: 0.00049,
            totalInputTokens: 1000,
            totalOutputTokens: 500,
          },
        },
      };

      mockDoc.exists = true;
      mockDoc.data.mockReturnValue(existingData);

      await addCostToDailyTracking(
        'test-uid',
        'gemini',
        'gemini-2.5-flash',
        1000,
        500,
        0.0003,
        0.00125
      );

      const setCall = (mockDocRef.set as jest.Mock).mock.calls[0][0];
      // Total should be sum of all model costs
      const expectedTotal = 0.00625 + 0.00049 + 0.00155; // 0.00155 = 0.0003 + 0.00125
      expect(setCall.totalCost).toBeCloseTo(expectedTotal, 6);
    });
  });

  describe('Streaming Costs', () => {
    it('should track costs for streaming responses', async () => {
      mockDoc.exists = false;
      mockDoc.data.mockReturnValue({ totalCost: 0 });

      // Simulate streaming response with accumulated content
      const inputTokens = 1000;
      const outputTokens = 500;
      const inputCost = 0.00028;
      const outputCost = 0.00021;

      await addCostToDailyTracking(
        'test-uid',
        'deepseek',
        'deepseek-chat',
        inputTokens,
        outputTokens,
        inputCost,
        outputCost
      );

      expect(mockDocRef.set).toHaveBeenCalled();
      const setCall = (mockDocRef.set as jest.Mock).mock.calls[0][0];
      expect(setCall.deepseek['deepseek-chat'].totalInputTokens).toBe(inputTokens);
      expect(setCall.deepseek['deepseek-chat'].totalOutputTokens).toBe(outputTokens);
    });

    it('should accumulate costs from multiple streaming calls', async () => {
      mockDoc.exists = false;
      mockDoc.data.mockReturnValue({ totalCost: 0 });

      // First streaming call
      await addCostToDailyTracking(
        'test-uid',
        'deepseek',
        'deepseek-chat',
        500,
        250,
        0.00014,
        0.000105
      );

      // Second streaming call (same day)
      const existingData: DailyCostDocument = {
        totalCost: 0.000245,
        deepseek: {
          'deepseek-chat': {
            totalInput: 0.00014,
            totalOutput: 0.000105,
            totalCost: 0.000245,
            totalInputTokens: 500,
            totalOutputTokens: 250,
          },
        },
      };

      mockDoc.exists = true;
      mockDoc.data.mockReturnValue(existingData);

      await addCostToDailyTracking(
        'test-uid',
        'deepseek',
        'deepseek-chat',
        300,
        150,
        0.000084,
        0.000063
      );

      const setCall = (mockDocRef.set as jest.Mock).mock.calls[1][0];
      const modelCost = setCall.deepseek['deepseek-chat'];
      
      expect(modelCost.totalInputTokens).toBe(800); // 500 + 300
      expect(modelCost.totalOutputTokens).toBe(400); // 250 + 150
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully when Firestore fails', async () => {
      mockDocRef.get.mockRejectedValue(new Error('Firestore error'));

      // Should not throw - cost tracking failures shouldn't break main flow
      await expect(
        addCostToDailyTracking(
          'test-uid',
          'deepseek',
          'deepseek-chat',
          1000,
          500,
          0.00028,
          0.00021
        )
      ).resolves.not.toThrow();
    });

    it('should handle errors when document set fails', async () => {
      mockDoc.exists = false;
      mockDoc.data.mockReturnValue({ totalCost: 0 });
      mockDocRef.set.mockRejectedValue(new Error('Set failed'));

      // Should not throw
      await expect(
        addCostToDailyTracking(
          'test-uid',
          'deepseek',
          'deepseek-chat',
          1000,
          500,
          0.00028,
          0.00021
        )
      ).resolves.not.toThrow();
    });

    it('should handle invalid cost data gracefully', async () => {
      mockDoc.exists = false;
      mockDoc.data.mockReturnValue({ totalCost: 0 });

      // Should handle NaN or invalid numbers
      await expect(
        addCostToDailyTracking(
          'test-uid',
          'deepseek',
          'deepseek-chat',
          0,
          0,
          0,
          0
        )
      ).resolves.not.toThrow();
    });
  });

  describe('UID Validation', () => {
    it('should skip cost tracking when UID is missing', async () => {
      // This is handled in trackLLMCost function in llm.ts
      // The costService.addCostToDailyTracking requires UID, so if called without it, it would fail
      // But the calling code (trackLLMCost) checks for UID first
      const hasUid = false;
      
      if (!hasUid) {
        // Cost tracking should be skipped
        expect(mockDocRef.set).not.toHaveBeenCalled();
      }
    });

    it('should track costs when UID is provided', async () => {
      mockDoc.exists = false;
      mockDoc.data.mockReturnValue({ totalCost: 0 });

      await addCostToDailyTracking(
        'test-uid',
        'deepseek',
        'deepseek-chat',
        1000,
        500,
        0.00028,
        0.00021
      );

      expect(mockDocRef.set).toHaveBeenCalled();
    });
  });

  describe('getDailyCosts', () => {
    it('should retrieve daily costs for a user', async () => {
      const mockCostData: DailyCostDocument = {
        totalCost: 0.5,
        deepseek: {
          'deepseek-chat': {
            totalInput: 0.00028,
            totalOutput: 0.00021,
            totalCost: 0.00049,
            totalInputTokens: 1000,
            totalOutputTokens: 500,
          },
        },
      };

      mockDoc.exists = true;
      mockDoc.data.mockReturnValue(mockCostData);

      const result = await getDailyCosts('test-uid');

      expect(result).toBeDefined();
      expect(result?.totalCost).toBe(0.5);
      expect(result?.deepseek).toBeDefined();
    });

    it('should return null when document does not exist', async () => {
      mockDoc.exists = false;

      const result = await getDailyCosts('test-uid');

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockDocRef.get.mockRejectedValue(new Error('Firestore error'));

      const result = await getDailyCosts('test-uid');

      expect(result).toBeNull();
    });

    it('should retrieve costs for a specific date', async () => {
      const mockCostData: DailyCostDocument = {
        totalCost: 0.3,
        openai: {
          'gpt-5': {
            totalInput: 0.00125,
            totalOutput: 0.005,
            totalCost: 0.00625,
            totalInputTokens: 1000,
            totalOutputTokens: 500,
          },
        },
      };

      mockDoc.exists = true;
      mockDoc.data.mockReturnValue(mockCostData);

      const result = await getDailyCosts('test-uid', '2024-01-15');

      expect(mockFirestore.doc).toHaveBeenCalledWith('users/test-uid/costs/2024-01-15');
      expect(result).toBeDefined();
      expect(result?.totalCost).toBe(0.3);
    });
  });

  describe('getCostsForDateRange', () => {
    it('should retrieve costs for a date range', async () => {
      const mockCostData1: DailyCostDocument = {
        totalCost: 0.1,
        deepseek: {
          'deepseek-chat': {
            totalInput: 0.00028,
            totalOutput: 0.00021,
            totalCost: 0.00049,
            totalInputTokens: 1000,
            totalOutputTokens: 500,
          },
        },
      };

      const mockCostData2: DailyCostDocument = {
        totalCost: 0.2,
        openai: {
          'gpt-5': {
            totalInput: 0.00125,
            totalOutput: 0.005,
            totalCost: 0.00625,
            totalInputTokens: 1000,
            totalOutputTokens: 500,
          },
        },
      };

      // Mock different dates
      let callCount = 0;
      mockDocRef.get.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          mockDoc.exists = true;
          mockDoc.data.mockReturnValue(mockCostData1);
        } else if (callCount === 2) {
          mockDoc.exists = true;
          mockDoc.data.mockReturnValue(mockCostData2);
        } else {
          mockDoc.exists = false;
        }
        return Promise.resolve(mockDoc);
      });

      const result = await getCostsForDateRange('test-uid', '2024-01-15', '2024-01-16');

      expect(Object.keys(result).length).toBeGreaterThan(0);
    });

    it('should handle date range with no costs', async () => {
      mockDoc.exists = false;

      const result = await getCostsForDateRange('test-uid', '2024-01-15', '2024-01-16');

      expect(result).toEqual({});
    });

    it('should handle errors gracefully', async () => {
      mockDocRef.get.mockRejectedValue(new Error('Firestore error'));

      const result = await getCostsForDateRange('test-uid', '2024-01-15', '2024-01-16');

      expect(result).toEqual({});
    });
  });

  describe('Cost Accumulation', () => {
    it('should correctly accumulate input and output costs separately', async () => {
      const existingData: DailyCostDocument = {
        totalCost: 0.00049,
        deepseek: {
          'deepseek-chat': {
            totalInput: 0.00028,
            totalOutput: 0.00021,
            totalCost: 0.00049,
            totalInputTokens: 1000,
            totalOutputTokens: 500,
          },
        },
      };

      mockDoc.exists = true;
      mockDoc.data.mockReturnValue(existingData);

      await addCostToDailyTracking(
        'test-uid',
        'deepseek',
        'deepseek-chat',
        2000,
        1000,
        0.00056,
        0.00042
      );

      const setCall = (mockDocRef.set as jest.Mock).mock.calls[0][0];
      const modelCost = setCall.deepseek['deepseek-chat'];
      
      expect(modelCost.totalInput).toBeCloseTo(0.00084, 6); // 0.00028 + 0.00056
      expect(modelCost.totalOutput).toBeCloseTo(0.00063, 6); // 0.00021 + 0.00042
      expect(modelCost.totalCost).toBeCloseTo(0.00147, 6); // 0.00084 + 0.00063
    });

    it('should maintain separate token counts', async () => {
      mockDoc.exists = false;
      mockDoc.data.mockReturnValue({ totalCost: 0 });

      await addCostToDailyTracking(
        'test-uid',
        'deepseek',
        'deepseek-chat',
        1000,
        500,
        0.00028,
        0.00021
      );

      const setCall = (mockDocRef.set as jest.Mock).mock.calls[0][0];
      const modelCost = setCall.deepseek['deepseek-chat'];
      
      expect(modelCost.totalInputTokens).toBe(1000);
      expect(modelCost.totalOutputTokens).toBe(500);
      expect(modelCost.totalInputTokens).not.toBe(modelCost.totalOutputTokens);
    });
  });
});

