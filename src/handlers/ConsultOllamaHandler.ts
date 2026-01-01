import { BaseHandler } from './BaseHandler.js';
import { OllamaService } from '../services/OllamaService.js';
import { ModelValidator } from '../services/ModelValidator.js';
import { ConsultRequest } from '../types/index.js';
import { shouldAutoModelSettings, suggestConsultSettings } from '../modelSettings.js';

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
      const consultationType = typedParams.consultation_type as string | undefined;

      // Auto-select model based on consultation type
      if (consultationType === 'thinking') {
        model = 'kimi-k2-thinking:cloud';
      } else if (consultationType === 'instruction') {
        model = 'qwen3-vl:235b-instruct-cloud';
      } else if (!model) {
        // If no model specified and no consultation type, use default
        model = await this.modelValidator.getDefaultModel();
      }

      // Validate model availability
      if (model) {
        const isAvailable = await this.modelValidator.isModelAvailable(model);
        if (!isAvailable) {
          const suggestions = await this.modelValidator.getSuggestions(3);
          const typeInfo = consultationType
            ? ` (auto-selected for ${consultationType} consultation)`
            : '';
          return {
            content: [
              {
                type: 'text',
                text: `Model '${model}'${typeInfo} is not available. Available models: ${suggestions.join(', ')}. Please install the model or choose an available one.`,
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
        stream: true,
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

      // Optional: auto-suggest temperature/timeout based on model + prompt heuristics
      // Inspired by the StandardLlama “autonomy” branch: best-effort defaults rather than strict config.
      if (shouldAutoModelSettings(typedParams)) {
        const hasSystemPrompt = Boolean(typedParams.system_prompt);
        const suggested = suggestConsultSettings({
          modelName: model,
          prompt: request.prompt,
          hasSystemPrompt,
          baseTimeoutMs: this.ollamaService.getConfig().getTimeout(),
        });

        if (request.temperature === undefined) request.temperature = suggested.temperature;
        if (request.timeout === undefined) request.timeout = suggested.timeoutMs;
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
