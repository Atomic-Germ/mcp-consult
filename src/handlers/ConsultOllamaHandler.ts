import { BaseHandler } from './BaseHandler.js';
import { OllamaService } from '../services/OllamaService.js';
import { ConsultRequest } from '../types/index.js';

interface MCPResponse {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

export class ConsultOllamaHandler extends BaseHandler {
  constructor(private ollamaService: OllamaService) {
    super();
  }

  async handle(params: unknown): Promise<MCPResponse> {
    // Validate and cast parameters
    const typedParams = params as Record<string, unknown>;

    // Validate required parameters
    this.validateRequired(typedParams, ['model', 'prompt']);

    try {
      // Build consult request
      const request: ConsultRequest = {
        model: typedParams.model as string,
        prompt: typedParams.prompt as string,
        stream: false,
      };

      // Include system prompt if provided
      if (typedParams.system_prompt) {
        request.systemPrompt = typedParams.system_prompt as string;
      }

      // Include temperature if provided
      if (typeof typedParams.temperature === 'number') {
        request.temperature = typedParams.temperature;
      }

      // Call Ollama service
      const response = await this.ollamaService.consult(request);

      // Return formatted response
      return {
        content: [
          {
            type: 'text',
            text: response.response,
          },
        ],
      };
    } catch (error) {
      // Handle errors with consistent formatting
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
}
