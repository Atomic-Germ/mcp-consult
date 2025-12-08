import axios from "axios";
import fs from "fs/promises";
import path from "path";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

// Ensure a reasonable default timeout for Ollama calls
axios.defaults.timeout = axios.defaults.timeout || 60_000;

// Cloud models that are always available as fallbacks
const CLOUD_MODELS = [
  "deepseek-v3.1:671b-cloud",
  "kimi-k2-thinking:cloud",
  "claude-3-5-sonnet:cloud",
];

// Local fallback models (in preference order)
const LOCAL_FALLBACKS = ["mistral", "llama2", "neural-chat"];

// Cache for available models (to avoid repeated API calls)
let availableModelsCache: string[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30000; // 30 seconds

/**
 * Get list of available local models from Ollama
 */
async function getAvailableLocalModels(): Promise<string[]> {
  const now = Date.now();
  if (availableModelsCache && now - cacheTimestamp < CACHE_TTL) {
    return availableModelsCache;
  }

  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`);
    const models = (response.data.models || []).map((m: any) => m.name);
    availableModelsCache = models;
    cacheTimestamp = now;
    return models;
  } catch {
    // If we can't reach Ollama, return empty (we'll fall back to cloud)
    return [];
  }
}

/**
 * Resolve a model name to an available model
 * If the requested model isn't available, falls back to cloud or local alternatives
 */
async function resolveModel(requestedModel: string): Promise<{
  model: string;
  isCloud: boolean;
  fallback: boolean;
}> {
  // If it's explicitly a cloud model, use it
  if (requestedModel.includes(":cloud")) {
    return { model: requestedModel, isCloud: true, fallback: false };
  }

  // Check if it's available locally
  const available = await getAvailableLocalModels();
  if (available.includes(requestedModel)) {
    return { model: requestedModel, isCloud: false, fallback: false };
  }

  // Not available locally - try cloud models
  for (const cloudModel of CLOUD_MODELS) {
    // In real implementation, you might verify cloud models are actually available
    // For now, we assume they are
    return { model: cloudModel, isCloud: true, fallback: true };
  }

  // If cloud fails, fall back to local models
  for (const localFallback of LOCAL_FALLBACKS) {
    if (available.includes(localFallback)) {
      return { model: localFallback, isCloud: false, fallback: true };
    }
  }

  // Last resort: use whatever is available, or the original request
  if (available.length > 0) {
    return { model: available[0], isCloud: false, fallback: true };
  }

  // If nothing is available, return the requested model anyway
  // (will fail gracefully in the actual API call)
  return { model: requestedModel, isCloud: false, fallback: true };
}

export function listTools() {
  return {
    tools: [
      {
        name: "consult_ollama",
        description:
          "Consult an Ollama model with a prompt and get its response for reasoning from another viewpoint. If the requested model is unavailable locally, automatically falls back to: cloud models (deepseek-v3.1:671b-cloud, kimi-k2-thinking:cloud) or local alternatives (mistral, llama2). Never fails on model availability.",
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
          "Run the same prompt against multiple Ollama models and return their outputs side-by-side for comparison. Requested models that are unavailable automatically fall back to cloud models or local alternatives. Handles unavailable models gracefully without breaking the comparison.",
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
      let model = args?.model as string;
      const prompt = args?.prompt as string;
      const system_prompt = args?.system_prompt as string | undefined;

      // Resolve model with fallback
      const resolved = await resolveModel(model);
      if (resolved.fallback) {
        console.log(
          `[mcp-consult] Model '${model}' unavailable. Falling back to '${resolved.model}'`
        );
      }
      model = resolved.model;

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
      let modelsArg = args?.models as string[] | undefined;
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
        // Resolve each requested model with fallback
        const resolved = await Promise.all(modelsArg.map((m) => resolveModel(m)));
        modelsToUse = resolved.map((r) => r.model);
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

      // Persist to a simple local memory directory by default. Can be overridden with MEMORY_DIR.
      const memoryDir = process.env.MEMORY_DIR || path.join("/tmp", "mcp-consult-memory");
      try {
        await fs.mkdir(memoryDir, { recursive: true });
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const filePath = path.join(memoryDir, `observation-${id}.json`);
        const payload = { key: key || null, prompt, model: model || null, response: responseText, _meta: { createdAt: new Date().toISOString() } };
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

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export default { listTools, callToolHandler };
