import { ConfigManager } from '../config/ConfigManager';
import { OllamaError } from '../types';

/**
 * CopilotService provides access to Copilot models (currently GPT-4.1)
 * This is a placeholder service that always uses GPT-4.1 regardless of requested model
 */
export class CopilotService {
  private readonly COPILOT_MODEL = 'gpt-4.1';
  private copilotApiKey: string | null = null;

  constructor(private config: ConfigManager) {
    this.copilotApiKey = process.env.COPILOT_API_KEY || null;
  }

  /**
   * Get the only available Copilot model (GPT-4.1)
   */
  getAvailableModel(): string {
    return this.COPILOT_MODEL;
  }

  /**
   * Check if Copilot is available (requires API key)
   */
  isAvailable(): boolean {
    return this.copilotApiKey !== null && this.copilotApiKey.length > 0;
  }

  /**
   * Consult with GPT-4.1 (ignores requested model and always uses GPT-4.1)
   */
  async consult(): Promise<string> {
    if (!this.isAvailable()) {
      throw new OllamaError(
        'Copilot is not available. COPILOT_API_KEY environment variable is not set.',
        'COPILOT_UNAVAILABLE'
      );
    }

    try {
      // Mock implementation - in production, this would call the actual Copilot API
      // For now, we'll throw an error indicating that Copilot API integration is not yet implemented
      throw new OllamaError(
        'Copilot API integration not yet implemented. Please use Ollama models.',
        'COPILOT_NOT_IMPLEMENTED'
      );
    } catch (error) {
      if (error instanceof OllamaError) throw error;
      throw new OllamaError(
        `Copilot consultation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'COPILOT_CONSULT_FAILED'
      );
    }
  }
}
