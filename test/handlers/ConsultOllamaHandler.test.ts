import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConsultOllamaHandler } from '../../src/handlers/ConsultOllamaHandler';
import { OllamaService } from '../../src/services/OllamaService';
import { ModelValidator } from '../../src/services/ModelValidator';

describe('ConsultOllamaHandler', () => {
  let handler: ConsultOllamaHandler;
  let mockService: OllamaService;
  let mockValidator: ModelValidator;

  beforeEach(() => {
    // Enable advanced streaming behavior for tests that rely on consultStream
    process.env.MCP_ENABLE_ADVANCED_STREAMING = '1';

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

  afterEach(() => {
    delete process.env.MCP_ENABLE_ADVANCED_STREAMING;
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

      expect(mockService.consult).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'llama2',
          prompt: 'Test prompt',
          stream: true,
        })
      );
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
      }, {
        reportProgress: async () => {},
        reportMessage: async () => {},
      });

      expect(mockService.consult).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'llama2',
          prompt: 'Test prompt',
          stream: true,
          systemPrompt: expect.stringContaining('You are helpful'),
        })
      );
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

    it('should call reporters when streaming and reporters are provided (using consultStream)', async () => {
      const mockResponse = {
        model: 'llama2',
        response: 'partial',
        done: true,
      };

      const reportProgress = vi.fn();
      const reportMessage = vi.fn();

      // Mock consultStream to yield two chunks then return final
      const mockStream = async function* () {
        yield { response: 'A' };
        yield { response: 'B' };
        return mockResponse;
      };

      (mockService as any).consultStream = vi.fn().mockImplementation(mockStream);

      const result = await handler.handle({ model: 'llama2', prompt: 'test' }, { reportProgress, reportMessage });

      // Ensure consultStream was used
      expect((mockService as any).consultStream).toHaveBeenCalled();
      expect(reportMessage).toHaveBeenCalled();
      expect(reportProgress).toHaveBeenCalled();
      expect(result.content[0]?.text).toBe('partial');
    });

    it('injects a streaming system hint by default', async () => {
      const reportProgress = vi.fn();
      const reportMessage = vi.fn();

      const mockStream = async function* () {
        return { model: 'llama2', response: 'done', done: true };
      };

      const spyStream = vi.fn().mockImplementation(mockStream);
      (mockService as any).consultStream = spyStream;

      await handler.handle({ model: 'llama2', prompt: 'test' }, { reportProgress, reportMessage });

      expect(spyStream).toHaveBeenCalled();
      const calledArg = spyStream.mock.calls[0][0];
      expect(typeof calledArg.systemPrompt).toBe('string');
      expect(calledArg.systemPrompt).toContain('Please stream intermediate outputs');
    });

    it('heartbeats when no chunks arrive for heartbeat interval', async () => {
      vi.useFakeTimers();
      const reportProgress = vi.fn();
      const reportMessage = vi.fn();

      // Create a consultStream which waits (promise) before yielding first chunk
      let resolveFirst: () => void;
      const mockStream = async function* () {
        await new Promise<void>((resolve) => {
          resolveFirst = resolve;
        });
        yield { response: 'X' };
        return { model: 'llama2', response: 'X', done: true };
      };

      (mockService as any).consultStream = mockStream as any;

      const p = handler.handle({ model: 'llama2', prompt: 'test' }, { reportProgress, reportMessage });

      // Advance time to trigger heartbeat
      const HEARTBEAT_MS = parseInt(process.env.MCP_HEARTBEAT_INTERVAL_MS || '15000', 10);
      vi.advanceTimersByTime(HEARTBEAT_MS + 1000);
      // Ensure timers run (async) and microtasks flush
      if (typeof vi.runAllTimersAsync === 'function') await vi.runAllTimersAsync();
      await Promise.resolve();

      expect(reportMessage).toHaveBeenCalled();

      // Now resolve the stream so handler completes
      resolveFirst!();
      await p;

      vi.useRealTimers();
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
