import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConsultOllamaHandler } from '../../src/handlers/ConsultOllamaHandler';
import { OllamaService } from '../../src/services/OllamaService';
import { ModelValidator } from '../../src/services/ModelValidator';

describe('ConsultOllamaHandler', () => {
  let handler: ConsultOllamaHandler;
  let mockService: OllamaService;
  let mockValidator: ModelValidator;

  beforeEach(() => {
    mockService = {
      consult: vi.fn(),
      getConfig: vi.fn(),
    } as any;

    mockValidator = {
      getAvailableModels: vi
        .fn()
        .mockResolvedValue([{ name: 'llama2', installed: true, isCloud: false }]),
      isModelAvailable: vi.fn().mockResolvedValue(true),
      getDefaultModel: vi.fn().mockResolvedValue('llama2'),
      getSuggestions: vi.fn().mockResolvedValue(['llama2']),
    } as any;

    handler = new ConsultOllamaHandler(mockService, mockValidator);
  });

  describe('handle', () => {
    it('should successfully consult with model and prompt', async () => {
      const mockResponse = {
        model: 'llama2',
        response: 'Test response',
        done: true,
      };

      vi.mocked(mockService.consult).mockResolvedValueOnce(mockResponse);

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

      expect(mockService.consult).toHaveBeenCalledWith({
        model: 'llama2',
        prompt: 'Test prompt',
        stream: false,
      });
    });

    it('should include system prompt if provided', async () => {
      const mockResponse = {
        model: 'llama2',
        response: 'Test response',
        done: true,
      };

      vi.mocked(mockService.consult).mockResolvedValueOnce(mockResponse);

      await handler.handle({
        model: 'llama2',
        prompt: 'Test prompt',
        system_prompt: 'You are helpful',
      });

      expect(mockService.consult).toHaveBeenCalledWith({
        model: 'llama2',
        prompt: 'Test prompt',
        systemPrompt: 'You are helpful',
        stream: false,
      });
    });

    it('should validate required model parameter', async () => {
      // Model is now optional - should use default instead
      const mockResponse = {
        model: 'llama2',
        response: 'Test response',
        done: true,
      };

      vi.mocked(mockService.consult).mockResolvedValueOnce(mockResponse);

      const result = await handler.handle({ prompt: 'test' });

      expect(result.content[0]?.type).toBe('text');
      expect(mockService.consult).toHaveBeenCalled();
    });

    it('should validate required prompt parameter', async () => {
      const result = await handler.handle({ model: 'llama2' });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('Error');
    });

    it('should handle errors with proper formatting', async () => {
      vi.mocked(mockService.consult).mockRejectedValueOnce(new Error('Connection refused'));

      const result = await handler.handle({
        model: 'llama2',
        prompt: 'test',
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: expect.stringContaining('Error consulting Ollama'),
          },
        ],
        isError: true,
      });
    });

    it('should handle OllamaError with proper formatting', async () => {
      const { OllamaError } = await import('../../src/types');

      vi.mocked(mockService.consult).mockRejectedValueOnce(
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
