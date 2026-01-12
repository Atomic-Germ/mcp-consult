import { BaseHandler } from './BaseHandler.js';
import { ConsultOllamaHandler } from './ConsultOllamaHandler.js';
import { SequentialChainHandler } from './SequentialChainHandler.js';
import { ModelValidator } from '../services/ModelValidator.js';
import type { OllamaService } from '../services/OllamaService.js';

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
  private ollamaService: OllamaService;
  private sessionContext: Map<string, unknown>;
  private modelValidator: ModelValidator;

  constructor(
    ollamaService: OllamaService,
    sessionContext: Map<string, unknown>,
    modelValidator?: ModelValidator
  ) {
    super();
    this.ollamaService = ollamaService;
    this.sessionContext = sessionContext;
    this.modelValidator = modelValidator || new ModelValidator(this.ollamaService.getConfig());
  }

  async handle(request: CallToolRequest, reporters?: { reportProgress?: (p: {progress:number; total?:number})=>Promise<void>; reportMessage?: (text:string)=>Promise<void> }): Promise<ToolResponse> {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'consult_ollama': {
        const handler = new ConsultOllamaHandler(this.ollamaService, this.modelValidator);
        return await handler.handle(args, reporters);
      }

      case 'list_ollama_models': {
        try {
          const available = await this.modelValidator.getAvailableModels();
          if (available.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'No models available. Please install a model locally or use a cloud-based model (e.g., qwen2.5-coder:7b-cloud)',
                },
              ],
              isError: true,
            };
          }

          const modelNames = available.map((m) => m.name);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    models: modelNames,
                    count: modelNames.length,
                    note: 'These are available models (installed locally or cloud-based)',
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
                isAvailable: await this.modelValidator.isModelAvailable(m),
              }))
            );

            modelsToUse = available.filter((m) => m.isAvailable).map((m) => m.model);

            if (modelsToUse.length === 0) {
              const suggestions = await this.modelValidator.getSuggestions(3);
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
            const available = await this.modelValidator.getAvailableModels();
            modelsToUse = available.slice(0, 2).map((m) => m.name);

          // If reporters were supplied (from stdio client requesting progress), propagate them to the per-model handler

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
              const handler = new ConsultOllamaHandler(this.ollamaService, this.modelValidator);
              const result = await handler.handle({ model, prompt, context }, reporters);
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

      case 'sequential_consultation_chain': {
        const handler = new SequentialChainHandler(this.ollamaService, this.modelValidator);
        return await handler.handle(args);
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
  ollamaService: OllamaService,
  sessionContext: Map<string, unknown>,
  modelValidator?: ModelValidator
) => new CallToolHandler(ollamaService, sessionContext, modelValidator);
