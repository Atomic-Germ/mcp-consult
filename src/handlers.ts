import axios from "axios";
import fs from "fs/promises";
import path from "path";
import os from "os";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

// Ensure a reasonable default timeout for Ollama calls
axios.defaults.timeout = axios.defaults.timeout || 60_000;

export function listTools() {
  return {
    tools: [
      {
        name: "consult_ollama",
        description:
          "Consult an Ollama model with a prompt and get its response for reasoning from another viewpoint.",
        inputSchema: {
          type: "object",
          properties: {
            model: { type: "string" },
            prompt: { type: "string" },
            system_prompt: { type: "string" },
          },
          required: ["model", "prompt"],
        },
      },
      {
        name: "list_ollama_models",
        description: "List all available Ollama models on the local instance.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "compare_ollama_models",
        description:
          "Run the same prompt against multiple Ollama models and return their outputs side-by-side for comparison.",
        inputSchema: {
          type: "object",
          properties: {
            models: { type: "array", items: { type: "string" } },
            prompt: { type: "string" },
            system_prompt: { type: "string" },
          },
          required: ["prompt"],
        },
      },
      {
        name: "remember_consult",
        description: "Store the result of a consult into a local memory store (or configured memory service).",
        inputSchema: {
          type: "object",
          properties: {
            key: { type: "string" },
            prompt: { type: "string" },
            model: { type: "string" },
            response: { type: "string" },
          },
          required: ["prompt"],
        },
      },
    ],
  };
}

// The handler expects the `params` object (i.e. the CallTool request params).
export async function callToolHandler(params: { name: string; arguments?: any }): Promise<any> {
  const name = params.name;
  const args = params.arguments || {};

  switch (name) {
    case "consult_ollama": {
      const model = args?.model as string;
      const prompt = args?.prompt as string;
      const system_prompt = args?.system_prompt as string | undefined;

      try {
        const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
          model,
          prompt,
          system: system_prompt,
          stream: false,
        });

        return {
          content: [
            {
              type: "text",
              text: response.data.response,
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text",
              text: `Error consulting Ollama: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "list_ollama_models": {
      try {
        const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`);
        const models = (response.data.models || []).map((m: any) => m.name).join(", ");

        return {
          content: [
            {
              type: "text",
              text: `Available models: ${models}`,
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text",
              text: `Error listing models: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }

    case "compare_ollama_models": {
      const modelsArg = args?.models as string[] | undefined;
      const prompt = args?.prompt as string;
      const system_prompt = args?.system_prompt as string | undefined;

      if (!prompt) {
        return {
          content: [
            {
              type: "text",
              text: "Missing required argument: prompt",
            },
          ],
          isError: true,
        };
      }

      let modelsToUse: string[] = [];
      if (Array.isArray(modelsArg) && modelsArg.length > 0) {
        modelsToUse = modelsArg;
      } else {
        try {
          const resp = await axios.get(`${OLLAMA_BASE_URL}/api/tags`);
          modelsToUse = (resp.data.models || []).map((m: any) => m.name).slice(0, 2);
        } catch (err) {
          modelsToUse = ["llama2"];
        }
      }

      const contents: any[] = [];
      for (const m of modelsToUse) {
        try {
          const gen = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
            model: m,
            prompt,
            system: system_prompt,
            stream: false,
          });
          contents.push({ type: "text", text: `Model ${m}:\n${gen.data.response}` });
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          contents.push({ type: "text", text: `Model ${m} failed: ${message}` });
        }
      }

      return { content: contents };
    }

    case "remember_consult": {
      const key = args?.key as string | undefined;
      const prompt = args?.prompt as string | undefined;
      const model = args?.model as string | undefined;
      let responseText = args?.response as string | undefined;

      if (!prompt) {
        return {
          content: [
            {
              type: "text",
              text: "Missing required argument: prompt",
            },
          ],
          isError: true,
        };
      }

      if (!responseText) {
        // generate using Ollama if a model was provided
        if (!model) {
          return {
            content: [
              { type: "text", text: "Missing 'response' and no 'model' provided to generate it." },
            ],
            isError: true,
          };
        }

        try {
          const gen = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
            model,
            prompt,
            stream: false,
          });
          responseText = gen.data.response;
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          return {
            content: [{ type: "text", text: `Failed to generate response: ${message}` }],
            isError: true,
          };
        }
      }

      const payload = {
        key: key || `consult-${Date.now()}`,
        prompt,
        model: model || null,
        response: responseText,
        resource: {
          uri: `mcp-consult://consult/${Date.now()}`,
          text: responseText,
        },
      };

      // Build candidate servers list: env override, vscode mcp.json entries (prefer 'remember' then 'memory'), and MEMORY_MCP_CMD
      const tryServers: Array<any> = [];
      try {
        const envCfg = process.env.REMEMBER_MCP_CONFIG;
        if (envCfg) {
          try {
            const parsed = JSON.parse(envCfg);
            tryServers.push(parsed);
          } catch (e) {
            const [cmd, ...argList] = envCfg.split(/\s+/);
            tryServers.push({ type: "stdio", command: cmd, args: argList });
          }
        }
      } catch (e) {
        // ignore
      }

      try {
        const vscodeMcpPath = process.env.VSCODE_MCP_JSON || path.join(os.homedir(), "Library", "Application Support", "Code", "User", "mcp.json");
        const raw = await fs.readFile(vscodeMcpPath, "utf-8").catch(() => "");
        if (raw) {
          try {
            const cfg = JSON.parse(raw);
            const servers = cfg.servers || {};
            const keys = Object.keys(servers || {});
            const rememberKey = keys.find((k) => k.toLowerCase().includes("remember"));
            const memoryKey = keys.find((k) => k.toLowerCase().includes("memory"));
            if (rememberKey) tryServers.push(servers[rememberKey]);
            if (memoryKey) tryServers.push(servers[memoryKey]);
          } catch (e) {
            // ignore parse errors
          }
        }
      } catch (e) {
        // ignore
      }

      if (process.env.MEMORY_MCP_CMD) {
        const cmd = process.env.MEMORY_MCP_CMD;
        const argsList = process.env.MEMORY_MCP_ARGS ? JSON.parse(process.env.MEMORY_MCP_ARGS) : [];
        tryServers.push({ type: "stdio", command: cmd, args: argsList });
      }

      // Helper to attempt calling a memory MCP server via stdio transport
      async function tryCallMemoryServer(serverCfg: any): Promise<any> {
        if (!serverCfg || serverCfg.type !== "stdio" || !serverCfg.command) throw new Error("unsupported server cfg");

        const transport = new StdioClientTransport({ command: serverCfg.command, args: serverCfg.args || [] });
        const client = new Client({ name: "mcp-memory-client", version: "1.0.0" });

        // limit connection time
        const conn = client.connect(transport);
        const timeoutMs = 10_000;
        await Promise.race([
          conn,
          new Promise((_, rej) => setTimeout(() => rej(new Error("connect timeout")), timeoutMs)),
        ]);

        const toolsRes = await client.listTools();
        const tools = toolsRes.tools || [];
        const patterns = ["remember", "store", "add", "write", "create", "save", "observe", "put", "set", "append"];
        let chosen: any = null;
        for (const p of patterns) {
          const found = tools.find((t: any) => t.name && t.name.toLowerCase().includes(p));
          if (found) {
            chosen = found;
            break;
          }
        }

        if (!chosen && tools.length > 0) {
          chosen = tools.find((t: any) => t.inputSchema && t.inputSchema.type === "object") || tools[0];
        }

        if (!chosen) {
          await client.close();
          throw new Error("no suitable tool on memory server");
        }

        const inputSchema = chosen.inputSchema || {};
        const props = inputSchema.properties || {};
        const toolArgs: any = {};
        if (props["response"] !== undefined || props["text"] !== undefined || props["value"] !== undefined || props["content"] !== undefined) {
          if (props["response"] !== undefined) toolArgs.response = payload.response;
          if (props["text"] !== undefined) toolArgs.text = payload.response;
          if (props["value"] !== undefined) toolArgs.value = payload.response;
          if (props["content"] !== undefined) toolArgs.content = payload.response;
        }
        if (props["resource"] !== undefined || props["uri"] !== undefined) {
          toolArgs.resource = payload.resource;
        }
        if (props["key"] !== undefined) toolArgs.key = payload.key;
        if (props["prompt"] !== undefined) toolArgs.prompt = payload.prompt;
        if (props["model"] !== undefined) toolArgs.model = payload.model;
        if (Object.keys(toolArgs).length === 0) {
          toolArgs.key = payload.key;
          toolArgs.prompt = payload.prompt;
          toolArgs.response = payload.response;
          toolArgs.resource = payload.resource;
        }

        const callRes = await client.callTool({ name: chosen.name, arguments: toolArgs }, CallToolResultSchema).catch((e) => ({ isError: true, error: e }));
        await client.close();
        return callRes;
      }

      // Try candidate servers sequentially
      for (const s of tryServers) {
        try {
          const r = await tryCallMemoryServer(s);
          if (r && !r.isError) {
            return r;
          }
        } catch (e) {
          // try next server
        }
      }

      // Fallback: persist to a simple local memory directory
      const memoryDir = process.env.MEMORY_DIR || path.join("/tmp", "mcp-consult-memory");
      try {
        await fs.mkdir(memoryDir, { recursive: true });
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const filePath = path.join(memoryDir, `observation-${id}.json`);
        const payloadToWrite = { key: payload.key || null, prompt: payload.prompt, model: payload.model || null, response: payload.response, _meta: { createdAt: new Date().toISOString() } };
        await fs.writeFile(filePath, JSON.stringify(payloadToWrite, null, 2), "utf-8");

        return {
          content: [
            {
              type: "text",
              text: `Saved consult to ${filePath}`,
            },
            {
              type: "resource",
              resource: {
                uri: `file://${filePath}`,
                text: payload.response,
              },
            },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Failed to save memory: ${message}` }], isError: true };
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export default { listTools, callToolHandler };
