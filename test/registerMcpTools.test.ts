import { describe, it, expect, vi } from 'vitest';
import { registerMcpTools } from '../src/mcpToolRegistrar';
import * as handlers from '../src/handlers';
import { invokeTool } from '../src/invoke';

describe('registerMcpTools', () => {
  it('registers MCP tools and allows invoking them via invokeTool', async () => {
    const fakeRes = { content: [{ type: 'text', text: 'ok' }] };

    const spy = vi.spyOn(handlers, 'callToolHandler').mockResolvedValue(fakeRes as any);

    const names = await registerMcpTools();
    expect(names.length).toBeGreaterThan(0);
    // Try invoking each registered tool
    for (const name of names) {
      const out = await invokeTool(name, { prompt: 'hello' });
      expect(spy).toHaveBeenCalled();
      expect(out).toEqual(fakeRes);
    }

    spy.mockRestore();
  });
});
