import fs from 'fs';

/**
 * Read allowed MCP tools from environment or config file.
 * Priority: ENV var MCP_ALLOWED_TOOLS (comma-separated or JSON array) > config file (mcp.config.json) > undefined
 */
export function getAllowedTools(): string[] | undefined {
  const env = process.env.MCP_ALLOWED_TOOLS || process.env.ALLOWED_MCP_TOOLS;
  if (env) {
    const trimmed = env.trim();
    try {
      if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map(String);
      }
    } catch (_e) {
      const e = _e;
      // fallthrough to comma split
    }
    return trimmed
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const cfgPath = process.env.MCP_CONFIG_PATH || './mcp.config.json';
  try {
    if (fs.existsSync(cfgPath)) {
      const raw = fs.readFileSync(cfgPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.allowedTools)) return parsed.allowedTools.map(String);
    }
  } catch (_e) {
    const e = _e;
    // ignore
  }

  return undefined;
}

export default { getAllowedTools };
