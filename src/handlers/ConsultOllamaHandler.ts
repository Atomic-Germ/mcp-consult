import { BaseHandler } from './BaseHandler.js';
import { OllamaService } from '../services/OllamaService.js';
import { ModelValidator } from '../services/ModelValidator.js';
import { ConsultRequest } from '../types/index.js';

interface MCPResponse {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

export class ConsultOllamaHandler extends BaseHandler {
  private modelValidator: ModelValidator;

  constructor(
    private ollamaService: OllamaService,
    modelValidator?: ModelValidator
  ) {
    super();
    this.modelValidator = modelValidator || new ModelValidator(this.ollamaService.getConfig());
  }

  async handle(params: unknown): Promise<MCPResponse> {
    // Validate and cast parameters
    const typedParams = params as Record<string, unknown>;

    try {
      // Validate required parameters
      this.validateRequired(typedParams, ['prompt']);

      let model = (typedParams.model as string) || '';

      // If no model specified or model is unavailable, use default
      if (!model) {
        model = await this.modelValidator.getDefaultModel();
      } else {
        const isAvailable = await this.modelValidator.isModelAvailable(model);
        if (!isAvailable) {
          const suggestions = await this.modelValidator.getSuggestions(3);
          const defaultModel = await this.modelValidator.getDefaultModel();
          return {
            content: [
              {
                type: 'text',
                text: `Model '${model}' is not available. Using default model: ${defaultModel}. Available models: ${suggestions.join(', ')}`,
              },
            ],
            isError: true,
          };
        }
      }

      // Build consult request
      const request: ConsultRequest = {
        model,
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

      // Include timeout if provided
      if (typeof typedParams.timeout_ms === 'number') {
        request.timeout = typedParams.timeout_ms;
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
