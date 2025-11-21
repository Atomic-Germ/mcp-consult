import { BaseHandler } from './BaseHandler.js';
import { ProviderManager } from '../services/ProviderManager.js';
import { ConfigManager } from '../config/ConfigManager.js';

interface MCPResponse {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

export class ConsultOllamaHandler extends BaseHandler {
  private providerManager: ProviderManager;

  constructor(providerManager?: ProviderManager, config?: ConfigManager) {
    super();
    if (providerManager) {
      this.providerManager = providerManager;
    } else {
      this.providerManager = new ProviderManager(config || new ConfigManager());
    }
  }

  async handle(params: unknown): Promise<MCPResponse> {
    // Validate and cast parameters
    const typedParams = params as Record<string, unknown>;

    try {
      // Validate required parameters
      this.validateRequired(typedParams, ['prompt']);

      const model = (typedParams.model as string) || '';
      const prompt = typedParams.prompt as string;
      const systemPrompt = (typedParams.system_prompt as string) || undefined;
      const temperature = (typedParams.temperature as number) || undefined;
      const timeoutMs = (typedParams.timeout_ms as number) || undefined;

      // Consult with the provider manager (handles model validation and failover)
      const response = await this.providerManager.consult(model, prompt, systemPrompt, timeoutMs);

      // Return formatted response
      return {
        content: [
          {
            type: 'text',
            text: response,
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
            text: `Error consulting model: ${message}`,
          },
        ],
        isError: true,
      };
    }
  }
}
