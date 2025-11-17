import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { BaseHandler } from "./BaseHandler.js";
import { ConsultOllamaHandler } from "./ConsultOllamaHandler.js";
import type { OllamaService } from "../services/OllamaService.js";

export class CallToolHandler extends BaseHandler {
  private ollamaService: OllamaService;
  private sessionContext: Map<string, any>;

  constructor(
    ollamaService: OllamaService,
    sessionContext: Map<string, any>
  ) {
    super();
    this.ollamaService = ollamaService;
    this.sessionContext = sessionContext;
  }

  async handle(request: any) {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "consult_ollama": {
        const handler = new ConsultOllamaHandler(this.ollamaService);
        return await handler.handle(args);
      }

      case "list_ollama_models": {
        const models = await this.ollamaService.listModels();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(models, null, 2),
            },
          ],
        };
      }

      case "compare_ollama_responses": {
        const { models, prompt, context = {} } = args;
        const results = await Promise.all(
          models.map(async (model: string) => {
            const handler = new ConsultOllamaHandler(this.ollamaService);
            const result = await handler.handle({ model, prompt, context });
            return {
              model,
              response: result.content[0].text,
            };
          })
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case "remember_context": {
        const { key, value, metadata } = args;
        this.sessionContext.set(key, { value, metadata, timestamp: Date.now() });
        return {
          content: [
            {
              type: "text",
              text: `Context stored with key: ${key}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
}

export const callToolHandler = (
  ollamaService: OllamaService,
  sessionContext: Map<string, any>
) => new CallToolHandler(ollamaService, sessionContext);
