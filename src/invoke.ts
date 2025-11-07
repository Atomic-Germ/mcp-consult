import axios from "axios";
import { ExecutionContext } from "./types";
import { callToolHandler } from "./handlers";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

export async function invokeOllama(model: string, prompt: string, system?: string): Promise<any> {
  const resp = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
    model,
    prompt,
    system,
    stream: false,
  });

  if (!resp || !resp.data) throw new Error("No response from Ollama");
  // Ollama shape: { response: "..." }
  return resp.data.response;
}

const toolRegistry: Record<string, (args: any) => Promise<any>> = {};

export function registerTool(name: string, fn: (args: any) => Promise<any>) {
  toolRegistry[name] = fn;
}

export async function invokeTool(name: string, args: any): Promise<any> {
  const fn = toolRegistry[name];
  if (fn) return await fn(args);

  // Fallback: try calling local MCP handlers if available
  try {
    const res = await callToolHandler({ name, arguments: args });
    return res;
  } catch (e) {
    throw new Error(`Unknown tool or handler failed: ${name} (${(e as Error).message})`);
  }
}

function resolvePath(obj: any, path: string): any {
  if (!obj) return undefined;
  if (!path) return undefined;
  const parts = path.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

export function renderTemplate(template: string, ctx: { memory: Record<string, any>; variables: Record<string, any> }) {
  if (!template) return "";
  return template.replace(/\${([^}]+)}/g, (_, expr: string) => {
    const parts = expr.split(".");
    if (parts[0] === "memory") {
      return String(resolvePath(ctx.memory, parts.slice(1).join(".")) ?? "");
    }
    if (parts[0] === "variables" || parts[0] === "$") {
      return String(resolvePath(ctx.variables, parts.slice(1).join(".")) ?? "");
    }
    // fallback: try variables then memory
    const v = resolvePath(ctx.variables, expr);
    if (v !== undefined) return String(v);
    const m = resolvePath(ctx.memory, expr);
    if (m !== undefined) return String(m);
    return "";
  });
}

export default { invokeOllama, registerTool, invokeTool, renderTemplate };
