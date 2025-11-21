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
