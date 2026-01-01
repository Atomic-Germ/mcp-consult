import { describe, it, expect } from 'vitest';
import { parseModelName, suggestConsultSettings } from '../src/modelSettings';
import { ConfigManager } from '../src/config/ConfigManager';

describe('modelSettings', () => {
  it('parses common model patterns', () => {
    const parsed = parseModelName('qwen2.5-coder:7b-Q4_K_M');
    expect(parsed.family).toBe('qwen');
    expect(parsed.variant).toBe('code');
    expect(parsed.quantization).toBe('Q4_K_M');
    expect(parsed.size).toContain('7');
  });

  it('suggests lower temperature for code models', () => {
    const cfg = new ConfigManager({ timeout: 60000 });
    const suggested = suggestConsultSettings({
      modelName: 'qwen2.5-coder:7b',
      prompt: 'Write a Typescript function to add two numbers.',
      hasSystemPrompt: false,
      baseTimeoutMs: cfg.getTimeout(),
    });

    expect(suggested.temperature).toBeLessThanOrEqual(0.4);
    expect(suggested.timeoutMs).toBeGreaterThanOrEqual(60_000);
  });
});
