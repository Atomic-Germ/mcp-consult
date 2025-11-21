import { ConfigManager } from '../config/ConfigManager';
import { OllamaService } from './OllamaService';
import { CopilotService } from './CopilotService';
import { OllamaError } from '../types';

export type Provider = 'ollama' | 'copilot';

export interface AvailableModel {
  name: string;
  provider: Provider;
}

/**
 * ProviderManager orchestrates model requests across multiple providers (Ollama, Copilot)
 * Ensures only usable models are offered and provides automatic failover to default
 */
export class ProviderManager {
  private ollamaService: OllamaService;
  private copilotService: CopilotService;
  private readonly DEFAULT_MODEL = 'Impulse2000/smollm3:latest';
  private readonly DEFAULT_PROVIDER: Provider = 'ollama';

  constructor(private config: ConfigManager) {
    this.ollamaService = new OllamaService(config);
    this.copilotService = new CopilotService(config);
  }

  /**
   * Detect provider from model name
   * - If model contains ':cloud' or '-cloud', treat as Ollama cloud model
   * - If model is 'gpt-4.1' or 'copilot', treat as Copilot
   * - Otherwise, treat as Ollama
   */
  private detectProvider(modelName: string): Provider {
    if (!modelName) return this.DEFAULT_PROVIDER;

    const lowerModel = modelName.toLowerCase();

    // Explicit Copilot indicators
    if (lowerModel === 'gpt-4.1' || lowerModel === 'copilot') {
      return 'copilot';
    }

    // Ollama (including cloud models)
    return 'ollama';
  }

  /**
   * Get all available models across all providers
   */
  async getAvailableModels(): Promise<AvailableModel[]> {
    const models: AvailableModel[] = [];

    // Get Ollama models
    try {
      const ollamaModels = await this.ollamaService.listModels();
      models.push(
        ...ollamaModels.map((m) => ({
          name: m.name,
          provider: 'ollama' as Provider,
        }))
      );
    } catch {
      // Silently fail - Ollama might not be available
    }

    // Get Copilot models (if available)
    if (this.copilotService.isAvailable()) {
      models.push({
        name: this.copilotService.getAvailableModel(),
        provider: 'copilot',
      });
    }

    return models;
  }

  /**
   * Check if a specific model is available
   */
  async isModelAvailable(modelName: string): Promise<boolean> {
    if (!modelName) return false;

    const provider = this.detectProvider(modelName);

    if (provider === 'copilot') {
      return this.copilotService.isAvailable();
    }

    // For Ollama, check if the model exists
    try {
      const ollamaModels = await this.ollamaService.listModels();
      return ollamaModels.some((m) => m.name === modelName);
    } catch {
      // If we can't check, assume unavailable to be safe
      return false;
    }
  }

  /**
   * Get the default model (Impulse2000/smollm3:latest or first available)
   */
  async getDefaultModel(): Promise<string> {
    // Try to use the configured default
    try {
      const isAvailable = await this.isModelAvailable(this.DEFAULT_MODEL);
      if (isAvailable) {
        return this.DEFAULT_MODEL;
      }
    } catch {
      // Fall through to find any available model
    }

    // Fall back to first available model
    try {
      const available = await this.getAvailableModels();
      if (available.length > 0) {
        return available[0].name;
      }
    } catch {
      // Fall through
    }

    // Last resort: return the configured default even if we can't verify it
    return this.DEFAULT_MODEL;
  }

  /**
   * Consult with a model, with automatic failover to default
   */
  async consult(modelName: string | undefined): Promise<string> {
    let model = modelName;

    // If no model specified, use default
    if (!model) {
      model = await this.getDefaultModel();
    }

    // Validate the model is available
    let isAvailable = false;
    try {
      isAvailable = await this.isModelAvailable(model);
    } catch {
      isAvailable = false;
    }

    // If model not available, failover to default
    if (!isAvailable) {
      model = await this.getDefaultModel();
    }

    const provider = this.detectProvider(model);

    try {
      if (provider === 'copilot') {
        return await this.copilotService.consult();
      } else {
        // Ollama provider
        const response = await this.ollamaService.consult({
          model,
          prompt: '',
          stream: false,
        });
        return response.response;
      }
    } catch (error) {
      // If consultation fails, try failover
      if (provider === 'copilot' || model === (await this.getDefaultModel())) {
        // If we're already using Copilot or the default, re-throw
        throw error;
      }

      // Try failover to default
      const defaultModel = await this.getDefaultModel();
      const defaultProvider = this.detectProvider(defaultModel);

      try {
        if (defaultProvider === 'copilot') {
          return await this.copilotService.consult();
        } else {
          const response = await this.ollamaService.consult({
            model: defaultModel,
            prompt: '',
            stream: false,
          });
          return response.response;
        }
      } catch {
        throw new OllamaError(
          `Both requested model and default model failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'ALL_MODELS_FAILED'
        );
      }
    }
  }

  /**
   * Get Ollama service for advanced operations
   */
  getOllamaService(): OllamaService {
    return this.ollamaService;
  }

  /**
   * Get Copilot service for advanced operations
   */
  getCopilotService(): CopilotService {
    return this.copilotService;
  }
}
