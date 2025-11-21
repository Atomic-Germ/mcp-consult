import { BaseHandler } from './BaseHandler.js';
import { ConsultOllamaHandler } from './ConsultOllamaHandler.js';
import { ProviderManager } from '../services/ProviderManager.js';
import { ConfigManager } from '../config/ConfigManager.js';

interface CallToolRequest {
  params: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

interface ToolResponse {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

export class CallToolHandler extends BaseHandler {
  private providerManager: ProviderManager;
  private sessionContext: Map<string, unknown>;

  constructor(
    config: ConfigManager,
    sessionContext: Map<string, unknown>,
    providerManager?: ProviderManager
  ) {
    super();
    this.sessionContext = sessionContext;
    this.providerManager = providerManager || new ProviderManager(config);
  }

  async handle(request: CallToolRequest): Promise<ToolResponse> {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'consult_ollama': {
        const handler = new ConsultOllamaHandler(this.providerManager);
        return await handler.handle(args);
      }

      case 'list_ollama_models': {
        try {
          const available = await this.providerManager.getAvailableModels();
          if (available.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'No models available. Please ensure Ollama is running or set COPILOT_API_KEY environment variable.',
                },
              ],
              isError: true,
            };
          }

          const modelsByProvider = available.reduce(
            (acc, m) => {
              if (!acc[m.provider]) acc[m.provider] = [];
              acc[m.provider].push(m.name);
              return acc;
            },
            {} as Record<string, string[]>
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    models: available.map((m) => m.name),
                    byProvider: modelsByProvider,
                    count: available.length,
                    note: 'Available models across all providers (Ollama, Copilot)',
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to list models';
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${message}`,
              },
            ],
            isError: true,
          };
        }
      }

      case 'compare_ollama_responses': {
        try {
          const {
            models,
            prompt,
            context = {},
          } = args as {
            models: string[];
            prompt: string;
            context?: unknown;
          };

          if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Error: prompt is required and must be a non-empty string',
                },
              ],
              isError: true,
            };
          }

          // Validate model availability
          let modelsToUse: string[] = [];
          if (Array.isArray(models) && models.length > 0) {
            const available = await Promise.all(
              models.map(async (m) => ({
                model: m,
                isAvailable: await this.providerManager.isModelAvailable(m),
              }))
            );

            modelsToUse = available.filter((m) => m.isAvailable).map((m) => m.model);

            if (modelsToUse.length === 0) {
              const suggestions = await this.providerManager
                .getAvailableModels()
                .then((m) => m.slice(0, 3).map((x) => x.name));
              return {
                content: [
                  {
                    type: 'text',
                    text: `None of the requested models are available: ${models.join(', ')}. Try these instead: ${suggestions.join(', ')}`,
                  },
                ],
                isError: true,
              };
            }
          } else {
            // Use available models if not specified
            const available = await this.providerManager.getAvailableModels();
            modelsToUse = available.slice(0, 2).map((m) => m.name);

            if (modelsToUse.length === 0) {
              return {
                content: [
                  {
                    type: 'text',
                    text: 'Error: No models available to compare',
                  },
                ],
                isError: true,
              };
            }
          }

          const results = await Promise.allSettled(
            modelsToUse.map(async (model: string) => {
              const handler = new ConsultOllamaHandler(this.providerManager);
              const result = await handler.handle({ model, prompt, context });
              return {
                model,
                response: result.content[0]?.text || '',
                isError: result.isError,
              };
            })
          );

          const responses = results.map((result, index) => {
            if (result.status === 'fulfilled') {
              return result.value;
            }
            return {
              model: modelsToUse[index],
              response: '',
              error: 'Request failed',
              isError: true,
            };
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(responses, null, 2),
              },
            ],
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Comparison failed';
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${message}`,
              },
            ],
            isError: true,
          };
        }
      }

      // Backward-compatible alias for legacy name compare_ollama_models
      case 'compare_ollama_models': {
        // Delegate to compare_ollama_responses logic by normalizing name
        return await this.handle({ params: { name: 'compare_ollama_responses', arguments: args } });
      }

      case 'remember_context': {
        try {
          const { key, value, metadata } = args as {
            key: string;
            value: unknown;
            metadata?: unknown;
          };

          if (!key || typeof key !== 'string') {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Error: key parameter is required and must be a string',
                },
              ],
              isError: true,
            };
          }

          this.sessionContext.set(key, { value, metadata, timestamp: Date.now() });
          return {
            content: [
              {
                type: 'text',
                text: `Context stored with key: ${key}`,
              },
            ],
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to store context';
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${message}`,
              },
            ],
            isError: true,
          };
        }
      }

      // Backward-compatible alias for legacy memory tool remember_consult
      case 'remember_consult': {
        // Normalize shape: response maps to value, prompt/model ignored for now but stored in metadata
        const { key, response, prompt, model } = args as {
          key?: string;
          response?: string;
          prompt?: string;
          model?: string;
        };
        if (!response) {
          return {
            content: [{ type: 'text', text: 'Error: response is required for remember_consult' }],
            isError: true,
          };
        }
        const memoryKey = key || `consult-${Date.now()}`;
        this.sessionContext.set(memoryKey, {
          value: response,
          metadata: { prompt, model, legacyTool: 'remember_consult' },
          timestamp: Date.now(),
        });
        return {
          content: [{ type: 'text', text: `Stored consult response under key: ${memoryKey}` }],
        };
      }

      case 'sequential_consultation_chain': {
        try {
          const {
            consultants,
            context = {},
            flowControl = {},
          } = args as {
            consultants: Array<{
              id: string;
              model: string;
              prompt: string;
              systemPrompt?: string;
              temperature?: number;
              timeoutMs?: number;
            }>;
            context?: { systemPrompt?: string; passThrough?: boolean };
            flowControl?: { continueOnError?: boolean; maxRetries?: number; retryDelayMs?: number };
          };

          if (!Array.isArray(consultants) || consultants.length === 0) {
            return {
              content: [
                { type: 'text', text: 'Error: consultants array is required and cannot be empty' },
              ],
              isError: true,
            };
          }

          const passThrough = Boolean(context.passThrough);
          let accumulatedContext = '';
          const steps: Array<{
            id: string;
            model: string;
            prompt: string;
            response: string;
            success: boolean;
            error?: string;
            retries: number;
            durationMs: number;
          }> = [];

          for (const c of consultants) {
            const start = Date.now();
            let attempt = 0;
            let success = false;
            let lastError: string | undefined;
            let finalResponse = '';
            const basePrompt =
              passThrough && accumulatedContext
                ? `${accumulatedContext}\n${c.id}: ${c.prompt}`
                : c.prompt;

            while (!success && attempt <= (flowControl.maxRetries || 0)) {
              try {
                const handler = new ConsultOllamaHandler(this.providerManager);
                const result = await handler.handle({
                  model: c.model,
                  prompt: basePrompt,
                  system_prompt: c.systemPrompt || context.systemPrompt,
                });
                finalResponse = result.content[0]?.text || '';
                success = !result.isError;
                if (!success) lastError = 'Unknown error';
              } catch (e) {
                lastError = e instanceof Error ? e.message : String(e);
              }
              if (!success) {
                attempt++;
                if (attempt <= (flowControl.maxRetries || 0) && flowControl.retryDelayMs) {
                  await new Promise((r) => setTimeout(r, flowControl.retryDelayMs));
                }
              }
            }

            if (success && passThrough) {
              accumulatedContext += `${c.id}: ${c.prompt}\nResponse: ${finalResponse}\n\n`;
            } else if (!success && passThrough && flowControl.continueOnError) {
              accumulatedContext += `${c.id}: ${c.prompt}\nError: ${lastError}\n\n`;
            }

            if (!success && !flowControl.continueOnError) {
              steps.push({
                id: c.id,
                model: c.model,
                prompt: c.prompt,
                response: finalResponse,
                success: false,
                error: lastError,
                retries: attempt,
                durationMs: Date.now() - start,
              });
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(
                      {
                        status: 'failed',
                        failedStep: c.id,
                        error: lastError,
                        steps,
                      },
                      null,
                      2
                    ),
                  },
                ],
                isError: true,
              };
            }

            steps.push({
              id: c.id,
              model: c.model,
              prompt: c.prompt,
              response: success ? finalResponse : `[Error: ${lastError}]`,
              success,
              error: lastError,
              retries: attempt,
              durationMs: Date.now() - start,
            });
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    status: 'completed',
                    steps,
                    passThrough,
                    accumulatedContext: passThrough ? accumulatedContext : undefined,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Sequential chain failed';
          return {
            content: [{ type: 'text', text: `Error: ${message}` }],
            isError: true,
          };
        }
      }

      // --- Copilot specific tools ---
      case 'consult_copilot': {
        try {
          const { prompt } = args as { prompt?: string };
          if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
            return {
              content: [{ type: 'text', text: 'Error: prompt is required for consult_copilot' }],
              isError: true,
            };
          }
          const copilotService = this.providerManager.getCopilotService();
          if (!copilotService.isAvailable()) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Copilot unavailable: set COPILOT_API_KEY to enable this tool.',
                },
              ],
              isError: true,
            };
          }
          const response = await copilotService
            .consult()
            .catch((e) => ({ error: e instanceof Error ? e.message : String(e) }));
          if (typeof response === 'string') {
            return { content: [{ type: 'text', text: response }] };
          }
          return {
            content: [
              {
                type: 'text',
                text: `Copilot consultation not implemented: ${response.error}`,
              },
            ],
            isError: true,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'consult_copilot failed';
          return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
        }
      }

      case 'list_copilot_models': {
        const copilotService = this.providerManager.getCopilotService();
        if (!copilotService.isAvailable()) {
          return {
            content: [
              {
                type: 'text',
                text: 'Copilot unavailable (COPILOT_API_KEY not set). No models listed.',
              },
            ],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { models: [copilotService.getAvailableModel()], count: 1 },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'compare_copilot_models': {
        const { prompt } = args as { prompt?: string };
        if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
          return {
            content: [
              { type: 'text', text: 'Error: prompt is required for compare_copilot_models' },
            ],
            isError: true,
          };
        }
        const copilotService = this.providerManager.getCopilotService();
        if (!copilotService.isAvailable()) {
          return {
            content: [
              {
                type: 'text',
                text: 'Copilot unavailable; cannot perform comparison.',
              },
            ],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  note: 'Only gpt-4.1 available; no multi-model comparison performed.',
                  model: copilotService.getAvailableModel(),
                  status: 'placeholder',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Error: Unknown tool '${name}'`,
            },
          ],
          isError: true,
        };
    }
  }
}

export const callToolHandler = (
  config: ConfigManager,
  sessionContext: Map<string, unknown>,
  providerManager?: ProviderManager
) => new CallToolHandler(config, sessionContext, providerManager);
