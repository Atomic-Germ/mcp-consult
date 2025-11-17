const DEBUG = Boolean(process.env.DEBUG_MCP);

export function info(...args: any[]) {
  console.info('[mcp]', ...args);
}

export function warn(...args: any[]) {
  console.warn('[mcp]', ...args);
}

export function error(...args: any[]) {
  console.error('[mcp]', ...args);
}

export function debug(...args: any[]) {
  if (DEBUG) console.debug('[mcp][debug]', ...args);
}

export default { info, warn, error, debug };
