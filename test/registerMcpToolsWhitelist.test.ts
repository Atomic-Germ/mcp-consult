import { describe, it, expect } from 'vitest';
import { registerMcpTools } from '../src/mcpToolRegistrar';

describe('registerMcpTools whitelist behavior', () => {
  it('only registers allowed tools based on MCP_ALLOWED_TOOLS env var', async () => {
    const old = process.env.MCP_ALLOWED_TOOLS;
    process.env.MCP_ALLOWED_TOOLS = 'consult_ollama';

    const names = await registerMcpTools(false);
    expect(names).toEqual(['consult_ollama']);

    if (old === undefined) delete process.env.MCP_ALLOWED_TOOLS;
    else process.env.MCP_ALLOWED_TOOLS = old;
  });
});
