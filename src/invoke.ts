import axios from 'axios';
import { callToolHandler } from './legacy-handlers';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_TOOL_TIMEOUT_MS = Number(process.env.MCP_TOOL_TIMEOUT_MS || 10000);

export async function invokeOllama(
  model: string,
  prompt: string,
  system?: string
): Promise<string> {
  try {
    const resp = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
      model,
      prompt,
      system,
      stream: false,
    });

    if (!resp || !resp.data) throw new Error('No response from Ollama');
    return resp.data.response;
  } catch (error) {
    throw error;
  }
}

const toolRegistry: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {};

export function registerTool(
  name: string,
  fn: (args: Record<string, unknown>) => Promise<unknown>
) {
  toolRegistry[name] = fn;
}

function withTimeout<T>(p: Promise<T>, ms: number, name?: string): Promise<T> {
  if (ms == null || ms === Infinity) return p;
  let timer: NodeJS.Timeout | null = null;
  const t = new Promise<never>((_, rej) => {
    timer = setTimeout(
      () => rej(new Error(`Tool invocation timed out after ${ms}ms${name ? `: ${name}` : ''}`)),
      ms
    );
  });
  return Promise.race([
    p.then((r) => {
      if (timer) clearTimeout(timer);
      return r;
    }),
    t,
  ]) as Promise<T>;
}

export async function invokeTool(
  name: string,
  args: Record<string, unknown>,
  options?: { timeoutMs?: number }
): Promise<unknown> {
  const fn = toolRegistry[name];
  const timeoutMs =
    options && typeof options.timeoutMs === 'number' ? options.timeoutMs : DEFAULT_TOOL_TIMEOUT_MS;

  if (fn) {
    const p = Promise.resolve(fn(args));
    return await withTimeout(p, timeoutMs, name);
  }

  try {
    const p = Promise.resolve(callToolHandler({ name, arguments: args }));
    return await withTimeout(p, timeoutMs, name);
  } catch (error) {
    throw new Error(
      `Unknown tool or handler failed: ${name} (${error instanceof Error ? error.message : 'Unknown error'})`
    );
  }
}

function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  if (!obj) return undefined;
  if (!path) return undefined;
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

export function renderTemplate(
  template: string,
  ctx: { memory: Record<string, unknown>; variables: Record<string, unknown> }
) {
  if (!template) return '';
  return template.replace(/\${([^}]+)}/g, (_, expr: string) => {
    const parts = expr.split('.');
    if (parts[0] === 'memory') {
      return String(resolvePath(ctx.memory, parts.slice(1).join('.')) ?? '');
    }
    if (parts[0] === 'variables' || parts[0] === '$') {
      return String(resolvePath(ctx.variables, parts.slice(1).join('.')) ?? '');
    }
    const v = resolvePath(ctx.variables, expr);
    if (v !== undefined) return String(v);
    const m = resolvePath(ctx.memory, expr);
    if (m !== undefined) return String(m);
    return '';
  });
}
