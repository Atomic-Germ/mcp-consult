import { ConfigManager } from '../config/ConfigManager';
import { ProviderManager, AvailableModel } from './ProviderManager';
import { OllamaError } from '../types';

/**
 * ModelValidator provides model availability checking and suggestions
 * Uses ProviderManager to support both Ollama and Copilot models
 */
export class ModelValidator {
  private providerManager: ProviderManager;

  constructor(private config: ConfigManager) {
    this.providerManager = new ProviderManager(config);
  }

  /**
   * Get all available models from all providers
   */
  async getAvailableModels(): Promise<AvailableModel[]> {
    try {
      return await this.providerManager.getAvailableModels();
    } catch (error) {
      if (error instanceof OllamaError) throw error;
      throw new OllamaError(
        `Failed to fetch available models: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CONNECTION_FAILED'
      );
    }
  }

  /**
   * Check if a model is available
   * Returns true for any available model across all providers
   * Copilot's GPT-4.1 is always considered available if COPILOT_API_KEY is set
   */
  async isModelAvailable(modelName: string): Promise<boolean> {
    if (!modelName) return false;

    try {
      return await this.providerManager.isModelAvailable(modelName);
    } catch {
      // If we can't check, assume unavailable to be safe
      return false;
    }
  }

  /**
   * Get the default model
   * Returns Impulse2000/smollm3:latest if available, otherwise first available model
   */
  async getDefaultModel(): Promise<string> {
    try {
      return await this.providerManager.getDefaultModel();
    } catch (error) {
      if (error instanceof OllamaError) throw error;
      throw new OllamaError(
        `Failed to determine default model: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CONNECTION_FAILED'
      );
    }
  }

  /**
   * Get model suggestions (first N available models)
   */
  async getSuggestions(count: number = 3): Promise<string[]> {
    try {
      const models = await this.getAvailableModels();
      return models.slice(0, count).map((m) => m.name);
    } catch {
      return [];
    }
  }

  /**
   * Get the ProviderManager for advanced operations
   */
  getProviderManager(): ProviderManager {
    return this.providerManager;
  }
}
