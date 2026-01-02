import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callToolHandler } from '../src/handlers/callToolHandler';
import { OllamaService } from '../src/services/OllamaService';
import { ConfigManager } from '../src/config/ConfigManager';
import { ModelValidator } from '../src/services/ModelValidator';

describe('callToolHandler', () => {
  let mockService: OllamaService;
  let mockValidator: ModelValidator;
  let sessionContext: Map<string, unknown>;
  let handler: any;

  beforeEach(() => {
    const config = new ConfigManager();
    mockService = new OllamaService(config);
    // Mock methods
    mockService.consult = vi.fn().mockResolvedValue({ response: 'mock response' } as any);
    mockService.listModels = vi.fn().mockResolvedValue([{ name: 'm1' }, { name: 'm2' }]);

    mockValidator = {
      getAvailableModels: vi.fn().mockResolvedValue([
        { name: 'm1', installed: true },
        { name: 'm2', installed: true },
      ]),
      isModelAvailable: vi.fn().mockResolvedValue(true),
      getSuggestions: vi.fn().mockResolvedValue(['m1']),
      getDefaultModel: vi.fn().mockResolvedValue('m1'),
    } as any;

    sessionContext = new Map();
    handler = callToolHandler(mockService, sessionContext, mockValidator);
  });

  it('list_ollama_models returns available models text', async () => {
    const res = await handler.handle({ params: { name: 'list_ollama_models', arguments: {} } });
    expect(res).toBeDefined();
    expect(res.content[0].text).toContain('m1');
    expect(res.content[0].text).toContain('m2');
  });

  it('consult_ollama returns generated text', async () => {
    const res = await handler.handle({
      params: {
        name: 'consult_ollama',
        arguments: { model: 'm1', prompt: 'p' },
      },
    });
    expect(res).toBeDefined();
    expect(res.content[0].text).toBe('mock response');
  });

  it('consult_ollama can auto-suggest temperature/timeout', async () => {
    const consultSpy = vi.spyOn(mockService, 'consult');

    await handler.handle({
      params: {
        name: 'consult_ollama',
        arguments: { model: 'qwen2.5-coder:7b', prompt: 'write code', auto_settings: true },
      },
    });

    expect(consultSpy).toHaveBeenCalled();
    const req = consultSpy.mock.calls[0]?.[0] as any;
    expect(req.temperature).toBeTypeOf('number');
    expect(req.timeout).toBeTypeOf('number');
  });

  it('compare_ollama_responses returns outputs from multiple models', async () => {
    // Mock consult to return different values based on model
    vi.spyOn(mockService, 'consult').mockImplementation(async (req: any) => {
      return { response: `response from ${req.model}` } as any;
    });

    const res = await handler.handle({
      params: {
        name: 'compare_ollama_responses',
        arguments: { models: ['m1', 'm2'], prompt: 'p' },
      },
    });
    expect(res).toBeDefined();
    const json = JSON.parse(res.content[0].text);
    expect(json).toHaveLength(2);
    expect(json[0].response).toBe('response from m1');
    expect(json[1].response).toBe('response from m2');
  });
});
