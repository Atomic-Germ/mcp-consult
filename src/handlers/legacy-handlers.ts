import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import {
  SequentialChainParams,
  SequentialChainResult,
  ChainStep,
  ConversationMessage,
} from './conversationTypes.js';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

// Default timeout for Ollama calls (2 minutes)
// Can be overridden per-consultant using the timeoutMs parameter
axios.defaults.timeout = axios.defaults.timeout || 120_000;

// Helper: determine whether a model name looks like a cloud model
function looksLikeCloudModelName(n: string | undefined): boolean {
  if (!n) return false;
  // Accept names that contain ':cloud' or '-cloud' (covers common Ollama naming)
  return n.includes(':cloud') || n.includes('-cloud');
}

// Helper: given a model object from /api/tags, decide if it's safe to use
function modelObjIsSafe(m: any): boolean {
  if (!m) return false;
  const name = m.name || '';
  if (looksLikeCloudModelName(name)) return true;
  // Only accept models that are actually installed locally (not just available for download)
  if (m.installed || m.local || m.downloaded) return true;
  return false;
}

// Helper: check availability for a given model name by querying tags.
async function isModelAvailable(modelName: string): Promise<boolean> {
  if (!modelName) return false;
  // Allow opt-out for strict checking via env var. By default we are permissive to
  // avoid breaking existing users/tests. Set OLLAMA_STRICT_MODEL_CHECK=true to
  // enable strict availability checking (cloud or reported-installed only).
  const STRICT = process.env.OLLAMA_STRICT_MODEL_CHECK === 'true';
  if (!STRICT) return true;
  if (looksLikeCloudModelName(modelName)) return true;
  try {
    const resp = await axios.get(`${OLLAMA_BASE_URL}/api/tags`);
    const models = resp.data.models || [];
    const found = models.find((m: any) => m && m.name === modelName);
    if (!found) return false;
    return modelObjIsSafe(found);
  } catch (_e) {
    void _e;
    // If we couldn't query Ollama, be conservative and return false so callers can handle gracefully
    return false;
  }
}

export function listTools() {
  return {
    tools: [
      {
        name: 'consult_ollama',
        description:
          'Consult an Ollama model with a prompt and get its response for reasoning from another viewpoint.',
        inputSchema: {
          type: 'object',
          properties: {
            model: { type: 'string' },
            prompt: { type: 'string' },
            system_prompt: { type: 'string' },
          },
          required: ['model', 'prompt'],
        },
      },
      {
        name: 'list_ollama_models',
        description: 'List all available Ollama models on the local instance.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'compare_ollama_models',
        description:
          'Run the same prompt against multiple Ollama models and return their outputs side-by-side for comparison.',
        inputSchema: {
          type: 'object',
          properties: {
            models: { type: 'array', items: { type: 'string' } },
            prompt: { type: 'string' },
            system_prompt: { type: 'string' },
          },
          required: ['prompt'],
        },
      },
      {
        name: 'remember_consult',
        description:
          'Store the result of a consult into a local memory store (or configured memory service).',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string' },
            prompt: { type: 'string' },
            model: { type: 'string' },
            response: { type: 'string' },
          },
          required: ['prompt'],
        },
      },
      {
        name: 'sequential_consultation_chain',
        description:
          'Run a sequence of consultations where each consultant builds on previous responses, enabling complex multi-step reasoning.',
        inputSchema: {
          type: 'object',
          properties: {
            consultants: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  model: { type: 'string' },
                  prompt: { type: 'string' },
                  systemPrompt: { type: 'string' },
                  temperature: { type: 'number' },
                  timeoutMs: { type: 'number' },
                },
                required: ['id', 'model', 'prompt'],
              },
            },
            context: {
              type: 'object',
              properties: {
                systemPrompt: { type: 'string' },
                variables: { type: 'object' },
                passThrough: { type: 'boolean' },
              },
            },
            flowControl: {
              type: 'object',
              properties: {
                continueOnError: { type: 'boolean' },
                maxRetries: { type: 'number' },
                retryDelayMs: { type: 'number' },
              },
            },
            memory: {
              type: 'object',
              properties: {
                storeConversation: { type: 'boolean' },
                memoryKey: { type: 'string' },
              },
            },
          },
          required: ['consultants'],
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
    case 'consult_ollama': {
      const model = args?.model as string;
      const prompt = args?.prompt as string;
      const system_prompt = args?.system_prompt as string | undefined;

      try {
        // Sanity-check model availability to avoid 404s: accept cloud models or definitely-installed locals
        const available = await isModelAvailable(model);
        if (!available) {
          // Try to provide suggestions (cloud/installed models)
          let suggestions: string[] = [];
          try {
            const resp = await axios.get(`${OLLAMA_BASE_URL}/api/tags`);
            const raw = resp.data.models || [];
            suggestions = raw
              .filter((m: any) => modelObjIsSafe(m))
              .map((m: any) => m.name)
              .slice(0, 5);
          } catch (_e) {
            void _e;
            // ignore
          }

          const suggestText =
            suggestions.length > 0 ? ` Available (cloud/installed): ${suggestions.join(', ')}` : '';
          return {
            content: [
              {
                type: 'text',
                text: `Model '${model}' is not available locally and is not a recognized cloud model. Use a model name that ends with ':cloud' or '-cloud', or install the model locally.${suggestText}`,
              },
            ],
            isError: true,
          };
        }

        const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
          model,
          prompt,
          system: system_prompt,
          stream: false,
        });

        return {
          content: [
            {
              type: 'text',
              text: response.data.response,
            },
          ],
        };
      } catch (_error) {
        const error = _error;
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [
            {
              type: 'text',
              text: `Error consulting Ollama: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }

    case 'list_ollama_models': {
      try {
        const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`);

        // Add defensive checks for response data
        if (!response || !response.data) {
          throw new Error('Empty response from Ollama API');
        }

        const rawModels = response.data.models || [];

        if (!Array.isArray(rawModels)) {
          throw new Error(`Unexpected response format: models is not an array`);
        }

        const safe = rawModels.filter((m: any) => modelObjIsSafe(m)).map((m: any) => m.name);

        let modelsList: string[] = [];
        if (safe.length > 0) {
          modelsList = safe;
        } else {
          // Fallback: prefer cloud-like names if present, otherwise return raw list
          const cloudOnly = rawModels
            .filter((m: any) => m && looksLikeCloudModelName(m.name))
            .map((m: any) => m.name);
          modelsList = cloudOnly.length > 0 ? cloudOnly : rawModels.map((m: any) => m.name);
        }

        const note =
          safe.length > 0
            ? ' (cloud models and installed locals)'
            : ' (no installed locals detected; showing cloud-like or raw models)';

        return {
          content: [
            {
              type: 'text',
              text: `Available models${note}: ${modelsList.join(', ')}`,
            },
          ],
        };
      } catch (_error) {
        const error = _error;
        const message = error instanceof Error ? error.message : 'Unknown error';
        const stack = error instanceof Error ? error.stack : '';
        return {
          content: [
            {
              type: 'text',
              text: `Error listing models: ${message}\n${stack ? `Stack: ${stack}` : ''}`,
            },
          ],
          isError: true,
        };
      }
    }

    case 'compare_ollama_models': {
      const modelsArg = args?.models as string[] | undefined;
      const prompt = args?.prompt as string;
      const system_prompt = args?.system_prompt as string | undefined;

      if (!prompt) {
        return {
          content: [
            {
              type: 'text',
              text: 'Missing required argument: prompt',
            },
          ],
          isError: true,
        };
      }

      let modelsToUse: string[] = [];
      if (Array.isArray(modelsArg) && modelsArg.length > 0) {
        const ok: string[] = [];
        const bad: string[] = [];
        for (const m of modelsArg) {
          try {
            if (await isModelAvailable(m)) ok.push(m);
            else bad.push(m);
          } catch (_e) {
            void _e;
            bad.push(m);
          }
        }

        if (ok.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `None of the requested models are available (cloud or installed): ${bad.join(', ')}. Try using -cloud models or install the models locally.`,
              },
            ],
            isError: true,
          };
        }

        if (bad.length > 0) {
          // Inform about skipped models
          // We'll continue with the available ones
        }

        modelsToUse = ok;
      } else {
        try {
          const resp = await axios.get(`${OLLAMA_BASE_URL}/api/tags`);
          const candidates = (resp.data.models || [])
            .filter((m: any) => modelObjIsSafe(m))
            .map((m: any) => m.name)
            .slice(0, 2);
          modelsToUse =
            candidates.length > 0
              ? candidates
              : (resp.data.models || []).map((m: any) => m.name).slice(0, 2);
        } catch (_err) {
          void _err;
          modelsToUse = ['llama2'];
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
          contents.push({ type: 'text', text: `Model ${m}:\n${gen.data.response}` });
        } catch (_e) {
          const e = _e;
          const message = e instanceof Error ? e.message : String(e);
          contents.push({ type: 'text', text: `Model ${m} failed: ${message}` });
        }
      }

      return { content: contents };
    }

    case 'remember_consult': {
      const key = args?.key as string | undefined;
      const prompt = args?.prompt as string | undefined;
      const model = args?.model as string | undefined;
      let responseText = args?.response as string | undefined;

      if (!prompt) {
        return {
          content: [
            {
              type: 'text',
              text: 'Missing required argument: prompt',
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
              { type: 'text', text: "Missing 'response' and no 'model' provided to generate it." },
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
        } catch (_e) {
          const e = _e;
          const message = e instanceof Error ? e.message : String(e);
          return {
            content: [{ type: 'text', text: `Failed to generate response: ${message}` }],
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
          } catch (_e) {
            void _e;
            const [cmd, ...argList] = envCfg.split(/\s+/);
            tryServers.push({ type: 'stdio', command: cmd, args: argList });
          }
        }
      } catch (_e) {
        void _e;
        // ignore
      }

      try {
        const vscodeMcpPath =
          process.env.VSCODE_MCP_JSON ||
          path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'mcp.json');
        const raw = await fs.readFile(vscodeMcpPath, 'utf-8').catch(() => '');
        if (raw) {
          try {
            const cfg = JSON.parse(raw);
            const servers = cfg.servers || {};
            const keys = Object.keys(servers || {});
            const rememberKey = keys.find((k) => k.toLowerCase().includes('remember'));
            const memoryKey = keys.find((k) => k.toLowerCase().includes('memory'));
            if (rememberKey) tryServers.push(servers[rememberKey]);
            if (memoryKey) tryServers.push(servers[memoryKey]);
          } catch (_e) {
            void _e;
            // ignore parse errors
          }
        }
      } catch (_e) {
        void _e;
        // ignore
      }

      if (process.env.MEMORY_MCP_CMD) {
        const cmd = process.env.MEMORY_MCP_CMD;
        const argsList = process.env.MEMORY_MCP_ARGS ? JSON.parse(process.env.MEMORY_MCP_ARGS) : [];
        tryServers.push({ type: 'stdio', command: cmd, args: argsList });
      }

      // Helper to attempt calling a memory MCP server via stdio transport
      async function tryCallMemoryServer(serverCfg: any): Promise<any> {
        if (!serverCfg || serverCfg.type !== 'stdio' || !serverCfg.command)
          throw new Error('unsupported server cfg');

        const transport = new StdioClientTransport({
          command: serverCfg.command,
          args: serverCfg.args || [],
        });
        const client = new Client({
          name: 'mcp-memory-client',
          version: '1.0.0',
        });

        // limit connection time
        const conn = client.connect(transport);
        const timeoutMs = 10_000;
        await Promise.race([
          conn,
          new Promise((_, rej) => setTimeout(() => rej(new Error('connect timeout')), timeoutMs)),
        ]);

        const toolsRes = await client.listTools();
        const tools = toolsRes.tools || [];
        const patterns = [
          'remember',
          'store',
          'add',
          'write',
          'create',
          'save',
          'observe',
          'put',
          'set',
          'append',
        ];
        let chosen: any = null;
        for (const p of patterns) {
          const found = tools.find((t: any) => t.name && t.name.toLowerCase().includes(p));
          if (found) {
            chosen = found;
            break;
          }
        }

        if (!chosen && tools.length > 0) {
          chosen =
            tools.find((t: any) => t.inputSchema && t.inputSchema.type === 'object') || tools[0];
        }

        if (!chosen) {
          await client.close();
          throw new Error('no suitable tool on memory server');
        }

        const inputSchema = chosen.inputSchema || {};
        const props = inputSchema.properties || {};
        const toolArgs: any = {};
        if (
          props['response'] !== undefined ||
          props['text'] !== undefined ||
          props['value'] !== undefined ||
          props['content'] !== undefined
        ) {
          if (props['response'] !== undefined) toolArgs.response = payload.response;
          if (props['text'] !== undefined) toolArgs.text = payload.response;
          if (props['value'] !== undefined) toolArgs.value = payload.response;
          if (props['content'] !== undefined) toolArgs.content = payload.response;
        }
        if (props['resource'] !== undefined || props['uri'] !== undefined) {
          toolArgs.resource = payload.resource;
        }
        if (props['key'] !== undefined) toolArgs.key = payload.key;
        if (props['prompt'] !== undefined) toolArgs.prompt = payload.prompt;
        if (props['model'] !== undefined) toolArgs.model = payload.model;
        if (Object.keys(toolArgs).length === 0) {
          toolArgs.key = payload.key;
          toolArgs.prompt = payload.prompt;
          toolArgs.response = payload.response;
          toolArgs.resource = payload.resource;
        }

        const callRes = await client
          .callTool({ name: chosen.name, arguments: toolArgs }, CallToolResultSchema)
          .catch((e) => ({ isError: true, error: e }));
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
        } catch (_e) {
          void _e;
          // try next server
        }
      }

      // Fallback: persist to a simple local memory directory
      const memoryDir = process.env.MEMORY_DIR || path.join('/tmp', 'mcp-consult-memory');
      try {
        await fs.mkdir(memoryDir, { recursive: true });
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const filePath = path.join(memoryDir, `observation-${id}.json`);
        const payloadToWrite = {
          key: payload.key || null,
          prompt: payload.prompt,
          model: payload.model || null,
          response: payload.response,
          _meta: { createdAt: new Date().toISOString() },
        };
        await fs.writeFile(filePath, JSON.stringify(payloadToWrite, null, 2), 'utf-8');

        return {
          content: [
            {
              type: 'text',
              text: `Saved consult to ${filePath}`,
            },
            {
              type: 'resource',
              resource: {
                uri: `file://${filePath}`,
                text: payload.response,
              },
            },
          ],
        };
      } catch (_err) {
        const message = _err instanceof Error ? _err.message : String(_err);
        return {
          content: [{ type: 'text', text: `Failed to save memory: ${message}` }],
          isError: true,
        };
      }
    }

    case 'sequential_consultation_chain': {
      const params = args as SequentialChainParams;
      const consultants = params.consultants || [];
      const context = params.context || {};
      const flowControl = params.flowControl || {};
      const memory = params.memory || {};

      if (!consultants || consultants.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: No consultants provided for sequential chain',
            },
          ],
          isError: true,
        };
      }

      try {
        const conversationId = `chain-${Date.now()}`;
        const startTime = Date.now();
        const steps: ChainStep[] = [];
        const messages: ConversationMessage[] = [];
        let conversationContext = '';
        const consultantResponses: Record<string, string> = {};

        // Add system prompt if provided
        if (context.systemPrompt) {
          conversationContext += `System: ${context.systemPrompt}\n\n`;
        }

        for (let i = 0; i < consultants.length; i++) {
          const consultant = consultants[i];
          const stepStartTime = Date.now();
          let retryCount = 0;
          let stepSuccess = false;
          let stepResponse = '';
          let stepError: string | undefined;

          // Replace placeholders in prompt with previous responses
          let finalPrompt = consultant.prompt;
          for (const [id, response] of Object.entries(consultantResponses)) {
            finalPrompt = finalPrompt.replace(new RegExp(`\\{${id}\\}`, 'g'), response);
          }

          // Build prompt with conversation context if passThrough is enabled
          if (context.passThrough && conversationContext) {
            finalPrompt = `${conversationContext}${consultant.id}: ${finalPrompt}`;
          }

          while (!stepSuccess && retryCount <= (flowControl.maxRetries || 0)) {
            try {
              // Check model availability
              const available = await isModelAvailable(consultant.model);
              if (!available) {
                throw new Error(`Model '${consultant.model}' is not available`);
              }

              // Make the consultation call
              const response = await axios.post(
                `${OLLAMA_BASE_URL}/api/generate`,
                {
                  model: consultant.model,
                  prompt: finalPrompt,
                  system: consultant.systemPrompt || context.systemPrompt,
                  temperature: consultant.temperature,
                  stream: false,
                },
                {
                  timeout: consultant.timeoutMs || 120000,
                }
              );

              stepResponse = response.data.response;
              stepSuccess = true;

              // Store response for placeholder replacement
              consultantResponses[consultant.id] = stepResponse;

              // Add to conversation context for next consultant
              if (context.passThrough) {
                conversationContext += `${consultant.id}: ${consultant.prompt}\nResponse: ${stepResponse}\n\n`;
              }

              // Create message record
              const message: ConversationMessage = {
                consultantId: consultant.id,
                role: 'assistant',
                content: stepResponse,
                timestamp: new Date(),
                metadata: {
                  model: consultant.model,
                  temperature: consultant.temperature,
                  duration: Date.now() - stepStartTime,
                },
              };
              messages.push(message);
            } catch (_error) {
              const error = _error;
              retryCount++;
              stepError = error instanceof Error ? error.message : 'Unknown error';

              if (retryCount <= (flowControl.maxRetries || 0)) {
                // Wait before retry
                if (flowControl.retryDelayMs) {
                  await new Promise((resolve) => setTimeout(resolve, flowControl.retryDelayMs));
                }
              } else {
                // Max retries reached
                if (flowControl.continueOnError) {
                  stepResponse = `[Error after ${retryCount} retries: ${stepError}]`;
                  consultantResponses[consultant.id] = stepResponse;
                  if (context.passThrough) {
                    conversationContext += `${consultant.id}: ${consultant.prompt}\nError: ${stepError}\n\n`;
                  }
                } else {
                  // Fail the entire chain
                  return {
                    content: [
                      {
                        type: 'text',
                        text: `Sequential chain failed at step ${i + 1} (${consultant.id}): ${stepError}`,
                      },
                    ],
                    isError: true,
                  };
                }
              }
            }
          }

          // Record the step
          const step: ChainStep = {
            step: i + 1,
            consultantId: consultant.id,
            model: consultant.model,
            prompt: consultant.prompt,
            response: stepResponse,
            duration: Date.now() - stepStartTime,
            error: stepError,
            retryCount: retryCount,
          };
          steps.push(step);
        }

        const totalDuration = Date.now() - startTime;
        const completedSteps = steps.filter((s) => !s.error).length;

        const result: SequentialChainResult = {
          conversationId,
          status: completedSteps === consultants.length ? 'completed' : 'partial',
          completedSteps,
          totalSteps: consultants.length,
          duration: totalDuration,
          steps,
        };

        // Store in memory if requested
        if (memory.storeConversation) {
          try {
            // This would integrate with the remember_consult functionality
            const memoryKey = memory.memoryKey || `sequential_chain_${conversationId}`;
            const memoryData = {
              key: memoryKey,
              prompt: `Sequential consultation chain: ${consultants.map((c) => c.id).join(' → ')}`,
              response: JSON.stringify(result),
              model: 'sequential_chain',
            };

            // Call remember_consult internally
            await callToolHandler({
              name: 'remember_consult',
              arguments: memoryData,
            });
          } catch (memError) {
            // Memory storage failed, but don't fail the main operation
            console.warn('Failed to store conversation in memory:', memError);
          }
        }

        // Format the output
        const formattedSteps = steps
          .map((step) => {
            const status = step.error
              ? `❌ Failed${step.retryCount ? ` (${step.retryCount} retries)` : ''}`
              : '✅ Success';
            return (
              `**Step ${step.step}: ${step.consultantId}** (${step.model}) ${status}\n` +
              `Duration: ${step.duration}ms\n` +
              `Prompt: ${step.prompt}\n` +
              `Response: ${step.response}${step.error ? `\nError: ${step.error}` : ''}\n`
            );
          })
          .join('\n---\n');

        const summary =
          `# Sequential Consultation Chain Results\n\n` +
          `**Status**: ${result.status}\n` +
          `**Completed Steps**: ${completedSteps}/${consultants.length}\n` +
          `**Total Duration**: ${totalDuration}ms\n` +
          `**Conversation ID**: ${conversationId}\n\n` +
          `## Consultation Steps\n\n${formattedSteps}\n\n` +
          `## Final Context\n${conversationContext}`;

        return {
          content: [
            {
              type: 'text',
              text: summary,
            },
          ],
        };
      } catch (_error) {
        const message = _error instanceof Error ? _error.message : 'Unknown error';
        return {
          content: [
            {
              type: 'text',
              text: `Error in sequential consultation chain: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export default { listTools, callToolHandler };
