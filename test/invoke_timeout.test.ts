import { describe, it, expect } from 'vitest';
import { registerTool, invokeTool } from '../src/invoke';

describe('invokeTool timeouts', () => {
  it('times out a slow registered tool', async () => {
    // Register a slow tool that resolves after 50ms
    registerTool('slow_test', async (_args: any) => {
      return new Promise((res) => setTimeout(() => res({ ok: true }), 50));
    });

    // invoke with a 10ms timeout
    await expect(invokeTool('slow_test', {}, { timeoutMs: 10 })).rejects.toThrow(/timed out/i);
  });
});
