import { ValidationError } from '../types/index.js';

export interface ConfigOptions {
  ollamaBaseUrl?: string;
  defaultModel?: string;
  timeout?: number;
  maxRetries?: number;
}

export class ConfigManager {
  private ollamaBaseUrl: string;
  private defaultModel: string;
  private timeout: number;
  private maxRetries: number;

  constructor(options: ConfigOptions = {}) {
    this.ollamaBaseUrl = this.validateUrl(
      options.ollamaBaseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    );
    this.defaultModel = options.defaultModel || process.env.OLLAMA_DEFAULT_MODEL || 'llama2';
    this.timeout = this.validateTimeout(options.timeout || 60000);
    this.maxRetries = this.validateMaxRetries(options.maxRetries || 3);
  }

  private validateUrl(url: string): string {
    try {
      const parsed = new URL(url);
      if (!parsed.protocol.startsWith('http')) {
        throw new ValidationError('URL must use HTTP or HTTPS protocol', 'ollamaBaseUrl');
      }
      return url.replace(/\/$/, ''); // Remove trailing slash
    } catch {
      throw new ValidationError(`Invalid Ollama base URL: ${url}`, 'ollamaBaseUrl');
    }
  }

  private validateTimeout(timeout: number): number {
    if (timeout < 1000 || timeout > 300000) {
      throw new ValidationError('Timeout must be between 1000 and 300000 ms', 'timeout');
    }
    return timeout;
  }

  private validateMaxRetries(retries: number): number {
    if (retries < 0 || retries > 10) {
      throw new ValidationError('Max retries must be between 0 and 10', 'maxRetries');
    }
    return retries;
  }

  getOllamaBaseUrl(): string {
    return this.ollamaBaseUrl;
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }

  getTimeout(): number {
    return this.timeout;
  }

  getMaxRetries(): number {
    return this.maxRetries;
  }

  getApiUrl(endpoint: string): string {
    return `${this.ollamaBaseUrl}${endpoint}`;
  }
}
