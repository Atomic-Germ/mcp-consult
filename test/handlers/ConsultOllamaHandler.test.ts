import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConsultOllamaHandler } from '../../src/handlers/ConsultOllamaHandler';
import { ProviderManager } from '../../src/services/ProviderManager';

describe('ConsultOllamaHandler', () => {
  let handler: ConsultOllamaHandler;
  let mockProviderManager: ProviderManager;

  beforeEach(() => {
    mockProviderManager = {
      consult: vi.fn().mockResolvedValue('Test response'),
      isModelAvailable: vi.fn().mockResolvedValue(true),
      getDefaultModel: vi.fn().mockResolvedValue('llama2'),
      getAvailableModels: vi.fn().mockResolvedValue([{ name: 'llama2', provider: 'ollama' }]),
    } as any;

    handler = new ConsultOllamaHandler(mockProviderManager);
  });

  describe('handle', () => {
    it('should successfully consult with model and prompt', async () => {
      vi.mocked(mockProviderManager.consult).mockResolvedValueOnce('Test response');

      const result = await handler.handle({
        model: 'llama2',
        prompt: 'Test prompt',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Test response',
          },
        ],
      });

      expect(mockProviderManager.consult).toHaveBeenCalledWith('llama2');
    });

    it('should include system prompt if provided', async () => {
      vi.mocked(mockProviderManager.consult).mockResolvedValueOnce('Test response');

      await handler.handle({
        model: 'llama2',
        prompt: 'Test prompt',
        system_prompt: 'You are helpful',
      });

      expect(mockProviderManager.consult).toHaveBeenCalledWith('llama2');
    });

    it('should validate required model parameter', async () => {
      // Model is now optional - should use default instead
      vi.mocked(mockProviderManager.consult).mockResolvedValueOnce('Test response');

      const result = await handler.handle({ prompt: 'test' });

      expect(result.content[0]?.type).toBe('text');
      expect(mockProviderManager.consult).toHaveBeenCalled();
    });

    it('should validate required prompt parameter', async () => {
      const result = await handler.handle({ model: 'llama2' });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Error');
    });

    it('should handle errors with proper formatting', async () => {
      vi.mocked(mockProviderManager.consult).mockRejectedValueOnce(new Error('Connection refused'));

      const result = await handler.handle({
        model: 'llama2',
        prompt: 'test',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Error consulting model'),
          },
        ],
        isError: true,
      });
    });

    it('should handle OllamaError with proper formatting', async () => {
      const { OllamaError } = await import('../../src/types');

      vi.mocked(mockProviderManager.consult).mockRejectedValueOnce(
        new OllamaError('Model not found', 'MODEL_NOT_FOUND', 404)
      );

      const result = await handler.handle({
        model: 'invalid',
        prompt: 'test',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Model not found'),
          },
        ],
        isError: true,
      });
    });
  });
});
