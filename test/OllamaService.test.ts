import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaService } from '../src/services/OllamaService';
import { ConfigManager } from '../src/config/ConfigManager';
import { OllamaError, ValidationError } from '../src/types';

describe('OllamaService', () => {
  let service: OllamaService;
  let mockConfig: ConfigManager;
  let fetchSpy: any;

  beforeEach(() => {
    mockConfig = {
      getApiUrl: vi.fn((endpoint: string) => `http://localhost:11434${endpoint}`),
      getTimeout: vi.fn(() => 30000),
      getMaxRetries: vi.fn(() => 3),
    } as any;

    service = new OllamaService(mockConfig);
    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('listModels', () => {
    it('should successfully list models', async () => {
      const mockModels = [
        { name: 'llama2', size: 3825819519 },
        { name: 'codellama', size: 3825819519 },
      ];

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ models: mockModels }),
      });

      const result = await service.listModels();
      expect(result).toEqual(mockModels);
      expect(fetchSpy).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should return empty array if no models', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({}),
      });

      const result = await service.listModels();
      expect(result).toEqual([]);
    });

    it('should throw OllamaError on API error', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(service.listModels()).rejects.toThrow(OllamaError);
    });

    it('should throw OllamaError on connection failure', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(service.listModels()).rejects.toThrow(OllamaError);
    });

    it('should handle timeout', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('Timeout'));

      await expect(service.listModels()).rejects.toThrow(OllamaError);
    });
  });

  describe('consult', () => {
    it('should successfully consult with minimal request', async () => {
      const mockResponse = {
        model: 'llama2',
        response: 'Test response',
        done: true,
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.consult({
        model: 'llama2',
        prompt: 'Test prompt',
        stream: false,
      });

      expect(result).toEqual(mockResponse);
    });

    it('should successfully consult with full request', async () => {
      const mockResponse = {
        model: 'llama2',
        response: 'Test response',
        done: true,
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.consult({
        model: 'llama2',
        prompt: 'Test prompt',
        systemPrompt: 'You are helpful',
        temperature: 0.7,
        stream: false,
      });

      expect(result).toEqual(mockResponse);
      expect(fetchSpy).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"temperature":0.7'),
        })
      );
    });

    it('should validate model is required', async () => {
      await expect(service.consult({ model: '', prompt: 'test', stream: false })).rejects.toThrow(
        ValidationError
      );
    });

    it('should validate prompt is required', async () => {
      await expect(service.consult({ model: 'llama2', prompt: '', stream: false })).rejects.toThrow(
        ValidationError
      );
    });

    it('should validate temperature range', async () => {
      await expect(
        service.consult({
          model: 'llama2',
          prompt: 'test',
          temperature: -1,
          stream: false,
        })
      ).rejects.toThrow(ValidationError);

      await expect(
        service.consult({
          model: 'llama2',
          prompt: 'test',
          temperature: 3,
          stream: false,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should retry on transient errors', async () => {
      fetchSpy
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ model: 'llama2', response: 'Success', done: true }),
        });

      const result = await service.consult({
        model: 'llama2',
        prompt: 'test',
        stream: false,
      });

      expect(result.response).toBe('Success');
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    }, 10000);

    it('should throw after max retries exceeded', async () => {
      fetchSpy.mockRejectedValue(new Error('Network error'));

      await expect(
        service.consult({ model: 'llama2', prompt: 'test', stream: false })
      ).rejects.toThrow(OllamaError);

      expect(fetchSpy).toHaveBeenCalledTimes(4); // initial + 3 retries
    }, 10000);

    it('should not retry on validation errors', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Invalid model',
      });

      await expect(
        service.consult({ model: 'invalid', prompt: 'test', stream: false })
      ).rejects.toThrow(OllamaError);

      expect(fetchSpy).toHaveBeenCalledTimes(1); // no retries
    });

    it('should stream response when stream is true', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(JSON.stringify({ response: 'Hello ' }) + '\n'));
          controller.enqueue(encoder.encode(JSON.stringify({ response: 'world' }) + '\n'));
          controller.close();
        },
      });

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        body: stream,
      });

      const result = await service.consult({ model: 'llama2', prompt: 'Test prompt', stream: true });

      expect(result.response).toBe('Hello world');
      expect(fetchSpy).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"stream":true'),
        })
      );
    });

    it('should parse SSE-style data: lines and ignore [DONE]', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({ response: 'Alpha' }) + '\n\n'));
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({ response: 'Beta' }) + '\n\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      fetchSpy.mockResolvedValueOnce({ ok: true, body: stream });

      const result = await service.consult({ model: 'llama2', prompt: 'Test prompt', stream: true });

      expect(result.response).toBe('AlphaBeta');
    });

    it('consultStream yields chunks and returns final response', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(JSON.stringify({ response: 'X' }) + '\n'));
          controller.enqueue(encoder.encode(JSON.stringify({ response: 'Y' }) + '\n'));
          controller.close();
        },
      });

      fetchSpy.mockResolvedValueOnce({ ok: true, body: stream });

      const iterator = service.consultStream({ model: 'llama2', prompt: 'Test', stream: true })[Symbol.asyncIterator]();

      const first = await iterator.next();
      expect(first.done).toBe(false);
      expect(first.value.text || first.value.response).toBe('X');

      const second = await iterator.next();
      expect(second.done).toBe(false);
      expect(second.value.text || second.value.response).toBe('Y');

      const final = await iterator.next();
      expect(final.done).toBe(true);
      expect(final.value.response).toBe('XY');
    });
  });

  describe('compareModels', () => {
    it('should compare multiple models successfully', async () => {
      fetchSpy
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ model: 'llama2', response: 'Response 1', done: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ model: 'codellama', response: 'Response 2', done: true }),
        });

      const results = await service.compareModels(['llama2', 'codellama'], 'Test prompt');

      expect(results).toHaveLength(2);
      expect(results[0].model).toBe('llama2');
      expect(results[0].response).toBe('Response 1');
      expect(results[1].model).toBe('codellama');
      expect(results[1].response).toBe('Response 2');
      expect(results[0].duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle partial failures gracefully', async () => {
      fetchSpy
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ model: 'llama2', response: 'Success', done: true }),
        })
        .mockRejectedValueOnce(new Error('Model not found'));

      const results = await service.compareModels(['llama2', 'invalid'], 'Test prompt');

      expect(results).toHaveLength(2);
      expect(results[0].response).toBe('Success');
      expect(results[0].error).toBeUndefined();
      expect(results[1].response).toBe('');
      expect(results[1].error).toBeDefined();
    }, 15000);

    it('should validate models array', async () => {
      await expect(service.compareModels([], 'test')).rejects.toThrow(ValidationError);
    });

    it('should validate prompt', async () => {
      await expect(service.compareModels(['llama2'], '')).rejects.toThrow(ValidationError);
    });

    it('should include system prompt in requests', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ model: 'llama2', response: 'Response', done: true }),
      });

      await service.compareModels(['llama2'], 'Test', 'System prompt');

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"system":"System prompt"'),
        })
      );
    });
  });
});
