import axios from "axios";
import fs from "fs/promises";
import path from "path";

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
      {
        name: "search_consults",
        description: "Search saved consults by query across prompt/model/response/key/sessionId fields.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" },
            sessionId: { type: "string" },
            model: { type: "string" },
            key: { type: "string" },
            limit: { type: "number" },
          },
          required: [],
        },
      },
      {
        name: "list_consults",
        description: "List saved consults stored in MEMORY_DIR (or temp default).",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "read_consult",
        description: "Read a saved consult by filename (returns content + metadata).",
        inputSchema: {
          type: "object",
          properties: { filename: { type: "string" } },
          required: ["filename"],
        },
      },
      {
        name: "critique_consult",
        description: "Run one or more models against a saved consult to produce critique outputs.",
        inputSchema: {
          type: "object",
          properties: {
            filename: { type: "string" },
            models: { type: "array", items: { type: "string" } },
            system_prompt: { type: "string" },
            prompt_prefix: { type: "string" },
          },
          required: ["filename"],
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
      const sessionId = args?.sessionId as string | undefined;
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

      // Persist to a simple local memory directory by default. Can be overridden with MEMORY_DIR.
      const memoryDir = process.env.MEMORY_DIR || path.join("/tmp", "mcp-consult-memory");
      try {
        await fs.mkdir(memoryDir, { recursive: true });
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const filePath = path.join(memoryDir, `observation-${id}.json`);
        const payload: any = { key: key || null, prompt, model: model || null, response: responseText, _meta: { createdAt: new Date().toISOString() } };
        if (sessionId) payload.sessionId = sessionId;
        await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf-8");

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
                text: responseText,
              },
            },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Failed to save memory: ${message}` }], isError: true };
      }
    }

    case "list_consults": {
      // Return the list of saved files in MEMORY_DIR
      const memoryDir = process.env.MEMORY_DIR || path.join("/tmp", "mcp-consult-memory");
      try {
        const files = await fs.readdir(memoryDir);
        const entries: any[] = [];
        for (const f of files) {
          try {
            const full = path.join(memoryDir, f);
            const text = await fs.readFile(full, "utf-8");
            const parsed = JSON.parse(text);
            entries.push({ filename: f, key: parsed.key || null, prompt: parsed.prompt || null, model: parsed.model || null, _meta: parsed._meta || null });
          } catch (e) {
            // ignore parse errors and continue
            entries.push({ filename: f, error: `failed to parse ${f}` });
          }
        }

        return { content: [{ type: "resource", resource: { entries } }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Failed to list consult memories: ${message}` }], isError: true };
      }
    }

    case "read_consult": {
      const filename = args?.filename as string | undefined;
      if (!filename) {
        return { content: [{ type: "text", text: "Missing required argument: filename" }], isError: true };
      }
      const memoryDir = process.env.MEMORY_DIR || path.join("/tmp", "mcp-consult-memory");
      try {
        const full = path.join(memoryDir, filename);
        const text = await fs.readFile(full, "utf-8");
        try {
          const parsed = JSON.parse(text);
          return { content: [{ type: "resource", resource: { uri: `file://${full}`, text, metadata: parsed } }] };
        } catch (e) {
          return { content: [{ type: "resource", resource: { uri: `file://${full}`, text } }] };
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Failed to read consult memory: ${message}` }], isError: true };
      }
    }

    case "critique_consult": {
      const filename = args?.filename as string | undefined;
      const modelsArg = args?.models as string[] | undefined;
      const system_prompt = args?.system_prompt as string | undefined;
      const prompt_prefix = args?.prompt_prefix as string | undefined || "";

      if (!filename) {
        return { content: [{ type: "text", text: "Missing required argument: filename" }], isError: true };
      }

      const memoryDir = process.env.MEMORY_DIR || path.join("/tmp", "mcp-consult-memory");
      try {
        const full = path.join(memoryDir, filename);
        const text = await fs.readFile(full, "utf-8");
        let parsed: any = null;
        try {
          parsed = JSON.parse(text);
        } catch (e) {
          parsed = { response: text };
        }
        const sourceText = parsed.response || parsed.text || text;

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
        const prompt = `${prompt_prefix}\n\n${sourceText}`.trim();
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
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Failed to critique consult: ${message}` }], isError: true };
      }
    }

    case "search_consults": {
      const query = (args?.query as string | undefined) || undefined;
      const sessionId = (args?.sessionId as string | undefined) || undefined;
      const model = (args?.model as string | undefined) || undefined;
      const key = (args?.key as string | undefined) || undefined;
      const limit = (typeof args?.limit === "number" && args.limit > 0) ? args.limit : 50;

      const memoryDir = process.env.MEMORY_DIR || path.join("/tmp", "mcp-consult-memory");
      try {
        const files = await fs.readdir(memoryDir);
        const results: any[] = [];
        for (const f of files) {
          try {
            const full = path.join(memoryDir, f);
            const text = await fs.readFile(full, "utf-8");
            let parsed: any = null;
            try {
              parsed = JSON.parse(text);
            } catch (e) {
              parsed = { response: text };
            }

            // Apply filters
            if (sessionId && parsed.sessionId !== sessionId) continue;
            if (model && parsed.model !== model) continue;
            if (key && parsed.key !== key) continue;

            // Search by query in prompt, response, key, model, sessionId
            let matches = true;
            if (query) {
              const q = query.toLowerCase();
              const hay = [parsed.prompt, parsed.response, parsed.key, parsed.model, parsed.sessionId].filter(Boolean).join(" ").toLowerCase();
              matches = hay.includes(q);
            }

            if (!matches) continue;

            results.push({ filename: f, prompt: parsed.prompt || null, model: parsed.model || null, key: parsed.key || null, sessionId: parsed.sessionId || null, createdAt: parsed._meta?.createdAt || null });
            if (results.length >= limit) break;
          } catch (e) {
            // ignore individual file errors
          }
        }

        return { content: [{ type: "resource", resource: { results } }] };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Failed to search consults: ${message}` }], isError: true };
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export default { listTools, callToolHandler };
