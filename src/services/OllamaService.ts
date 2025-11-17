import { ConfigManager } from '../config/ConfigManager';
import {
  OllamaModel,
  ConsultRequest,
  ConsultResponse,
  ComparisonResult,
  OllamaError,
  ValidationError,
} from '../types';

export class OllamaService {
  constructor(private config: ConfigManager) {}

  getConfig(): ConfigManager {
    return this.config;
  }

  async listModels(): Promise<OllamaModel[]> {
    try {
      const url = this.config.getApiUrl('/api/tags');

      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(this.config.getTimeout()),
      });

      if (!response.ok) {
        throw new OllamaError(
          `Failed to list models: ${response.statusText}`,
          'LIST_MODELS_FAILED',
          response.status
        );
      }

      const text = await response.text();
      const data = JSON.parse(text) as { models?: OllamaModel[] };
      return data.models || [];
    } catch (error) {
      if (error instanceof OllamaError) throw error;
      throw new OllamaError(
        `Failed to connect to Ollama: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CONNECTION_FAILED'
      );
    }
  }

  async consult(request: ConsultRequest): Promise<ConsultResponse> {
    this.validateConsultRequest(request);

    try {
      const response = await this.makeRequest('/api/generate', {
        model: request.model,
        prompt: request.prompt,
        system: request.systemPrompt,
        temperature: request.temperature,
        stream: false,
      });

      return response as ConsultResponse;
    } catch (error) {
      if (error instanceof OllamaError || error instanceof ValidationError) throw error;
      throw new OllamaError(
        `Consultation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CONSULT_FAILED'
      );
    }
  }

  async compareModels(
    models: string[],
    prompt: string,
    systemPrompt?: string
  ): Promise<ComparisonResult[]> {
    if (!models || models.length === 0) {
      throw new ValidationError('At least one model is required', 'models');
    }

    if (!prompt || prompt.trim().length === 0) {
      throw new ValidationError('Prompt cannot be empty', 'prompt');
    }

    const results = await Promise.allSettled(
      models.map(async (model) => {
        const startTime = Date.now();
        try {
          const response = await this.consult({
            model,
            prompt,
            systemPrompt,
            stream: false,
          });
          return {
            model,
            response: response.response,
            duration: Date.now() - startTime,
          };
        } catch (error) {
          return {
            model,
            response: '',
            duration: Date.now() - startTime,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        model: models[index],
        response: '',
        error: 'Request failed',
      };
    });
  }

  private validateConsultRequest(request: ConsultRequest): void {
    if (!request.model || request.model.trim().length === 0) {
      throw new ValidationError('Model name is required', 'model');
    }

    if (!request.prompt || request.prompt.trim().length === 0) {
      throw new ValidationError('Prompt is required', 'prompt');
    }

    if (request.temperature !== undefined) {
      if (request.temperature < 0 || request.temperature > 2) {
        throw new ValidationError('Temperature must be between 0 and 2', 'temperature');
      }
    }
  }

  private async makeRequest(endpoint: string, body: any): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.getMaxRetries(); attempt++) {
      try {
        const response = await fetch(this.config.getApiUrl(endpoint), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.config.getTimeout()),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new OllamaError(`Ollama API error: ${errorText}`, 'API_ERROR', response.status);
        }

        return await response.json();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (error instanceof OllamaError) throw error;

        if (attempt < this.config.getMaxRetries()) {
          await this.delay(1000 * Math.pow(2, attempt));
        }
      }
    }

    throw new OllamaError(
      `Failed after ${this.config.getMaxRetries()} retries: ${lastError?.message}`,
      'MAX_RETRIES_EXCEEDED'
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
