import { BaseHandler } from './BaseHandler';
import { OllamaService } from '../services/OllamaService';
import { ConsultRequest } from '../types';

/**
 * Response format for MCP tool calls
 */
interface MCPResponse {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

/**
 * Handler for the consult_ollama tool.
 * Consults an Ollama model with a prompt and returns the response.
 */
export class ConsultOllamaHandler extends BaseHandler {
  constructor(private ollamaService: OllamaService) {
    super();
  }

  async handle(params: any): Promise<MCPResponse> {
    // Validate required parameters (throws ValidationError if invalid)
    this.validateRequired(params, ['model', 'prompt']);

    try {
      // Build consult request
      const request: ConsultRequest = {
        model: params.model as string,
        prompt: params.prompt as string,
        stream: false,
      };

      // Include system prompt if provided
      if (params.system_prompt) {
        request.systemPrompt = params.system_prompt as string;
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
