import { BaseHandler } from './BaseHandler.js';
import { ConsultOllamaHandler } from './ConsultOllamaHandler.js';
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

  constructor(ollamaService: OllamaService, sessionContext: Map<string, unknown>) {
    super();
    this.ollamaService = ollamaService;
    this.sessionContext = sessionContext;
  }

  async handle(request: CallToolRequest): Promise<ToolResponse> {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'consult_ollama': {
        const handler = new ConsultOllamaHandler(this.ollamaService);
        return await handler.handle(args);
      }

      case 'list_ollama_models': {
        try {
          const models = await this.ollamaService.listModels();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(models, null, 2),
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

          const results = await Promise.allSettled(
            models.map(async (model: string) => {
              const handler = new ConsultOllamaHandler(this.ollamaService);
              const result = await handler.handle({ model, prompt, context });
              return {
                model,
                response: result.content[0]?.text || '',
              };
            })
          );

          const responses = results.map((result) => {
            if (result.status === 'fulfilled') {
              return result.value;
            }
            return {
              model: 'unknown',
              response: '',
              error: 'Request failed',
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
  ollamaService: OllamaService,
  sessionContext: Map<string, unknown>
) => new CallToolHandler(ollamaService, sessionContext);
